export const DEFAULT_PUBLIC_LOCALE = 'es-CO';

/**
 * Legacy ISO-639 → canonical BCP-47 locale normalization.
 *
 * Production has 500+ `website_blog_posts` rows stored with legacy `es`/`en`
 * (ISO-639 short codes) from the WordPress migration. Stage 6 middleware +
 * hreflang emission assume canonical `es-CO`/`en-US`. Read-time normalize so
 * legacy rows resolve cleanly without DB writes. NEVER update
 * `website_blog_posts.locale` directly — middleware-layer only.
 */
const LEGACY_BLOG_LOCALE_MAP: Record<string, string> = {
  es: 'es-CO',
  en: 'en-US',
  pt: 'pt-BR',
  fr: 'fr-FR',
  de: 'de-DE',
};

const PUBLIC_LOCALE_SEGMENT_BY_LOCALE: Record<string, string> = {
  'en-US': 'en',
  'de-DE': 'de',
  'fr-FR': 'fr',
  'pt-BR': 'pt-br',
};

const PUBLIC_LOCALE_ALIAS_BY_SEGMENT: Record<string, string> = {
  'pt-br': 'pt-BR',
};

/**
 * Normalize a stored locale value, mapping legacy ISO-639 short codes to
 * canonical BCP-47. Passes through canonical codes (`es-CO`, `en-US`,
 * `pt-BR`, etc.) unchanged. Returns `null` for empty/whitespace input.
 *
 * Use this at the data-access boundary for any resource whose `locale`
 * column may still contain legacy values (blog posts being the main case).
 */
export function normalizeBlogLocale(
  stored: string | null | undefined,
): string | null {
  if (!stored) return null;
  const trimmed = stored.trim();
  if (!trimmed) return null;
  return LEGACY_BLOG_LOCALE_MAP[trimmed] ?? trimmed;
}

export const PUBLIC_LOCALE_HEADER_NAMES = {
  resolvedLocale: 'x-public-locale',
  defaultLocale: 'x-public-default-locale',
  lang: 'x-public-lang',
  localeSegment: 'x-public-locale-segment',
} as const;

/**
 * Canonical category segments per language.
 *
 * Spanish segments are the internal canonical form — they back the actual
 * Next.js route files under `app/site/[subdomain]/{paquetes,hoteles,...}`.
 * Middleware rewrites non-Spanish segments (e.g. `/en/packages/X`) back to
 * the canonical Spanish path (`/site/sub/paquetes/X`) while preserving the
 * requested URL in the browser (see [[ADR-019]] amendment 2026-04-19).
 */
export const CATEGORY_CANONICAL_SEGMENT = {
  destination: { es: 'destinos', en: 'destinations', pt: 'destinos', fr: 'destinations', de: 'reiseziele' },
  hotel: { es: 'hoteles', en: 'hotels', pt: 'hotéis', fr: 'hôtels', de: 'hotels' },
  activity: { es: 'actividades', en: 'activities', pt: 'atividades', fr: 'activités', de: 'aktivitäten' },
  transfer: { es: 'traslados', en: 'transfers', pt: 'transferências', fr: 'transferts', de: 'transfers' },
  package: { es: 'paquetes', en: 'packages', pt: 'pacotes', fr: 'forfaits', de: 'pakete' },
} as const;

export type CategoryProductType = keyof typeof CATEGORY_CANONICAL_SEGMENT;
export type CategoryLanguage = keyof (typeof CATEGORY_CANONICAL_SEGMENT)[CategoryProductType];

