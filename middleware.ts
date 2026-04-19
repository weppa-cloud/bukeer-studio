import { NextRequest, NextResponse } from 'next/server';
import { refreshAuthSession } from '@/lib/supabase/middleware-client';
import {
  PUBLIC_LOCALE_HEADER_NAMES,
  extractWebsiteLocaleSettings,
  resolveLocaleFromPublicPath,
} from '@/lib/seo/locale-routing';

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
  id: string;
  subdomain: string;
  account_id: string;
  default_locale?: string | null;
  supported_locales?: string[] | null;
}

interface LocaleAwareRoutingInput {
  request: NextRequest;
  sourceUrl: URL;
  pathnameWithoutLang: string;
  canonicalPathname: string;
  originalPathname: string;
  subdomain: string;
  host?: string;
  resolvedLocale: string;
  defaultLocale: string;
  resolvedLanguage: string;
  hasLanguageSegment: boolean;
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

// ---------------------------------------------------------------------------
// In-memory TTL cache for middleware DB lookups
// ---------------------------------------------------------------------------
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 200;

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

const _middlewareCache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | undefined {
  const entry = _middlewareCache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiry) {
    _middlewareCache.delete(key);
    return undefined;
  }
  return entry.data as T;
}

function setCached<T>(key: string, data: T): void {
  // Evict oldest entries if at capacity
  if (_middlewareCache.size >= MAX_CACHE_SIZE) {
    const firstKey = _middlewareCache.keys().next().value;
    if (firstKey) _middlewareCache.delete(firstKey);
  }
  _middlewareCache.set(key, { data, expiry: Date.now() + CACHE_TTL_MS });
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
  const cacheKey = `sub:${subdomain}`;
  const cached = getCached<WebsiteLookup | null>(cacheKey);
  if (cached !== undefined) return cached;

  const data = await supabaseFetch<WebsiteLookup[]>(
    `/rest/v1/websites?select=id,subdomain,account_id,default_locale,supported_locales&subdomain=eq.${encodeURIComponent(subdomain)}&status=eq.published&deleted_at=is.null&limit=1`
  );
  const result = data && data.length > 0 ? data[0] : null;
  setCached(cacheKey, result);
  return result;
}

async function getWebsiteByCustomDomain(host: string): Promise<WebsiteLookup | null> {
  const cacheKey = `domain:${host}`;
  const cached = getCached<WebsiteLookup | null>(cacheKey);
  if (cached !== undefined) return cached;

  const data = await supabaseFetch<WebsiteLookup[]>(
    `/rest/v1/websites?select=id,subdomain,account_id,default_locale,supported_locales&custom_domain=eq.${encodeURIComponent(host)}&status=eq.published&deleted_at=is.null&limit=1`
  );
  const result = data && data.length > 0 ? data[0] : null;
  setCached(cacheKey, result);
  return result;
}

async function productExists(
  subdomain: string,
  productType: string,
  productSlug: string
): Promise<boolean> {
  const cacheKey = `prod:${subdomain}:${productType}:${productSlug}`;
  const cached = getCached<boolean>(cacheKey);
  if (cached !== undefined) return cached;

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
  const result = Boolean(data && typeof data === 'object' && 'product' in data && data.product);
  setCached(cacheKey, result);
  return result;
}

async function getRedirectedSlug(
  accountId: string,
  productType: string,
  oldSlug: string
): Promise<string | null> {
  const cacheKey = `redir:${accountId}:${productType}:${oldSlug}`;
  const cached = getCached<string | null>(cacheKey);
  if (cached !== undefined) return cached;

  const data = await supabaseFetch<Array<{ new_slug: string }>>(
    `/rest/v1/slug_redirects?select=new_slug&account_id=eq.${encodeURIComponent(accountId)}&product_type=eq.${encodeURIComponent(productType)}&old_slug=eq.${encodeURIComponent(oldSlug)}&limit=1`
  );
  const result = data && data.length > 0 ? (data[0].new_slug || '').toLowerCase().trim() || null : null;
  setCached(cacheKey, result);
  return result;
}

async function trySlugRedirect(
  request: NextRequest,
  route: { categorySlug: string; productType: string; productSlug: string },
  website: WebsiteLookup | null,
  languageSegment: string | null = null,
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
  redirectUrl.pathname = languageSegment
    ? `/${languageSegment}/${route.categorySlug}/${redirectedSlug}`
    : `/${route.categorySlug}/${redirectedSlug}`;
  return NextResponse.redirect(redirectUrl, 301);
}

