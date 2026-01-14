import { NextRequest, NextResponse } from 'next/server';

// Subdomains that should NOT be treated as tenant sites
const RESERVED_SUBDOMAINS = [
  'www',
  'app',
  'api',
  'admin',
  'canvas',
  'staging',
  'dev',
];

// Main domain - update for production
const MAIN_DOMAIN = process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'bukeer.com';

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const hostHeader = request.headers.get('host') || '';

  // Normalize: remove port for consistent matching
  const host = hostHeader.split(':')[0];
  const pathname = url.pathname;

  // Skip editor routes (no rewrite needed - accessed directly)
  if (pathname.startsWith('/editor')) {
    return NextResponse.next();
  }

  // Skip static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff2?)$/)
  ) {
    return NextResponse.next();
  }

  // Check if it's a Bukeer domain (main or subdomain)
  const isBukeerDomain =
    host.endsWith(`.${MAIN_DOMAIN}`) ||
    host === MAIN_DOMAIN ||
    host.includes('localhost') ||
    host.includes('127.0.0.1');

  if (isBukeerDomain) {
    // Handle development environment
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
      // Development: Check for subdomain in query param or custom header
      const subdomain =
        url.searchParams.get('subdomain') ||
        request.headers.get('x-subdomain') ||
        null;

      if (!subdomain) {
        return NextResponse.next();
      }

      // Rewrite to tenant route
      const newUrl = new URL(url);
      if (!pathname.startsWith('/site/')) {
        newUrl.pathname = `/site/${subdomain}${pathname}`;
      }
      const response = NextResponse.rewrite(newUrl);
      response.headers.set('x-subdomain', subdomain);
      return response;
    }

    // Production Bukeer domain handling
    let subdomain: string;

    if (host === MAIN_DOMAIN) {
      // bukeer.com → treat as 'bukeer' subdomain (corporate site)
      subdomain = 'bukeer';
    } else {
      // miagencia.bukeer.com → extract 'miagencia'
      subdomain = host.replace(`.${MAIN_DOMAIN}`, '').split('.')[0];
    }

    // Check if subdomain is reserved
    if (RESERVED_SUBDOMAINS.includes(subdomain.toLowerCase())) {
      return NextResponse.next();
    }

    // Rewrite to tenant route
    const newUrl = new URL(url);
    if (!pathname.startsWith('/site/')) {
      newUrl.pathname = `/site/${subdomain}${pathname}`;
    }
    const response = NextResponse.rewrite(newUrl);
    response.headers.set('x-subdomain', subdomain);
    return response;
  } else {
    // Custom domain (e.g., miagencia.com)
    // Rewrite to /domain/[host]/... route (NO DB query in middleware)
    const newUrl = new URL(url);
    newUrl.pathname = `/domain/${encodeURIComponent(host)}${pathname}`;
    const response = NextResponse.rewrite(newUrl);
    response.headers.set('x-custom-domain', host);
    return response;
  }
}

export const config = {
  // Match all routes except static files and API routes
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)',
  ],
};
