/**
 * Growth Console — Backlog by Lane queries (Issue #406).
 *
 * Server-side helpers that read `growth_backlog_items` and
 * `growth_content_tasks` for the Backlog tab of the Growth console.
 *
 * Tenant guard:
 *   - Every query filters by BOTH `account_id` and `website_id` per
 *     ADR-003 / ADR-009. The page component re-asserts scope before
 *     calling these helpers; helpers also enforce the filter at the
 *     query level (defence-in-depth).
 *
 * Migration boundary:
 *   - The `growth_backlog_items` and `growth_content_tasks` tables are
 *     migrated from `bukeer-flutter` under #395 / #396 / #397. The Studio
 *     side may run before those tables exist. We wrap reads in try/catch
 *     and surface a `tableMissing` flag so the UI can render the empty
 *     state instead of crashing.
 *
 * Refs:
 *   - SPEC_GROWTH_OS_SYMPHONY_ORCHESTRATOR.md §"Bukeer Studio UI Scope"
 *   - SPEC_GROWTH_OS_UNIFIED_BACKLOG_AND_PROFILE_RUN_LEDGER.md §"growth_backlog_items"
 *   - packages/website-contract/src/schemas/growth-agent-definitions.ts
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import {
  AgentLaneSchema,
  type AgentLane,
} from '@bukeer/website-contract';

// ---------------------------------------------------------------------------
// Status enums (loose — backlog/content_tasks columns may evolve under
// #395/#396/#397, see SPEC_GROWTH_OS_UNIFIED_BACKLOG_AND_PROFILE_RUN_LEDGER.md).
// ---------------------------------------------------------------------------

/**
 * UI-level status filter (5 buckets: blocked, ready, watch, active, done).
 * The DB carries finer-grained statuses; we map them to these buckets at
 * read time to keep the page filter URL stable.
 *
 * Mapping:
 *   blocked → status IN ('blocked', 'rejected')
 *   ready   → status IN ('ready_for_brief', 'ready_for_council', 'queued')
 *   watch   → status IN ('watch')
 *   active  → status IN ('brief_in_progress', 'approved_for_execution', 'in_progress')
 *   done    → status IN ('done', 'shipped', 'evaluated')
 */
export const BACKLOG_STATUS_BUCKETS = [
  'blocked',
  'ready',
  'watch',
  'active',
  'done',
] as const;
export type BacklogStatusBucket = (typeof BACKLOG_STATUS_BUCKETS)[number];

const STATUS_BUCKET_TO_DB: Record<BacklogStatusBucket, ReadonlyArray<string>> = {
  blocked: ['blocked', 'rejected'],
  ready: ['queued', 'ready_for_brief', 'ready_for_council'],
  watch: ['watch'],
  active: ['brief_in_progress', 'approved_for_execution', 'in_progress'],
  done: ['done', 'shipped', 'evaluated'],
};

// TODO(backlog-schema): Tighten typing once #395/#396 land Zod schemas for
// growth_backlog_items and growth_content_tasks. For now we use loose types
// because column inventory is still in flight.
export interface BacklogRow {
  id: string;
  website_id: string;
  account_id?: string | null;
  title: string | null;
  lane: AgentLane | null;
  source_table: string | null;
  status: string | null;
  council_ready: boolean | null;
  next_action: string | null;
  blocked_reason: string | null;
  ai_review_state: string | null;
  human_review_state: string | null;
  updated_at: string | null;
}

export interface BacklogQueryOpts {
  /** Tenant guard — REQUIRED. */
  accountId: string;
  /** UI lane filter (canonical 5). */
  lane?: AgentLane;
  /** UI status bucket filter. */
  statusBucket?: BacklogStatusBucket;
  /** 1-based page index. */
  page?: number;
  /** Page size; default 25 per SPEC. */
  pageSize?: number;
}

export interface BacklogQueryResult {
  items: BacklogRow[];
  totalByLane: Record<AgentLane, number>;
  totalByStatus: Record<BacklogStatusBucket, number>;
  page: number;
  pageSize: number;
  total: number;
  /** True when the underlying table is not yet present in this environment. */
  tableMissing: boolean;
  /** True when the read errored for a reason other than missing table. */
  errored: boolean;
}

