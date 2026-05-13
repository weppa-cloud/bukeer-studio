import { groupBlogRowsForSitemap } from "@/lib/seo/blog-sitemap-groups";

describe("sitemap blog quality gates", () => {
  it("removes EN quality-blocked blog rows from translated sitemap alternates", () => {
    const groups = groupBlogRowsForSitemap([
      {
        id: "es-row",
        slug: "boleto-de-avion-a-colombia",
        locale: "es-CO",
        translation_group_id: "group-1",
        published_at: "2026-05-01T00:00:00Z",
        updated_at: null,
      },
      {
        id: "en-row",
        slug: "boleto-de-avion-a-colombia",
        locale: "en-US",
        translation_group_id: "group-1",
        published_at: "2026-05-02T00:00:00Z",
        updated_at: null,
      },
    ]);

    expect(groups).toEqual([
      {
        pathname: "/blog/boleto-de-avion-a-colombia",
        lastmod: "2026-05-01",
        translatedLocales: ["es-CO"],
      },
    ]);
  });

  it("excludes EN-only blocked blog rows from sitemap output", () => {
    const groups = groupBlogRowsForSitemap([
      {
        id: "en-row",
        slug: "viajar-por-colombia-en-15-dias",
        locale: "en-US",
        translation_group_id: null,
        published_at: "2026-05-02T00:00:00Z",
        updated_at: null,
      },
    ]);

    expect(groups).toEqual([]);
  });
});
