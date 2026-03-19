import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Dynamic sitemap generator for multi-tenant websites.
 * Usage: GET /api/sitemap?subdomain=my-agency
 *
 * Generates XML sitemap with:
 * - Homepage
 * - Static pages
 * - Blog posts
 * - Product pages (destinations, hotels, activities)
 */
export async function GET(request: NextRequest) {
  const subdomain = request.nextUrl.searchParams.get('subdomain');
  if (!subdomain) {
    return NextResponse.json(
      { error: 'subdomain parameter is required' },
      { status: 400 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Get website by subdomain
  const { data: website, error: websiteError } = await supabase
    .rpc('get_website_by_subdomain', { p_subdomain: subdomain });

  if (websiteError || !website) {
    return new NextResponse('Website not found', { status: 404 });
  }

  const baseUrl = website.custom_domain
    ? `https://${website.custom_domain}`
    : `https://${subdomain}.bukeer.com`;

  const urls: Array<{ loc: string; lastmod?: string; changefreq: string; priority: string }> = [];

  // Homepage
  urls.push({
    loc: baseUrl,
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'weekly',
    priority: '1.0',
  });

  // Pages
  const { data: pages } = await supabase
    .rpc('get_website_pages', { p_subdomain: subdomain });

  if (pages && Array.isArray(pages)) {
    for (const page of pages) {
      urls.push({
        loc: `${baseUrl}/${page.slug}`,
        lastmod: page.updated_at?.split('T')[0],
        changefreq: 'weekly',
        priority: '0.8',
      });
    }
  }

  // Blog posts
  const { data: posts } = await supabase
    .rpc('get_website_blog_posts', {
      p_subdomain: subdomain,
      p_status: 'published',
      p_limit: 100,
      p_offset: 0,
    });

  if (posts && Array.isArray(posts)) {
    for (const post of posts) {
      urls.push({
        loc: `${baseUrl}/blog/${post.slug}`,
        lastmod: post.published_at?.split('T')[0] ?? post.updated_at?.split('T')[0],
        changefreq: 'monthly',
        priority: '0.6',
      });
    }
  }

  // Product category pages — only include if the website has pages with matching slugs
  // (category page routes like /destinations, /hotels, /activities are not static routes;
  // they must be created as website_pages to be accessible)
  if (pages && Array.isArray(pages)) {
    const pageSlugs = new Set(pages.map((p: { slug: string }) => p.slug));
    for (const type of ['destinations', 'hotels', 'activities']) {
      if (pageSlugs.has(type)) {
        urls.push({
          loc: `${baseUrl}/${type}`,
          changefreq: 'weekly',
          priority: '0.7',
        });
      }
    }
  }

  // Generate XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
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

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
