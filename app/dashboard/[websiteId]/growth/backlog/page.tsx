import { redirect } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';

import {
  AgentLaneSchema,
  type AgentLane,
} from '@bukeer/website-contract';
import {
  StudioPage,
  StudioSectionHeader,
  StudioBadge,
  StudioEmptyState,
} from '@/components/studio/ui/primitives';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';
import {
  getBacklogByLane,
  getContentTasksByLane,
  BACKLOG_STATUS_BUCKETS,
  type BacklogQueryResult,
  type BacklogRow,
  type BacklogStatusBucket,
} from '@/lib/growth/console/queries-backlog';

/**
 * Growth Console — Backlog by Lane (SPEC #403, Issue #406).
 *
 * Server Component (ADR-001). Read-only view of `growth_backlog_items` and
 * `growth_content_tasks`, grouped by canonical agent lane (5 lanes, see
 * SPEC_GROWTH_OS_AGENT_LANES.md V1).
 *
 * Tenant guard:
 *   - Resolves `account_id` from the website row (RLS filters by user) and
 *     passes both `account_id` and `website_id` to every helper. Helpers
 *     re-assert tenant scope on each returned row.
 *
 * No mutations: Council promotion, approve/reject and blocked/watch toggles
 * land in a follow-up issue. Per SPEC_GROWTH_OS_SYMPHONY_ORCHESTRATOR.md
 * §"Bukeer Studio UI Scope", this MVP is read-only.
 */

const LANES: ReadonlyArray<AgentLane> = [
  'orchestrator',
  'technical_remediation',
  'transcreation',
  'content_creator',
  'content_curator',
];

const LANE_LABELS: Record<AgentLane, string> = {
  orchestrator: 'Orchestrator',
  technical_remediation: 'Technical remediation',
  transcreation: 'Transcreation',
  content_creator: 'Content creator',
  content_curator: 'Content curator',
};

const SearchParamsSchema = z.object({
  lane: AgentLaneSchema.optional(),
  status: z.enum(BACKLOG_STATUS_BUCKETS).optional(),
  page: z.coerce.number().int().min(1).max(1000).optional(),
  pageSize: z.coerce.number().int().min(5).max(100).optional(),
});

