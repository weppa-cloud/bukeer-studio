import {
  evaluateDueGrowthOutcomes,
  evaluateGrowthOutcome,
} from "@/lib/growth/autonomy/outcome-evaluator";

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

  it("proposes memory and replay candidates from terminal outcomes", async () => {
    const calls: Array<{ table: string; op: string; payload?: unknown }> = [];
    const rowsByTable: Record<string, unknown[]> = {
      growth_work_item_outcomes: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          account_id: "9fc24733-b127-4184-aa22-12f03b98927a",
          website_id: "894545b7-73ca-4dae-b76a-da5b6a3f8441",
          work_item_id: "22222222-2222-4222-8222-222222222222",
          publication_job_id: "33333333-3333-4333-8333-333333333333",
          status: "measuring",
          success_metric: "organic_clicks",
          baseline: { organic_clicks: 10 },
          current_result: { organic_clicks: 6 },
          evaluation_date: "2026-05-08",
        },
      ],
      growth_signal_facts: [],
      growth_work_items: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          lane: "content_creator",
          title: "Lost content pattern",
          allowed_action_class: "content_publish",
          run_id: "44444444-4444-4444-8444-444444444444",
        },
      ],
    };

    function builder(table: string) {
      let payload: unknown;
      let finalWrite = false;
      let chain: {
        select: jest.Mock;
        eq: jest.Mock;
        in: jest.Mock;
        lte: jest.Mock;
        order: jest.Mock;
        limit: jest.Mock;
        update: jest.Mock;
        upsert: jest.Mock;
        insert: jest.Mock;
      };
      chain = {
        select: jest.fn(() =>
          finalWrite
            ? Promise.resolve({
                data: [{ id: `${table}-row` }],
                error: null,
              })
            : chain,
        ),
        eq: jest.fn(() => chain),
        in: jest.fn(() => chain),
        lte: jest.fn(() => chain),
        order: jest.fn(() => chain),
        limit: jest.fn(() =>
          Promise.resolve({
            data: rowsByTable[table] ?? [],
            error: null,
          }),
        ),
        update: jest.fn((patch: unknown) => {
          finalWrite = true;
          calls.push({ table, op: "update", payload: patch });
          return chain;
        }),
        upsert: jest.fn((patch: unknown) => {
          payload = patch;
          finalWrite = true;
          calls.push({ table, op: "upsert", payload: patch });
          return chain;
        }),
        insert: jest.fn((patch: unknown) => {
          payload = patch;
          finalWrite = true;
          calls.push({ table, op: "insert", payload: patch });
          return chain;
        }),
      };
      return chain;
    }

    const result = await evaluateDueGrowthOutcomes({
      supabase: { from: jest.fn((table: string) => builder(table)) } as never,
      accountId: "9fc24733-b127-4184-aa22-12f03b98927a",
      websiteId: "894545b7-73ca-4dae-b76a-da5b6a3f8441",
      now: new Date("2026-05-09T00:00:00.000Z"),
    });

    expect(result.evaluated[0].decision.status).toBe("lost");
    expect(result.learningCandidates).toBe(2);
    expect(calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ table: "growth_agent_memories", op: "insert" }),
        expect.objectContaining({
          table: "growth_agent_replay_cases",
          op: "insert",
        }),
      ]),
    );
    expect(
      calls.find((call) => call.table === "growth_agent_memories")?.payload,
    ).toMatchObject({
      status: "draft",
      lane: "content_creator",
      content: expect.objectContaining({
        influence: "avoid_repeat_without_new_evidence",
      }),
    });
  });
});
