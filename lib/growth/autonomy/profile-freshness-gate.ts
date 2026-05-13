import type {
  AgentLane,
  GrowthAutonomyActionClass,
  GrowthOpportunityCandidateInsert,
  GrowthProfile,
  GrowthProfileType,
  GrowthOutcomeEvaluationWindow,
} from "@bukeer/website-contract";
import { GrowthOpportunityCandidateInsertSchema } from "@bukeer/website-contract";

type JsonRecord = Record<string, unknown>;
type GrowthMarket = "CO" | "MX" | "US" | "CA" | "EU" | "OTHER";

export interface ProfileRequirement {
  profileType: GrowthProfileType;
  maxAgeHours: number;
  minConfidence: number;
  subjectTable?: string | null;
  subjectId?: string | null;
  subjectKey?: string | null;
}

export interface ProfileFreshnessGateInput {
  profiles: GrowthProfile[];
  requirements: ProfileRequirement[];
  now?: Date;
}

export interface ProfileFreshnessGateResult {
  allowed: boolean;
  snapshot: JsonRecord;
  missing: GrowthProfileType[];
  stale: GrowthProfileType[];
  lowConfidence: GrowthProfileType[];
}

export interface GrowthCandidateDataQualityInput {
  evidence: JsonRecord;
  actionClass?: GrowthAutonomyActionClass | null;
  successMetric?: string | null;
  evaluationWindow?: GrowthOutcomeEvaluationWindow | null;
}

export interface OpportunityScoreInput {
  accountId: string;
  websiteId: string;
  locale?: string;
  market?: GrowthMarket;
  candidateType: GrowthOpportunityCandidateInsert["candidate_type"];
  lane: AgentLane;
  allowedActionClass: GrowthAutonomyActionClass;
  title: string;
  summary: string;
  impactScore: number;
  confidence: number;
  urgencyScore: number;
  costScore: number;
  riskScore: number;
  idempotencyKey: string;
  evidence: JsonRecord;
  requiredProfileTypes: GrowthProfileType[];
  freshness: ProfileFreshnessGateResult;
  successMetric?: string | null;
  evaluationWindow?: GrowthOutcomeEvaluationWindow | null;
  sourceSignalFactIds?: string[];
}

export function requirementsForAction(
  actionClass: GrowthAutonomyActionClass,
): ProfileRequirement[] {
  if (actionClass === "safe_apply") {
    return [
      { profileType: "page_product", maxAgeHours: 1, minConfidence: 0.7 },
      { profileType: "risk_policy", maxAgeHours: 1, minConfidence: 0.95 },
    ];
  }
  if (actionClass === "content_publish") {
    return [
      { profileType: "business", maxAgeHours: 24 * 30, minConfidence: 0.75 },
      { profileType: "buyer", maxAgeHours: 24 * 30, minConfidence: 0.72 },
      { profileType: "seo_market", maxAgeHours: 24 * 7, minConfidence: 0.7 },
      { profileType: "page_product", maxAgeHours: 1, minConfidence: 0.68 },
      { profileType: "risk_policy", maxAgeHours: 1, minConfidence: 0.95 },
    ];
  }
  if (actionClass === "transcreation_merge") {
    return [
      { profileType: "business", maxAgeHours: 24 * 30, minConfidence: 0.75 },
      { profileType: "buyer", maxAgeHours: 24 * 30, minConfidence: 0.72 },
      { profileType: "seo_market", maxAgeHours: 24 * 7, minConfidence: 0.7 },
      { profileType: "competitor", maxAgeHours: 24 * 7, minConfidence: 0.65 },
      { profileType: "page_product", maxAgeHours: 1, minConfidence: 0.68 },
      { profileType: "risk_policy", maxAgeHours: 1, minConfidence: 0.95 },
    ];
  }
  return [{ profileType: "risk_policy", maxAgeHours: 1, minConfidence: 0.95 }];
}

function profileMatchesRequirement(
  profile: GrowthProfile,
  requirement: ProfileRequirement,
): boolean {
  if (profile.profile_type !== requirement.profileType) return false;
  if (
    requirement.subjectTable &&
    profile.subject_table !== requirement.subjectTable
  ) {
    return false;
  }
  if (requirement.subjectId && profile.subject_id !== requirement.subjectId) {
    return false;
  }
  if (requirement.subjectKey && profile.subject_key !== requirement.subjectKey) {
    return false;
  }
  return true;
}

