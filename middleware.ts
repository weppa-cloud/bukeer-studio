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
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const CATEGORY_TO_PRODUCT_TYPE: Record<string, string> = {
  destinos: 'destination',
  destinations: 'destination',
  hoteles: 'hotel',
  hotels: 'hotel',
  actividades: 'activity',
  activities: 'activity',
  traslados: 'transfer',
  transfers: 'transfer',
  paquetes: 'package',
  packages: 'package',
};

interface WebsiteLookup {
  subdomain: string;
  account_id: string;
}

function getRequestHost(request: NextRequest): string {
  const hostHeader = request.headers.get('host') || '';
  return hostHeader.split(':')[0].toLowerCase().replace(/\.$/, '');
}

function getPotentialProductRoute(pathname: string): {
  categorySlug: string;
  productType: string;
  productSlug: string;
} | null {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length < 2) return null;
  if (segments[0] === 'site' || segments[0] === 'domain') return null;

  const categorySlug = segments[0].toLowerCase();
  const productType = CATEGORY_TO_PRODUCT_TYPE[categorySlug];

  if (!productType) return null;

  return {
    categorySlug,
    productType,
    productSlug: segments.slice(1).join('/').toLowerCase(),
  };
}

async function supabaseFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return null;
  }

  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as T;
}

async function getWebsiteBySubdomain(subdomain: string): Promise<WebsiteLookup | null> {
  const data = await supabaseFetch<WebsiteLookup[]>(
    `/rest/v1/websites?select=subdomain,account_id&subdomain=eq.${encodeURIComponent(subdomain)}&status=eq.published&deleted_at=is.null&limit=1`
  );

  if (!data || data.length === 0) {
    return null;
  }

  return data[0];
}

async function getWebsiteByCustomDomain(host: string): Promise<WebsiteLookup | null> {
  const data = await supabaseFetch<WebsiteLookup[]>(
    `/rest/v1/websites?select=subdomain,account_id&custom_domain=eq.${encodeURIComponent(host)}&status=eq.published&deleted_at=is.null&limit=1`
  );

  if (!data || data.length === 0) {
    return null;
  }

  return data[0];
}

async function productExists(
  subdomain: string,
  productType: string,
  productSlug: string
): Promise<boolean> {
  const data = await supabaseFetch<{ product?: unknown } | null>(
    '/rest/v1/rpc/get_website_product_page',
    {
      method: 'POST',
      body: JSON.stringify({
        p_subdomain: subdomain,
        p_product_type: productType,
        p_product_slug: productSlug,
      }),
    }
  );

  return Boolean(data && typeof data === 'object' && 'product' in data && data.product);
}

async function getRedirectedSlug(
  accountId: string,
  productType: string,
  oldSlug: string
): Promise<string | null> {
  const data = await supabaseFetch<Array<{ new_slug: string }>>(
    `/rest/v1/slug_redirects?select=new_slug&account_id=eq.${encodeURIComponent(accountId)}&product_type=eq.${encodeURIComponent(productType)}&old_slug=eq.${encodeURIComponent(oldSlug)}&limit=1`
  );

  if (!data || data.length === 0) {
    return null;
  }

  const redirectedSlug = (data[0].new_slug || '').toLowerCase().trim();
  return redirectedSlug || null;
}

async function trySlugRedirect(
  request: NextRequest,
  route: { categorySlug: string; productType: string; productSlug: string },
  website: WebsiteLookup | null
): Promise<NextResponse | null> {
  if (!website || !website.subdomain || !website.account_id) {
    return null;
  }

  const exists = await productExists(website.subdomain, route.productType, route.productSlug);
  if (exists) {
    return null;
  }

  const redirectedSlug = await getRedirectedSlug(
    website.account_id,
    route.productType,
    route.productSlug
  );

  if (!redirectedSlug || redirectedSlug === route.productSlug) {
    return null;
  }

  const redirectUrl = new URL(request.nextUrl);
  redirectUrl.pathname = `/${route.categorySlug}/${redirectedSlug}`;
  return NextResponse.redirect(redirectUrl, 301);
}

export async function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const host = getRequestHost(request);
  const pathname = url.pathname;
  const potentialProductRoute = getPotentialProductRoute(pathname);

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

      if (potentialProductRoute) {
        const website = await getWebsiteBySubdomain(subdomain);
        const redirectResponse = await trySlugRedirect(request, potentialProductRoute, website);
        if (redirectResponse) {
          return redirectResponse;
        }
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

    // Staging alias: web-public.bukeer.com → corporate site
    if (subdomain === 'web-public') {
      subdomain = 'bukeer';
    }

    // Check if subdomain is reserved
    if (RESERVED_SUBDOMAINS.includes(subdomain.toLowerCase())) {
      return NextResponse.next();
    }

    if (potentialProductRoute) {
      const website = await getWebsiteBySubdomain(subdomain);
      const redirectResponse = await trySlugRedirect(request, potentialProductRoute, website);
      if (redirectResponse) {
        return redirectResponse;
      }
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
    if (potentialProductRoute) {
      const website = await getWebsiteByCustomDomain(host);
      const redirectResponse = await trySlugRedirect(request, potentialProductRoute, website);
      if (redirectResponse) {
        return redirectResponse;
      }
    }

    // Custom domain (e.g., miagencia.com)
    // Rewrite to /domain/[host]/... route
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
