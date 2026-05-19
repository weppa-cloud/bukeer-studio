import { buildDataForSeoReadonlyAdapterDryRun } from "@/lib/growth/agentic/dataforseo-readonly-adapter";

const policy = {
  provider: "dataforseo",
  provider_profile_type: "onpage_summary",
  locale: "pt-BR",
  market: "BR",
  consent_granted: true,
  data_usage_policy: "store_normalized",
  enabled: true,
  rate_limit_daily: 5,
};

const input = {
  tenant: "ColombiaTours",
  account_id: "9fc24733-b127-4184-aa22-12f03b98927a",
  website_id: "894545b7-73ca-4dae-b76a-da5b6a3f8441",
  source_locale: "es-CO",
  source_market: "CO",
  target_locale: "pt-BR",
  target_market: "BR",
  provider_profile_type: "onpage_summary",
  policy,
  rows: [
    {
      entity_path: "/tour-colombia-10-dias",
      observed_at: "2026-05-19T00:00:00.000Z",
      feature_profile: "onpage_summary",
      provider_payload: { issue_count: 2, page_speed_watch: true },
      lineage_ref: "dataforseo://cache/colombiatours/tour-colombia-10-dias",
    },
  ],
};

describe("buildDataForSeoReadonlyAdapterDryRun", () => {
  it("normalizes cached DataForSEO evidence into governed write-gate candidates", () => {
    const report = buildDataForSeoReadonlyAdapterDryRun(input);

    expect(report.provider).toBe("dataforseo");
    expect(report.can_call_provider).toBe(false);
    expect(report.can_write_database).toBe(false);
    expect(report.can_publish).toBe(false);
    expect(report.runner_report.verdict).toBe("READY_FOR_NORMALIZATION_WRITE_GATE");
    expect(report.runner_report.normalized_fact_candidates).toHaveLength(1);
    expect(report.runner_report.normalized_fact_candidates[0]).toMatchObject({
      source: "dataforseo",
      signal_type: "seo_provider_normalized_signal",
      locale: "pt-BR",
      market: "BR",
    });
  });

  it("blocks without explicit policy", () => {
    const report = buildDataForSeoReadonlyAdapterDryRun({ ...input, policy: null });

    expect(report.runner_report.verdict).toBe("BLOCKED_BY_POLICY");
    expect(report.runner_report.normalized_fact_candidates).toHaveLength(0);
  });
});
