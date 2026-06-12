import fs from "node:fs";
import path from "node:path";

describe("populate-growth-google-cache GA4 profile definitions", () => {
  it("does not request deprecated conversions alongside keyEvents", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "scripts/seo/populate-growth-google-cache.ts"),
      "utf8",
    );

    const ga4Pulls = source.slice(
      source.indexOf("const GA4_PULLS"),
      source.indexOf("const EXPANDED_GSC_PULLS"),
    );

    expect(ga4Pulls).toContain('"keyEvents"');
    expect(ga4Pulls).not.toContain('"conversions"');
  });

  it("does not request the invalid GSC page plus searchAppearance grouping", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "scripts/seo/populate-growth-google-cache.ts"),
      "utf8",
    );

    expect(source).toContain('"search_appearance_discovery"');
    expect(source).not.toContain('"page_search_appearance"');
  });
});
