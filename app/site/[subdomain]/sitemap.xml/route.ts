/**
 * sitemap.xml Route — GET /site/[subdomain]/sitemap.xml
 *
 * Serves per-tenant XML sitemap with pages, blog posts, and product pages.
 * Middleware rewrites {subdomain}.bukeer.com/sitemap.xml → /site/{subdomain}/sitemap.xml
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWebsiteBySubdomain } from '@/lib/supabase/get-website';
import { buildSitemapUrls, generateSitemapXml } from '@/lib/seo/sitemap';

export const revalidate = 3600; // 1 hour

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ subdomain: string }> }
) {
  const { subdomain } = await params;
  const website = await getWebsiteBySubdomain(subdomain);

  if (!website) {
    return new NextResponse('Website not found', { status: 404 });
  }

  const baseUrl = website.custom_domain
    ? `https://${website.custom_domain}`
    : `https://${subdomain}.bukeer.com`;

  const urls = await buildSitemapUrls(subdomain, website.id, baseUrl);
  const xml = generateSitemapXml(urls);

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
