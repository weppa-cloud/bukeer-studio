import { NextRequest, NextResponse } from 'next/server';
import { refreshAuthSession } from '@/lib/supabase/middleware-client';
import {
  PUBLIC_LOCALE_HEADER_NAMES,
  extractWebsiteLocaleSettings,
  resolveLocaleFromPublicPath,
  type WebsiteLocaleSettings,
} from '@/lib/seo/locale-routing';

// Subdomains that should NOT be treated as tenant sites
const RESERVED_SUBDOMAINS = [
  'www',
  'app',
  'api',
  'admin',
  'studio',
  'canvas',
  'staging',
  'dev',
];

// Main domain - update for production
const MAIN_DOMAIN = process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'bukeer.com';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SITE_PREVIEW_TOKEN = process.env.SITE_PREVIEW_TOKEN || process.env.REVALIDATE_SECRET;
const SITE_PREVIEW_PARAM = 'preview_token';
const SITE_PREVIEW_COOKIE = '__bukeer_site_preview';
const COLOMBIA_TOURS_EN_HOST = 'en.colombiatours.travel';
const COLOMBIA_TOURS_CANONICAL_HOST = 'colombiatours.travel';

const COLOMBIA_TOURS_EN_REDIRECTS: Record<string, string> = {
  '/': '/en',
  '/tipos-de-mamas': '/en/blog',
  '/tipos-de-mamas/': '/en/blog',
  '/los-10-mejores-lugares-turisticos': '/en/blog/los-10-mejores-lugares-turisticos-de-colombia',
  '/los-10-mejores-lugares-turisticos/': '/en/blog/los-10-mejores-lugares-turisticos-de-colombia',
  '/10-destinos-para-visitar-con-mama': '/en/blog/10-destinos-para-visitar-con-mama',
  '/10-destinos-para-visitar-con-mama/': '/en/blog/10-destinos-para-visitar-con-mama',
  '/es-seguro-viajar-a-isla-margarita': '/en/blog',
  '/es-seguro-viajar-a-isla-margarita/': '/en/blog',
  '/nombres-de-empresas-de-turismo': '/en/blog',
  '/nombres-de-empresas-de-turismo/': '/en/blog',
};

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

function resolveWebsiteLocaleSettingsForMiddleware(
  website: WebsiteLookup | null,
): WebsiteLocaleSettings {
  const settings = extractWebsiteLocaleSettings(website);
  const hasExplicitLocaleColumns = Boolean(
    website && (
      (typeof website.default_locale === 'string' && website.default_locale.length > 0) ||
      (Array.isArray(website.supported_locales) && website.supported_locales.length > 0)
    ),
  );

  if (hasExplicitLocaleColumns) {
    return settings;
  }

  // Backward-compatible fallback for schemas where websites table doesn't
  // expose locale columns. Keep default locale and allow EN aliases.
  const supportedLocales = settings.supportedLocales.includes('en-US')
    ? settings.supportedLocales
    : [...settings.supportedLocales, 'en-US'];

  return {
    ...settings,
    supportedLocales,
  };
}

function getRequestHost(request: NextRequest): string {
  const hostHeader = request.headers.get('host') || '';
  return hostHeader.split(':')[0].toLowerCase().replace(/\.$/, '');
}

function redirectColombiaToursEnSubdomain(request: NextRequest): NextResponse {
  const currentPathname = request.nextUrl.pathname || '/';
  const normalizedPathname =
    currentPathname.length > 1
      ? currentPathname.replace(/\/+$/, '')
      : '/';
  const mappedPathname =
    COLOMBIA_TOURS_EN_REDIRECTS[currentPathname] ||
    COLOMBIA_TOURS_EN_REDIRECTS[normalizedPathname] ||
    `/en${currentPathname === '/' ? '' : currentPathname}`;

  const target = new URL(request.url);
  target.hostname = COLOMBIA_TOURS_CANONICAL_HOST;
  target.pathname = mappedPathname;
  return NextResponse.redirect(target, 301);
}

async function redirectCustomDomainInternalSitePath(
  request: NextRequest,
  host: string,
  pathname: string,
): Promise<NextResponse | null> {
  if (
    host === MAIN_DOMAIN ||
    host.endsWith(`.${MAIN_DOMAIN}`) ||
    host.includes('localhost') ||
    host.includes('127.0.0.1')
  ) {
    return null;
  }

  const internalMatch = parseInternalSitePath(pathname);
  if (!internalMatch) return null;

  let canonicalHost = host;
  let website = await getWebsiteByCustomDomain(host);

  if (!website && host.startsWith('www.')) {
    canonicalHost = host.slice(4);
    website = await getWebsiteByCustomDomain(canonicalHost);
  }

  if (!website?.subdomain) return null;

  if (website.subdomain.toLowerCase() !== internalMatch.subdomain) {
    return null;
  }

  const target = new URL(request.url);
  target.hostname = canonicalHost;
  target.pathname = internalMatch.innerPathname;
  return NextResponse.redirect(target, 301);
}

/**
 * Parse an already-internal `/site/<subdomain>/<rest>` pathname into its
 * component parts. Returns null if the pathname is not in the expected
 * shape (e.g. `/site/` alone, `/site/<sub>` with no trailing path).
 *
 * Used by the `/site/` branch of the middleware to detect translated-locale
 * segments such as `/site/colombiatours/en/paquetes/<slug>` so the locale
 * headers + canonical rewrite get applied even when the browser hit the
 * internal route directly (E2E fixtures, staging smoke tests, etc).
 */
