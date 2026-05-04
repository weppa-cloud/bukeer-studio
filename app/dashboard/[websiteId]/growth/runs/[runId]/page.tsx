import { notFound } from "next/navigation";
import Link from "next/link";
import {
  type AgentRunStatus,
  type GrowthAgentChangeSet,
  type GrowthAgentRunEvent,
} from "@bukeer/website-contract";
import {
  StudioPage,
  StudioSectionHeader,
  StudioBadge,
} from "@/components/studio/ui/primitives";
import { getAgentRunDetail } from "@/lib/growth/console/queries-runs";
import {
  type GrowthRole,
  hasGrowthRole,
  requireGrowthRole,
} from "@/lib/growth/console/auth";
import {
  activateReplayCandidate,
  approveChangeSet,
  approveMemoryCandidate,
  approveRun,
  approveSkillCandidate,
  downloadArtifactAction,
  rejectChangeSet,
  rejectMemoryCandidate,
  rejectReplayCandidate,
  rejectRun,
  rejectSkillCandidate,
} from "./actions";

/**
 * Reviews & Agent Runs — detail view (#407).
 *
 * Tenant-guarded server component (ADR-009). Renders run header, append-only
 * timeline of events, evidence (collapsed JSON), and an artifact download
 * affordance via Server Action that returns a signed URL.
 *
 * Append-only: events are READ-ONLY here. There is no UI for editing or
 * deleting events.
 *
 * Artifact paths are NEVER raw-exposed. We display only the last 16 chars
 * of `artifact_path` plus a TODO note; the signed URL is derived
 * server-side and only returned through the action.
 *
 * Roles: Approve / Reject require `curator+`. The Server Actions also
 * re-check before mutating.
 */

const STATUS_TONE: Record<
  AgentRunStatus,
  "neutral" | "success" | "warning" | "danger" | "info"
> = {
  claimed: "info",
  running: "info",
  review_required: "warning",
  failed: "danger",
  completed: "success",
  stalled: "danger",
};

const STATUS_LABELS: Record<AgentRunStatus, string> = {
  claimed: "En cola",
  running: "Ejecutando",
  review_required: "Requiere revisión",
  failed: "Falló",
  completed: "Completado",
  stalled: "Detenido",
};

const LANE_LABELS: Record<string, string> = {
  orchestrator: "Orquestador",
  technical_remediation: "Corrección técnica",
  transcreation: "Transcreación",
  content_creator: "Creación de contenido",
  content_curator: "Curaduría de contenido",
};

const ACTION_LABELS: Record<string, string> = {
  observe: "Solo observar datos",
  prepare: "Preparar recomendación",
  prepare_for_human: "Preparar para revisión humana",
  safe_apply: "Aplicar cambio técnico seguro",
  content_publish: "Publicar contenido",
  transcreation_merge: "Unir transcreación",
  paid_mutation: "Cambiar pauta pagada",
  experiment_activation: "Activar experimento",
  outreach_send: "Enviar contacto",
  review_required: "Enviar a revisión humana",
  human_review: "Revisión humana",
  none: "Sin acción automática",
};

const DECISION_LABELS: Record<string, string> = {
  approve: "Recomendado",
  approved: "Recomendado",
  accept: "Recomendado",
  proceed: "Continuar",
  review_required: "Revisar antes de aplicar",
  needs_review: "Revisar antes de aplicar",
  reject: "No recomendado",
  blocked: "Bloqueado por política",
  no_op: "Sin acción necesaria",
};

const TOOL_LABELS: Record<string, string> = {
  codex_cli: "Codex executor",
  artifact_writer: "Generación de artifact",
  ai_review: "Revisión IA",
  replay_seed: "Caso de evaluación",
  memory_learning: "Memoria del agente",
  skill_learning: "Skill del agente",
};

const CHANGE_SET_STATUS_LABELS: Record<string, string> = {
  proposed: "Propuesto",
  draft_created: "Borrador creado",
  needs_review: "Listo para revisión",
  changes_requested: "Cambios solicitados",
  approved: "Aprobado",
  applied: "Aplicado en borrador",
  published: "Publicado",
  rejected: "Rechazado",
  blocked: "Bloqueado",
};

const CHANGE_TYPE_LABELS: Record<string, string> = {
  backlog_route_update: "Actualizar ruta de oportunidad",
  backlog_task_split: "Dividir tarea de backlog",
  follow_up_backlog_create: "Crear tarea de seguimiento",
  council_packet_prepare: "Preparar paquete para Council",
  governance_block: "Bloqueo de gobernanza",
  growth_cycle_summary: "Resumen del ciclo Growth",
  seo_title_meta_draft: "Borrador de título y meta SEO",
  seo_indexing_draft: "Borrador de indexación SEO",
  route_mapping_draft: "Mapeo de ruta",
  internal_link_draft: "Enlaces internos sugeridos",
  performance_remediation_task: "Tarea de mejora técnica",
  technical_smoke_result: "Resultado de prueba técnica",
  blog_draft_create: "Borrador de blog",
  content_update_draft: "Actualización de contenido",
  content_brief_create: "Brief de contenido",
  faq_schema_draft: "Borrador de FAQ",
  landing_section_copy_draft: "Copy para sección landing",
  content_evidence_request: "Solicitud de evidencia",
  transcreation_draft_create: "Borrador de transcreación",
  transcreation_update_draft: "Ajuste de transcreación",
  locale_seo_review: "Revisión SEO por mercado",
  translation_quality_fix_draft: "Corrección de traducción",
  locale_serp_packet: "Paquete SERP por mercado",
  transcreation_merge_readiness: "Preparación para unir transcreación",
  content_quality_review: "Revisión de calidad",
  creator_revision_request: "Solicitud de ajuste al creador",
  publish_packet_prepare: "Paquete para publicación",
  experiment_candidate_prepare: "Candidato de experimento",
  experiment_readout_prepare: "Lectura de experimento",
  learning_candidate_review: "Revisión de aprendizaje",
  tool_policy_verdict: "Veredicto de herramienta",
  blocked_tool_call_evidence: "Evidencia de herramienta bloqueada",
  replay_case_candidate: "Caso de evaluación candidato",
  memory_candidate: "Memoria candidata",
  skill_update_candidate: "Skill candidata",
  research_packet: "Paquete de investigación",
};

