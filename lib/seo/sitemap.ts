/**
 * Shared sitemap generator for per-tenant websites.
 *
 * Used by:
 * - /site/[subdomain]/sitemap.xml/route.ts (subdomain tenants)
 * - /domain/[host]/sitemap.xml/route.ts (custom domain tenants)
 * - /api/sitemap/route.ts (legacy API, backward compat)
 */

import { getBlogPosts } from '@/lib/supabase/get-website';
import { getAllPageSlugs, getCategoryProducts } from '@/lib/supabase/get-pages';

export interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq: string;
  priority: string;
}

/** Category slug → RPC category type mapping (only types supported by get_website_category_products) */
const PRODUCT_CATEGORIES = ['hotels', 'activities', 'transfers', 'packages'] as const;

/** Slug mappings for category pages (Spanish → English variants) */
const CATEGORY_SLUG_MAP: Record<string, string> = {
  hotels: 'hoteles',
  activities: 'actividades',
  transfers: 'traslados',
  packages: 'paquetes',
};

/**
 * Build all sitemap URLs for a tenant website.
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
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'weekly',
    priority: '1.0',
  });

  // 2. Static pages (from website_pages)
  const pageSlugs = await getAllPageSlugs(subdomain);
  const pageSlugSet = new Set(pageSlugs);

  for (const slug of pageSlugs) {
    urls.push({
      loc: `${baseUrl}/${slug}`,
      changefreq: 'weekly',
      priority: '0.8',
    });
  }

  // 3. Blog listing + blog posts (paginated, ADR-035 pattern)
  const PAGE_SIZE = 100;
  let offset = 0;
  let hasMore = true;
  let hasBlogPosts = false;

  while (hasMore) {
    const { posts } = await getBlogPosts(websiteId, {
      limit: PAGE_SIZE,
      offset,
    });

    for (const post of posts) {
      if (!hasBlogPosts) hasBlogPosts = true;
      urls.push({
        loc: `${baseUrl}/blog/${post.slug}`,
        lastmod: (post.published_at ?? post.updated_at)?.split('T')[0],
        changefreq: 'monthly',
        priority: '0.6',
      });
    }

    hasMore = posts.length >= PAGE_SIZE;
    offset += PAGE_SIZE;
  }

  // Add blog listing page if there are any published posts
  if (hasBlogPosts) {
    urls.splice(1, 0, {
      loc: `${baseUrl}/blog`,
      lastmod: new Date().toISOString().split('T')[0],
      changefreq: 'daily',
      priority: '0.7',
    });
  }

  // 4. Product category pages + individual products
  for (const category of PRODUCT_CATEGORIES) {
    const spanishSlug = CATEGORY_SLUG_MAP[category] ?? category;

    // Only include if a page exists for this category
    if (!pageSlugSet.has(category) && !pageSlugSet.has(spanishSlug)) {
      continue;
    }

    // Use whichever slug exists as a page
    const categorySlug = pageSlugSet.has(spanishSlug) ? spanishSlug : category;

    // Fetch product items for this category
    const { items } = await getCategoryProducts(subdomain, category, { limit: 100 });

    for (const item of items) {
      if (item.slug) {
        urls.push({
          loc: `${baseUrl}/${categorySlug}/${item.slug}`,
          changefreq: 'weekly',
          priority: '0.5',
        });
      }
    }
  }

  return urls;
}

/**
 * Generate XML sitemap string from URL entries.
 */
export function generateSitemapXml(urls: SitemapUrl[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${escapeXml(url.loc)}</loc>
    ${url.lastmod ? `<lastmod>${url.lastmod}</lastmod>` : ''}
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
