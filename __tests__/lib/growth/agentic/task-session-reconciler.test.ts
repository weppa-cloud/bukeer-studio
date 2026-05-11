import { reconcileGrowthTaskSessions } from "@/lib/growth/agentic/task-session-reconciler";

function supabaseMock() {
  const sessions = [
    {
      id: "11111111-1111-4111-8111-111111111111",
      account_id: "acct",
      website_id: "web",
      assigned_agent_lane: "technical_remediation",
      status: "assigned",
      session_state: {},
      attempt_count: 0,
      created_at: "2026-05-11T00:00:00.000Z",
    },
  ];
  const updates: Array<{ table: string; payload: Record<string, unknown> }> = [];
  return {
    sessions,
    updates,
    from(table: string) {
      const selectQuery = {
        eq: () => selectQuery,
        in: () => selectQuery,
        lt: () => selectQuery,
        order: () => selectQuery,
        limit: () => Promise.resolve({ data: table === "growth_agent_task_sessions" ? sessions : [], error: null }),
      };
      return {
        select: () => selectQuery,
        update: (payload: Record<string, unknown>) => {
          updates.push({ table, payload });
          return {
            eq: () => ({
              eq: () => ({
                in: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
          };
        },
      };
    },
  };
}

describe("reconcileGrowthTaskSessions", () => {
  it("closes assigned sessions against executor outcomes", async () => {
    const supabase = supabaseMock();
    const result = await reconcileGrowthTaskSessions({
      supabase: supabase as never,
      accountId: "acct",
      websiteId: "web",
      cycleId: "cycle-1",
      taskSessionIds: ["11111111-1111-4111-8111-111111111111"],
      executions: [
        {
          lane: "technical_remediation",
          workItemId: "22222222-2222-4222-8222-222222222222",
          runId: "run-1",
          quality: { allowed: true, reasons: [] },
          publicationResult: {
            applied: true,
            publicationJobId: "33333333-3333-4333-8333-333333333333",
            status: "smoke_passed",
          },
        },
      ],
      now: new Date("2026-05-11T01:00:00.000Z"),
    });

    expect(result.linkedSessionIds).toEqual([
      "11111111-1111-4111-8111-111111111111",
    ]);
    expect(supabase.updates[0].payload).toMatchObject({
      status: "completed",
      child_work_item_id: "22222222-2222-4222-8222-222222222222",
      completed_at: "2026-05-11T01:00:00.000Z",
    });
  });
});
