import {
  canUseSourceRefForAutonomousContext,
  resolveSourceRefDryRun,
} from "@/lib/growth/agentic/source-ref-resolver";

const now = new Date("2026-05-18T00:00:00.000Z");
const factId = "11111111-1111-4111-8111-111111111111";

const base = {
  source_locale: "es-CO",
  target_locale: "pt-BR",
  expected_target_locale: "pt-BR",
  market: "BR",
  expected_market: "BR",
  observed_at: "2026-05-17T00:00:00.000Z",
  now,
  max_age_days: 30,
  policy_allowed: true,
};

describe("resolveSourceRefDryRun", () => {
  it("verifies fact-level refs only when the fact id is known and gates are satisfied", () => {
    const result = resolveSourceRefDryRun({
      ...base,
      source_ref: `growth_signal_facts:${factId}`,
      known_fact_ids: [factId],
    });

    expect(result.status).toBe("VERIFIED_FACT_REF");
    expect(result.source_fact_id).toBe(factId);
    expect(result.freshness_status).toBe("fresh");
    expect(result.policy_status).toBe("allowed");
    expect(result.locale_market_status).toBe("exact");
    expect(canUseSourceRefForAutonomousContext(result)).toBe(true);
  });

  it("does not upgrade provider refs into fact refs without a verified mapping", () => {
    const result = resolveSourceRefDryRun({
      ...base,
      source_ref: "provider:dataforseo:keyword:cartagena",
      known_fact_ids: [factId],
    });

    expect(result.status).toBe("UNRESOLVED_PROVIDER_CACHE_REF");
    expect(result.source_fact_id).toBeUndefined();
    expect(result.reasons).toContain("provider_cache_ref_without_fact_mapping");
    expect(canUseSourceRefForAutonomousContext(result)).toBe(false);
  });

  it("classifies cache refs with external evidence as non-autonomous external refs", () => {
    const result = resolveSourceRefDryRun({
      ...base,
      source_ref: "cache:growth_dataforseo_cache:abc123",
      external_match: {
        provider: "dataforseo",
        cache_table: "growth_dataforseo_cache",
        cache_key: "abc123",
        observed_at: "2026-05-17T00:00:00.000Z",
      },
    });

    expect(result.status).toBe("VERIFIED_EXTERNAL_REF");
    expect(result.external_ref?.cache_key).toBe("abc123");
    expect(canUseSourceRefForAutonomousContext(result)).toBe(false);
  });

  it("blocks unknown fact ids instead of inventing source_refs", () => {
    const result = resolveSourceRefDryRun({
      ...base,
      source_ref: `growth_signal_facts:${factId}`,
      known_fact_ids: [],
    });

    expect(result.status).toBe("INVALID_OR_STALE_REF");
    expect(result.reasons).toContain("fact_ref_not_verified");
    expect(canUseSourceRefForAutonomousContext(result)).toBe(false);
  });

  it("blocks fact refs when freshness is unknown", () => {
    const result = resolveSourceRefDryRun({
      ...base,
      source_ref: `growth_signal_facts:${factId}`,
      known_fact_ids: [factId],
      observed_at: undefined,
    });

    expect(result.status).toBe("INVALID_OR_STALE_REF");
    expect(result.reasons).toContain("freshness_unknown");
    expect(canUseSourceRefForAutonomousContext(result)).toBe(false);
  });

  it("blocks locale/market mismatch unless fallback is explicit", () => {
    const blocked = resolveSourceRefDryRun({
      ...base,
      source_ref: `growth_signal_facts:${factId}`,
      known_fact_ids: [factId],
      market: "CO",
    });

    expect(blocked.locale_market_status).toBe("blocked");
    expect(blocked.reasons).toContain("locale_market_blocked");
    expect(canUseSourceRefForAutonomousContext(blocked)).toBe(false);

    const fallback = resolveSourceRefDryRun({
      ...base,
      source_ref: `growth_signal_facts:${factId}`,
      known_fact_ids: [factId],
      market: "CO",
      allowed_fallback: true,
    });

    expect(fallback.locale_market_status).toBe("explicit_fallback");
    expect(canUseSourceRefForAutonomousContext(fallback)).toBe(true);
  });

  it("rejects unsupported or missing refs", () => {
    expect(
      resolveSourceRefDryRun({
        ...base,
        source_ref: null,
      }).status,
    ).toBe("INVALID_OR_STALE_REF");

    expect(
      resolveSourceRefDryRun({
        ...base,
        source_ref: "random:string",
      }).reasons,
    ).toContain("unsupported_source_ref_format");
  });
});
