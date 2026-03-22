/**
 * llms.txt Route — GET /domain/[host]/llms.txt
 *
 * Serves per-tenant llms.txt for custom domain websites.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getBlogPosts } from '@/lib/supabase/get-website';
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

  const { posts } = await getBlogPosts(website.id, { limit: 20 });
  const baseUrl = `https://${host}`;

  const llmsTxt = generateLlmsTxt(website as WebsiteData, posts, baseUrl);

  return new NextResponse(llmsTxt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
