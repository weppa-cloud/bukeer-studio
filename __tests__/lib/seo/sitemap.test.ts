jest.mock("@/lib/supabase/get-website", () => ({
  getPublishedBlogPostSitemapRows: jest.fn(),
}));

jest.mock("@/lib/supabase/get-pages", () => ({
  getAllPageSlugs: jest.fn(),
  getCategoryProducts: jest.fn(),
  getDestinations: jest.fn(),
  getIndexablePageSlugs: jest.fn(),
  getNoindexDestinationSlugs: jest.fn(),
  getNoindexProductSlugs: jest.fn(),
}));

import { groupBlogRowsForSitemap } from "@/lib/seo/blog-sitemap-groups";
import {
  buildSitemapUrls,
  generateSitemapXml,
  localizeSitemapUrlsForLocale,
  type SitemapUrl,
} from "@/lib/seo/sitemap";
import {
  getAllPageSlugs,
  getCategoryProducts,
  getDestinations,
  getIndexablePageSlugs,
  getNoindexDestinationSlugs,
  getNoindexProductSlugs,
} from "@/lib/supabase/get-pages";
import { getPublishedBlogPostSitemapRows } from "@/lib/supabase/get-website";

const mockedGetAllPageSlugs = jest.mocked(getAllPageSlugs);
const mockedGetCategoryProducts = jest.mocked(getCategoryProducts);
const mockedGetDestinations = jest.mocked(getDestinations);
const mockedGetIndexablePageSlugs = jest.mocked(getIndexablePageSlugs);
const mockedGetNoindexDestinationSlugs = jest.mocked(getNoindexDestinationSlugs);
const mockedGetNoindexProductSlugs = jest.mocked(getNoindexProductSlugs);
const mockedGetPublishedBlogPostSitemapRows = jest.mocked(
  getPublishedBlogPostSitemapRows,
);

