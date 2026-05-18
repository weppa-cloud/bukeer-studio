import {
  evaluateSourceTruthDryRun,
  isReadyForAutonomousContext,
  summarizeReadiness,
  type ProfileRunSample,
} from "@/lib/growth/agentic/source-truth-normalizer";

const now = new Date("2026-05-18T00:00:00.000Z");
const knownFactId = "22222222-2222-4222-8222-222222222222";

function colombiatoursSample(
  overrides: Partial<ProfileRunSample> = {},
): ProfileRunSample {
  return {
    run_id: "run-001",
    profile_type: "gsc_growth_minimum_v1",
    provider: "gsc",
    locale: "es-CO",
    market: "CO",
    source_refs: [],
    observed_at: "2026-05-17T00:00:00.000Z",
    policy_allowed: true,
    ...overrides,
  };
}

describe("evaluateSourceTruthDryRun", () => {
  it("returns not ready when no profiles exist for the target locale/market", () => {
    const report = evaluateSourceTruthDryRun(
      "894545b7-73ca-4dae-b76a-da5b6a3f8441",
      "ColombiaTours",
      "pt-BR",
      "BR",
      "es-CO",
      "CO",
      [
        colombiatoursSample({
          run_id: "run-001",
          locale: "es-CO",
          market: "CO",
        }),
      ],
    );

    expect(report.ready).toBe(false);
    expect(report.blockers).toContain(
      "No existing profiles for target locale/market: pt-BR/BR. All profile data is from source locale/market (es-CO/CO).",
    );
    expect(report.profiles_evaluated).toHaveLength(1);
    expect(report.total_refs).toBe(0);
  });

  it("blocks when no known fact IDs are provided", () => {
    const report = evaluateSourceTruthDryRun(
      "894545b7-73ca-4dae-b76a-da5b6a3f8441",
      "ColombiaTours",
      "pt-BR",
      "BR",
      "es-CO",
      "CO",
      [
        colombiatoursSample({
          run_id: "run-002",
          locale: "pt-BR",
          market: "BR",
        }),
      ],
      [],
    );

    expect(report.ready).toBe(false);
    expect(report.blockers).toContain(
      "No known growth_signal_fact IDs provided. Zero facts can be verified in the VERIFIED_FACT_REF state.",
    );
  });

  it("classifies a fact ref as verified when the fact ID is known", () => {
    const report = evaluateSourceTruthDryRun(
      "894545b7-73ca-4dae-b76a-da5b6a3f8441",
      "ColombiaTours",
      "pt-BR",
      "BR",
      "es-CO",
      "CO",
      [
        colombiatoursSample({
          run_id: "run-003",
          profile_type: "gsc_growth_minimum_v1",
          provider: "gsc",
          locale: "pt-BR",
          market: "BR",
          source_refs: [`growth_signal_facts:${knownFactId}`],
          observed_at: "2026-05-17T00:00:00.000Z",
        }),
      ],
      [knownFactId],
    );

    expect(report.profiles_evaluated).toHaveLength(1);
    expect(report.profiles_evaluated[0].refs_resolved[0].status).toBe("VERIFIED_FACT_REF");
    expect(report.verified_fact_refs).toBe(1);
    expect(isReadyForAutonomousContext(report)).toBe(true);
    expect(report.ready).toBe(true);
  });

  it("classifies provider-only refs as unresolved and generates fact mapping suggestions", () => {
    const report = evaluateSourceTruthDryRun(
      "894545b7-73ca-4dae-b76a-da5b6a3f8441",
      "ColombiaTours",
      "pt-BR",
      "BR",
      "es-CO",
      "CO",
      [
        colombiatoursSample({
          run_id: "run-004",
          profile_type: "dfs_onpage_full_comparable_v3",
          provider: "dataforseo",
          locale: "pt-BR",
          market: "BR",
          source_refs: ["provider:dataforseo:dfs_authority_fallback_v1"],
          observed_at: "2026-05-17T00:00:00.000Z",
        }),
      ],
      [knownFactId],
    );

    expect(report.unresolved_provider_cache_refs).toBe(1);
    expect(report.verified_fact_refs).toBe(0);
    expect(report.missing_fact_candidates).toHaveLength(1);
    expect(report.missing_fact_candidates[0].suggested_fact_type).toBe("onpage_tech_issues");
    expect(report.missing_fact_candidates[0].reason).toContain("onpage_tech_issues");
    expect(report.blockers).toHaveLength(1);
    expect(report.blockers[0]).toContain("run-004");
  });

  it("classifies cache refs as unresolved and associates them with the correct profile type", () => {
    const report = evaluateSourceTruthDryRun(
      "894545b7-73ca-4dae-b76a-da5b6a3f8441",
      "ColombiaTours",
      "pt-BR",
      "BR",
      "es-CO",
      "CO",
      [
        colombiatoursSample({
          run_id: "run-005",
          profile_type: "gsc_growth_minimum_v1",
          provider: "gsc",
          locale: "pt-BR",
          market: "BR",
          source_refs: ["cache:growth_gsc_cache:abc123"],
          observed_at: "2026-05-17T00:00:00.000Z",
        }),
      ],
      [knownFactId],
    );

    expect(report.unresolved_provider_cache_refs).toBe(1);
    expect(report.missing_fact_candidates[0].suggested_fact_type).toBe("search_demand_metrics");
    expect(report.blockers).toHaveLength(1);
  });

  it("aggregates multiple profile runs and refs correctly", () => {
    const report = evaluateSourceTruthDryRun(
      "894545b7-73ca-4dae-b76a-da5b6a3f8441",
      "ColombiaTours",
      "pt-BR",
      "BR",
      "es-CO",
      "CO",
      [
        colombiatoursSample({
          run_id: "run-006",
          profile_type: "gsc_growth_minimum_v1",
          provider: "gsc",
          locale: "pt-BR",
          market: "BR",
          source_refs: [`growth_signal_facts:${knownFactId}`, "provider:gsc:some_ref"],
          observed_at: "2026-05-17T00:00:00.000Z",
        }),
        colombiatoursSample({
          run_id: "run-007",
          profile_type: "ga4_growth_minimum_v1",
          provider: "ga4",
          locale: "pt-BR",
          market: "BR",
          source_refs: ["cache:growth_ga4_cache:def456"],
          observed_at: "2026-05-17T00:00:00.000Z",
        }),
      ],
      [knownFactId],
    );

    expect(report.total_refs).toBe(3);
    expect(report.verified_fact_refs).toBe(1);
    expect(report.unresolved_provider_cache_refs).toBe(2);
    expect(report.profiles_evaluated).toHaveLength(2);
    expect(report.missing_fact_candidates).toHaveLength(2);

    // run-006 has 1 verified + 1 unresolved -> not fully resolved
    expect(report.profiles_evaluated[0].fully_resolved).toBe(false);
    // run-007 has 1 unresolved -> not fully resolved
    expect(report.profiles_evaluated[1].fully_resolved).toBe(false);
    expect(report.ready).toBe(false);
  });

  it("classifies a ref to an unknown fact ID as invalid", () => {
    const report = evaluateSourceTruthDryRun(
      "894545b7-73ca-4dae-b76a-da5b6a3f8441",
      "ColombiaTours",
      "pt-BR",
      "BR",
      "es-CO",
      "CO",
      [
        colombiatoursSample({
          run_id: "run-008",
          profile_type: "gsc_growth_minimum_v1",
          provider: "gsc",
          locale: "pt-BR",
          market: "BR",
          source_refs: [`growth_signal_facts:${knownFactId}`],
          observed_at: "2026-05-17T00:00:00.000Z",
        }),
      ],
      [], // no known fact IDs -> fact_ref_not_verified
    );

    expect(report.invalid_or_stale_refs).toBe(1);
    expect(report.verified_fact_refs).toBe(0);
    expect(report.ready).toBe(false);
  });

  it("generates a coherent summary without errors", () => {
    const report = evaluateSourceTruthDryRun(
      "894545b7-73ca-4dae-b76a-da5b6a3f8441",
      "ColombiaTours",
      "pt-BR",
      "BR",
      "es-CO",
      "CO",
      [
        colombiatoursSample({
          run_id: "run-009",
          profile_type: "gsc_growth_minimum_v1",
          provider: "gsc",
          locale: "pt-BR",
          market: "BR",
          source_refs: [`growth_signal_facts:${knownFactId}`],
          observed_at: "2026-05-17T00:00:00.000Z",
        }),
      ],
      [knownFactId],
    );

    const summary = summarizeReadiness(report);
    expect(summary).toContain("Source Truth Readiness — ColombiaTours");
    expect(summary).toContain("es-CO/CO → pt-BR/BR");
    expect(summary).toContain("VERIFIED_FACT_REF: 1");
    expect(summary).toContain("Ready for autonomous context: YES");
  });

  it("reports blockers in the summary when readiness fails", () => {
    const report = evaluateSourceTruthDryRun(
      "894545b7-73ca-4dae-b76a-da5b6a3f8441",
      "ColombiaTours",
      "pt-BR",
      "BR",
      "es-CO",
      "CO",
      [
        colombiatoursSample({
          run_id: "run-010",
          locale: "es-CO",
          market: "CO",
        }),
      ],
    );

    const summary = summarizeReadiness(report);
    expect(summary).toContain("Blockers (2)");
    expect(summary).toContain("No existing profiles for target locale/market");
    expect(summary).toContain("No known growth_signal_fact IDs provided");
    expect(summary).toContain("Ready for autonomous context: NO");
  });
});