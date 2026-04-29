/**
 * llms.txt Route — GET /domain/[host]/llms.txt
 *
 * Serves per-tenant llms.txt for custom domain websites.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getBlogPosts } from '@/lib/supabase/get-website';
import { getCategoryProducts, getDestinations } from '@/lib/supabase/get-pages';
import { generateLlmsTxt } from '@/lib/seo/llms-txt';
import type { WebsiteData } from '@/lib/supabase/get-website';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const revalidate = 3600;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ host: string }> }
) {
  const { host } = await params;

  // Lookup website by custom domain
  const { data: website } = await supabase
    .from('websites')
    .select('*')
    .eq('custom_domain', host)
    .eq('status', 'published')
    .single();

  if (!website) {
    return new NextResponse('Not found', { status: 404 });
  }

  const subdomain = typeof website.subdomain === 'string' ? website.subdomain : '';
  const [{ posts }, destinations, packages, activities] = await Promise.all([
    getBlogPosts(website.id, { limit: 20 }),
    subdomain ? getDestinations(subdomain) : Promise.resolve([]),
    subdomain ? getCategoryProducts(subdomain, 'packages', { limit: 12, offset: 0 }) : Promise.resolve({ items: [], total: 0 }),
    subdomain ? getCategoryProducts(subdomain, 'activities', { limit: 12, offset: 0 }) : Promise.resolve({ items: [], total: 0 }),
  ]);
  const baseUrl = `https://${host}`;

  const llmsTxt = generateLlmsTxt(website as WebsiteData, posts, baseUrl, {
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
