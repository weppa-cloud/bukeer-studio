import type { AgentLane } from '@bukeer/website-contract';
import { CANONICAL_LANES, getGrowthOverview } from '@/lib/growth/console/queries';

/**
 * Growth OS Console — Overview tab (#405).
 *
 * Server Component. Surfaces operational health for the Symphony Orchestrator
 * runtime: agent enrollment, in-flight runs, backlog readiness, lane-level
 * agreement, and provider freshness.
 *
 * No direct provider calls (ADR-016). All freshness data flows through the
 * `seo_provider_cache` mirror that the orchestrator updates out-of-band.
 *
 * Refs:
 *   - SPEC_GROWTH_OS_SYMPHONY_ORCHESTRATOR.md §"Bukeer Studio UI Scope"
 *   - SPEC_GROWTH_OS_AGENT_LANES.md (lane catalogue)
 */

interface OverviewPageProps {
  params: Promise<{ websiteId: string }>;
}

const LANE_LABELS: Record<AgentLane, string> = {
  orchestrator: 'Orchestrator',
  technical_remediation: 'Technical Remediation',
  transcreation: 'Transcreation',
  content_creator: 'Content Creator',
  content_curator: 'Content Curator',
};

const MODE_LABELS: Record<string, string> = {
  observe_only: 'Observe',
  prepare_only: 'Prepare',
  auto_apply_safe: 'Auto-apply (safe)',
};

interface MetricCardProps {
  label: string;
  value: string;
  hint?: string;
}

