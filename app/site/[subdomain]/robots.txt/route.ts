/**
 * robots.txt Route — GET /site/[subdomain]/robots.txt
 *
 * Serves per-tenant robots.txt for search engines and AI crawlers.
 * Middleware rewrites {subdomain}.bukeer.com/robots.txt → /site/{subdomain}/robots.txt
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWebsiteBySubdomain } from '@/lib/supabase/get-website';
import { generateRobotsTxt } from '@/lib/seo/robots-txt';

export const revalidate = 86400; // 24 hours

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ subdomain: string }> }
) {
  const { subdomain } = await params;
  const website = await getWebsiteBySubdomain(subdomain);

  if (!website) {
    return new NextResponse('User-agent: *\nDisallow: /\n', {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });
  }

  const baseUrl = website.custom_domain
    ? `https://${website.custom_domain}`
    : `https://${subdomain}.bukeer.com`;

  const robotsTxt = generateRobotsTxt(baseUrl);

  return new NextResponse(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
