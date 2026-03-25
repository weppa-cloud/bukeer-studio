import { NextRequest, NextResponse } from 'next/server';

const MAIN_DOMAIN = process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'bukeer.com';

const RESERVED_SUBDOMAINS = [
  'www', 'app', 'api', 'admin', 'canvas', 'staging', 'dev',
];

/**
 * Subdomain resolution middleware module.
 * Rewrites subdomain requests to /site/[subdomain]/* routes.
 */
export function subdomainRewrite(
  request: NextRequest,
  host: string
): NextResponse | null {
  const pathname = request.nextUrl.pathname;
  const isBukeerDomain =
    host.endsWith(`.${MAIN_DOMAIN}`) ||
    host === MAIN_DOMAIN ||
    host.includes('localhost') ||
    host.includes('127.0.0.1');

  if (!isBukeerDomain) return null;

  // Development: subdomain via query param
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    const subdomain =
      request.nextUrl.searchParams.get('subdomain') ||
      request.headers.get('x-subdomain');

    if (!subdomain) return null;

    const newUrl = new URL(request.nextUrl);
    if (!pathname.startsWith('/site/')) {
      newUrl.pathname = `/site/${subdomain}${pathname}`;
    }
    const response = NextResponse.rewrite(newUrl);
    response.headers.set('x-subdomain', subdomain);
    return response;
  }

  // Production
  let subdomain: string;
  if (host === MAIN_DOMAIN) {
    subdomain = 'bukeer';
  } else {
    subdomain = host.replace(`.${MAIN_DOMAIN}`, '').split('.')[0];
  }

  if (subdomain === 'web-public') subdomain = 'bukeer';
  if (RESERVED_SUBDOMAINS.includes(subdomain.toLowerCase())) return null;

  const newUrl = new URL(request.nextUrl);
  if (!pathname.startsWith('/site/')) {
    newUrl.pathname = `/site/${subdomain}${pathname}`;
  }
  const response = NextResponse.rewrite(newUrl);
  response.headers.set('x-subdomain', subdomain);
  return response;
}
