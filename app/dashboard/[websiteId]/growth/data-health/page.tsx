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
  if (/(watch|stale|expired|pending)/.test(normalized)) return "warning";
  if (/(blocked|error|failed|missing)/.test(normalized)) return "danger";
  return "info";
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
            Provider rows
          </div>
          <div className="mt-1 text-2xl font-semibold">
            {health.providerFreshness.length}
          </div>
          <p className="mt-1 text-xs text-[var(--studio-text-muted)]">
            GSC, GA4, DataForSEO, tracking or LLM when available.
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
            Runtime 8.5
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
              Candidate cases waiting for eval curation.
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
              Non-zero exits or classified runtime errors.
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

        {health.warnings.providerCacheMissing ? (
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
                </dl>
              </article>
            ))}
          </div>
        )}
      </section>
    </StudioPage>
  );
}
