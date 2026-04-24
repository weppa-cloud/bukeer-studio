/**
 * Utility to identify landing pages that require a minimalist "Ads/Meta" layout.
 * These pages hide navigation menus and footer links to prevent user "leaks".
 */

export const LANDING_PAGE_SLUGS = [
  'paquetes-a-colombia-todo-incluido-en-9-dias',
  'agencia-de-viajes-a-colombia-para-mexicanos',
  'agencia-de-viajes-a-colombia-para-espanoles',
  'los-mejores-paquetes-de-viajes-a-colombia',
];

/**
 * Checks if a given pathname (or slug) belongs to the landing page protocol.
 * Handles both full pathnames (e.g., /en/slug) and raw slugs.
 */
export function isLandingPage(pathname: string | null | undefined): boolean {
  if (!pathname) return false;

  // Normalize: remove leading/trailing slashes and locale segments (e.g., /en/, /es/)
  const normalized = pathname
    .replace(/^\/+|\/+$/g, '') // Remove leading/trailing slashes
    .replace(/^[a-z]{2}\//, ''); // Remove locale segment if present (e.g., "en/slug" -> "slug")

  const lastSegment = normalized.split('/').filter(Boolean).at(-1) || normalized;

  return LANDING_PAGE_SLUGS.includes(normalized) || LANDING_PAGE_SLUGS.includes(lastSegment);
}
