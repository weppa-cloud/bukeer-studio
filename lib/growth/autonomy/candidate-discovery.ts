import type {
  AgentLane,
  GrowthAutonomyActionClass,
  GrowthMarket,
  GrowthOpportunityCandidateInsert,
  GrowthOpportunityCandidateType,
  GrowthOutcomeEvaluationWindow,
  GrowthProfile,
  GrowthProfileType,
} from "@bukeer/website-contract";

import { createHash } from "crypto";

import {
  evaluateProfileFreshnessGate,
  requirementsForAction,
  scoreOpportunityCandidate,
} from "./profile-freshness-gate";
import {
  asRecord,
  type JsonRecord,
  type SupabaseLike,
} from "./runtime-common";
import {
  dataForSeoFeatureForAction,
  dataForSeoRequirementFromSnapshot,
  type DataForSeoProviderSnapshot,
} from "./dataforseo-provider-profile";

export interface DiscoverGrowthCandidatesOptions {
  supabase: SupabaseLike;
  accountId: string;
  websiteId: string;
  locale?: string;
  market?: GrowthMarket;
  cycleId?: string;
  limit?: number;
  dryRun?: boolean;
  now?: Date;
}

export interface DiscoverGrowthCandidatesResult {
  candidates: GrowthOpportunityCandidateInsert[];
  insertedOrUpdated: number;
  signalFactIds: string[];
  skippedByCorrelation: Array<{
    signalFactId: string | null;
    verdict: GrowthEvidenceDedupeVerdict;
    reason: string;
    correlationKey: string;
    previousRefs: string[];
  }>;
  dryRun: boolean;
}

interface CandidateMapping {
  candidateType: GrowthOpportunityCandidateType;
  lane: AgentLane;
  actionClass: GrowthAutonomyActionClass;
  requiredProfileTypes: GrowthProfileType[];
  targetTable: string;
  successMetric: string;
  evaluationWindow: GrowthOutcomeEvaluationWindow;
}

export type GrowthEvidenceDedupeVerdict =
  | "new"
  | "coalesce"
  | "skip"
  | "block"
  | "reopen"
  | "follow_up";

export interface GrowthEvidenceCorrelationResult {
  entity_key: string;
  action_key: string;
  correlation_key: string;
  evidence_fingerprint: string;
  dedupe_verdict: GrowthEvidenceDedupeVerdict;
  reason: string;
  previous_refs: string[];
  materially_new_evidence: boolean;
}

const VOLATILE_EVIDENCE_KEYS = new Set([
  "cycle_id",
  "created_at",
  "updated_at",
  "generated_at",
  "observed_at",
  "fetched_at",
  "expires_at",
  "run_id",
  "provider_run_id",
  "profile_run_id",
  "context_snapshot_id",
  "orchestrator_decision_id",
]);

function stableEvidenceValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableEvidenceValue);
  if (!value || typeof value !== "object") return value;
  const record = value as JsonRecord;
  return Object.fromEntries(
    Object.keys(record)
      .filter((key) => !VOLATILE_EVIDENCE_KEYS.has(key))
      .sort()
      .map((key) => [key, stableEvidenceValue(record[key])]),
  );
}

