import { NextRequest, NextResponse } from 'next/server';

// Subdomains that should NOT be treated as tenant sites
const RESERVED_SUBDOMAINS = ['www', 'app', 'api', 'admin', 'staging', 'dev'];

// Main domain - update for production
const MAIN_DOMAIN = process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'bukeer.com';

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const hostname = request.headers.get('host') || '';

  // Extract subdomain
  // In development: localhost:3000 or subdomain.localhost:3000
  // In production: subdomain.bukeer.com
  let subdomain: string | null = null;

  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    // Development: Check for subdomain in query param or custom header
    subdomain = url.searchParams.get('subdomain') ||
                request.headers.get('x-subdomain') ||
                null;
  } else {
    // Production: Extract subdomain from hostname
    const parts = hostname.replace(`.${MAIN_DOMAIN}`, '').split('.');
    if (parts.length > 0 && parts[0] !== hostname && !RESERVED_SUBDOMAINS.includes(parts[0])) {
      subdomain = parts[0];
    }
  }

  // If no subdomain or it's the main site, continue normally
  if (!subdomain) {
    return NextResponse.next();
  }

  // Check if subdomain is reserved
  if (RESERVED_SUBDOMAINS.includes(subdomain.toLowerCase())) {
    return NextResponse.next();
  }

  // Rewrite to the dynamic tenant route
  // /site/[subdomain]/... handles all tenant pages
  const newUrl = new URL(url);

  // Preserve the original path
  const pathWithoutSite = url.pathname.startsWith('/site/')
    ? url.pathname
    : `/site/${subdomain}${url.pathname}`;

  newUrl.pathname = pathWithoutSite;

  // Pass subdomain to the page via header
  const response = NextResponse.rewrite(newUrl);
  response.headers.set('x-subdomain', subdomain);

  return response;
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
