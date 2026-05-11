import type {
  GrowthOpportunityCandidate,
  GrowthProfile,
} from "@bukeer/website-contract";

import { buildPromotedWorkItem } from "@/lib/growth/autonomy/candidate-promotion";

const accountId = "11111111-1111-4111-8111-111111111111";
const websiteId = "22222222-2222-4222-8222-222222222222";
const now = new Date("2026-05-08T12:00:00.000Z");
const articleContent = Array.from(
  { length: 310 },
  (_, index) => `colombia-travel-${index}`,
).join(" ");

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
    evidence: {
      source_refs: ["gsc:query:colombia"],
      target: {
        target_table: "website_blog_posts",
        target_path: "/blog/colombia-guide",
      },
      article: {
        title: "Complete Colombia travel guide for expert-planned routes",
        slug: "colombia-guide",
        seo_title: "Complete Colombia travel guide for custom routes",
        seo_description:
          "Plan a custom Colombia route with expert context on regions, timing, culture, nature and practical travel decisions before speaking with a specialist.",
        content: articleContent,
        supported_facts: [
          "gsc:query:colombia",
          "dataforseo:keyword-gap:colombia",
          "ga4:landing:/blog",
        ],
      },
      rollback_expectation: {
        strategy: "delete_created_content",
        target_path: "/blog/colombia-guide",
      },
      baseline: {
        organic_clicks: 0,
      },
    },
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

  it("blocks promotion when execution target, rollback expectation, or baseline is missing", () => {
    const result = buildPromotedWorkItem(
      candidate({ evidence: { source_refs: ["gsc:query:colombia"] } }),
      [
        profile("business"),
        profile("buyer"),
        profile("seo_market"),
        profile("page_product"),
        profile("risk_policy"),
      ],
      now,
    );

    expect(result.promoted).toBe(false);
    expect(result.workItem).toBeNull();
    expect(result.blockingReason).toContain("missing_target");
    expect(result.blockingReason).toContain("missing_rollback_expectation");
    expect(result.blockingReason).toContain("missing_baseline");
  });

  it("blocks content candidates before ready when the article payload is thin or unsupported", () => {
    const result = buildPromotedWorkItem(
      candidate({
        evidence: {
          source_refs: ["gsc:query:colombia"],
          target: {
            target_table: "website_blog_posts",
            target_path: "/blog/thin-colombia-guide",
          },
          article: {
            title: "Thin guide",
            slug: "thin-colombia-guide",
            seo_title: "Thin guide",
            seo_description: "Too short.",
            content: "short content",
            supported_facts: [],
          },
          rollback_expectation: {
            strategy: "delete_created_content",
            target_path: "/blog/thin-colombia-guide",
          },
          baseline: { organic_clicks: 0 },
        },
      }),
      [
        profile("business"),
        profile("buyer"),
        profile("seo_market"),
        profile("page_product"),
        profile("risk_policy"),
      ],
      now,
    );

    expect(result.promoted).toBe(false);
    expect(result.blockingReason).toContain("content_too_thin");
    expect(result.blockingReason).toContain("missing_supported_facts");
  });

  it("blocks transcreation candidates before ready when the adapter contract is incomplete", () => {
    const result = buildPromotedWorkItem(
      candidate({
        candidate_type: "missing_translation",
        lane: "transcreation",
        allowed_action_class: "transcreation_merge",
        required_profile_types: [
          "business",
          "buyer",
          "seo_market",
          "competitor",
          "page_product",
          "risk_policy",
        ],
        evidence: {
          source_refs: ["growth_signal_facts:translation-gap"],
          target: {
            target_table: "seo_transcreation_jobs",
            target_id: "44444444-4444-4444-8444-444444444444",
          },
          rollback_expectation: {
            strategy: "restore_before_snapshot",
            target_id: "44444444-4444-4444-8444-444444444444",
          },
          baseline: { localized_organic_clicks: 0 },
        },
        success_metric: "localized_organic_clicks:page:en-US:test",
        evaluation_window: "day_21",
      }),
      [
        profile("business"),
        profile("buyer"),
        profile("seo_market"),
        profile("competitor"),
        profile("page_product"),
        profile("risk_policy"),
      ],
      now,
    );

    expect(result.promoted).toBe(false);
    expect(result.blockingReason).toContain("missing_runtime_adapter_plan");
    expect(result.blockingReason).toContain("missing_transcreation_job_id");
    expect(result.blockingReason).toContain(
      "missing_transcreation_source_entity_id",
    );
  });

  it("blocks safe_apply candidates before ready when patch, snapshot, or rollback is missing", () => {
    const result = buildPromotedWorkItem(
      candidate({
        candidate_type: "technical_seo_issue",
        lane: "technical_remediation",
        allowed_action_class: "safe_apply",
        required_profile_types: ["page_product", "risk_policy"],
        evidence: {
          source_refs: ["growth_signal_facts:technical-gap"],
          target: {
            target_table: "website_pages",
            target_id: "55555555-5555-4555-8555-555555555555",
          },
          rollback_expectation: {
            strategy: "restore_before_snapshot",
            target_id: "55555555-5555-4555-8555-555555555555",
          },
          baseline: { technical_smoke_pass: false },
          adapter_input: {
            target_table: "website_pages",
            target_id: "55555555-5555-4555-8555-555555555555",
          },
        },
        success_metric: "technical_smoke_pass:website_pages:test",
        evaluation_window: "day_7",
      }),
      [profile("page_product"), profile("risk_policy")],
      now,
    );

    expect(result.promoted).toBe(false);
    expect(result.blockingReason).toContain("missing_safe_apply_patch");
    expect(result.blockingReason).toContain("missing_safe_apply_before_row");
    expect(result.blockingReason).toContain(
      "missing_safe_apply_rollback_payload",
    );
  });

  it("promotes safe_apply candidates only when the adapter contract is complete and allowlisted", () => {
    const result = buildPromotedWorkItem(
      candidate({
        candidate_type: "technical_seo_issue",
        lane: "technical_remediation",
        allowed_action_class: "safe_apply",
        required_profile_types: ["page_product", "risk_policy"],
        evidence: {
          source_refs: ["growth_signal_facts:technical-gap"],
          target: {
            target_table: "website_pages",
            target_id: "55555555-5555-4555-8555-555555555555",
          },
          rollback_expectation: {
            strategy: "restore_before_snapshot",
            target_id: "55555555-5555-4555-8555-555555555555",
          },
          baseline: { technical_smoke_pass: false },
          adapter_input: {
            target_table: "website_pages",
            target_id: "55555555-5555-4555-8555-555555555555",
            before_row: {
              id: "55555555-5555-4555-8555-555555555555",
              target_keyword: "colombia travel",
            },
            patch: {
              target_keyword: "custom colombia travel",
            },
            rollback_payload: {
              table: "website_pages",
              target_id: "55555555-5555-4555-8555-555555555555",
              restore: { target_keyword: "colombia travel" },
            },
          },
        },
        success_metric: "technical_smoke_pass:website_pages:test",
        evaluation_window: "day_7",
      }),
      [profile("page_product"), profile("risk_policy")],
      now,
    );

    expect(result.promoted).toBe(true);
    expect(result.workItem?.allowed_action_class).toBe("safe_apply");
  });
});