export const LEGAL_PAGE_CANONICAL_SEGMENT = {
  terms: {
    internal: 'terms',
    es: 'terminos-y-condiciones',
    en: 'terms-and-conditions',
    pt: 'termos-e-condicoes',
    fr: 'conditions-generales',
    de: 'agb',
  },
  privacy: {
    internal: 'privacy',
    es: 'politica-de-privacidad',
    en: 'privacy-policy',
    pt: 'politica-de-privacidade',
    fr: 'politique-de-confidentialite',
    de: 'datenschutz',
  },
  cancellation: {
    internal: 'cancellation',
    es: 'politica-de-cancelacion',
    en: 'cancellation-policy',
    pt: 'politica-de-cancelamento',
    fr: 'politique-d-annulation',
    de: 'stornierungsbedingungen',
  },
} as const;

export type LegalPageType = keyof typeof LEGAL_PAGE_CANONICAL_SEGMENT;
export type LegalPageLanguage =
  Exclude<keyof (typeof LEGAL_PAGE_CANONICAL_SEGMENT)[LegalPageType], 'internal'>;

interface LegalPathIndex {
  pathname: string;
  type: LegalPageType;
}

const LEGAL_PATH_INDEX: LegalPathIndex[] = (
  Object.keys(LEGAL_PAGE_CANONICAL_SEGMENT) as LegalPageType[]
).flatMap((type) => {
  const entry = LEGAL_PAGE_CANONICAL_SEGMENT[type];
  const segments = [
    entry.internal,
    ...Object.keys(entry)
      .filter((language): language is LegalPageLanguage => language !== 'internal')
      .map((language) => entry[language]),
  ];
  return [...new Set(segments)].map((segment) => ({
    pathname: `/${segment}`,
    type,
  }));
}).concat([
  {
    pathname: `/${LEGAL_PAGE_CANONICAL_SEGMENT.terms.es}/${LEGAL_PAGE_CANONICAL_SEGMENT.privacy.es}`,
    type: 'privacy',
  },
  {
    pathname: `/${LEGAL_PAGE_CANONICAL_SEGMENT.terms.es}/${LEGAL_PAGE_CANONICAL_SEGMENT.cancellation.es}`,
    type: 'cancellation',
  },
]);

interface CategorySegmentIndex {
  segment: string;
  productType: CategoryProductType;
  language: CategoryLanguage;
}

const CATEGORY_SEGMENT_INDEX: CategorySegmentIndex[] = (
  Object.keys(CATEGORY_CANONICAL_SEGMENT) as CategoryProductType[]
).flatMap((productType) => {
  const entry = CATEGORY_CANONICAL_SEGMENT[productType];
  return (Object.keys(entry) as CategoryLanguage[]).map((language) => ({
    segment: entry[language],
    productType,
    language,
  }));
});

/**
 * Resolve any category segment (Spanish or English) to its productType and
 * the canonical Spanish segment used for internal rewrite targets.
 *
 * Returns null for unknown segments.
 */
export function resolveCategorySegment(segment: string): {
  productType: CategoryProductType;
  canonicalEs: string;
  language: CategoryLanguage;
} | null {
  if (!segment || typeof segment !== 'string') return null;
  const normalized = segment.trim().toLowerCase();
  if (!normalized) return null;

  const match = CATEGORY_SEGMENT_INDEX.find((entry) => entry.segment === normalized);
  if (!match) return null;

  return {
    productType: match.productType,
    canonicalEs: CATEGORY_CANONICAL_SEGMENT[match.productType].es,
    language: match.language,
  };
}

/**
 * Translate public URL path segments for the target language.
 *
 * Category pages translate the first segment only. Legal pages translate the
 * whole path so legacy nested WordPress URLs can collapse into the current
 * top-level legal slug for the selected language.
 */
