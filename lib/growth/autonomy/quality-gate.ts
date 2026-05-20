import type {
  AgentLane,
  GrowthAutonomyActionClass,
  GrowthPublicationTargetTable,
  GrowthWorkItemOutcomeInsert,
} from "@bukeer/website-contract";

import {
  evaluateGrowthAutonomyExecution,
  type GrowthAutonomyPolicyLike,
} from "./live-gate";
import type { ProfileFreshnessGateResult } from "./profile-freshness-gate";
import { asRecord, type JsonRecord } from "./runtime-common";
import {
  evaluateSeo360BenchmarkGate,
  type Seo360BenchmarkGateInput,
} from "./seo360-quality-gate";

export interface GrowthRuntimeQualityGateInput {
  lane: AgentLane;
  actionClass: GrowthAutonomyActionClass;
  targetTable?: GrowthPublicationTargetTable | null;
  targetId?: string | null;
  targetPath?: string | null;
  riskScore: number;
  riskLevel?: "low" | "medium" | "high" | "blocked" | string | null;
  policy: GrowthAutonomyPolicyLike | null;
  freshness: ProfileFreshnessGateResult;
  dailyUsed: number;
  weeklyUsed: number;
  beforeSnapshot?: JsonRecord | null;
  rollbackPayload?: JsonRecord | null;
  rollbackExpectation?: JsonRecord | null;
  smoke?: { pass: boolean; checks?: string[]; failures?: string[] } | null;
  baseline?: JsonRecord | null;
  successMetric?: string | null;
  evaluationWindow?: string | null;
  evaluationDate?: string | null;
  outcomes?: Array<Partial<GrowthWorkItemOutcomeInsert>>;
  allowLiveMutation?: boolean;
}

export interface GrowthRuntimeQualityGateDecision {
  allowed: boolean;
  executionMode: "dry_run" | "live" | "blocked";
  requiredApproval: "none" | "curator" | "council";
  policyId: string | null;
  reasons: string[];
}

export interface GrowthEditorialQualityGateInput {
  actionClass: GrowthAutonomyActionClass;
  title?: string | null;
  body?: string | null;
  supportedFacts?: unknown[];
  sourceLocale?: string | null;
  targetLocale?: string | null;
  glossaryTerms?: unknown[];
  targetTable?: string | null;
  seo360?: Seo360BenchmarkGateInput | null;
}

function hasRecord(value: unknown): boolean {
  return Object.keys(asRecord(value)).length > 0;
}

function validDateOnly(value: string | null | undefined): boolean {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function hasTargetReference(input: GrowthRuntimeQualityGateInput): boolean {
  return Boolean(
    input.targetTable &&
      (input.targetId?.trim() || input.targetPath?.trim()),
  );
}

function hasOutcomeWindow(
  input: GrowthRuntimeQualityGateInput,
): boolean {
  if (typeof input.evaluationWindow === "string" && input.evaluationWindow.trim()) {
    return true;
  }
  return (input.outcomes ?? []).some(
    (outcome) =>
      typeof outcome.evaluation_window === "string" &&
      outcome.evaluation_window.trim().length > 0,
  );
}

export function evaluateGrowthRuntimeQualityGate(
  input: GrowthRuntimeQualityGateInput,
): GrowthRuntimeQualityGateDecision {
  const checks = {
    targetReference: hasTargetReference(input),
    beforeSnapshot: hasRecord(input.beforeSnapshot),
    rollbackPayload: hasRecord(input.rollbackPayload),
    rollbackExpectation: hasRecord(input.rollbackExpectation),
    smokeCheck: input.smoke?.pass === true,
    baseline: hasRecord(input.baseline),
    successMetric: Boolean(input.successMetric?.trim()),
    evaluationWindow: hasOutcomeWindow(input),
    evaluationDate: validDateOnly(input.evaluationDate),
    tenantAllowlist: true,
    technicalReversibility:
      input.actionClass !== "safe_apply" || hasRecord(input.rollbackPayload),
  };

  const decision = evaluateGrowthAutonomyExecution({
    lane: input.lane,
    actionClass: input.actionClass,
    targetTable: input.targetTable ?? null,
    riskScore: input.riskScore,
    riskLevel: input.riskLevel,
    policy: input.policy,
    freshness: input.freshness,
    dailyUsed: input.dailyUsed,
    weeklyUsed: input.weeklyUsed,
    checks,
  });
  const reasons = [...decision.reasons];

  if ((input.outcomes ?? []).length === 0) {
    reasons.push("missing_outcome_plan");
  }
  if (!checks.targetReference) reasons.push("missing_target");
  if (!checks.rollbackExpectation) reasons.push("missing_rollback_expectation");
  if (!checks.evaluationWindow) reasons.push("missing_evaluation_window");
  if (input.allowLiveMutation !== true && decision.mode === "live") {
    reasons.push("live_mutation_disabled_by_runtime");
  }
  if (input.smoke?.failures?.length) {
    reasons.push(...input.smoke.failures.map((failure) => `smoke:${failure}`));
  }

  const allowed = reasons.length === 0;
  return {
    allowed,
    executionMode: allowed
      ? input.allowLiveMutation === true && decision.mode === "live"
        ? "live"
        : "dry_run"
      : "blocked",
    requiredApproval: decision.requiredApproval,
    policyId: decision.policyId,
    reasons,
  };
}

export function evaluateGrowthQualityGate(
  input: GrowthRuntimeQualityGateInput | GrowthEditorialQualityGateInput,
) {
  if ("lane" in input) return evaluateGrowthRuntimeQualityGate(input);
  const failures: string[] = [];
  if (input.actionClass === "content_publish") {
    if (!input.title || String(input.title).trim().length < 10) {
      failures.push("title_too_short");
    }
    const words = String(input.body ?? "").trim().split(/\s+/).filter(Boolean);
    if (words.length < 300) failures.push("content_too_thin");
    if (!Array.isArray(input.supportedFacts) || input.supportedFacts.length === 0) {
      failures.push("missing_supported_facts");
    }
  }
  if (input.actionClass === "transcreation_merge") {
    if (!input.sourceLocale || input.sourceLocale === input.targetLocale) {
      failures.push("locale_mismatch_required");
    }
    if (!Array.isArray(input.glossaryTerms) || input.glossaryTerms.length === 0) {
      failures.push("missing_glossary_or_tm_context");
    }
  }
  if (
    (input.actionClass === "content_publish" ||
      input.actionClass === "transcreation_merge") &&
    input.seo360
  ) {
    const seo360 = evaluateSeo360BenchmarkGate(input.seo360);
    if (!seo360.passed) failures.push(...seo360.reasons);
  }
  if (
    input.actionClass === "safe_apply" &&
    !["website_pages", "website_sections", "product_seo_overrides"].includes(
      input.targetTable ?? "",
    )
  ) {
    failures.push("unsupported_safe_apply_target");
  }
  return { passed: failures.length === 0, checks: [], failures };
}
