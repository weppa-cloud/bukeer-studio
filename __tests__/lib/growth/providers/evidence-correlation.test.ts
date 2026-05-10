import {
  computeGrowthEvidenceFingerprint,
  evaluateGrowthEvidenceCorrelation,
} from "@/lib/growth/providers/evidence-correlation";

describe("growth evidence correlation", () => {
  it("ignores volatile run fields in fingerprints", () => {
    const first = computeGrowthEvidenceFingerprint({
      profile_run_id: "run-a",
      cycle_id: "cycle-a",
      query: "colombia tours",
      metrics: { impressions: 100 },
    });
    const second = computeGrowthEvidenceFingerprint({
      profile_run_id: "run-b",
      cycle_id: "cycle-b",
      query: "colombia tours",
      metrics: { impressions: 100 },
    });

    expect(first).toBe(second);
  });

  it("coalesces active equivalent work", () => {
    const result = evaluateGrowthEvidenceCorrelation({
      websiteId: "website-1",
      decisionFamily: "provider_intelligence",
      entityKey: "url:/blog/colombia",
      actionKey: "content_publish:url:/blog/colombia",
      evidence: { query: "colombia tours", impressions: 100 },
      existingWork: [{ id: "11111111-1111-4111-8111-111111111111", status: "ready" }],
    });

    expect(result.dedupe_verdict).toBe("coalesce");
    expect(result.coalesced_with_work_item_id).toBe(
      "11111111-1111-4111-8111-111111111111",
    );
  });

  it("reopens failed work when evidence materially changes", () => {
    const oldFingerprint = computeGrowthEvidenceFingerprint({
      query: "colombia tours",
      impressions: 100,
    });
    const result = evaluateGrowthEvidenceCorrelation({
      websiteId: "website-1",
      decisionFamily: "provider_intelligence",
      entityKey: "url:/blog/colombia",
      actionKey: "content_publish:url:/blog/colombia",
      evidence: { query: "colombia tours", impressions: 500 },
      existingWork: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          status: "rolled_back",
          evidence: {
            correlation: {
              evidence_fingerprint: oldFingerprint,
            },
          },
        },
      ],
    });

    expect(result.dedupe_verdict).toBe("reopen");
    expect(result.material_evidence_change).toBe(true);
  });
});
