"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { AgentLane } from "@bukeer/website-contract";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { StudioBadge } from "@/components/studio/ui/primitives";
import type {
  WorkboardCard,
  WorkboardColumn,
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
  if (!value) return "-";
  return WORK_TYPE_LABELS[value] ?? value.replace(/_/g, " ");
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("es-CO", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "-";
  }
}

function runHref(websiteId: string, card: WorkboardCard): string | null {
  return card.runId
    ? `/dashboard/${websiteId}/growth/runs/${card.runId}`
    : null;
}

function backlogHref(websiteId: string): string {
  return `/dashboard/${websiteId}/growth/backlog`;
}

function cardPreview(card: WorkboardCard): string {
  return (
    card.preview ??
    "El agente todavía no dejó un resumen operable. Revisa el detalle técnico si existe."
  );
}

interface QuickAction {
  label: string;
  href?: string;
  disabledReason?: string;
}

function quickActionsFor(
  card: WorkboardCard,
  websiteId: string,
): QuickAction[] {
  const detailHref = runHref(websiteId, card);
  const backlog = backlogHref(websiteId);
  if (card.column === "ready_for_review") {
    return detailHref
      ? [
          { label: "Aprobar", href: detailHref },
          { label: "Pedir cambios", href: detailHref },
          { label: "Rechazar", href: detailHref },
        ]
      : [
          {
            label: "Aprobar",
            disabledReason: "Falta run asociado para registrar el ledger.",
          },
          {
            label: "Pedir cambios",
            disabledReason: "Falta run asociado para registrar el ledger.",
          },
        ];
  }
  if (card.column === "backlog") {
    return [
      { label: "Abrir backlog", href: backlog },
      {
        label: "Asignar agente",
        disabledReason: "La asignación se ejecuta desde el orquestador.",
      },
    ];
  }
  if (card.column === "running") {
    return detailHref
      ? [
          { label: "Ver progreso", href: detailHref },
          { label: "Revisar evidencia", href: detailHref },
        ]
      : [{ label: "Ver backlog", href: backlog }];
  }
  if (card.column === "next_task_created") {
    return [
      { label: "Ver tarea creada", href: backlog },
      detailHref
        ? { label: "Ver aprobación", href: detailHref }
        : {
            label: "Ver aprobación",
            disabledReason: "No hay run enlazado en esta tarjeta.",
          },
    ];
  }
  if (card.column === "done") {
    return [
      detailHref
        ? { label: "Ver resultado", href: detailHref }
        : { label: "Ver backlog", href: backlog },
      {
        label: "Crear seguimiento",
        disabledReason: "Se crea desde una aprobación o cambio solicitado.",
      },
    ];
  }
  return detailHref
    ? [{ label: "Abrir detalle", href: detailHref }]
    : [{ label: "Ver backlog", href: backlog }];
}

function WorkboardCardView({
  card,
  onOpen,
}: {
  card: WorkboardCard;
  onOpen: (card: WorkboardCard) => void;
}) {
  const preview = cardPreview(card);
  const risk = card.risk ? humanize(card.risk) : null;

  return (
    <button
      type="button"
      data-testid="growth-workboard-card"
      onClick={() => onOpen(card)}
      className="group w-full rounded-md border border-[var(--studio-border)] bg-[var(--studio-surface)] p-2 text-left shadow-sm transition hover:border-[var(--studio-primary)]/50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[var(--studio-primary)]/40"
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
    </button>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--studio-border)] p-3">
      <div className="text-[11px] uppercase text-[var(--studio-text-muted)]">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium text-[var(--studio-text)]">
        {value}
      </div>
    </div>
  );
}

