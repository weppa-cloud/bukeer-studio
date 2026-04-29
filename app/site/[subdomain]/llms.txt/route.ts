/**
 * llms.txt Route — GET /site/[subdomain]/llms.txt
 *
 * Serves per-tenant llms.txt for AI crawlers.
 * Revalidated on publish via revalidateTag('llms-txt').
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWebsiteBySubdomain, getBlogPosts } from '@/lib/supabase/get-website';
import { getCategoryProducts, getDestinations } from '@/lib/supabase/get-pages';
import { generateLlmsTxt } from '@/lib/seo/llms-txt';

export const revalidate = 3600; // Revalidate every hour

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ subdomain: string }> }
) {
  const { subdomain } = await params;
  const website = await getWebsiteBySubdomain(subdomain);

  if (!website) {
    return new NextResponse('Not found', { status: 404 });
  }

  const [{ posts }, destinations, packages, activities] = await Promise.all([
    getBlogPosts(website.id, { limit: 20 }),
    getDestinations(subdomain),
    getCategoryProducts(subdomain, 'packages', { limit: 12, offset: 0 }),
    getCategoryProducts(subdomain, 'activities', { limit: 12, offset: 0 }),
  ]);
  const baseUrl = `https://${subdomain}.bukeer.com`;

  const llmsTxt = generateLlmsTxt(website, posts, baseUrl, {
    destinations,
    packages: packages.items,
    activities: activities.items,
  });

  return new NextResponse(llmsTxt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
