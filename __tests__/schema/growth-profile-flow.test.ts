import {
  GrowthOpportunityCandidateInsertSchema,
  GrowthProfileInsertSchema,
  GrowthSignalFactInsertSchema,
} from "@bukeer/website-contract";

const scope = {
  account_id: "11111111-1111-4111-8111-111111111111",
  website_id: "22222222-2222-4222-8222-222222222222",
  locale: "es-CO",
  market: "CO",
};

describe("Growth profile flow contracts", () => {
  it("accepts a fresh signal fact with expiry", () => {
    const parsed = GrowthSignalFactInsertSchema.safeParse({
      ...scope,
      source: "gsc",
      signal_type: "query_gap",
      observed_at: "2026-05-07T12:00:00.000Z",
      expires_at: "2026-05-14T12:00:00.000Z",
      confidence: 0.82,
      payload: { query: "colombia itinerary" },
      idempotency_key: "gsc:query-gap:colombia-itinerary",
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects a signal fact with stale expiry", () => {
    const parsed = GrowthSignalFactInsertSchema.safeParse({
      ...scope,
      source: "gsc",
      signal_type: "query_gap",
      observed_at: "2026-05-07T12:00:00.000Z",
      expires_at: "2026-05-07T11:00:00.000Z",
      payload: { query: "colombia itinerary" },
      idempotency_key: "gsc:bad-expiry",
    });

    expect(parsed.success).toBe(false);
  });

  it("accepts a versioned buyer profile", () => {
    const parsed = GrowthProfileInsertSchema.safeParse({
      ...scope,
      profile_type: "buyer",
      source: "crm",
      confidence: 0.86,
      valid_from: "2026-05-07T12:00:00.000Z",
      valid_until: "2026-06-06T12:00:00.000Z",
      freshness_ttl_hours: 720,
      payload: { segments: ["US custom travel"] },
    });

    expect(parsed.success).toBe(true);
  });

  it("accepts a ready opportunity candidate with profile snapshot", () => {
    const parsed = GrowthOpportunityCandidateInsertSchema.safeParse({
      ...scope,
      candidate_type: "keyword_gap",
      lane: "content_creator",
      allowed_action_class: "content_publish",
      title: "Create Colombia itinerary article",
      summary: "GSC and DataForSEO show query gap.",
      impact_score: 84,
      confidence: 0.82,
      urgency_score: 70,
      cost_score: 30,
      risk_score: 25,
      total_score: 76,
      status: "ready_for_backlog",
      required_profile_types: ["business", "buyer", "seo_market"],
      profile_snapshot: { buyer: { confidence: 0.86 } },
      evidence: { sources: ["gsc", "dataforseo"] },
      success_metric: "organic_clicks:/blog/colombia-itinerary",
      evaluation_window: "day_21",
      idempotency_key: "candidate:keyword-gap:colombia-itinerary",
    });

    expect(parsed.success).toBe(true);
  });
});
