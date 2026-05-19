import {
  buildGovernedProviderRunnerDryRun,
  summarizeGovernedProviderRunner,
} from "@/lib/growth/agentic/governed-provider-runner";

const policy = {
  provider: "manual",
  provider_profile_type: "operator_source_truth_write_gate",
  locale: "pt-BR",
  market: "BR",
  consent_granted: true,
  data_usage_policy: "store_normalized",
  enabled: true,
  rate_limit_daily: 5,
};

const baseInput = {
  tenant: "ColombiaTours",
  account_id: "9fc24733-b127-4184-aa22-12f03b98927a",
  website_id: "894545b7-73ca-4dae-b76a-da5b6a3f8441",
  provider: "manual",
  provider_profile_type: "operator_source_truth_write_gate",
  provider_profile_id: "manual/operator_source_truth_write_gate",
  source_locale: "es-CO",
  source_market: "CO",
  target_locale: "pt-BR",
  target_market: "BR",
  policy,
  now: "2026-05-19T00:00:00.000Z",
  evidence_rows: [
    {
      entity_path: "/bogota-cartagena-6-dias",
      observed_at: "2026-05-19T00:00:00.000Z",
      lineage_ref: "operator://colombiatours/slice2/bogota-cartagena-6-dias",
      provider_payload: { esco_facts_seen: 250 },
    },
    {
      entity_path: "/tour-colombia-15-dias",
      observed_at: "2026-05-19T00:00:00.000Z",
      lineage_ref: "operator://colombiatours/slice2/tour-colombia-15-dias",
      provider_payload: { esco_facts_seen: 239 },
    },
  ],
};

describe("buildGovernedProviderRunnerDryRun", () => {
  it("creates normalized candidates only when policy, evidence, and locale/market gates pass", () => {
    const report = buildGovernedProviderRunnerDryRun(baseInput);

    expect(report.verdict).toBe("READY_FOR_NORMALIZATION_WRITE_GATE");
    expect(report.allowed_operations).toEqual([
      "read_provider_evidence",
      "normalize_to_candidates",
      "write_gate_required",
    ]);
    expect(report.normalized_fact_candidates).toHaveLength(2);
    expect(report.normalized_fact_candidates[0]).toMatchObject({
      locale: "pt-BR",
      market: "BR",
      source: "manual",
      signal_type: "operator_normalized_page_source_truth",
      entity_path: "/bogota-cartagena-6-dias",
      provider_profile_id: "manual/operator_source_truth_write_gate",
    });
    expect(report.normalized_fact_candidates[0].payload.write_gate_required).toBe(true);
    expect(report.normalized_fact_candidates[0].idempotency_key).toContain(
      "governed-provider-runner",
    );
  });

  it("never performs provider calls, database writes, or publish in the runner contract", () => {
    const report = buildGovernedProviderRunnerDryRun(baseInput);

    expect(report.can_call_provider).toBe(false);
    expect(report.can_write_database).toBe(false);
    expect(report.can_publish).toBe(false);
  });

  it("blocks when policy is disabled or lacks store_normalized consent", () => {
    const report = buildGovernedProviderRunnerDryRun({
      ...baseInput,
      policy: { ...policy, enabled: false },
    });

    expect(report.verdict).toBe("BLOCKED_BY_POLICY");
    expect(report.blockers).toContain(
      "provider_policy_must_enable_store_normalized_with_consent",
    );
    expect(report.normalized_fact_candidates).toHaveLength(0);
  });

  it("blocks implicit locale/market fallback", () => {
    const report = buildGovernedProviderRunnerDryRun({
      ...baseInput,
      target_locale: "es-CO",
      target_market: "CO",
      policy: { ...policy, locale: "es-CO", market: "CO" },
    });

    expect(report.verdict).toBe("BLOCKED_BY_LOCALE_MARKET");
    expect(report.blockers).toContain("target_locale_market_must_be_exact_pt-BR_BR");
  });

  it("blocks when evidence exceeds policy rate limit", () => {
    const report = buildGovernedProviderRunnerDryRun({
      ...baseInput,
      policy: { ...policy, rate_limit_daily: 1 },
      max_rows: 1,
    });

    expect(report.verdict).toBe("BLOCKED_BY_EVIDENCE");
    expect(report.blockers).toContain("evidence_rows_exceed_policy_rate_limit");
  });

  it("emits ready fact refs only when target fact ids already exist", () => {
    const report = buildGovernedProviderRunnerDryRun({
      ...baseInput,
      existing_target_fact_ids_by_entity: {
        "/bogota-cartagena-6-dias": ["7b592169-7fd7-434a-a51b-d5dafa94f77f"],
      },
    });

    expect(report.source_ref_candidates[0]).toMatchObject({
      entity_path: "/bogota-cartagena-6-dias",
      status: "ready_fact_ref",
      source_fact_ref: "growth_signal_facts:7b592169-7fd7-434a-a51b-d5dafa94f77f",
      freshness_status: "fresh",
    });
    expect(report.source_ref_candidates[1].status).toBe("needs_fact_write");
  });

  it("summarizes runner guardrails for ops handoff", () => {
    const summary = summarizeGovernedProviderRunner(buildGovernedProviderRunnerDryRun(baseInput));

    expect(summary).toContain("Governed Provider Runner — ColombiaTours");
    expect(summary).toContain("READY_FOR_NORMALIZATION_WRITE_GATE");
    expect(summary).toContain("Can call provider: false");
    expect(summary).toContain("Can write database: false");
    expect(summary).toContain("Can publish: false");
  });
});
