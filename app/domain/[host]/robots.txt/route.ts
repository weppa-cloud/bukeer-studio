/**
 * robots.txt Route — GET /domain/[host]/robots.txt
 *
 * Serves per-tenant robots.txt for custom domain websites.
 * Middleware rewrites miagencia.com/robots.txt → /domain/miagencia.com/robots.txt
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateRobotsTxt } from '@/lib/seo/robots-txt';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const revalidate = 86400; // 24 hours

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
    return new NextResponse('User-agent: *\nDisallow: /\n', {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });
  }

  const baseUrl = `https://${normalizedHost}`;
  const robotsTxt = generateRobotsTxt(baseUrl);

  return new NextResponse(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
