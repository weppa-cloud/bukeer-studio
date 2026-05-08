import {
  recordGrowthRuntimeCycleStage,
  startGrowthRuntimeCycle,
} from "@/lib/growth/autonomy/cycle-ledger";

class TableBuilder {
  private patch: Record<string, unknown> | null = null;
  private row: Record<string, unknown> | null = null;
  constructor(private readonly table: InMemoryTable) {}
  upsert(row: Record<string, unknown>) {
    this.row = {
      id: "33333333-3333-4333-8333-333333333333",
      created_at: "2026-05-08T12:00:00.000Z",
      updated_at: "2026-05-08T12:00:00.000Z",
      ...row,
    };
    this.table.row = this.row;
    return this;
  }
  update(patch: Record<string, unknown>) {
    this.patch = patch;
    return this;
  }
  eq() {
    if (this.patch) {
      this.table.row = { ...this.table.row, ...this.patch };
    }
    return this;
  }
  select() {
    return this;
  }
  order() {
    return this;
  }
  limit() {
    return Promise.resolve({ data: [this.table.row], error: null });
  }
}

class InMemoryTable {
  row: Record<string, unknown> = {};
  from() {
    return new TableBuilder(this);
  }
}

describe("cycle ledger", () => {
  it("starts a cycle and records stage results", async () => {
    const table = new InMemoryTable();
    const supabase = { from: () => table.from() };
    const cycle = await startGrowthRuntimeCycle({
      supabase,
      accountId: "11111111-1111-4111-8111-111111111111",
      websiteId: "22222222-2222-4222-8222-222222222222",
      cycleKey: "growth-runtime:test",
      dryRun: true,
      now: new Date("2026-05-08T12:00:00.000Z"),
    });

    const updated = await recordGrowthRuntimeCycleStage({
      supabase,
      cycle,
      result: {
        stage: "profile_refresh",
        status: "completed",
        counts: { profiles: 6 },
      },
    });

    expect(updated.stage_results.profile_refresh).toMatchObject({
      status: "completed",
      counts: { profiles: 6 },
    });
  });
});
