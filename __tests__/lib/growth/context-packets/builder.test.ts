import {
  GrowthProviderContextPacketSchema,
  type GrowthProviderContextPacket,
} from "@bukeer/website-contract";
import { buildGrowthProviderContextPacket } from "@/lib/growth/context-packets";

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const WEBSITE_ID = "22222222-2222-4222-8222-222222222222";
const OTHER_ACCOUNT_ID = "33333333-3333-4333-8333-333333333333";
const OTHER_WEBSITE_ID = "44444444-4444-4444-8444-444444444444";
const NOW = new Date("2026-05-14T12:00:00.000Z");
const ENTITY = {
  type: "page" as const,
  id: "pkg-colombia-tours",
  canonical_url: "https://example.test/tours/colombia",
  locale: "es-CO",
  market: "CO",
  path: "/tours/colombia",
  slug: null,
  metadata: {},
};

type TableRows = Record<string, Array<Record<string, unknown>>>;

class ReadOnlySupabaseMock {
  readonly calls: Array<{ table: string; method: string; args: unknown[] }> = [];

  constructor(private readonly rowsByTable: TableRows) {}

  from(table: string) {
    this.calls.push({ table, method: "from", args: [] });
    return new QueryMock(table, this.rowsByTable[table] ?? [], this.calls);
  }
}

class QueryMock {
  private rows: Array<Record<string, unknown>>;

  constructor(
    private readonly table: string,
    rows: Array<Record<string, unknown>>,
    private readonly calls: Array<{ table: string; method: string; args: unknown[] }>,
  ) {
    this.rows = [...rows];
  }

  select(...args: unknown[]) {
    this.calls.push({ table: this.table, method: "select", args });
    return this;
  }

  eq(column: string, value: unknown) {
    this.calls.push({ table: this.table, method: "eq", args: [column, value] });
    this.rows = this.rows.filter((row) => row[column] === value);
    return this;
  }

  in(column: string, values: unknown[]) {
    this.calls.push({ table: this.table, method: "in", args: [column, values] });
    this.rows = this.rows.filter((row) => values.includes(row[column]));
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.calls.push({ table: this.table, method: "order", args: [column, options] });
    const direction = options?.ascending === false ? -1 : 1;
    this.rows = [...this.rows].sort((left, right) => {
      const leftValue = String(left[column] ?? "");
      const rightValue = String(right[column] ?? "");
      return leftValue.localeCompare(rightValue) * direction;
    });
    return this;
  }

  limit(count: number) {
    this.calls.push({ table: this.table, method: "limit", args: [count] });
    this.rows = this.rows.slice(0, count);
    return this;
  }

