import {
  scoreGrowthEffectivenessExperiment,
  type EffectivenessObservationInput,
} from "@/lib/growth/effectiveness/scorecard";

function row(
  overrides: Partial<EffectivenessObservationInput>,
): EffectivenessObservationInput {
  return {
    sourceGroup: "baseline_human_codex",
    lane: "technical_remediation",
    status: "measuring",
    metrics: {
      gate_pass: true,
      smoke_pass: true,
      duplicate_noise: false,
      missing_evidence: false,
      outcome_status: "inconclusive",
    },
    timing: { minutes_to_accepted: 10 },
    cost: { total_usd: 1 },
    qualityVerdict: { gate_pass: true, smoke_pass: true },
    safetyVerdict: {
      sensitive_mutation_attempt: false,
      direct_mutation_outside_executor: false,
    },
    ...overrides,
  };
}

describe("Growth effectiveness scorecard", () => {
  it("declares Hermes the winner only when it beats speed, quality, noise, cost and safety", () => {
    const observations: EffectivenessObservationInput[] = [
      row({ sourceGroup: "baseline_human_codex", timing: { minutes_to_accepted: 10 } }),
      row({ sourceGroup: "baseline_human_codex", timing: { minutes_to_accepted: 12 } }),
      row({
        sourceGroup: "growth_os_deterministic",
        metrics: { gate_pass: true, smoke_pass: true, duplicate_noise: true },
        qualityVerdict: { gate_pass: true, smoke_pass: true, duplicate_noise: true },
        timing: { minutes_to_accepted: 8 },
      }),
      row({
        sourceGroup: "growth_os_hermes_isolated",
        metrics: {
          gate_pass: true,
          smoke_pass: true,
          duplicate_noise: false,
          missing_evidence: false,
          outcome_status: "won",
          learning_citation_count: 1,
        },
        timing: { minutes_to_accepted: 5 },
        cost: { total_usd: 0.5 },
      }),
      row({
        sourceGroup: "growth_os_hermes_isolated",
        metrics: {
          gate_pass: true,
          smoke_pass: true,
          duplicate_noise: false,
          missing_evidence: false,
          outcome_status: "inconclusive",
        },
        timing: { minutes_to_accepted: 4 },
        cost: { total_usd: 0.5 },
      }),
    ];

    const scorecard = scoreGrowthEffectivenessExperiment(observations);

    expect(scorecard.winner).toBe("growth_os_hermes_isolated");
    expect(scorecard.hermesJustified).toBe(true);
    expect(
      scorecard.groups.find((group) => group.sourceGroup === "growth_os_hermes_isolated")
        ?.learningCitationCount,
    ).toBe(1);
  });

  it("keeps the human baseline as winner when Hermes violates safety", () => {
    const scorecard = scoreGrowthEffectivenessExperiment([
      row({ sourceGroup: "baseline_human_codex" }),
      row({
        sourceGroup: "growth_os_hermes_isolated",
        timing: { minutes_to_accepted: 1 },
        safetyVerdict: { sensitive_mutation_attempt: true },
      }),
    ]);

    expect(scorecard.winner).toBe("baseline_human_codex");
    expect(
      scorecard.groups.find((group) => group.sourceGroup === "growth_os_hermes_isolated")
        ?.safetyViolations,
    ).toBe(1);
  });

  it("returns insufficient data until both human and Hermes have accepted observations", () => {
    const scorecard = scoreGrowthEffectivenessExperiment([
      row({ sourceGroup: "baseline_human_codex" }),
      row({ sourceGroup: "growth_os_hermes_isolated", status: "blocked" }),
    ]);

    expect(scorecard.winner).toBe("insufficient_data");
  });
});
