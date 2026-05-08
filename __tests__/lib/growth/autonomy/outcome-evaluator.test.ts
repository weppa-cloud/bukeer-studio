import { evaluateGrowthOutcome } from "@/lib/growth/autonomy/outcome-evaluator";

describe("evaluateGrowthOutcome", () => {
  it("marks an outcome as won when signal facts exceed the lift threshold", () => {
    const decision = evaluateGrowthOutcome({
      now: new Date("2026-05-30T12:00:00.000Z"),
      outcome: {
        success_metric: "organic_clicks:guide",
        baseline: { organic_clicks: 10 },
        current_result: {},
        evaluation_date: "2026-05-29",
      },
      signalFacts: [
        {
          id: "signal-1",
          source: "gsc",
          observed_at: "2026-05-30T00:00:00.000Z",
          payload: { organic_clicks: 14 },
        },
      ],
    });

    expect(decision.status).toBe("won");
    expect(decision.delta).toBe(4);
    expect(decision.relativeLift).toBeCloseTo(0.4);
  });

  it("keeps future evaluations measuring", () => {
    const decision = evaluateGrowthOutcome({
      now: new Date("2026-05-08T12:00:00.000Z"),
      outcome: {
        success_metric: "organic_clicks:guide",
        baseline: { organic_clicks: 10 },
        current_result: { organic_clicks: 20 },
        evaluation_date: "2026-05-29",
      },
    });

    expect(decision.status).toBe("measuring");
    expect(decision.reason).toBe("evaluation_date_in_future");
  });
});
