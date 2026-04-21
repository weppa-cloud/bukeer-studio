/**
 * Template Set Resolution — editorial-v1 plumbing (Wave 1.1)
 *
 * Template sets are opt-in alternate section component registries that render
 * the same DB-stored `WebsiteSection` rows with a different visual treatment.
 *
 * Resolution:
 *   website.theme.profile.metadata.templateSet → validated against
 *   KNOWN_TEMPLATE_SETS → returned, otherwise `null` (fall back to generic).
 *
 * Wave 1.1 only adds plumbing; editorial-v1 is declared but its section
 * registry is empty. Later waves populate it without restructuring callers.
 */

/**
 * Template sets known to the renderer. Add new sets here as they ship.
 * `as const` keeps the literal types for `TemplateSet`.
 */
export const KNOWN_TEMPLATE_SETS = ['editorial-v1'] as const;

/** Literal union of valid template-set identifiers. */
export type TemplateSet = (typeof KNOWN_TEMPLATE_SETS)[number];

/**
 * Narrow unknown input to a valid TemplateSet or null.
 * Exported so callers (tests, debug tools) can reuse it without re-reading
 * the website object.
 */
export function isKnownTemplateSet(value: unknown): value is TemplateSet {
  return (
    typeof value === 'string' &&
    (KNOWN_TEMPLATE_SETS as readonly string[]).includes(value)
  );
}

/**
 * Resolve the active template set for a website.
 *
 * Reads `website.theme.profile.metadata.templateSet` defensively — any step
 * of the path may be `null`/`undefined` and the caller may pass arbitrary
 * shapes (SSR fallback, partial data, legacy v2 themes, etc.).
 *
 * @param website Arbitrary website object (typically `WebsiteData`).
 * @returns A known `TemplateSet` literal, or `null` when missing/invalid.
 *
 * @example
 *   resolveTemplateSet({ theme: { profile: { metadata: { templateSet: 'editorial-v1' } } } })
 *   // => 'editorial-v1'
 *
 *   resolveTemplateSet({ theme: { profile: { metadata: {} } } })
 *   // => null
 *
 *   resolveTemplateSet(null)
 *   // => null
 */
export function resolveTemplateSet(website: unknown): TemplateSet | null {
  if (!website || typeof website !== 'object') return null;

  const theme = (website as { theme?: unknown }).theme;
  if (!theme || typeof theme !== 'object') return null;

  const profile = (theme as { profile?: unknown }).profile;
  if (!profile || typeof profile !== 'object') return null;

  const metadata = (profile as { metadata?: unknown }).metadata;
  if (!metadata || typeof metadata !== 'object') return null;

  const templateSet = (metadata as { templateSet?: unknown }).templateSet;
  return isKnownTemplateSet(templateSet) ? templateSet : null;
}