interface LegacyRedirectRow {
  new_path: string;
  status_code: number;
}

function buildLegacyPathCandidates(pathname: string): string[] {
  const ensuredLeadingSlash = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const normalized =
    ensuredLeadingSlash.length > 1
      ? ensuredLeadingSlash.replace(/\/+$/, '')
      : ensuredLeadingSlash;
  const withTrailingSlash = normalized === '/' ? '/' : `${normalized}/`;
  const candidates = [
    ensuredLeadingSlash,
    normalized,
    withTrailingSlash,
    ensuredLeadingSlash.toLowerCase(),
    normalized.toLowerCase(),
    withTrailingSlash.toLowerCase(),
  ];

  return [...new Set(candidates)];
}

function coerceRedirectStatusCode(value: number): 301 | 302 | 307 | 308 {
  if (value === 302 || value === 307 || value === 308) {
    return value;
  }
  return 301;
}

async function getLegacyRedirect(
  websiteId: string,
  pathname: string
): Promise<LegacyRedirectRow | null> {
  const cacheKey = `legacy:${websiteId}:${pathname}`;
  const cached = getCached<LegacyRedirectRow | null>(cacheKey);
  if (cached !== undefined) return cached;

  const candidates = buildLegacyPathCandidates(pathname);

  for (const candidate of candidates) {
    const data = await supabaseFetch<LegacyRedirectRow[]>(
      `/rest/v1/website_legacy_redirects?select=new_path,status_code&website_id=eq.${encodeURIComponent(websiteId)}&old_path=eq.${encodeURIComponent(candidate)}&limit=1`
    );
    if (data && data.length > 0 && data[0].new_path) {
      const result = data[0];
      setCached(cacheKey, result);
      return result;
    }
  }

  setCached(cacheKey, null);
  return null;
}

async function tryLegacyRedirect(
  request: NextRequest,
  website: WebsiteLookup | null,
  pathname: string = request.nextUrl.pathname,
): Promise<NextResponse | null> {
  if (!website?.id) {
    return null;
  }

  const legacy = await getLegacyRedirect(website.id, pathname);
  if (!legacy?.new_path) {
    return null;
  }

  const target = legacy.new_path.startsWith('http://') || legacy.new_path.startsWith('https://')
    ? new URL(legacy.new_path)
    : new URL(
        legacy.new_path.startsWith('/') ? legacy.new_path : `/${legacy.new_path}`,
        request.url
      );

  // Preserve query params from original URL when redirect target does not define its own query
  if (!target.search && request.nextUrl.search) {
    target.search = request.nextUrl.search;
  }

  const current = request.nextUrl;
  const isSameDestination =
    target.origin === current.origin &&
    target.pathname === current.pathname &&
    target.search === current.search;

  if (isSameDestination) {
    return null;
  }

  return NextResponse.redirect(target, coerceRedirectStatusCode(legacy.status_code));
}

