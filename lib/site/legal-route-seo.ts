export interface LocalizedLegalLookupContext {
  localizedPathname: string;
  languageSegment: string | null;
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

  if (
    context.languageSegment &&
    parts[0]?.toLowerCase() === context.languageSegment.toLowerCase()
  ) {
    parts.shift();
  }

  return parts.join('/');
}
