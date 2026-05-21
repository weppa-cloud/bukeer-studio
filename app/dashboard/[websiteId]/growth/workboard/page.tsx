import Link from "next/link";
import { z } from "zod";
import { AgentLaneSchema, type AgentLane } from "@bukeer/website-contract";
import {
  StudioPage,
  StudioSectionHeader,
  StudioBadge,
  StudioEmptyState,
} from "@/components/studio/ui/primitives";
import { requireGrowthRole } from "@/lib/growth/console/auth";
import {
  getGrowthWorkboard,
  WORKBOARD_COLUMNS,
  type WorkboardCard,
  type WorkboardColumn,
} from "@/lib/growth/console/queries-workboard";
import { GrowthWorkboardClient } from "./workboard-client";
import {
  approveLowRiskWorkboardItems,
  markStaleWorkboardRunsStalled,
} from "../runs/[runId]/actions";

const LANE_LABELS: Record<AgentLane, string> = {
  orchestrator: "Orquestador",
  technical_remediation: "Corrección técnica",
  transcreation: "Transcreación",
  content_creator: "Creación de contenido",
  content_curator: "Curaduría de contenido",
  media: "Media",
};

const SearchParamsSchema = z.object({
  lane: AgentLaneSchema.optional(),
  column: z.enum(WORKBOARD_COLUMNS).optional(),
  approval: z.enum(["mine", "all"]).optional(),
  provider: z.enum(["missing", "all"]).optional(),
});

