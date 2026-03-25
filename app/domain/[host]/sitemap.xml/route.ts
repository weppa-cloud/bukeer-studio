/**
 * sitemap.xml Route — GET /domain/[host]/sitemap.xml
 *
 * Serves per-tenant XML sitemap for custom domain websites.
 * Middleware rewrites miagencia.com/sitemap.xml → /domain/miagencia.com/sitemap.xml
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { buildSitemapUrls, generateSitemapXml } from '@/lib/seo/sitemap';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const revalidate = 3600; // 1 hour

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ host: string }> }
) {
  const { host } = await params;
  const normalizedHost = host.toLowerCase().replace(/\.$/, '');

  const { data: website } = await supabase
    .from('websites')
    .select('id, subdomain, custom_domain, status')
    .eq('custom_domain', normalizedHost)
    .eq('status', 'published')
    .is('deleted_at', null)
    .single();

  if (!website) {
    return new NextResponse('Website not found', { status: 404 });
  }

  const baseUrl = `https://${normalizedHost}`;
  const urls = await buildSitemapUrls(website.subdomain, website.id, baseUrl);
  const xml = generateSitemapXml(urls);

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