function sha256Json(value: unknown): string {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(stableEvidenceValue(value)))
    .digest("hex")}`;
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function targetEntityKey(evidence: JsonRecord, fallbackEntity?: JsonRecord): string {
  const target = asRecord(evidence.target);
  const adapterInput = asRecord(evidence.adapter_input);
  const signalPayload = asRecord(evidence.signal_payload);
  const table = firstString(
    target.target_table,
    target.table,
    adapterInput.target_table,
    adapterInput.table,
    evidence.target_table,
    fallbackEntity?.entity_table,
    signalPayload.target_table,
  );
  const id = firstString(
    target.target_id,
    target.id,
    adapterInput.target_id,
    adapterInput.id,
    evidence.target_id,
    fallbackEntity?.entity_id,
    signalPayload.target_id,
  );
  const path = firstString(
    target.target_path,
    target.path,
    adapterInput.target_path,
    adapterInput.path,
    evidence.target_path,
    fallbackEntity?.entity_path,
    signalPayload.target_path,
    signalPayload.slug,
  );
  const keyword = firstString(
    signalPayload.query,
    signalPayload.keyword,
    evidence.query,
    evidence.keyword,
  );
  if (table && id) return `${table}:${id}`;
  if (table && path) return `${table}:${path}`;
  if (path) return `url:${path}`;
  if (keyword) return `keyword:${keyword.toLowerCase()}`;
  return firstString(fallbackEntity?.id, evidence.target_key, target.target_key) ??
    "unknown_entity";
}

function evidenceFingerprint(evidence: JsonRecord): string {
  const correlation = asRecord(evidence.correlation);
  const explicit = firstString(
    correlation.evidence_fingerprint,
    evidence.evidence_fingerprint,
    asRecord(evidence.dataforseo_evidence).evidence_fingerprint,
  );
  if (explicit) return explicit.startsWith("sha256:") ? explicit : `sha256:${explicit}`;
  const reads = Array.isArray(evidence.provider_evidence_reads)
    ? evidence.provider_evidence_reads
    : [];
  const readFingerprints = reads
    .map((read) => firstString(asRecord(read).evidence_fingerprint))
    .filter((value): value is string => Boolean(value))
    .sort();
  if (readFingerprints.length > 0) return sha256Json(readFingerprints);
  return sha256Json(evidence);
}

function correlationFromWorkItem(row: JsonRecord): JsonRecord {
  const evidence = asRecord(row.evidence);
  const correlation = asRecord(evidence.correlation);
  if (
    typeof correlation.correlation_key === "string" ||
    typeof correlation.action_key === "string" ||
    typeof correlation.entity_key === "string"
  ) {
    return correlation;
  }
  const actionClass = firstString(row.allowed_action_class, evidence.allowed_action_class) ??
    "unknown";
  const entityKey = targetEntityKey(evidence, row);
  const actionKey = `${actionClass}:${entityKey}`;
  const websiteId = firstString(row.website_id) ?? "unknown_website";
  return {
    entity_key: entityKey,
    action_key: actionKey,
    correlation_key: `${websiteId}:legacy:${actionKey}`,
    evidence_fingerprint: evidenceFingerprint(evidence),
  };
}

function rowRef(table: string, row: JsonRecord): string | null {
  return typeof row.id === "string" ? `${table}:${row.id}` : null;
}

function linkedOutcomeRows(
  workItems: JsonRecord[],
  outcomes: JsonRecord[],
): JsonRecord[] {
  const ids = new Set(workItems.map((row) => row.id).filter(Boolean));
  return outcomes.filter((row) => ids.has(row.work_item_id));
}

export function evaluateGrowthEvidenceCorrelation({
  websiteId,
  decisionFamily,
  actionClass,
  evidence,
  sourceEntity,
  priorWorkItems = [],
  priorOutcomes = [],
  now = new Date(),
}: {
  websiteId: string;
  decisionFamily: string;
  actionClass: string;
  evidence: JsonRecord;
  sourceEntity?: JsonRecord;
  priorWorkItems?: JsonRecord[];
  priorOutcomes?: JsonRecord[];
  now?: Date;
}): GrowthEvidenceCorrelationResult {
  const entityKey = firstString(asRecord(evidence.correlation).entity_key) ??
    targetEntityKey(evidence, sourceEntity);
  const actionKey =
    firstString(asRecord(evidence.correlation).action_key) ??
    `${actionClass}:${entityKey}`;
  const correlationKey =
    firstString(asRecord(evidence.correlation).correlation_key) ??
    `${websiteId}:${decisionFamily}:${actionKey}`;
  const fingerprint = evidenceFingerprint(evidence);
  const relatedWork = priorWorkItems.filter((row) => {
    const correlation = correlationFromWorkItem(row);
    return (
      correlation.correlation_key === correlationKey ||
      (correlation.action_key === actionKey &&
        correlation.entity_key === entityKey)
    );
  });
  const previousRefs = [
    ...relatedWork.map((row) => rowRef("growth_work_items", row)),
    ...linkedOutcomeRows(relatedWork, priorOutcomes).map((row) =>
      rowRef("growth_work_item_outcomes", row),
    ),
  ].filter((ref): ref is string => Boolean(ref));
  const relatedOutcomes = linkedOutcomeRows(relatedWork, priorOutcomes);
  const hasActiveWork = relatedWork.some((row) =>
    [
      "ready",
      "running",
      "review_needed",
      "approved_for_execution",
      "published_applied",
      "measuring",
    ].includes(String(row.status ?? "")),
  );
  const sameFingerprint = relatedWork.some(
    (row) => correlationFromWorkItem(row).evidence_fingerprint === fingerprint,
  );
  const materiallyNewEvidence = relatedWork.length > 0 && !sameFingerprint;
  const hasMeasuring = relatedOutcomes.some((row) => {
    const status = String(row.status ?? "");
    if (status === "scheduled" || status === "measuring") {
      const evaluationDate = firstString(row.evaluation_date);
      return !evaluationDate || Date.parse(evaluationDate) >= now.getTime();
    }
    return false;
  });
  const hasWon = relatedOutcomes.some((row) => row.status === "won");
  const hasLost = relatedOutcomes.some((row) => row.status === "lost");
  const hasRollback = relatedOutcomes.some((row) =>
    ["rolled_back", "smoke_failed"].includes(String(row.status ?? "")),
  );
  const failureFixed =
    asRecord(evidence.failure_fix).confirmed === true ||
    asRecord(evidence.rollback_resolution).confirmed === true;

  let dedupeVerdict: GrowthEvidenceDedupeVerdict = "new";
  let reason = "no_prior_correlated_work";
  if (hasActiveWork) {
    dedupeVerdict = "skip";
    reason = "prior_active_same_action";
  } else if (hasRollback && !failureFixed) {
    dedupeVerdict = "block";
    reason = "prior_rollback_or_smoke_failure";
  } else if (hasMeasuring) {
    dedupeVerdict = "skip";
    reason = "prior_work_still_measuring";
  } else if (hasWon) {
    dedupeVerdict = "block";
    reason = "prior_won_same_action";
  } else if (hasLost && !materiallyNewEvidence) {
    dedupeVerdict = "block";
    reason = "prior_lost_without_new_evidence";
  } else if (materiallyNewEvidence && (hasLost || relatedWork.length > 0)) {
    dedupeVerdict = hasLost ? "reopen" : "follow_up";
    reason = hasLost ? "materially_new_evidence_reopens_prior" : "materially_new_follow_up";
  } else if (sameFingerprint) {
    dedupeVerdict = "coalesce";
    reason = "same_evidence_same_action";
  }

  return {
    entity_key: entityKey,
    action_key: actionKey,
    correlation_key: correlationKey,
    evidence_fingerprint: fingerprint,
    dedupe_verdict: dedupeVerdict,
    reason,
    previous_refs: previousRefs,
    materially_new_evidence: materiallyNewEvidence,
  };
}

function mappingForSignal(row: JsonRecord): CandidateMapping | null {
  const signal = `${row.signal_type ?? ""}:${row.source ?? ""}`.toLowerCase();
  if (/technical|crawl|index|schema|web_vital|performance/.test(signal)) {
    return {
      candidateType: "technical_seo_issue",
      lane: "technical_remediation",
      actionClass: "safe_apply",
      requiredProfileTypes: ["page_product", "risk_policy"],
      targetTable: "website_sections",
      successMetric: "technical_smoke_pass",
      evaluationWindow: "day_7",
    };
  }
  if (/translation|hreflang|locale|transcreation/.test(signal)) {
    return {
      candidateType: "missing_translation",
      lane: "transcreation",
      actionClass: "transcreation_merge",
      requiredProfileTypes: [
        "business",
        "buyer",
        "seo_market",
        "competitor",
        "page_product",
        "risk_policy",
      ],
      targetTable: "seo_transcreation_jobs",
      successMetric: "localized_organic_clicks",
      evaluationWindow: "day_21",
    };
  }
  if (/decay|refresh|stale/.test(signal)) {
    return {
      candidateType: "content_refresh",
      lane: "content_curator",
      actionClass: "content_publish",
      requiredProfileTypes: [
        "business",
        "buyer",
        "seo_market",
        "page_product",
        "risk_policy",
      ],
      targetTable: "website_blog_posts",
      successMetric: "organic_clicks",
      evaluationWindow: "day_21",
    };
  }
  if (/funnel|lead|crm|whatsapp|conversion/.test(signal)) {
    return {
      candidateType: "funnel_leak",
      lane: "orchestrator",
      actionClass: "follow_up_backlog_create",
      requiredProfileTypes: ["risk_policy"],
      targetTable: "growth_work_items",
      successMetric: "lead_to_quote_rate",
      evaluationWindow: "day_30",
    };
  }
  if (/keyword|gsc|query|serp|content|internal_link/.test(signal)) {
    return {
      candidateType: /internal_link/.test(signal)
        ? "internal_linking_gap"
        : "keyword_gap",
      lane: "content_creator",
      actionClass: "content_publish",
      requiredProfileTypes: [
        "business",
        "buyer",
        "seo_market",
        "page_product",
        "risk_policy",
      ],
      targetTable: "website_blog_posts",
      successMetric: "organic_clicks",
      evaluationWindow: "day_21",
    };
  }
  return null;
}

function numericPayload(row: JsonRecord, key: string, fallback: number): number {
  const payload = asRecord(row.payload);
  const value = payload[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function candidateTitle(row: JsonRecord, mapping: CandidateMapping): string {
  const payload = asRecord(row.payload);
  const entity =
    payload.query ??
    payload.keyword ??
    payload.slug ??
    row.entity_path ??
    row.signal_type ??
    mapping.candidateType;
  return `${mapping.candidateType.replace(/_/g, " ")}: ${String(entity)}`.slice(
    0,
    240,
  );
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

function textPayload(row: JsonRecord, payload: JsonRecord, keys: string[]): string | null {
  for (const key of keys) {
    const value = payload[key] ?? row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function candidateTarget(
  row: JsonRecord,
  payload: JsonRecord,
  mapping: CandidateMapping,
): JsonRecord {
  const targetTable =
    textPayload(row, payload, ["target_table", "entity_table"]) ??
    mapping.targetTable;
  const rawTargetId = textPayload(row, payload, ["target_id", "entity_id"]);
  const targetId = rawTargetId && isUuid(rawTargetId) ? rawTargetId : null;
  const explicitPath = textPayload(row, payload, [
    "target_path",
    "entity_path",
    "slug",
    "path",
  ]);
  const querySlug = textPayload(row, payload, ["query", "keyword"]);
  const targetPath =
    explicitPath ??
    (querySlug && mapping.actionClass === "content_publish"
      ? `/blog/${slugify(querySlug)}`
      : null);
  const targetKey =
    textPayload(row, payload, ["target_key", "idempotency_key"]) ??
    (rawTargetId && !targetId ? rawTargetId : null);
  return {
    target_table: targetTable,
    ...(targetId ? { target_id: targetId } : {}),
    ...(targetPath ? { target_path: targetPath } : {}),
    ...(targetKey ? { target_key: targetKey } : {}),
  };
}

function candidateBaseline(payload: JsonRecord, mapping: CandidateMapping): JsonRecord {
  const explicit = asRecord(payload.baseline);
  if (Object.keys(explicit).length > 0) return explicit;

  const baseline: JsonRecord = {};
  for (const key of [
    "organic_clicks",
    "localized_organic_clicks",
    "impressions",
    "position",
    "ctr",
    "lead_to_quote_rate",
    "technical_smoke_pass",
    "indexed",
  ]) {
    const value = payload[key];
    if (typeof value === "number" || typeof value === "boolean") {
      baseline[key] = value;
    }
  }
  if (Object.keys(baseline).length === 0 && mapping.actionClass === "safe_apply") {
    baseline.expected_smoke = "not_measured";
  }
  return baseline;
}

function contentPublishEvidenceFromPayload(payload: JsonRecord): JsonRecord {
  const article = asRecord(payload.article);
  const supportedFacts = Array.isArray(payload.supported_facts)
    ? payload.supported_facts
    : Array.isArray(article.supported_facts)
      ? article.supported_facts
      : [];
  const contentBrief = asRecord(payload.content_brief);
  const providerEvidenceReads = Array.isArray(payload.provider_evidence_reads)
    ? payload.provider_evidence_reads
    : [];
  const articleOutline = Array.isArray(payload.article_outline)
    ? payload.article_outline
    : [];
  const result: JsonRecord = {};
  if (Object.keys(article).length > 0) result.article = article;
  if (supportedFacts.length > 0) result.supported_facts = supportedFacts;
  if (Object.keys(contentBrief).length > 0) result.content_brief = contentBrief;
  if (providerEvidenceReads.length > 0) {
    result.provider_evidence_reads = providerEvidenceReads;
  }
  if (articleOutline.length > 0) result.article_outline = articleOutline;
  for (const key of [
    "primary_query",
    "topic_key",
    "topic_cluster",
    "serp_gap",
    "content_factory_version",
  ]) {
    if (payload[key] !== undefined) result[key] = payload[key];
  }
  return result;
}

function rollbackExpectation(
  payload: JsonRecord,
  target: JsonRecord,
  mapping: CandidateMapping,
): JsonRecord {
  const explicit = asRecord(payload.rollback_expectation);
  if (Object.keys(explicit).length > 0) return explicit;
  if (mapping.actionClass === "content_publish" && typeof target.target_path === "string") {
    return {
      strategy: "delete_created_content",
      target_path: target.target_path,
    };
  }
  if (mapping.actionClass === "safe_apply" && target.target_id) {
    return {
      strategy: "restore_before_snapshot",
      target_id: target.target_id,
    };
  }
  if (mapping.actionClass === "transcreation_merge" && target.target_id) {
    return {
      strategy: "restore_localized_variant_or_job",
      target_id: target.target_id,
    };
  }
  return {};
}

function profilePayload(
  profiles: GrowthProfile[],
  profileType: GrowthProfileType,
): JsonRecord {
  const profile = profiles
    .filter((row) => row.profile_type === profileType)
    .sort((a, b) => Date.parse(b.valid_from) - Date.parse(a.valid_from))[0];
  return asRecord(profile?.payload);
}

function providerSnapshotFromProfiles(
  profiles: GrowthProfile[],
  mapping: CandidateMapping,
): DataForSeoProviderSnapshot | null {
  const profileType: GrowthProfileType =
    mapping.candidateType === "missing_translation" ? "competitor" : "seo_market";
  const payload = profilePayload(profiles, profileType);
  const snapshot = payload.dataforseo_snapshot;
  return snapshot && typeof snapshot === "object"
    ? (snapshot as DataForSeoProviderSnapshot)
    : null;
}

function dataForSeoRequirement({
  row,
  payload,
  mapping,
  profiles,
}: {
  row: JsonRecord;
  payload: JsonRecord;
  mapping: CandidateMapping;
  profiles: GrowthProfile[];
}) {
  const signalText = `${row.signal_type ?? ""} ${row.source ?? ""} ${payload.provider ?? ""} ${Array.isArray(payload.sources) ? payload.sources.join(" ") : ""}`;
  const lower = signalText.toLowerCase();
  const providerDependent =
    /dataforseo|serp|keyword|query|competitor|onpage|crawl|technical|translation|locale|transcreation/.test(
      lower,
    ) &&
    (mapping.actionClass === "content_publish" ||
      mapping.actionClass === "transcreation_merge" ||
      mapping.actionClass === "safe_apply");
  const exceptionReason =
    textPayload(row, payload, [
      "dataforseo_exception_reason",
      "provider_exception_reason",
      "strategic_exception_reason",
    ]) ?? null;
  const featureProfile = dataForSeoFeatureForAction(mapping.actionClass, signalText);
  return dataForSeoRequirementFromSnapshot({
    required: providerDependent,
    featureProfile,
    snapshot: providerSnapshotFromProfiles(profiles, mapping),
    exceptionReason,
  });
}

export async function discoverGrowthOpportunityCandidates(
  input: DiscoverGrowthCandidatesOptions,
): Promise<DiscoverGrowthCandidatesResult> {
  const now = input.now ?? new Date();
  const limit = input.limit ?? 25;
  const { data: signalRows, error: signalError } = await input.supabase
    .from("growth_signal_facts")
    .select("*")
    .eq("account_id", input.accountId)
    .eq("website_id", input.websiteId)
    .gte("expires_at", now.toISOString())
    .order("confidence", { ascending: false })
    .order("observed_at", { ascending: false })
    .limit(limit * 3);
  if (signalError) throw new Error(`candidate signal lookup failed: ${signalError.message}`);

  const { data: profileRows, error: profileError } = await input.supabase
    .from("growth_profiles")
    .select("*")
    .eq("account_id", input.accountId)
    .eq("website_id", input.websiteId)
    .eq("locale", input.locale ?? "es-CO")
    .eq("market", input.market ?? "CO");
  if (profileError) throw new Error(`candidate profile lookup failed: ${profileError.message}`);

  const [{ data: workItemRows, error: workItemError }, { data: outcomeRows, error: outcomeError }] =
    await Promise.all([
      input.supabase
        .from("growth_work_items")
        .select("id,status,allowed_action_class,evidence,updated_at")
        .eq("account_id", input.accountId)
        .eq("website_id", input.websiteId)
        .in("status", [
          "ready",
          "running",
          "review_needed",
          "approved_for_execution",
          "published_applied",
          "measuring",
          "blocked",
          "auto_completed",
        ])
        .order("updated_at", { ascending: false })
        .limit(1000),
      input.supabase
        .from("growth_work_item_outcomes")
        .select("id,work_item_id,status,evaluation_date,evaluation_window,updated_at")
        .eq("account_id", input.accountId)
        .eq("website_id", input.websiteId)
        .order("updated_at", { ascending: false })
        .limit(1000),
    ]);
  if (workItemError) throw new Error(`candidate work item lookup failed: ${workItemError.message}`);
  if (outcomeError) throw new Error(`candidate outcome lookup failed: ${outcomeError.message}`);

  const profiles = (profileRows ?? []) as GrowthProfile[];
  const priorWorkItems = (workItemRows ?? []) as JsonRecord[];
  const priorOutcomes = (outcomeRows ?? []) as JsonRecord[];
  const candidates: GrowthOpportunityCandidateInsert[] = [];
  const skippedByCorrelation: DiscoverGrowthCandidatesResult["skippedByCorrelation"] = [];

  for (const rawRow of (signalRows ?? []) as JsonRecord[]) {
    if (candidates.length >= limit) break;
    const mapping = mappingForSignal(rawRow);
    if (!mapping) continue;
    const payload = asRecord(rawRow.payload);
    const target = candidateTarget(rawRow, payload, mapping);
    const baseline = candidateBaseline(payload, mapping);
    const rollback = rollbackExpectation(payload, target, mapping);
    const dataforseoEvidence = dataForSeoRequirement({
      row: rawRow,
      payload,
      mapping,
      profiles,
    });
    const signalId = typeof rawRow.id === "string" ? rawRow.id : "";
    const freshness = evaluateProfileFreshnessGate({
      profiles,
      requirements: requirementsForAction(mapping.actionClass),
      now,
    });
    const impact = numericPayload(rawRow, "impact_score", numericPayload(rawRow, "click_delta", 60));
    const urgency = numericPayload(rawRow, "urgency_score", 60);
    const risk = numericPayload(rawRow, "risk_score", mapping.actionClass === "safe_apply" ? 20 : 35);
    const cost = numericPayload(rawRow, "cost_score", 35);
    const confidence =
      typeof rawRow.confidence === "number" ? rawRow.confidence : 0.7;
    const metricSubject =
      payload.slug ??
      payload.query ??
      rawRow.entity_path ??
      rawRow.entity_id ??
      mapping.candidateType;

    const payloadSourceRefs = Array.isArray(payload.source_refs)
      ? payload.source_refs.filter((ref): ref is string => typeof ref === "string")
      : [];
    const baseEvidence = {
      allowed_action_class: mapping.actionClass,
      source: "growth_runtime_candidate_discovery",
      cycle_id: input.cycleId ?? null,
      signal_fact_id: signalId || null,
      signal_payload: payload,
      target,
      rollback_expectation: rollback,
      baseline,
      dataforseo_evidence: dataforseoEvidence,
      source_refs: [
        ...(signalId ? [`growth_signal_facts:${signalId}`] : []),
        ...payloadSourceRefs,
      ],
      ...(mapping.actionClass === "content_publish"
        ? contentPublishEvidenceFromPayload(payload)
        : {}),
    };
    const correlation = evaluateGrowthEvidenceCorrelation({
      websiteId: input.websiteId,
      decisionFamily: mapping.candidateType,
      actionClass: mapping.actionClass,
      evidence: baseEvidence,
      sourceEntity: rawRow,
      priorWorkItems,
      priorOutcomes,
      now,
    });
    if (
      correlation.dedupe_verdict === "skip" ||
      correlation.dedupe_verdict === "coalesce" ||
      correlation.dedupe_verdict === "block"
    ) {
      skippedByCorrelation.push({
        signalFactId: signalId || null,
        verdict: correlation.dedupe_verdict,
        reason: correlation.reason,
        correlationKey: correlation.correlation_key,
        previousRefs: correlation.previous_refs,
      });
      continue;
    }

    const candidate = scoreOpportunityCandidate({
        accountId: input.accountId,
        websiteId: input.websiteId,
        locale: input.locale ?? "es-CO",
        market: input.market ?? "CO",
        candidateType: mapping.candidateType,
        lane: mapping.lane,
        allowedActionClass: mapping.actionClass,
        title: candidateTitle(rawRow, mapping),
        summary: String(payload.summary ?? rawRow.signal_type ?? "Growth signal promoted by runtime."),
        impactScore: impact,
        confidence,
        urgencyScore: urgency,
        costScore: cost,
        riskScore: risk,
        idempotencyKey:
          correlation.dedupe_verdict === "reopen" ||
          correlation.dedupe_verdict === "follow_up"
            ? `correlation:${correlation.correlation_key}:${correlation.evidence_fingerprint}`
            : `runtime:${input.cycleId ?? "cycle"}:${signalId || JSON.stringify(payload).slice(0, 80)}`,
        evidence: {
          ...baseEvidence,
          correlation,
        },
        requiredProfileTypes: mapping.requiredProfileTypes,
        freshness,
        successMetric: `${mapping.successMetric}:${metricSubject}`,
        evaluationWindow: mapping.evaluationWindow,
        sourceSignalFactIds: signalId ? [signalId] : [],
      });
    candidates.push(candidate);
  }

  if (!input.dryRun && candidates.length > 0) {
    const { error } = await input.supabase
      .from("growth_opportunity_candidates")
      .upsert(candidates, { onConflict: "website_id,idempotency_key" });
    if (error) throw new Error(`candidate upsert failed: ${error.message}`);
  }

  return {
    candidates,
    insertedOrUpdated: input.dryRun ? 0 : candidates.length,
    signalFactIds: candidates
      .flatMap((candidate) => candidate.source_signal_fact_ids)
      .filter(Boolean),
    skippedByCorrelation,
    dryRun: input.dryRun ?? false,
  };
}