interface WorkboardPageProps {
  params: Promise<{ websiteId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function buildHref(
  websiteId: string,
  current: {
    lane?: AgentLane;
    column?: WorkboardColumn;
    approval?: string;
    provider?: string;
  },
  override: Partial<{
    lane: AgentLane | null;
    column: WorkboardColumn | null;
    approval: string | null;
    provider: string | null;
  }>,
) {
  const params = new URLSearchParams();
  const lane = "lane" in override ? override.lane : current.lane;
  const column = "column" in override ? override.column : current.column;
  const approval =
    "approval" in override ? override.approval : current.approval;
  const provider =
    "provider" in override ? override.provider : current.provider;
  if (lane) params.set("lane", lane);
  if (column) params.set("column", column);
  if (approval && approval !== "all") params.set("approval", approval);
  if (provider && provider !== "all") params.set("provider", provider);
  const qs = params.toString();
  return `/dashboard/${websiteId}/growth/workboard${qs ? `?${qs}` : ""}`;
}

function cardNeedsApproval(card: WorkboardCard): boolean {
  return (
    card.column === "review_needed" ||
    !["no requiere", "no requiere aprobación"].includes(
      card.approvalRequirement.toLowerCase(),
    )
  );
}

function isLowRiskBulkEligible(card: WorkboardCard): boolean {
  return (
    card.column === "review_needed" &&
    card.risk === "low" &&
    Boolean(card.runId) &&
    Boolean(card.changeSetId) &&
    card.autonomyLabel !== "bloqueado" &&
    card.toolCallSummary.blocked === 0
  );
}

function blockedCause(card: WorkboardCard): string {
  if (card.providerEvidenceMissing) return "Falta DataForSEO";
  if (card.blockedReason) return card.blockedReason;
  if (card.status === "running" || card.status === "claimed") {
    return "Runtime detenido";
  }
  if (card.toolCallSummary.blocked > 0) return "Tool bloqueada";
  if (card.risk === "blocked" || card.autonomyLabel === "bloqueado") {
    return "Política";
  }
  if (card.evidenceRefs.length === 0) return "Falta evidencia";
  if (card.risk === "high" || card.risk === "medium") return "Riesgo";
  return "Revisión manual";
}

function cardInPreparation(card: WorkboardCard): boolean {
  return [
    "brief_in_progress",
    "drafting",
    "in_progress",
    "queued",
    "ready_for_brief",
  ].includes(card.status);
}

function countBy<T extends string>(values: T[]): Record<T, number> {
  return values.reduce(
    (acc, value) => ({ ...acc, [value]: (acc[value] ?? 0) + 1 }),
    {} as Record<T, number>,
  );
}

function FilterBar({
  websiteId,
  current,
}: {
  websiteId: string;
  current: {
    lane?: AgentLane;
    column?: WorkboardColumn;
    approval?: string;
    provider?: string;
  };
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={buildHref(websiteId, current, { lane: null, column: null })}
        className="studio-button studio-button--outline studio-button--sm"
      >
        Todo
      </Link>
      {AgentLaneSchema.options.map((lane) => (
        <Link
          key={lane}
          href={buildHref(websiteId, current, { lane })}
          className="studio-button studio-button--outline studio-button--sm"
        >
          {LANE_LABELS[lane]}
        </Link>
      ))}
      <Link
        href={buildHref(websiteId, current, { approval: "mine" })}
        className="studio-button studio-button--outline studio-button--sm"
      >
        Requiere aprobación
      </Link>
      <Link
        href={buildHref(websiteId, current, { provider: "missing" })}
        className="studio-button studio-button--outline studio-button--sm"
      >
        Falta DataForSEO
      </Link>
    </div>
  );
}

export default async function GrowthWorkboardPage({
  params,
  searchParams,
}: WorkboardPageProps) {
  const { websiteId } = await params;
  const rawSearch = await searchParams;
  const filters = SearchParamsSchema.parse({
    lane: rawSearch.lane,
    column: rawSearch.column,
    approval: rawSearch.approval,
    provider: rawSearch.provider,
  });

  const auth = await requireGrowthRole(websiteId, "viewer");
  const result = await getGrowthWorkboard({
    accountId: auth.accountId,
    websiteId,
    limit: 30,
  });

  const filteredCards = result.cards.filter((card) => {
    if (filters.lane && card.lane !== filters.lane) return false;
    if (filters.column && card.column !== filters.column) return false;
    if (filters.approval === "mine" && !cardNeedsApproval(card)) return false;
    if (filters.provider === "missing" && !card.providerEvidenceMissing) {
      return false;
    }
    return true;
  });
  const providerEvidenceMissingCount = result.cards.filter(
    (card) => card.providerEvidenceMissing,
  ).length;
  const cardsByColumn = new Map(
    WORKBOARD_COLUMNS.map((column) => [
      column,
      filteredCards.filter((card) => card.column === column),
    ]),
  );
  const cardsByColumnRecord = Object.fromEntries(
    WORKBOARD_COLUMNS.map((column) => [
      column,
      cardsByColumn.get(column) ?? [],
    ]),
  ) as Record<WorkboardColumn, WorkboardCard[]>;
  const columnHrefs = Object.fromEntries(
    WORKBOARD_COLUMNS.map((column) => [
      column,
      buildHref(websiteId, filters, { column }),
    ]),
  ) as Record<WorkboardColumn, string>;
  const lowRiskBulkEligible = filteredCards.filter(isLowRiskBulkEligible);
  const blockedCards = filteredCards.filter(
    (card) => card.column === "blocked",
  );
  const blockedByCause = countBy(blockedCards.map(blockedCause));
  const staleBlockedCount = blockedCards.filter((card) =>
    ["running", "claimed"].includes(card.status),
  ).length;
  const runtimeRealCount = filteredCards.filter(
    (card) => card.column === "running" && Boolean(card.runId),
  ).length;
  const preparationCount = filteredCards.filter(cardInPreparation).length;

  return (
    <StudioPage className="max-w-[1600px]">
      <StudioSectionHeader
        title="Growth OS Workboard Autónomo"
        subtitle="Centro de trabajo tipo Hermes/Jira para ver qué hacen los agentes, qué resultado dejaron y qué pocas tareas necesitan decisión humana."
        actions={
          <div className="flex flex-wrap gap-2">
            <StudioBadge tone="info">Issue #430</StudioBadge>
            <StudioBadge tone="warning">
              High-output agents, human-governed publishing
            </StudioBadge>
          </div>
        }
      />

      {result.missingTables.length > 0 ? (
        <div
          role="status"
          className="mt-4 rounded-md border border-[var(--studio-warning)]/40 p-3 text-sm text-[var(--studio-warning)]"
        >
          Faltan tablas para hidratar todo el tablero:{" "}
          {result.missingTables.join(", ")}.
        </div>
      ) : null}

      {result.errored ? (
        <div
          role="alert"
          className="mt-4 rounded-md border border-[var(--studio-danger)]/40 p-3 text-sm text-[var(--studio-danger)]"
        >
          Algunas fuentes del Workboard fallaron. El tablero muestra datos
          parciales.
        </div>
      ) : null}

      <section
        data-testid="growth-workboard-summary"
        className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4"
      >
        <article className="rounded-md border border-[var(--studio-border)] px-3 py-2">
          <div className="text-[11px] text-[var(--studio-text-muted)]">
            Runtime real
          </div>
          <div className="mt-0.5 text-xl font-semibold">{runtimeRealCount}</div>
          <div className="mt-0.5 text-[11px] text-[var(--studio-text-muted)]">
            Runs activos o recientes
          </div>
        </article>
        <article className="rounded-md border border-[var(--studio-border)] px-3 py-2">
          <div className="text-[11px] text-[var(--studio-text-muted)]">
            Preparación / backlog
          </div>
          <div className="mt-0.5 text-xl font-semibold">{preparationCount}</div>
          <div className="mt-0.5 text-[11px] text-[var(--studio-text-muted)]">
            Routing, briefs y cola
          </div>
        </article>
        <article className="rounded-md border border-[var(--studio-border)] px-3 py-2">
          <div className="text-[11px] text-[var(--studio-text-muted)]">
            Decisión humana
          </div>
          <div className="mt-0.5 text-xl font-semibold">
            {result.countsByColumn.review_needed}
          </div>
          <div className="mt-0.5 text-[11px] text-[var(--studio-text-muted)]">
            Revisar evidencia
          </div>
        </article>
        <article className="rounded-md border border-[var(--studio-border)] px-3 py-2">
          <div className="text-[11px] text-[var(--studio-text-muted)]">
            Bloqueadas
          </div>
          <div className="mt-0.5 text-xl font-semibold">
            {result.countsByColumn.blocked}
          </div>
          <div className="mt-0.5 text-[11px] text-[var(--studio-text-muted)]">
            Resolver causa
          </div>
        </article>
      </section>

      {providerEvidenceMissingCount > 0 ? (
        <section
          data-testid="growth-workboard-provider-evidence-missing"
          className="mt-4 rounded-md border border-[var(--studio-danger)]/40 p-3 text-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-medium text-[var(--studio-danger)]">
                {providerEvidenceMissingCount} trabajos provider-dependent no
                tienen evidencia DataForSEO.
              </p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--studio-text-muted)]">
                El runtime los bloquea antes de mutar producción. Regenera esos
                trabajos desde el Brain con perfiles frescos o ciérralos como
                legacy.
              </p>
            </div>
            <Link
              href={buildHref(websiteId, filters, { provider: "missing" })}
              className="studio-button studio-button--outline studio-button--sm"
            >
              Ver pendientes
            </Link>
          </div>
        </section>
      ) : null}

      <section className="mt-4">
        <FilterBar websiteId={websiteId} current={filters} />
      </section>

      <section className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr]">
        <article className="rounded-md border border-[var(--studio-border)] p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">
                Aprobación segura en lote
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-[var(--studio-text-muted)]">
                Aprueba solo change sets en revisión, riesgo bajo, sin tools
                bloqueadas y sin mutación pública.
              </p>
            </div>
            <StudioBadge tone={lowRiskBulkEligible.length ? "success" : "info"}>
              {lowRiskBulkEligible.length} elegibles
            </StudioBadge>
          </div>
          <form action={approveLowRiskWorkboardItems} className="mt-3">
            <input type="hidden" name="websiteId" value={websiteId} />
            <button
              type="submit"
              className="studio-button studio-button--primary studio-button--sm"
              disabled={lowRiskBulkEligible.length === 0}
            >
              Aprobar riesgo bajo
            </button>
          </form>
        </article>

