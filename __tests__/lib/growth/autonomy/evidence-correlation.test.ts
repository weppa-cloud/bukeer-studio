import { evaluateGrowthEvidenceCorrelation } from "@/lib/growth/autonomy/candidate-discovery";

const websiteId = "22222222-2222-4222-8222-222222222222";
const now = new Date("2026-05-10T12:00:00.000Z");

function evidence(fingerprint = "sha256:provider-a") {
  return {
    target: {
      target_table: "website_blog_posts",
      target_path: "/blog/colombia-guide",
    },
    dataforseo_evidence: {
      required: true,
      status: "available",
      evidence_fingerprint: fingerprint,
    },
  };
}

function priorWork(fingerprint = "sha256:provider-a") {
  return {
    id: "44444444-4444-4444-8444-444444444444",
    evidence: {
      correlation: {
        entity_key: "website_blog_posts:/blog/colombia-guide",
        action_key: "content_publish:website_blog_posts:/blog/colombia-guide",
        correlation_key:
          `${websiteId}:keyword_gap:content_publish:website_blog_posts:/blog/colombia-guide`,
        evidence_fingerprint: fingerprint,
        dedupe_verdict: "new",
      },
    },
  };
}

describe("evaluateGrowthEvidenceCorrelation", () => {
  it("coalesces identical provider evidence for the same action", () => {
    const result = evaluateGrowthEvidenceCorrelation({
      websiteId,
      decisionFamily: "keyword_gap",
      actionClass: "content_publish",
      evidence: evidence(),
      priorWorkItems: [priorWork()],
      now,
    });

    expect(result).toMatchObject({
      entity_key: "website_blog_posts:/blog/colombia-guide",
      action_key: "content_publish:website_blog_posts:/blog/colombia-guide",
      evidence_fingerprint: "sha256:provider-a",
      dedupe_verdict: "coalesce",
      reason: "same_evidence_same_action",
    });
  });

  it("derives legacy correlation from adapter_input target fields", () => {
    const result = evaluateGrowthEvidenceCorrelation({
      websiteId,
      decisionFamily: "technical_seo_issue",
      actionClass: "safe_apply",
      evidence: {
        adapter_input: {
          target_table: "website_pages",
          target_id: "77777777-7777-4777-8777-777777777777",
        },
        dataforseo_evidence: {
          evidence_fingerprint: "sha256:onpage-target",
        },
      },
      priorWorkItems: [
        {
          id: "44444444-4444-4444-8444-444444444444",
          website_id: websiteId,
          status: "ready",
          allowed_action_class: "safe_apply",
          evidence: {
            adapter_input: {
              target_table: "website_pages",
              target_id: "77777777-7777-4777-8777-777777777777",
            },
            dataforseo_evidence: {
              evidence_fingerprint: "sha256:onpage-target",
            },
          },
        },
      ],
      now,
    });

    expect(result).toMatchObject({
      entity_key: "website_pages:77777777-7777-4777-8777-777777777777",
      action_key: "safe_apply:website_pages:77777777-7777-4777-8777-777777777777",
      dedupe_verdict: "skip",
      reason: "prior_active_same_action",
    });
  });

  it("skips while correlated work is still measuring", () => {
    const result = evaluateGrowthEvidenceCorrelation({
      websiteId,
      decisionFamily: "keyword_gap",
      actionClass: "content_publish",
      evidence: evidence(),
      priorWorkItems: [priorWork()],
      priorOutcomes: [
        {
          id: "55555555-5555-4555-8555-555555555555",
          work_item_id: "44444444-4444-4444-8444-444444444444",
          status: "measuring",
          evaluation_date: "2026-05-21",
        },
      ],
      now,
    });

    expect(result.dedupe_verdict).toBe("skip");
    expect(result.reason).toBe("prior_work_still_measuring");
  });

  it("blocks a repeated lost action until materially new evidence arrives", () => {
    const repeated = evaluateGrowthEvidenceCorrelation({
      websiteId,
      decisionFamily: "keyword_gap",
      actionClass: "content_publish",
      evidence: evidence(),
      priorWorkItems: [priorWork()],
      priorOutcomes: [
        {
          id: "55555555-5555-4555-8555-555555555555",
          work_item_id: "44444444-4444-4444-8444-444444444444",
          status: "lost",
        },
      ],
      now,
    });
    const newEvidence = evaluateGrowthEvidenceCorrelation({
      websiteId,
      decisionFamily: "keyword_gap",
      actionClass: "content_publish",
      evidence: evidence("sha256:provider-b"),
      priorWorkItems: [priorWork()],
      priorOutcomes: [
        {
          id: "55555555-5555-4555-8555-555555555555",
          work_item_id: "44444444-4444-4444-8444-444444444444",
          status: "lost",
        },
      ],
      now,
    });

    expect(repeated.dedupe_verdict).toBe("block");
    expect(repeated.reason).toBe("prior_lost_without_new_evidence");
    expect(newEvidence.dedupe_verdict).toBe("reopen");
    expect(newEvidence.materially_new_evidence).toBe(true);
  });

  it("blocks a previously won action instead of reopening the same scope", () => {
    const result = evaluateGrowthEvidenceCorrelation({
      websiteId,
      decisionFamily: "keyword_gap",
      actionClass: "content_publish",
      evidence: evidence("sha256:provider-b"),
      priorWorkItems: [priorWork()],
      priorOutcomes: [
        {
          id: "55555555-5555-4555-8555-555555555555",
          work_item_id: "44444444-4444-4444-8444-444444444444",
          status: "won",
        },
      ],
      now,
    });

    expect(result.dedupe_verdict).toBe("block");
    expect(result.reason).toBe("prior_won_same_action");
  });
});
