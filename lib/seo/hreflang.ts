/**
 * hreflang utilities for multi-language SEO
 * Generates alternate language links for international SEO
 */

export interface HreflangLink {
  rel: 'alternate';
  hreflang: string;
  href: string;
}

export interface LanguageConfig {
  code: string;        // ISO 639-1 code (es, en, pt, fr)
  region?: string;     // ISO 3166-1 code (ES, MX, CO, US)
  isDefault?: boolean;
}

// Supported languages for travel agency websites
export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  { code: 'es', isDefault: true },
  { code: 'en' },
  { code: 'pt' },
  { code: 'fr' },
];

/**
 * Generate hreflang tags for a page
 * @param baseUrl - The base URL of the website (e.g., https://miagencia.bukeer.com)
 * @param pathname - The current page path (e.g., /destinos/cartagena)
 * @param availableLanguages - Languages available for this page
 * @returns Array of hreflang link objects
 */
export function generateHreflangLinks(
  baseUrl: string,
  pathname: string,
  availableLanguages: LanguageConfig[] = SUPPORTED_LANGUAGES
): HreflangLink[] {
  const links: HreflangLink[] = [];

  availableLanguages.forEach((lang) => {
    const hreflang = lang.region
      ? `${lang.code}-${lang.region}`
      : lang.code;

    // For default language, path is without prefix
    // For other languages, add language prefix
    const href = lang.isDefault
      ? `${baseUrl}${pathname}`
      : `${baseUrl}/${lang.code}${pathname}`;

    links.push({
      rel: 'alternate',
      hreflang,
      href,
    });
  });

  // Add x-default for language selection page
  const defaultLang = availableLanguages.find((l) => l.isDefault);
  if (defaultLang) {
    links.push({
      rel: 'alternate',
      hreflang: 'x-default',
      href: `${baseUrl}${pathname}`,
    });
  }

  return links;
}

/**
 * Generate hreflang meta tags as HTML string
 * For use in <head> section
 */
export function generateHreflangMetaTags(
  baseUrl: string,
  pathname: string,
  availableLanguages?: LanguageConfig[]
): string {
  const links = generateHreflangLinks(baseUrl, pathname, availableLanguages);

  return links
    .map(
      (link) =>
        `<link rel="${link.rel}" hreflang="${link.hreflang}" href="${link.href}" />`
    )
    .join('\n');
}

/**
 * Get language from pathname
 * @param pathname - Current path (e.g., /en/destinations or /destinos)
 * @returns Language code or null if default
 */
export function getLanguageFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/([a-z]{2})(\/|$)/);
  if (match) {
    const lang = match[1];
    if (SUPPORTED_LANGUAGES.some((l) => l.code === lang && !l.isDefault)) {
      return lang;
    }
  }
  return null;
}

/**
 * Generate canonical URL
 * Removes language prefix for default language
 */
export function getCanonicalUrl(baseUrl: string, pathname: string): string {
  const lang = getLanguageFromPath(pathname);

  // If it's a non-default language path, keep as is
  if (lang) {
    return `${baseUrl}${pathname}`;
  }

  // For default language, remove any trailing slash
  const cleanPath = pathname.endsWith('/') && pathname !== '/'
    ? pathname.slice(0, -1)
    : pathname;

  return `${baseUrl}${cleanPath}`;
}

/**
 * Generate Open Graph locale tags
 */
export function generateOgLocale(
  currentLang: string = 'es',
  availableLanguages: LanguageConfig[] = SUPPORTED_LANGUAGES
): { locale: string; alternateLocales: string[] } {
  const localeMap: Record<string, string> = {
    es: 'es_ES',
    en: 'en_US',
    pt: 'pt_BR',
    fr: 'fr_FR',
  };

  const locale = localeMap[currentLang] || 'es_ES';
  const alternateLocales = availableLanguages
    .filter((l) => l.code !== currentLang)
    .map((l) => localeMap[l.code] || `${l.code}_${l.code.toUpperCase()}`);

  return { locale, alternateLocales };
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
export function translatePathSegment(
  segment: string,
  targetLang: string
): string {
  if (targetLang === 'es') return segment; // Spanish is default

  const translation = SLUG_TRANSLATIONS[segment]?.[targetLang];
  return translation || segment;
}

/**
 * Translate full path to target language
 */
export function translatePath(pathname: string, targetLang: string): string {
  if (targetLang === 'es') return pathname;

  const segments = pathname.split('/').filter(Boolean);
  const translatedSegments = segments.map((seg) =>
    translatePathSegment(seg, targetLang)
  );

  return '/' + translatedSegments.join('/');
}
