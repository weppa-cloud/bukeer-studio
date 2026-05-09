jest.mock("server-only", () => ({}), { virtual: true });

import { tryRecordGrowthSchedulerHeartbeat } from "@/lib/growth/autonomy/cycle-ledger";
import {
  claimGrowthAgentWakeup,
  enqueueGrowthAgentWakeup,
  renewGrowthAgentWakeupLease,
} from "@/lib/growth/agentic/wakeup-queue";
import { resolveGrowthSchedulerStatus } from "@/lib/growth/console/queries-ceo-cockpit";

describe("Growth OS Paperclip heartbeat protocol v2", () => {
  it("keeps scheduler heartbeat writes best-effort", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const supabase = {
      from: () => ({
        upsert: () => ({ error: { message: "temporary telemetry outage" } }),
      }),
    };

    await expect(
      tryRecordGrowthSchedulerHeartbeat({
        supabase: supabase as never,
        accountId: "9fc24733-b127-4184-aa22-12f03b98927a",
        websiteId: "894545b7-73ca-4dae-b76a-da5b6a3f8441",
        lastCycleId: "00000000-0000-0000-0000-000000000001",
      }),
    ).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("scheduler heartbeat skipped"),
    );
    warn.mockRestore();
  });

  it("uses interval_ms to classify scheduler staleness", () => {
    expect(
      resolveGrowthSchedulerStatus({
        missingTables: false,
        rawStatus: "healthy",
        heartbeatAgeMs: 59_000,
        intervalMs: 30_000,
      }),
    ).toBe("healthy");
    expect(
      resolveGrowthSchedulerStatus({
        missingTables: false,
        rawStatus: "healthy",
        heartbeatAgeMs: 75_000,
        intervalMs: 30_000,
      }),
    ).toBe("degraded");
    expect(
      resolveGrowthSchedulerStatus({
        missingTables: false,
        rawStatus: "healthy",
        heartbeatAgeMs: 95_000,
        intervalMs: 30_000,
      }),
    ).toBe("stale");
    expect(
      resolveGrowthSchedulerStatus({
        missingTables: false,
        rawStatus: "failed",
        heartbeatAgeMs: 1_000,
        intervalMs: 30_000,
      }),
    ).toBe("failed");
  });

  it("coalesces duplicate wakeup requests instead of resetting them", async () => {
    const existing = {
      id: "wakeup-1",
      account_id: "9fc24733-b127-4184-aa22-12f03b98927a",
      website_id: "894545b7-73ca-4dae-b76a-da5b6a3f8441",
      lane: "orchestrator",
      source: "user_on_demand",
      status: "claimed",
      priority: 50,
      idempotency_key: "ui:on_demand:test",
      coalesced_count: 2,
      payload: { previous: true },
    };
    const terminalResults = [
      { data: [existing], error: null },
      {
        data: [
          {
            ...existing,
            status: "queued",
            priority: 90,
            coalesced_count: 3,
            payload: { requested_by: "tester" },
          },
        ],
        error: null,
      },
    ];
    const updates: Record<string, unknown>[] = [];
    let chain: {
      select: jest.Mock;
      eq: jest.Mock;
      update: jest.Mock;
      limit: jest.Mock;
    };
    chain = {
      select: jest.fn(() => chain),
      eq: jest.fn(() => chain),
      update: jest.fn((patch: Record<string, unknown>) => {
        updates.push(patch);
        return chain;
      }),
      limit: jest.fn(() => Promise.resolve(terminalResults.shift())),
    };
    const supabase = { from: jest.fn(() => chain) };

    const wakeup = await enqueueGrowthAgentWakeup({
      supabase: supabase as never,
      accountId: existing.account_id,
      websiteId: existing.website_id,
      lane: "orchestrator",
      source: "user_on_demand",
      priority: 90,
      idempotencyKey: existing.idempotency_key,
      payload: { requested_by: "tester" },
    });

    expect(wakeup.status).toBe("queued");
    expect(wakeup.coalesced_count).toBe(3);
    expect(updates[0]).toMatchObject({
      status: "queued",
      priority: 90,
      coalesced_count: 3,
      last_error: null,
    });
  });

  it("recovers an expired claimed wakeup with a new lease", async () => {
    const expiredWakeup = {
      id: "wakeup-expired",
      account_id: "9fc24733-b127-4184-aa22-12f03b98927a",
      website_id: "894545b7-73ca-4dae-b76a-da5b6a3f8441",
      lane: "orchestrator",
      source: "user_on_demand",
      status: "claimed",
      priority: 90,
      idempotency_key: "ui:on_demand:test",
      coalesced_count: 0,
      attempt_count: 1,
      max_attempts: 3,
      lease_token: "old-token",
      lease_expires_at: "2026-05-09T00:00:00.000Z",
      payload: {},
    };
    const updates: Record<string, unknown>[] = [];
    let mode: "lookup" | "update" = "lookup";
    let chain: {
      select: jest.Mock;
      eq: jest.Mock;
      in: jest.Mock;
      order: jest.Mock;
      limit: jest.Mock;
      update: jest.Mock;
      lt: jest.Mock;
    };
    chain = {
      select: jest.fn(() => (mode === "lookup" ? chain : Promise.resolve({
        data: [{ ...expiredWakeup, status: "claimed", lease_token: "new-token", attempt_count: 2 }],
        error: null,
      }))),
      eq: jest.fn(() => chain),
      in: jest.fn(() => chain),
      order: jest.fn(() => chain),
      limit: jest.fn(() => Promise.resolve({ data: [expiredWakeup], error: null })),
      update: jest.fn((patch: Record<string, unknown>) => {
        mode = "update";
        updates.push(patch);
        return chain;
      }),
      lt: jest.fn(() => chain),
    };

    const wakeup = await claimGrowthAgentWakeup({
      supabase: { from: jest.fn(() => chain) } as never,
      accountId: expiredWakeup.account_id,
      websiteId: expiredWakeup.website_id,
      lane: "orchestrator",
      leaseToken: "new-token",
      now: new Date("2026-05-09T00:10:00.000Z"),
    });

    expect(wakeup?.lease_token).toBe("new-token");
    expect(updates[0]).toMatchObject({
      status: "claimed",
      lease_token: "new-token",
      attempt_count: 2,
      last_error: "recovered_expired_lease",
    });
    expect(chain.lt).toHaveBeenCalledWith(
      "lease_expires_at",
      "2026-05-09T00:10:00.000Z",
    );
  });

  it("renews only the matching claimed wakeup lease", async () => {
    const updates: Record<string, unknown>[] = [];
    let chain: {
      update: jest.Mock;
      eq: jest.Mock;
      select: jest.Mock;
      limit: jest.Mock;
    };
    chain = {
      update: jest.fn((patch: Record<string, unknown>) => {
        updates.push(patch);
        return chain;
      }),
      eq: jest.fn(() => chain),
      select: jest.fn(() => Promise.resolve({ data: [{ id: "wakeup-1" }], error: null })),
      limit: jest.fn(() => Promise.resolve({ data: [{ id: "wakeup-1" }], error: null })),
    };

    await expect(
      renewGrowthAgentWakeupLease({
        supabase: { from: jest.fn(() => chain) } as never,
        wakeupId: "wakeup-1",
        websiteId: "894545b7-73ca-4dae-b76a-da5b6a3f8441",
        leaseToken: "lease-1",
        leaseDurationMs: 30_000,
        now: new Date("2026-05-09T00:00:00.000Z"),
      }),
    ).resolves.toBe(true);
    expect(updates[0]).toMatchObject({
      lease_expires_at: "2026-05-09T00:00:30.000Z",
    });
    expect(chain.eq).toHaveBeenCalledWith("lease_token", "lease-1");
  });
});
