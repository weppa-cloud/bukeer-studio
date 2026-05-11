import { createHash, randomUUID } from "crypto";

import type {
  AgentLane,
  GrowthAgentChangeSetInsert,
  GrowthAutonomyActionClass,
  GrowthMarket,
  GrowthProfile,
  GrowthPublicationTargetTable,
} from "@bukeer/website-contract";
import { GrowthAgentChangeSetInsertSchema } from "@bukeer/website-contract";

import { promoteGrowthOpportunityCandidates } from "./candidate-promotion";
import { claimGrowthWorkItem } from "./work-item-claim";
import {
  finishGrowthRuntimeCycle,
  markGrowthRuntimeCycleRunning,
  recordGrowthRuntimeCycleStage,
  startGrowthRuntimeCycle,
  tryRecordGrowthSchedulerHeartbeat,
} from "./cycle-ledger";
import { runGrowthOrchestratorBrain } from "@/lib/growth/agentic/orchestrator-brain";
import { reconcileGrowthTaskSessions } from "@/lib/growth/agentic/task-session-reconciler";
import {
  claimGrowthAgentWakeup,
  expireStaleGrowthAgentWakeups,
} from "@/lib/growth/agentic/wakeup-queue";
import { discoverGrowthOpportunityCandidates } from "./candidate-discovery";
import { planContentPublication } from "./content-publication-adapter";
import { evaluateDueGrowthOutcomes } from "./outcome-evaluator";
import {
  executeGrowthPublicationJob,
  type PublicationExecutionPlan,
  type PublicationExecutionResult,
} from "./publication-executor";
import {
  planTechnicalRemediation,
  type TechnicalRemediationTargetTable,
} from "./technical-remediation-adapter";
import { planTranscreationMerge } from "./transcreation-merge-adapter";
import { buildGrowthRuntimeLearningSummary } from "./learning-summary";
import {
  evaluateProfileFreshnessGate,
  requirementsForAction,
} from "./profile-freshness-gate";
import { evaluateGrowthRuntimeQualityGate } from "./quality-gate";
import { refreshGrowthProfiles } from "./profile-refresh";
import { runClarityUxFrictionProfile } from "@/lib/growth/providers/clarity-profile-runner";
import {
  dataForSeoEvidenceGate,
  dataForSeoEvidenceReadFromRequirement,
  dataForSeoEvidenceRecordFromRequirement,
  dataForSeoFeatureForAction,
  dataForSeoRequirementFromSnapshot,
  readDataForSeoProviderSnapshot,
} from "./dataforseo-provider-profile";
import {
  actionClassForLane,
  asRecord,
  errorMessage,
  GROWTH_RUNTIME_VERSION,
  RUNTIME_LANES,
  type JsonRecord,
  type SupabaseLike,
} from "./runtime-common";

export interface RunGrowthOsProductionCycleOptions {
  supabase?: SupabaseLike;
  locale?: string;
  market?: GrowthMarket;
  environment?: "local" | "qa" | "staging" | "production";
  gitSha?: string | null;
  cycleWindow?: string | null;
  triggerSource?: "manual" | "scheduled" | "webhook" | "test";
  cycleKey?: string;
  dryRun?: boolean;
  allowLiveMutation?: boolean;
  enableAgenticBrain?: boolean;
  runtimeMode?: "executor" | "monitor";
  intervalMs?: number | null;
  certificationFixtureMode?: boolean;
  candidateLimit?: number;
  promotionLimit?: number;
  claimLimitPerLane?: number;
  lanes?: AgentLane[];
  workspacePath?: string;
  schedulerMetadata?: JsonRecord;
  now?: Date;
}

export interface RunGrowthOsProductionCycleResult {
  cycleId: string;
  cycleKey: string;
  status: "completed" | "failed";
  dryRun: boolean;
  summary: JsonRecord;
  stageResults: JsonRecord;
}

interface ClaimedRun {
  claimed: true;
  workItem: JsonRecord;
  run: JsonRecord;
}

const RUNTIME_HARD_BLOCKED_ACTIONS = new Set<GrowthAutonomyActionClass>([
  "paid_mutation",
  "experiment_activation",
  "outreach_send",
]);

const RUNTIME_FORBIDDEN_SURFACE_PATTERNS = [
  /paid/i,
  /price/i,
  /pricing/i,
  /payment/i,
  /payments/i,
  /reservation/i,
  /reservations/i,
  /availability/i,
  /crm/i,
  /outreach/i,
];

