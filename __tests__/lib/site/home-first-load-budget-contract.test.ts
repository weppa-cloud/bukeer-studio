import { readFileSync } from "node:fs";
import path from "node:path";

function readSource(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("home first-load data budget contract", () => {
  it("does not fetch below-fold catalog/blog data unless the section is enabled", () => {
    const source = readSource("app/site/[subdomain]/page.tsx");
    const deferredSource = source.match(
      /async function DeferredHomeSections[\s\S]*?\n}\n\nexport default async function SitePage/,
    )?.[0];

    expect(deferredSource).toBeDefined();
    expect(deferredSource).toContain("hasDestinationsSection");
    expect(deferredSource).toContain("hasPackagesSection");
    expect(deferredSource).toContain("hasActivitiesSection");
    expect(deferredSource).toContain("hasHotelsSection");
    expect(deferredSource).toContain("hasBlogSection");
    expect(deferredSource).toMatch(
      /hasPackagesSection[\s\S]*getCategoryProducts\(subdomain, SECTION_PACKAGES/,
    );
    expect(deferredSource).toMatch(
      /hasBlogSection[\s\S]*getBlogPosts\(websiteId/,
    );
  });

  it("keeps repeated home section data out of the render payload", () => {
    const source = readSource("app/site/[subdomain]/page.tsx");
    const layoutSource = readSource("app/site/[subdomain]/layout.tsx");
    const helperSource = readSource("lib/site/home-rendering.ts");

    expect(source).toContain("createHomeRenderWebsite");
    expect(layoutSource).toContain("createHomeRenderWebsite");
    expect(layoutSource).toContain("includeSectionSummaries: true");
    expect(helperSource).toContain("sections: includeSectionSummaries");
    expect(helperSource).toContain("featured_products: {");
    expect(source).not.toMatch(/const websiteForRender = \{\s*\.\.\.website/);
    expect(layoutSource).not.toMatch(
      /const websiteForRender = \{\s*\.\.\.website/,
    );
    expect(source).toContain("deferredSections");
    expect(source).toContain("enabledSections={deferredSections}");
    expect(source).not.toContain("criticalSectionIds={criticalSectionIds}");
  });

  it("does not serialize account legal copy into the public home render payload", () => {
    const source = readSource("lib/site/home-rendering.ts");
    const renderWebsiteSource = source.match(
      /export function createHomeRenderWebsite[\s\S]*?\n}\n\nexport function resolveHomeEnabledSections/,
    )?.[0];

    expect(renderWebsiteSource).toBeDefined();
    expect(renderWebsiteSource).toContain("account: account");
    expect(renderWebsiteSource).not.toContain("legal");
    expect(renderWebsiteSource).not.toContain("terms_conditions");
    expect(renderWebsiteSource).not.toContain("cancellation_policy");
    expect(renderWebsiteSource).not.toContain("privacy_policy");
  });

  it("keeps public timing instrumentation behind an explicit probe header", () => {
    const source = readSource("app/site/[subdomain]/page.tsx");

    expect(source).toContain(
      'const PUBLIC_HOME_TIMING_HEADER = "x-bukeer-debug-timing"',
    );
    expect(source).toContain("timedPublicHome");
    expect(source).toContain("[public_home_timing]");
    expect(source).toContain(
      'requestHeaders.get(PUBLIC_HOME_TIMING_HEADER) === "1"',
    );
  });
});