const EMPTY_LANE_TOTALS: Record<AgentLane, number> = {
  orchestrator: 0,
  technical_remediation: 0,
  transcreation: 0,
  content_creator: 0,
  content_curator: 0,
};

const EMPTY_STATUS_TOTALS: Record<BacklogStatusBucket, number> = {
  blocked: 0,
  ready: 0,
  watch: 0,
  active: 0,
  done: 0,
};

function isMissingTableError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; message?: string };
  // Postgres "undefined_table" + PostgREST schema cache error.
  return (
    e.code === '42P01' ||
    e.code === 'PGRST205' ||
    /relation .* does not exist/i.test(e.message ?? '') ||
    /could not find the table/i.test(e.message ?? '')
  );
}

function bucketize(rawStatus: string | null | undefined): BacklogStatusBucket | null {
  if (!rawStatus) return null;
  for (const bucket of BACKLOG_STATUS_BUCKETS) {
    if (STATUS_BUCKET_TO_DB[bucket].includes(rawStatus)) return bucket;
  }
  return null;
}

function normaliseLane(value: unknown): AgentLane | null {
  const parsed = AgentLaneSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function emptyResult(
  page: number,
  pageSize: number,
  flag: 'missing' | 'error' | 'ok',
): BacklogQueryResult {
  return {
    items: [],
    totalByLane: { ...EMPTY_LANE_TOTALS },
    totalByStatus: { ...EMPTY_STATUS_TOTALS },
    page,
    pageSize,
    total: 0,
    tableMissing: flag === 'missing',
    errored: flag === 'error',
  };
}

// ---------------------------------------------------------------------------
// growth_backlog_items
// ---------------------------------------------------------------------------

/**
 * Read backlog items for a single website, scoped to (account_id, website_id).
 *
 * Returns empty defaults if the table does not yet exist (migration pending
 * on the Flutter side under #395/#396/#397). Caller should render the empty
 * state.
 */
export async function getBacklogByLane(
  supabase: SupabaseClient,
  websiteId: string,
  opts: BacklogQueryOpts,
): Promise<BacklogQueryResult> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.max(1, Math.min(100, opts.pageSize ?? 25));
  const offset = (page - 1) * pageSize;

  if (!opts.accountId) {
    // Defensive — page must always pass accountId.
    return emptyResult(page, pageSize, 'error');
  }

  // We run two queries in parallel:
  //   1. Aggregates (no pagination) for lane + status totals.
  //   2. Paginated rows for the visible list.
  // For aggregates we cap to the most recent 1000 rows per tenant — totals
  // beyond that are best effort and a TODO once the SQL view from #397 is in.
  // TODO(backlog-schema): switch to a SECURITY INVOKER view that returns
  // pre-aggregated lane/status counts when #397 lands.
  try {
    let listQuery = supabase
      .from('growth_backlog_items')
      .select(
        // We select the union of fields documented in the SPEC. Some columns
        // may not exist yet (council_ready, lane, source_table) — Supabase
        // returns them as undefined which we coerce to null below.
        'id, website_id, account_id, title, lane, source_table, status, council_ready, next_action, blocked_reason, ai_review_state, human_review_state, updated_at',
        { count: 'exact' },
      )
      .eq('website_id', websiteId)
      .eq('account_id', opts.accountId)
      .order('updated_at', { ascending: false, nullsFirst: false });

    if (opts.lane) {
      listQuery = listQuery.eq('lane', opts.lane);
    }
    if (opts.statusBucket) {
      listQuery = listQuery.in('status', [
        ...STATUS_BUCKET_TO_DB[opts.statusBucket],
      ]);
    }

    const { data, error, count } = await listQuery.range(
      offset,
      offset + pageSize - 1,
    );

    if (error) {
      if (isMissingTableError(error)) {
        // eslint-disable-next-line no-console
        console.warn(
          '[growth-console] growth_backlog_items table missing — empty state',
          { code: error.code },
        );
        return emptyResult(page, pageSize, 'missing');
      }
      // eslint-disable-next-line no-console
      console.error('[growth-console] backlog read error', error);
      return emptyResult(page, pageSize, 'error');
    }

    const rows = (data ?? []) as Array<Record<string, unknown>>;

    // Tenant guard (defence-in-depth) — every row MUST match scope.
    for (const r of rows) {
      if (
        r.website_id !== websiteId ||
        (r.account_id !== undefined && r.account_id !== opts.accountId)
      ) {
        // eslint-disable-next-line no-console
        console.error('[growth-console] tenant scope violation in backlog row', {
          rowId: r.id,
        });
        return emptyResult(page, pageSize, 'error');
      }
    }

    const items: BacklogRow[] = rows.map((r) => ({
      id: String(r.id),
      website_id: String(r.website_id),
      account_id: (r.account_id as string | null | undefined) ?? null,
      title: (r.title as string | null | undefined) ?? null,
      lane: normaliseLane(r.lane),
      source_table: (r.source_table as string | null | undefined) ?? null,
      status: (r.status as string | null | undefined) ?? null,
      council_ready: (r.council_ready as boolean | null | undefined) ?? null,
      next_action: (r.next_action as string | null | undefined) ?? null,
      blocked_reason: (r.blocked_reason as string | null | undefined) ?? null,
      ai_review_state: (r.ai_review_state as string | null | undefined) ?? null,
      human_review_state:
        (r.human_review_state as string | null | undefined) ?? null,
      updated_at: (r.updated_at as string | null | undefined) ?? null,
    }));

    // Aggregates from a wider sample (separate light query).
    const aggregates = await readBacklogAggregates(supabase, websiteId, opts.accountId);

    return {
      items,
      totalByLane: aggregates.totalByLane,
      totalByStatus: aggregates.totalByStatus,
      page,
      pageSize,
      total: count ?? items.length,
      tableMissing: false,
      errored: false,
    };
  } catch (err) {
    if (isMissingTableError(err)) {
      return emptyResult(page, pageSize, 'missing');
    }
    // eslint-disable-next-line no-console
    console.error('[growth-console] backlog read threw', err);
    return emptyResult(page, pageSize, 'error');
  }
}

