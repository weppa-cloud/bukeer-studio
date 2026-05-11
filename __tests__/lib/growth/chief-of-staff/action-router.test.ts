jest.mock("server-only", () => ({}), { virtual: true });

const mockEnqueueGrowthAgentWakeup = jest.fn();

jest.mock("@/lib/growth/agentic/wakeup-queue", () => ({
  enqueueGrowthAgentWakeup: mockEnqueueGrowthAgentWakeup,
}));

import {
  classifyChiefOfStaffIntent,
  routeChiefOfStaffAction,
} from "@/lib/growth/chief-of-staff/action-router";

const accountId = "9fc24733-b127-4184-aa22-12f03b98927a";
const websiteId = "894545b7-73ca-4dae-b76a-da5b6a3f8441";
const userId = "00000000-0000-4000-8000-000000000001";

function fakeSupabase(actionId = "00000000-0000-4000-8000-000000000010") {
  const inserts: Record<string, unknown>[] = [];
  const updates: Record<string, unknown>[] = [];
  let chain: {
    insert: jest.Mock;
    update: jest.Mock;
    select: jest.Mock;
    limit: jest.Mock;
    eq: jest.Mock;
  };

  chain = {
    insert: jest.fn((payload: Record<string, unknown>) => {
      inserts.push(payload);
      return chain;
    }),
    update: jest.fn((payload: Record<string, unknown>) => {
      updates.push(payload);
      return chain;
    }),
    select: jest.fn(() => chain),
    limit: jest.fn(() =>
      Promise.resolve({
        data: [{ id: actionId }],
        error: null,
      }),
    ),
    eq: jest.fn(() => chain),
  };

  return {
    inserts,
    updates,
    supabase: {
      from: jest.fn(() => chain),
    },
  };
}

describe("Growth Chief of Staff action router", () => {
  beforeEach(() => {
    mockEnqueueGrowthAgentWakeup.mockReset();
  });

  it("hard-blocks sensitive mutations before any wakeup is queued", async () => {
    const route = classifyChiefOfStaffIntent(
      "Sube pricing y activa una campaign paid ahora",
    );
    expect(route.actionClass).toBe("forbidden");
    expect(route.allowed).toBe(false);

    const fake = fakeSupabase();
    const result = await routeChiefOfStaffAction({
      supabase: fake.supabase as never,
      accountId,
      websiteId,
      userId,
      intent: "Sube pricing y activa una campaign paid ahora",
      now: new Date("2026-05-11T10:00:00.000Z"),
    });

    expect(result.actionClass).toBe("forbidden");
    expect(result.status).toBe("blocked");
    expect(result.policyVerdict).toMatchObject({
      allowed: false,
      reason: "sensitive_surface_hard_blocked",
      mutation_boundary: "growth_os_executor",
    });
    expect(mockEnqueueGrowthAgentWakeup).not.toHaveBeenCalled();
    expect(fake.inserts[0]).toMatchObject({
      action_class: "forbidden",
      status: "blocked",
      completed_at: "2026-05-11T10:00:00.000Z",
    });
  });

  it("enqueues safe brain requests and stores the wakeup reference", async () => {
    mockEnqueueGrowthAgentWakeup.mockResolvedValue({
      id: "wakeup-1",
      status: "queued",
    });
    const fake = fakeSupabase();

    const result = await routeChiefOfStaffAction({
      supabase: fake.supabase as never,
      accountId,
      websiteId,
      userId,
      intent: "Invoke brain now and analiza nuevas oportunidades",
      payload: { reason: "test" },
      now: new Date("2026-05-11T10:05:00.000Z"),
    });

    expect(result.actionClass).toBe("enqueue_wakeup");
    expect(result.status).toBe("queued");
    expect(result.wakeup?.id).toBe("wakeup-1");
    expect(mockEnqueueGrowthAgentWakeup).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId,
        websiteId,
        lane: "orchestrator",
        source: "user_on_demand",
        priority: 90,
        idempotencyKey: `chief:${websiteId}:orchestrator:2026-05-11T10:05`,
      }),
    );
    expect(fake.updates[0]).toMatchObject({
      result_payload: {
        wakeup_id: "wakeup-1",
        wakeup_status: "queued",
      },
      created_refs: ["growth_agent_wakeup_requests:wakeup-1"],
    });
  });
});
