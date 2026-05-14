import {
  mergeAnalyticsConfig,
  readAnalyticsString,
} from "@/lib/admin/analytics-config";

describe("analytics config merge guard", () => {
  it("preserves non-editable and unknown analytics keys", () => {
    const merged = mergeAnalyticsConfig(
      {
        ga4_id: "G-OLD",
        gtm_id: "GTM-OLD",
        google_ads_id: "AW-852643280",
        facebook_pixel_id: "361881980826384",
        clarity_project_id: "oldclarity",
        future_destination: { enabled: true },
      },
      {
        clarity_project_id: "tj1pmavijv",
      },
    );

    expect(merged).toEqual({
      ga4_id: "G-OLD",
      gtm_id: "GTM-OLD",
      google_ads_id: "AW-852643280",
      facebook_pixel_id: "361881980826384",
      clarity_project_id: "tj1pmavijv",
      future_destination: { enabled: true },
    });
  });

  it("trims editable tracking IDs and removes only edited blank keys", () => {
    const merged = mergeAnalyticsConfig(
      {
        ga4_id: "G-OLD",
        google_ads_id: "AW-852643280",
        custom_head_scripts: "<script></script>",
      },
      {
        ga4_id: "  G-6ET7YRM7NS  ",
        facebook_pixel_id: "",
      },
    );

    expect(merged).toEqual({
      ga4_id: "G-6ET7YRM7NS",
      google_ads_id: "AW-852643280",
      custom_head_scripts: "<script></script>",
    });
  });

  it("reads string values without exposing non-string JSON as input text", () => {
    expect(readAnalyticsString({ ga4_id: "G-6ET7YRM7NS" }, "ga4_id")).toBe(
      "G-6ET7YRM7NS",
    );
    expect(readAnalyticsString({ ga4_id: 123 }, "ga4_id")).toBe("");
  });
});
