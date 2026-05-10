import {
  StudioPage,
  StudioSectionHeader,
  StudioBadge,
  StudioEmptyState,
} from "@/components/studio/ui/primitives";
import { getGrowthDataHealth } from "@/lib/growth/console/queries";

interface DataHealthPageProps {
  params: Promise<{ websiteId: string }>;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "n/a";
  try {
    return new Date(iso).toLocaleString("es-CO", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function providerTone(
  status: string,
): "neutral" | "success" | "warning" | "danger" | "info" {
  const normalized = status.toLowerCase();
  if (/(pass|connected|success|ok|fresh)/.test(normalized)) return "success";
  if (/(watch|stale|expired|pending|approval)/.test(normalized))
    return "warning";
  if (/(blocked|error|failed|missing|cost_gated|quota)/.test(normalized))
    return "danger";
  return "info";
}

function formatCost(value: number | null | undefined): string {
  if (typeof value !== "number") return "n/a";
  return `$${value.toFixed(4)}`;
}

export default async function GrowthDataHealthPage({
  params,
}: DataHealthPageProps) {
  const { websiteId } = await params;
  const health = await getGrowthDataHealth(websiteId);

  const activeRuns =
    health.runCounts.claimed +
    health.runCounts.running +
    health.runCounts.review_required;
  const runtimeHealth = health.runtimeHealth;

  return (
    <StudioPage className="max-w-6xl">
      <StudioSectionHeader
        title="Data Health"
        subtitle="Freshness, provider status and runtime signals. No provider calls are made in the render path."
        actions={
          <StudioBadge tone="info" className="whitespace-nowrap">
            Control Plane UX
          </StudioBadge>
        }
      />

      <section
        aria-labelledby="data-health-summary"
        data-testid="growth-data-health-summary"
        className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3"
      >
        <h2 id="data-health-summary" className="sr-only">
          Data health summary
        </h2>
        <article className="rounded-md border border-[var(--studio-border)] p-4">
          <div className="text-xs uppercase tracking-wide text-[var(--studio-text-muted)]">
            Provider profiles
          </div>
          <div className="mt-1 text-2xl font-semibold">
            {health.providerProfileRuns.length}
          </div>
          <p className="mt-1 text-xs text-[var(--studio-text-muted)]">
            Freshness, cost and blocker rows from growth_profile_runs.
          </p>
        </article>
        <article className="rounded-md border border-[var(--studio-border)] p-4">
          <div className="text-xs uppercase tracking-wide text-[var(--studio-text-muted)]">
            Work needing review
          </div>
          <div className="mt-1 text-2xl font-semibold">
            {health.runCounts.review_required}
          </div>
          <p className="mt-1 text-xs text-[var(--studio-text-muted)]">
            Agent output waiting for human/Curator decision.
          </p>
        </article>
        <article className="rounded-md border border-[var(--studio-border)] p-4">
          <div className="text-xs uppercase tracking-wide text-[var(--studio-text-muted)]">
            Runtime active
          </div>
          <div className="mt-1 text-2xl font-semibold">{activeRuns}</div>
          <p className="mt-1 text-xs text-[var(--studio-text-muted)]">
            Claimed, running or review-required work.
          </p>
        </article>
      </section>

      <section
        aria-labelledby="runtime-health-heading"
        data-testid="growth-runtime-health"
        className="mt-6 space-y-3"
      >
        <header>
          <h2
            id="runtime-health-heading"
            className="text-base font-semibold text-[var(--studio-text)]"
          >
            Runtime Maturity Score: {runtimeHealth.maturityScore}/
            {runtimeHealth.maturityTarget}
          </h2>
          <p className="text-sm text-[var(--studio-text-muted)]">
            Evidencia operativa del loop execute, artifact, review, learning,
            gateway y replay. Esta vista no activa memoria, skills ni
            mutaciones.
          </p>
        </header>

        {runtimeHealth.missingTables.length > 0 ? (
          <div
            role="status"
            className="rounded-md border border-[var(--studio-warning,theme(colors.amber.300))] bg-[var(--studio-warning-surface,theme(colors.amber.50))] p-3 text-sm text-[var(--studio-warning,theme(colors.amber.800))]"
          >
            <p className="font-medium">Runtime learning tables missing.</p>
            <p className="mt-1 text-xs">
              Pending tables: {runtimeHealth.missingTables.join(", ")}
            </p>
          </div>
        ) : null}

        <article className="rounded-md border border-[var(--studio-border)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-[var(--studio-text-muted)]">
                Calificación calculada
              </div>
              <div className="mt-1 text-3xl font-semibold">
                {runtimeHealth.maturityScore}/{runtimeHealth.maturityTarget}
              </div>
              <p className="mt-1 text-sm text-[var(--studio-text-muted)]">
                {runtimeHealth.maturityLabel}
              </p>
            </div>
            <StudioBadge
              tone={
                runtimeHealth.maturityScore >= 9
                  ? "success"
                  : runtimeHealth.maturityScore >= 8.5
                    ? "info"
                    : runtimeHealth.maturityScore >= 7
                      ? "warning"
                      : "danger"
              }
            >
              Target 9
            </StudioBadge>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
            {runtimeHealth.maturityBreakdown.map((item) => (
              <div
                key={item.key}
                className="rounded border border-[var(--studio-border)] px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium">{item.label}</span>
                  <span>
                    {item.score}/{item.max}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded bg-[var(--studio-surface-muted,theme(colors.zinc.100))]">
                  <div
                    className="h-full bg-[var(--studio-primary)]"
                    style={{
                      width: `${Math.round((item.score / item.max) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-md border border-[var(--studio-border)] p-4">
            <div className="text-xs uppercase tracking-wide text-[var(--studio-text-muted)]">
              Artifacts
            </div>
            <div className="mt-1 text-2xl font-semibold">
              {runtimeHealth.completeArtifacts}/{runtimeHealth.metricsRows}
            </div>
            <p className="mt-1 text-xs text-[var(--studio-text-muted)]">
              Complete structured artifacts over metric rows.
            </p>
          </article>
          <article className="rounded-md border border-[var(--studio-border)] p-4">
            <div className="text-xs uppercase tracking-wide text-[var(--studio-text-muted)]">
              Tool gateway
            </div>
            <div className="mt-1 text-2xl font-semibold">
              {runtimeHealth.toolCalls}
            </div>
            <p className="mt-1 text-xs text-[var(--studio-text-muted)]">
              {runtimeHealth.blockedToolCalls} blocked by policy ledger.
            </p>
          </article>
          <article className="rounded-md border border-[var(--studio-border)] p-4">
            <div className="text-xs uppercase tracking-wide text-[var(--studio-text-muted)]">
              Replay
            </div>
            <div className="mt-1 text-2xl font-semibold">
              {runtimeHealth.replayCandidates}
            </div>
            <p className="mt-1 text-xs text-[var(--studio-text-muted)]">
              Candidate cases waiting for eval curation;{" "}
              {runtimeHealth.activeReplayCases} active.
            </p>
          </article>
          <article className="rounded-md border border-[var(--studio-border)] p-4">
            <div className="text-xs uppercase tracking-wide text-[var(--studio-text-muted)]">
              Failures
            </div>
            <div className="mt-1 text-2xl font-semibold">
              {runtimeHealth.failedExecutions}
            </div>
            <p className="mt-1 text-xs text-[var(--studio-text-muted)]">
              Non-zero exits or classified runtime errors;{" "}
              {runtimeHealth.stalledRuns} stalled runs.
            </p>
          </article>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <article className="rounded-md border border-[var(--studio-border)] p-4">
            <div className="text-xs uppercase tracking-wide text-[var(--studio-text-muted)]">
              Cost
            </div>
            <div className="mt-1 text-2xl font-semibold">
              ${runtimeHealth.totalCostUsd.toFixed(4)}
            </div>
            <p className="mt-1 text-xs text-[var(--studio-text-muted)]">
              Current Codex CLI may not expose usage; nulls count as zero.
            </p>
          </article>
          <article className="rounded-md border border-[var(--studio-border)] p-4">
            <div className="text-xs uppercase tracking-wide text-[var(--studio-text-muted)]">
              Input tokens
            </div>
            <div className="mt-1 text-2xl font-semibold">
              {runtimeHealth.tokensInput}
            </div>
            <p className="mt-1 text-xs text-[var(--studio-text-muted)]">
              Aggregated from runtime metrics when available.
            </p>
          </article>
          <article className="rounded-md border border-[var(--studio-border)] p-4">
            <div className="text-xs uppercase tracking-wide text-[var(--studio-text-muted)]">
              Output tokens
            </div>
            <div className="mt-1 text-2xl font-semibold">
              {runtimeHealth.tokensOutput}
            </div>
            <p className="mt-1 text-xs text-[var(--studio-text-muted)]">
              Aggregated from runtime metrics when available.
            </p>
          </article>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <article className="rounded-md border border-[var(--studio-border)] p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold">Memory</h3>
              <StudioBadge tone="info">
                {runtimeHealth.activeMemories} active
              </StudioBadge>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div>
                <dt className="text-[var(--studio-text-muted)]">Draft</dt>
                <dd className="font-semibold">{runtimeHealth.draftMemories}</dd>
              </div>
              <div>
                <dt className="text-[var(--studio-text-muted)]">Active</dt>
                <dd className="font-semibold">
                  {runtimeHealth.activeMemories}
                </dd>
              </div>
            </dl>
          </article>
          <article className="rounded-md border border-[var(--studio-border)] p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold">Skills</h3>
              <StudioBadge tone="info">
                {runtimeHealth.activeSkills} active
              </StudioBadge>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div>
                <dt className="text-[var(--studio-text-muted)]">Draft</dt>
                <dd className="font-semibold">{runtimeHealth.draftSkills}</dd>
              </div>
              <div>
                <dt className="text-[var(--studio-text-muted)]">Active</dt>
                <dd className="font-semibold">{runtimeHealth.activeSkills}</dd>
              </div>
            </dl>
          </article>
        </div>
      </section>

      <section
        aria-labelledby="provider-health-heading"
        className="mt-6 space-y-3"
      >
        <header>
          <h2
            id="provider-health-heading"
            className="text-base font-semibold text-[var(--studio-text)]"
          >
            Fuentes de datos
          </h2>
          <p className="text-sm text-[var(--studio-text-muted)]">
            La UI lee cache/facts operativos. Si una fuente esta ausente,
            Council debe tratarla como WATCH o BLOCKED segun impacto.
          </p>
        </header>

        {health.warnings.providerCacheMissing &&
        health.providerFreshness.length === 0 ? (
          <StudioEmptyState
            title="Provider cache no provisionado"
            description="La tabla seo_provider_cache no existe en este entorno; Data Health queda en WATCH."
          />
        ) : health.providerFreshness.length === 0 ? (
          <StudioEmptyState
            title="Sin filas de provider freshness"
            description="No hay estado de GSC/GA4/DataForSEO/tracking para este tenant. Ejecuta el intake antes del Council."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {health.providerFreshness.map((row) => (
              <article
                key={row.provider}
                className="rounded-md border border-[var(--studio-border)] p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold">{row.provider}</h3>
                  <StudioBadge tone={providerTone(row.status)}>
                    {row.status}
                  </StudioBadge>
                </div>
                <dl className="mt-3 text-xs">
                  <div>
                    <dt className="text-[var(--studio-text-muted)]">
                      Last sync
                    </dt>
                    <dd>{formatDate(row.last_synced_at)}</dd>
                  </div>
                  {row.message ? (
                    <div className="mt-2">
                      <dt className="text-[var(--studio-text-muted)]">
                        Message
                      </dt>
                      <dd>{row.message}</dd>
                    </div>
                  ) : null}
                  {row.provider.toLowerCase().includes("dataforseo") ? (
                    <div className="mt-3">
                      <dt className="text-[var(--studio-text-muted)]">
                        DataForSEO feature profiles
                      </dt>
                      <dd className="mt-1 space-y-1">
                        {row.feature_profiles?.length ? (
                          row.feature_profiles.map((feature) => (
                            <div
                              key={feature.feature_profile}
                              className="flex flex-wrap items-center justify-between gap-2 rounded border border-[var(--studio-border)] px-2 py-1"
                            >
                              <span className="font-medium">
                                {feature.feature_profile}
                              </span>
                              <span>
                                {feature.access_status} · rows{" "}
                                {feature.row_count} · evidence{" "}
                                {feature.evidence_count}
                              </span>
                            </div>
                          ))
                        ) : (
                          <span>No feature profile rows in cache.</span>
                        )}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </article>
            ))}
          </div>
        )}
      </section>

      <section
        aria-labelledby="provider-profile-runs-heading"
        data-testid="growth-provider-profile-runs"
        className="mt-6 space-y-3"
      >
        <header>
          <h2
            id="provider-profile-runs-heading"
            className="text-base font-semibold text-[var(--studio-text)]"
          >
            Provider profile coverage
          </h2>
          <p className="text-sm text-[var(--studio-text-muted)]">
            Ledger scoped to this tenant/website. It exposes coverage,
            freshness, cost, blockers and circuit-breaker state without
            starting provider calls.
          </p>
        </header>

        {health.warnings.profileRunsMissing ? (
          <StudioEmptyState
            title="Provider profile ledger no provisionado"
            description="La tabla growth_profile_runs no existe en este entorno; usa la cache de provider como respaldo."
          />
        ) : health.providerProfileRuns.length === 0 ? (
          <StudioEmptyState
            title="Sin provider profile runs"
            description="No hay ejecuciones de perfiles GSC/GA4/DataForSEO/Clarity para este tenant."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {health.providerProfileRuns.map((run) => (
              <article
                key={run.id}
                className="rounded-md border border-[var(--studio-border)] p-4"
                data-testid="growth-provider-profile-run"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">
                      {run.provider} / {run.profileId}
                    </h3>
                    <p className="mt-1 text-xs text-[var(--studio-text-muted)]">
                      {run.entityKey ?? "site-wide"}
                      {run.actionKey ? ` · ${run.actionKey}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <StudioBadge tone={providerTone(run.freshnessStatus)}>
                      {run.freshnessStatus}
                    </StudioBadge>
                    <StudioBadge tone={providerTone(run.runStatus)}>
                      {run.runStatus}
                    </StudioBadge>
                  </div>
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt className="text-[var(--studio-text-muted)]">Cost</dt>
                    <dd className="font-semibold">{formatCost(run.costUsd)}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--studio-text-muted)]">
                      Updated
                    </dt>
                    <dd>{formatDate(run.updatedAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--studio-text-muted)]">
                      Approval
                    </dt>
                    <dd>
                      {run.approvalRequired
                        ? "approval required"
                        : "not required"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--studio-text-muted)]">
                      Circuit breaker
                    </dt>
                    <dd>
                      {run.circuitBreaker
                        ? `${run.circuitBreaker.state} · failures ${
                            run.circuitBreaker.failureCount ?? 0
                          }`
                        : "clear"}
                    </dd>
                  </div>
                </dl>

                {run.circuitBreaker?.cooldownUntil ? (
                  <p className="mt-2 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-800">
                    Cooldown until{" "}
                    {formatDate(run.circuitBreaker.cooldownUntil)}
                    {run.circuitBreaker.lastErrorClass
                      ? ` · ${run.circuitBreaker.lastErrorClass}`
                      : ""}
                  </p>
                ) : null}

                {run.blockers.length > 0 ? (
                  <div className="mt-3">
                    <div className="text-xs font-medium text-[var(--studio-text)]">
                      Blockers
                    </div>
                    <ul className="mt-1 space-y-1 text-xs text-[var(--studio-text-muted)]">
                      {run.blockers.map((blocker) => (
                        <li
                          key={blocker}
                          className="rounded border border-[var(--studio-border)] px-2 py-1"
                        >
                          {blocker}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="mt-3 text-xs text-[var(--studio-text-muted)]">
                  Fingerprint: {run.evidenceFingerprint ?? "n/a"}
                </div>
                {run.sourceRefs.length > 0 ? (
                  <div className="mt-2 text-xs text-[var(--studio-text-muted)]">
                    Source refs: {run.sourceRefs.join(", ")}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </StudioPage>
  );
}
