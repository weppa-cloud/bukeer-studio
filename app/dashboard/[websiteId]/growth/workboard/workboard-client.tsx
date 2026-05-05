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
import { approveChangeSet, rejectChangeSet } from "../runs/[runId]/actions";

const COLUMN_LABELS: Record<WorkboardColumn, string> = {
  triage: "Triage",
  ready: "Ready",
  running: "Ejecutando",
  blocked: "Bloqueado",
  review_needed: "Revisión humana",
  auto_completed: "Auto completado",
  published_applied: "Publicado / aplicado",
  archived: "Archivado",
};

const COLUMN_HELP: Record<WorkboardColumn, string> = {
  triage: "Ideas y oportunidades que el orquestador debe entender.",
  ready: "Trabajo listo para que un agente lo tome.",
  running: "El agente está trabajando o tuvo ejecución reciente.",
  blocked: "Falta evidencia, credenciales, policy o una decisión.",
  review_needed: "Solo este trabajo necesita lectura humana.",
  auto_completed: "El agente completó el paso y puede encadenar lo siguiente.",
  published_applied: "Cambio aplicado o publicado con trazabilidad.",
  archived: "Trabajo cerrado o descartado.",
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
  council_packet_preview: "Paquete para Council",
  cro_activation: "Activación CRO",
  follow_up_backlog_create: "Nueva tarea de seguimiento",
  growth_opportunity: "Oportunidad Growth",
  research_packet: "Paquete de investigación",
  seo_content: "Contenido SEO",
  technical_remediation: "Corrección técnica",
  transcreation: "Transcreación",
};

const MAX_CARDS_PER_COLUMN = 8;
const TAB_LABELS = ["Resumen", "Preview", "Evidencia", "Tools"] as const;
type DetailTab = (typeof TAB_LABELS)[number];

