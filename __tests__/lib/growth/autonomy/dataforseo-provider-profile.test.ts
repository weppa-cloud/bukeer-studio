import {
  buildDataForSeoProviderSnapshot,
  dataForSeoRequirementFromSnapshot,
  type DataForSeoCacheRow,
} from "@/lib/growth/autonomy/dataforseo-provider-profile";

function row(overrides: Partial<DataForSeoCacheRow>): DataForSeoCacheRow {
  return {
    id: crypto.randomUUID(),
    endpoint: "/v3/dataforseo_labs/google/keyword_ideas/live",
    cache_key: "keyword:colombia tours",
    cache_tag: "labs_keywords:co:es",
    payload: { items: [{ keyword: "colombia tours" }] },
    fetched_at: "2026-05-09T00:00:00.000Z",
    expires_at: "2026-05-16T00:00:00.000Z",
    ...overrides,
  };
}

describe("DataForSEO provider profile bridge", () => {
  it("builds explicit feature snapshots from cache rows", () => {
    const snapshot = buildDataForSeoProviderSnapshot(
      [
        row({ id: "11111111-1111-4111-8111-111111111111" }),
        row({
          id: "22222222-2222-4222-8222-222222222222",
          endpoint: "/v3/on_page/summary",
          cache_tag: "onpage:colombiatours",
          payload: { pages: [{ url: "https://colombiatours.travel" }] },
        }),
      ],
      new Date("2026-05-10T00:00:00.000Z"),
    );

    expect(snapshot.access_status).toBe("available");
    expect(snapshot.by_feature_profile.labs_keywords?.access_status).toBe(
      "available",
    );
    expect(snapshot.by_feature_profile.onpage?.evidence_count).toBeGreaterThan(0);
  });

  it("marks stale snapshots when cache rows are expired", () => {
    const snapshot = buildDataForSeoProviderSnapshot(
      [
        row({
          fetched_at: "2026-04-01T00:00:00.000Z",
          expires_at: "2026-04-08T00:00:00.000Z",
        }),
      ],
      new Date("2026-05-10T00:00:00.000Z"),
    );

    expect(snapshot.access_status).toBe("stale");
    expect(snapshot.blockers).toContain("dataforseo_stale:labs_keywords");
  });

  it("blocks required provider evidence when the feature is missing", () => {
    const snapshot = buildDataForSeoProviderSnapshot(
      [row({ endpoint: "/v3/on_page/summary", cache_tag: "onpage" })],
      new Date("2026-05-10T00:00:00.000Z"),
    );

    const requirement = dataForSeoRequirementFromSnapshot({
      required: true,
      featureProfile: "serp",
      snapshot,
    });

    expect(requirement.status).toBe("blocked");
    expect(requirement.blockers).toEqual(
      expect.arrayContaining(["dataforseo_missing_feature:serp"]),
    );
  });

  it("allows explicit strategic exceptions without pretending provider data exists", () => {
    const requirement = dataForSeoRequirementFromSnapshot({
      required: true,
      featureProfile: "serp",
      snapshot: null,
      exceptionReason: "CEO-approved seasonal content test.",
    });

    expect(requirement.status).toBe("excepted");
    expect(requirement.snapshot).toBeNull();
    expect(requirement.exception_reason).toMatch(/seasonal content/i);
  });
});
