import { planTranscreationMerge } from "@/lib/growth/autonomy/transcreation-merge-adapter";

const ids = {
  accountId: "11111111-1111-4111-8111-111111111111",
  websiteId: "22222222-2222-4222-8222-222222222222",
  workItemId: "33333333-3333-4333-8333-333333333333",
  changeSetId: "44444444-4444-4444-8444-444444444444",
  transcreationJobId: "55555555-5555-4555-8555-555555555555",
  localizedVariantId: "66666666-6666-4666-8666-666666666666",
  sourceEntityId: "77777777-7777-4777-8777-777777777777",
};

describe("transcreation merge adapter", () => {
  it("builds a transcreation_merge job linked to localized variant measurement", () => {
    const plan = planTranscreationMerge({
      ...ids,
      sourceLocale: "es-CO",
      targetLocale: "en-US",
      pageType: "blog",
      payload: {
        title: "Colombia travel guide for custom trips",
        slug: "colombia-travel-guide-custom-trips",
        meta_title: "Colombia Travel Guide for Custom Trips",
        meta_desc:
          "Explore a Colombia travel guide written for custom trips, local context, and practical route planning across regions.",
        body_overlay_v2: {
          summary: "Localized body overlay for the English market.",
        },
      },
      quality: { score: 0.92, passed: true },
      now: new Date("2026-05-07T12:00:00.000Z"),
    });

    expect(plan.smoke.pass).toBe(true);
    expect(plan.job.lane).toBe("transcreation");
    expect(plan.job.action_class).toBe("transcreation_merge");
    expect(plan.job.target_table).toBe("seo_localized_variants");
    expect(plan.job.target_id).toBe(ids.localizedVariantId);
    expect(plan.outcomes.map((outcome) => outcome.evaluation_window)).toEqual([
      "day_21",
      "day_45",
    ]);
  });

  it("blocks locale mismatch and low quality payloads", () => {
    const plan = planTranscreationMerge({
      ...ids,
      sourceLocale: "es-CO",
      targetLocale: "es-CO",
      pageType: "page",
      payload: {
        meta_title: "Bad translation",
        meta_desc:
          "This description is intentionally long enough to isolate the locale and quality failures in this test case.",
      },
      quality: { score: 0.62, passed: false, issues: ["locale mismatch"] },
    });

    expect(plan.smoke.pass).toBe(false);
    expect(plan.job.status).toBe("blocked");
    expect(plan.smoke.failures).toContain("target_locale_matches_source");
    expect(plan.smoke.failures).toContain("quality_gate_failed");
    expect(plan.smoke.failures).toContain("quality_score_below_threshold");
    expect(plan.smoke.failures).toContain("missing_body_payload");
  });
});