function statusTone(
  column: WorkboardColumn,
): "neutral" | "info" | "success" | "warning" | "danger" {
  if (column === "auto_completed" || column === "published_applied")
    return "success";
  if (column === "review_needed") return "warning";
  if (column === "blocked") return "danger";
  if (column === "ready" || column === "archived") return "info";
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

function titleForOperator(value: string): string {
  return value
    .replace(/^Seo Demand:\s*/i, "Oportunidad SEO: ")
    .replace(
      /^Run fresh DataForSEO OnPage crawl/i,
      "Actualizar rastreo técnico",
    )
    .replace(
      /^Confirm sitemap\/hreflang policy/i,
      "Confirmar política de sitemap y hreflang",
    )
    .replace(/^Cohort spot-check:/i, "Revisión de muestra:")
    .replace(
      /^Create on-page CTA\/UX inventory/i,
      "Inventario de CTA y experiencia de página",
    )
    .replace(
      /^Backfill baseline date ranges \+ segmentation/i,
      "Completar fechas base y segmentación",
    )
    .replace(/^SERP snippet benchmark/i, "Benchmark del resultado en Google")
    .replace(
      /^Define and pull primary conversion events for URL/i,
      "Definir conversión principal de la URL",
    )
    .replace(/^Draft brief:/i, "Brief borrador:")
    .replace(/^Brief packet/i, "Paquete de brief")
    .replace(/^Council Packet Draft/i, "Borrador para Council")
    .replace(/^CRO\/SEO Opportunity:/i, "Oportunidad CRO/SEO:")
    .replace(
      /High impressions, near-page-1 queries, very low CTR/i,
      "muchas impresiones, queries cerca de primera página y CTR muy bajo",
    )
    .replace(/^Market alignment verification/i, "Verificación de mercado")
    .replace(
      /^On-page \+ SERP gap audit/i,
      "Auditoría de página y brecha en Google",
    )
    .replace(
      /\(draft-only recommendations\)/gi,
      "(recomendaciones en borrador)",
    )
    .replace(/^Measurement integrity check/i, "Validación de medición")
    .replace(
      /^Technical SEO remediation closeout packet/i,
      "Cierre de corrección SEO técnica",
    )
    .replace(/\(Draft Only\)/gi, "(solo borrador)")
    .replace(/\(no publish\)/gi, "(sin publicar)");
}

function textForOperator(value: string | null | undefined): string {
  if (!value) {
    return "El agente dejó una propuesta lista para revisar con el equipo Growth.";
  }
  let text = value
    .replace(
      /^Re-crawl the exact URL and capture `title`, `h1`, canonical, robots, and any render warnings\. Compare to old run IDs referenced in backlog item\. Attach new run_id and deltas\./i,
      "El agente debe volver a rastrear la URL y confirmar título, H1, canonical, robots y alertas de render. Luego comparará contra mediciones anteriores y dejará los cambios detectados.",
    )
    .replace(
      /^Document whether hreflang is intentionally absent and whether this URL should appear in sitemap.*$/i,
      "El agente debe documentar si la ausencia de hreflang es intencional y si la URL debe aparecer en sitemap antes de cualquier cambio de exposición.",
    )
    .replace(
      /^Sample 10 `\/blog\/` URLs.*$/i,
      "El agente debe revisar una muestra de 10 blogs para confirmar consistencia de título y H1, y señalar si hay fallas del template.",
    )
    .replace(
      /^Document current CTA placements.*$/i,
      "El agente debe inventariar CTAs, puntos de fricción y señales de confianza para proponer mejoras CRO sin publicar cambios.",
    )
    .replace(
      /^Confirm the exact date windows.*$/i,
      "El agente debe confirmar ventanas de fechas, dispositivo y país para que Council pueda decidir con una línea base clara.",
    )
    .replace(
      /^Capture current title\/meta shown in SERP.*$/i,
      "El agente debe comparar el título y meta actual contra competidores y proponer opciones de snippet como borrador.",
    )
    .replace(
      /^Identify the canonical primary conversion event.*$/i,
      "El agente debe definir cuál es la conversión principal de esta página y validar si está bien medida.",
    )
    .replace(
      /^Run EN\/locale quality gate.*$/i,
      "El agente debe pasar el control de calidad del idioma antes de tocar sitemap, hreflang o publicación.",
    )
    .replace(
      /^Review joint fact and promote to backlog.*$/i,
      "El agente debe revisar la evidencia combinada y promoverla al backlog solo si la hipótesis es clara.",
    )
    .replace(
      /^GA4 event\/page drop-off:\s*([^.]*)\.\s*Check activation-to-lead instrumentation and CTA path\./i,
      "Hay actividad en la página, pero no aparecen conversiones GA4. El agente debe revisar medición, CTA y camino hacia lead antes de proponer cambios.",
    )
    .replace(
      /^Prepare Studio content update draft, then run SEO\/canonical\/CTA smoke\./i,
      "El agente debe preparar un borrador de actualización de contenido y validar SEO, canonical y CTA antes de pedir aprobación.",
    )
    .replace(
      /^Baseline \(2026-04-02\.\.2026-04-29\): GSC 6909 impressions \/ 5 clicks \/ 0\.1% CTR \/ avg pos 17\.8; GA4 31 sessions \/ 52\.3% engagement\. Segment signals: mobile shows stronger avg position \(pos ~9\.2\) but CTR remains ~0\.1%; query examples include positions ~4–12 with 0 clicks\. Gaps before execution: confirm on-page intent match, title\/meta snippet competitiveness, trust\/proof elements, mobile CTA clarity, and WhatsApp\/WAFlow measurement integrity\. Gating: resolve market label mismatch \(EU vs CO evidence\) and define single Council metric \+ evaluation date\./i,
      "Línea base: la página tiene muchas impresiones y pocos clics. En móvil aparece cerca de buenas posiciones, pero casi nadie hace clic. Antes de ejecutar, el equipo debe validar intención de búsqueda, título/meta, señales de confianza, claridad del CTA móvil y medición de WhatsApp/WAFlow. También hay que corregir una diferencia de mercado en la evidencia y definir una métrica única para Council.",
    )
    .replace(
      /^This candidate is high-priority but not Council-executable yet due to missing baseline date ranges and missing conversion-event baseline\./i,
      "Esta oportunidad parece prioritaria, pero todavía no está lista para Council porque faltan rangos de fecha y línea base de conversión.",
    )
    .replace(
      /^Adds market\/geo consistency gate$/i,
      "Agrega validación de consistencia de mercado y geografía",
    )
    .replace(
      /^Adds measurement\/instrumentation gate$/i,
      "Agrega validación de medición e instrumentación",
    )
    .replace(
      /^Converts hypothesis into a draft execution checklist \(non-publishing, non-activation\)$/i,
      "Convierte la hipótesis en una lista de ejecución en borrador, sin publicar ni activar experimentos",
    )
    .replace(
      /^Confirm whether this row should be evaluated under market=CO vs EU.*$/i,
      "Confirmar si esta oportunidad debe evaluarse para Colombia o Europa, y reconciliarlo con los datos de Search Console y el reporte de Council.",
    )
    .replace(
      /^Prepare a non-publishing recommendations list: title\/meta options.*$/i,
      "Preparar recomendaciones sin publicar: opciones de título/meta, ángulos de snippet, pruebas de confianza, ubicación de CTAs y mejoras móviles, con razón asociada a queries y posiciones.",
    )
    .replace(
      /^Verify WAFlow\/WhatsApp event tracking.*$/i,
      "Verificar la medición de WAFlow/WhatsApp para esta URL y definir la métrica única de Council con fecha de evaluación.",
    )
    .replace(/^Review packet$/i, "Revisar paquete")
    .replace(
      /^Blocked for execution pending analytics validation:/i,
      "Bloqueado hasta validar analítica para",
    )
    .replace(
      /^Draft MX snippet \+ WhatsApp CTA \(review only\)/i,
      "Borrador de snippet para México y CTA de WhatsApp listo para revisión",
    )
    .replace(/^es-CO locale readiness:/i, "Preparación de idioma es-CO:")
    .replace(/`([^`]+)`/g, "$1");

  if (/^[A-Z_]+:/.test(text) || text.length > 260) {
    text = text.slice(0, 260).replace(/\s+\S*$/, "");
    return `${text}...`;
  }
  return text;
}

function autonomyCopy(card: WorkboardCard): {
  label: string;
  tone: "neutral" | "info" | "success" | "warning" | "danger";
} {
  if (card.column === "blocked" || card.autonomyLabel === "bloqueado") {
    return { label: "Bloqueado", tone: "danger" };
  }
  if (
    card.column === "review_needed" ||
    card.autonomyLabel === "revision_humana"
  ) {
    return { label: "Necesita decisión", tone: "warning" };
  }
  if (card.column === "auto_completed") {
    return { label: "Completado", tone: "success" };
  }
  if (card.column === "published_applied") {
    return { label: "Aplicado", tone: "success" };
  }
  return { label: "Sigue solo", tone: "success" };
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
  return textForOperator(card.previewDetails.body ?? card.preview);
}

function previewHeadline(card: WorkboardCard): string {
  return titleForOperator(card.previewDetails.headline ?? card.title);
}

function labelForLaneToken(value: string | null): string {
  if (!value) return "-";
  if (value in LANE_LABELS) return LANE_LABELS[value as AgentLane];
  return humanize(value);
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
  if (card.column === "review_needed") {
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
  if (card.column === "triage" || card.column === "ready") {
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
  if (card.column === "auto_completed") {
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
  if (card.column === "archived" || card.column === "published_applied") {
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
  const risk = humanize(card.risk);
  const autonomy = autonomyCopy(card);

  return (
    <button
      type="button"
      data-testid="growth-workboard-card"
      onClick={() => onOpen(card)}
      className="group relative w-full overflow-hidden rounded-md border border-[var(--studio-border)] bg-[var(--studio-surface)] p-2.5 pl-3 text-left shadow-sm transition hover:border-[var(--studio-primary)]/50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[var(--studio-primary)]/40"
    >
      <div
        className={`absolute inset-y-0 left-0 w-1 ${
          card.column === "blocked"
            ? "bg-red-500"
            : card.column === "review_needed"
              ? "bg-amber-500"
              : card.column === "auto_completed" ||
                  card.column === "published_applied"
                ? "bg-emerald-500"
                : "bg-[var(--studio-primary)]"
        }`}
      />

      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[11px] font-medium text-[var(--studio-text-muted)]">
          {LANE_LABELS[card.lane]}
        </span>
        <StudioBadge tone={riskTone(card.risk)}>{risk}</StudioBadge>
      </div>

      <h3 className="mt-2 line-clamp-2 text-[13px] font-semibold leading-snug text-[var(--studio-text)]">
        {titleForOperator(card.title)}
      </h3>

      <p className="mt-1 truncate text-[11px] text-[var(--studio-text-muted)]">
        {card.agentName ?? LANE_LABELS[card.lane]} · {card.language}
      </p>

      <p className="mt-2 line-clamp-2 min-h-8 text-xs leading-snug text-[var(--studio-text-muted)]">
        {preview}
      </p>

      {card.evidenceRefs.length > 0 ? (
        <p className="mt-2 text-[11px] text-[var(--studio-text-muted)]">
          {card.evidenceRefs.length} referencias de evidencia
        </p>
      ) : null}

      <div className="mt-2 flex flex-wrap gap-1">
        <StudioBadge tone={autonomy.tone}>{autonomy.label}</StudioBadge>
        {card.childTaskCount > 0 ? (
          <StudioBadge tone="info">
            {card.childTaskCount} tareas hijas
          </StudioBadge>
        ) : null}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-[var(--studio-text-muted)]">
        <span className="truncate">{textForOperator(card.progressLabel)}</span>
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

function WorkboardDecisionPanel({
  card,
  websiteId,
}: {
  card: WorkboardCard;
  websiteId: string;
}) {
  const canUseInlineLedger =
    card.column === "review_needed" && card.runId && card.changeSetId;
  if (card.column !== "review_needed") return null;
  if (card.humanDecision) {
    return (
      <p className="rounded-md border border-[var(--studio-border)] p-3 text-sm text-[var(--studio-text-muted)]">
        Decisión registrada: {humanize(card.humanDecision)}.
      </p>
    );
  }
  if (!canUseInlineLedger) {
    return (
      <p className="rounded-md border border-[var(--studio-border)] p-3 text-sm text-[var(--studio-text-muted)]">
        Esta tarjeta necesita revisión, pero no tiene change set completo para
        aprobar desde el tablero. Abre el detalle completo para revisar el
        ledger.
      </p>
    );
  }

  return (
    <div
      data-testid="growth-workboard-decision-panel"
      className="rounded-md border border-[var(--studio-border)] bg-[var(--studio-surface)] p-3"
    >
      <h3 className="text-sm font-semibold text-[var(--studio-text)]">
        Decisión del revisor
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-[var(--studio-text-muted)]">
        Aprobar no publica ni aplica cambios sensibles. Registra la decisión,
        deja trazabilidad humana y puede crear tareas de seguimiento en backlog.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <form action={approveChangeSet}>
          <input type="hidden" name="websiteId" value={websiteId} />
          <input type="hidden" name="runId" value={card.runId ?? ""} />
          <input
            type="hidden"
            name="changeSetId"
            value={card.changeSetId ?? ""}
          />
          <button
            type="submit"
            data-testid="growth-workboard-approve-change-set"
            aria-label="Approve / Aprobar propuesta del Workboard"
            className="studio-button studio-button--primary"
          >
            Aprobar propuesta
          </button>
        </form>
        <form action={rejectChangeSet} className="flex flex-wrap gap-2">
          <input type="hidden" name="websiteId" value={websiteId} />
          <input type="hidden" name="runId" value={card.runId ?? ""} />
          <input
            type="hidden"
            name="changeSetId"
            value={card.changeSetId ?? ""}
          />
          <input
            name="notes"
            maxLength={500}
            className="studio-input min-w-48"
            placeholder="Motivo o ajuste pedido"
            aria-label="Motivo para pedir cambios"
          />
          <button
            type="submit"
            data-testid="growth-workboard-reject-change-set"
            aria-label="Reject / Pedir cambios desde Workboard"
            className="studio-button studio-button--danger"
          >
            Pedir cambios
          </button>
        </form>
      </div>
    </div>
  );
}

function WorkboardPreviewPanel({ card }: { card: WorkboardCard }) {
  const details = card.previewDetails;
  const hasFollowUps = details.followUpTasks.length > 0;
  const hasMaterialized = details.materializedBacklogItems.length > 0;
  const hasDiff = details.diffSummary.length > 0;

  return (
    <section data-testid="growth-workboard-preview-panel">
      <h3 className="text-sm font-semibold text-[var(--studio-text)]">
        Vista previa del trabajo
      </h3>
      <div className="mt-2 rounded-md border border-[var(--studio-border)] bg-[var(--studio-surface)] p-4">
        <div className="flex flex-wrap gap-2">
          <StudioBadge tone="info">{humanize(card.workType)}</StudioBadge>
          {details.kind ? (
            <StudioBadge tone="neutral">{humanize(details.kind)}</StudioBadge>
          ) : null}
        </div>
        <h4 className="mt-3 text-base font-semibold leading-snug text-[var(--studio-text)]">
          {previewHeadline(card)}
        </h4>
        <p className="mt-3 text-sm leading-relaxed text-[var(--studio-text-muted)]">
          {textForOperator(details.body ?? card.preview)}
        </p>
        {details.ctaLabel ? (
          <p className="mt-3 inline-flex rounded border border-[var(--studio-border)] px-2 py-1 text-xs font-medium text-[var(--studio-text)]">
            Acción sugerida: {textForOperator(details.ctaLabel)}
          </p>
        ) : null}
      </div>

      {hasDiff ? (
        <div className="mt-3 rounded-md border border-[var(--studio-border)] p-3">
          <h4 className="text-xs font-semibold uppercase text-[var(--studio-text-muted)]">
            Qué cambia o propone
          </h4>
          <ul className="mt-2 space-y-2 text-sm text-[var(--studio-text)]">
            {details.diffSummary.map((item) => (
              <li key={item}>• {textForOperator(item)}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {hasFollowUps ? (
        <div className="mt-3 rounded-md border border-[var(--studio-border)] p-3">
          <h4 className="text-xs font-semibold uppercase text-[var(--studio-text-muted)]">
            Tareas que puede encadenar
          </h4>
          <div className="mt-2 space-y-2">
            {details.followUpTasks.map((task) => (
              <article
                key={`${task.title}:${task.lane ?? ""}`}
                className="rounded border border-[var(--studio-border)] p-2"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h5 className="text-sm font-medium text-[var(--studio-text)]">
                    {titleForOperator(task.title)}
                  </h5>
                  {task.lane ? (
                    <StudioBadge tone="neutral">
                      {labelForLaneToken(task.lane)}
                    </StudioBadge>
                  ) : null}
                  {task.requiresHumanReview ? (
                    <StudioBadge tone="warning">Revisión humana</StudioBadge>
                  ) : null}
                </div>
                {task.instructions ? (
                  <p className="mt-1 text-xs leading-relaxed text-[var(--studio-text-muted)]">
                    {textForOperator(task.instructions)}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {hasMaterialized ? (
        <div className="mt-3 rounded-md border border-[var(--studio-border)] p-3">
          <h4 className="text-xs font-semibold uppercase text-[var(--studio-text-muted)]">
            Trabajo creado en backlog
          </h4>
          <div className="mt-2 space-y-2">
            {details.materializedBacklogItems.map((item) => (
              <div
                key={`${item.id ?? item.title}:${item.status ?? ""}`}
                className="flex items-center justify-between gap-2 rounded border border-[var(--studio-border)] px-2 py-1.5 text-xs"
              >
                <span className="font-medium text-[var(--studio-text)]">
                  {titleForOperator(item.title)}
                </span>
                <span className="text-[var(--studio-text-muted)]">
                  {humanize(item.status)} / {humanize(item.workType)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
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
  const [activeTab, setActiveTab] = useState<DetailTab>("Resumen");
  const open = !!card;
  if (!card) {
    return <Sheet open={false} onOpenChange={onOpenChange} />;
  }

  const detailHref = runHref(websiteId, card);
  const actions = quickActionsFor(card, websiteId);
  const autonomy = autonomyCopy(card);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        data-testid="growth-workboard-detail-sheet"
        className="flex h-full w-[92vw] flex-col overflow-hidden sm:max-w-2xl"
      >
        <SheetHeader className="shrink-0 border-b border-[var(--studio-border)]">
          <div className="flex flex-wrap gap-2 pr-8">
            <StudioBadge tone={statusTone(card.column)}>
              {COLUMN_LABELS[card.column]}
            </StudioBadge>
            <StudioBadge tone="info">{LANE_LABELS[card.lane]}</StudioBadge>
            <StudioBadge tone={riskTone(card.risk)}>
              Riesgo {humanize(card.risk)} / {card.riskScore}
            </StudioBadge>
          </div>
          <SheetTitle className="mt-3 text-lg leading-snug">
            {titleForOperator(card.title)}
          </SheetTitle>
          <SheetDescription>
            {card.agentName ?? LANE_LABELS[card.lane]} /{" "}
            {humanize(card.workType)} / {card.language}
          </SheetDescription>
        </SheetHeader>

        <div className="shrink-0 border-b border-[var(--studio-border)] px-4 py-2">
          <div className="grid grid-cols-4 gap-1 rounded-md bg-[var(--studio-surface-muted,theme(colors.zinc.50))] p-1">
            {TAB_LABELS.map((tabLabel) => (
              <button
                key={tabLabel}
                type="button"
                onClick={() => setActiveTab(tabLabel)}
                className={`rounded px-2 py-1.5 text-xs font-medium transition ${
                  activeTab === tabLabel
                    ? "bg-[var(--studio-surface)] text-[var(--studio-text)] shadow-sm"
                    : "text-[var(--studio-text-muted)] hover:text-[var(--studio-text)]"
                }`}
              >
                {tabLabel}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {activeTab === "Resumen" ? (
            <>
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
                <DetailRow label="Autonomía" value={autonomy.label} />
                <DetailRow
                  label="Quién aprueba"
                  value={humanize(card.approvalRequirement)}
                />
                <DetailRow
                  label="Último cambio"
                  value={fmtDate(card.updatedAt)}
                />
                <DetailRow
                  label="Riesgo"
                  value={`${humanize(card.risk)} / ${card.riskScore}`}
                />
              </section>

              <section>
                <h3 className="text-sm font-semibold text-[var(--studio-text)]">
                  Qué puede hacer este agente
                </h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {card.capabilityLabels.map((capability) => (
                    <StudioBadge key={capability} tone="neutral">
                      {capability}
                    </StudioBadge>
                  ))}
                </div>
                {card.nextAction ? (
                  <p className="mt-2 rounded-md border border-[var(--studio-border)] p-3 text-sm text-[var(--studio-text)]">
                    Siguiente paso: {textForOperator(card.nextAction)}
                  </p>
                ) : null}
              </section>
            </>
          ) : null}

          {activeTab === "Preview" ? (
            <WorkboardPreviewPanel card={card} />
          ) : null}

          {activeTab === "Evidencia" ? (
            <>
              {card.evidenceRefs.length > 0 ? (
                <section>
                  <h3 className="text-sm font-semibold text-[var(--studio-text)]">
                    Evidencia usada
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
              ) : (
                <p className="rounded-md border border-[var(--studio-border)] p-3 text-sm text-[var(--studio-text-muted)]">
                  Esta tarjeta aún no tiene referencias de evidencia visibles.
                </p>
              )}
            </>
          ) : null}

          {activeTab === "Tools" ? (
            <>
              <section className="grid grid-cols-2 gap-2">
                <DetailRow
                  label="Tools permitidas"
                  value={String(card.toolCallSummary.allowed)}
                />
                <DetailRow
                  label="Tools bloqueadas"
                  value={String(card.toolCallSummary.blocked)}
                />
              </section>
              <p className="rounded-md border border-[var(--studio-border)] p-3 text-sm text-[var(--studio-text-muted)]">
                Las acciones públicas, de pauta, transcreación final o
                activación de experimentos se elevan por política antes de
                ejecutarse.
              </p>
            </>
          ) : null}
        </div>

        <SheetFooter className="sticky bottom-0 shrink-0 border-t border-[var(--studio-border)] bg-[var(--studio-surface)]">
          <div className="flex w-full flex-col gap-2">
            <WorkboardDecisionPanel card={card} websiteId={websiteId} />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {actions.slice(0, 2).map((action) =>
                action.href ? (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="studio-button justify-center"
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
                    className="studio-button justify-center opacity-50"
                    data-testid={`growth-workboard-quick-action-${action.label
                      .toLowerCase()
                      .replaceAll(" ", "-")}`}
                  >
                    {action.label}
                  </button>
                ),
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {detailHref ? (
                <Link
                  href={detailHref}
                  className="text-xs font-medium text-[var(--studio-primary)]"
                >
                  Abrir detalle completo
                </Link>
              ) : null}
              <Link
                href={backlogHref(websiteId)}
                className="text-xs font-medium text-[var(--studio-text-muted)] hover:text-[var(--studio-text)]"
              >
                Ver backlog
              </Link>
            </div>
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
        className="mt-5 overflow-x-auto overscroll-x-contain pb-4"
      >
        <div className="grid w-max grid-flow-col auto-cols-[minmax(18rem,calc(100vw-2rem))] gap-4 sm:auto-cols-[20rem] xl:auto-cols-[22rem]">
          {columns.map((column) => {
            const cards = cardsByColumn[column] ?? [];
            const visibleCards = cards.slice(0, MAX_CARDS_PER_COLUMN);
            const hiddenCount = cards.length - visibleCards.length;
            return (
              <div
                key={column}
                data-testid={`growth-workboard-column-${column}`}
                className="flex max-h-[calc(100vh-300px)] min-h-48 min-w-0 flex-col rounded-md border border-[var(--studio-border)] bg-[var(--studio-surface-muted,theme(colors.zinc.50))] p-3"
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