        <article className="rounded-md border border-[var(--studio-border)] p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Depurar bloqueadas</h2>
              <p className="mt-1 text-xs leading-relaxed text-[var(--studio-text-muted)]">
                Primero cierra ejecuciones detenidas. Luego revisa políticas,
                tools bloqueadas y evidencia faltante por grupo.
              </p>
            </div>
            <StudioBadge tone={blockedCards.length ? "danger" : "success"}>
              {blockedCards.length} bloqueadas
            </StudioBadge>
          </div>
          <div
            data-testid="growth-workboard-blocked-reasons"
            className="mt-3 flex flex-wrap gap-2 text-xs"
          >
            {Object.entries(blockedByCause).length > 0 ? (
              Object.entries(blockedByCause).map(([cause, count]) => (
                <span
                  key={cause}
                  className="rounded border border-[var(--studio-border)] px-2 py-1 text-[var(--studio-text-muted)]"
                >
                  {cause}: {count}
                </span>
              ))
            ) : (
              <span className="rounded border border-[var(--studio-border)] px-2 py-1 text-[var(--studio-text-muted)]">
                Sin bloqueos visibles
              </span>
            )}
          </div>
          <form action={markStaleWorkboardRunsStalled} className="mt-3">
            <input type="hidden" name="websiteId" value={websiteId} />
            <button
              type="submit"
              className="studio-button studio-button--outline studio-button--sm"
              disabled={staleBlockedCount === 0}
            >
              Marcar runtime detenido
            </button>
          </form>
        </article>
      </section>

      {filteredCards.length === 0 ? (
        <div className="mt-6" data-testid="growth-workboard-empty-state">
          <StudioEmptyState
            title="No hay tarjetas para estos filtros."
            description="Cuando el runtime produzca backlog, runs o change sets, aparecerán aquí como trabajo operativo."
          />
        </div>
      ) : (
        <GrowthWorkboardClient
          cardsByColumn={cardsByColumnRecord}
          columns={WORKBOARD_COLUMNS}
          websiteId={websiteId}
          buildColumnHref={columnHrefs}
        />
      )}
    </StudioPage>
  );
}