export function translateCategoryPathname(
  pathname: string,
  targetLanguage: string,
): string {
  if (!pathname || typeof pathname !== 'string') return pathname;
  const normalized = normalizePathname(pathname);
  if (normalized === '/') return normalized;

  const legalPath = resolveLegalPathname(normalized);
  if (legalPath) {
    return getLegalPagePublicPath(legalPath.type, targetLanguage);
  }

  const segments = normalized.split('/').filter(Boolean);
  if (segments.length === 0) return normalized;

  const firstSegment = segments[0].toLowerCase();
  const resolved = resolveCategorySegment(firstSegment);
  if (!resolved) return normalized;

  const lang = (targetLanguage || '').toLowerCase() as CategoryLanguage;
  const mapping = CATEGORY_CANONICAL_SEGMENT[resolved.productType] as Record<string, string>;
  const nextSegment = mapping[lang] || mapping.es;

  if (nextSegment === firstSegment) return normalized;

  segments[0] = nextSegment;
  return `/${segments.join('/')}`;
}

export function resolveLegalPathname(pathname: string): {
  type: LegalPageType;
  canonicalPathname: string;
} | null {
  if (!pathname || typeof pathname !== 'string') return null;
  const normalized = normalizePathname(pathname).toLowerCase();
  const match = LEGAL_PATH_INDEX.find((entry) => entry.pathname === normalized);
  if (!match) return null;

  return {
    type: match.type,
    canonicalPathname: `/${LEGAL_PAGE_CANONICAL_SEGMENT[match.type].internal}`,
  };
}

export function isLegalPathname(pathname: string): boolean {
  return resolveLegalPathname(pathname) !== null;
}

export function getLegalPagePublicPath(
  type: LegalPageType,
  targetLanguage: string,
): string {
  const lang = (targetLanguage || '').toLowerCase() as LegalPageLanguage;
  const entry = LEGAL_PAGE_CANONICAL_SEGMENT[type];
  const segment = entry[lang] || entry.es;
  return `/${segment}`;
}

export function canonicalizePublicPathname(pathname: string): string {
  const normalized = normalizePathname(pathname);
  const legalPath = resolveLegalPathname(normalized);
  if (legalPath) return legalPath.canonicalPathname;
  return translateCategoryPathname(normalized, 'es');
}

const DEFAULT_REGION_BY_LANG: Record<string, string> = {
  es: 'CO',
  en: 'US',
  pt: 'BR',
  fr: 'FR',
  de: 'DE',
};

function normalizePathname(pathname: string): string {
  if (!pathname || pathname.trim().length === 0) return '/';
  const withSlash = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const compact = withSlash.replace(/\/{2,}/g, '/');
  if (compact !== '/' && compact.endsWith('/')) {
    return compact.slice(0, -1);
  }
  return compact;
}

function normalizeLocaleToken(value: string): string {
  const cleaned = value.replace('_', '-').trim();
  const [languageRaw, regionRaw] = cleaned.split('-');
  const language = (languageRaw || '').toLowerCase();
  const region = (regionRaw || '').toUpperCase();

  if (!language) {
    return DEFAULT_PUBLIC_LOCALE;
  }

  return region ? `${language}-${region}` : language;
}

export function normalizeLocale(
  value: string | null | undefined,
  fallback: string = DEFAULT_PUBLIC_LOCALE,
): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return normalizeLocaleToken(fallback);
  }

  return normalizeLocaleToken(value);
}

export function localeToLanguage(locale: string): string {
  return normalizeLocale(locale).split('-')[0] || 'es';
}

export function localeToOgLocale(locale: string): string {
  const normalized = normalizeLocale(locale);
  const [languageRaw, regionRaw] = normalized.split('-');
  const language = (languageRaw || 'es').toLowerCase();
  const region = (regionRaw || DEFAULT_REGION_BY_LANG[language] || language).toUpperCase();
  return `${language}_${region}`;
}

export interface WebsiteLocaleSettings {
  defaultLocale: string;
  supportedLocales: string[];
}

export function normalizeWebsiteLocales(
  settings: {
    defaultLocale?: string | null;
    supportedLocales?: string[] | null;
  },
): WebsiteLocaleSettings {
  const defaultLocale = normalizeLocale(settings.defaultLocale);
  const rawLocales = Array.isArray(settings.supportedLocales)
    ? settings.supportedLocales
    : [];

  const normalized = rawLocales
    .filter((locale): locale is string => typeof locale === 'string' && locale.trim().length > 0)
    .map((locale) => normalizeLocale(locale));

  const unique = [...new Set([defaultLocale, ...normalized])];

  return {
    defaultLocale,
    supportedLocales: unique,
  };
}

