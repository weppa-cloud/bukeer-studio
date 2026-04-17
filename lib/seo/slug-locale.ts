/**
 * Interim slug/locale helper.
 *
 * Workaround for the pre-#129 state where `website_blog_posts`, `website_pages`,
 * and `destinations` enforce `UNIQUE(website_id, slug)` without a `locale` column.
 * Translated content that shares a semantic slug across locales collides under
 * this constraint, so we temporarily prefix non-default-locale slugs with a
 * normalized locale token (e.g. `en-us-best-time`).
 *
 * Once migration #129 adds a `locale` column, switch to the DB-native strategy
 * and use `scripts/seo/migrate-slug-prefix-to-locale-column.mjs` to backfill.
 */

export const DEFAULT_LOCALE = 'es-CO';

const LOCALE_ALLOWED = /^[a-zA-Z0-9_-]+$/;

function assertNonEmptyString(value: unknown, name: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${name} must be non-empty string`);
  }
}

function localeToPrefix(locale: string): string {
  if (typeof locale !== 'string' || locale.trim().length === 0) {
    throw new Error('locale must be non-empty string');
  }
  const trimmed = locale.trim();
  if (!LOCALE_ALLOWED.test(trimmed)) {
    throw new Error(
      `locale contains invalid characters (allowed: a-z, A-Z, 0-9, _, -): ${locale}`,
    );
  }
  return trimmed.toLowerCase().replace(/[^a-z0-9]/g, '-');
}

/**
 * Prefix a slug with locale code when locale differs from the website default.
 * Interim until seo_multi_locale migration adds `locale` column (#129).
 *
 * @example
 * prefixSlugForLocale('best-time', 'en-US', 'es-CO')       // 'en-us-best-time'
 * prefixSlugForLocale('mejor-epoca', 'es-CO', 'es-CO')     // 'mejor-epoca'
 * prefixSlugForLocale('en-us-best-time', 'en-US', 'es-CO') // 'en-us-best-time' (idempotent)
 */
export function prefixSlugForLocale(
  slug: string,
  locale: string,
  defaultLocale: string = DEFAULT_LOCALE,
): string {
  if (typeof slug !== 'string' || slug.trim().length === 0) {
    throw new Error('slug must be non-empty');
  }
  const prefix = localeToPrefix(locale); // validates locale
  const defaultPrefix = localeToPrefix(defaultLocale);
  const trimmedSlug = slug.trim();

  if (prefix === defaultPrefix) {
    return trimmedSlug;
  }

  const prefixed = `${prefix}-`;
  if (trimmedSlug.startsWith(prefixed)) {
    return trimmedSlug;
  }

  return `${prefix}-${trimmedSlug}`;
}

/**
 * Inverse: strip a known locale prefix from a slug.
 *
 * @example
 * stripLocalePrefix('en-us-best-time', 'en-US')  // 'best-time'
 * stripLocalePrefix('best-time', 'en-US')        // 'best-time' (no-op)
 * stripLocalePrefix('en-us-best-time', 'pt-BR')  // 'en-us-best-time' (mismatch)
 */
export function stripLocalePrefix(slug: string, locale: string): string {
  if (typeof slug !== 'string' || slug.trim().length === 0) {
    throw new Error('slug must be non-empty');
  }
  const prefix = localeToPrefix(locale); // validates locale
  const trimmedSlug = slug.trim();
  const needle = `${prefix}-`;
  if (trimmedSlug.startsWith(needle)) {
    return trimmedSlug.slice(needle.length);
  }
  return trimmedSlug;
}

/**
 * Detect locale from a prefixed slug given a list of candidate locales.
 * Returns the first candidate whose normalized prefix matches the slug, else null.
 *
 * @example
 * detectLocaleFromSlug('en-us-best-time', ['en-US', 'es-CO', 'pt-BR']) // 'en-US'
 * detectLocaleFromSlug('mejor-epoca', ['en-US', 'pt-BR'])              // null
 */
export function detectLocaleFromSlug(
  slug: string,
  candidates: string[],
): string | null {
  if (typeof slug !== 'string' || slug.trim().length === 0) {
    throw new Error('slug must be non-empty');
  }
  if (!Array.isArray(candidates)) {
    throw new Error('candidates must be an array of locale strings');
  }
  const trimmedSlug = slug.trim();
  // Prefer longest prefix match to avoid e.g. `en` accidentally matching `en-US`.
  const sorted = [...candidates]
    .filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
    .map((c) => ({ locale: c, prefix: localeToPrefix(c) }))
    .sort((a, b) => b.prefix.length - a.prefix.length);

  for (const { locale, prefix } of sorted) {
    if (trimmedSlug.startsWith(`${prefix}-`)) {
      return locale;
    }
  }
  return null;
}
