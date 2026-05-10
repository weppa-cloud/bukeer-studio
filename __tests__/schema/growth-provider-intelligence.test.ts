import {
  GrowthEvidenceCorrelationResultSchema,
  ProviderEvidenceReadSchema,
  ProviderProfileRunInsertSchema,
} from "@bukeer/website-contract";

const scope = {
  account_id: "11111111-1111-4111-8111-111111111111",
  website_id: "22222222-2222-4222-8222-222222222222",
  locale: "es-CO",
  market: "CO",
};

describe("Growth provider intelligence contracts", () => {
  it("validates provider profile runs with approval and circuit breaker metadata", () => {
    const parsed = ProviderProfileRunInsertSchema.safeParse({
      ...scope,
      provider: "dataforseo",
      profile_id: "dfs_historical_trends_v1",
      run_status: "cost_gated",
      freshness_status: "approval_required",
      quality_status: "watch",
      source_refs: ["growth_dataforseo_cache:abc"],
      cost_usd: 0,
      evidence_fingerprint: "sha256:test",
      entity_key: "keyword:CO:colombia tours",
      action_key: "content_publish:keyword:CO:colombia tours",
      approval: {
        owner_issue: "#474",
        approver_role: "owner",
        approved_by: "consultoria@weppa.co",
        approved_at: "2026-05-10T00:00:00.000Z",
        expires_at: "2026-06-10T00:00:00.000Z",
        scope: { max_keywords: 50 },
        max_cost_usd_per_run: 10,
      },
      circuit_breaker: {
        failure_count: 0,
        status: "closed",
      },
      payload: { profile: "historical" },
      idempotency_key: "provider-run:dfs-historical:co",
      started_at: null,
      completed_at: null,
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects approvals with expired windows", () => {
    const parsed = ProviderProfileRunInsertSchema.safeParse({
      ...scope,
      provider: "dataforseo",
      profile_id: "dfs_onpage_full_v2",
      approval: {
        owner_issue: "#473",
        approver_role: "owner",
        approved_by: "admin",
        approved_at: "2026-06-10T00:00:00.000Z",
        expires_at: "2026-05-10T00:00:00.000Z",
        scope: {},
      },
      payload: {},
      idempotency_key: "provider-run:bad-approval",
    });

    expect(parsed.success).toBe(false);
  });

  it("validates provider evidence reads and correlation verdicts", () => {
    const read = ProviderEvidenceReadSchema.parse({
      provider: "gsc",
      profile_id: "gsc_growth_minimum_v1",
      evidence_fingerprint: "sha256:gsc",
      source_refs: ["growth_gsc_cache:row"],
      freshness_status: "fresh",
      quality_status: "pass",
    });

    const correlation = GrowthEvidenceCorrelationResultSchema.parse({
      entity_key: "url:/blog/colombia",
      action_key: "content_publish:url:/blog/colombia",
      correlation_key:
        "22222222-2222-4222-8222-222222222222:provider_intelligence:content_publish:url:/blog/colombia",
      evidence_fingerprint: read.evidence_fingerprint,
      dedupe_verdict: "create",
    });

    expect(correlation.dedupe_verdict).toBe("create");
  });
});