export function parseInternalSitePath(pathname: string): {
  subdomain: string;
  innerPathname: string;
} | null {
  if (!pathname.startsWith('/site/')) return null;
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length < 2) return null;
  const [marker, subdomainRaw, ...rest] = segments;
  if (marker !== 'site' || !subdomainRaw) return null;
  const innerPathname = rest.length > 0 ? `/${rest.join('/')}` : '/';
  return {
    subdomain: subdomainRaw.toLowerCase(),
    innerPathname,
  };
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
  const supabaseKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !supabaseKey) {
    return null;
  }

  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
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

async function getWebsiteBySubdomain(
  subdomain: string,
  options?: { includeUnpublished?: boolean },
): Promise<WebsiteLookup | null> {
  const includeUnpublished = options?.includeUnpublished === true;
  const cacheKey = `sub:${includeUnpublished ? 'all' : 'published'}:${subdomain}`;
  const cached = getCached<WebsiteLookup | null>(cacheKey);
  if (cached !== undefined) return cached;

  const statusFilter = includeUnpublished ? '' : '&status=eq.published';
  const data = await supabaseFetch<WebsiteLookup[]>(
    `/rest/v1/websites?select=id,subdomain,account_id,default_locale,supported_locales&subdomain=eq.${encodeURIComponent(subdomain)}${statusFilter}&deleted_at=is.null&limit=1`
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

function applySitePreviewHeaders(response: NextResponse): NextResponse {
  if (process.env.LHCI_ALLOW_INDEX !== '1') {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  }
  response.headers.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
  return response;
}

export async function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const host = getRequestHost(request);
  const pathname = url.pathname;

  if (host === COLOMBIA_TOURS_EN_HOST) {
    return redirectColombiaToursEnSubdomain(request);
  }

  const studioHost = `studio.${MAIN_DOMAIN}`;
  if (host === studioHost && pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url), 307);
  }

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

  if (pathname.startsWith('/site/')) {
    const customDomainRedirect = await redirectCustomDomainInternalSitePath(
      request,
      host,
      pathname,
    );
    if (customDomainRedirect) {
      return customDomainRedirect;
    }
  }

  // Already-internal tenant routes normally pass through untouched. One
  // exception: direct requests to `/site/<subdomain>/<lang>/...` (used by
  // E2E specs and internal tooling) must still receive the locale headers
  // + canonical rewrite that the subdomain-first flow applies. Without
  // this, SSR falls back to the tenant default locale even though the URL
  // contains a translated-locale segment. See [[ADR-019]] + Cluster-E of
  // Stage 6 (#213) for the handoff from PR #243.
  if (pathname.startsWith('/site/')) {
    const queryToken = url.searchParams.get(SITE_PREVIEW_PARAM);
    const cookieToken = request.cookies.get(SITE_PREVIEW_COOKIE)?.value;
    const tokenFromRequest = queryToken || cookieToken;

    if (!SITE_PREVIEW_TOKEN || tokenFromRequest !== SITE_PREVIEW_TOKEN) {
      return applySitePreviewHeaders(
        new NextResponse('Preview token required', { status: 401 }),
      );
    }

    if (queryToken === SITE_PREVIEW_TOKEN) {
      const cleanUrl = new URL(url);
      cleanUrl.searchParams.delete(SITE_PREVIEW_PARAM);
      const redirectResponse = NextResponse.redirect(cleanUrl, 307);
      redirectResponse.cookies.set(SITE_PREVIEW_COOKIE, SITE_PREVIEW_TOKEN, {
        path: '/site',
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 6, // 6h preview session
      });
      return applySitePreviewHeaders(redirectResponse);
    }

    const internalMatch = parseInternalSitePath(pathname);
    if (
      internalMatch &&
      internalMatch.innerPathname !== '/' &&
      /^[a-z]{2}$/.test(internalMatch.innerPathname.split('/').filter(Boolean)[0] || '')
    ) {
      const website = await getWebsiteBySubdomain(internalMatch.subdomain);
      const localeSettings = extractWebsiteLocaleSettings(website);
      const localeResolution = resolveLocaleFromPublicPath(
        internalMatch.innerPathname,
        localeSettings,
      );

      // Only intervene when the leading segment resolved to an actual
      // supported non-default locale. If the leading two-letter segment
      // did not map to a locale, fall back to pass-through so we don't
      // accidentally break unrelated routes.
      if (
        localeResolution.hasLanguageSegment &&
        localeResolution.resolvedLocale !== localeResolution.defaultLocale
      ) {
        return applySitePreviewHeaders(applyLocaleAwareTenantRewrite({
          request,
          sourceUrl: url,
          pathnameWithoutLang: localeResolution.pathnameWithoutLang,
          canonicalPathname: localeResolution.canonicalPathname,
          originalPathname: localeResolution.originalPathname,
          subdomain: internalMatch.subdomain,
          resolvedLocale: localeResolution.resolvedLocale,
          defaultLocale: localeResolution.defaultLocale,
          resolvedLanguage: localeResolution.resolvedLanguage,
          hasLanguageSegment: localeResolution.hasLanguageSegment,
        }));
      }
    }

    const passThrough = NextResponse.next();
    passThrough.cookies.set(SITE_PREVIEW_COOKIE, SITE_PREVIEW_TOKEN, {
      path: '/site',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 6,
    });
    return applySitePreviewHeaders(passThrough);
  }

  if (pathname.startsWith('/domain/')) {
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

      const website = await getWebsiteBySubdomain(subdomain, { includeUnpublished: true });
      const localeResolution = resolveLocaleFromPublicPath(
        pathname,
        resolveWebsiteLocaleSettingsForMiddleware(website),
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
      resolveWebsiteLocaleSettingsForMiddleware(website),
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
      resolveWebsiteLocaleSettingsForMiddleware(website),
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