export function extractWebsiteLocaleSettings(website: unknown): WebsiteLocaleSettings {
  const source = (website || {}) as Record<string, unknown>;

  const defaultLocaleRaw =
    (typeof source.default_locale === 'string' ? source.default_locale : null)
    || (typeof source.defaultLocale === 'string' ? source.defaultLocale : null)
    || (typeof source.locale === 'string' ? source.locale : null)
    || (typeof source.language === 'string' ? source.language : null);

  const supportedLocalesRaw =
    (Array.isArray(source.supported_locales) ? source.supported_locales : null)
    || (Array.isArray(source.supportedLocales) ? source.supportedLocales : null);

  const supportedLocales = Array.isArray(supportedLocalesRaw)
    ? supportedLocalesRaw.filter(
        (locale): locale is string => typeof locale === 'string' && locale.trim().length > 0,
      )
    : [];

  return normalizeWebsiteLocales({
    defaultLocale: defaultLocaleRaw,
    supportedLocales,
  });
}

function pickLocaleForLanguage(
  language: string,
  supportedLocales: string[],
  defaultLocale: string,
): string | null {
  const candidates = supportedLocales.filter((locale) => localeToLanguage(locale) === language);
  if (candidates.length === 0) return null;

  const normalizedDefault = normalizeLocale(defaultLocale);
  const defaultCandidate = candidates.find((locale) => normalizeLocale(locale) === normalizedDefault);
  return defaultCandidate || candidates[0];
}

function pickLocaleForPublicSegment(
  segment: string,
  supportedLocales: string[],
  defaultLocale: string,
): string | null {
  const lowerSegment = segment.toLowerCase();
  const explicitLocale = PUBLIC_LOCALE_ALIAS_BY_SEGMENT[lowerSegment];
  if (explicitLocale) {
    const normalizedExplicit = normalizeLocale(explicitLocale);
    return supportedLocales.includes(normalizedExplicit) ? normalizedExplicit : null;
  }

  if (/^[a-z]{2}$/.test(lowerSegment)) {
    return pickLocaleForLanguage(lowerSegment, supportedLocales, defaultLocale);
  }

  return null;
}

export interface PublicLocalePathResolution {
  originalPathname: string;
  pathnameWithoutLang: string;
  /**
   * Spanish-canonical form of `pathnameWithoutLang` used as the internal
   * rewrite target. Category segments (e.g. `/packages/X`) are translated
   * back to their Spanish canonical counterpart (`/paquetes/X`). Non-category
   * routes are identical to `pathnameWithoutLang`.
   */
  canonicalPathname: string;
  hasLanguageSegment: boolean;
  languageSegment: string | null;
  resolvedLocale: string;
  resolvedLanguage: string;
  defaultLocale: string;
  supportedLocales: string[];
}

export function resolveLocaleFromPublicPath(
  pathname: string,
  settings: WebsiteLocaleSettings,
): PublicLocalePathResolution {
  const normalizedPathname = normalizePathname(pathname);
  const { defaultLocale, supportedLocales } = normalizeWebsiteLocales(settings);

  const segments = normalizedPathname.split('/').filter(Boolean);
  const firstSegment = segments[0]?.toLowerCase() || null;

  let pathnameWithoutLang = normalizedPathname;
  let hasLanguageSegment = false;
  let languageSegment: string | null = null;
  let resolvedLocale = defaultLocale;

  if (firstSegment) {
    const matchedLocale = pickLocaleForPublicSegment(
      firstSegment,
      supportedLocales,
      defaultLocale,
    );
    if (matchedLocale) {
      hasLanguageSegment = true;
      languageSegment = firstSegment;
      resolvedLocale = matchedLocale;
      const stripped = segments.slice(1).join('/');
      pathnameWithoutLang = stripped ? `/${stripped}` : '/';
    }
  }

  const canonicalPathname = canonicalizePublicPathname(pathnameWithoutLang);

  return {
    originalPathname: normalizedPathname,
    pathnameWithoutLang,
    canonicalPathname,
    hasLanguageSegment,
    languageSegment,
    resolvedLocale,
    resolvedLanguage: localeToLanguage(resolvedLocale),
    defaultLocale,
    supportedLocales,
  };
}