const WORK_TYPE_LABELS: Record<string, string> = {
  cro_activation: "Activación CRO",
  growth_opportunity: "Oportunidad Growth",
  seo_content: "Contenido SEO",
  technical_remediation: "Corrección técnica",
  transcreation: "Transcreación",
};

const RISK_LABELS: Record<string, string> = {
  low: "Riesgo bajo",
  medium: "Riesgo medio",
  high: "Riesgo alto",
  blocked: "Bloqueado",
};

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

function compactPathTail(value: string | null | undefined): string {
  if (!value) return "—";
  const parts = value.split("/").filter(Boolean);
  const tail = parts.at(-1) ?? value;
  return tail.length > 12 ? `…${tail.slice(-12)}` : tail;
}

function humanizeToken(value: unknown): string {
  if (value == null) return "—";
  const raw = String(value).trim();
  if (!raw) return "—";
  if (raw.toLowerCase() === "seo_qa" || raw.toLowerCase() === "seo qa") {
    return "SEO QA";
  }
  if (raw.toLowerCase() === "growth_os") return "Growth OS";
  return raw.replace(/_/g, " ");
}

function humanizeLane(value: unknown): string {
  if (value == null) return "—";
  const key = String(value).trim();
  return LANE_LABELS[key] ?? humanizeToken(key);
}

function labelFromMap(value: unknown, labels: Record<string, string>): string {
  if (value == null) return "—";
  const key = String(value).trim();
  return labels[key] ?? humanizeToken(key);
}

function compactList(value: unknown, limit = 4): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean)
    .slice(0, limit);
}

