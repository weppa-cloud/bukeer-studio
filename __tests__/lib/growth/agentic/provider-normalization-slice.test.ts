import {
  buildProviderNormalizationSliceDryRun,
  summarizeProviderNormalizationSlice,
} from "@/lib/growth/agentic/provider-normalization-slice";

const baseInput = {
  tenant: "ColombiaTours",
  website_id: "894545b7-73ca-4dae-b76a-da5b6a3f8441",
  source_locale: "es-CO",
  source_market: "CO",
  target_locale: "pt-BR",
  target_market: "BR",
  entity_path: "/tour-colombia-10-dias",
  provider: "dataforseo",
  provider_profile_id: "/v3/serp/google/organic/live/advanced",
  observed_at: "2026-05-18T00:00:00Z",
  provider_lineage_refs: [
    {
      source: "cache",
      provider: "dataforseo",
      endpoint: "/v3/serp/google/organic/live/advanced",
      cache_key: "colombiatours:/tour-colombia-10-dias:pt-BR:BR",
    },
  ],
};

describe("buildProviderNormalizationSliceDryRun", () => {
  it("blocks provider/cache lineage when no verified target fact exists", () => {
    const report = buildProviderNormalizationSliceDryRun({
      ...baseInput,
      policy_allowed: true,
      existing_source_fact_ids: [],
    });

    expect(report.verdict).toBe("BLOCKED_WITH_PRECISE_DATA_NEED");
    expect(report.candidate_source_ref.status).toBe("blocked_no_fact_ref");
    expect(report.blockers).toContain("missing_verified_target_growth_signal_fact_id");
    expect(report.allowed_next_action).toBe("collect_or_normalize_fact_first");
  });

  it("returns a controlled write candidate when policy and fact-level refs exist", () => {
    const report = buildProviderNormalizationSliceDryRun({
      ...baseInput,
      policy_allowed: true,
      existing_source_fact_ids: ["11111111-1111-1111-1111-111111111111"],
    });

    expect(report.verdict).toBe("READY_FOR_CONTROLLED_WRITE_GATE");
    expect(report.candidate_source_ref.status).toBe("candidate_only");
    expect(report.candidate_source_ref.source_fact_ref).toBe(
      "growth_signal_facts:11111111-1111-1111-1111-111111111111",
    );
    expect(report.allowed_next_action).toBe("controlled_write_gate");
  });

  it("blocks when provider policy is not explicitly allowed", () => {
    const report = buildProviderNormalizationSliceDryRun({
      ...baseInput,
      policy_allowed: false,
      existing_source_fact_ids: ["11111111-1111-1111-1111-111111111111"],
    });

    expect(report.verdict).toBe("BLOCKED_WITH_PRECISE_DATA_NEED");
    expect(report.blockers).toContain("provider_policy_not_explicitly_allowed");
  });

  it("blocks locale/market mismatches", () => {
    const report = buildProviderNormalizationSliceDryRun({
      ...baseInput,
      target_locale: "es-CO",
      target_market: "CO",
      policy_allowed: true,
      existing_source_fact_ids: ["11111111-1111-1111-1111-111111111111"],
    });

    expect(report.verdict).toBe("BLOCKED_WITH_PRECISE_DATA_NEED");
    expect(report.blockers).toContain("target_locale_market_not_colombiatours_ptbr_slice");
  });

  it("builds a stable candidate fact shape without writing to the database", () => {
    const report = buildProviderNormalizationSliceDryRun({
      ...baseInput,
      policy_allowed: true,
      existing_source_fact_ids: [],
    });

    expect(report.candidate_fact.locale).toBe("pt-BR");
    expect(report.candidate_fact.market).toBe("BR");
    expect(report.candidate_fact.signal_type).toBe("seo_provider_normalized_signal");
    expect(report.candidate_fact.payload.dry_run).toBe(true);
    expect(report.candidate_fact.idempotency_key).toContain("growth-provider-normalization");
  });

  it("summarizes the slice verdict for ops handoff", () => {
    const report = buildProviderNormalizationSliceDryRun({
      ...baseInput,
      policy_allowed: true,
      existing_source_fact_ids: [],
    });
    const summary = summarizeProviderNormalizationSlice(report);

    expect(summary).toContain("Provider Normalization Slice — ColombiaTours");
    expect(summary).toContain("/tour-colombia-10-dias");
    expect(summary).toContain("BLOCKED_WITH_PRECISE_DATA_NEED");
    expect(summary).toContain("missing_verified_target_growth_signal_fact_id");
  });
});
