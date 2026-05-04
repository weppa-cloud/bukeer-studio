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

const COLUMN_LABELS: Record<WorkboardColumn, string> = {
  backlog: "Backlog",
  assigned: "Asignado",
  running: "Ejecutando",
  ready_for_review: "Listo para revisar",
  approved: "Aprobado",
  next_task_created: "Siguiente tarea creada",
  done: "Hecho",
};

const COLUMN_HELP: Record<WorkboardColumn, string> = {
  backlog: "Trabajo listo para que el sistema lo tome.",
  assigned: "Ya tiene agente o ruta definida.",
  running: "El agente está trabajando o tuvo ejecución reciente.",
  ready_for_review: "Necesita lectura humana antes del siguiente paso.",
  approved: "Ya fue aceptado, sin publicar automáticamente.",
  next_task_created: "La aprobación generó trabajo nuevo.",
  done: "Cerrado, aplicado o evaluado.",
};

const LANE_LABELS: Record<AgentLane, string> = {
  orchestrator: "Orquestador",
  technical_remediation: "Corrección técnica",
  transcreation: "Transcreación",
  content_creator: "Creación de contenido",
  content_curator: "Curaduría de contenido",
};

const WORK_TYPE_LABELS: Record<string, string> = {
  agent_run: "Run del agente",
  backlog_route_update: "Ruta de oportunidad",
  backlog_task_split: "División de tarea",
  blog_draft_create: "Borrador de blog",
  content_brief_create: "Brief de contenido",
  content_evidence_request: "Solicitud de evidencia",
  content_quality_review: "Revisión de calidad",
  content_update: "Actualización de contenido",
  cro_activation: "Activación CRO",
  follow_up_backlog_create: "Nueva tarea de seguimiento",
  growth_opportunity: "Oportunidad Growth",
  research_packet: "Paquete de investigación",
  seo_content: "Contenido SEO",
  technical_remediation: "Corrección técnica",
  transcreation: "Transcreación",
};

const MAX_CARDS_PER_COLUMN = 8;

const SearchParamsSchema = z.object({
  lane: AgentLaneSchema.optional(),
  column: z.enum(WORKBOARD_COLUMNS).optional(),
  approval: z.enum(["mine", "all"]).optional(),
});