  then<TResult1 = { data: Array<Record<string, unknown>>; error: null }, TResult2 = never>(
    onfulfilled?: ((value: { data: Array<Record<string, unknown>>; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve({ data: this.rows, error: null }).then(onfulfilled, onrejected);
  }
}

function profileRun(overrides: Record<string, unknown> = {}) {
  return {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    account_id: ACCOUNT_ID,
    website_id: WEBSITE_ID,
    provider: "gsc",
    profile_id: "gsc_growth_minimum_v1",
    run_status: "completed",
    freshness_status: "fresh",
    quality_status: "pass",
    evidence_fingerprint: "sha256:gsc-fresh",
    source_refs: ["growth_gsc_cache:gsc-row-1"],
    payload: { summary: { clicks: 42, impressions: 4200 } },
    started_at: "2026-05-14T10:00:00.000Z",
    completed_at: "2026-05-14T10:10:00.000Z",
    expires_at: "2026-05-22T10:10:00.000Z",
    entity_key: "page:pkg-colombia-tours",
    action_key: "content_refresh:page:pkg-colombia-tours",
    ...overrides,
  };
}

function createRows(overrides: TableRows = {}): TableRows {
  return {
    growth_profile_runs: [
      profileRun(),
      profileRun({
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        provider: "ga4",
        profile_id: "ga4_growth_minimum_v1",
        evidence_fingerprint: "sha256:ga4-fresh",
        source_refs: ["growth_ga4_cache:ga4-row-1"],
        payload: { summary: { sessions: 120, conversions: 8 } },
        expires_at: "2026-05-22T10:10:00.000Z",
      }),
    ],
    growth_gsc_cache: [
      {
        id: "gsc-row-1",
        account_id: ACCOUNT_ID,
        website_id: WEBSITE_ID,
        page_path: "/tours/colombia",
        query: "colombia tours",
        clicks: 42,
        impressions: 4200,
      },
    ],
    growth_ga4_cache: [
      {
        id: "ga4-row-1",
        account_id: ACCOUNT_ID,
        website_id: WEBSITE_ID,
        page_path: "/tours/colombia",
        sessions: 120,
        conversions: 8,
      },
    ],
    growth_dataforseo_cache: [],
    growth_inventory: [],
    funnel_events: [],
    growth_work_items: [],
    growth_publication_jobs: [],
    growth_work_item_outcomes: [],
    ...overrides,
  };
}

async function buildPacket(rows: TableRows, requiredProfileIds = ["gsc_growth_minimum_v1", "ga4_growth_minimum_v1"]) {
  const supabase = new ReadOnlySupabaseMock(rows);
  const packet = await buildGrowthProviderContextPacket({
    supabase,
    accountId: ACCOUNT_ID,
    websiteId: WEBSITE_ID,
    workerLane: "content",
    workType: "content_refresh",
    entity: ENTITY,
    requiredProfileIds,
    allowedActions: ["draft_content_brief"],
    now: NOW,
  });
  return { packet, supabase };
}

describe("Growth provider context packet contract", () => {
  it("accepts complete fresh packets and requires direct provider API blocking", () => {
    const basePacket: GrowthProviderContextPacket = {
      packet_version: "growth-provider-context-packet-v1",
      status: "pass",
      generated_at: NOW.toISOString(),
      account_id: ACCOUNT_ID,
      website_id: WEBSITE_ID,
      locale: "es-CO",
      market: "CO",
      worker_lane: "content",
      work_type: "content_refresh",
      entity: ENTITY,
      freshness_map: {
        gsc_growth_minimum_v1: {
          profile_id: "gsc_growth_minimum_v1",
          provider: "gsc",
          status: "fresh",
          required: true,
          fetched_at: "2026-05-14T10:10:00.000Z",
          expires_at: "2026-05-22T10:10:00.000Z",
          quality_status: "pass",
          run_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          no_go_reasons: [],
        },
      },
      source_profiles: [
        {
          profile_id: "gsc_growth_minimum_v1",
          provider: "gsc",
          run_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          window_start: "2026-05-14T10:00:00.000Z",
          window_end: "2026-05-14T10:10:00.000Z",
          cache_refs: ["growth_gsc_cache:gsc-row-1"],
          fact_ids: [],
          evidence_fingerprint: "sha256:gsc-fresh",
          source_refs: ["growth_gsc_cache:gsc-row-1"],
        },
      ],
      facts: {
        search_demand: {
          items: [{ query: "colombia tours", clicks: 42 }],
          source_profile_ids: ["gsc_growth_minimum_v1"],
          no_go_reasons: [],
        },
        technical_issues: { items: [], source_profile_ids: [], no_go_reasons: [] },
        market_terms: { items: [], source_profile_ids: [], no_go_reasons: [] },
        conversion_signals: { items: [], source_profile_ids: [], no_go_reasons: [] },
        paid_signals: { items: [], source_profile_ids: [], no_go_reasons: [] },
        ux_friction: { items: [], source_profile_ids: [], no_go_reasons: [] },
      },
      previous_actions: [],
      dedupe_verdict: {
        verdict: "proceed",
        evidence_fingerprint: "sha256:gsc-fresh",
        reason: "fresh_required_profiles",
        previous_refs: [],
        no_go_reasons: [],
      },
      allowed_actions: ["draft_content_brief"],
      blocked_actions: [
        {
          action: "call_provider_api_directly",
          reason: "Provider API access is restricted to provider profiles.",
        },
      ],
    };

    expect(GrowthProviderContextPacketSchema.parse(basePacket).blocked_actions).toEqual(
      expect.arrayContaining([expect.objectContaining({ action: "call_provider_api_directly" })]),
    );

    expect(
      GrowthProviderContextPacketSchema.safeParse({
        ...basePacket,
        blocked_actions: [],
      }).success,
    ).toBe(false);
  });
});

describe("buildGrowthProviderContextPacket", () => {
  it("builds a fresh PASS packet with scoped GSC/GA4 facts and no provider writes", async () => {
    const { packet, supabase } = await buildPacket(createRows());

    expect(packet.status).toBe("pass");
    expect(packet.dedupe_verdict.verdict).toBe("proceed");
    expect(packet.blocked_actions).toEqual(
      expect.arrayContaining([expect.objectContaining({ action: "call_provider_api_directly" })]),
    );
    expect(packet.facts.search_demand.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ query: "colombia tours", clicks: 42 })]),
    );
    expect(packet.facts.conversion_signals.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ sessions: 120, conversions: 8 })]),
    );
    expect(supabase.calls.some((call) => ["insert", "upsert", "update", "delete"].includes(call.method))).toBe(false);
    expect(supabase.calls).toEqual(expect.arrayContaining([
      expect.objectContaining({ table: "growth_profile_runs", method: "eq", args: ["account_id", ACCOUNT_ID] }),
      expect.objectContaining({ table: "growth_profile_runs", method: "eq", args: ["website_id", WEBSITE_ID] }),
    ]));
  });

  it("supports #600 official profile ids and object source_refs without leaking provider access", async () => {
    const { packet } = await buildPacket(
      createRows({
        growth_profile_runs: [
          profileRun({
            profile_id: "gsc_daily_complete_web_v1",
            source_refs: [{ type: "provider", ref: "gsc:gsc_daily_complete_web_v1" }],
          }),
          profileRun({
            id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
            provider: "ga4",
            profile_id: "ga4_daily_web_traffic_v1",
            evidence_fingerprint: "sha256:ga4-fresh",
            source_refs: [{ type: "provider", ref: "ga4:ga4_daily_web_traffic_v1" }],
            payload: { summary: { sessions: 120, conversions: 8 } },
            expires_at: "2026-05-22T10:10:00.000Z",
          }),
        ],
      }),
      ["gsc_daily_complete_web_v1", "ga4_daily_web_traffic_v1"],
    );

    expect(packet.status).toBe("pass");
    expect(packet.source_profiles.map((profile) => profile.profile_id)).toEqual([
      "gsc_daily_complete_web_v1",
      "ga4_daily_web_traffic_v1",
    ]);
    expect(packet.source_profiles[0].source_refs).toContain("provider:gsc:gsc_daily_complete_web_v1");
    expect(packet.blocked_actions).toEqual(
      expect.arrayContaining([expect.objectContaining({ action: "call_provider_api_directly" })]),
    );
  });

  it("returns WATCH and request_refresh when a required profile is stale", async () => {
    const { packet } = await buildPacket(
      createRows({
        growth_profile_runs: [
          profileRun({
            freshness_status: "stale",
            expires_at: "2026-05-13T10:10:00.000Z",
          }),
        ],
      }),
      ["gsc_growth_minimum_v1"],
    );

    expect(packet.status).toBe("watch");
    expect(packet.freshness_map.gsc_growth_minimum_v1.status).toBe("stale");
    expect(packet.dedupe_verdict.verdict).toBe("request_refresh");
    expect(packet.dedupe_verdict.no_go_reasons).toContain("profile_stale:gsc_growth_minimum_v1");
  });

  it("returns BLOCKED and explicit no-go reasons when required evidence is missing", async () => {
    const { packet } = await buildPacket(createRows({ growth_profile_runs: [] }), ["gsc_growth_minimum_v1"]);

    expect(packet.status).toBe("blocked");
    expect(packet.freshness_map.gsc_growth_minimum_v1.status).toBe("missing");
    expect(packet.dedupe_verdict.verdict).toBe("blocked");
    expect(packet.dedupe_verdict.no_go_reasons).toContain("profile_missing:gsc_growth_minimum_v1");
    expect(packet.facts.search_demand.no_go_reasons).toContain("profile_missing:gsc_growth_minimum_v1");
  });

  it("coalesces duplicate active work with the same evidence fingerprint", async () => {
    const activeWorkId = "55555555-5555-4555-8555-555555555555";
    const { packet } = await buildPacket(
      createRows({
        growth_work_items: [
          {
            id: activeWorkId,
            account_id: ACCOUNT_ID,
            website_id: WEBSITE_ID,
            status: "running",
            evidence: {
              correlation: {
                evidence_fingerprint: "sha256:gsc-fresh",
              },
            },
          },
        ],
      }),
      ["gsc_growth_minimum_v1"],
    );

    expect(packet.dedupe_verdict.verdict).toBe("coalesce");
    expect(packet.dedupe_verdict.previous_refs).toContain(`growth_work_items:${activeWorkId}`);
    expect(packet.dedupe_verdict.reason).toBe("active_work_coalesced");
    expect(packet.dedupe_verdict.no_go_reasons).not.toContain("active_work:ready");
  });

  it("represents DataForSEO cost_gated as governed evidence instead of fresh extraction", async () => {
    const { packet } = await buildPacket(
      createRows({
        growth_profile_runs: [
          profileRun({
            profile_id: "gsc_daily_complete_web_v1",
            source_refs: [{ type: "cache", ref: "growth_gsc_cache:gsc-row-1" }],
          }),
          profileRun({
            id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
            provider: "ga4",
            profile_id: "ga4_daily_web_traffic_v1",
            evidence_fingerprint: "sha256:ga4-fresh",
            source_refs: [{ type: "cache", ref: "growth_ga4_cache:ga4-row-1" }],
            payload: { summary: { sessions: 120, keyEvents: 8 } },
            expires_at: "2026-05-22T10:10:00.000Z",
          }),
          profileRun({
            id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
            provider: "dataforseo",
            profile_id: "dataforseo_serp_opportunity_v1",
            run_status: "cost_gated",
            freshness_status: "WATCH",
            quality_status: "watch",
            evidence_fingerprint: "sha256:dataforseo-cost-gated",
            source_refs: [],
            payload: {
              summary: { health_probe: "pass", paid_extraction: "blocked_by_cost_gate" },
              no_go_reasons: ["costed_profile_requires_approval_reference"],
            },
            expires_at: "2026-05-22T10:10:00.000Z",
          }),
        ],
      }),
      ["gsc_daily_complete_web_v1", "ga4_daily_web_traffic_v1", "dataforseo_serp_opportunity_v1"],
    );

    expect(packet.status).toBe("watch");
    expect(packet.freshness_map.dataforseo_serp_opportunity_v1).toMatchObject({
      provider: "dataforseo",
      status: "cost_gated",
      quality_status: "watch",
      no_go_reasons: ["profile_cost_gated:dataforseo_serp_opportunity_v1"],
    });
    expect(packet.source_profiles.map((profile) => profile.profile_id)).toContain("dataforseo_serp_opportunity_v1");
    expect(packet.facts.market_terms.no_go_reasons).toContain("profile_cost_gated:dataforseo_serp_opportunity_v1");
    expect(packet.dedupe_verdict.verdict).toBe("request_refresh");
  });

  it("ignores rows from other tenants and does not silently pass missing scoped evidence", async () => {
    const { packet } = await buildPacket(
      createRows({
        growth_profile_runs: [
          profileRun({
            account_id: OTHER_ACCOUNT_ID,
            website_id: OTHER_WEBSITE_ID,
          }),
        ],
      }),
      ["gsc_growth_minimum_v1"],
    );

    expect(packet.status).toBe("blocked");
    expect(packet.freshness_map.gsc_growth_minimum_v1.status).toBe("missing");
  });
});
