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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sitemapEntries: MetadataRoute.Sitemap = [];

  // 1. Add main marketing site pages
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://bukeer.com';

  sitemapEntries.push({
    url: baseUrl,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 1,
  });

  try {
    // 2. Fetch all published websites
    const { data: websites, error: websitesError } = await supabase
      .from('websites')
      .select('id, subdomain, custom_domain, updated_at')
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

      sitemapEntries.push({
        url: siteUrl,
        lastModified: website.updated_at ? new Date(website.updated_at) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.9,
      });

      // 4. Add blog listing page
      sitemapEntries.push({
        url: `${siteUrl}/blog`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.8,
      });

      // 5. Fetch blog posts for this website
      const { data: posts, error: postsError } = await supabase
        .from('website_blog_posts')
        .select('slug, updated_at, published_at')
        .eq('website_id', website.id)
        .eq('status', 'published');

      if (postsError) {
        console.error(`[sitemap] Error fetching posts for ${website.subdomain}:`, postsError);
        continue;
      }

      // 6. Add each blog post
      for (const post of posts || []) {
        sitemapEntries.push({
          url: `${siteUrl}/blog/${post.slug}`,
          lastModified: post.updated_at
            ? new Date(post.updated_at)
            : post.published_at
            ? new Date(post.published_at)
            : new Date(),
          changeFrequency: 'monthly',
          priority: 0.7,
        });
      }

      // 7. Add paquetes (package_kits) for this website
      try {
        const { items: packages } = await getCategoryProducts(
          website.subdomain,
          'packages',
          { limit: 500, offset: 0 },
        );

        for (const pkg of packages || []) {
          if (!pkg.slug || pkg.slug.trim().length === 0) continue;
          const pkgRecord = pkg as unknown as Record<string, unknown>;
          const pkgUpdatedAt =
            typeof pkgRecord.updated_at === 'string' ? pkgRecord.updated_at : null;
          sitemapEntries.push({
            url: `${siteUrl}/paquetes/${pkg.slug}`,
            lastModified: pkgUpdatedAt ? new Date(pkgUpdatedAt) : new Date(),
            changeFrequency: 'weekly',
            priority: 0.8,
          });
        }
      } catch (packagesError) {
        console.error(
          `[sitemap] Error fetching packages for ${website.subdomain}:`,
          packagesError,
        );
      }
    }
  } catch (error) {
    console.error('[sitemap] Error generating sitemap:', error);
  }

  return sitemapEntries;
}