function MetricCard({ label, value, hint }: MetricCardProps) {
  return (
    <article className="rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] bg-[var(--studio-surface,theme(colors.white))] p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-[var(--studio-text-muted,theme(colors.zinc.500))]">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold text-[var(--studio-text-strong,theme(colors.zinc.900))]">
        {value}
      </div>
      {hint ? (
        <div className="mt-1 text-xs text-[var(--studio-text-muted,theme(colors.zinc.500))]">
          {hint}
        </div>
      ) : null}
    </article>
  );
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return 'n/a';
  try {
    return new Date(iso).toLocaleString('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

export default async function GrowthOverviewPage({ params }: OverviewPageProps) {
  const { websiteId } = await params;

  let overview: Awaited<ReturnType<typeof getGrowthOverview>>;
  try {
    overview = await getGrowthOverview(websiteId);
  } catch (err) {
    return (
      <section
        role="alert"
        className="rounded-md border border-[var(--studio-danger,theme(colors.red.300))] bg-[var(--studio-danger-surface,theme(colors.red.50))] p-4 text-sm text-[var(--studio-danger,theme(colors.red.700))]"
      >
        <p className="font-medium">Could not load Growth Overview.</p>
        <p className="mt-1 text-xs">
          {err instanceof Error ? err.message : 'Unknown error.'}
        </p>
      </section>
    );
  }

  const inFlight =
    overview.runCounts.claimed
    + overview.runCounts.running
    + overview.runCounts.review_required;

  const agreementValue = overview.agreement
    ? overview.agreement.lanes.length === 0
      ? 'pending'
      : `${(
        overview.agreement.lanes.reduce((acc, l) => acc + l.agreement, 0)
        / overview.agreement.lanes.length
      ).toFixed(2)}`
    : 'pending';

  const lanesByName = new Map(
    (overview.agreement?.lanes ?? []).map((l) => [l.lane, l] as const),
  );
  const agentByLane = new Map<AgentLane, (typeof overview.agents)[number]>();
  for (const a of overview.agents) {
    if (!agentByLane.has(a.lane)) agentByLane.set(a.lane, a);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Warnings — keep concise; do not block render. */}
      {(overview.warnings.agentsTableMissing
        || overview.warnings.runsTableMissing
        || overview.warnings.backlogTableMissing) ? (
        <div
          role="status"
          className="rounded-md border border-[var(--studio-warning,theme(colors.amber.300))] bg-[var(--studio-warning-surface,theme(colors.amber.50))] p-3 text-xs text-[var(--studio-warning,theme(colors.amber.800))]"
        >
          Some Growth OS tables are not yet provisioned (#403 migration pending). The console renders empty defaults until the schema is in place.
        </div>
      ) : null}

      {/* Metric cards */}
      <section
        aria-labelledby="metrics-heading"
        className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4"
      >
        <h2 id="metrics-heading" className="sr-only">
          Operational metrics
        </h2>
        <MetricCard
          label="Agents enabled"
          value={`${overview.agentCounts.enabled} / ${overview.agentCounts.total || 0}`}
          hint={
            overview.agentCounts.autoApplySafe > 0
              ? `${overview.agentCounts.autoApplySafe} on auto-apply (safe)`
              : 'All in observe/prepare mode'
          }
        />
        <MetricCard
          label="Runs in flight"
          value={String(inFlight)}
          hint={`${overview.runCounts.review_required} awaiting review`}
        />
        <MetricCard
          label="Backlog ready"
          value={String(overview.backlogCounts.ready)}
          hint={`${overview.backlogCounts.total} total items`}
        />
        <MetricCard
          label="Agreement score"
          value={agreementValue}
          hint={
            overview.agreement
              ? `policy ${overview.agreement.policy_version}${
                overview.agreement.isPlaceholder ? ' (baseline placeholder)' : ''
              }`
              : 'No artifact yet'
          }
        />
      </section>

      {/* Lane status table */}
      <section aria-labelledby="lane-status-heading" className="flex flex-col gap-2">
        <header>
          <h2
            id="lane-status-heading"
            className="text-base font-semibold text-[var(--studio-text-strong,theme(colors.zinc.900))]"
          >
            Lane status
          </h2>
          <p className="text-sm text-[var(--studio-text-muted,theme(colors.zinc.500))]">
            One row per canonical lane (SPEC_GROWTH_OS_AGENT_LANES.md).
          </p>
        </header>
        <div className="overflow-x-auto rounded-md border border-[var(--studio-border,theme(colors.zinc.200))]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--studio-surface-muted,theme(colors.zinc.50))] text-xs uppercase tracking-wide text-[var(--studio-text-muted,theme(colors.zinc.500))]">
              <tr>
                <th scope="col" className="px-3 py-2 text-left">Lane</th>
                <th scope="col" className="px-3 py-2 text-left">Mode</th>
                <th scope="col" className="px-3 py-2 text-left">Agreement</th>
                <th scope="col" className="px-3 py-2 text-left">Sample</th>
                <th scope="col" className="px-3 py-2 text-left">Computed</th>
              </tr>
            </thead>
            <tbody>
              {CANONICAL_LANES.map((lane) => {
                const agent = agentByLane.get(lane);
                const agreement = lanesByName.get(lane);
                return (
                  <tr
                    key={lane}
                    className="border-t border-[var(--studio-border,theme(colors.zinc.200))]"
                  >
                    <th scope="row" className="px-3 py-2 text-left font-medium">
                      {LANE_LABELS[lane]}
                    </th>
                    <td className="px-3 py-2">
                      {agent ? (MODE_LABELS[agent.mode] ?? agent.mode) : '—'}
                    </td>
                    <td className="px-3 py-2">
                      {agreement ? agreement.agreement.toFixed(2) : 'pending'}
                    </td>
                    <td className="px-3 py-2">
                      {agreement ? String(agreement.sample_size) : '—'}
                    </td>
                    <td className="px-3 py-2 text-xs text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                      {agreement ? formatDate(agreement.computed_at) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {overview.agreement?.isPlaceholder ? (
          <p className="text-xs text-[var(--studio-text-muted,theme(colors.zinc.500))]">
            Agreement values are baseline placeholders — replace with real
            evaluator output once #404 ships ({overview.agreement.source_path}).
          </p>
        ) : null}
      </section>

      {/* Provider freshness */}
      <section
        aria-labelledby="provider-freshness-heading"
        className="flex flex-col gap-2"
      >
        <header>
          <h2
            id="provider-freshness-heading"
            className="text-base font-semibold text-[var(--studio-text-strong,theme(colors.zinc.900))]"
          >
            Provider freshness
          </h2>
          <p className="text-sm text-[var(--studio-text-muted,theme(colors.zinc.500))]">
            Read from <code>seo_provider_cache</code> — never queried from
            providers in the render path (ADR-016).
          </p>
        </header>
        {overview.warnings.providerCacheMissing ? (
          <p className="text-sm text-[var(--studio-text-muted,theme(colors.zinc.500))]">
            Provider cache table not provisioned yet — n/a.
          </p>
        ) : overview.providerFreshness.length === 0 ? (
          <p className="text-sm text-[var(--studio-text-muted,theme(colors.zinc.500))]">
            No provider rows for this tenant — n/a.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {overview.providerFreshness.map((row) => (
              <li
                key={row.provider}
                className="rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] p-3 text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{row.provider}</span>
                  <span className="text-xs text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                    {row.status}
                  </span>
                </div>
                <div className="mt-1 text-xs text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                  Last sync: {formatDate(row.last_synced_at)}
                </div>
                {row.message ? (
                  <div className="mt-1 text-xs text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                    {row.message}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
