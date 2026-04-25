/**
 * Dynamic Sitemap Generator
 *
 * Generates sitemap.xml for all published websites and their blog posts.
 * This helps search engines (Google, Bing) and AI crawlers (GPTBot, ClaudeBot, PerplexityBot)
 * discover and index content efficiently.
 *
 * Access: https://bukeer.com/sitemap.xml
 */

import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getCategoryProducts } from '@/lib/supabase/get-pages';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

/** Map locale codes to URL path segments (e.g. 'en-US' → 'en'). */
function localeToPathSegment(locale: string): string {
  return locale.split('-')[0].toLowerCase();
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sitemapEntries: MetadataRoute.Sitemap = [];

  // 1. Add main marketing site pages
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://studio.bukeer.com';

  sitemapEntries.push({
    url: baseUrl,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 1,
  });

  try {
    // 2. Fetch all published websites (include locale config)
    const { data: websites, error: websitesError } = await supabase
      .from('websites')
      .select('id, subdomain, custom_domain, updated_at, default_locale, supported_locales')
      .eq('status', 'published');

    if (websitesError) {
      console.error('[sitemap] Error fetching websites:', websitesError);
      return sitemapEntries;
    }

    // 3. Add each website's homepage
    for (const website of websites || []) {
      const siteUrl = website.custom_domain
        ? `https://${website.custom_domain}`
        : `https://${website.subdomain}.bukeer.com`;
      const defaultLocale: string = website.default_locale ?? 'es-CO';
      const supportedLocales: string[] = Array.isArray(website.supported_locales)
        ? website.supported_locales
        : [defaultLocale];
      const nonDefaultLocales = supportedLocales.filter((l) => l !== defaultLocale);

      sitemapEntries.push({
        url: siteUrl,
        lastModified: website.updated_at ? new Date(website.updated_at) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.9,
      });

      // 4. Blog listing — default locale + non-default locale variants
      sitemapEntries.push({
        url: `${siteUrl}/blog`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.8,
      });
      for (const locale of nonDefaultLocales) {
        sitemapEntries.push({
          url: `${siteUrl}/${localeToPathSegment(locale)}/blog`,
          lastModified: new Date(),
          changeFrequency: 'daily',
          priority: 0.7,
        });
      }

      // 5. Fetch blog posts for this website grouped by locale
      const { data: posts, error: postsError } = await supabase
        .from('website_blog_posts')
        .select('slug, updated_at, published_at, locale')
        .eq('website_id', website.id)
        .eq('status', 'published');

      if (postsError) {
        console.error(`[sitemap] Error fetching posts for ${website.subdomain}:`, postsError);
        continue;
      }

      // 6. Add each blog post. Default-locale posts → /blog/{slug}, others → /{lang}/blog/{slug}
      for (const post of posts || []) {
        const postLocale: string = (post as unknown as Record<string, unknown>).locale as string ?? defaultLocale;
        const urlPath = postLocale === defaultLocale
          ? `${siteUrl}/blog/${post.slug}`
          : `${siteUrl}/${localeToPathSegment(postLocale)}/blog/${post.slug}`;
        sitemapEntries.push({
          url: urlPath,
          lastModified: post.updated_at
            ? new Date(post.updated_at)
            : post.published_at
            ? new Date(post.published_at)
            : new Date(),
          changeFrequency: 'monthly',
          priority: postLocale === defaultLocale ? 0.7 : 0.6,
        });
      }

      // 7. Listing pages for default locale
      for (const listingSlug of ['paquetes', 'hoteles', 'actividades'] as const) {
        sitemapEntries.push({
          url: `${siteUrl}/${listingSlug}`,
          lastModified: new Date(),
          changeFrequency: 'weekly',
          priority: 0.8,
        });
        for (const locale of nonDefaultLocales) {
          sitemapEntries.push({
            url: `${siteUrl}/${localeToPathSegment(locale)}/${listingSlug}`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.7,
          });
        }
      }

      // 8. Product detail pages — paquetes, hoteles, actividades
      const productCatalog: Array<{
        categoryType: string;
        urlSeg: string;
        priority: number;
      }> = [
        { categoryType: 'packages',    urlSeg: 'paquetes',   priority: 0.8 },
        { categoryType: 'hotels',      urlSeg: 'hoteles',    priority: 0.75 },
        { categoryType: 'activities',  urlSeg: 'actividades', priority: 0.7 },
      ];

      for (const { categoryType, urlSeg, priority } of productCatalog) {
        try {
          const { items } = await getCategoryProducts(
            website.subdomain,
            categoryType,
            { limit: 500, offset: 0 },
          );

          for (const item of items || []) {
            if (!item.slug || item.slug.trim().length === 0) continue;
            const rec = item as unknown as Record<string, unknown>;
            const updatedAt = typeof rec.updated_at === 'string' ? rec.updated_at : null;
            sitemapEntries.push({
              url: `${siteUrl}/${urlSeg}/${item.slug}`,
              lastModified: updatedAt ? new Date(updatedAt) : new Date(),
              changeFrequency: 'weekly',
              priority,
            });
          }

          // Non-default locales: only items with an overlay
          for (const locale of nonDefaultLocales) {
            const langSeg = localeToPathSegment(locale);
            const { items: localizedItems } = await getCategoryProducts(
              website.subdomain,
              categoryType,
              {
                limit: 500,
                offset: 0,
                locale,
                defaultLocale,
                websiteId: String(website.id),
              },
            );
            for (const item of localizedItems || []) {
              if (!item.slug || item.slug.trim().length === 0) continue;
              sitemapEntries.push({
                url: `${siteUrl}/${langSeg}/${urlSeg}/${item.slug}`,
                lastModified: new Date(),
                changeFrequency: 'weekly',
                priority: priority - 0.1,
              });
            }
          }
        } catch (err) {
          console.error(`[sitemap] Error fetching ${categoryType} for ${website.subdomain}:`, err);
        }
      }
    }
  } catch (error) {
    console.error('[sitemap] Error generating sitemap:', error);
  }

  return sitemapEntries;
}
