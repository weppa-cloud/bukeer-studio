/**
 * Growth Console — server-side read helpers (#405).
 *
 * All reads are tenant-scoped (account_id + website_id, ADR-009) and run on
 * the SSR Supabase client. No direct provider calls happen in the render path
 * (ADR-016) — provider freshness is read from the cache table that the
 * orchestrator populates out-of-band.
 *
 * Tables consumed (some land via #403 in bukeer-flutter; until they exist in
 * the local generated types we cast to `any` and degrade gracefully on the
 * "missing relation" Postgres error code 42P01):
 *
 *   - growth_agent_definitions   (per-tenant agent registry)
 *   - growth_agent_runs          (run ledger)
 *   - growth_backlog_items       (unified backlog)
 *   - seo_provider_cache         (provider freshness mirror)
 *
 * Refs:
 *   - SPEC_GROWTH_OS_SYMPHONY_ORCHESTRATOR.md §"Bukeer Studio UI Scope"
 *   - SPEC_GROWTH_OS_AGENT_LANES.md §"Agent Lanes V1"
 *   - SPEC_GROWTH_OS_UNIFIED_BACKLOG_AND_PROFILE_RUN_LEDGER.md
 */

import 'server-only';
import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

import {
  AgentLaneSchema,
  GrowthAgentDefinitionSchema,
  type AgentLane,
  type GrowthAgentDefinition,
} from '@bukeer/website-contract';
import {
  AgentRunStatusSchema,
  type AgentRunStatus,
} from '@bukeer/website-contract';

import { createSupabaseServerClient } from '@/lib/supabase/server-client';
import { asTyped } from '@/lib/supabase/typed-client';
import { requireGrowthRole } from './auth';

const POSTGRES_MISSING_RELATION = '42P01';

/**
 * The five canonical lanes from SPEC_GROWTH_OS_AGENT_LANES.md.
 * Used to seed empty status rows in the Overview lane table.
 */
export const CANONICAL_LANES: readonly AgentLane[] =
  AgentLaneSchema.options;

export interface RunStatusCounts {
  claimed: number;
  running: number;
  review_required: number;
  failed: number;
  completed: number;
  stalled: number;
}

const ZERO_RUN_COUNTS: RunStatusCounts = {
  claimed: 0,
  running: 0,
  review_required: 0,
  failed: 0,
  completed: 0,
  stalled: 0,
};

const BacklogStatusSchema = z.enum([
  'idea',
  'queued',
  'in_progress',
  'shipped',
  'evaluated',
  'archived',
  // Tolerant fallthrough — backlog statuses may evolve before #406 ships.
]);
type BacklogStatus = z.infer<typeof BacklogStatusSchema>;

export interface BacklogStatusCounts {
  idea: number;
  queued: number;
  in_progress: number;
  shipped: number;
  evaluated: number;
  archived: number;
  ready: number;
  total: number;
}

const ZERO_BACKLOG_COUNTS: BacklogStatusCounts = {
  idea: 0,
  queued: 0,
  in_progress: 0,
  shipped: 0,
  evaluated: 0,
  archived: 0,
  ready: 0,
  total: 0,
};

export interface LaneAgreementEntry {
  lane: AgentLane;
  agreement: number;
  sample_size: number;
  policy_version: string;
  computed_at: string;
}

export interface LaneAgreementSnapshot {
  policy_version: string;
  computed_at: string;
  source_path: string;
  lanes: LaneAgreementEntry[];
  isPlaceholder: boolean;
}

export interface ProviderFreshnessRow {
  provider: string;
  last_synced_at: string | null;
  status: string;
  message: string | null;
}

export interface AgentDefinitionsResult {
  agents: GrowthAgentDefinition[];
  missingTable: boolean;
  errored: boolean;
}

export interface GrowthOverview {
  agents: GrowthAgentDefinition[];
  agentCounts: {
    total: number;
    enabled: number;
    autoApplySafe: number;
  };
  runCounts: RunStatusCounts;
  backlogCounts: BacklogStatusCounts;
  agreement: LaneAgreementSnapshot | null;
  providerFreshness: ProviderFreshnessRow[];
  warnings: {
    agentsTableMissing: boolean;
    runsTableMissing: boolean;
    backlogTableMissing: boolean;
    providerCacheMissing: boolean;
  };
}

interface RawAgentDefinitionRow {
  account_id: string;
  website_id: string;
  agent_id: string;
  lane: string;
  name: string;
  enabled: boolean;
  mode: string;
  model: string;
  prompt_version: string;
  workflow_version: string;
  agreement_threshold: number;
  max_concurrent_runs: number;
  max_active_experiments: number;
  locale: string;
  market: string;
  created_at: string;
  updated_at: string;
}

