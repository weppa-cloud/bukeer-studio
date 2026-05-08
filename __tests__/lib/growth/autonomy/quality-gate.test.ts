import { evaluateGrowthRuntimeQualityGate } from "@/lib/growth/autonomy/quality-gate";
import type { GrowthAutonomyPolicyLike } from "@/lib/growth/autonomy/live-gate";
import type { ProfileFreshnessGateResult } from "@/lib/growth/autonomy/profile-freshness-gate";

const policy: GrowthAutonomyPolicyLike = {
  id: "11111111-1111-4111-8111-111111111111",
  lane: "content_creator",
  action_class: "content_publish",
  enabled: true,
  dry_run_only: false,
  kill_switch_enabled: false,
  max_risk_level: "medium",
  max_risk_score: 60,
  daily_cap: 10,
  weekly_cap: 20,
  required_checks: [
    "before_snapshot",
    "rollback_payload",
    "smoke_check",
    "baseline",
    "success_metric",
    "evaluation_date",
    "no_paid_mutation",
  ],
};

const freshness: ProfileFreshnessGateResult = {
  allowed: true,
  snapshot: { risk_policy: { id: "risk" } },
  missing: [],
  stale: [],
  lowConfidence: [],
};

describe("evaluateGrowthRuntimeQualityGate", () => {
  it("downgrades otherwise-live execution to dry-run unless explicitly allowed", () => {
    const decision = evaluateGrowthRuntimeQualityGate({
      lane: "content_creator",
      actionClass: "content_publish",
      targetTable: "website_blog_posts",
      targetPath: "/blog/guide",
      riskScore: 35,
      riskLevel: "medium",
      policy,
      freshness,
      dailyUsed: 0,
      weeklyUsed: 0,
      beforeSnapshot: { exists: false },
      rollbackPayload: { delete_created_slug: "guide" },
      rollbackExpectation: { strategy: "delete_created_content" },
      smoke: { pass: true, checks: ["ok"], failures: [] },
      baseline: { organic_clicks: 0 },
      successMetric: "organic_clicks:guide",
      evaluationWindow: "day_21",
      evaluationDate: "2026-05-29",
      outcomes: [{ success_metric: "organic_clicks:guide", evaluation_window: "day_21" }],
      allowLiveMutation: false,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.executionMode).toBe("blocked");
    expect(decision.reasons).toContain("live_mutation_disabled_by_runtime");
  });

  it("blocks missing outcome and rollback evidence", () => {
    const decision = evaluateGrowthRuntimeQualityGate({
      lane: "content_creator",
      actionClass: "content_publish",
      targetTable: "website_blog_posts",
      targetPath: "/blog/guide",
      riskScore: 35,
      policy,
      freshness,
      dailyUsed: 0,
      weeklyUsed: 0,
      beforeSnapshot: { exists: false },
      smoke: { pass: true, checks: ["ok"], failures: [] },
      rollbackExpectation: { strategy: "delete_created_content" },
      baseline: { organic_clicks: 0 },
      successMetric: "organic_clicks:guide",
      evaluationWindow: "day_21",
      evaluationDate: "2026-05-29",
      outcomes: [],
      allowLiveMutation: true,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reasons).toEqual(
      expect.arrayContaining([
        "missing_required_check:rollback_payload",
        "missing_outcome_plan",
      ]),
    );
  });

  it("blocks live execution when target, rollback expectation, baseline, metric, or window is missing", () => {
    const decision = evaluateGrowthRuntimeQualityGate({
      lane: "content_creator",
      actionClass: "content_publish",
      targetTable: "website_blog_posts",
      riskScore: 35,
      policy,
      freshness,
      dailyUsed: 0,
      weeklyUsed: 0,
      beforeSnapshot: { exists: false },
      rollbackPayload: { delete_created_slug: "guide" },
      smoke: { pass: true, checks: ["ok"], failures: [] },
      outcomes: [{ baseline: {} }],
      allowLiveMutation: true,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reasons).toEqual(
      expect.arrayContaining([
        "missing_target",
        "missing_rollback_expectation",
        "missing_required_check:baseline",
        "missing_required_check:success_metric",
        "missing_evaluation_window",
      ]),
    );
  });
});
