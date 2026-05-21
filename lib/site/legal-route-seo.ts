import { localeToPublicSegment } from '@/lib/seo/locale-routing';

export interface LocalizedLegalLookupContext {
  localizedPathname: string;
  languageSegment: string | null;
  resolvedLocale?: string;
  defaultLocale?: string;
}

/**
 * Convert the public localized legal pathname produced for canonicals
 * (`/fr/conditions-generales`) back to the CMS slug stored in website_pages
 * (`conditions-generales`). The CMS slug never includes the public locale
 * prefix; using the whole localized pathname causes localized legal rows to be
 * missed and falls back to noindex metadata.
 */
export function getLocalizedLegalLookupSlug(
  context: LocalizedLegalLookupContext,
): string {
  const parts = context.localizedPathname
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .filter(Boolean);

  const segmentFromLocale = context.resolvedLocale
    ? localeToPublicSegment(context.resolvedLocale, context.defaultLocale)
    : null;
  const publicLocaleSegment = context.languageSegment || segmentFromLocale;

  if (
    publicLocaleSegment &&
    parts[0]?.toLowerCase() === publicLocaleSegment.toLowerCase()
  ) {
    parts.shift();
  }

  return parts.join('/');
}
