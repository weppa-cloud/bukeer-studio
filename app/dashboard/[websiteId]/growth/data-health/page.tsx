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

  return (
    <StudioPage className="max-w-6xl">
      <StudioSectionHeader
        title="Data Health"
        subtitle="Freshness, provider status and runtime signals. No provider calls are made in the render path."
        actions={<StudioBadge tone="info">SPEC Control Plane UX</StudioBadge>}
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
