import type {
  GrowthOpportunityCandidate,
  GrowthProfile,
} from "@bukeer/website-contract";

import { buildPromotedWorkItem } from "@/lib/growth/autonomy/candidate-promotion";

const accountId = "11111111-1111-4111-8111-111111111111";
const websiteId = "22222222-2222-4222-8222-222222222222";
const now = new Date("2026-05-08T12:00:00.000Z");

function profile(type: GrowthProfile["profile_type"]): GrowthProfile {
  return {
    id: crypto.randomUUID(),
    account_id: accountId,
    website_id: websiteId,
    locale: "es-CO",
    market: "CO",
    profile_type: type,
    subject_table: null,
    subject_id: null,
    subject_key: null,
    source: "test",
    confidence: type === "risk_policy" ? 0.99 : 0.9,
    valid_from: "2026-05-08T11:30:00.000Z",
    valid_until: "2026-05-08T13:00:00.000Z",
    freshness_ttl_hours: 1,
    payload: { type },
    source_signal_fact_ids: [],
    policy_version: "profile-freshness-v1",
    created_at: "2026-05-08T11:30:00.000Z",
    updated_at: "2026-05-08T11:30:00.000Z",
  };
}

function candidate(
  overrides: Partial<GrowthOpportunityCandidate> = {},
): GrowthOpportunityCandidate {
  return {
    id: "33333333-3333-4333-8333-333333333333",
    account_id: accountId,
    website_id: websiteId,
    locale: "es-CO",
    market: "CO",
    candidate_type: "keyword_gap",
    lane: "content_creator",
    allowed_action_class: "content_publish",
    title: "Create organic Colombia travel guide",
    summary: "GSC and SERP gap supports a new organic guide.",
    impact_score: 80,
    confidence: 0.86,
    urgency_score: 70,
    cost_score: 30,
    risk_score: 25,
    total_score: 78,
    status: "ready_for_backlog",
    blocking_reason: null,
    required_profile_types: [
      "business",
      "buyer",
      "seo_market",
      "page_product",
      "risk_policy",
    ],
    profile_snapshot: { existing: true },
    source_signal_fact_ids: [],
    evidence: { source_refs: ["gsc:query:colombia"] },
    success_metric: "organic_clicks:/blog/colombia-guide",
    evaluation_window: "day_21",
    idempotency_key: "candidate:colombia-guide",
    promoted_work_item_id: null,
    created_at: "2026-05-08T11:00:00.000Z",
    updated_at: "2026-05-08T11:00:00.000Z",
    ...overrides,
  };
}

describe("buildPromotedWorkItem", () => {
  it("promotes a fresh ready candidate into a runtime-ready work item", () => {
    const result = buildPromotedWorkItem(
      candidate(),
      [
        profile("business"),
        profile("buyer"),
        profile("seo_market"),
        profile("page_product"),
        profile("risk_policy"),
      ],
      now,
    );

    expect(result.promoted).toBe(true);
    expect(result.workItem).toMatchObject({
      source_table: "growth_opportunity_candidates",
      source_id: "33333333-3333-4333-8333-333333333333",
      lane: "content_creator",
      status: "ready",
      allowed_action_class: "content_publish",
      requires_human_review: false,
      risk_level: "low",
    });
    expect(result.workItem?.evidence).toMatchObject({
      candidate_id: "33333333-3333-4333-8333-333333333333",
      success_metric: "organic_clicks:/blog/colombia-guide",
      evaluation_window: "day_21",
    });
  });

  it("blocks promotion when metric/window or profile freshness is missing", () => {
    const result = buildPromotedWorkItem(
      candidate({ success_metric: null, evaluation_window: null }),
      [profile("business"), profile("risk_policy")],
      now,
    );

    expect(result.promoted).toBe(false);
    expect(result.workItem).toBeNull();
    expect(result.blockingReason).toContain(
      "missing_metric_or_evaluation_window",
    );
    expect(result.blockingReason).toContain("missing:buyer");
  });
});
