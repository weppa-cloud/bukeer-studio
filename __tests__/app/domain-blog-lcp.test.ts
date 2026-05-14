import { readFileSync } from "node:fs";
import path from "node:path";

describe("custom domain blog LCP image delivery", () => {
  it("transforms Supabase featured images before rendering the priority hero", () => {
    const domainSource = readFileSync(
      path.join(process.cwd(), "app/domain/[host]/[[...slug]]/page.tsx"),
      "utf8",
    );
    const blogDetailSource = readFileSync(
      path.join(process.cwd(), "components/site/blog/blog-detail.tsx"),
      "utf8",
    );

    for (const source of [domainSource, blogDetailSource]) {
      expect(source).toContain("supabaseImageUrl(post.featured_image");
      expect(source).toContain("width: 1200, quality: 74");
      expect(source).toContain('fetchPriority="high"');
    }
    expect(domainSource).toContain('sizes="(max-width: 896px) 100vw, 896px"');
    expect(blogDetailSource).toContain('sizes="(max-width: 768px) 100vw, 72ch"');
  });
});
