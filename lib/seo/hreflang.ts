/**
 * hreflang utilities for multi-language SEO
 * Generates alternate language links for international SEO
 */

import {
  DEFAULT_PUBLIC_LOCALE,
  buildPublicLocalizedPath,
  localeToLanguage,
  localeToOgLocale,
  normalizeLocale,
  normalizeWebsiteLocales,
} from '@/lib/seo/locale-routing';

export interface HreflangLink {
  rel: 'alternate';
  hreflang: string;
  href: string;
}

export interface LanguageConfig {
  code: string;
  region?: string;
  locale?: string;
  isDefault?: boolean;
}

export interface LocaleHreflangOptions {
  defaultLocale: string;
  supportedLocales: string[];
}

// Backward-compatible default set
export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  { code: 'es', region: 'CO', locale: 'es-CO', isDefault: true },
  { code: 'en', region: 'US', locale: 'en-US' },
  { code: 'pt', region: 'BR', locale: 'pt-BR' },
  { code: 'fr', region: 'FR', locale: 'fr-FR' },
];

function normalizePath(pathname: string): string {
  if (!pathname || pathname.trim().length === 0) return '/';
  const withSlash = pathname.startsWith('/') ? pathname : `/${pathname}`;
  if (withSlash !== '/' && withSlash.endsWith('/')) {
    return withSlash.slice(0, -1);
  }
  return withSlash;
}

function toLocaleString(language: LanguageConfig): string {
  if (language.locale) {
    return normalizeLocale(language.locale);
  }

  const code = (language.code || '').toLowerCase();
  const region = (language.region || '').toUpperCase();
  return normalizeLocale(region ? `${code}-${region}` : code);
}

function toHreflangTag(locale: string): string {
  const normalized = normalizeLocale(locale);
  const [language, region] = normalized.split('-');
  return region ? `${language}-${region}` : language;
}

function buildLanguageConfigs(options?: LocaleHreflangOptions): LanguageConfig[] {
  if (!options) {
    return SUPPORTED_LANGUAGES;
  }

  const normalized = normalizeWebsiteLocales(options);

  return normalized.supportedLocales.map((locale) => {
    const [language, region] = locale.split('-');
    return {
      code: language,
      region,
      locale,
      isDefault: locale === normalized.defaultLocale,
    };
  });
}

/**
 * Generate hreflang tags for a page
 */
export function generateHreflangLinks(
  baseUrl: string,
  pathname: string,
  availableLanguages: LanguageConfig[] = SUPPORTED_LANGUAGES,
): HreflangLink[] {
  const normalizedPath = normalizePath(pathname);
  const links: HreflangLink[] = [];

  const locales = availableLanguages.map(toLocaleString);
  const explicitDefault = availableLanguages.find((lang) => lang.isDefault);
  const defaultLocale = explicitDefault
    ? toLocaleString(explicitDefault)
    : locales[0] || DEFAULT_PUBLIC_LOCALE;

  const dedupedLocales = [...new Set([defaultLocale, ...locales])];

  dedupedLocales.forEach((locale) => {
    const hrefPath = buildPublicLocalizedPath(normalizedPath, locale, defaultLocale);
    links.push({
      rel: 'alternate',
      hreflang: toHreflangTag(locale),
      href: `${baseUrl}${hrefPath}`,
    });
  });

  links.push({
    rel: 'alternate',
    hreflang: 'x-default',
    href: `${baseUrl}${buildPublicLocalizedPath(normalizedPath, defaultLocale, defaultLocale)}`,
  });

  return links;
}

export function generateHreflangLinksForLocales(
  baseUrl: string,
  pathname: string,
  options: LocaleHreflangOptions,
): HreflangLink[] {
  return generateHreflangLinks(baseUrl, pathname, buildLanguageConfigs(options));
}

/**
 * Generate hreflang meta tags as HTML string
 * For use in <head> section
 */
export function generateHreflangMetaTags(
  baseUrl: string,
  pathname: string,
  availableLanguages?: LanguageConfig[],
): string {
  const links = generateHreflangLinks(baseUrl, pathname, availableLanguages);

  return links
    .map(
      (link) =>
        `<link rel="${link.rel}" hreflang="${link.hreflang}" href="${link.href}" />`,
    )
    .join('\n');
}

/**
 * Get language from pathname
 * @param pathname - Current path (e.g., /en/destinations or /destinos)
 * @returns Language code or null if default
 */
export function getLanguageFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/([a-z]{2})(\/|$)/i);
  if (match) {
    return match[1].toLowerCase();
  }
  return null;
}

/**
 * Generate canonical URL
 */
export function getCanonicalUrl(baseUrl: string, pathname: string): string {
  const cleanPath = normalizePath(pathname);
  return `${baseUrl}${cleanPath}`;
}

/**
 * Generate Open Graph locale tags
 */
export function generateOgLocale(
  currentLocaleOrLang: string = DEFAULT_PUBLIC_LOCALE,
  availableLanguages: LanguageConfig[] = SUPPORTED_LANGUAGES,
): { locale: string; alternateLocales: string[] } {
  const resolvedLocale = normalizeLocale(currentLocaleOrLang, DEFAULT_PUBLIC_LOCALE);
  const locale = localeToOgLocale(resolvedLocale);

  const alternateLocales = availableLanguages
    .map(toLocaleString)
    .filter((candidate) => candidate !== resolvedLocale)
    .map((candidate) => localeToOgLocale(candidate));

  return {
    locale,
    alternateLocales,
  };
}

/**
 * Translate URL slugs between languages
 * Useful for category pages like /destinos -> /destinations
 */
const SLUG_TRANSLATIONS: Record<string, Record<string, string>> = {
  destinos: { en: 'destinations', pt: 'destinos', fr: 'destinations' },
  hoteles: { en: 'hotels', pt: 'hoteis', fr: 'hotels' },
  actividades: { en: 'activities', pt: 'atividades', fr: 'activites' },
  traslados: { en: 'transfers', pt: 'transferencias', fr: 'transferts' },
  paquetes: { en: 'packages', pt: 'pacotes', fr: 'forfaits' },
  contacto: { en: 'contact', pt: 'contato', fr: 'contact' },
  nosotros: { en: 'about-us', pt: 'sobre-nos', fr: 'a-propos' },
  blog: { en: 'blog', pt: 'blog', fr: 'blog' },
};

/**
 * Translate a path segment to target language
 */
export function translatePathSegment(segment: string, targetLangOrLocale: string): string {
  const targetLang = localeToLanguage(targetLangOrLocale);
  if (targetLang === 'es') return segment;

  const translation = SLUG_TRANSLATIONS[segment]?.[targetLang];
  return translation || segment;
}

/**
 * Translate full path to target language
 */
export function translatePath(pathname: string, targetLangOrLocale: string): string {
  const targetLang = localeToLanguage(targetLangOrLocale);
  if (targetLang === 'es') return pathname;

  const segments = pathname.split('/').filter(Boolean);
  const translatedSegments = segments.map((seg) =>
    translatePathSegment(seg, targetLang),
  );

  return `/${translatedSegments.join('/')}`;
}
