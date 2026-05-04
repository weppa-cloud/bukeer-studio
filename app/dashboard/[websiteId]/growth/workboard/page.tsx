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
    return new Date(iso).toLocaleString("es-CO", {
      dateStyle: "medium",
      timeStyle: "short",
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

  return (
    <article
      data-testid="growth-workboard-card"
      className="rounded-md border border-[var(--studio-border)] bg-[var(--studio-surface)] p-3 shadow-sm"
    >
      <div className="flex flex-wrap items-center gap-2">
        <StudioBadge tone={statusTone(card.column)}>
          {COLUMN_LABELS[card.column]}
        </StudioBadge>
        <StudioBadge tone={riskTone(card.risk)}>
          {card.risk ? humanize(card.risk) : "Riesgo no marcado"}
        </StudioBadge>
      </div>

      <h3 className="mt-2 text-sm font-semibold leading-snug text-[var(--studio-text)]">
        {card.title}
      </h3>

      <p className="mt-1 text-xs text-[var(--studio-text-muted)]">
        {humanize(card.workType)} · {card.sourceLabel}
      </p>

      <div className="mt-3 space-y-2 text-xs">
        <div>
          <div className="font-medium text-[var(--studio-text)]">
            Qué produjo
          </div>
          <p className="mt-1 line-clamp-4 text-[var(--studio-text-muted)]">
            {preview}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2">
          <div className="rounded border border-[var(--studio-border)] p-2">
            <div className="text-[var(--studio-text-muted)]">Agente</div>
            <div className="font-medium">
              {card.agentName ?? LANE_LABELS[card.lane]}
            </div>
          </div>
          <div className="rounded border border-[var(--studio-border)] p-2">
            <div className="text-[var(--studio-text-muted)]">Quién aprueba</div>
            <div className="font-medium">
              {humanize(card.approvalRequirement)}
            </div>
          </div>
        </div>
      </div>

      {card.evidenceRefs.length > 0 ? (
        <div className="mt-3">
          <div className="text-xs font-medium text-[var(--studio-text-muted)]">
            Evidencia principal
          </div>
          <ul className="mt-1 space-y-1 text-[11px] text-[var(--studio-text-muted)]">
            {card.evidenceRefs.map((ref) => (
              <li key={ref} className="truncate">
                {ref}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {runHref ? (
          <Link href={runHref} className="studio-button studio-button--primary">
            Ver trabajo
          </Link>
        ) : null}
        {card.column === "next_task_created" || card.backlogItemId ? (
          <Link
            href={backlogHref}
            className="studio-button studio-button--outline"
          >
            Ver backlog
          </Link>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-[var(--studio-text-muted)]">
        <span>{fmtDate(card.updatedAt)}</span>
        <span>Estado: {humanize(card.status)}</span>
        {card.humanDecision ? (
          <span>Decisión: {humanize(card.humanDecision)}</span>
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
        className="studio-button studio-button--outline"
      >
        Todo
      </Link>
      {AgentLaneSchema.options.map((lane) => (
        <Link
          key={lane}
          href={buildHref(websiteId, current, { lane })}
          className="studio-button studio-button--outline"
        >
          {LANE_LABELS[lane]}
        </Link>
      ))}
      <Link
        href={buildHref(websiteId, current, { approval: "mine" })}
        className="studio-button studio-button--outline"
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
  });

  const filteredCards = result.cards.filter((card) => {
    if (filters.lane && card.lane !== filters.lane) return false;
    if (filters.column && card.column !== filters.column) return false;
    if (filters.approval === "mine" && !cardNeedsApproval(card)) return false;
    return true;
  });

  return (
    <StudioPage className="max-w-[1600px]">
      <StudioSectionHeader
        title="Growth Symphony Workboard"
        subtitle="Kanban operativo del equipo de agentes: qué está tomando cada lane, qué produjo y qué necesita aprobación humana."
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
        className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4"
      >
        <article className="rounded-md border border-[var(--studio-border)] p-3">
          <div className="text-xs text-[var(--studio-text-muted)]">
            Tarjetas visibles
          </div>
          <div className="mt-1 text-2xl font-semibold">
            {filteredCards.length}
          </div>
        </article>
        <article className="rounded-md border border-[var(--studio-border)] p-3">
          <div className="text-xs text-[var(--studio-text-muted)]">
            Listas para revisar
          </div>
          <div className="mt-1 text-2xl font-semibold">
            {result.countsByColumn.ready_for_review}
          </div>
        </article>
        <article className="rounded-md border border-[var(--studio-border)] p-3">
          <div className="text-xs text-[var(--studio-text-muted)]">
            Siguiente tarea creada
          </div>
          <div className="mt-1 text-2xl font-semibold">
            {result.countsByColumn.next_task_created}
          </div>
        </article>
        <article className="rounded-md border border-[var(--studio-border)] p-3">
          <div className="text-xs text-[var(--studio-text-muted)]">
            Gobernanza
          </div>
          <div className="mt-1 text-sm font-semibold">
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
          className="mt-6 grid grid-cols-1 gap-3 xl:grid-cols-7"
        >
          {WORKBOARD_COLUMNS.map((column) => {
            const cards = filteredCards.filter(
              (card) => card.column === column,
            );
            return (
              <div
                key={column}
                data-testid={`growth-workboard-column-${column}`}
                className="min-h-40 rounded-md border border-[var(--studio-border)] bg-[var(--studio-surface-muted,theme(colors.zinc.50))] p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold">
                      {COLUMN_LABELS[column]}
                    </h2>
                    <p className="mt-1 text-xs text-[var(--studio-text-muted)]">
                      {COLUMN_HELP[column]}
                    </p>
                  </div>
                  <StudioBadge tone={statusTone(column)}>
                    {cards.length}
                  </StudioBadge>
                </div>

                <div className="mt-3 max-h-[70vh] space-y-3 overflow-y-auto pr-1">
                  {cards.length > 0 ? (
                    cards.map((card) => (
                      <WorkboardCardView
                        key={card.id}
                        card={card}
                        websiteId={websiteId}
                      />
                    ))
                  ) : (
                    <p className="rounded border border-dashed border-[var(--studio-border)] p-3 text-xs text-[var(--studio-text-muted)]">
                      Sin trabajo en esta columna.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}
    </StudioPage>
  );
}