interface WorkboardPageProps {
  params: Promise<{ websiteId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function statusTone(
  column: WorkboardColumn,
): "neutral" | "info" | "success" | "warning" | "danger" {
  if (column === "done") return "success";
  if (column === "ready_for_review") return "warning";
  if (column === "next_task_created" || column === "approved") return "info";
  if (column === "running") return "info";
  return "neutral";
}

function riskTone(risk: string | null): "neutral" | "warning" | "danger" {
  if (!risk) return "neutral";
  const value = risk.toLowerCase();
  if (value.includes("high") || value.includes("blocked")) return "danger";
  if (value.includes("medium") || value.includes("risk")) return "warning";
  return "neutral";
}

function humanize(value: string | null | undefined): string {
  if (!value) return "—";
  return WORK_TYPE_LABELS[value] ?? value.replace(/_/g, " ");
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es-CO", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

function buildHref(
  websiteId: string,
  current: { lane?: AgentLane; column?: WorkboardColumn; approval?: string },
  override: Partial<{
    lane: AgentLane | null;
    column: WorkboardColumn | null;
    approval: string | null;
  }>,
) {
  const params = new URLSearchParams();
  const lane = "lane" in override ? override.lane : current.lane;
  const column = "column" in override ? override.column : current.column;
  const approval =
    "approval" in override ? override.approval : current.approval;
  if (lane) params.set("lane", lane);
  if (column) params.set("column", column);
  if (approval && approval !== "all") params.set("approval", approval);
  const qs = params.toString();
  return `/dashboard/${websiteId}/growth/workboard${qs ? `?${qs}` : ""}`;
}

function cardNeedsApproval(card: WorkboardCard): boolean {
  return (
    card.column === "ready_for_review" ||
    !["no requiere", "no requiere aprobación"].includes(
      card.approvalRequirement.toLowerCase(),
    )
  );
}

function WorkboardCardView({
  card,
  websiteId,
}: {
  card: WorkboardCard;
  websiteId: string;
}) {
  const runHref = card.runId
    ? `/dashboard/${websiteId}/growth/runs/${card.runId}`
    : null;
  const backlogHref = `/dashboard/${websiteId}/growth/backlog`;
  const preview =
    card.preview ??
    "El agente todavía no dejó un resumen operable. Revisa el detalle técnico si existe.";
  const risk = card.risk ? humanize(card.risk) : null;

  return (
    <article
      data-testid="growth-workboard-card"
      className="group rounded-md border border-[var(--studio-border)] bg-[var(--studio-surface)] p-2 shadow-sm transition hover:border-[var(--studio-primary)]/50 hover:shadow-md"
    >
      <div className="flex items-center justify-between gap-2">
        <StudioBadge tone={statusTone(card.column)}>
          {LANE_LABELS[card.lane]}
        </StudioBadge>
        {risk ? (
          <StudioBadge tone={riskTone(card.risk)}>{risk}</StudioBadge>
        ) : null}
      </div>

      <h3 className="mt-2 line-clamp-2 text-[13px] font-semibold leading-snug text-[var(--studio-text)]">
        {card.title}
      </h3>

      <p className="mt-1 truncate text-[11px] text-[var(--studio-text-muted)]">
        {humanize(card.workType)} / {card.sourceLabel}
      </p>

      <p className="mt-2 line-clamp-2 text-xs leading-snug text-[var(--studio-text-muted)]">
        <span className="font-medium text-[var(--studio-text)]">
          Resultado:
        </span>{" "}
        {preview}
      </p>

      {card.evidenceRefs.length > 0 ? (
        <div className="mt-2 truncate rounded border border-[var(--studio-border)] px-2 py-1 text-[11px] text-[var(--studio-text-muted)]">
          Evidencia: {card.evidenceRefs[0]}
          {card.evidenceRefs.length > 1
            ? ` +${card.evidenceRefs.length - 1}`
            : ""}
        </div>
      ) : null}

      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-[var(--studio-text-muted)]">
        <span className="truncate">
          Aprueba: {humanize(card.approvalRequirement)}
        </span>
        <span className="shrink-0">{fmtDate(card.updatedAt)}</span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {runHref ? (
          <Link
            href={runHref}
            className="text-xs font-medium text-[var(--studio-primary)] hover:underline"
          >
            Ver
          </Link>
        ) : null}
        {card.column === "next_task_created" || card.backlogItemId ? (
          <Link
            href={backlogHref}
            className="text-xs font-medium text-[var(--studio-primary)] hover:underline"
          >
            Backlog
          </Link>
        ) : null}
        {card.humanDecision ? (
          <span className="ml-auto truncate text-[11px] text-[var(--studio-text-muted)]">
            {humanize(card.humanDecision)}
          </span>
        ) : null}
      </div>
    </article>
  );
}

function FilterBar({
  websiteId,
  current,
}: {
  websiteId: string;
  current: { lane?: AgentLane; column?: WorkboardColumn; approval?: string };
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
    return true;
  });
  const cardsByColumn = new Map(
    WORKBOARD_COLUMNS.map((column) => [
      column,
      filteredCards.filter((card) => card.column === column),
    ]),
  );
  const visibleCardCount = WORKBOARD_COLUMNS.reduce((sum, column) => {
    const cards = cardsByColumn.get(column) ?? [];
    return sum + Math.min(cards.length, MAX_CARDS_PER_COLUMN);
  }, 0);

  return (
    <StudioPage className="max-w-[1600px]">
      <StudioSectionHeader
        title="Growth Symphony Workboard"
        subtitle="Kanban operativo tipo Trello/Jira para ver el flujo de trabajo de los agentes con tarjetas compactas y detalle bajo demanda."
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
            En pantalla
          </div>
          <div className="mt-0.5 text-xl font-semibold">{visibleCardCount}</div>
        </article>
        <article className="rounded-md border border-[var(--studio-border)] px-3 py-2">
          <div className="text-[11px] text-[var(--studio-text-muted)]">
            Listas para revisar
          </div>
          <div className="mt-0.5 text-xl font-semibold">
            {result.countsByColumn.ready_for_review}
          </div>
        </article>
        <article className="rounded-md border border-[var(--studio-border)] px-3 py-2">
          <div className="text-[11px] text-[var(--studio-text-muted)]">
            Siguiente tarea creada
          </div>
          <div className="mt-0.5 text-xl font-semibold">
            {result.countsByColumn.next_task_created}
          </div>
        </article>
        <article className="rounded-md border border-[var(--studio-border)] px-3 py-2">
          <div className="text-[11px] text-[var(--studio-text-muted)]">
            Gobernanza
          </div>
          <div className="mt-0.5 text-xs font-semibold">
            Publicación y pauta siguen gated
          </div>
        </article>
      </section>

      <section className="mt-4">
        <FilterBar websiteId={websiteId} current={filters} />
      </section>

      {filteredCards.length === 0 ? (
        <div className="mt-6" data-testid="growth-workboard-empty-state">
          <StudioEmptyState
            title="No hay tarjetas para estos filtros."
            description="Cuando el runtime produzca backlog, runs o change sets, aparecerán aquí como trabajo operativo."
          />
        </div>
      ) : (
        <section
          data-testid="growth-workboard-kanban"
          className="mt-5 overflow-x-auto pb-4"
        >
          <div className="grid min-w-[1320px] grid-cols-7 gap-3">
            {WORKBOARD_COLUMNS.map((column) => {
              const cards = cardsByColumn.get(column) ?? [];
              const visibleCards = cards.slice(0, MAX_CARDS_PER_COLUMN);
              const hiddenCount = cards.length - visibleCards.length;
              return (
                <div
                  key={column}
                  data-testid={`growth-workboard-column-${column}`}
                  className="flex max-h-[calc(100vh-300px)] min-h-48 flex-col rounded-md border border-[var(--studio-border)] bg-[var(--studio-surface-muted,theme(colors.zinc.50))] p-2"
                >
                  <div className="sticky top-0 z-10 bg-[var(--studio-surface-muted,theme(colors.zinc.50))] pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="truncate text-sm font-semibold">
                        {COLUMN_LABELS[column]}
                      </h2>
                      <StudioBadge tone={statusTone(column)}>
                        {cards.length}
                      </StudioBadge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-[var(--studio-text-muted)]">
                      {COLUMN_HELP[column]}
                    </p>
                  </div>

                  <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                    {visibleCards.length > 0 ? (
                      visibleCards.map((card) => (
                        <WorkboardCardView
                          key={card.id}
                          card={card}
                          websiteId={websiteId}
                        />
                      ))
                    ) : (
                      <p className="rounded border border-dashed border-[var(--studio-border)] p-3 text-xs text-[var(--studio-text-muted)]">
                        Sin trabajo.
                      </p>
                    )}
                    {hiddenCount > 0 ? (
                      <Link
                        href={buildHref(websiteId, filters, { column })}
                        className="block rounded border border-dashed border-[var(--studio-border)] px-2 py-2 text-center text-xs font-medium text-[var(--studio-primary)] hover:bg-[var(--studio-surface)]"
                      >
                        Ver {hiddenCount} más
                      </Link>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </StudioPage>
  );
}
