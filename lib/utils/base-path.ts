/**
 * Determines the base path for navigation links based on rendering context.
 *
 * - Custom domain (miagencia.com) → relative navigation (basePath = '')
 * - Subdomain (miagencia.bukeer.com) → prefix with /site/[subdomain]
 *
 * @param subdomain - The website's subdomain
 * @param isCustomDomain - Whether the site is accessed via a custom domain
 * @returns The base path to prepend to navigation links
 */
export function getBasePath(subdomain: string, isCustomDomain: boolean = false): string {
  // Custom domain → navigation relative to root
  if (isCustomDomain) return '';
  // Subdomain → prefix /site/[subdomain]
  return `/site/${subdomain}`;
}