function WorkboardCardSheet({
  card,
  websiteId,
  onOpenChange,
}: {
  card: WorkboardCard | null;
  websiteId: string;
  onOpenChange: (open: boolean) => void;
}) {
  const open = !!card;
  if (!card) {
    return <Sheet open={false} onOpenChange={onOpenChange} />;
  }

  const detailHref = runHref(websiteId, card);
  const actions = quickActionsFor(card, websiteId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        data-testid="growth-workboard-detail-sheet"
        className="w-[92vw] overflow-y-auto sm:max-w-xl"
      >
        <SheetHeader className="border-b border-[var(--studio-border)]">
          <div className="flex flex-wrap gap-2 pr-8">
            <StudioBadge tone={statusTone(card.column)}>
              {COLUMN_LABELS[card.column]}
            </StudioBadge>
            <StudioBadge tone="info">{LANE_LABELS[card.lane]}</StudioBadge>
            {card.risk ? (
              <StudioBadge tone={riskTone(card.risk)}>
                {humanize(card.risk)}
              </StudioBadge>
            ) : null}
          </div>
          <SheetTitle className="mt-3 text-lg leading-snug">
            {card.title}
          </SheetTitle>
          <SheetDescription>
            {humanize(card.workType)} / {card.sourceLabel}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4">
          <section>
            <h3 className="text-sm font-semibold text-[var(--studio-text)]">
              Resumen para marketing
            </h3>
            <p className="mt-2 rounded-md bg-[var(--studio-surface-muted,theme(colors.zinc.50))] p-3 text-sm leading-relaxed text-[var(--studio-text)]">
              {cardPreview(card)}
            </p>
          </section>

          <section className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <DetailRow label="Estado" value={COLUMN_LABELS[card.column]} />
            <DetailRow
              label="Responsable"
              value={card.agentName ?? LANE_LABELS[card.lane]}
            />
            <DetailRow
              label="Quién aprueba"
              value={humanize(card.approvalRequirement)}
            />
            <DetailRow label="Último cambio" value={fmtDate(card.updatedAt)} />
          </section>

          {card.evidenceRefs.length > 0 ? (
            <section>
              <h3 className="text-sm font-semibold text-[var(--studio-text)]">
                Evidencia
              </h3>
              <ul className="mt-2 space-y-2 text-xs text-[var(--studio-text-muted)]">
                {card.evidenceRefs.map((ref) => (
                  <li
                    key={ref}
                    className="rounded border border-[var(--studio-border)] px-2 py-1"
                  >
                    {ref}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section>
            <h3 className="text-sm font-semibold text-[var(--studio-text)]">
              Acciones rápidas
            </h3>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {actions.map((action) =>
                action.href ? (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="rounded-md border border-[var(--studio-border)] px-3 py-2 text-left text-sm font-medium text-[var(--studio-text)] hover:bg-[var(--studio-surface-muted,theme(colors.zinc.50))]"
                    data-testid={`growth-workboard-quick-action-${action.label
                      .toLowerCase()
                      .replaceAll(" ", "-")}`}
                  >
                    {action.label}
                  </Link>
                ) : (
                  <button
                    key={action.label}
                    type="button"
                    disabled
                    title={action.disabledReason}
                    className="rounded-md border border-[var(--studio-border)] px-3 py-2 text-left text-sm font-medium text-[var(--studio-text-muted)] opacity-70"
                    data-testid={`growth-workboard-quick-action-${action.label
                      .toLowerCase()
                      .replaceAll(" ", "-")}`}
                  >
                    {action.label}
                  </button>
                ),
              )}
            </div>
            <p className="mt-2 text-xs text-[var(--studio-text-muted)]">
              Las acciones que aplican cambios reales siguen gobernadas en el
              detalle del run; no se publica, pauta ni activa experimento desde
              este tablero.
            </p>
          </section>
        </div>

        <SheetFooter className="border-t border-[var(--studio-border)]">
          <div className="flex flex-wrap gap-2">
            {detailHref ? (
              <Link href={detailHref} className="studio-button">
                Abrir detalle técnico
              </Link>
            ) : null}
            <Link
              href={backlogHref(websiteId)}
              className="studio-button studio-button--outline"
            >
              Ver backlog
            </Link>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function GrowthWorkboardClient({
  cardsByColumn,
  columns,
  websiteId,
  buildColumnHref,
}: {
  cardsByColumn: Record<WorkboardColumn, WorkboardCard[]>;
  columns: readonly WorkboardColumn[];
  websiteId: string;
  buildColumnHref: Record<WorkboardColumn, string>;
}) {
  const [selectedCard, setSelectedCard] = useState<WorkboardCard | null>(null);
  const selectedCardId = selectedCard?.id;

  const selectedFreshCard = useMemo(() => {
    if (!selectedCardId) return null;
    for (const column of columns) {
      const found = cardsByColumn[column]?.find(
        (card) => card.id === selectedCardId,
      );
      if (found) return found;
    }
    return selectedCard;
  }, [cardsByColumn, columns, selectedCard, selectedCardId]);

  return (
    <>
      <section
        data-testid="growth-workboard-kanban"
        className="mt-5 overflow-x-auto pb-4"
      >
        <div className="grid min-w-[1320px] grid-cols-7 gap-3">
          {columns.map((column) => {
            const cards = cardsByColumn[column] ?? [];
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
                        onOpen={setSelectedCard}
                      />
                    ))
                  ) : (
                    <p className="rounded border border-dashed border-[var(--studio-border)] p-3 text-xs text-[var(--studio-text-muted)]">
                      Sin trabajo.
                    </p>
                  )}
                  {hiddenCount > 0 ? (
                    <Link
                      href={buildColumnHref[column]}
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

      <WorkboardCardSheet
        card={selectedFreshCard}
        websiteId={websiteId}
        onOpenChange={(open) => {
          if (!open) setSelectedCard(null);
        }}
      />
    </>
  );
}
