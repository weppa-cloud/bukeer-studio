import {
  GrowthRuntimeCycleInsertSchema,
  GrowthRuntimeCycleSchema,
} from "@bukeer/website-contract";

const accountId = "11111111-1111-4111-8111-111111111111";
const websiteId = "22222222-2222-4222-8222-222222222222";

describe("GrowthRuntimeCycle schema", () => {
  it("accepts a production-cycle insert ledger row", () => {
    const parsed = GrowthRuntimeCycleInsertSchema.parse({
      account_id: accountId,
      website_id: websiteId,
      locale: "es-CO",
      market: "CO",
      cycle_key: "growth-runtime:test-cycle",
      status: "started",
      trigger_source: "manual",
      runtime_version: "growth-runtime-v1",
      dry_run: true,
      options: { candidate_limit: 10 },
      stage_results: {},
      summary: {},
      error_class: null,
      error_message: null,
      started_at: "2026-05-08T12:00:00.000Z",
      finished_at: null,
    });

    expect(parsed.cycle_key).toBe("growth-runtime:test-cycle");
    expect(parsed.dry_run).toBe(true);
  });

  it("rejects completed cycles without a finished timestamp", () => {
    const parsed = GrowthRuntimeCycleSchema.safeParse({
      id: "33333333-3333-4333-8333-333333333333",
      account_id: accountId,
      website_id: websiteId,
      locale: "es-CO",
      market: "CO",
      cycle_key: "growth-runtime:bad-cycle",
      status: "completed",
      trigger_source: "manual",
      runtime_version: "growth-runtime-v1",
      dry_run: false,
      options: {},
      stage_results: {},
      summary: {},
      error_class: null,
      error_message: null,
      started_at: "2026-05-08T12:00:00.000Z",
      finished_at: null,
      created_at: "2026-05-08T12:00:00.000Z",
      updated_at: "2026-05-08T12:00:00.000Z",
    });

    expect(parsed.success).toBe(false);
  });
});