export function buildPublicLocalizedPath(
  pathname: string,
  resolvedLocale: string,
  defaultLocale: string,
): string {
  const normalizedPathname = normalizePathname(pathname);
  const normalizedResolved = normalizeLocale(resolvedLocale);
  const normalizedDefault = normalizeLocale(defaultLocale);

  const lang = localeToLanguage(normalizedResolved);
  const segment = PUBLIC_LOCALE_SEGMENT_BY_LOCALE[normalizedResolved] || lang;

  if (normalizedResolved === normalizedDefault || lang === localeToLanguage(normalizedDefault)) {
    return normalizedPathname;
  }
  if (normalizedPathname === '/') {
    return `/${segment}`;
  }

  if (
    normalizedPathname === `/${segment}` ||
    normalizedPathname.startsWith(`/${segment}/`)
  ) {
    return normalizedPathname;
  }

  return `/${segment}${normalizedPathname}`;
}

export function buildLegalPagePath(
  type: LegalPageType,
  resolvedLocale: string,
  defaultLocale: string,
): string {
  const publicPathname = getLegalPagePublicPath(
    type,
    localeToLanguage(resolvedLocale),
  );
  return buildPublicLocalizedPath(publicPathname, resolvedLocale, defaultLocale);
}

export function resolveLocaleFromRequestHeaders(
  getHeader: (name: string) => string | null,
  settings: WebsiteLocaleSettings,
): WebsiteLocaleSettings & {
  resolvedLocale: string;
  resolvedLanguage: string;
  languageSegment: string | null;
} {
  const normalized = normalizeWebsiteLocales(settings);
  const headerResolvedLocaleRaw = getHeader(PUBLIC_LOCALE_HEADER_NAMES.resolvedLocale);
  const headerDefaultLocaleRaw = getHeader(PUBLIC_LOCALE_HEADER_NAMES.defaultLocale);

  const headerResolvedLocale = normalizeLocale(headerResolvedLocaleRaw, normalized.defaultLocale);
  const defaultLocaleFromHeader = normalizeLocale(headerDefaultLocaleRaw, normalized.defaultLocale);

  const supportedLocales = [...normalized.supportedLocales];
  if (headerResolvedLocaleRaw && !supportedLocales.includes(headerResolvedLocale)) {
    supportedLocales.push(headerResolvedLocale);
  }
  if (headerDefaultLocaleRaw && !supportedLocales.includes(defaultLocaleFromHeader)) {
    supportedLocales.push(defaultLocaleFromHeader);
  }

  const defaultLocale = supportedLocales.includes(defaultLocaleFromHeader)
    ? defaultLocaleFromHeader
    : normalized.defaultLocale;
  const resolvedLocale = supportedLocales.includes(headerResolvedLocale)
    ? headerResolvedLocale
    : defaultLocale;

  const resolvedLanguage = localeToLanguage(
    getHeader(PUBLIC_LOCALE_HEADER_NAMES.lang) || resolvedLocale,
  );

  const languageSegment =
    resolvedLocale === defaultLocale
      ? null
      : PUBLIC_LOCALE_SEGMENT_BY_LOCALE[resolvedLocale] || resolvedLanguage;

  return {
    defaultLocale,
    supportedLocales,
    resolvedLocale,
    resolvedLanguage,
    languageSegment,
  };
}
