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