async function readBacklogAggregates(
  supabase: SupabaseClient,
  websiteId: string,
  accountId: string,
): Promise<{
  totalByLane: Record<AgentLane, number>;
  totalByStatus: Record<BacklogStatusBucket, number>;
}> {
  const totalByLane = { ...EMPTY_LANE_TOTALS };
  const totalByStatus = { ...EMPTY_STATUS_TOTALS };
  try {
    // TODO(backlog-schema): replace with a SQL view that returns counts
    // pre-aggregated. Reading up to 1000 rows is acceptable for MVP.
    const { data, error } = await supabase
      .from('growth_backlog_items')
      .select('lane, status, account_id, website_id')
      .eq('website_id', websiteId)
      .eq('account_id', accountId)
      .limit(1000);
    if (error || !data) return { totalByLane, totalByStatus };

    for (const r of data as Array<Record<string, unknown>>) {
      // Tenant re-check (defence-in-depth).
      if (
        r.website_id !== websiteId ||
        (r.account_id !== undefined && r.account_id !== accountId)
      ) {
        continue;
      }
      const lane = normaliseLane(r.lane);
      if (lane) totalByLane[lane] += 1;
      const bucket = bucketize(r.status as string | null);
      if (bucket) totalByStatus[bucket] += 1;
    }
  } catch {
    // Aggregates are best-effort — leave zeros on failure.
  }
  return { totalByLane, totalByStatus };
}

// ---------------------------------------------------------------------------
// growth_content_tasks
// ---------------------------------------------------------------------------

/**
 * Read content tasks for a website, grouped by lane. Tasks are typically in
 * the `content_creator` / `content_curator` / `transcreation` lanes; we still
 * group by lane for UI parity with the backlog table.
 */
