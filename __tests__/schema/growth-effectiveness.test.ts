import {
  GrowthEffectivenessExperimentInsertSchema,
  GrowthEffectivenessObservationInsertSchema,
} from "@bukeer/website-contract";

const accountId = "9fc24733-b127-4184-aa22-12f03b98927a";
const websiteId = "894545b7-73ca-4dae-b76a-da5b6a3f8441";
const experimentId = "00000000-0000-4000-8000-000000000471";

describe("Growth effectiveness experiment contracts", () => {
  it("validates the human vs deterministic vs Hermes experiment contract", () => {
    const parsed = GrowthEffectivenessExperimentInsertSchema.parse({
      account_id: accountId,
      website_id: websiteId,
      experiment_key: "effectiveness:colombiatours:2026-05-11",
      title: "Growth OS + Hermes vs human Codex baseline",
      objective:
        "Compare accepted artifacts, safety, quality, cost and outcomes through the same executor.",
      status: "running",
      lane_targets: {
        technical_remediation: 10,
        content_creator: 5,
        transcreation: 5,
      },
      success_criteria: {
        speed_improvement_vs_human_min: 0.3,
        safety_violations_max: 0,
      },
      evidence_snapshot: {
        captured_at: "2026-05-11T21:00:00.000Z",
        sources: { profile_runs: 12 },
      },
    });

    expect(parsed.baseline_actor).toBe("baseline_human_codex");
    expect(parsed.source_groups).toEqual([
      "baseline_human_codex",
      "growth_os_deterministic",
      "growth_os_hermes_isolated",
    ]);
  });

  it("validates observations with lineage to executor artifacts and outcomes", () => {
    const parsed = GrowthEffectivenessObservationInsertSchema.parse({
      account_id: accountId,
      website_id: websiteId,
      experiment_id: experimentId,
      source_group: "growth_os_hermes_isolated",
      lane: "technical_remediation",
      status: "measuring",
      idempotency_key: "hermes:technical:fix-title:1",
      evidence_snapshot: { profile_run_ids: [] },
      metrics: {
        gate_pass: true,
        smoke_pass: true,
        duplicate_noise: false,
        missing_evidence: false,
      },
      timing: { minutes_to_accepted: 3.5 },
      cost: { total_usd: 0.08 },
      quality_verdict: { gate_pass: true, smoke_pass: true },
      safety_verdict: {
        sensitive_mutation_attempt: false,
        direct_mutation_outside_executor: false,
      },
      profile_run_ids: [],
    });

    expect(parsed.status).toBe("measuring");
    expect(parsed.source_group).toBe("growth_os_hermes_isolated");
  });

  it("rejects unknown source groups", () => {
    expect(() =>
      GrowthEffectivenessObservationInsertSchema.parse({
        account_id: accountId,
        website_id: websiteId,
        experiment_id: experimentId,
        source_group: "random_agent",
        lane: "content_creator",
        idempotency_key: "bad:source",
      }),
    ).toThrow();
  });
});
