/**
 * Shared sitemap generator for per-tenant websites.
 *
 * Used by:
 * - /site/[subdomain]/sitemap.xml/route.ts (subdomain tenants)
 * - /domain/[host]/sitemap.xml/route.ts (custom domain tenants)
 * - /api/sitemap/route.ts (legacy API, backward compat)
 *
 * Multi-locale (issue #139): when a website has multiple `supported_locales`,
 * each <url> entry gets reciprocal <xhtml:link rel="alternate" hreflang="..."/>
 * tags plus an x-default, per Google's localized-versions spec.
 */

import { getPublishedBlogPostSitemapRows } from "@/lib/supabase/get-website";
import {
  getAllPageSlugs,
  getIndexablePageSlugs,
  getCategoryProducts,
  getDestinations,
  getNoindexProductSlugs,
  getNoindexDestinationSlugs,
} from "@/lib/supabase/get-pages";
import {
  generateHreflangLinksForLocales,
  type HreflangLink,
} from "@/lib/seo/hreflang";
import {
  normalizeWebsiteLocales,
  type WebsiteLocaleSettings,
} from "@/lib/seo/locale-routing";

export interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq: string;
  priority: string;
  translatedLocales?: string[];
}

export interface SitemapLocaleContext {
  baseUrl: string;
  settings: WebsiteLocaleSettings;
}

/** Category slug → RPC category type mapping (only types supported by get_website_category_products) */
const PRODUCT_CATEGORIES = [
  "hotels",
  "activities",
  "transfers",
  "packages",
] as const;

/** Slug mappings for category pages (Spanish → English variants) */
const CATEGORY_SLUG_MAP: Record<string, string> = {
  hotels: "hoteles",
  activities: "actividades",
  transfers: "traslados",
  packages: "paquetes",
};

/**
 * Build all sitemap URLs for a tenant website.
 *
 * URLs are emitted for the website's DEFAULT locale only. Alternate-locale
 * versions are attached later by `generateSitemapXml` via xhtml:link tags.
 *
 * @param subdomain - Tenant subdomain (used for RPC calls)
 * @param websiteId - Website UUID (used for blog posts RPC: p_website_id)
 * @param baseUrl - Canonical base URL (e.g. https://miagencia.bukeer.com or https://miagencia.com)
 */
export async function buildSitemapUrls(
  subdomain: string,
  websiteId: string,
  baseUrl: string,
): Promise<SitemapUrl[]> {
  const urls: SitemapUrl[] = [];

  // 1. Homepage
  urls.push({
    loc: baseUrl,
    lastmod: new Date().toISOString().split("T")[0],
    changefreq: "weekly",
    priority: "1.0",
  });

  // 2. Static pages (from website_pages, excluding noindex)
  const pageSlugs = await getIndexablePageSlugs(subdomain);

  // Keep all slugs (including noindex) for category detection
  const allPageSlugs = await getAllPageSlugs(subdomain);
  const allPageSlugSet = new Set(allPageSlugs);

  for (const slug of pageSlugs) {
    urls.push({
      loc: `${baseUrl}/${slug}`,
      changefreq: "weekly",
      priority: "0.8",
    });
  }

  // 3. Blog listing + blog posts. Emit only default-locale URLs as sitemap
  // <loc> entries, and attach locale alternates only for translations that
  // actually exist as published rows.
  const blogRows = await getPublishedBlogPostSitemapRows(websiteId);
  const blogGroups = groupBlogRowsForSitemap(blogRows);

  // Add blog listing page if there are any published posts
  if (blogGroups.length > 0) {
    urls.splice(1, 0, {
      loc: `${baseUrl}/blog`,
      lastmod: new Date().toISOString().split("T")[0],
      changefreq: "daily",
      priority: "0.7",
    });
  }

  for (const group of blogGroups) {
    urls.push({
      loc: `${baseUrl}/blog/${group.slug}`,
      lastmod: group.lastmod,
      changefreq: "monthly",
      priority: "0.6",
      translatedLocales: group.translatedLocales,
    });
  }

  // 4. Product category pages + individual products
  const noindexProducts = await getNoindexProductSlugs(websiteId);

  for (const category of PRODUCT_CATEGORIES) {
    const spanishSlug = CATEGORY_SLUG_MAP[category] ?? category;

    // Only include if a page exists for this category
    if (!allPageSlugSet.has(category) && !allPageSlugSet.has(spanishSlug)) {
      continue;
    }

    // Use whichever slug exists as a page
    const categorySlug = allPageSlugSet.has(spanishSlug)
      ? spanishSlug
      : category;

    // Fetch product items for this category
    const { items } = await getCategoryProducts(subdomain, category, {
      limit: 100,
    });

    for (const item of items) {
      if (item.slug && !noindexProducts.has(item.slug)) {
        const itemMeta = item as {
          updated_at?: string;
          last_modified?: string;
        };
        const lastmod = (itemMeta.updated_at || itemMeta.last_modified)?.split(
          "T",
        )[0];
        urls.push({
          loc: `${baseUrl}/${categorySlug}/${item.slug}`,
          ...(lastmod ? { lastmod } : {}),
          changefreq: "weekly",
          priority: "0.5",
        });
      }
    }
  }

  // 5. Destination pages
  try {
    const destinations = await getDestinations(subdomain);
    const noindexDestinations = await getNoindexDestinationSlugs(websiteId);

    if (destinations.length > 0) {
      // Destination listing page
      const destSlug = allPageSlugSet.has("destinos")
        ? "destinos"
        : "destinations";
      urls.push({
        loc: `${baseUrl}/${destSlug}`,
        lastmod: new Date().toISOString().split("T")[0],
        changefreq: "weekly",
        priority: "0.7",
      });

      // Individual destination pages (excluding noindex)
      for (const dest of destinations) {
        if (dest.slug && !noindexDestinations.has(dest.slug)) {
          urls.push({
            loc: `${baseUrl}/${destSlug}/${dest.slug}`,
            changefreq: "weekly",
            priority: "0.6",
          });
        }
      }
    }
  } catch (e) {
    console.error("[buildSitemapUrls] Error fetching destinations:", e);
  }

  return urls;
}