function latestProfile(
  profiles: GrowthProfile[],
  requirement: ProfileRequirement,
): GrowthProfile | null {
  return profiles
    .filter((profile) => profileMatchesRequirement(profile, requirement))
    .sort(
      (a, b) => Date.parse(b.valid_from) - Date.parse(a.valid_from),
    )[0] ?? null;
}

export function evaluateProfileFreshnessGate(
  input: ProfileFreshnessGateInput,
): ProfileFreshnessGateResult {
  const now = input.now ?? new Date();
  const missing: GrowthProfileType[] = [];
  const stale: GrowthProfileType[] = [];
  const lowConfidence: GrowthProfileType[] = [];
  const snapshot: JsonRecord = {};

  for (const requirement of input.requirements) {
    const profile = latestProfile(input.profiles, requirement);
    if (!profile) {
      missing.push(requirement.profileType);
      continue;
    }

    const ageHours =
      (now.getTime() - Date.parse(profile.valid_from)) / (1000 * 60 * 60);
    const expired = Date.parse(profile.valid_until) <= now.getTime();
    const tooOld = ageHours > requirement.maxAgeHours;
    const confidence = Number(profile.confidence);

    snapshot[requirement.profileType] = {
      id: profile.id,
      confidence,
      age_hours: Number(ageHours.toFixed(2)),
      valid_until: profile.valid_until,
      subject_table: profile.subject_table,
      subject_id: profile.subject_id,
      subject_key: profile.subject_key,
      policy_version: profile.policy_version,
      payload: profile.payload,
    };

    if (expired || tooOld) stale.push(requirement.profileType);
    if (confidence < requirement.minConfidence) {
      lowConfidence.push(requirement.profileType);
    }
  }

  return {
    allowed:
      missing.length === 0 &&
      stale.length === 0 &&
      lowConfidence.length === 0,
    snapshot,
    missing,
    stale,
    lowConfidence,
  };
}

function hasNonEmptyRecord(value: unknown): boolean {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).length > 0,
  );
}

function asRecord(value: unknown): JsonRecord {
  return hasNonEmptyRecord(value) ? (value as JsonRecord) : {};
}

function firstRecord(...values: unknown[]): JsonRecord {
  for (const value of values) {
    const record = asRecord(value);
    if (Object.keys(record).length > 0) return record;
  }
  return {};
}

