import { evaluateGrowthAutonomyExecution } from "@/lib/growth/autonomy/live-gate";
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
  daily_cap: 5,
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

const checks = {
  beforeSnapshot: true,
  rollbackPayload: true,
  smokeCheck: true,
  baseline: true,
  successMetric: true,
  evaluationDate: true,
};

describe("evaluateGrowthAutonomyExecution", () => {
  it("allows live organic content when policy, caps, freshness and checks pass", () => {
    const decision = evaluateGrowthAutonomyExecution({
      lane: "content_creator",
      actionClass: "content_publish",
      targetTable: "website_blog_posts",
      riskScore: 35,
      riskLevel: "medium",
      policy,
      freshness,
      dailyUsed: 0,
      weeklyUsed: 0,
      checks,
    });

    expect(decision.allowed).toBe(true);
    expect(decision.mode).toBe("live");
    expect(decision.requiredApproval).toBe("none");
  });

  it("keeps paid, experiment and outreach actions blocked regardless of policy", () => {
    for (const actionClass of [
      "paid_mutation",
      "experiment_activation",
      "outreach_send",
    ] as const) {
      const decision = evaluateGrowthAutonomyExecution({
        lane: "content_curator",
        actionClass,
        targetTable: "website_pages",
        riskScore: 1,
        riskLevel: "low",
        policy: { ...policy, lane: "content_curator", action_class: actionClass },
        freshness,
        dailyUsed: 0,
        weeklyUsed: 0,
        checks,
      });

      expect(decision.allowed).toBe(false);
      expect(decision.requiredApproval).toBe("council");
      expect(decision.reasons).toContain(`blocked_action_class:${actionClass}`);
    }
  });

  it("allows safe_apply only for technical lane targets and reversible checks", () => {
    const allowed = evaluateGrowthAutonomyExecution({
      lane: "technical_remediation",
      actionClass: "safe_apply",
      targetTable: "website_sections",
      riskScore: 20,
      riskLevel: "low",
      policy: {
        ...policy,
        lane: "technical_remediation",
        action_class: "safe_apply",
        required_checks: ["technical_reversibility", "rollback_payload"],
      },
      freshness,
      dailyUsed: 0,
      weeklyUsed: 0,
      checks: { ...checks, technicalReversibility: true },
    });

    const blocked = evaluateGrowthAutonomyExecution({
      lane: "content_creator",
      actionClass: "safe_apply",
      targetTable: "website_blog_posts",
      riskScore: 20,
      riskLevel: "low",
      policy: {
        ...policy,
        lane: "content_creator",
        action_class: "safe_apply",
        required_checks: ["technical_reversibility", "rollback_payload"],
      },
      freshness,
      dailyUsed: 0,
      weeklyUsed: 0,
      checks,
    });

    expect(allowed.allowed).toBe(true);
    expect(blocked.allowed).toBe(false);
    expect(blocked.reasons).toEqual(
      expect.arrayContaining([
        "lane_not_allowed_for_action",
        "target_table_not_allowed",
        "missing_required_check:technical_reversibility",
      ]),
    );
  });

  it("blocks stale profiles and caps exceeded", () => {
    const decision = evaluateGrowthAutonomyExecution({
      lane: "content_creator",
      actionClass: "content_publish",
      targetTable: "website_blog_posts",
      riskScore: 35,
      riskLevel: "medium",
      policy,
      freshness: {
        allowed: false,
        snapshot: {},
        missing: ["buyer"],
        stale: ["seo_market"],
        lowConfidence: [],
      },
      dailyUsed: 5,
      weeklyUsed: 0,
      checks,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reasons).toEqual(
      expect.arrayContaining(["daily_cap_exceeded", "profile_freshness_failed"]),
    );
    expect(decision.requiredProfilesMissing).toContain("buyer");
  });
});