interface HumanFollowUpTask {
  key: string;
  title: string;
  lane: string | null;
  instructions: string | null;
  requiresHumanReview: boolean | null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function optionalText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeFollowUpTasks(
  payload: Record<string, unknown>,
  limit = 3,
): HumanFollowUpTask[] {
  const value = payload.follow_up_tasks;
  if (!Array.isArray(value)) return [];

  return value
    .slice(0, limit)
    .map((item, index) => {
      if (typeof item === "string") {
        const title = item.trim();
        return title
          ? {
              key: `${index}:${title}`,
              title,
              lane: null,
              instructions: null,
              requiresHumanReview: null,
            }
          : null;
      }

      const task = asRecord(item);
      const title =
        optionalText(task.title) ??
        optionalText(task.name) ??
        optionalText(task.summary) ??
        optionalText(task.instructions) ??
        `Tarea sugerida ${index + 1}`;
      const lane =
        optionalText(task.target_lane) ??
        optionalText(task.lane) ??
        optionalText(task.owner_lane);
      const instructions =
        optionalText(task.instructions) ??
        optionalText(task.description) ??
        optionalText(task.next_action);
      const requiresHumanReview =
        typeof task.requires_human_review === "boolean"
          ? task.requires_human_review
          : null;

      return {
        key: `${index}:${title}:${lane ?? ""}`,
        title,
        lane,
        instructions,
        requiresHumanReview,
      };
    })
    .filter((task): task is HumanFollowUpTask => Boolean(task));
}

function previewText(
  payload: Record<string, unknown>,
  key: string,
): string | null {
  const value = payload[key];
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

function materializedBacklogItems(evidence: Record<string, unknown>): Array<{
  id: string | null;
  title: string;
  status: string | null;
  workType: string | null;
}> {
  const materialization = asRecord(evidence.follow_up_backlog_materialization);
  const created = materialization.created_items;
  if (!Array.isArray(created)) return [];

  return created.slice(0, 10).map((item, index) => {
    const row = asRecord(item);
    return {
      id: optionalText(row.id),
      title: optionalText(row.title) ?? `Tarea creada ${index + 1}`,
      status: optionalText(row.status),
      workType: optionalText(row.work_type),
    };
  });
}

function changeSetCanBeReviewed(status: string): boolean {
  return [
    "proposed",
    "draft_created",
    "needs_review",
    "changes_requested",
  ].includes(status);
}

function canReviewChangeSet(role: GrowthRole, requiredRole: string): boolean {
  if (requiredRole === "growth_operator") {
    return hasGrowthRole(role, "growth_operator");
  }
  if (requiredRole === "council_admin") {
    return hasGrowthRole(role, "council_admin");
  }
  return hasGrowthRole(role, "curator");
}

function confidenceLabel(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "Sin score";
  const percent = Math.round(value * 100);
  if (percent >= 80) return `${percent}% · confianza alta`;
  if (percent >= 60) return `${percent}% · confianza media`;
  return `${percent}% · revisar con cuidado`;
}

function marketingEvidenceSummary(
  raw: string | null,
  lane: string,
): string | null {
  if (!raw) return null;
  const normalized = raw.toLowerCase();
  if (normalized.includes("cro_activation")) {
    return "El agente revisó una oportunidad de activación CRO para una URL de ColombiaTours. Encontró una base baja de tráfico en Search Console/GA4 y recomienda que el equipo humano revise la propuesta antes de aplicar cualquier cambio.";
  }
  if (lane === "technical_remediation") {
    return "El agente revisó una oportunidad técnica y preparó una recomendación accionable. Antes de aplicar cambios, marketing o el equipo responsable debe validar evidencia, impacto esperado y riesgos.";
  }
  if (lane === "content_creator") {
    return "El agente preparó una propuesta de contenido para revisión. La pieza no se publica automáticamente y debe pasar por curaduría humana.";
  }
  if (lane === "transcreation") {
    return "El agente preparó una adaptación de contenido por mercado/idioma. La transcreación no se une ni se publica sin aprobación humana.";
  }
  return raw;
}

function CandidateReviewButtons({
  websiteId,
  runId,
  candidateId,
  canCurate,
  disabled,
  approveAction,
  rejectAction,
  approveLabel = "Approve",
  rejectLabel = "Reject",
}: {
  websiteId: string;
  runId: string;
  candidateId: string;
  canCurate: boolean;
  disabled: boolean;
  approveAction: (formData: FormData) => Promise<void>;
  rejectAction: (formData: FormData) => Promise<void>;
  approveLabel?: string;
  rejectLabel?: string;
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <form action={approveAction}>
        <input type="hidden" name="websiteId" value={websiteId} />
        <input type="hidden" name="runId" value={runId} />
        <input type="hidden" name="candidateId" value={candidateId} />
        <button
          type="submit"
          disabled={!canCurate || disabled}
          aria-label={`Approve / ${approveLabel}`}
          className="studio-button studio-button--primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {approveLabel}
        </button>
      </form>
      <form action={rejectAction}>
        <input type="hidden" name="websiteId" value={websiteId} />
        <input type="hidden" name="runId" value={runId} />
        <input type="hidden" name="candidateId" value={candidateId} />
        <button
          type="submit"
          disabled={!canCurate || disabled}
          aria-label={`Reject / ${rejectLabel}`}
          className="studio-button studio-button--danger disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {rejectLabel}
        </button>
      </form>
    </div>
  );
}

function ChangeSetReviewButtons({
  websiteId,
  runId,
  changeSetId,
  canReview,
  disabled,
  disabledReason,
}: {
  websiteId: string;
  runId: string;
  changeSetId: string;
  canReview: boolean;
  disabled: boolean;
  disabledReason: string | null;
}) {
  const isDisabled = !canReview || disabled;
  return (
    <div className="mt-3 flex flex-wrap items-end gap-2">
      <form action={approveChangeSet}>
        <input type="hidden" name="websiteId" value={websiteId} />
        <input type="hidden" name="runId" value={runId} />
        <input type="hidden" name="changeSetId" value={changeSetId} />
        <button
          type="submit"
          disabled={isDisabled}
          data-testid="growth-change-set-approve"
          aria-label="Approve / Aprobar propuesta del agente"
          className="studio-button studio-button--primary disabled:opacity-50 disabled:cursor-not-allowed"
          title={disabledReason ?? undefined}
        >
          Aprobar propuesta
        </button>
      </form>
      <form action={rejectChangeSet} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="websiteId" value={websiteId} />
        <input type="hidden" name="runId" value={runId} />
        <input type="hidden" name="changeSetId" value={changeSetId} />
        <label className="flex min-w-48 flex-col gap-1 text-xs">
          <span className="text-[var(--studio-text-muted)]">
            Motivo para pedir corrección
          </span>
          <input
            type="text"
            name="notes"
            maxLength={500}
            disabled={isDisabled}
            className="studio-input"
            placeholder="Falta evidencia, tono, enfoque..."
          />
        </label>
        <button
          type="submit"
          disabled={isDisabled}
          data-testid="growth-change-set-reject"
          aria-label="Reject / Rechazar propuesta del agente"
          className="studio-button studio-button--danger disabled:opacity-50 disabled:cursor-not-allowed"
          title={disabledReason ?? undefined}
        >
          Rechazar
        </button>
      </form>
      {disabledReason ? (
        <p className="basis-full text-xs text-[var(--studio-text-muted)]">
          {disabledReason}
        </p>
      ) : null}
    </div>
  );
}

function ChangeSetWorkCard({
  changeSet,
  websiteId,
  runId,
  role,
}: {
  changeSet: GrowthAgentChangeSet;
  websiteId: string;
  runId: string;
  role: GrowthRole;
}) {
  const statusLabel = labelFromMap(changeSet.status, CHANGE_SET_STATUS_LABELS);
  const typeLabel = labelFromMap(changeSet.change_type, CHANGE_TYPE_LABELS);
  const riskLabel = labelFromMap(changeSet.risk_level, RISK_LABELS);
  const requiredRole = changeSet.required_approval_role;
  const canReview = canReviewChangeSet(role, requiredRole);
  const reviewable = changeSetCanBeReviewed(changeSet.status);
  const references = compactList(
    changeSet.preview_payload.source_refs ?? changeSet.evidence.source_refs,
  );
  const followUps = normalizeFollowUpTasks(changeSet.preview_payload, 10);
  const createdBacklogItems = materializedBacklogItems(changeSet.evidence);
  const preview =
    previewText(changeSet.preview_payload, "preview_text") ??
    previewText(changeSet.after_snapshot, "title") ??
    previewText(changeSet.after_snapshot, "headline") ??
    previewText(changeSet.after_snapshot, "draft") ??
    previewText(changeSet.after_snapshot, "summary");
  const disabledReason = !canReview
    ? `Tu rol actual (${role}) no puede decidir esta propuesta. Se requiere ${humanizeToken(requiredRole)}.`
    : !reviewable
      ? "Esta propuesta ya fue cerrada."
      : null;

  return (
    <article
      data-testid="growth-change-set-card"
      className="studio-panel border border-[var(--studio-border)] p-4"
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-[var(--studio-text-muted)]">
            {typeLabel}
          </div>
          <h3 className="mt-1 text-base font-semibold text-[var(--studio-text)]">
            {changeSet.title}
          </h3>
          <p className="mt-2 text-sm text-[var(--studio-text)]">
            {changeSet.summary}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 md:justify-end">
          <StudioBadge
            tone={
              changeSet.status === "approved" ||
              changeSet.status === "applied" ||
              changeSet.status === "published"
                ? "success"
                : changeSet.status === "rejected" ||
                    changeSet.status === "blocked"
                  ? "danger"
                  : "warning"
            }
          >
            {statusLabel}
          </StudioBadge>
          <StudioBadge
            tone={
              changeSet.risk_level === "blocked" ||
              changeSet.risk_level === "high"
                ? "danger"
                : changeSet.risk_level === "medium"
                  ? "warning"
                  : "success"
            }
          >
            {riskLabel}
          </StudioBadge>
        </div>
      </div>

      {preview ? (
        <div className="mt-3 rounded-md bg-[var(--studio-surface-muted,theme(colors.zinc.50))] p-3">
          <div className="text-xs font-medium uppercase tracking-wide text-[var(--studio-text-muted)]">
            Vista previa para marketing
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--studio-text)]">
            {preview}
          </p>
        </div>
      ) : null}

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-md border border-[var(--studio-border)] p-3">
          <div className="text-xs text-[var(--studio-text-muted)]">
            Aprobación requerida
          </div>
          <div className="mt-1 text-sm font-medium">
            {humanizeToken(requiredRole)}
          </div>
        </div>
        <div className="rounded-md border border-[var(--studio-border)] p-3">
          <div className="text-xs text-[var(--studio-text-muted)]">
            Acción real
          </div>
          <div className="mt-1 text-sm font-medium">
            {createdBacklogItems.length > 0
              ? "Creó tarea de backlog"
              : "Solo deja evidencia y borrador"}
          </div>
        </div>
        <div className="rounded-md border border-[var(--studio-border)] p-3">
          <div className="text-xs text-[var(--studio-text-muted)]">
            Seguridad
          </div>
          <div className="mt-1 text-sm font-medium">
            No publica automáticamente
          </div>
        </div>
      </div>

      {references.length > 0 ? (
        <div className="mt-3">
          <div className="text-xs font-medium text-[var(--studio-text-muted)]">
            Referencias usadas
          </div>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-xs">
            {references.map((ref) => (
              <li key={ref} className="break-all">
                {ref}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {followUps.length > 0 ? (
        <div className="mt-3">
          <div className="text-xs font-medium text-[var(--studio-text-muted)]">
            Próximas tareas sugeridas al aprobar
          </div>
          <ul className="mt-2 space-y-2 text-xs">
            {followUps.map((task) => (
              <li
                key={task.key}
                className="rounded-md border border-[var(--studio-border)] bg-[var(--studio-surface-muted,theme(colors.zinc.50))] p-2"
              >
                <div className="font-medium text-[var(--studio-text)]">
                  {task.title}
                </div>
                <div className="mt-1 flex flex-wrap gap-2 text-[var(--studio-text-muted)]">
                  {task.lane ? (
                    <span>Responsable: {humanizeLane(task.lane)}</span>
                  ) : null}
                  {task.requiresHumanReview != null ? (
                    <span>
                      {task.requiresHumanReview
                        ? "Requiere revisión humana"
                        : "No requiere revisión humana"}
                    </span>
                  ) : null}
                </div>
                {task.instructions ? (
                  <p className="mt-1 text-[var(--studio-text)]">
                    {task.instructions}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {createdBacklogItems.length > 0 ? (
        <div
          className="mt-3 rounded-md border border-[var(--studio-border)] bg-[var(--studio-surface-muted,theme(colors.zinc.50))] p-3"
          data-testid="growth-change-set-created-backlog"
        >
          <div className="text-xs font-medium text-[var(--studio-text-muted)]">
            Trabajo creado en backlog
          </div>
          <ul className="mt-2 space-y-2 text-xs">
            {createdBacklogItems.map((item) => (
              <li
                key={item.id ?? item.title}
                className="flex flex-col gap-1 rounded-md bg-[var(--studio-surface)] p-2 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <div className="font-medium text-[var(--studio-text)]">
                    {item.title}
                  </div>
                  <div className="text-[var(--studio-text-muted)]">
                    {item.workType
                      ? labelFromMap(item.workType, WORK_TYPE_LABELS)
                      : "Backlog"}{" "}
                    · {item.status ? humanizeToken(item.status) : "creada"}
                  </div>
                </div>
                <Link
                  href={`/dashboard/${websiteId}/growth/backlog`}
                  className="text-xs font-medium underline"
                >
                  Ver en backlog
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ChangeSetReviewButtons
        websiteId={websiteId}
        runId={runId}
        changeSetId={changeSet.id}
        canReview={canReview}
        disabled={!reviewable}
        disabledReason={disabledReason}
      />
    </article>
  );
}

function HumanRunDecisionActions({
  websiteId,
  runId,
  status,
  canCurate,
  role,
  showNotes = true,
}: {
  websiteId: string;
  runId: string;
  status: AgentRunStatus;
  canCurate: boolean;
  role: string;
  showNotes?: boolean;
}) {
  const canDecide = canCurate && status === "review_required";
  const disabledReason = !canCurate
    ? `Tu rol actual (${role}) no puede aprobar ni rechazar. Se requiere curator o superior.`
    : status !== "review_required"
      ? "Este trabajo ya no está pendiente de revisión."
      : null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <form action={approveRun}>
          <input type="hidden" name="websiteId" value={websiteId} />
          <input type="hidden" name="runId" value={runId} />
          <button
            type="submit"
            disabled={!canDecide}
            aria-label="Approve / Aprobar trabajo del agente"
            className="studio-button studio-button--primary disabled:opacity-50 disabled:cursor-not-allowed"
            title={disabledReason ?? undefined}
          >
            Aprobar trabajo
          </button>
        </form>
        <form action={rejectRun} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="websiteId" value={websiteId} />
          <input type="hidden" name="runId" value={runId} />
          {showNotes ? (
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-[var(--studio-text-muted)]">
                Notas (opcional)
              </span>
              <input
                type="text"
                name="notes"
                maxLength={500}
                disabled={!canDecide}
                className="studio-input"
              />
            </label>
          ) : null}
          <button
            type="submit"
            disabled={!canDecide}
            aria-label="Reject / Rechazar trabajo del agente"
            className="studio-button studio-button--danger disabled:opacity-50 disabled:cursor-not-allowed"
            title={disabledReason ?? undefined}
          >
            Rechazar
          </button>
        </form>
      </div>
      {disabledReason ? (
        <p className="text-xs text-[var(--studio-text-muted)]">
          {disabledReason}
        </p>
      ) : null}
    </div>
  );
}

interface PageProps {
  params: Promise<{ websiteId: string; runId: string }>;
}

function EvidenceBlock({
  evidence,
}: {
  evidence: Record<string, unknown> | null;
}) {
  if (!evidence || Object.keys(evidence).length === 0) {
    return (
      <p className="text-xs text-[var(--studio-text-muted)]">
        Sin evidencia registrada.
      </p>
    );
  }
  return (
    <details className="text-xs">
      <summary className="cursor-pointer text-[var(--studio-text-muted)]">
        Mostrar evidencia ({Object.keys(evidence).length} keys)
      </summary>
      <pre className="mt-2 p-3 rounded-md bg-[var(--studio-surface)] overflow-x-auto">
        {JSON.stringify(evidence, null, 2)}
      </pre>
    </details>
  );
}

function EventTimeline({ events }: { events: GrowthAgentRunEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="text-xs text-[var(--studio-text-muted)]">
        Sin eventos registrados.
      </p>
    );
  }
  return (
    <ol className="space-y-2">
      {events.map((ev) => (
        <li
          key={ev.event_id}
          data-testid={`growth-run-event-row-${ev.event_id}`}
          className="studio-panel border border-[var(--studio-border)] p-3"
        >
          <div className="flex items-center gap-2 text-xs">
            <span className="font-mono text-[var(--studio-text-muted)]">
              {fmtDate(ev.occurred_at)}
            </span>
            <StudioBadge
              tone={
                ev.severity === "error"
                  ? "danger"
                  : ev.severity === "warn"
                    ? "warning"
                    : "neutral"
              }
            >
              {ev.event_type}
            </StudioBadge>
            {ev.severity !== "info" ? (
              <StudioBadge
                tone={ev.severity === "error" ? "danger" : "warning"}
              >
                {ev.severity}
              </StudioBadge>
            ) : null}
          </div>
          {ev.message ? <p className="text-sm mt-1">{ev.message}</p> : null}
          {ev.payload && Object.keys(ev.payload).length > 0 ? (
            <details className="mt-1 text-xs">
              <summary className="cursor-pointer text-[var(--studio-text-muted)]">
                payload ({Object.keys(ev.payload).length} keys)
              </summary>
              <pre className="mt-2 p-2 rounded bg-[var(--studio-surface)] overflow-x-auto">
                {JSON.stringify(ev.payload, null, 2)}
              </pre>
            </details>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

export default async function GrowthRunDetailPage({ params }: PageProps) {
  const { websiteId, runId } = await params;

  const auth = await requireGrowthRole(websiteId, "viewer");
  const accountId = auth.accountId;
  const { role } = auth;
  const canCurate = hasGrowthRole(role, "curator");

  const detail = await getAgentRunDetail(websiteId, runId, accountId);
  if (!detail) notFound();

  const {
    run,
    events,
    agentName,
    agreementForLane,
    hasArtifact,
    artifactPathTail,
    aiReview,
    metrics,
    toolCalls,
    replayCases,
    memories,
    skills,
    changeSets,
  } = detail;

  const evidence =
    run.evidence &&
    typeof run.evidence === "object" &&
    !Array.isArray(run.evidence)
      ? (run.evidence as Record<string, unknown>)
      : {};
  const risks = aiReview?.risks.length
    ? aiReview.risks
    : Array.isArray(evidence.risks)
      ? evidence.risks.map((risk) => String(risk ?? "")).filter(Boolean)
      : [];
  const evidenceSummary =
    typeof evidence.evidence_summary === "string"
      ? evidence.evidence_summary
      : null;
  const nextAction =
    typeof evidence.next_action === "string" ? evidence.next_action : null;
  const memoryCandidateCount =
    typeof evidence.memory_candidates_count === "number"
      ? evidence.memory_candidates_count
      : memories.length;
  const skillCandidateCount =
    typeof evidence.skill_update_candidates_count === "number"
      ? evidence.skill_update_candidates_count
      : skills.length;
  const workspaceTail = compactPathTail(run.workspace_path);
  const laneLabel = LANE_LABELS[run.lane] ?? humanizeToken(run.lane);
  const statusLabel = STATUS_LABELS[run.status] ?? humanizeToken(run.status);
  const decisionLabel = labelFromMap(
    aiReview?.recommendation ?? evidence.decision,
    DECISION_LABELS,
  );
  const allowedActionLabel = labelFromMap(
    evidence.allowed_action,
    ACTION_LABELS,
  );
  const marketingSummary = marketingEvidenceSummary(evidenceSummary, run.lane);
  const confidenceScore =
    aiReview?.confidence_score ??
    (typeof evidence.confidence === "number" ? evidence.confidence : null);
  const hasBlockingRisk =
    toolCalls.some((call) => !call.allowed) ||
    run.error_class != null ||
    metrics?.error_class != null ||
    (metrics?.exit_code != null && metrics.exit_code !== 0);
  const businessSafetyCopy =
    "No publica contenido, no cambia pauta, no activa experimentos y no modifica el sitio sin aprobación humana.";

  return (
    <StudioPage className="max-w-5xl">
      <Link
        href={`/dashboard/${websiteId}/growth/runs`}
        className="mb-3 inline-flex text-xs font-medium text-[var(--studio-text-muted)] underline"
      >
        ← Volver a Review Queue
      </Link>
      <StudioSectionHeader
        title={`Revisión del agente · ${laneLabel}`}
        subtitle={`Resultado preparado por ${agentName ?? "agente Growth OS"} para que marketing decida con evidencia.`}
        actions={
          <div className="flex items-center gap-2 whitespace-nowrap">
            <StudioBadge tone={STATUS_TONE[run.status]}>
              {statusLabel}
            </StudioBadge>
          </div>
        }
      />

      <section
        aria-labelledby="human-summary-heading"
        data-testid="growth-run-human-summary"
        className="mt-4 rounded-md border border-[var(--studio-border)] bg-[var(--studio-surface)] p-4"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2
              id="human-summary-heading"
              className="text-lg font-semibold text-[var(--studio-text)]"
            >
              Resumen para marketing
            </h2>
            <p className="mt-1 text-sm text-[var(--studio-text-muted)]">
              El agente preparó una recomendación. La decisión final sigue en
              manos del equipo humano.
            </p>
          </div>
          <StudioBadge tone={hasBlockingRisk ? "warning" : "success"}>
            {hasBlockingRisk ? "Revisar riesgos" : "Listo para revisar"}
          </StudioBadge>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <article className="rounded-md border border-[var(--studio-border)] p-3">
            <div className="text-xs uppercase tracking-wide text-[var(--studio-text-muted)]">
              Recomendación
            </div>
            <div className="mt-1 text-xl font-semibold text-[var(--studio-text)]">
              {decisionLabel}
            </div>
            <p className="mt-1 text-xs text-[var(--studio-text-muted)]">
              Confianza: {confidenceLabel(confidenceScore)}
            </p>
          </article>
          <article className="rounded-md border border-[var(--studio-border)] p-3">
            <div className="text-xs uppercase tracking-wide text-[var(--studio-text-muted)]">
              Acción sugerida
            </div>
            <div className="mt-1 text-xl font-semibold text-[var(--studio-text)]">
              {allowedActionLabel}
            </div>
            <p className="mt-1 text-xs text-[var(--studio-text-muted)]">
              Estado: {statusLabel}
            </p>
          </article>
          <article className="rounded-md border border-[var(--studio-border)] p-3">
            <div className="text-xs uppercase tracking-wide text-[var(--studio-text-muted)]">
              Seguridad
            </div>
            <div className="mt-1 text-xl font-semibold text-[var(--studio-text)]">
              Control humano
            </div>
            <p className="mt-1 text-xs text-[var(--studio-text-muted)]">
              {businessSafetyCopy}
            </p>
          </article>
        </div>

        {marketingSummary ? (
          <article className="mt-3 rounded-md bg-[var(--studio-surface-muted,theme(colors.zinc.50))] p-3">
            <h3 className="text-sm font-semibold">Qué encontró el agente</h3>
            <p className="mt-2 text-sm text-[var(--studio-text)]">
              {marketingSummary}
            </p>
          </article>
        ) : null}

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <article className="rounded-md bg-[var(--studio-surface-muted,theme(colors.zinc.50))] p-3">
            <h3 className="text-sm font-semibold">Riesgos a revisar</h3>
            {risks.length > 0 ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {risks.map((risk, index) => (
                  <li key={`${risk}-${index}`}>{risk}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-[var(--studio-text-muted)]">
                No se reportaron riesgos estructurados para este resultado.
              </p>
            )}
          </article>
          <article className="rounded-md bg-[var(--studio-surface-muted,theme(colors.zinc.50))] p-3">
            <h3 className="text-sm font-semibold">Siguiente paso sugerido</h3>
            <p className="mt-2 text-sm text-[var(--studio-text)]">
              {nextAction ??
                "Revisar la evidencia, decidir si se aprueba el trabajo y activar solo los aprendizajes útiles."}
            </p>
          </article>
        </div>

        <div className="mt-4 rounded-md border border-[var(--studio-border)] bg-[var(--studio-surface)] p-3">
          <div className="mb-2 text-sm font-semibold">Decisión del equipo</div>
          <HumanRunDecisionActions
            websiteId={websiteId}
            runId={run.run_id}
            status={run.status}
            canCurate={canCurate}
            role={role}
            showNotes={false}
          />
        </div>
      </section>

      <section
        aria-labelledby="run-change-sets-heading"
        className="space-y-3 mt-6"
        data-testid="growth-change-sets-panel"
      >
        <header>
          <h2
            id="run-change-sets-heading"
            className="text-base font-semibold text-[var(--studio-text)]"
          >
            Trabajo producido por el agente
          </h2>
          <p className="text-sm text-[var(--studio-text-muted)]">
            Cada propuesta se revisa por separado. Aprobar una propuesta deja
            trazabilidad humana, pero no publica contenido ni cambia pauta sin
            una acción posterior explícita.
          </p>
        </header>

        {changeSets.length > 0 ? (
          <div className="space-y-3">
            {changeSets.map((changeSet) => (
              <ChangeSetWorkCard
                key={changeSet.id}
                changeSet={changeSet}
                websiteId={websiteId}
                runId={run.run_id}
                role={role}
              />
            ))}
          </div>
        ) : (
          <div
            data-testid="growth-change-sets-empty-state"
            className="rounded-md border border-dashed border-[var(--studio-border)] bg-[var(--studio-surface)] p-4"
          >
            <h3 className="text-sm font-semibold">
              Este run todavía no tiene propuestas operables
            </h3>
            <p className="mt-1 text-sm text-[var(--studio-text-muted)]">
              Los próximos runs del executor deben generar change sets: blog,
              brief, ajuste SEO, transcreación, tarea técnica o paquete para
              aprobación. El resumen y el artifact siguen disponibles para
              auditoría.
            </p>
          </div>
        )}
      </section>

      <details className="mt-4 rounded-md border border-[var(--studio-border)] bg-[var(--studio-surface)] p-3 text-xs">
        <summary className="cursor-pointer font-medium text-[var(--studio-text)]">
          Ver datos técnicos de auditoría
        </summary>
        <dl className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
          <div>
            <dt className="text-[var(--studio-text-muted)]">Run</dt>
            <dd className="font-mono break-all">{run.run_id.slice(-12)}</dd>
          </div>
          <div>
            <dt className="text-[var(--studio-text-muted)]">Claim</dt>
            <dd className="font-mono break-all">{run.claim_id.slice(-12)}</dd>
          </div>
          <div>
            <dt className="text-[var(--studio-text-muted)]">Workspace</dt>
            <dd>
              <details className="font-mono">
                <summary className="cursor-pointer break-all text-[var(--studio-text)]">
                  {workspaceTail}
                </summary>
                <p className="mt-1 break-all text-[var(--studio-text-muted)]">
                  {run.workspace_path}
                </p>
              </details>
            </dd>
          </div>
          <div>
            <dt className="text-[var(--studio-text-muted)]">Intentos</dt>
            <dd>{run.attempts}</dd>
          </div>
          <div>
            <dt className="text-[var(--studio-text-muted)]">Inicio</dt>
            <dd>{fmtDate(run.started_at)}</dd>
          </div>
          <div>
            <dt className="text-[var(--studio-text-muted)]">Finalización</dt>
            <dd>{fmtDate(run.finished_at)}</dd>
          </div>
          <div>
            <dt className="text-[var(--studio-text-muted)]">Heartbeat</dt>
            <dd>{fmtDate(run.heartbeat_at)}</dd>
          </div>
          <div>
            <dt className="text-[var(--studio-text-muted)]">
              Umbral de acuerdo
            </dt>
            <dd>
              {agreementForLane != null ? agreementForLane.toFixed(2) : "—"}
            </dd>
          </div>
          {run.error_class ? (
            <div className="col-span-2 md:col-span-3">
              <dt className="text-[var(--studio-text-muted)]">Error</dt>
              <dd className="text-[var(--studio-danger)]">
                <span className="font-mono">{run.error_class}</span>
                {run.error_message ? <> — {run.error_message}</> : null}
              </dd>
            </div>
          ) : null}
        </dl>
      </details>

      {/* Approve / Reject */}
      <section aria-labelledby="run-review-heading" className="space-y-3 mt-6">
        <header>
          <h2
            id="run-review-heading"
            className="text-base font-semibold text-[var(--studio-text)]"
          >
            Decisión humana
          </h2>
          <p className="text-sm text-[var(--studio-text-muted)]">
            Aprueba solo si la recomendación es útil y segura para
            ColombiaTours. Rechaza si falta evidencia, hay riesgo de negocio o
            el resultado no es accionable.
          </p>
          {!canCurate ? (
            <p className="text-xs text-[var(--studio-text-muted)]">
              Tu rol actual ({role}) no puede aprobar/rechazar trabajo de
              agentes. Se requiere <code>curator</code> o superior.
            </p>
          ) : null}
        </header>
        <HumanRunDecisionActions
          websiteId={websiteId}
          runId={run.run_id}
          status={run.status}
          canCurate={canCurate}
          role={role}
        />
      </section>

      <section
        aria-labelledby="run-runtime-heading"
        className="space-y-3 mt-6"
        data-testid="growth-run-runtime-panel"
      >
        <header>
          <h2
            id="run-runtime-heading"
            className="text-base font-semibold text-[var(--studio-text)]"
          >
            Resultado operativo
          </h2>
          <p className="text-xs text-[var(--studio-text-muted)]">
            Datos que ayudan a decidir. El detalle técnico queda disponible para
            auditoría, pero la operación se revisa desde el resumen.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <article className="studio-panel border border-[var(--studio-border)] p-3">
            <div className="text-xs uppercase tracking-wide text-[var(--studio-text-muted)]">
              Recomendación
            </div>
            <div className="mt-1 font-semibold">{decisionLabel}</div>
            <p className="mt-1 text-xs text-[var(--studio-text-muted)]">
              Acción permitida: {allowedActionLabel}
            </p>
          </article>
          <article className="studio-panel border border-[var(--studio-border)] p-3">
            <div className="text-xs uppercase tracking-wide text-[var(--studio-text-muted)]">
              Calidad del resultado
            </div>
            <div className="mt-1 font-semibold">
              {metrics
                ? metrics.artifact_complete
                  ? "Resultado completo"
                  : "Resultado incompleto"
                : "Sin métrica"}
            </div>
            <p className="mt-1 text-xs text-[var(--studio-text-muted)]">
              Código técnico:{" "}
              <span className="font-mono">{metrics?.exit_code ?? "—"}</span>
            </p>
          </article>
          <article className="studio-panel border border-[var(--studio-border)] p-3">
            <div className="text-xs uppercase tracking-wide text-[var(--studio-text-muted)]">
              Aprendizaje propuesto
            </div>
            <div className="mt-1 font-semibold">
              {memoryCandidateCount} memoria · {skillCandidateCount} skill
            </div>
            <p className="mt-1 text-xs text-[var(--studio-text-muted)]">
              Solo borrador. Requiere aprobación humana.
            </p>
          </article>
        </div>
      </section>

      <section aria-labelledby="run-ledger-heading" className="space-y-3 mt-6">
        <header>
          <h2
            id="run-ledger-heading"
            className="text-base font-semibold text-[var(--studio-text)]"
          >
            Herramientas y evaluación
          </h2>
          <p className="text-xs text-[var(--studio-text-muted)]">
            Qué intentó usar el agente y cómo respondió la política de
            seguridad. Las acciones sensibles quedan bloqueadas o con aprobación
            humana.
          </p>
        </header>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <article className="studio-panel border border-[var(--studio-border)] p-3">
            <h3 className="text-sm font-semibold">
              Herramientas usadas ({toolCalls.length})
            </h3>
            {toolCalls.length > 0 ? (
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-left text-[var(--studio-text-muted)]">
                    <tr>
                      <th className="py-1 pr-2">Herramienta</th>
                      <th className="py-1 pr-2">Permiso</th>
                      <th className="py-1 pr-2">Resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {toolCalls.map((call, index) => (
                      <tr
                        key={`${call.tool}-${index}`}
                        className="border-t border-[var(--studio-border)]"
                      >
                        <td className="py-1 pr-2 font-mono">{call.tool}</td>
                        <td className="py-1 pr-2">
                          <StudioBadge
                            tone={call.allowed ? "success" : "warning"}
                          >
                            {call.allowed
                              ? "Permitida"
                              : "Bloqueada / requiere humano"}
                          </StudioBadge>
                          <div className="mt-1 text-[var(--studio-text-muted)]">
                            {humanizeToken(call.action_class)} ·{" "}
                            {humanizeToken(call.policy_verdict)}
                          </div>
                        </td>
                        <td className="py-1 pr-2">
                          {humanizeToken(call.result_status)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-2 text-xs text-[var(--studio-text-muted)]">
                No hay herramientas registradas para este run.
              </p>
            )}
          </article>
          <article className="studio-panel border border-[var(--studio-border)] p-3">
            <h3 className="text-sm font-semibold">
              Casos para evaluar al agente ({replayCases.length})
            </h3>
            {replayCases.length > 0 ? (
              <ul className="mt-2 space-y-2 text-xs">
                {replayCases.map((replay, index) => (
                  <li
                    key={`${replay.expected_decision}-${index}`}
                    className="rounded-md bg-[var(--studio-surface)] p-2"
                  >
                    <div className="font-medium">
                      Estado: {humanizeToken(replay.status)}
                    </div>
                    <div>
                      Decisión esperada:{" "}
                      {labelFromMap(replay.expected_decision, DECISION_LABELS)}
                    </div>
                    <div>
                      Acción esperada:{" "}
                      {labelFromMap(
                        replay.expected_allowed_action,
                        ACTION_LABELS,
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-[var(--studio-text-muted)]">
                No hay casos de evaluación guardados para este run.
              </p>
            )}
          </article>
        </div>
      </section>

      <section
        aria-labelledby="run-learning-heading"
        className="space-y-3 mt-6"
        data-testid="growth-run-learning-panel"
      >
        <header>
          <h2
            id="run-learning-heading"
            className="text-base font-semibold text-[var(--studio-text)]"
          >
            Aprendizajes propuestos
          </h2>
          <p className="text-xs text-[var(--studio-text-muted)]">
            El agente puede proponer memoria, skills o casos de evaluación. Nada
            se activa automáticamente: cada candidato se aprueba o rechaza
            individualmente.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <article className="studio-panel border border-[var(--studio-border)] p-3">
            <h3 className="text-sm font-semibold">
              Memorias ({memories.length})
            </h3>
            {memories.length > 0 ? (
              <ul className="mt-2 space-y-2 text-xs">
                {memories.map((memory) => (
                  <li
                    key={memory.id}
                    className="rounded-md bg-[var(--studio-surface)] p-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono">{memory.status}</span>
                      <span className="font-mono text-[var(--studio-text-muted)]">
                        {memory.memory_key.split(":").at(0)}
                      </span>
                    </div>
                    <p className="mt-1 text-[var(--studio-text)]">
                      {String(memory.content.memory ?? "Sin contenido.")}
                    </p>
                    <CandidateReviewButtons
                      websiteId={websiteId}
                      runId={run.run_id}
                      candidateId={memory.id}
                      canCurate={canCurate}
                      disabled={memory.status !== "draft"}
                      approveAction={approveMemoryCandidate}
                      rejectAction={rejectMemoryCandidate}
                      approveLabel="Aprobar memoria"
                      rejectLabel="Rechazar"
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-[var(--studio-text-muted)]">
                No hay memorias propuestas para este run.
              </p>
            )}
          </article>

          <article className="studio-panel border border-[var(--studio-border)] p-3">
            <h3 className="text-sm font-semibold">Skills ({skills.length})</h3>
            {skills.length > 0 ? (
              <ul className="mt-2 space-y-2 text-xs">
                {skills.map((skill) => (
                  <li
                    key={skill.id}
                    className="rounded-md bg-[var(--studio-surface)] p-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono">{skill.status}</span>
                      <span>v{skill.version}</span>
                    </div>
                    <p className="mt-1 font-medium">{skill.title}</p>
                    <p className="mt-1 text-[var(--studio-text-muted)]">
                      {String(skill.instructions.change ?? "Sin cambio.")}
                    </p>
                    <CandidateReviewButtons
                      websiteId={websiteId}
                      runId={run.run_id}
                      candidateId={skill.id}
                      canCurate={canCurate}
                      disabled={skill.status !== "draft"}
                      approveAction={approveSkillCandidate}
                      rejectAction={rejectSkillCandidate}
                      approveLabel="Aprobar skill"
                      rejectLabel="Rechazar"
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-[var(--studio-text-muted)]">
                No hay skills propuestas para este run.
              </p>
            )}
          </article>

          <article className="studio-panel border border-[var(--studio-border)] p-3">
            <h3 className="text-sm font-semibold">
              Evaluaciones ({replayCases.length})
            </h3>
            {replayCases.length > 0 ? (
              <ul className="mt-2 space-y-2 text-xs">
                {replayCases.map((replay) => (
                  <li
                    key={replay.id}
                    className="rounded-md bg-[var(--studio-surface)] p-2"
                  >
                    <div className="font-medium">
                      Estado: {humanizeToken(replay.status)}
                    </div>
                    <div>
                      Decisión esperada:{" "}
                      {labelFromMap(replay.expected_decision, DECISION_LABELS)}
                    </div>
                    <CandidateReviewButtons
                      websiteId={websiteId}
                      runId={run.run_id}
                      candidateId={replay.id}
                      canCurate={canCurate}
                      disabled={replay.status !== "candidate"}
                      approveAction={activateReplayCandidate}
                      rejectAction={rejectReplayCandidate}
                      approveLabel="Activar evaluación"
                      rejectLabel="Rechazar"
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-[var(--studio-text-muted)]">
                No hay evaluaciones propuestas para este run.
              </p>
            )}
          </article>
        </div>
      </section>

      {/* Artifact (path obfuscated) */}
      <section
        aria-labelledby="run-artifact-heading"
        className="space-y-2 mt-6"
      >
        <header>
          <h2
            id="run-artifact-heading"
            className="text-base font-semibold text-[var(--studio-text)]"
          >
            Archivo técnico del resultado
          </h2>
          <p className="text-xs text-[var(--studio-text-muted)]">
            Este archivo conserva el detalle completo para auditoría. El equipo
            de marketing normalmente no necesita abrirlo para decidir.
          </p>
        </header>
        {hasArtifact ? (
          <div className="flex flex-wrap items-center gap-3">
            <code className="text-xs font-mono text-[var(--studio-text-muted)]">
              …{artifactPathTail}
            </code>
            <form action={downloadArtifactAction}>
              <input type="hidden" name="websiteId" value={websiteId} />
              <input type="hidden" name="runId" value={run.run_id} />
              <button
                type="submit"
                className="studio-button studio-button--outline"
              >
                Descargar detalle técnico
              </button>
            </form>
            <span className="text-xs text-[var(--studio-text-muted)]">
              Ruta protegida. Solo se muestra una referencia corta.
            </span>
          </div>
        ) : (
          <p className="text-xs text-[var(--studio-text-muted)]">
            Este run no produjo archivo técnico.
          </p>
        )}
      </section>

      {/* Evidence */}
      <section
        aria-labelledby="run-evidence-heading"
        className="space-y-2 mt-6"
      >
        <header>
          <h2
            id="run-evidence-heading"
            className="text-base font-semibold text-[var(--studio-text)]"
          >
            Evidencia técnica
          </h2>
          <p className="text-xs text-[var(--studio-text-muted)]">
            Campo estructurado para auditoría y debugging. Úsalo si necesitas
            validar la fuente exacta del resultado.
          </p>
        </header>
        <EvidenceBlock evidence={run.evidence} />
      </section>

      {/* Events timeline (append-only) */}
      <section
        aria-labelledby="run-events-heading"
        data-testid="growth-run-events-panel"
        className="space-y-2 mt-6"
      >
        <header>
          <h2
            id="run-events-heading"
            className="text-base font-semibold text-[var(--studio-text)]"
          >
            Historial del run ({events.length})
          </h2>
          <p className="text-xs text-[var(--studio-text-muted)]">
            Registro de lo que ocurrió durante la ejecución. Es solo lectura: no
            se puede editar ni eliminar.
          </p>
        </header>
        <EventTimeline events={events} />
      </section>
    </StudioPage>
  );
}
