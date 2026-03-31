import { NextRequest, NextResponse } from 'next/server';

/**
 * Dynamic robots.txt that adapts per subdomain.
 * - Published sites: allow indexing
 * - Draft sites / editor: disallow
 */
export async function GET(request: NextRequest) {
  const host = request.headers.get('host') ?? '';

  // Editor routes should never be indexed
  if (host.includes('editor') || request.nextUrl.pathname.includes('editor')) {
    return new NextResponse(
      `User-agent: *\nDisallow: /\n`,
      { headers: { 'Content-Type': 'text/plain' } }
    );
  }

  // Extract subdomain from host
  const subdomain = host.split('.')[0];

  const robotsTxt = `User-agent: *
Allow: /

# Sitemap
Sitemap: ${request.nextUrl.origin}/api/sitemap?subdomain=${subdomain}

# Disallow editor and API routes
Disallow: /editor/
Disallow: /api/
Disallow: /_next/
`;

  return new NextResponse(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
