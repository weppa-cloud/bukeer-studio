jest.mock("server-only", () => ({}), { virtual: true });

import { validateGrowthAgentArtifact } from "@/lib/growth/chief-of-staff/artifacts";

describe("Growth Chief of Staff artifact validation", () => {
  it("rejects safe_apply patches without rollback or smoke evidence", () => {
    const result = validateGrowthAgentArtifact({
      artifactType: "safe_apply_patch",
      payload: {
        target: { table: "website_pages", id: "page-1" },
        field_allowlist: ["seo_title"],
        patch: { seo_title: "Travel Colombia" },
      },
      providerEvidenceReads: [{ table: "growth_profile_runs", id: "run-1" }],
      riskAssessment: { risk: "low" },
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((error) => error.code)).toEqual(
      expect.arrayContaining(["rollback_payload_missing", "smoke_plan_missing"]),
    );
  });

  it("accepts content artifacts only with evidence, rollback expectation and outcome metric", () => {
    const result = validateGrowthAgentArtifact({
      artifactType: "content_article",
      payload: {
        title: "Best Time to Visit Colombia",
        slug: "best-time-to-visit-colombia",
        locale: "en",
        markdown: "# Best Time to Visit Colombia",
        rollback_expectation: { delete_created_post: true },
        success_metric: "organic_clicks_21d",
        evaluation_window: "day_21",
      },
      providerEvidenceReads: [{ table: "growth_signal_facts", id: "fact-1" }],
      riskAssessment: { risk: "medium" },
    });

    expect(result).toEqual({ valid: true, errors: [] });
  });

  it("blocks transcreation artifacts when source and target locales match", () => {
    const result = validateGrowthAgentArtifact({
      artifactType: "transcreation_payload",
      payload: {
        source_locale: "en",
        target_locale: "en",
        target: { table: "website_pages", id: "page-1" },
        payload: { title: "Colombia tours" },
        rollback_payload: { restore: { title: "Old title" } },
      },
      providerEvidenceReads: [{ table: "translation_memory", id: "tm-1" }],
      qualityReview: { pass: true },
      riskAssessment: { risk: "medium" },
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "locale_mismatch" }),
    );
  });
});
