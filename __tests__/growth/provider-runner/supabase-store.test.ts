import { createSupabaseProviderRunnerStore } from "@/lib/growth/provider-runner/supabase-store";

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const WEBSITE_ID = "22222222-2222-4222-8222-222222222222";

class SupabaseMock {
  writes: unknown[] = [];
  constructor(private readonly rows: Record<string, Array<Record<string, unknown>>>) {}

  from(table: string) {
    return new QueryMock(table, this.rows[table] ?? [], this.writes);
  }
}

class QueryMock {
  private rows: Array<Record<string, unknown>>;
  private upsertPayload: unknown = null;

  constructor(
    private readonly table: string,
    rows: Array<Record<string, unknown>>,
    private readonly writes: unknown[],
  ) {
    this.rows = [...rows];
  }

  select() {
    return this;
  }

  eq(column: string, value: unknown) {
    this.rows = this.rows.filter((row) => row[column] === value);
    return this;
  }

  in(column: string, values: unknown[]) {
    this.rows = this.rows.filter((row) => values.includes(row[column]));
    return this;
  }

  gte(column: string, value: string) {
    this.rows = this.rows.filter((row) => String(row[column] ?? "") >= value);
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    const direction = options?.ascending === false ? -1 : 1;
    this.rows = [...this.rows].sort((left, right) => String(left[column] ?? "").localeCompare(String(right[column] ?? "")) * direction);
    return this;
  }

  limit(count: number) {
    this.rows = this.rows.slice(0, count);
    return this;
  }

  maybeSingle() {
    return Promise.resolve({ data: this.rows[0] ?? null, error: null });
  }

  upsert(payload: unknown) {
    this.upsertPayload = payload;
    this.writes.push({ table: this.table, payload });
    return this;
  }

  single() {
    return Promise.resolve({
      data: { id: "run-1", ...(this.upsertPayload as Record<string, unknown>) },
      error: null,
    });
  }
}

describe("createSupabaseProviderRunnerStore", () => {
  it("reads latest provider run scoped by tenant/profile", async () => {
    const supabase = new SupabaseMock({
      growth_profile_runs: [
        {
          id: "run-1",
          account_id: ACCOUNT_ID,
          website_id: WEBSITE_ID,
          provider: "gsc",
          profile_id: "gsc_daily_complete_web_v1",
          run_status: "completed",
          freshness_status: "fresh",
          quality_status: "pass",
          source_refs: [{ type: "provider", ref: "gsc:gsc_daily_complete_web_v1" }],
          cost_usd: 0,
          payload: {},
          idempotency_key: "idem",
          updated_at: "2026-05-28T12:00:00.000Z",
        },
      ],
    });

    const store = createSupabaseProviderRunnerStore(supabase as never);
    const row = await store.findLatestRun({
      accountId: ACCOUNT_ID,
      websiteId: WEBSITE_ID,
      provider: "gsc",
      profileId: "gsc_daily_complete_web_v1",
    });

    expect(row?.run_status).toBe("completed");
    expect(row?.freshness_status).toBe("fresh");
    expect(row?.source_refs).toEqual([{ type: "provider", ref: "gsc:gsc_daily_complete_web_v1" }]);
  });

  it("upserts ledger rows by website/idempotency instead of appending duplicate production rows", async () => {
    const supabase = new SupabaseMock({ growth_profile_runs: [] });
    const store = createSupabaseProviderRunnerStore(supabase as never);

    const persisted = await store.writeLedger({
      account_id: ACCOUNT_ID,
      website_id: WEBSITE_ID,
      provider: "ga4",
      profile_id: "ga4_daily_web_traffic_v1",
      run_status: "completed",
      freshness_status: "fresh",
      quality_status: "pass",
      source_refs: [],
      cost_usd: 0,
      payload: { row_count: 1 },
      idempotency_key: "idem",
    });

    expect(persisted.id).toBe("run-1");
    expect(supabase.writes).toHaveLength(1);
    expect(JSON.stringify(supabase.writes[0])).toContain("ga4_daily_web_traffic_v1");
  });
});