export async function getContentTasksByLane(
  supabase: SupabaseClient,
  websiteId: string,
  opts: BacklogQueryOpts,
): Promise<BacklogQueryResult> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.max(1, Math.min(100, opts.pageSize ?? 25));
  const offset = (page - 1) * pageSize;

  if (!opts.accountId) {
    return emptyResult(page, pageSize, 'error');
  }

  try {
    let listQuery = supabase
      .from('growth_content_tasks')
      .select(
        // TODO(backlog-schema): align selected columns with the final schema
        // from #396 once it lands. Fields below are loosely typed.
        'id, website_id, account_id, title, lane, status, council_ready, next_action, blocked_reason, ai_review_state, human_review_state, updated_at',
        { count: 'exact' },
      )
      .eq('website_id', websiteId)
      .eq('account_id', opts.accountId)
      .order('updated_at', { ascending: false, nullsFirst: false });

    if (opts.lane) {
      listQuery = listQuery.eq('lane', opts.lane);
    }
    if (opts.statusBucket) {
      listQuery = listQuery.in('status', [
        ...STATUS_BUCKET_TO_DB[opts.statusBucket],
      ]);
    }

    const { data, error, count } = await listQuery.range(
      offset,
      offset + pageSize - 1,
    );

    if (error) {
      if (isMissingTableError(error)) {
        // eslint-disable-next-line no-console
        console.warn(
          '[growth-console] growth_content_tasks table missing — empty state',
          { code: error.code },
        );
        return emptyResult(page, pageSize, 'missing');
      }
      // eslint-disable-next-line no-console
      console.error('[growth-console] content_tasks read error', error);
      return emptyResult(page, pageSize, 'error');
    }

    const rows = (data ?? []) as Array<Record<string, unknown>>;

    for (const r of rows) {
      if (
        r.website_id !== websiteId ||
        (r.account_id !== undefined && r.account_id !== opts.accountId)
      ) {
        // eslint-disable-next-line no-console
        console.error(
          '[growth-console] tenant scope violation in content_task row',
          { rowId: r.id },
        );
        return emptyResult(page, pageSize, 'error');
      }
    }

    const items: BacklogRow[] = rows.map((r) => ({
      id: String(r.id),
      website_id: String(r.website_id),
      account_id: (r.account_id as string | null | undefined) ?? null,
      title: (r.title as string | null | undefined) ?? null,
      lane: normaliseLane(r.lane),
      // Content tasks always come from the content_tasks table.
      source_table: 'growth_content_tasks',
      status: (r.status as string | null | undefined) ?? null,
      council_ready: (r.council_ready as boolean | null | undefined) ?? null,
      next_action: (r.next_action as string | null | undefined) ?? null,
      blocked_reason: (r.blocked_reason as string | null | undefined) ?? null,
      ai_review_state: (r.ai_review_state as string | null | undefined) ?? null,
      human_review_state:
        (r.human_review_state as string | null | undefined) ?? null,
      updated_at: (r.updated_at as string | null | undefined) ?? null,
    }));

    const aggregates = await readContentTaskAggregates(
      supabase,
      websiteId,
      opts.accountId,
    );

    return {
      items,
      totalByLane: aggregates.totalByLane,
      totalByStatus: aggregates.totalByStatus,
      page,
      pageSize,
      total: count ?? items.length,
      tableMissing: false,
      errored: false,
    };
  } catch (err) {
    if (isMissingTableError(err)) {
      return emptyResult(page, pageSize, 'missing');
    }
    // eslint-disable-next-line no-console
    console.error('[growth-console] content_tasks read threw', err);
    return emptyResult(page, pageSize, 'error');
  }
}

async function readContentTaskAggregates(
  supabase: SupabaseClient,
  websiteId: string,
  accountId: string,
): Promise<{
  totalByLane: Record<AgentLane, number>;
  totalByStatus: Record<BacklogStatusBucket, number>;
}> {
  const totalByLane = { ...EMPTY_LANE_TOTALS };
  const totalByStatus = { ...EMPTY_STATUS_TOTALS };
  try {
    const { data, error } = await supabase
      .from('growth_content_tasks')
      .select('lane, status, account_id, website_id')
      .eq('website_id', websiteId)
      .eq('account_id', accountId)
      .limit(1000);
    if (error || !data) return { totalByLane, totalByStatus };

    for (const r of data as Array<Record<string, unknown>>) {
      if (
        r.website_id !== websiteId ||
        (r.account_id !== undefined && r.account_id !== accountId)
      ) {
        continue;
      }
      const lane = normaliseLane(r.lane);
      if (lane) totalByLane[lane] += 1;
      const bucket = bucketize(r.status as string | null);
      if (bucket) totalByStatus[bucket] += 1;
    }
  } catch {
    // best-effort
  }
  return { totalByLane, totalByStatus };
}
