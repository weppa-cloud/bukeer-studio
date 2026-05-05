import { evaluateGrowthRisk } from "@/lib/growth/autonomy/risk-policy";

describe("evaluateGrowthRisk — autonomous work policy", () => {
  it("lets low-risk internal routing continue without human review", () => {
    const out = evaluateGrowthRisk({
      lane: "orchestrator",
      actionClass: "follow_up_backlog_create",
      confidence: 0.9,
      riskLevel: "low",
      evidenceRefs: ["growth_backlog_items:abc"],
    });

    expect(out.requiresHumanReview).toBe(false);
    expect(out.requiredApproval).toBe("none");
    expect(out.autonomyLabel).toBe("sigue_solo");
  });

  it("escalates public publishing even with strong evidence", () => {
    const out = evaluateGrowthRisk({
      lane: "content_creator",
      actionClass: "content_publish",
      confidence: 0.98,
      riskLevel: "low",
      evidenceRefs: ["growth_agent_change_sets:abc"],
      hasRollback: true,
      laneAgreement: 1,
      smokePass: true,
    });

    expect(out.requiresHumanReview).toBe(true);
    expect(out.requiredApproval).toBe("curator");
    expect(out.reasons).toContain(
      "accion_sensible_siempre_requiere_aprobacion",
    );
  });

  it("escalates safe apply without rollback evidence", () => {
    const out = evaluateGrowthRisk({
      lane: "technical_remediation",
      actionClass: "safe_apply",
      confidence: 0.95,
      riskLevel: "low",
      evidenceRefs: ["smoke:pass"],
      hasRollback: false,
      laneAgreement: 0.96,
      smokePass: true,
    });

    expect(out.requiresHumanReview).toBe(true);
    expect(out.requiredApproval).toBe("curator");
    expect(out.riskLevel).toBe("medium");
  });
});
