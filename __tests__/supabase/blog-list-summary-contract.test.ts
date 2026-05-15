import { readFileSync } from "node:fs";
import path from "node:path";

function readSource(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("public blog listing Supabase contract", () => {
  it("uses the summary RPC and never requests full post content for lists", () => {
    const source = readSource("lib/supabase/get-website.ts");
    const getBlogPostsSource = source.match(
      /export async function getBlogPosts[\s\S]*?\n}\n\nexport async function getPublishedBlogPostSitemapRows/,
    )?.[0];

    expect(getBlogPostsSource).toBeDefined();
    expect(getBlogPostsSource).toContain("get_website_blog_post_summaries");
    expect(getBlogPostsSource).not.toContain("get_website_blog_posts");
    expect(getBlogPostsSource).not.toMatch(/\.select\([\s\S]*content/);
  });
});
