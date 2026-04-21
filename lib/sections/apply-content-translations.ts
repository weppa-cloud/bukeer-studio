/**
 * Content translation overlay helpers for SSR section rendering.
 *
 * When a visitor loads the site in a non-default locale (e.g. en-US),
 * `applyContentTranslations` shallow-merges the matching entry from
 * `section.content_translations` on top of `section.content` so translated
 * text fields take priority while non-translated fields (images, etc.) fall
 * through from the base content object.
 *
 * Fallback chain for locale resolution:
 *  1. Exact match — "en-US"
 *  2. Language prefix match — any key starting with "en-" (e.g. "en-GB")
 *  3. No match → original section unchanged
 */

import type { WebsiteSection } from '@bukeer/website-contract';

/**
 * Extracts the translated fields for a given locale from
 * `section.content_translations`, or returns null when none are found.
 */
export function getSectionLocaleOverlay(
  section: Pick<WebsiteSection, 'content_translations'>,
  locale: string,
): Record<string, unknown> | null {
  const translations = section.content_translations;
  if (!translations || typeof translations !== 'object' || Array.isArray(translations)) {
    return null;
  }

  // Exact locale match (e.g. "en-US")
  const exact = translations[locale];
  if (exact && typeof exact === 'object' && !Array.isArray(exact)) {
    return exact as Record<string, unknown>;
  }

  // Language-prefix fallback: "en" matches "en-GB", "en-AU", etc.
  const lang = locale.split('-')[0]?.toLowerCase();
  if (!lang) return null;
  for (const [key, value] of Object.entries(translations)) {
    if (!key.toLowerCase().startsWith(`${lang}-`)) continue;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
  }

  return null;
}

/**
 * Returns a new section with `content_translations[locale]` shallow-merged
 * over `section.content`. When the locale equals the default locale, or when
 * no overlay exists, the original section is returned unchanged (no copy).
 */
export function applySectionLocaleOverlay<T extends WebsiteSection>(
  section: T,
  locale: string,
  defaultLocale: string,
): T {
  if (!locale || locale === defaultLocale) return section;
  const overlay = getSectionLocaleOverlay(section, locale);
  if (!overlay || Object.keys(overlay).length === 0) return section;
  const baseContent =
    section.content && typeof section.content === 'object' && !Array.isArray(section.content)
      ? (section.content as Record<string, unknown>)
      : {};
  return {
    ...section,
    content: {
      ...baseContent,
      ...overlay,
    },
  };
}

/**
 * Convenience helper: maps an array of sections and applies the locale overlay
 * to each one. Use this at page level once `resolvedLocale` is known.
 */
export function applyContentTranslations<T extends WebsiteSection>(
  sections: T[],
  locale: string,
  defaultLocale: string,
): T[] {
  if (!locale || locale === defaultLocale) return sections;
  return sections.map((s) => applySectionLocaleOverlay(s, locale, defaultLocale));
}
