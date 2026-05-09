import type { GrowthProfile } from "@bukeer/website-contract";

import {
  evaluateProfileFreshnessGate,
  requirementsForAction,
  scoreOpportunityCandidate,
} from "@/lib/growth/autonomy/profile-freshness-gate";

const base = {
  account_id: "11111111-1111-4111-8111-111111111111",
  website_id: "22222222-2222-4222-8222-222222222222",
  locale: "es-CO",
  market: "CO",
  subject_table: null,
  subject_id: null,
  subject_key: null,
  source: "test",
  policy_version: "profile-freshness-v1",
  created_at: "2026-05-07T00:00:00.000Z",
  updated_at: "2026-05-07T00:00:00.000Z",
} as const;

function profile(
  profile_type: GrowthProfile["profile_type"],
  validFrom: string,
  validUntil: string,
  confidence = 0.9,
): GrowthProfile {
  return {
    ...base,
    id: crypto.randomUUID(),
    profile_type,
    confidence,
    valid_from: validFrom,
    valid_until: validUntil,
    freshness_ttl_hours: 168,
    source_signal_fact_ids: [],
    payload: { summary: profile_type },
  };
}

describe("profile freshness gate", () => {
  it("allows content publish when all required profiles are fresh", () => {
    const now = new Date("2026-05-07T12:00:00.000Z");
    const profiles: GrowthProfile[] = [
      profile("business", "2026-05-01T00:00:00.000Z", "2026-05-31T00:00:00.000Z"),
      profile("buyer", "2026-05-01T00:00:00.000Z", "2026-05-31T00:00:00.000Z"),
      profile("seo_market", "2026-05-06T00:00:00.000Z", "2026-05-13T00:00:00.000Z"),
      profile("page_product", "2026-05-07T11:30:00.000Z", "2026-05-07T13:00:00.000Z"),
      profile("risk_policy", "2026-05-07T11:45:00.000Z", "2026-05-07T13:00:00.000Z", 0.99),
    ];

    const result = evaluateProfileFreshnessGate({
      profiles,
      requirements: requirementsForAction("content_publish"),
      now,
    });

    expect(result.allowed).toBe(true);
    expect(Object.keys(result.snapshot)).toEqual([
      "business",
      "buyer",
      "seo_market",
      "page_product",
      "risk_policy",
    ]);
  });

  it("blocks when profiles are missing, stale, or low confidence", () => {
    const now = new Date("2026-05-07T12:00:00.000Z");
    const result = evaluateProfileFreshnessGate({
      profiles: [
        profile("business", "2026-04-01T00:00:00.000Z", "2026-06-01T00:00:00.000Z"),
        profile("buyer", "2026-05-01T00:00:00.000Z", "2026-05-31T00:00:00.000Z", 0.4),
        profile("risk_policy", "2026-05-07T11:45:00.000Z", "2026-05-07T13:00:00.000Z", 0.99),
      ],
      requirements: requirementsForAction("transcreation_merge"),
      now,
    });

    expect(result.allowed).toBe(false);
    expect(result.missing).toEqual(
      expect.arrayContaining(["seo_market", "competitor", "page_product"]),
    );
    expect(result.stale).toContain("business");
    expect(result.lowConfidence).toContain("buyer");
  });

  it("scores ready candidate only when freshness passes", () => {
    const freshness = {
      allowed: true,
      snapshot: { risk_policy: { id: "policy" } },
      missing: [],
      stale: [],
      lowConfidence: [],
    };

    const candidate = scoreOpportunityCandidate({
      accountId: base.account_id,
      websiteId: base.website_id,
      candidateType: "keyword_gap",
      lane: "content_creator",
      allowedActionClass: "content_publish",
      title: "Refresh Colombia itinerary keyword gap",
      summary: "GSC and SERP show a gap worth creating content for.",
      impactScore: 82,
      confidence: 0.83,
      urgencyScore: 70,
      costScore: 35,
      riskScore: 30,
      idempotencyKey: "keyword-gap:colombia-itinerary",
      evidence: {
        sources: ["gsc", "dataforseo"],
        target: {
          target_table: "website_blog_posts",
          target_path: "/blog/colombia-itinerary",
        },
        rollback_expectation: {
          strategy: "delete_created_content",
          target_path: "/blog/colombia-itinerary",
        },
        baseline: { organic_clicks: 12, impressions: 100 },
      },
      requiredProfileTypes: ["business", "buyer", "seo_market"],
      freshness,
      successMetric: "organic_clicks:/blog/colombia-itinerary",
      evaluationWindow: "day_21",
    });

    expect(candidate.status).toBe("ready_for_backlog");
    expect(candidate.total_score).toBeGreaterThanOrEqual(60);
    expect(candidate.profile_snapshot).toEqual(freshness.snapshot);
  });

  it("blocks candidate when freshness fails", () => {
    const candidate = scoreOpportunityCandidate({
      accountId: base.account_id,
      websiteId: base.website_id,
      candidateType: "technical_seo_issue",
      lane: "technical_remediation",
      allowedActionClass: "safe_apply",
      title: "Fix stale canonical",
      summary: "Technical audit found a canonical mismatch.",
      impactScore: 80,
      confidence: 0.9,
      urgencyScore: 90,
      costScore: 20,
      riskScore: 25,
      idempotencyKey: "technical:canonical",
      evidence: { sources: ["technical_audit"] },
      requiredProfileTypes: ["page_product", "risk_policy"],
      freshness: {
        allowed: false,
        snapshot: {},
        missing: ["page_product"],
        stale: [],
        lowConfidence: [],
      },
    });

    expect(candidate.status).toBe("blocked");
    expect(candidate.blocking_reason).toContain("missing:page_product");
    expect(candidate.blocking_reason).toContain("missing_target");
  });

  it("blocks provider-dependent candidates when DataForSEO evidence is stale", () => {
    const freshness = {
      allowed: true,
      snapshot: { seo_market: { id: "seo" } },
      missing: [],
      stale: [],
      lowConfidence: [],
    };

    const candidate = scoreOpportunityCandidate({
      accountId: base.account_id,
      websiteId: base.website_id,
      candidateType: "keyword_gap",
      lane: "content_creator",
      allowedActionClass: "content_publish",
      title: "Create SERP-backed content",
      summary: "SERP evidence is stale and must not be promoted live.",
      impactScore: 90,
      confidence: 0.9,
      urgencyScore: 90,
      costScore: 20,
      riskScore: 25,
      idempotencyKey: "keyword-gap:stale-dataforseo",
      evidence: {
        target: {
          target_table: "website_blog_posts",
          target_path: "/blog/stale-dataforseo",
        },
        rollback_expectation: {
          strategy: "delete_created_content",
          target_path: "/blog/stale-dataforseo",
        },
        baseline: { organic_clicks: 0, impressions: 10 },
        dataforseo_evidence: {
          required: true,
          feature_profile: "serp",
          status: "stale",
          blockers: ["dataforseo_stale:serp"],
          snapshot: null,
          exception_reason: null,
        },
      },
      requiredProfileTypes: ["business", "buyer", "seo_market"],
      freshness,
      successMetric: "organic_clicks:/blog/stale-dataforseo",
      evaluationWindow: "day_21",
    });

    expect(candidate.status).toBe("blocked");
    expect(candidate.blocking_reason).toContain("dataforseo_stale");
  });
});
