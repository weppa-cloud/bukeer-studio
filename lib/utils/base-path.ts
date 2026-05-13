/**
 * Determines the base path for navigation links based on rendering context.
 *
 * - Custom domain (miagencia.com) → relative navigation (basePath = '')
 * - Subdomain (miagencia.bukeer.com) → prefix with /site/[subdomain]
 * - With locale → prepend language prefix for non-default locales
 *
 * @param subdomain - The website's subdomain
 * @param isCustomDomain - Whether the site is accessed via a custom domain
 * @param locale - Optional locale (e.g. 'fr-FR', 'de-DE'). Non-default locales get language prefix
 * @param defaultLocale - Default locale for the site (e.g. 'es-CO'). Defaults to 'es-CO'
 * @returns The base path to prepend to navigation links
 */
export function getBasePath(
  subdomain: string,
  isCustomDomain: boolean = false,
  locale?: string,
  defaultLocale?: string,
): string {
  // Base path from subdomain/custom domain context
  const base = isCustomDomain ? '' : `/site/${subdomain}`;

  // No locale → return base as-is (backwards compatible)
  if (!locale) return base;

  // Normalize: check if this is a non-default locale
  const def = (defaultLocale || 'es-CO').toLowerCase();
  const loc = locale.toLowerCase();
  const defLang = def.split('-')[0];
  const locLang = loc.split('-')[0];

  // Default locale or same language → no prefix needed
  if (loc === def || locLang === defLang) return base;

  // Non-default locale → prepend language prefix
  return `${base}/${locLang}`;
}
