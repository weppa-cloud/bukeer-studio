import {
  GROWTH_PROVIDER_PROFILE_REGISTRY,
  getGrowthProviderProfile,
  listGrowthProviderProfiles,
} from "@/lib/growth/providers/profile-registry";

describe("growth provider profile registry", () => {
  it("keeps provider profile ids stable and unique", () => {
    const ids = GROWTH_PROVIDER_PROFILE_REGISTRY.map(
      (profile) => profile.profileId,
    );

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([
      "dfs_onpage_full_comparable_v3",
      "dfs_onpage_changed_urls_v1",
      "dfs_serp_labs_primary_v1",
      "dfs_serp_labs_secondary_v1",
      "dfs_historical_trends_v1",
      "dfs_authority_fallback_v1",
      "gsc_growth_minimum_v1",
      "gsc_indexability_v1",
      "ga4_growth_minimum_v1",
      "ga4_admin_governance_v1",
      "clarity_ux_friction_v1",
    ]);
  });

  it("marks historical trends as opt-in and cost-gated", () => {
    const profile = getGrowthProviderProfile("dfs_historical_trends_v1");

    expect(profile).toMatchObject({
      provider: "dataforseo",
      costMode: "opt_in_cost_gated",
      autonomy: "explicit_cost_approval",
      approval: {
        required: true,
        ownerIssueRequired: true,
        costEstimateRequired: true,
        expiresAtRequired: true,
      },
    });
  });

  it("marks free read-only Google profiles as automatic", () => {
    const googleProfiles = [
      getGrowthProviderProfile("gsc_growth_minimum_v1"),
      getGrowthProviderProfile("ga4_growth_minimum_v1"),
    ];

    expect(googleProfiles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          provider: "gsc",
          costMode: "free_read_only",
          autonomy: "automatic_read_only",
          approval: expect.objectContaining({ required: false }),
        }),
        expect.objectContaining({
          provider: "ga4",
          costMode: "free_read_only",
          autonomy: "automatic_read_only",
          approval: expect.objectContaining({ required: false }),
        }),
      ]),
    );
  });

  it("applies the shared circuit breaker contract to every profile", () => {
    for (const profile of GROWTH_PROVIDER_PROFILE_REGISTRY) {
      expect(profile.circuitBreaker).toMatchObject({
        consecutiveFailureLimit: 3,
        providerErrorStatus: "blocked_provider_error",
        quotaStatus: "quota_exhausted",
        costStatus: "cost_gated",
      });
    }
  });

  it("filters profiles by provider", () => {
    const dataForSeoProfiles = listGrowthProviderProfiles("dataforseo");

    expect(dataForSeoProfiles).toHaveLength(6);
    expect(
      dataForSeoProfiles.every((profile) => profile.provider === "dataforseo"),
    ).toBe(true);
  });
});
