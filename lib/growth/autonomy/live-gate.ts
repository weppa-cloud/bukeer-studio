import type {
  AgentLane,
  GrowthAutonomyActionClass,
  GrowthPublicationTargetTable,
  GrowthProfileType,
} from "@bukeer/website-contract";

import type { ProfileFreshnessGateResult } from "./profile-freshness-gate";

type JsonRecord = Record<string, unknown>;

export type LiveGateMode = "dry_run" | "live";

export interface GrowthAutonomyPolicyLike {
  id?: string | null;
  account_id?: string | null;
  website_id?: string | null;
  lane: string;
  action_class: string;
  enabled: boolean;
  dry_run_only: boolean;
  kill_switch_enabled: boolean;
  paused_reason?: string | null;
  max_risk_level?: string | null;
  max_risk_score: number;
  daily_cap: number;
  weekly_cap: number;
  required_checks?: string[] | null;
}

export interface GrowthAutonomyExecutionInput {
  lane: AgentLane;
  actionClass: GrowthAutonomyActionClass;
  targetTable?: GrowthPublicationTargetTable | null;
  riskScore: number;
  riskLevel?: "low" | "medium" | "high" | "blocked" | string | null;
  policy: GrowthAutonomyPolicyLike | null;
  freshness: ProfileFreshnessGateResult;
  dailyUsed: number;
  weeklyUsed: number;
  checks: {
    beforeSnapshot: boolean;
    rollbackPayload: boolean;
    smokeCheck: boolean;
    baseline: boolean;
    successMetric: boolean;
    evaluationDate: boolean;
    tenantAllowlist?: boolean;
    technicalReversibility?: boolean;
  };
  metadata?: JsonRecord;
}

export interface GrowthAutonomyExecutionDecision {
  allowed: boolean;
  mode: LiveGateMode | "blocked";
  policyId: string | null;
  requiredApproval: "none" | "curator" | "council";
  reasons: string[];
  requiredProfilesMissing: GrowthProfileType[];
  requiredProfilesStale: GrowthProfileType[];
  requiredProfilesLowConfidence: GrowthProfileType[];
}

const ALWAYS_BLOCKED = new Set<GrowthAutonomyActionClass>([
  "paid_mutation",
  "experiment_activation",
  "outreach_send",
]);

const TARGETS_BY_ACTION: Record<string, ReadonlySet<string>> = {
  content_publish: new Set(["website_blog_posts", "website_pages"]),
  transcreation_merge: new Set([
    "seo_localized_variants",
    "seo_transcreation_jobs",
  ]),
  safe_apply: new Set([
    "website_pages",
    "website_sections",
    "product_seo_overrides",
  ]),
};

const LANES_BY_ACTION: Record<string, ReadonlySet<string>> = {
  content_publish: new Set(["content_creator", "content_curator"]),
  transcreation_merge: new Set(["transcreation"]),
  safe_apply: new Set(["technical_remediation"]),
};

const RISK_RANK: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
  blocked: 4,
};

function requiredCheckPassed(
  check: string,
  input: GrowthAutonomyExecutionInput,
): boolean {
  if (check === "before_snapshot") return input.checks.beforeSnapshot;
  if (check === "rollback_payload") return input.checks.rollbackPayload;
  if (check === "smoke_check") return input.checks.smokeCheck;
  if (check === "baseline") return input.checks.baseline;
  if (check === "success_metric") return input.checks.successMetric;
  if (check === "evaluation_date") return input.checks.evaluationDate;
  if (check === "no_paid_mutation") {
    return !ALWAYS_BLOCKED.has(input.actionClass);
  }
  if (check === "tenant_allowlist") return input.checks.tenantAllowlist !== false;
  if (check === "technical_reversibility") {
    return (
      input.actionClass !== "safe_apply" ||
      input.checks.technicalReversibility === true
    );
  }
  return false;
}

export function evaluateGrowthAutonomyExecution(
  input: GrowthAutonomyExecutionInput,
): GrowthAutonomyExecutionDecision {
  const reasons: string[] = [];
  const policy = input.policy;

  if (ALWAYS_BLOCKED.has(input.actionClass)) {
    reasons.push(`blocked_action_class:${input.actionClass}`);
  }

  if (!policy) {
    reasons.push("missing_policy");
  } else {
    if (!policy.enabled) reasons.push("policy_disabled");
    if (policy.kill_switch_enabled) reasons.push("kill_switch_enabled");
    if (policy.paused_reason) reasons.push("policy_paused");
    if (policy.lane !== input.lane) reasons.push("policy_lane_mismatch");
    if (policy.action_class !== input.actionClass) {
      reasons.push("policy_action_class_mismatch");
    }
    if (input.riskScore > policy.max_risk_score) {
      reasons.push("risk_score_exceeds_policy");
    }
    const maxRiskLevel = policy.max_risk_level ?? "medium";
    if (
      RISK_RANK[String(input.riskLevel ?? "medium")] >
      RISK_RANK[String(maxRiskLevel)]
    ) {
      reasons.push("risk_level_exceeds_policy");
    }
    if (policy.daily_cap > 0 && input.dailyUsed >= policy.daily_cap) {
      reasons.push("daily_cap_exceeded");
    }
    if (policy.weekly_cap > 0 && input.weeklyUsed >= policy.weekly_cap) {
      reasons.push("weekly_cap_exceeded");
    }
    for (const check of policy.required_checks ?? []) {
      if (!requiredCheckPassed(check, input)) {
        reasons.push(`missing_required_check:${check}`);
      }
    }
  }

  const allowedLanes = LANES_BY_ACTION[input.actionClass];
  if (!allowedLanes?.has(input.lane)) {
    reasons.push("lane_not_allowed_for_action");
  }

  const allowedTargets = TARGETS_BY_ACTION[input.actionClass];
  if (!input.targetTable || !allowedTargets?.has(input.targetTable)) {
    reasons.push("target_table_not_allowed");
  }

  if (!input.freshness.allowed) {
    reasons.push("profile_freshness_failed");
  }

  if (input.riskLevel === "blocked") {
    reasons.push("risk_level_blocked");
  }

  const allowed = reasons.length === 0;
  return {
    allowed,
    mode: allowed ? (policy?.dry_run_only ? "dry_run" : "live") : "blocked",
    policyId: policy?.id ?? null,
    requiredApproval: ALWAYS_BLOCKED.has(input.actionClass)
      ? "council"
      : allowed
        ? "none"
        : "curator",
    reasons,
    requiredProfilesMissing: input.freshness.missing,
    requiredProfilesStale: input.freshness.stale,
    requiredProfilesLowConfidence: input.freshness.lowConfidence,
  };
}