function textValue(record: JsonRecord, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function nestedRecord(record: JsonRecord, key: string): JsonRecord {
  return asRecord(record[key]);
}

function hasCandidateTarget(value: unknown): boolean {
  if (!hasNonEmptyRecord(value)) return false;
  const target = value as JsonRecord;
  return (
    typeof target.target_table === "string" &&
    target.target_table.trim().length > 0 &&
    (typeof target.target_id === "string" ||
      typeof target.target_path === "string" ||
      typeof target.target_key === "string")
  );
}

function dataForSeoEvidenceFailure(value: unknown): string | null {
  if (!hasNonEmptyRecord(value)) return null;
  const evidence = value as JsonRecord;
  if (evidence.required !== true) return null;
  const status = typeof evidence.status === "string" ? evidence.status : "empty";
  if (status === "available" || status === "excepted") return null;
  return `dataforseo_${status}`;
}

function contentArticleEvidenceFailures(
  evidence: JsonRecord,
  actionClass?: GrowthAutonomyActionClass | null,
): string[] {
  const target = hasNonEmptyRecord(evidence.target)
    ? (evidence.target as JsonRecord)
    : {};
  const evidenceActionClass =
    typeof evidence.allowed_action_class === "string"
      ? evidence.allowed_action_class
      : actionClass;
  const isContentPublish =
    evidenceActionClass === "content_publish" ||
    target.target_table === "website_blog_posts" ||
    hasNonEmptyRecord(evidence.article);
  if (!isContentPublish) return [];

  const failures: string[] = [];
  const article = firstRecord(
    evidence.article,
    nestedRecord(asRecord(evidence.adapter_input), "article"),
    nestedRecord(asRecord(evidence.runtime_adapter), "article"),
    nestedRecord(asRecord(evidence.publication_adapter), "article"),
  );
  const articleText = typeof article.content === "string" ? article.content : "";
  const supportedFacts = Array.isArray(evidence.supported_facts)
    ? evidence.supported_facts
    : Array.isArray(article.supported_facts)
      ? article.supported_facts
      : [];
  const sourceRefs = Array.isArray(evidence.source_refs)
    ? evidence.source_refs
    : [];
  const wordCount = articleText.trim().split(/\s+/).filter(Boolean).length;

  if (typeof article.title !== "string" || article.title.trim().length < 10) {
    failures.push("missing_article_title");
  }
  if (typeof article.slug !== "string" || !/^[a-z0-9-]+$/.test(article.slug)) {
    failures.push("missing_article_slug");
  }
  if (
    typeof article.seo_title !== "string" ||
    article.seo_title.trim().length < 10
  ) {
    failures.push("missing_article_seo_title");
  }
  if (
    typeof article.seo_description !== "string" ||
    article.seo_description.trim().length < 70
  ) {
    failures.push("missing_article_seo_description");
  }
  if (wordCount < 300) failures.push("content_too_thin");
  if (supportedFacts.length < 3) failures.push("missing_supported_facts");
  if (sourceRefs.length === 0) failures.push("missing_source_refs");
  return failures;
}

const TECHNICAL_ALLOWED_FIELDS: Record<string, ReadonlySet<string>> = {
  website_pages: new Set([
    "seo_title",
    "seo_description",
    "target_keyword",
    "robots_noindex",
  ]),
  website_sections: new Set([
    "content",
    "content_translations",
    "config",
    "is_enabled",
  ]),
  product_seo_overrides: new Set([
    "meta_title",
    "meta_desc",
    "h1",
    "slug",
    "keywords",
    "body_content",
  ]),
};

const FORBIDDEN_PATCH_FIELD_PATTERNS = [
  /price/i,
  /pricing/i,
  /availability/i,
  /booking/i,
  /reservation/i,
  /payment/i,
  /paid/i,
  /campaign/i,
  /cost/i,
  /currency/i,
];

function runtimeAdapterPlan(evidence: JsonRecord): JsonRecord {
  return firstRecord(
    evidence.adapter_input,
    evidence.runtime_adapter,
    evidence.publication_adapter,
    nestedRecord(asRecord(evidence.signal_payload), "adapter_input"),
  );
}

function transcreationPayloadFailures(evidence: JsonRecord): string[] {
  const failures: string[] = [];
  const transcreation = runtimeAdapterPlan(evidence);
  if (Object.keys(transcreation).length === 0) {
    failures.push("missing_runtime_adapter_plan");
  }
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
  if (!textValue(transcreation, "page_type")) {
    failures.push("missing_transcreation_page_type");
  }
  if (!textValue(payload, "meta_title")) {
    failures.push("missing_transcreation_meta_title");
  }
  if (!textValue(payload, "meta_desc")) {
    failures.push("missing_transcreation_meta_desc");
  }
  if (!payload.body_content && !payload.body_overlay_v2) {
    failures.push("missing_transcreation_body_payload");
  }
  if (quality.passed !== true) {
    failures.push("transcreation_quality_not_passed");
  }
  if (
    !Array.isArray(transcreation.glossary_terms) ||
    transcreation.glossary_terms.length === 0
  ) {
    failures.push("missing_glossary_or_tm_context");
  }
  return failures;
}

function patchFieldFailures(targetTable: string | null, patch: JsonRecord): string[] {
  const failures: string[] = [];
  if (!targetTable || !TECHNICAL_ALLOWED_FIELDS[targetTable]) {
    failures.push("unsupported_safe_apply_target");
    return failures;
  }
  const allowed = TECHNICAL_ALLOWED_FIELDS[targetTable];
  for (const key of Object.keys(patch)) {
    if (!allowed.has(key)) failures.push(`field_not_allowed:${key}`);
    if (FORBIDDEN_PATCH_FIELD_PATTERNS.some((pattern) => pattern.test(key))) {
      failures.push(`forbidden_field:${key}`);
    }
  }
  return failures;
}

function safeApplyPayloadFailures(evidence: JsonRecord): string[] {
  const failures: string[] = [];
  const technical = runtimeAdapterPlan(evidence);
  if (Object.keys(technical).length === 0) {
    failures.push("missing_runtime_adapter_plan");
  }
  const targetTable = textValue(technical, "target_table");
  const targetId = textValue(technical, "target_id");
  const patch = asRecord(technical.patch);
  const beforeRow = asRecord(technical.before_row);
  const rollbackPayload = asRecord(technical.rollback_payload);

  if (!targetTable) failures.push("missing_safe_apply_target_table");
  if (!targetId) failures.push("missing_safe_apply_target_id");
  if (Object.keys(patch).length === 0) failures.push("missing_safe_apply_patch");
  if (Object.keys(beforeRow).length === 0) failures.push("missing_safe_apply_before_row");
  if (Object.keys(rollbackPayload).length === 0) {
    failures.push("missing_safe_apply_rollback_payload");
  }
  failures.push(...patchFieldFailures(targetTable, patch));
  if (
    Object.keys(patch).length > 0 &&
    Object.keys(beforeRow).length > 0 &&
    Object.keys(patch).every(
      (key) => JSON.stringify(beforeRow[key] ?? null) === JSON.stringify(patch[key] ?? null),
    )
  ) {
    failures.push("safe_apply_no_effective_changes");
  }
  return failures;
}

function actionPayloadEvidenceFailures(
  actionClass: GrowthAutonomyActionClass | null | undefined,
  evidence: JsonRecord,
): string[] {
  if (actionClass === "transcreation_merge") {
    return transcreationPayloadFailures(evidence);
  }
  if (actionClass === "safe_apply") {
    return safeApplyPayloadFailures(evidence);
  }
  return [];
}

export function evaluateCandidateDataQuality(
  input: GrowthCandidateDataQualityInput,
): string[] {
  const failures: string[] = [];
  if (!hasCandidateTarget(input.evidence.target)) failures.push("missing_target");
  if (!hasNonEmptyRecord(input.evidence.rollback_expectation)) {
    failures.push("missing_rollback_expectation");
  }
  if (!hasNonEmptyRecord(input.evidence.baseline)) {
    failures.push("missing_baseline");
  }
  if (!input.successMetric?.trim()) failures.push("missing_success_metric");
  if (!input.evaluationWindow) failures.push("missing_evaluation_window");
  const dataforseoFailure = dataForSeoEvidenceFailure(
    input.evidence.dataforseo_evidence,
  );
  if (dataforseoFailure) failures.push(dataforseoFailure);
  failures.push(...contentArticleEvidenceFailures(input.evidence, input.actionClass));
  failures.push(...actionPayloadEvidenceFailures(input.actionClass, input.evidence));
  return failures;
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function scoreOpportunityCandidate(
  input: OpportunityScoreInput,
): GrowthOpportunityCandidateInsert {
  const totalScore = clampScore(
    input.impactScore * 0.4 +
      input.confidence * 100 * 0.25 +
      input.urgencyScore * 0.2 +
      (100 - input.riskScore) * 0.1 +
      (100 - input.costScore) * 0.05,
  );
  const blockingReasons = [
    ...input.freshness.missing.map((profile) => `missing:${profile}`),
    ...input.freshness.stale.map((profile) => `stale:${profile}`),
    ...input.freshness.lowConfidence.map(
      (profile) => `low_confidence:${profile}`,
    ),
    ...evaluateCandidateDataQuality({
      evidence: input.evidence,
      actionClass: input.allowedActionClass,
      successMetric: input.successMetric,
      evaluationWindow: input.evaluationWindow,
    }),
  ];
  const status = !input.freshness.allowed || blockingReasons.length > 0
    ? "blocked"
    : totalScore >= 60
      ? "ready_for_backlog"
      : "candidate";

  return GrowthOpportunityCandidateInsertSchema.parse({
    account_id: input.accountId,
    website_id: input.websiteId,
    locale: input.locale ?? "es-CO",
    market: input.market ?? "CO",
    candidate_type: input.candidateType,
    lane: input.lane,
    allowed_action_class: input.allowedActionClass,
    title: input.title,
    summary: input.summary,
    impact_score: clampScore(input.impactScore),
    confidence: Math.max(0, Math.min(1, input.confidence)),
    urgency_score: clampScore(input.urgencyScore),
    cost_score: clampScore(input.costScore),
    risk_score: clampScore(input.riskScore),
    total_score: totalScore,
    status,
    blocking_reason: blockingReasons.length ? blockingReasons.join(",") : null,
    required_profile_types: input.requiredProfileTypes,
    profile_snapshot: input.freshness.snapshot,
    source_signal_fact_ids: input.sourceSignalFactIds ?? [],
    evidence: {
      ...input.evidence,
      scoring: {
        weights: {
          impact: 0.4,
          confidence: 0.25,
          urgency: 0.2,
          inverse_risk: 0.1,
          inverse_cost: 0.05,
        },
        total_score: totalScore,
      },
    },
    success_metric: input.successMetric ?? null,
    evaluation_window: input.evaluationWindow ?? null,
    idempotency_key: input.idempotencyKey,
    promoted_work_item_id: null,
  });
}