describe("sitemap blog quality gates", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetPublishedBlogPostSitemapRows.mockResolvedValue([]);
    mockedGetAllPageSlugs.mockResolvedValue([]);
    mockedGetIndexablePageSlugs.mockResolvedValue([]);
    mockedGetNoindexProductSlugs.mockResolvedValue(new Set());
    mockedGetNoindexDestinationSlugs.mockResolvedValue(new Set());
    mockedGetDestinations.mockResolvedValue([]);
    mockedGetCategoryProducts.mockResolvedValue({ items: [], total: 0 });
  });

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
        localizedPathnames: {
          "es-CO": "/blog/boleto-de-avion-a-colombia",
        },
      },
    ]);
  });

  it("removes robots_noindex blog rows from sitemap output", () => {
    const groups = groupBlogRowsForSitemap([
      {
        id: "es-row",
        slug: "guia-cartagena",
        locale: "es-CO",
        translation_group_id: "group-2",
        published_at: "2026-05-01T00:00:00Z",
        updated_at: null,
      },
      {
        id: "en-row",
        slug: "cartagena-guide",
        locale: "en-US",
        translation_group_id: "group-2",
        published_at: "2026-05-02T00:00:00Z",
        updated_at: null,
        robots_noindex: true,
      },
    ]);

    expect(groups).toEqual([
      {
        pathname: "/blog/guia-cartagena",
        lastmod: "2026-05-01",
        translatedLocales: ["es-CO"],
        localizedPathnames: {
          "es-CO": "/blog/guia-cartagena",
        },
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

  it("uses the real translated blog slug in locale sitemaps", () => {
    const urls: SitemapUrl[] = [
      {
        loc: "https://example.com/blog/guia-cartagena",
        changefreq: "monthly",
        priority: "0.6",
        translatedLocales: ["es-CO", "en-US"],
        localizedPathnames: {
          "es-CO": "/blog/guia-cartagena",
          "en-US": "/en/blog/cartagena-guide",
        },
      },
    ];
    const locale = {
      baseUrl: "https://example.com",
      settings: {
        defaultLocale: "es-CO",
        supportedLocales: ["es-CO", "en-US"],
      },
    };

    const localized = localizeSitemapUrlsForLocale(urls, "en-US", locale);
    const xml = generateSitemapXml(localized, locale);

    expect(localized).toHaveLength(1);
    expect(localized[0].loc).toBe(
      "https://example.com/en/blog/cartagena-guide",
    );
    expect(xml).toContain('href="https://example.com/en/blog/cartagena-guide"');
    expect(xml).not.toContain("/en/blog/guia-cartagena");
  });

  it("resolves legacy es locale settings to the es-CO blog path for x-default", () => {
    const xml = generateSitemapXml(
      [
        {
          loc: "https://example.com/en/blog/cartagena-guide",
          changefreq: "monthly",
          priority: "0.6",
          translatedLocales: ["es-CO", "en-US"],
          localizedPathnames: {
            "es-CO": "/blog/guia-cartagena",
            "en-US": "/en/blog/cartagena-guide",
          },
        },
      ],
      {
        baseUrl: "https://example.com",
        settings: {
          defaultLocale: "es",
          supportedLocales: ["es", "es-CO", "en-US"],
        },
      },
    );

    expect(xml).toContain(
      'hreflang="es" href="https://example.com/blog/guia-cartagena"',
    );
    expect(xml).toContain(
      'hreflang="x-default" href="https://example.com/blog/guia-cartagena"',
    );
  });

  it("does not emit locale sitemap URLs or alternates without an indexable locale path", () => {
    const urls: SitemapUrl[] = [
      {
        loc: "https://example.com/blog/guia-cartagena",
        changefreq: "monthly",
        priority: "0.6",
        translatedLocales: ["es-CO"],
        localizedPathnames: {
          "es-CO": "/blog/guia-cartagena",
        },
      },
    ];

    const localized = localizeSitemapUrlsForLocale(urls, "en-US", {
      baseUrl: "https://example.com",
      settings: {
        defaultLocale: "es-CO",
        supportedLocales: ["es-CO", "en-US"],
      },
    });

    expect(localized).toEqual([]);
  });
});

describe("sitemap product indexability gates", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetPublishedBlogPostSitemapRows.mockResolvedValue([]);
    mockedGetNoindexProductSlugs.mockResolvedValue(new Set());
    mockedGetNoindexDestinationSlugs.mockResolvedValue(new Set());
    mockedGetDestinations.mockResolvedValue([]);
    mockedGetCategoryProducts.mockResolvedValue({ items: [], total: 0 });
  });

  it("does not emit shadowed default-locale aliases like /packages/* when /paquetes/* exists", async () => {
    mockedGetAllPageSlugs.mockResolvedValue([
      "paquetes",
      "packages",
      "paquetes/cartagena-medellin",
      "packages/cartagena-medellin",
      "actividades",
      "activities",
      "actividades/city-tour-full-day",
      "activities/city-tour-full-day",
    ]);
    mockedGetIndexablePageSlugs.mockResolvedValue([
      "paquetes",
      "packages",
      "paquetes/cartagena-medellin",
      "packages/cartagena-medellin",
      "actividades",
      "activities",
      "actividades/city-tour-full-day",
      "activities/city-tour-full-day",
    ]);

    const urls = await buildSitemapUrls(
      "colombiatours",
      "website-colombiatours",
      "https://colombiatours.travel",
    );
    const locs = urls.map((url) => url.loc);

    expect(locs).toContain("https://colombiatours.travel/paquetes");
    expect(locs).toContain(
      "https://colombiatours.travel/paquetes/cartagena-medellin",
    );
    expect(locs).toContain("https://colombiatours.travel/actividades");
    expect(locs).toContain(
      "https://colombiatours.travel/actividades/city-tour-full-day",
    );
    expect(locs).not.toContain("https://colombiatours.travel/packages");
    expect(locs).not.toContain(
      "https://colombiatours.travel/packages/cartagena-medellin",
    );
    expect(locs).not.toContain("https://colombiatours.travel/activities");
    expect(locs).not.toContain(
      "https://colombiatours.travel/activities/city-tour-full-day",
    );
  });
});