interface BacklogPageProps {
  params: Promise<{ websiteId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function buildHref(
  websiteId: string,
  current: { lane?: AgentLane; status?: BacklogStatusBucket; page?: number; pageSize?: number },
  override: Partial<{ lane?: AgentLane | null; status?: BacklogStatusBucket | null; page?: number; pageSize?: number }>,
): string {
  const params = new URLSearchParams();
  const lane = 'lane' in override ? override.lane : current.lane;
  const status = 'status' in override ? override.status : current.status;
  const page = 'page' in override ? override.page : current.page;
  const pageSize = 'pageSize' in override ? override.pageSize : current.pageSize;
  if (lane) params.set('lane', lane);
  if (status) params.set('status', status);
  if (page && page > 1) params.set('page', String(page));
  if (pageSize && pageSize !== 25) params.set('pageSize', String(pageSize));
  const qs = params.toString();
  return `/dashboard/${websiteId}/growth/backlog${qs ? `?${qs}` : ''}`;
}

function StatusPill({ status }: { status: string | null }) {
  if (!status) return <StudioBadge tone="neutral">—</StudioBadge>;
  let tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger' = 'neutral';
  if (status === 'blocked' || status === 'rejected') tone = 'danger';
  else if (status === 'watch') tone = 'warning';
  else if (status === 'done' || status === 'shipped' || status === 'evaluated') tone = 'success';
  else if (status.startsWith('ready')) tone = 'info';
  else if (status.includes('progress') || status === 'approved_for_execution') tone = 'info';
  return <StudioBadge tone={tone}>{status}</StudioBadge>;
}

function ReviewPill({ value }: { value: string | null }) {
  if (!value) return <span className="text-xs text-[var(--studio-text-muted)]">—</span>;
  let tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger' = 'neutral';
  if (/approve|pass|success/i.test(value)) tone = 'success';
  else if (/reject|fail|block/i.test(value)) tone = 'danger';
  else if (/watch|pending|review/i.test(value)) tone = 'warning';
  return <StudioBadge tone={tone}>{value}</StudioBadge>;
}

function BacklogTable({ rows }: { rows: BacklogRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-[var(--studio-text-muted)] px-1 py-3">
        No items in this lane for the selected filters.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-[var(--studio-text-muted)] border-b border-[var(--studio-border)]">
            <th className="py-2 pr-3 font-medium">Title</th>
            <th className="py-2 pr-3 font-medium">Source</th>
            <th className="py-2 pr-3 font-medium">Status</th>
            <th className="py-2 pr-3 font-medium">Council ready</th>
            <th className="py-2 pr-3 font-medium">Next action</th>
            <th className="py-2 pr-3 font-medium">Blocked reason</th>
            <th className="py-2 pr-3 font-medium">AI review</th>
            <th className="py-2 pr-3 font-medium">Human review</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-b border-[var(--studio-border)]/50 align-top"
            >
              <td className="py-2 pr-3 max-w-[320px]">
                <div className="font-medium text-[var(--studio-text)]">
                  {row.title ?? <span className="italic opacity-70">untitled</span>}
                </div>
                <div className="text-xs text-[var(--studio-text-muted)] font-mono">
                  {row.id}
                </div>
              </td>
              <td className="py-2 pr-3 font-mono text-xs">
                {row.source_table ?? '—'}
              </td>
              <td className="py-2 pr-3">
                <StatusPill status={row.status} />
              </td>
              <td className="py-2 pr-3">
                {row.council_ready === true ? (
                  <StudioBadge tone="success">yes</StudioBadge>
                ) : row.council_ready === false ? (
                  <StudioBadge tone="neutral">no</StudioBadge>
                ) : (
                  <span className="text-xs text-[var(--studio-text-muted)]">—</span>
                )}
              </td>
              <td className="py-2 pr-3 max-w-[280px] text-xs">
                {row.next_action ?? '—'}
              </td>
              <td className="py-2 pr-3 max-w-[240px] text-xs">
                {row.blocked_reason ?? '—'}
              </td>
              <td className="py-2 pr-3">
                <ReviewPill value={row.ai_review_state} />
              </td>
              <td className="py-2 pr-3">
                <ReviewPill value={row.human_review_state} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface LaneSectionProps {
  lane: AgentLane;
  websiteId: string;
  result: BacklogQueryResult;
  current: { lane?: AgentLane; status?: BacklogStatusBucket; page?: number; pageSize?: number };
  selectedLane?: AgentLane;
}

function LaneSection({ lane, websiteId, result, current, selectedLane }: LaneSectionProps) {
  // When a lane filter is active, only render that lane's section.
  if (selectedLane && selectedLane !== lane) return null;

  // For each lane section we render the rows whose lane === lane (or where
  // a lane filter scoped the entire result already).
  const rowsForLane = selectedLane
    ? result.items
    : result.items.filter((r) => r.lane === lane);

  const laneTotal = result.totalByLane[lane] ?? 0;
  const isPaginated = Boolean(selectedLane && selectedLane === lane);
  const totalPages = isPaginated
    ? Math.max(1, Math.ceil(result.total / result.pageSize))
    : 1;
  const currentPage = isPaginated ? result.page : 1;

  return (
    <section
      key={lane}
      aria-labelledby={`lane-${lane}-heading`}
      className="space-y-3 mt-6"
    >
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3
            id={`lane-${lane}-heading`}
            className="text-base font-semibold text-[var(--studio-text)]"
          >
            {LANE_LABELS[lane]}
          </h3>
          <p className="text-xs text-[var(--studio-text-muted)]">
            {laneTotal} total · showing {rowsForLane.length}
          </p>
        </div>
        {!selectedLane ? (
          <Link
            href={buildHref(websiteId, current, { lane, page: 1 })}
            className="text-xs underline text-[var(--studio-text-muted)] hover:text-[var(--studio-text)]"
          >
            Filter to lane →
          </Link>
        ) : (
          <Link
            href={buildHref(websiteId, current, { lane: null, page: 1 })}
            className="text-xs underline text-[var(--studio-text-muted)] hover:text-[var(--studio-text)]"
          >
            Clear lane filter
          </Link>
        )}
      </header>

      <BacklogTable rows={rowsForLane} />

      {isPaginated && totalPages > 1 ? (
        <nav
          aria-label={`Pagination for ${LANE_LABELS[lane]}`}
          className="flex items-center justify-between text-xs text-[var(--studio-text-muted)] mt-2"
        >
          <span>
            Page {currentPage} of {totalPages} · {result.total} items
          </span>
          <div className="flex items-center gap-2">
            {currentPage > 1 ? (
              <Link
                href={buildHref(websiteId, current, { page: currentPage - 1 })}
                className="underline hover:text-[var(--studio-text)]"
              >
                ← Prev
              </Link>
            ) : (
              <span className="opacity-50">← Prev</span>
            )}
            {currentPage < totalPages ? (
              <Link
                href={buildHref(websiteId, current, { page: currentPage + 1 })}
                className="underline hover:text-[var(--studio-text)]"
              >
                Next →
              </Link>
            ) : (
              <span className="opacity-50">Next →</span>
            )}
          </div>
        </nav>
      ) : null}
    </section>
  );
}

function FilterBar({
  websiteId,
  current,
}: {
  websiteId: string;
  current: { lane?: AgentLane; status?: BacklogStatusBucket; page?: number; pageSize?: number };
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 mt-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs uppercase tracking-wide text-[var(--studio-text-muted)]">
          Lane:
        </span>
        <Link
          href={buildHref(websiteId, current, { lane: null, page: 1 })}
          className={`text-xs px-2 py-1 rounded border ${
            !current.lane
              ? 'bg-[var(--studio-text)] text-[var(--studio-bg)] border-transparent'
              : 'border-[var(--studio-border)] hover:border-[var(--studio-text)]'
          }`}
        >
          all
        </Link>
        {LANES.map((lane) => (
          <Link
            key={lane}
            href={buildHref(websiteId, current, { lane, page: 1 })}
            className={`text-xs px-2 py-1 rounded border ${
              current.lane === lane
                ? 'bg-[var(--studio-text)] text-[var(--studio-bg)] border-transparent'
                : 'border-[var(--studio-border)] hover:border-[var(--studio-text)]'
            }`}
          >
            {LANE_LABELS[lane]}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs uppercase tracking-wide text-[var(--studio-text-muted)]">
          Status:
        </span>
        <Link
          href={buildHref(websiteId, current, { status: null, page: 1 })}
          className={`text-xs px-2 py-1 rounded border ${
            !current.status
              ? 'bg-[var(--studio-text)] text-[var(--studio-bg)] border-transparent'
              : 'border-[var(--studio-border)] hover:border-[var(--studio-text)]'
          }`}
        >
          all
        </Link>
        {BACKLOG_STATUS_BUCKETS.map((bucket) => (
          <Link
            key={bucket}
            href={buildHref(websiteId, current, { status: bucket, page: 1 })}
            className={`text-xs px-2 py-1 rounded border ${
              current.status === bucket
                ? 'bg-[var(--studio-text)] text-[var(--studio-bg)] border-transparent'
                : 'border-[var(--studio-border)] hover:border-[var(--studio-text)]'
            }`}
          >
            {bucket}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default async function BacklogByLanePage({
  params,
  searchParams,
}: BacklogPageProps) {
  const { websiteId } = await params;
  const rawSearch = await searchParams;

  // Parse with safeParse so a stray param doesn't crash the page.
  const parsed = SearchParamsSchema.safeParse({
    lane: rawSearch.lane,
    status: rawSearch.status,
    page: rawSearch.page,
    pageSize: rawSearch.pageSize,
  });
  const filters = parsed.success ? parsed.data : {};
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 25;
  const lane = filters.lane;
  const statusBucket = filters.status;

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Tenant guard — resolve account_id from the website row (RLS scoped to the
  // user). If the user can't see this website, RLS returns no row and we
  // redirect to the dashboard root instead of leaking existence.
  const { data: website, error: websiteError } = await supabase
    .from('websites')
    .select('id, account_id')
    .eq('id', websiteId)
    .single();

  if (websiteError || !website) {
    redirect('/dashboard');
  }

  const accountId = website.account_id as string;
  if (!accountId) {
    // Defensive — every website row must carry account_id (ADR-009).
    redirect('/dashboard');
  }

  // Two parallel reads, each tenant-scoped.
  const [backlog, contentTasks] = await Promise.all([
    getBacklogByLane(supabase, websiteId, {
      accountId,
      lane,
      statusBucket,
      page,
      pageSize,
    }),
    getContentTasksByLane(supabase, websiteId, {
      accountId,
      lane,
      statusBucket,
      page,
      pageSize,
    }),
  ]);

  const current = { lane, status: statusBucket, page, pageSize };

  const totalAcross =
    backlog.total + contentTasks.total + 0; /* experiments TBD */

  const bothMissing = backlog.tableMissing && contentTasks.tableMissing;
  const anyError = backlog.errored || contentTasks.errored;

  return (
    <StudioPage className="max-w-7xl">
      <StudioSectionHeader
        title="Backlog by Lane"
        subtitle="Operate work by canonical agent lane, status and Council readiness. Read-only MVP."
        actions={
          <div className="flex items-center gap-2">
            <StudioBadge tone="info">SPEC #403 · Issue #406</StudioBadge>
          </div>
        }
      />

      {/*
        Mutations land in a follow-up — Council promotion is read-only here per SPEC.
        See SPEC_GROWTH_OS_SYMPHONY_ORCHESTRATOR.md §"Bukeer Studio UI Scope".
      */}
      <p className="text-xs text-[var(--studio-text-muted)] mt-1">
        Read-only view. Approve / reject / promote actions ship in a follow-up
        per the Symphony Orchestrator MVP scope.
      </p>

      {anyError ? (
        <div
          className="studio-panel border border-[var(--studio-danger)]/40 text-[var(--studio-danger)] p-3 text-sm mt-4"
          role="alert"
        >
          We could not load some backlog rows. Reload the page; if the problem
          persists, check the Studio server logs.
        </div>
      ) : null}

      <FilterBar websiteId={websiteId} current={current} />

      {bothMissing || totalAcross === 0 ? (
        <div data-testid="growth-backlog-empty-state" className="mt-6">
          <StudioEmptyState
            title="No backlog yet"
            description="Run the backlog generator (#397) or the Council packet generator (#399) to populate this view. While the migrations are still pending the underlying tables may not exist in this environment."
          />
        </div>
      ) : null}

      {!bothMissing && totalAcross > 0 ? (
        <div data-testid="growth-backlog-table">
          <section
            aria-labelledby="backlog-items-heading"
            className="space-y-2 mt-6"
          >
            <header className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2
                  id="backlog-items-heading"
                  className="text-lg font-semibold text-[var(--studio-text)]"
                >
                  Backlog items
                </h2>
                <p className="text-xs text-[var(--studio-text-muted)]">
                  Source: <code>growth_backlog_items</code> · {backlog.total} items match
                </p>
              </div>
            </header>

            {backlog.tableMissing ? (
              <p className="text-xs text-[var(--studio-text-muted)]">
                <code>growth_backlog_items</code> not present yet — the
                migration lands with #395 / #397.
              </p>
            ) : (
              LANES.map((laneId) => (
                <LaneSection
                  key={laneId}
                  lane={laneId}
                  websiteId={websiteId}
                  result={backlog}
                  current={current}
                  selectedLane={lane}
                />
              ))
            )}
          </section>

          <section
            aria-labelledby="content-tasks-heading"
            className="space-y-2 mt-10"
          >
            <header>
              <h2
                id="content-tasks-heading"
                className="text-lg font-semibold text-[var(--studio-text)]"
              >
                Content tasks
              </h2>
              <p className="text-xs text-[var(--studio-text-muted)]">
                Source: <code>growth_content_tasks</code> · {contentTasks.total} items match
              </p>
            </header>

            {contentTasks.tableMissing ? (
              <p className="text-xs text-[var(--studio-text-muted)]">
                <code>growth_content_tasks</code> not present yet — the
                migration lands with #396.
              </p>
            ) : (
              LANES.map((laneId) => (
                <LaneSection
                  key={laneId}
                  lane={laneId}
                  websiteId={websiteId}
                  result={contentTasks}
                  current={current}
                  selectedLane={lane}
                />
              ))
            )}
          </section>
        </div>
      ) : null}
    </StudioPage>
  );
}
