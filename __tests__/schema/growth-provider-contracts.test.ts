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

describe("Growth provider contracts", () => {
  it("accepts a completed provider profile run with fingerprint metadata", () => {
    const parsed = ProviderProfileRunInsertSchema.parse({
      ...scope,
      provider: "gsc",
      profile_id: "gsc_growth_minimum_v1",
      run_status: "completed",
      freshness_status: "fresh",
      source_refs: {
        cache_table: "growth_gsc_cache",
        cache_ids: ["cache-row-1"],
      },
      evidence_fingerprint: "sha256:gsc-growth-minimum-stable",
      entity_key: "url:/tours/colombia",
      action_key: "content_refresh:/tours/colombia",
      idempotency_key: "profile-run:gsc:min:2026-05-10",
      started_at: "2026-05-10T10:00:00.000Z",
      completed_at: "2026-05-10T10:03:00.000Z",
    });

    expect(parsed.provider).toBe("gsc");
    expect(parsed.circuit_breaker.status).toBe("closed");
  });

  it("requires approval metadata for approval-gated profile runs", () => {
    const parsed = ProviderProfileRunInsertSchema.safeParse({
      ...scope,
      provider: "dataforseo",
      profile_id: "dfs_historical_trends_v1",
      run_status: "cost_gated",
      freshness_status: "approval_required",
      idempotency_key: "profile-run:dfs:historical:no-approval",
    });

    expect(parsed.success).toBe(false);
  });

  it("accepts provider evidence reads with fresh required evidence", () => {
    const parsed = ProviderEvidenceReadSchema.parse({
      provider: "dataforseo",
      profile_id: "dfs_onpage_changed_urls_v1",
      cache_ids: ["dfs-cache-1"],
      row_count: 1,
      evidence_count: 12,
      fetched_at: "2026-05-10T10:00:00.000Z",
      expires_at: "2026-05-17T10:00:00.000Z",
      freshness_status: "fresh",
      evidence_fingerprint: "sha256:onpage-changed-stable",
      entity_key: "url:/tours/colombia",
      action_key: "safe_apply:title:/tours/colombia",
      required_for_action: true,
    });

    expect(parsed.required_for_action).toBe(true);
  });

  it("rejects required stale evidence without a formal exception", () => {
    const parsed = ProviderEvidenceReadSchema.safeParse({
      provider: "clarity",
      profile_id: "clarity_ux_friction_v1",
      freshness_status: "stale",
      evidence_fingerprint: "sha256:stale-clarity",
      required_for_action: true,
    });

    expect(parsed.success).toBe(false);
  });

  it("accepts anti-rework correlation verdicts", () => {
    const parsed = GrowthEvidenceCorrelationResultSchema.parse({
      website_id: scope.website_id,
      decision_family: "technical_seo_issue",
      entity_key: "url:/tours/colombia",
      action_key: "safe_apply:title:/tours/colombia",
      evidence_fingerprint: "sha256:onpage-changed-stable",
      correlation_key:
        "22222222-2222-4222-8222-222222222222:technical_seo_issue:safe_apply:title:/tours/colombia",
      dedupe_verdict: "reopen",
      reason: "Materially new OnPage evidence after prior fix.",
      previous_work_item_id: "33333333-3333-4333-8333-333333333333",
    });

    expect(parsed.dedupe_verdict).toBe("reopen");
  });
});