function isMissingRelation(error: { code?: string | null } | null): boolean {
  return error?.code === POSTGRES_MISSING_RELATION;
}

async function fetchAgents(
  websiteId: string,
  accountId: string,
): Promise<AgentDefinitionsResult> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await asTyped(supabase)
    .from('growth_agent_definitions')
    .select(
      'account_id, website_id, agent_id, lane, name, enabled, mode, model, prompt_version, workflow_version, agreement_threshold, max_concurrent_runs, max_active_experiments, locale, market, created_at, updated_at',
    )
    .eq('account_id', accountId)
    .eq('website_id', websiteId)
    .order('lane', { ascending: true });

  if (error) {
    if (isMissingRelation(error)) {
      return { agents: [], missingTable: true, errored: false };
    }
    return { agents: [], missingTable: false, errored: true };
  }

  const rows = (data ?? []) as RawAgentDefinitionRow[];
  const parsed: GrowthAgentDefinition[] = [];
  for (const row of rows) {
    const candidate = GrowthAgentDefinitionSchema.safeParse(row);
    if (candidate.success) parsed.push(candidate.data);
  }
  return { agents: parsed, missingTable: false, errored: false };
}

async function fetchRunCounts(
  websiteId: string,
  accountId: string,
): Promise<{ counts: RunStatusCounts; missingTable: boolean; errored: boolean }> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await asTyped(supabase)
    .from('growth_agent_runs')
    .select('status')
    .eq('account_id', accountId)
    .eq('website_id', websiteId);

  if (error) {
    if (isMissingRelation(error)) {
      return { counts: { ...ZERO_RUN_COUNTS }, missingTable: true, errored: false };
    }
    return { counts: { ...ZERO_RUN_COUNTS }, missingTable: false, errored: true };
  }

  const rows = (data ?? []) as Array<{ status: string }>;
  const counts: RunStatusCounts = { ...ZERO_RUN_COUNTS };
  for (const row of rows) {
    const parsed = AgentRunStatusSchema.safeParse(row.status);
    if (!parsed.success) continue;
    const status: AgentRunStatus = parsed.data;
    counts[status] += 1;
  }
  return { counts, missingTable: false, errored: false };
}

async function fetchBacklogCounts(
  websiteId: string,
  accountId: string,
): Promise<{
  counts: BacklogStatusCounts;
  missingTable: boolean;
  errored: boolean;
}> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await asTyped(supabase)
    .from('growth_backlog_items')
    .select('status')
    .eq('account_id', accountId)
    .eq('website_id', websiteId);

  if (error) {
    if (isMissingRelation(error)) {
      return {
        counts: { ...ZERO_BACKLOG_COUNTS },
        missingTable: true,
        errored: false,
      };
    }
    return {
      counts: { ...ZERO_BACKLOG_COUNTS },
      missingTable: false,
      errored: true,
    };
  }

  const rows = (data ?? []) as Array<{ status: string | null }>;
  const counts: BacklogStatusCounts = { ...ZERO_BACKLOG_COUNTS };
  for (const row of rows) {
    counts.total += 1;
    if (!row.status) continue;
    // Real growth_backlog_items.status values include `ready_for_council`,
    // `approved_for_execution`, `queued`, `brief_in_progress`, `done`,
    // `blocked`. Map to the BacklogStatus enum where it overlaps; treat
    // `ready_for_council` as the "ready" bucket.
    if (row.status === 'ready_for_council') {
      counts.ready += 1;
      continue;
    }
    const parsed = BacklogStatusSchema.safeParse(row.status);
    if (parsed.success) {
      const status: BacklogStatus = parsed.data;
      counts[status] += 1;
    }
  }
  return { counts, missingTable: false, errored: false };
}

async function fetchProviderFreshness(
  websiteId: string,
  accountId: string,
): Promise<{ rows: ProviderFreshnessRow[]; missingTable: boolean; errored: boolean }> {
  const supabase = await createSupabaseServerClient();

  // `seo_provider_cache` is the single source of truth for provider
  // freshness — ADR-016 forbids direct provider calls in the render path.
  // The relation may not exist in every environment yet (provisioned
  // out-of-band). Cast to bypass the literal-table-name check; missing
  // relation surfaces as 42P01 below.
  const { data, error } = await (asTyped(supabase).from as unknown as (
    table: string,
  ) => ReturnType<typeof supabase.from>)('seo_provider_cache')
    .select('provider, last_synced_at, status, message')
    .eq('account_id', accountId)
    .eq('website_id', websiteId)
    .order('provider', { ascending: true });

  if (error) {
    if (isMissingRelation(error)) {
      return { rows: [], missingTable: true, errored: false };
    }
    return { rows: [], missingTable: false, errored: true };
  }

  const rows = (data ?? []) as Array<{
    provider: string;
    last_synced_at: string | null;
    status: string;
    message: string | null;
  }>;
  return { rows, missingTable: false, errored: false };
}

