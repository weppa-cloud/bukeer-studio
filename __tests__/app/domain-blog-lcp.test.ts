import { readFileSync } from "node:fs";
import path from "node:path";

describe("custom domain blog LCP image delivery", () => {
  it("transforms Supabase featured images before rendering the priority hero", () => {
    const source = readFileSync(
      path.join(process.cwd(), "app/domain/[host]/[[...slug]]/page.tsx"),
      "utf8",
    );

    expect(source).toContain("supabaseImageUrl(post.featured_image");
    expect(source).toContain("width: 1200, quality: 74");
    expect(source).toContain('fetchPriority="high"');
    expect(source).toContain('sizes="(max-width: 896px) 100vw, 896px"');
  });
});