/**
 * Extract the pathname portion of a URL relative to baseUrl. Falls back to
 * "/" if the URL equals baseUrl, or to the raw URL if parsing fails.
 */
function extractPathname(url: string, baseUrl: string): string {
  if (url === baseUrl) return "/";
  if (url.startsWith(baseUrl)) {
    const rest = url.slice(baseUrl.length);
    return rest.startsWith("/") ? rest : `/${rest}`;
  }
  try {
    return new URL(url).pathname || "/";
  } catch {
    return "/";
  }
}

/**
 * Generate XML sitemap string from URL entries.
 *
 * When `locale` is provided AND the website has more than one supported
 * locale, each <url> gets reciprocal <xhtml:link rel="alternate"
 * hreflang="..."/> tags (+ x-default) per Google's spec:
 * https://developers.google.com/search/docs/specialty/international/localized-versions#sitemap
 */
export function generateSitemapXml(
  urls: SitemapUrl[],
  locale?: SitemapLocaleContext,
): string {
  const normalizedSettings = locale
    ? normalizeWebsiteLocales(locale.settings)
    : null;

  const multiLocale =
    normalizedSettings !== null &&
    normalizedSettings.supportedLocales.length > 1;

  const urlsetOpen = multiLocale
    ? '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">'
    : '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';

  const rendered = urls.map((url) => renderUrlEntry(url, locale, multiLocale));

  return `<?xml version="1.0" encoding="UTF-8"?>
${urlsetOpen}
${rendered.join("\n")}
</urlset>`;
}

function renderUrlEntry(
  url: SitemapUrl,
  locale: SitemapLocaleContext | undefined,
  multiLocale: boolean,
): string {
  const parts: string[] = [];
  parts.push("  <url>");
  parts.push(`    <loc>${escapeXml(url.loc)}</loc>`);
  if (url.lastmod) parts.push(`    <lastmod>${url.lastmod}</lastmod>`);
  parts.push(`    <changefreq>${url.changefreq}</changefreq>`);
  parts.push(`    <priority>${url.priority}</priority>`);

  if (multiLocale && locale) {
    const pathname = extractPathname(url.loc, locale.baseUrl);
    const alternates = buildAlternateLinks(
      locale.baseUrl,
      pathname,
      locale.settings,
      url.translatedLocales,
    );
    for (const link of alternates) {
      parts.push(
        `    <xhtml:link rel="alternate" hreflang="${escapeXml(link.hreflang)}" href="${escapeXml(link.href)}"/>`,
      );
    }
  }

  parts.push("  </url>");
  return parts.join("\n");
}

function buildAlternateLinks(
  baseUrl: string,
  pathname: string,
  settings: WebsiteLocaleSettings,
  translatedLocales?: string[],
): HreflangLink[] {
  return generateHreflangLinksForLocales(
    baseUrl,
    pathname,
    {
      defaultLocale: settings.defaultLocale,
      supportedLocales: settings.supportedLocales,
    },
    translatedLocales,
  );
}

interface BlogSitemapRow {
  id: string;
  slug: string;
  locale: string | null;
  translation_group_id: string | null;
  published_at: string | null;
  updated_at: string | null;
}

interface BlogSitemapGroup {
  slug: string;
  lastmod?: string;
  translatedLocales: string[];
}

function groupBlogRowsForSitemap(rows: BlogSitemapRow[]): BlogSitemapGroup[] {
  const groups = new Map<string, BlogSitemapRow[]>();

  for (const row of rows) {
    if (!row.slug) continue;
    const key = row.translation_group_id || row.id;
    const current = groups.get(key) ?? [];
    current.push(row);
    groups.set(key, current);
  }

  const out: BlogSitemapGroup[] = [];
  for (const groupRows of groups.values()) {
    const defaultRow = groupRows.find((row) => isDefaultBlogLocale(row.locale));
    if (!defaultRow?.slug) continue;

    const translatedLocales = groupRows
      .map((row) => normalizeBlogLocaleForSitemap(row.locale))
      .filter((locale): locale is string => Boolean(locale));

    const lastmodSource = groupRows
      .map((row) => row.published_at ?? row.updated_at)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1);

    out.push({
      slug: defaultRow.slug,
      lastmod: lastmodSource?.split("T")[0],
      translatedLocales: [...new Set(translatedLocales)],
    });
  }

  return out.sort((a, b) => a.slug.localeCompare(b.slug));
}

function normalizeBlogLocaleForSitemap(
  locale: string | null | undefined,
): string | null {
  if (!locale) return null;
  if (locale === "es") return "es-CO";
  if (locale === "en") return "en-US";
  return locale;
}

function isDefaultBlogLocale(locale: string | null | undefined): boolean {
  return ["es", "es-CO", null, undefined].includes(locale);
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