async function shouldRunDailyClarityProfile({
  supabase,
  accountId,
  websiteId,
  now,
}: {
  supabase: SupabaseLike;
  accountId: string;
  websiteId: string;
  now: Date;
}): Promise<boolean> {
  const freshAfter = new Date(now.getTime() - 20 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("growth_profile_runs")
    .select("id")
    .eq("account_id", accountId)
    .eq("website_id", websiteId)
    .eq("provider", "clarity")
    .eq("profile_id", "clarity_ux_friction_v1")
    .eq("run_status", "completed")
    .eq("freshness_status", "PASS")
    .gte("created_at", freshAfter)
    .limit(1);
  if (error) {
    console.warn("clarity freshness lookup failed", error.message);
    return false;
  }
  return (data ?? []).length === 0;
}

const DATAFORSEO_GOVERNED_ACTIONS = new Set<GrowthAutonomyActionClass>([
  "content_publish",
  "transcreation_merge",
  "safe_apply",
]);

function targetTableForAction(
  actionClass: GrowthAutonomyActionClass,
): GrowthPublicationTargetTable | null {
  if (actionClass === "safe_apply") return "website_sections";
  if (actionClass === "content_publish") return "website_blog_posts";
  if (actionClass === "transcreation_merge") return "seo_transcreation_jobs";
  return null;
}

function changeTypeForLane(lane: AgentLane): GrowthAgentChangeSetInsert["change_type"] {
  if (lane === "technical_remediation") return "technical_smoke_result";
  if (lane === "transcreation") return "locale_serp_packet";
  if (lane === "content_creator") return "content_brief_create";
  if (lane === "content_curator") return "content_quality_review";
  return "research_packet";
}

function approvalRoleForLane(
  lane: AgentLane,
): GrowthAgentChangeSetInsert["required_approval_role"] {
  if (lane === "technical_remediation") return "technical_owner";
  if (lane === "orchestrator") return "growth_operator";
  return "curator";
}

async function selectRows(
  supabase: SupabaseLike,
  table: string,
  accountId: string,
  websiteId: string,
  limit = 200,
) {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("account_id", accountId)
    .eq("website_id", websiteId)
    .limit(limit);
  if (error) throw new Error(`${table} lookup failed: ${error.message}`);
  return (data ?? []) as JsonRecord[];
}

async function policyForAction({
  supabase,
  accountId,
  websiteId,
  lane,
  actionClass,
}: {
  supabase: SupabaseLike;
  accountId: string;
  websiteId: string;
  lane: AgentLane;
  actionClass: GrowthAutonomyActionClass;
}) {
  const { data, error } = await supabase
    .from("growth_autonomy_policies")
    .select("*")
    .eq("account_id", accountId)
    .eq("website_id", websiteId)
    .eq("lane", lane)
    .eq("action_class", actionClass)
    .limit(1);
  if (error) throw new Error(`policy lookup failed: ${error.message}`);
  return Array.isArray(data) ? data[0] ?? null : data ?? null;
}

async function countPublicationJobs({
  supabase,
  accountId,
  websiteId,
  policyId,
  since,
}: {
  supabase: SupabaseLike;
  accountId: string;
  websiteId: string;
  policyId: string | null;
  since: Date;
}) {
  if (!policyId) return 0;
  const { count, error } = await supabase
    .from("growth_publication_jobs")
    .select("*", { count: "exact", head: true })
    .eq("account_id", accountId)
    .eq("website_id", websiteId)
    .eq("policy_id", policyId)
    .gte("created_at", since.toISOString());
  if (error) throw new Error(`publication cap lookup failed: ${error.message}`);
  return count ?? 0;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

function textValue(record: JsonRecord, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function wordCount(value: string | null): number {
  return value?.split(/\s+/).filter(Boolean).length ?? 0;
}

function nestedRecord(record: JsonRecord, ...keys: string[]): JsonRecord {
  for (const key of keys) {
    const value = asRecord(record[key]);
    if (Object.keys(value).length > 0) return value;
  }
  return {};
}

function articleRecordFromEvidence(evidence: JsonRecord): JsonRecord {
  return firstRecord(
    evidence.article,
    asRecord(asRecord(evidence.adapter_input).article),
    asRecord(asRecord(evidence.runtime_adapter).article),
    asRecord(asRecord(evidence.publication_adapter).article),
  );
}

function validateActionPayload(
  actionClass: GrowthAutonomyActionClass,
  evidence: JsonRecord,
  certificationFixtureMode: boolean,
): { pass: boolean; checks: string[]; failures: string[] } {
  const failures: string[] = [];
  const checks = ["action_payload_contract"];

  if (actionClass === "content_publish") {
    const article = articleRecordFromEvidence(evidence);
    const content = textValue(article, "content");
    if (!textValue(article, "title")) failures.push("missing_article_title");
    if (!textValue(article, "slug") && !textValue(evidence, "article_slug")) {
      failures.push("missing_article_slug");
    }
    if (!textValue(article, "seo_title")) failures.push("missing_article_seo_title");
    if (!textValue(article, "seo_description")) {
      failures.push("missing_article_seo_description");
    }
    if (!certificationFixtureMode && wordCount(content) < 300) {
      failures.push("missing_full_article_payload");
    }
  }

  if (actionClass === "transcreation_merge") {
    const transcreation = firstRecord(
      evidence.adapter_input,
      evidence.runtime_adapter,
      evidence.publication_adapter,
      nestedRecord(evidence, "transcreation", "transcreation_merge", "signal_payload"),
    );
    const payload = asRecord(transcreation.payload);
    const quality = asRecord(transcreation.quality);
    const sourceLocale = textValue(transcreation, "source_locale");
    const targetLocale = textValue(transcreation, "target_locale");
    if (!textValue(transcreation, "transcreation_job_id")) {
      failures.push("missing_transcreation_job_id");
    }
    if (!sourceLocale || !targetLocale || sourceLocale === targetLocale) {
      failures.push("invalid_transcreation_locale_pair");
    }
    if (!textValue(transcreation, "source_entity_id")) {
      failures.push("missing_transcreation_source_entity_id");
    }
    if (!textValue(transcreation, "page_type")) failures.push("missing_transcreation_page_type");
    if (!textValue(payload, "meta_title")) failures.push("missing_transcreation_meta_title");
    if (!textValue(payload, "meta_desc")) failures.push("missing_transcreation_meta_desc");
    if (!payload.body_content && !payload.body_overlay_v2) {
      failures.push("missing_transcreation_body_payload");
    }
    if (quality.passed !== true) failures.push("transcreation_quality_not_passed");
    if (!Array.isArray(transcreation.glossary_terms) || transcreation.glossary_terms.length === 0) {
      failures.push("missing_glossary_or_tm_context");
    }
  }

  if (actionClass === "safe_apply") {
    const technical = firstRecord(
      evidence.adapter_input,
      evidence.runtime_adapter,
      evidence.publication_adapter,
      nestedRecord(evidence, "technical", "safe_apply", "signal_payload"),
    );
    const patch = asRecord(technical.patch);
    if (!textValue(technical, "target_table")) failures.push("missing_safe_apply_target_table");
    if (!textValue(technical, "target_id")) failures.push("missing_safe_apply_target_id");
    if (Object.keys(patch).length === 0) failures.push("missing_safe_apply_patch");
    if (Object.keys(asRecord(technical.before_row)).length === 0) {
      failures.push("missing_safe_apply_before_row");
    }
    if (
      Object.keys(asRecord(technical.rollback_payload)).length === 0 &&
      Object.keys(asRecord(technical.before_row)).length === 0
    ) {
      failures.push("missing_safe_apply_rollback_payload");
    }
  }

  return { pass: failures.length === 0, checks, failures };
}

function firstRecord(...values: unknown[]): JsonRecord {
  for (const value of values) {
    const record = asRecord(value);
    if (Object.keys(record).length > 0) return record;
  }
  return {};
}

function optionalRecord(value: JsonRecord): JsonRecord | undefined {
  return Object.keys(value).length > 0 ? value : undefined;
}

function isTechnicalRemediationTargetTable(
  value: string | null,
): value is TechnicalRemediationTargetTable {
  return (
    value === "website_pages" ||
    value === "website_sections" ||
    value === "product_seo_overrides"
  );
}

function firstText(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function firstBoolean(...values: unknown[]): boolean | null {
  for (const value of values) {
    if (typeof value === "boolean") return value;
  }
  return null;
}

function firstNumber(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function hasForbiddenRuntimeSurface(value: string): boolean {
  return RUNTIME_FORBIDDEN_SURFACE_PATTERNS.some((pattern) =>
    pattern.test(value),
  );
}

function forbiddenRuntimeSurfaceFailures({
  actionClass,
  targetTable,
  patch,
  evidence,
}: {
  actionClass: GrowthAutonomyActionClass;
  targetTable?: string | null;
  patch?: JsonRecord | null;
  evidence?: JsonRecord | null;
}): string[] {
  const failures: string[] = [];
  if (RUNTIME_HARD_BLOCKED_ACTIONS.has(actionClass)) {
    failures.push(`hard_blocked_action:${actionClass}`);
  }
  if (targetTable && hasForbiddenRuntimeSurface(targetTable)) {
    failures.push(`hard_blocked_target:${targetTable}`);
  }
  for (const field of Object.keys(patch ?? {})) {
    if (hasForbiddenRuntimeSurface(field)) {
      failures.push(`hard_blocked_field:${field}`);
    }
  }
  const forbiddenSurfaces = evidence?.forbidden_surfaces;
  if (Array.isArray(forbiddenSurfaces)) {
    for (const surface of forbiddenSurfaces) {
      if (typeof surface === "string" && hasForbiddenRuntimeSurface(surface)) {
        failures.push(`hard_blocked_surface:${surface}`);
      }
    }
  }
  return Array.from(new Set(failures));
}

function dataForSeoRuntimeEvidenceFailure(
  actionClass: GrowthAutonomyActionClass,
  evidence: JsonRecord,
): string | null {
  if (!DATAFORSEO_GOVERNED_ACTIONS.has(actionClass)) return null;

  const dataForSeoEvidence = asRecord(evidence.dataforseo_evidence);
  if (dataForSeoEvidence.required !== true) {
    return "dataforseo_evidence_missing";
  }

  const verdict = dataForSeoEvidenceGate(dataForSeoEvidence);
  return verdict.allowed ? null : (verdict.reason ?? "dataforseo_evidence_blocked");
}

function growthCorrelationRuntimeFailure(
  actionClass: GrowthAutonomyActionClass,
  evidence: JsonRecord,
): string | null {
  if (!DATAFORSEO_GOVERNED_ACTIONS.has(actionClass)) return null;
  const correlation = asRecord(evidence.correlation);
  const verdict = String(correlation.dedupe_verdict ?? "");
  if (!correlation.correlation_key || !correlation.evidence_fingerprint) {
    return "growth_evidence_correlation_missing";
  }
  if (verdict === "skip" || verdict === "block") {
    return `growth_evidence_${verdict}:${String(correlation.reason ?? "anti_rework_gate")}`;
  }
  return null;
}

function stableRuntimeEvidenceHash(value: unknown): string {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex")}`;
}

function runtimeEntityKey({
  actionClass,
  workItem,
  evidence,
}: {
  actionClass: GrowthAutonomyActionClass;
  workItem: JsonRecord;
  evidence: JsonRecord;
}): string {
  const adapterInput = asRecord(evidence.adapter_input);
  const targetTable =
    typeof adapterInput.target_table === "string"
      ? adapterInput.target_table
      : targetTableForAction(actionClass);
  const targetId =
    typeof adapterInput.target_id === "string"
      ? adapterInput.target_id
      : typeof workItem.source_id === "string"
        ? workItem.source_id
        : String(workItem.id ?? "unknown");
  const targetPath =
    typeof adapterInput.target_path === "string" && adapterInput.target_path.trim()
      ? `:${adapterInput.target_path.trim()}`
      : "";
  return `${targetTable}:${targetId}${targetPath}`;
}

function runtimeCorrelationFromProviderEvidence({
  websiteId,
  actionClass,
  workItem,
  evidence,
  evidenceFingerprint,
}: {
  websiteId: string;
  actionClass: GrowthAutonomyActionClass;
  workItem: JsonRecord;
  evidence: JsonRecord;
  evidenceFingerprint: string;
}): JsonRecord {
  const entityKey = runtimeEntityKey({ actionClass, workItem, evidence });
  const actionKey = `${actionClass}:${entityKey}`;
  return {
    entity_key: entityKey,
    action_key: actionKey,
    correlation_key: `${websiteId}:runtime_provider_evidence:${actionKey}`,
    evidence_fingerprint: evidenceFingerprint,
    dedupe_verdict: "new",
    reason: "runtime_dataforseo_cache_enriched",
    previous_refs: [],
    materially_new_evidence: false,
  };
}

async function enrichRuntimeProviderEvidence({
  supabase,
  accountId,
  websiteId,
  actionClass,
  workItem,
  evidence,
  now,
}: {
  supabase: SupabaseLike;
  accountId: string;
  websiteId: string;
  actionClass: GrowthAutonomyActionClass;
  workItem: JsonRecord;
  evidence: JsonRecord;
  now: Date;
}): Promise<JsonRecord> {
  if (!DATAFORSEO_GOVERNED_ACTIONS.has(actionClass)) return evidence;

  const existingDataForSeoEvidence = asRecord(evidence.dataforseo_evidence);
  const existingCorrelation = asRecord(evidence.correlation);
  const hasRequiredProviderEvidence =
    existingDataForSeoEvidence.required === true;
  const hasCorrelation = Boolean(
    existingCorrelation.correlation_key &&
      existingCorrelation.evidence_fingerprint,
  );
  if (hasRequiredProviderEvidence && hasCorrelation) return evidence;

  const signalText = [
    workItem.title,
    workItem.intent,
    evidence.intent,
    evidence.source_signal,
    JSON.stringify(evidence).slice(0, 4000),
  ]
    .filter(Boolean)
    .join(" ");
  const featureProfile = dataForSeoFeatureForAction(actionClass, signalText);
  const snapshot = await readDataForSeoProviderSnapshot({
    supabase,
    accountId,
    websiteId,
    now,
  });
  const requirement = dataForSeoRequirementFromSnapshot({
    required: true,
    featureProfile,
    snapshot,
  });
  const evidenceRead = dataForSeoEvidenceReadFromRequirement(requirement);
  const enrichedEvidence: JsonRecord = { ...evidence };

  if (!hasRequiredProviderEvidence) {
    enrichedEvidence.dataforseo_evidence =
      dataForSeoEvidenceRecordFromRequirement(requirement);
    const reads = Array.isArray(enrichedEvidence.provider_evidence_reads)
      ? enrichedEvidence.provider_evidence_reads
      : [];
    enrichedEvidence.provider_evidence_reads = [...reads, evidenceRead];
  }

  if (!hasCorrelation && dataForSeoEvidenceGate(enrichedEvidence.dataforseo_evidence).allowed) {
    const fingerprint = stableRuntimeEvidenceHash({
      provider: "dataforseo",
      dataforseo_evidence_fingerprint: evidenceRead.evidence_fingerprint,
      adapter_input: asRecord(enrichedEvidence.adapter_input),
      success_metric: enrichedEvidence.success_metric ?? null,
      baseline: enrichedEvidence.baseline ?? asRecord(enrichedEvidence.adapter_input).baseline ?? null,
    });
    enrichedEvidence.correlation = runtimeCorrelationFromProviderEvidence({
      websiteId,
      actionClass,
      workItem,
      evidence: enrichedEvidence,
      evidenceFingerprint: fingerprint,
    });
  }

  return enrichedEvidence;
}

function withAdditionalSmokeFailures<T extends PublicationExecutionPlan>(
  plan: T,
  failures: string[],
): T {
  if (failures.length === 0) return plan;
  const smoke = {
    pass: false,
    checks: Array.from(new Set([...plan.smoke.checks, "runtime_hard_blocks"])),
    failures: Array.from(new Set([...plan.smoke.failures, ...failures])),
  };
  return {
    ...plan,
    smoke,
    job: {
      ...plan.job,
      status: "blocked",
      smoke_result: smoke,
      evidence: {
        ...asRecord(plan.job.evidence),
        runtime_hard_blocks: failures,
      },
    },
  };
}

async function selectTargetRow({
  supabase,
  table,
  websiteId,
  targetId,
}: {
  supabase: SupabaseLike;
  table: string;
  websiteId: string;
  targetId: string;
}): Promise<JsonRecord> {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("id", targetId)
    .eq("website_id", websiteId)
    .limit(1);
  if (error) throw new Error(`${table} target lookup failed: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  return asRecord(row);
}

function buildRuntimeArticle({
  workItem,
  evidence,
  slug,
  certificationFixtureMode,
}: {
  workItem: JsonRecord;
  evidence: JsonRecord;
  slug: string;
  certificationFixtureMode: boolean;
}) {
  const article = articleRecordFromEvidence(evidence);
  const title = textValue(article, "title") ?? textValue(evidence, "article_title");
  if (!title) throw new Error("content_publish payload missing article.title");
  const excerpt = textValue(article, "excerpt") ?? String(workItem.operator_summary ?? title);
  const seoTitle = textValue(article, "seo_title");
  if (!seoTitle) throw new Error("content_publish payload missing article.seo_title");
  const seoDescription = textValue(article, "seo_description");
  if (!seoDescription) {
    throw new Error("content_publish payload missing article.seo_description");
  }
  const existingContent = textValue(article, "content");
  if (!certificationFixtureMode && wordCount(existingContent) < 300) {
    throw new Error("content_publish payload missing full article content");
  }
  const content =
    existingContent && wordCount(existingContent) >= 300
      ? existingContent
      : certificationFixtureMode
        ? [
          "# Como planear un viaje por Colombia con cultura y naturaleza",
          "",
          "Colombia combina ciudades historicas, montanas andinas, costas caribeñas, selvas, pueblos patrimoniales y una escena gastronomica diversa. Para que un viaje sea realmente valioso, conviene diseñarlo alrededor del ritmo del viajero, la temporada, la conectividad entre regiones y el tipo de experiencia que quiere priorizar.",
          "",
          "Un buen punto de partida es definir una ruta principal. Bogota funciona bien para historia, museos y gastronomia. El Eje Cafetero permite conectar paisaje, cultura cafetera y hoteles rurales. Medellin aporta vida urbana, transformacion social y excursiones cercanas. Cartagena y la costa Caribe agregan patrimonio, playas, islas y experiencias nauticas. La Amazonia, los Llanos y el Pacifico requieren mas preparacion, pero pueden elevar mucho la percepcion de autenticidad del viaje.",
          "",
          "Tambien es clave balancear tiempos. Un itinerario demasiado cargado suele reducir la calidad de la experiencia. Para viajes de siete dias, conviene elegir dos regiones. Para viajes de diez a doce dias, tres regiones pueden funcionar si los traslados estan bien resueltos. Para programas de dos semanas, se puede combinar cultura, naturaleza y descanso sin sacrificar profundidad.",
          "",
          "La experiencia mejora cuando cada etapa tiene un objetivo claro: llegada y contexto, inmersion local, actividad de naturaleza, descanso, y cierre con una experiencia memorable. Ese orden ayuda a que el viajero entienda el destino y no sienta que solo esta acumulando traslados.",
          "",
          "Growth OS recomienda medir este contenido por señales organicas y de funnel: impresiones, clics, solicitudes calificadas y consultas que mencionen rutas culturales o naturaleza. Si el articulo atrae busquedas pero no genera leads, la siguiente iteracion debe reforzar llamadas a planificacion, enlaces internos hacia paquetes relevantes y preguntas frecuentes.",
          "",
          "Este articulo no modifica precios, disponibilidad, reservas, pagos ni campañas pagas. Su funcion es apoyar descubrimiento organico y educar al viajero antes de una conversacion comercial.",
        ].join("\n")
        : existingContent ?? "";

  return {
    title,
    slug,
    content,
    excerpt,
    seo_title: seoTitle,
    seo_description: seoDescription,
    seo_keywords: Array.isArray(article.seo_keywords)
      ? article.seo_keywords.filter((keyword): keyword is string => typeof keyword === "string")
      : ["viajar por colombia", "turismo cultural colombia", "naturaleza colombia"],
    featured_image: textValue(article, "featured_image"),
    featured_image_alt:
      textValue(article, "featured_image_alt") ??
      "Paisaje de Colombia para viaje cultural y de naturaleza",
    category_id: textValue(article, "category_id"),
    translation_group_id:
      textValue(article, "translation_group_id") ?? randomUUID(),
  };
}

async function uniqueBlogSlug({
  supabase,
  websiteId,
  preferredSlug,
  fallbackSeed,
}: {
  supabase: SupabaseLike;
  websiteId: string;
  preferredSlug: string;
  fallbackSeed: string;
}) {
  const base = slugify(preferredSlug) || `growth-os-${fallbackSeed.slice(0, 8)}`;
  const { data, error } = await supabase
    .from("website_blog_posts")
    .select("id")
    .eq("website_id", websiteId)
    .eq("slug", base)
    .limit(1);
  if (error) throw new Error(`blog slug lookup failed: ${error.message}`);
  const exists = Array.isArray(data) && data.length > 0;
  return exists ? `${base}-${fallbackSeed.slice(0, 8)}` : base;
}

async function assertNoDuplicateBlogArticle({
  supabase,
  websiteId,
  title,
}: {
  supabase: SupabaseLike;
  websiteId: string;
  title: string;
}) {
  const { data, error } = await supabase
    .from("website_blog_posts")
    .select("id,title,slug,status")
    .eq("website_id", websiteId)
    .eq("title", title)
    .limit(1);
  if (error) throw new Error(`blog duplicate lookup failed: ${error.message}`);
  const duplicate = Array.isArray(data) ? asRecord(data[0]) : asRecord(data);
  if (!duplicate.id) return;
  throw new Error(
    `duplicate_content_title:${String(duplicate.id)}:${String(duplicate.slug ?? "")}`,
  );
}

async function assertNoDuplicateTranscreationTarget({
  supabase,
  websiteId,
  workItemId,
  targetPath,
}: {
  supabase: SupabaseLike;
  websiteId: string;
  workItemId: string;
  targetPath: string;
}) {
  const { data, error } = await supabase
    .from("growth_publication_jobs")
    .select("id,work_item_id,status,target_path")
    .eq("website_id", websiteId)
    .eq("action_class", "transcreation_merge")
    .eq("target_path", targetPath)
    .in("status", ["applying", "smoke_passed", "dry_run_ready"])
    .limit(1);
  if (error) {
    throw new Error(`transcreation duplicate lookup failed: ${error.message}`);
  }
  const duplicate = Array.isArray(data) ? asRecord(data[0]) : asRecord(data);
  if (!duplicate.id || duplicate.work_item_id === workItemId) return;
  throw new Error(
    `duplicate_transcreation_target:${String(duplicate.id)}:${targetPath}`,
  );
}

async function buildPublicationExecutionPlan({
  supabase,
  accountId,
  websiteId,
  locale,
  market,
  workItem,
  changeSetId,
  policyId,
  actionClass,
  qualityMode,
  certificationFixtureMode,
  now,
}: {
  supabase: SupabaseLike;
  accountId: string;
  websiteId: string;
  locale: string;
  market: GrowthMarket;
  workItem: JsonRecord;
  changeSetId: string;
  policyId: string | null;
  actionClass: GrowthAutonomyActionClass;
  qualityMode: "dry_run" | "live" | "blocked";
  certificationFixtureMode: boolean;
  now: Date;
}): Promise<PublicationExecutionPlan | null> {
  const evidence = asRecord(workItem.evidence);
  const adapterInput = firstRecord(
    evidence.adapter_input,
    evidence.runtime_adapter,
    evidence.publication_adapter,
    actionClass === "safe_apply"
      ? nestedRecord(evidence, "technical", "safe_apply")
      : {},
    actionClass === "transcreation_merge"
      ? nestedRecord(evidence, "transcreation", "transcreation_merge")
      : {},
    evidence.signal_payload,
    evidence,
  );

  if (actionClass === "safe_apply") {
    const mutation = firstRecord(adapterInput.mutation, adapterInput.safe_apply);
    const rawTargetTable = firstText(
      adapterInput.target_table,
      mutation.target_table,
      adapterInput.table,
    );
    const targetId = firstText(
      adapterInput.target_id,
      mutation.target_id,
      adapterInput.entity_id,
      workItem.source_id,
    );
    const patch = firstRecord(
      adapterInput.patch,
      adapterInput.after_patch,
      mutation.patch,
    );

    if (
      !isTechnicalRemediationTargetTable(rawTargetTable) ||
      !targetId ||
      Object.keys(patch).length === 0
    ) {
      return null;
    }
    const targetTable = rawTargetTable;

    const beforeRow = firstRecord(
      adapterInput.before_row,
      adapterInput.before_snapshot,
      mutation.before_row,
      mutation.before_snapshot,
    );
    const resolvedBeforeRow =
      Object.keys(beforeRow).length > 0
        ? beforeRow
        : await selectTargetRow({
            supabase,
            table: targetTable,
            websiteId,
            targetId,
          });

    const plan = planTechnicalRemediation({
      accountId,
      websiteId,
      locale,
      market,
      workItemId: String(workItem.id),
      changeSetId,
      policyId,
      targetTable,
      targetId,
      targetPath: firstText(adapterInput.target_path, mutation.target_path),
      beforeRow: resolvedBeforeRow,
      patch,
      baseline: firstRecord(adapterInput.baseline, evidence.baseline),
      successMetric:
        firstText(adapterInput.success_metric, evidence.success_metric) ??
        undefined,
      now,
      live: qualityMode === "live",
    });

    return withAdditionalSmokeFailures(
      plan,
      forbiddenRuntimeSurfaceFailures({
        actionClass,
        targetTable,
        patch,
        evidence: adapterInput,
      }),
    );
  }

  if (actionClass === "transcreation_merge") {
    const transcreation = firstRecord(
      adapterInput.transcreation,
      adapterInput.merge,
    );
    const payload = firstRecord(
      adapterInput.payload,
      adapterInput.payload_v2,
      transcreation.payload,
      transcreation.payload_v2,
    );
    const transcreationJobId = firstText(
      adapterInput.transcreation_job_id,
      adapterInput.transcreationJobId,
      transcreation.transcreation_job_id,
      adapterInput.target_id,
    );
    const sourceEntityId = firstText(
      adapterInput.source_entity_id,
      adapterInput.sourceEntityId,
      adapterInput.page_id,
      transcreation.source_entity_id,
    );
    const metaTitle = firstText(
      payload.meta_title,
      payload.metaTitle,
      payload.title,
      adapterInput.meta_title,
    );
    const metaDesc = firstText(
      payload.meta_desc,
      payload.meta_description,
      payload.metaDescription,
      adapterInput.meta_desc,
    );

    if (!transcreationJobId || !sourceEntityId || !metaTitle || !metaDesc) {
      return null;
    }

    const pageType =
      firstText(adapterInput.page_type, adapterInput.pageType, transcreation.page_type) ??
      "page";
    const normalizedPageType =
      pageType === "blog" || pageType === "destination" ? pageType : "page";
    const sourceLocale =
      firstText(
        adapterInput.source_locale,
        adapterInput.sourceLocale,
        transcreation.source_locale,
      ) ?? locale;
    const targetLocale =
      firstText(
        adapterInput.target_locale,
        adapterInput.targetLocale,
        transcreation.target_locale,
      ) ?? locale;
    const targetPath = `${normalizedPageType}:${targetLocale}:${sourceEntityId}`;
    await assertNoDuplicateTranscreationTarget({
      supabase,
      websiteId,
      workItemId: String(workItem.id),
      targetPath,
    });

    const plan = planTranscreationMerge({
      accountId,
      websiteId,
      sourceLocale,
      targetLocale,
      market,
      workItemId: String(workItem.id),
      changeSetId,
      policyId,
      transcreationJobId,
      localizedVariantId: firstText(
        adapterInput.localized_variant_id,
        adapterInput.localizedVariantId,
        transcreation.localized_variant_id,
      ),
      pageType: normalizedPageType,
      sourceEntityId,
      targetEntityId: firstText(
        adapterInput.target_entity_id,
        adapterInput.targetEntityId,
        transcreation.target_entity_id,
      ),
      beforeVariant: firstRecord(
        adapterInput.before_variant,
        adapterInput.before_snapshot,
        transcreation.before_variant,
      ),
      payload: {
        title: firstText(payload.title, adapterInput.title) ?? undefined,
        slug: firstText(payload.slug, adapterInput.slug) ?? undefined,
        meta_title: metaTitle,
        meta_desc: metaDesc,
        h1: firstText(payload.h1, adapterInput.h1) ?? undefined,
        body_content:
          firstText(payload.body_content, payload.bodyContent) ?? undefined,
        body_overlay_v2: optionalRecord(
          firstRecord(
            payload.body_overlay_v2,
            payload.bodyOverlayV2,
            adapterInput.body_overlay_v2,
          ),
        ),
      },
      quality: {
        score: firstNumber(
          nestedRecord(adapterInput, "quality").score,
          adapterInput.quality_score,
        ) ?? undefined,
        passed:
          firstBoolean(
            nestedRecord(adapterInput, "quality").passed,
            adapterInput.quality_passed,
          ) ?? undefined,
        issues: Array.isArray(nestedRecord(adapterInput, "quality").issues)
          ? (nestedRecord(adapterInput, "quality").issues as unknown[]).filter(
              (issue): issue is string => typeof issue === "string",
            )
          : undefined,
      },
      baseline: firstRecord(adapterInput.baseline, evidence.baseline),
      successMetric:
        firstText(adapterInput.success_metric, evidence.success_metric) ??
        undefined,
      now,
      live: qualityMode === "live",
    });

    return withAdditionalSmokeFailures(
      plan,
      forbiddenRuntimeSurfaceFailures({
        actionClass,
        targetTable: plan.job.target_table,
        evidence: adapterInput,
      }),
    );
  }

  if (actionClass !== "content_publish") return null;
  const articlePayload = articleRecordFromEvidence(evidence);
  const proposedTitle =
    textValue(articlePayload, "title") ?? textValue(evidence, "article_title");
  if (proposedTitle) {
    await assertNoDuplicateBlogArticle({
      supabase,
      websiteId,
      title: proposedTitle,
    });
  }
  const preferredSlug =
    textValue(articlePayload, "slug") ??
    textValue(evidence, "article_slug") ??
    textValue(evidence, "slug") ??
    String(workItem.title ?? "growth-os-colombia");
  const slug = await uniqueBlogSlug({
    supabase,
    websiteId,
    preferredSlug,
    fallbackSeed: String(workItem.id ?? randomUUID()),
  });
  const plan = planContentPublication({
    accountId,
    websiteId,
    locale,
    market,
    workItemId: String(workItem.id),
    changeSetId,
    policyId,
    lane: String(workItem.lane) === "content_curator" ? "content_curator" : "content_creator",
    article: buildRuntimeArticle({
      workItem,
      evidence,
      slug,
      certificationFixtureMode,
    }),
    baseline: optionalRecord(firstRecord(adapterInput.baseline, evidence.baseline)),
    successMetric: textValue(evidence, "success_metric") ?? undefined,
    now,
    live: qualityMode === "live",
    certificationFixtureMode,
  });

  return withAdditionalSmokeFailures(
    plan,
    forbiddenRuntimeSurfaceFailures({
      actionClass,
      targetTable: plan.job.target_table,
      evidence: adapterInput,
    }),
  );
}

async function tryBuildPublicationExecutionPlan(
  input: Parameters<typeof buildPublicationExecutionPlan>[0],
): Promise<{ plan: PublicationExecutionPlan | null; failures: string[] }> {
  try {
    return {
      plan: await buildPublicationExecutionPlan(input),
      failures: [],
    };
  } catch (error) {
    return {
      plan: null,
      failures: [`adapter_plan_error:${errorMessage(error)}`],
    };
  }
}

async function createExecutionBridgeChangeSet({
  supabase,
  accountId,
  websiteId,
  locale,
  market,
  cycleId,
  claimed,
  dryRun,
  allowLiveMutation,
  certificationFixtureMode,
  now,
}: {
  supabase: SupabaseLike;
  accountId: string;
  websiteId: string;
  locale: string;
  market: GrowthMarket;
  cycleId: string;
  claimed: ClaimedRun;
  dryRun: boolean;
  allowLiveMutation: boolean;
  certificationFixtureMode: boolean;
  now: Date;
}) {
  const workItem = claimed.workItem;
  const run = claimed.run;
  const lane = String(workItem.lane) as AgentLane;
  const actionClass = String(
    workItem.allowed_action_class ?? actionClassForLane(lane),
  ) as GrowthAutonomyActionClass;
  const profiles = (await selectRows(
    supabase,
    "growth_profiles",
    accountId,
    websiteId,
  )) as GrowthProfile[];
  const freshness = evaluateProfileFreshnessGate({
    profiles,
    requirements: requirementsForAction(actionClass),
    now,
  });
  const policy = await policyForAction({
    supabase,
    accountId,
    websiteId,
    lane,
    actionClass,
  });
  const policyId = typeof policy?.id === "string" ? policy.id : null;
  const dailyUsed = await countPublicationJobs({
    supabase,
    accountId,
    websiteId,
    policyId,
    since: addDays(now, -1),
  });
  const weeklyUsed = await countPublicationJobs({
    supabase,
    accountId,
    websiteId,
    policyId,
    since: addDays(now, -7),
  });

  const evidence = await enrichRuntimeProviderEvidence({
    supabase,
    accountId,
    websiteId,
    actionClass,
    workItem,
    evidence: asRecord(workItem.evidence),
    now,
  });
  const workItemForExecution = { ...workItem, evidence };
  const beforeSnapshot = {
    work_item_id: workItem.id,
    status: workItem.status,
    source_table: workItem.source_table ?? null,
    source_id: workItem.source_id ?? null,
  };
  const rollbackPayload = {
    work_item_id: workItem.id,
    restore_status: "ready",
  };
  const evaluationDate = now.toISOString().slice(0, 10);
  const provisionalChangeSetId = randomUUID();
  const provisionalQualityMode =
    allowLiveMutation && policy?.dry_run_only !== true ? "live" : "dry_run";
  const payloadContract = validateActionPayload(
    actionClass,
    evidence,
    certificationFixtureMode,
  );
  const provisionalPlanResult = await tryBuildPublicationExecutionPlan({
    supabase,
    accountId,
    websiteId,
    locale,
    market,
    workItem: workItemForExecution,
    changeSetId: provisionalChangeSetId,
    policyId,
    actionClass,
    qualityMode: provisionalQualityMode,
    certificationFixtureMode,
    now,
  });
  const provisionalPlan = provisionalPlanResult.plan;
  const missingPlanFailures = provisionalPlan
    ? payloadContract.failures
    : [
        "missing_runtime_adapter_plan",
        ...payloadContract.failures,
        ...provisionalPlanResult.failures,
        ...forbiddenRuntimeSurfaceFailures({
          actionClass,
          targetTable: targetTableForAction(actionClass),
          evidence,
        }),
      ];
  const adapterSmoke = provisionalPlan?.smoke ?? {
    pass: false,
    checks: ["runtime_adapter_plan", ...payloadContract.checks],
    failures: missingPlanFailures,
  };
  const dataForSeoEvidenceFailure = dataForSeoRuntimeEvidenceFailure(
    actionClass,
    evidence,
  );
  const growthCorrelationFailure = growthCorrelationRuntimeFailure(
    actionClass,
    evidence,
  );
  const qualitySmoke = {
    pass:
      adapterSmoke.pass &&
      payloadContract.pass &&
      dataForSeoEvidenceFailure === null &&
      growthCorrelationFailure === null,
    checks: Array.from(
      new Set([
        ...adapterSmoke.checks,
        ...payloadContract.checks,
        "dataforseo_evidence_gate",
        "growth_evidence_correlation_gate",
      ]),
    ),
    failures: Array.from(
      new Set([
        ...adapterSmoke.failures,
        ...payloadContract.failures,
        ...(dataForSeoEvidenceFailure
          ? [`provider_evidence:${dataForSeoEvidenceFailure}`]
          : []),
        ...(growthCorrelationFailure
          ? [`provider_evidence:${growthCorrelationFailure}`]
          : []),
      ]),
    ),
  };
  const adapterTargetTable =
    provisionalPlan?.job.target_table ?? targetTableForAction(actionClass);
  const adapterBeforeSnapshot =
    provisionalPlan?.job.before_snapshot ?? beforeSnapshot;
  const adapterRollbackPayload =
    provisionalPlan?.job.rollback_payload ?? rollbackPayload;
  const adapterRollbackExpectation = asRecord(
    asRecord(provisionalPlan?.job.evidence).rollback_expectation,
  );
  const adapterBaseline = provisionalPlan?.job.baseline ?? firstRecord(evidence.baseline);
  const adapterSuccessMetric =
    provisionalPlan?.job.success_metric ??
    (typeof evidence.success_metric === "string" ? evidence.success_metric : null);
  const adapterEvaluationDate = provisionalPlan?.job.evaluation_date ?? evaluationDate;
  const adapterOutcomes = provisionalPlan?.outcomes ?? [];
  const adapterEvaluationWindow =
    typeof adapterOutcomes[0]?.evaluation_window === "string"
      ? adapterOutcomes[0].evaluation_window
      : null;
  const quality = evaluateGrowthRuntimeQualityGate({
    lane,
    actionClass,
    targetTable: adapterTargetTable,
    targetId: provisionalPlan?.job.target_id ?? null,
    targetPath: provisionalPlan?.job.target_path ?? null,
    riskScore: Number(workItem.risk_score ?? 50),
    riskLevel: String(workItem.risk_level ?? "medium"),
    policy,
    freshness,
    dailyUsed,
    weeklyUsed,
    beforeSnapshot: adapterBeforeSnapshot,
    rollbackPayload: adapterRollbackPayload,
    rollbackExpectation: adapterRollbackExpectation,
    smoke: qualitySmoke,
    baseline: adapterBaseline,
    successMetric: adapterSuccessMetric,
    evaluationWindow: adapterEvaluationWindow,
    evaluationDate: adapterEvaluationDate,
    outcomes: adapterOutcomes,
    allowLiveMutation,
  });

  const shouldAutoExecute = quality.allowed && quality.executionMode === "live";
  let publicationResult: PublicationExecutionResult | null = null;
  const liveChangeType = shouldAutoExecute
    ? actionClass === "content_publish"
      ? "publish_packet_prepare"
      : actionClass === "transcreation_merge"
        ? "transcreation_merge_readiness"
        : changeTypeForLane(lane)
    : changeTypeForLane(lane);
  const changeSet = GrowthAgentChangeSetInsertSchema.parse({
    account_id: accountId,
    website_id: websiteId,
    locale,
    market,
    run_id: run.run_id,
    source_table: "growth_work_items",
    source_id: String(workItem.id),
    agent_lane: lane,
    change_type: liveChangeType,
    status: quality.allowed ? "proposed" : "blocked",
    title: String(workItem.title ?? "Growth runtime work item").slice(0, 240),
    summary: quality.allowed
      ? shouldAutoExecute
        ? "Runtime live execution bridge prepared an adapter-backed mutation."
        : "Runtime dry-run execution bridge prepared a reviewable work product."
      : `Runtime quality gate blocked execution: ${quality.reasons.join(", ")}`,
    dedupe_key: `runtime-cycle:${cycleId}:${workItem.id}`,
    before_snapshot: adapterBeforeSnapshot,
    after_snapshot: {
      dry_run: dryRun,
      live_mutation_requested: allowLiveMutation,
      quality_gate: quality,
      adapter_target_table: adapterTargetTable,
      adapter_plan_ready: Boolean(provisionalPlan),
    },
    preview_payload: {
      bridge: provisionalPlan ? "adapter_execution" : "stub",
      production_mutation_performed: false,
      next_action: shouldAutoExecute
        ? "execute_publication_job"
        : provisionalPlan
          ? "publication_job_review"
          : "human_review",
      publication_job: provisionalPlan
        ? {
            target_table: provisionalPlan.job.target_table,
            target_id: provisionalPlan.job.target_id,
            job_mode: provisionalPlan.job.job_mode,
            status: provisionalPlan.job.status,
            smoke_result: provisionalPlan.smoke,
            outcome_count: provisionalPlan.outcomes.length,
          }
        : null,
    },
    evidence: {
      cycle_id: cycleId,
      live_gated: shouldAutoExecute,
      autonomy_action_class: actionClass,
      paid_blocked: true,
      hard_blocked_surfaces: [
        "paid",
        "pricing",
        "payments",
        "reservations",
        "availability",
        "CRM",
        "outreach",
      ],
      quality_gate: quality,
      freshness_snapshot: freshness.snapshot,
      work_item_evidence: evidence,
      adapter_plan: provisionalPlan
        ? {
            target_table: provisionalPlan.job.target_table,
            target_id: provisionalPlan.job.target_id,
            idempotency_key: provisionalPlan.job.idempotency_key,
            smoke_result: provisionalPlan.smoke,
            outcomes: provisionalPlan.outcomes.map((outcome) => ({
              success_metric: outcome.success_metric,
              evaluation_window: outcome.evaluation_window,
              evaluation_date: outcome.evaluation_date,
            })),
          }
        : null,
    },
    risk_level: String(workItem.risk_level ?? "medium"),
    requires_human_review: !shouldAutoExecute,
    required_approval_role: approvalRoleForLane(lane),
    parent_change_set_id: null,
    created_backlog_item_id: null,
    approved_by: null,
    approved_at: null,
    applied_by: null,
    applied_at: null,
    published_by: null,
    published_at: null,
  });

  if (!dryRun) {
    const { data, error } = await supabase
      .from("growth_agent_change_sets")
      .upsert(changeSet, {
        onConflict: "account_id,website_id,run_id,change_type,dedupe_key",
      })
      .select("id")
      .limit(1);
    if (error) throw new Error(`execution bridge change set failed: ${error.message}`);
    const row = Array.isArray(data) ? data[0] : data;
    const changeSetId = typeof row?.id === "string" ? row.id : null;
    let publicationPlan: PublicationExecutionPlan | null = null;

    if (quality.allowed && changeSetId) {
      const publicationPlanResult = await tryBuildPublicationExecutionPlan({
        supabase,
        accountId,
        websiteId,
        locale,
        market,
        workItem: workItemForExecution,
        changeSetId,
        policyId: quality.policyId,
        actionClass,
        qualityMode: quality.executionMode,
        certificationFixtureMode,
        now,
      });
      publicationPlan = publicationPlanResult.plan;
      if (publicationPlan) {
        publicationResult = await executeGrowthPublicationJob({
          supabase,
          plan: publicationPlan,
        });
      }
    }

    await supabase
      .from("growth_agent_runs")
      .update({
        status: quality.allowed
          ? publicationResult?.applied
            ? "completed"
            : "review_required"
          : "failed",
        finished_at: now.toISOString(),
        evidence: {
          ...asRecord(run.evidence),
          cycle_id: cycleId,
          quality_gate: quality,
          change_set_id: changeSetId,
          publication_job_id: publicationResult?.publicationJobId ?? null,
          publication_result: publicationResult,
        },
        updated_at: now.toISOString(),
      })
      .eq("run_id", run.run_id)
      .eq("website_id", websiteId);

    if (!publicationResult?.applied) {
      await supabase
        .from("growth_work_items")
        .update({
          status: quality.allowed ? "review_needed" : "blocked",
          change_set_id: changeSetId,
          progress_label: quality.allowed
            ? publicationPlan
              ? "Runtime dry-run ready for review"
              : "Runtime adapter not available; review needed"
            : "Runtime quality gate blocked",
          updated_at: now.toISOString(),
        })
        .eq("id", workItem.id)
        .eq("website_id", websiteId);
    }
  }

  return {
    workItemId: String(workItem.id),
    runId: String(run.run_id),
    lane,
    actionClass,
    quality,
    publicationResult,
  };
}

async function runExecutionBridge({
  supabase,
  accountId,
  websiteId,
  locale,
  market,
  cycleId,
  workspacePath,
  claimLimitPerLane,
  lanes,
  dryRun,
  allowLiveMutation,
  certificationFixtureMode,
  now,
}: {
  supabase: SupabaseLike;
  accountId: string;
  websiteId: string;
  locale: string;
  market: GrowthMarket;
  cycleId: string;
  workspacePath: string;
  claimLimitPerLane: number;
  lanes?: AgentLane[];
  dryRun: boolean;
  allowLiveMutation: boolean;
  certificationFixtureMode: boolean;
  now: Date;
}) {
  const claims = [];
  const executions = [];
  for (const lane of lanes && lanes.length > 0 ? lanes : RUNTIME_LANES) {
    for (let i = 0; i < claimLimitPerLane; i += 1) {
      const claim = await claimGrowthWorkItem({
        supabase,
        accountId,
        websiteId,
        lane,
        workspacePath,
        claimId: randomUUID(),
        now,
      });
      claims.push({ lane, ...claim });
      if (!claim.claimed) break;
      const execution = await createExecutionBridgeChangeSet({
        supabase,
        accountId,
        websiteId,
        locale,
        market,
        cycleId,
        claimed: claim,
        dryRun,
        allowLiveMutation,
        certificationFixtureMode,
        now,
      });
      executions.push(execution);
    }
  }
  return {
    claims,
    executions,
    claimed: claims.filter((claim) => claim.claimed).length,
    blocked: executions.filter((execution) => !execution.quality.allowed).length,
    applied: executions.filter((execution) => execution.publicationResult?.applied)
      .length,
  };
}

export async function runGrowthOsProductionCycle(
  accountId: string,
  websiteId: string,
  options: RunGrowthOsProductionCycleOptions = {},
): Promise<RunGrowthOsProductionCycleResult> {
  if (!options.supabase) {
    throw new Error("runGrowthOsProductionCycle requires a Supabase client.");
  }

  const supabase = options.supabase;
  const now = options.now ?? new Date();
  const locale = options.locale ?? "es-CO";
  const market = options.market ?? "CO";
  const dryRun = options.dryRun ?? false;
  const allowLiveMutation = options.allowLiveMutation ?? false;
  const runtimeMode = options.runtimeMode ?? "executor";
  const monitorOnly = runtimeMode === "monitor";
  const enableAgenticBrain = monitorOnly
    ? false
    : (options.enableAgenticBrain ?? true);
  const candidateLimit = monitorOnly ? 0 : (options.candidateLimit ?? 25);
  const promotionLimit = monitorOnly ? 0 : (options.promotionLimit ?? 10);
  const claimLimitPerLane = monitorOnly ? 0 : (options.claimLimitPerLane ?? 1);
  const runtimeLanes = monitorOnly ? [] : (options.lanes ?? RUNTIME_LANES);
  const certificationFixtureMode = options.certificationFixtureMode ?? false;
  const cycleKey =
    options.cycleKey ??
    `growth-runtime:${websiteId}:${now.toISOString().replace(/[:.]/g, "-")}`;
  let cycle = await startGrowthRuntimeCycle({
    supabase,
    accountId,
    websiteId,
    locale,
    market,
    cycleKey,
    cycleWindow: options.cycleWindow ?? null,
    environment: options.environment ?? "production",
    gitSha: options.gitSha ?? null,
    triggerSource: options.triggerSource ?? "manual",
    dryRun,
    options: {
      candidate_limit: options.candidateLimit ?? 25,
      effective_candidate_limit: candidateLimit,
      promotion_limit: options.promotionLimit ?? 10,
      effective_promotion_limit: promotionLimit,
      claim_limit_per_lane: options.claimLimitPerLane ?? 1,
      effective_claim_limit_per_lane: claimLimitPerLane,
      lanes: runtimeLanes,
      allow_live_mutation: allowLiveMutation,
      enable_agentic_brain: enableAgenticBrain,
      certification_fixture_mode: certificationFixtureMode,
      runtime_mode: runtimeMode,
      runtime_version: GROWTH_RUNTIME_VERSION,
    },
    now,
  });
  await tryRecordGrowthSchedulerHeartbeat({
    supabase,
    accountId,
    websiteId,
    locale,
    market,
    status: "healthy",
    lastCycleId: cycle.id,
    lastCycleStatus: "started",
    lastMessage: "Growth OS production cycle started.",
    gitSha: options.gitSha ?? null,
    intervalMs: options.intervalMs ?? null,
    metadata: {
      trigger_source: options.triggerSource ?? "manual",
      allow_live_mutation: allowLiveMutation,
      enable_agentic_brain: enableAgenticBrain,
      claim_limit_per_lane: claimLimitPerLane,
      lanes: runtimeLanes,
      runtime_mode: runtimeMode,
      ...(options.schedulerMetadata ?? {}),
    },
    now,
  });
  cycle = await markGrowthRuntimeCycleRunning({ supabase, cycle });

  try {
    const profileRefresh = await refreshGrowthProfiles({
      supabase,
      accountId,
      websiteId,
      locale,
      market,
      cycleId: cycle.id,
      dryRun,
      now,
    });
    cycle = await recordGrowthRuntimeCycleStage({
      supabase,
      cycle,
      result: {
        stage: "profile_refresh",
        status: "completed",
        counts: {
          profiles: profileRefresh.profiles.length,
          inserted_or_updated: profileRefresh.insertedOrUpdated,
        },
        details: { profile_types: profileRefresh.profileTypes },
      },
    });

    const clarityShouldRun = !dryRun
      ? await shouldRunDailyClarityProfile({
          supabase,
          accountId,
          websiteId,
          now,
        })
      : false;
    const clarityProfile = clarityShouldRun
      ? await runClarityUxFrictionProfile({
          supabase,
          accountId,
          websiteId,
          locale,
          market,
          dryRun,
          now,
        })
      : null;
    cycle = await recordGrowthRuntimeCycleStage({
      supabase,
      cycle,
      result: {
        stage: "provider_profile_refresh",
        status: clarityProfile?.status === "failed" ? "completed" : "completed",
        counts: {
          clarity_profiles: clarityShouldRun ? 1 : 0,
          rows: clarityProfile?.rowCount ?? 0,
        },
        details: {
          clarity_ux_friction_v1: clarityProfile ?? {
            status: "skipped",
            reason: dryRun ? "dry_run" : "fresh_profile_within_20h",
          },
        },
      },
    });

    const expiredBrainWakeups = enableAgenticBrain
      ? await expireStaleGrowthAgentWakeups({
          supabase,
          accountId,
          websiteId,
          lane: "orchestrator",
          now,
        })
      : 0;
    const claimedBrainWakeup = enableAgenticBrain
      ? await claimGrowthAgentWakeup({
          supabase,
          accountId,
          websiteId,
          lane: "orchestrator",
          now,
        })
      : null;
    const brain = enableAgenticBrain
      ? await runGrowthOrchestratorBrain({
          supabase,
          accountId,
          websiteId,
          cycleId: cycle.id,
          locale,
          market,
          wakeup: claimedBrainWakeup,
          source: options.triggerSource === "webhook" ? "data_refresh" : "timer",
          materialize: !dryRun,
          now,
        })
      : null;
    cycle = await recordGrowthRuntimeCycleStage({
      supabase,
      cycle,
      result: {
        stage: "orchestrator_brain",
        status: enableAgenticBrain ? "completed" : "skipped",
        counts: {
          decisions: brain ? 1 : 0,
          candidates_created: brain?.createdCandidateIds.length ?? 0,
          task_sessions_created: brain?.createdTaskSessionIds.length ?? 0,
          blocked: brain?.blockedReasons.length ?? 0,
        },
        ids: {
          decision_ids: brain ? [brain.decisionId] : [],
          context_snapshot_ids: brain ? [brain.contextSnapshotId] : [],
          wakeup_ids: brain?.wakeupId ? [brain.wakeupId] : [],
          candidate_ids: brain?.createdCandidateIds ?? [],
          task_session_ids: brain?.createdTaskSessionIds ?? [],
        },
        details: {
          enabled: enableAgenticBrain,
          claimed_wakeup_id: claimedBrainWakeup?.id ?? null,
          expired_wakeup_count: expiredBrainWakeups,
          materialized: brain?.materialized ?? false,
          decision_type: brain?.decisionType ?? null,
          confidence: brain?.confidence ?? null,
          blocked_reasons: brain?.blockedReasons ?? [],
        },
      },
    });

    const discovery = await discoverGrowthOpportunityCandidates({
      supabase,
      accountId,
      websiteId,
      locale,
      market,
      cycleId: cycle.id,
      limit: candidateLimit,
      dryRun,
      now,
    });
    cycle = await recordGrowthRuntimeCycleStage({
      supabase,
      cycle,
      result: {
        stage: "candidate_discovery",
        status: "completed",
        counts: {
          candidates: discovery.candidates.length,
          inserted_or_updated: discovery.insertedOrUpdated,
        },
        ids: { signal_fact_ids: discovery.signalFactIds },
      },
    });

    const promoted = dryRun
      ? []
      : await promoteGrowthOpportunityCandidates({
          supabase,
          accountId,
          websiteId,
          limit: promotionLimit,
          now,
        });
    cycle = await recordGrowthRuntimeCycleStage({
      supabase,
      cycle,
      result: {
        stage: "work_item_promotion",
        status: dryRun ? "skipped" : "completed",
        counts: {
          promoted: promoted.filter((item) => item.promoted).length,
          blocked: promoted.filter((item) => !item.promoted).length,
        },
        details: { dry_run: dryRun, promoted },
      },
    });

    const execution = dryRun
      ? { claims: [], executions: [], claimed: 0, blocked: 0, applied: 0 }
      : await runExecutionBridge({
          supabase,
          accountId,
          websiteId,
          locale,
          market,
          cycleId: cycle.id,
          workspacePath:
            options.workspacePath ??
            `/workspaces/${accountId}/${websiteId}/growth-runtime`,
          claimLimitPerLane,
          lanes: runtimeLanes,
          dryRun,
          allowLiveMutation,
          certificationFixtureMode,
          now,
        });
    const taskSessionReconciliation = dryRun
      ? { completed: 0, blocked: 0, expired: 0, linkedSessionIds: [] }
      : await reconcileGrowthTaskSessions({
          supabase,
          accountId,
          websiteId,
          taskSessionIds: brain?.createdTaskSessionIds ?? [],
          executions: execution.executions,
          cycleId: cycle.id,
          now,
        });
    cycle = await recordGrowthRuntimeCycleStage({
      supabase,
      cycle,
      result: {
        stage: "execution_bridge",
        status: dryRun ? "skipped" : "completed",
        counts: {
          claimed: execution.claimed,
          blocked: execution.blocked,
          applied: execution.applied,
        },
        details: {
          dry_run: dryRun,
          allow_live_mutation: allowLiveMutation,
          claims: execution.claims,
          executions: execution.executions,
          task_session_reconciliation: taskSessionReconciliation,
        },
      },
    });

    const outcomes = await evaluateDueGrowthOutcomes({
      supabase,
      accountId,
      websiteId,
      dryRun,
      now,
    });
    cycle = await recordGrowthRuntimeCycleStage({
      supabase,
      cycle,
      result: {
        stage: "outcome_evaluation",
        status: "completed",
        counts: {
          evaluated: outcomes.evaluated.length,
          updated: outcomes.updated,
        },
        details: { evaluated: outcomes.evaluated },
      },
    });

    const learning = await buildGrowthRuntimeLearningSummary({
      supabase,
      accountId,
      websiteId,
    });
    cycle = await recordGrowthRuntimeCycleStage({
      supabase,
      cycle,
      result: {
        stage: "learning_summary",
        status: "completed",
        counts: {
          lanes: learning.lanes.length,
          replay_promotions: learning.replayDecisions.filter(
            (decision) => decision.shouldPromoteReplay,
          ).length,
          skill_updates: learning.replayDecisions.filter(
            (decision) => decision.shouldProposeSkillUpdate,
          ).length,
        },
        details: learning,
      },
    });

    const summary = {
      runtime_version: GROWTH_RUNTIME_VERSION,
      runtime_mode: runtimeMode,
      dry_run: dryRun,
      allow_live_mutation: allowLiveMutation,
      profile_count: profileRefresh.profiles.length,
      candidate_count: discovery.candidates.length,
      promoted_count: promoted.filter((item) => item.promoted).length,
      claimed_count: execution.claimed,
      evaluated_outcomes: outcomes.evaluated.length,
      learning_recommendations: learning.recommendations,
      production_mutation_performed: execution.applied > 0,
    };
    const finished = await finishGrowthRuntimeCycle({
      supabase,
      cycle,
      status: "completed",
      summary,
      now,
    });
    await tryRecordGrowthSchedulerHeartbeat({
      supabase,
      accountId,
      websiteId,
      locale,
      market,
      status: "healthy",
      lastCycleId: finished.id,
      lastCycleStatus: "completed",
      lastMessage: "Growth OS production cycle completed.",
      gitSha: options.gitSha ?? null,
      intervalMs: options.intervalMs ?? null,
      metadata: {
        ...summary,
        ...(options.schedulerMetadata ?? {}),
      },
      now,
    });
    return {
      cycleId: finished.id,
      cycleKey,
      status: "completed",
      dryRun,
      summary,
      stageResults: finished.stage_results,
    };
  } catch (error) {
    const summary = {
      runtime_version: GROWTH_RUNTIME_VERSION,
      runtime_mode: runtimeMode,
      dry_run: dryRun,
      production_mutation_performed: false,
      error: errorMessage(error),
    };
    const failed = await finishGrowthRuntimeCycle({
      supabase,
      cycle,
      status: "failed",
      summary,
      error,
      now,
    });
    await tryRecordGrowthSchedulerHeartbeat({
      supabase,
      accountId,
      websiteId,
      locale,
      market,
      status: "failed",
      lastCycleId: failed.id,
      lastCycleStatus: "failed",
      lastMessage: errorMessage(error),
      gitSha: options.gitSha ?? null,
      intervalMs: options.intervalMs ?? null,
      metadata: {
        ...summary,
        ...(options.schedulerMetadata ?? {}),
      },
      now,
    });
    return {
      cycleId: failed.id,
      cycleKey,
      status: "failed",
      dryRun,
      summary,
      stageResults: failed.stage_results,
    };
  }
}