function applyLocaleAwareTenantRewrite(input: LocaleAwareRoutingInput): NextResponse {
  const {
    request,
    sourceUrl,
    pathnameWithoutLang,
    canonicalPathname,
    originalPathname,
    subdomain,
    host,
    resolvedLocale,
    defaultLocale,
    resolvedLanguage,
    hasLanguageSegment,
  } = input;

  // Internal rewrite target uses Spanish-canonical category segments so a
  // single route file per category serves all locales. The browser URL is
  // preserved (response.url unchanged) — see [[ADR-019]] amendment.
  const internalPathname = canonicalPathname || pathnameWithoutLang;
  const rewriteUrl = new URL(sourceUrl);
  rewriteUrl.pathname = `/site/${subdomain}${internalPathname}`;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-subdomain', subdomain);
  requestHeaders.set(PUBLIC_LOCALE_HEADER_NAMES.resolvedLocale, resolvedLocale);
  requestHeaders.set(PUBLIC_LOCALE_HEADER_NAMES.defaultLocale, defaultLocale);
  requestHeaders.set(PUBLIC_LOCALE_HEADER_NAMES.lang, resolvedLanguage);
  requestHeaders.set(
    PUBLIC_LOCALE_HEADER_NAMES.localeSegment,
    hasLanguageSegment ? resolvedLanguage : '',
  );
  if (host) {
    requestHeaders.set('x-custom-domain', host);
  }

  const response = NextResponse.rewrite(rewriteUrl, {
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set('x-subdomain', subdomain);
  response.headers.set(PUBLIC_LOCALE_HEADER_NAMES.resolvedLocale, resolvedLocale);
  response.headers.set(PUBLIC_LOCALE_HEADER_NAMES.defaultLocale, defaultLocale);
  response.headers.set(PUBLIC_LOCALE_HEADER_NAMES.lang, resolvedLanguage);
  response.headers.set(
    PUBLIC_LOCALE_HEADER_NAMES.localeSegment,
    hasLanguageSegment ? resolvedLanguage : '',
  );
  response.headers.set('x-public-original-pathname', originalPathname);
  if (host) {
    response.headers.set('x-custom-domain', host);
  }

  return response;
}

export async function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const host = getRequestHost(request);
  const pathname = url.pathname;

  // Editor routes — handle SSO token if present, otherwise pass through
  if (pathname.startsWith('/editor')) {
    const token = url.searchParams.get('token');
    if (token && SUPABASE_URL && SUPABASE_ANON_KEY) {
      // Set token as cookie for client-side auth, then redirect to clean URL
      const cleanUrl = new URL(url);
      cleanUrl.searchParams.delete('token');
      const redirectResponse = NextResponse.redirect(cleanUrl);
      redirectResponse.cookies.set('sb-auth-token', token, {
        path: '/',
        httpOnly: false,
        maxAge: 3600,
      });
      return redirectResponse;
    }
    return NextResponse.next();
  }

  // Auth guard for dashboard routes
  if (pathname.startsWith('/dashboard')) {
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      // Handle one-time JWT token from Flutter
      const token = url.searchParams.get('token');
      if (token) {
        // Set token as cookie for client-side auth, then redirect to clean URL
        const cleanUrl = new URL(url);
        cleanUrl.searchParams.delete('token');
        const redirectResponse = NextResponse.redirect(cleanUrl);
        redirectResponse.cookies.set('sb-auth-token', token, {
          path: '/',
          httpOnly: false,
          maxAge: 3600,
        });
        return redirectResponse;
      }

      // Check for any Supabase auth cookie
      const allCookies = request.cookies.getAll();
      const hasAuthCookie = allCookies.some(c =>
        c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
      );

      if (!hasAuthCookie) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
      }

      // Refresh auth session — revalidates JWT and updates cookies
      // so Server Components receive fresh tokens.
      const response = NextResponse.next();
      try {
        return await refreshAuthSession(request, response);
      } catch {
        // If refresh fails, continue — the dashboard will handle auth errors
        return response;
      }
    }

    return NextResponse.next();
  }

  // Auth pages — no rewrite needed
  if (pathname.startsWith('/login') || pathname.startsWith('/forgot-password') || pathname.startsWith('/reset-password')) {
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

  // Already-internal tenant routes should pass through untouched.
  if (pathname.startsWith('/site/') || pathname.startsWith('/domain/')) {
    return NextResponse.next();
  }

  // === BLOG SEO PIPELINE — AI crawler headers ===
  const userAgent = request.headers.get('user-agent') || '';
  const AI_CRAWLERS = ['GPTBot', 'ChatGPT-User', 'OAI-SearchBot', 'ClaudeBot', 'anthropic-ai', 'PerplexityBot'];
  if (AI_CRAWLERS.some(bot => userAgent.includes(bot))) {
    const response = NextResponse.next();
    response.headers.set('X-Robots-Tag', 'index, follow');
    return response;
  }
  // === END BLOG SEO PIPELINE ===

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

      const website = await getWebsiteBySubdomain(subdomain);
      const localeResolution = resolveLocaleFromPublicPath(
        pathname,
        extractWebsiteLocaleSettings(website),
      );
      const potentialProductRoute = getPotentialProductRoute(localeResolution.pathnameWithoutLang);

      const legacyRedirectResponse = await tryLegacyRedirect(
        request,
        website,
        localeResolution.pathnameWithoutLang,
      );
      if (legacyRedirectResponse) {
        return legacyRedirectResponse;
      }

      if (potentialProductRoute) {
        const redirectResponse = await trySlugRedirect(
          request,
          potentialProductRoute,
          website,
          localeResolution.resolvedLocale === localeResolution.defaultLocale
            ? null
            : localeResolution.resolvedLanguage,
        );
        if (redirectResponse) {
          return redirectResponse;
        }
      }

      // Rewrite to tenant route
      return applyLocaleAwareTenantRewrite({
        request,
        sourceUrl: url,
        pathnameWithoutLang: localeResolution.pathnameWithoutLang,
        canonicalPathname: localeResolution.canonicalPathname,
        originalPathname: localeResolution.originalPathname,
        subdomain,
        resolvedLocale: localeResolution.resolvedLocale,
        defaultLocale: localeResolution.defaultLocale,
        resolvedLanguage: localeResolution.resolvedLanguage,
        hasLanguageSegment: localeResolution.hasLanguageSegment,
      });
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

    const website = await getWebsiteBySubdomain(subdomain);
    const localeResolution = resolveLocaleFromPublicPath(
      pathname,
      extractWebsiteLocaleSettings(website),
    );
    const potentialProductRoute = getPotentialProductRoute(localeResolution.pathnameWithoutLang);

    const legacyRedirectResponse = await tryLegacyRedirect(
      request,
      website,
      localeResolution.pathnameWithoutLang,
    );
    if (legacyRedirectResponse) {
      return legacyRedirectResponse;
    }

    if (potentialProductRoute) {
      const redirectResponse = await trySlugRedirect(
        request,
        potentialProductRoute,
        website,
        localeResolution.resolvedLocale === localeResolution.defaultLocale
          ? null
          : localeResolution.resolvedLanguage,
      );
      if (redirectResponse) {
        return redirectResponse;
      }
    }

    // Rewrite to tenant route
    return applyLocaleAwareTenantRewrite({
      request,
      sourceUrl: url,
      pathnameWithoutLang: localeResolution.pathnameWithoutLang,
      canonicalPathname: localeResolution.canonicalPathname,
      originalPathname: localeResolution.originalPathname,
      subdomain,
      resolvedLocale: localeResolution.resolvedLocale,
      defaultLocale: localeResolution.defaultLocale,
      resolvedLanguage: localeResolution.resolvedLanguage,
      hasLanguageSegment: localeResolution.hasLanguageSegment,
    });
  } else {
    let website = await getWebsiteByCustomDomain(host);

    if (!website && host.startsWith('www.')) {
      const canonicalHost = host.slice(4);
      website = await getWebsiteByCustomDomain(canonicalHost);

      // Canonicalize www -> apex when the apex custom domain is registered.
      if (website) {
        const canonicalUrl = new URL(request.url);
        canonicalUrl.hostname = canonicalHost;
        return NextResponse.redirect(canonicalUrl, 301);
      }
    }

    const localeResolution = resolveLocaleFromPublicPath(
      pathname,
      extractWebsiteLocaleSettings(website),
    );
    const potentialProductRoute = getPotentialProductRoute(localeResolution.pathnameWithoutLang);

    const legacyRedirectResponse = await tryLegacyRedirect(
      request,
      website,
      localeResolution.pathnameWithoutLang,
    );
    if (legacyRedirectResponse) {
      return legacyRedirectResponse;
    }

    if (potentialProductRoute) {
      const redirectResponse = await trySlugRedirect(
        request,
        potentialProductRoute,
        website,
        localeResolution.resolvedLocale === localeResolution.defaultLocale
          ? null
          : localeResolution.resolvedLanguage,
      );
      if (redirectResponse) {
        return redirectResponse;
      }
    }

    // Prefer the stable tenant pipeline for verified custom domains.
    // This avoids custom-domain-specific rendering divergence in Worker runtime.
    if (website?.subdomain) {
      return applyLocaleAwareTenantRewrite({
        request,
        sourceUrl: url,
        pathnameWithoutLang: localeResolution.pathnameWithoutLang,
        canonicalPathname: localeResolution.canonicalPathname,
        originalPathname: localeResolution.originalPathname,
        subdomain: website.subdomain,
        host,
        resolvedLocale: localeResolution.resolvedLocale,
        defaultLocale: localeResolution.defaultLocale,
        resolvedLanguage: localeResolution.resolvedLanguage,
        hasLanguageSegment: localeResolution.hasLanguageSegment,
      });
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
