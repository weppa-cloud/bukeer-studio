import { readFileSync } from "node:fs";
import path from "node:path";

function readSource(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("public cache invalidation contract", () => {
  it("clears navigation cache together with product/category caches", () => {
    const source = readSource("lib/supabase/get-pages.ts");
    const invalidatorSource = source.match(
      /export function invalidatePublicDataCache[\s\S]*?\n}\n\nfunction logProductV2ParseWarning/,
    )?.[0];

    expect(invalidatorSource).toBeDefined();
    expect(invalidatorSource).toContain("navigationCache.delete");
    expect(invalidatorSource).toContain("navigationInflight.delete");
  });

  it("revalidation clears website, theme and blog caches for the published site", () => {
    const source = readSource("app/api/revalidate/route.ts");

    expect(source).toContain("invalidateWebsiteDataCache");
    expect(source).toContain("websiteId: website.id");
  });

  it("public data loaders de-duplicate in-flight Supabase reads", () => {
    const websiteSource = readSource("lib/supabase/get-website.ts");
    const pagesSource = readSource("lib/supabase/get-pages.ts");

    expect(websiteSource).toContain("websiteBySubdomainInflight");
    expect(websiteSource).toContain("blogPostsInflight");
    expect(pagesSource).toContain("navigationInflight");
  });
});
