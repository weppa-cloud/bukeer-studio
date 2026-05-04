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

const LANE_LABELS: Record<AgentLane, string> = {
  orchestrator: "Orquestador",
  technical_remediation: "Corrección técnica",
  transcreation: "Transcreación",
  content_creator: "Creación de contenido",
  content_curator: "Curaduría de contenido",
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