const AgreementFileSchema = z.object({
  policy_version: z.string(),
  computed_at: z.string(),
  lanes: z.array(
    z.object({
      account_id: z.string().optional(),
      website_id: z.string().optional(),
      lane: AgentLaneSchema,
      agreement: z.number(),
      policy_version: z.string(),
      computed_at: z.string(),
      sample_size: z.number().int().nonnegative(),
    }),
  ),
  _comment: z.string().optional(),
});

/**
 * Read the latest evaluator agreement artifact from disk.
 *
 * Files live under `evidence/growth/agreement-lane-YYYY-MM-DD.json` and are
 * produced out-of-band by the evaluator (#404). MVP picks the most recent
 * file by lexical sort (ISO date in filename → lexical = chronological).
 */
export async function getLaneAgreement(
  websiteId: string,
): Promise<LaneAgreementSnapshot | null> {
  // websiteId is reserved for future per-tenant artifact paths; we currently
  // ship a single account-wide file in MVP.
  void websiteId;

  const dir = path.join(process.cwd(), 'evidence', 'growth');
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return null;
  }

  const files = entries
    .filter((f) => f.startsWith('agreement-lane-') && f.endsWith('.json'))
    .sort()
    .reverse();

  if (files.length === 0) return null;

  const target = path.join(dir, files[0]);
  let raw: string;
  try {
    raw = await fs.readFile(target, 'utf-8');
  } catch {
    return null;
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }

  const parsed = AgreementFileSchema.safeParse(json);
  if (!parsed.success) return null;

  const isPlaceholder = typeof parsed.data._comment === 'string'
    && parsed.data._comment.toLowerCase().includes('placeholder');

  // Roll-up: if multiple rows per lane, keep the highest sample_size.
  const byLane = new Map<AgentLane, LaneAgreementEntry>();
  for (const row of parsed.data.lanes) {
    const existing = byLane.get(row.lane);
    if (!existing || row.sample_size > existing.sample_size) {
      byLane.set(row.lane, {
        lane: row.lane,
        agreement: row.agreement,
        sample_size: row.sample_size,
        policy_version: row.policy_version,
        computed_at: row.computed_at,
      });
    }
  }

  return {
    policy_version: parsed.data.policy_version,
    computed_at: parsed.data.computed_at,
    source_path: path.relative(process.cwd(), target),
    lanes: Array.from(byLane.values()),
    isPlaceholder,
  };
}

/**
 * Tenant-guarded read for the Overview tab.
 */
export async function getGrowthOverview(
  websiteId: string,
): Promise<GrowthOverview> {
  const ctx = await requireGrowthRole(websiteId, 'viewer');

  const [agentsResult, runsResult, backlogResult, providerResult, agreement] =
    await Promise.all([
      fetchAgents(ctx.websiteId, ctx.accountId),
      fetchRunCounts(ctx.websiteId, ctx.accountId),
      fetchBacklogCounts(ctx.websiteId, ctx.accountId),
      fetchProviderFreshness(ctx.websiteId, ctx.accountId),
      getLaneAgreement(ctx.websiteId),
    ]);

  const enabled = agentsResult.agents.filter((a) => a.enabled).length;
  const autoApplySafe = agentsResult.agents.filter(
    (a) => a.mode === 'auto_apply_safe',
  ).length;

  return {
    agents: agentsResult.agents,
    agentCounts: {
      total: agentsResult.agents.length,
      enabled,
      autoApplySafe,
    },
    runCounts: runsResult.counts,
    backlogCounts: backlogResult.counts,
    agreement,
    providerFreshness: providerResult.rows,
    warnings: {
      agentsTableMissing: agentsResult.missingTable,
      runsTableMissing: runsResult.missingTable,
      backlogTableMissing: backlogResult.missingTable,
      providerCacheMissing: providerResult.missingTable,
    },
  };
}

/**
 * Tenant-guarded read for the Agents tab.
 */
export async function getGrowthAgents(
  websiteId: string,
): Promise<AgentDefinitionsResult> {
  const ctx = await requireGrowthRole(websiteId, 'viewer');
  return fetchAgents(ctx.websiteId, ctx.accountId);
}
