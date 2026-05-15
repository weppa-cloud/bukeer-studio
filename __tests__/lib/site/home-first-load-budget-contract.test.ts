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

    expect(source).toContain("sections: []");
    expect(source).toContain("deferredSections");
    expect(source).toContain("enabledSections={deferredSections}");
    expect(source).not.toContain("criticalSectionIds={criticalSectionIds}");
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
