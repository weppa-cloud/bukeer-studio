import { headers } from 'next/headers';
import { z } from 'zod';
import {
  buildPublicLocalizedPath,
  extractWebsiteLocaleSettings,
  resolveLocaleFromRequestHeaders,
} from '@/lib/seo/locale-routing';
import { generateHreflangLinksForLocales } from '@/lib/seo/hreflang';

export interface PublicMetadataLocaleContext {
  defaultLocale: string;
  supportedLocales: string[];
  resolvedLocale: string;
  resolvedLanguage: string;
  languageSegment: string | null;
  localizedPathname: string;
}

/**
 * Zod guard for BCP-47-ish locales emitted on our public surface.
 *
 * Middleware threads `x-public-resolved-locale` from the request; we validate
 * the shape before it reaches JSON-LD, canonicals or hreflang so a malformed
 * header can never become an `inLanguage` value search engines treat as
 * authoritative. Accepted shapes: `xx` or `xx-XX` (lowercase language,
 * uppercase region — matching `normalizeLocaleToken` output).
 */
export const publicLocaleSchema = z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/);

export function isValidPublicLocale(value: unknown): value is string {
  return publicLocaleSchema.safeParse(value).success;
}

export async function resolvePublicMetadataLocale(
  website: unknown,
  pathname: string,
): Promise<PublicMetadataLocaleContext> {
  const requestHeaders = await headers();
  const localeSettings = extractWebsiteLocaleSettings(website);
  const resolved = resolveLocaleFromRequestHeaders(
    (name) => requestHeaders.get(name),
    localeSettings,
  );

  // Final guard at the boundary: if `resolveLocaleFromRequestHeaders` ever
  // leaks a non-conforming token (e.g. unexpected tooling/middleware rewrite),
  // fall back to the tenant default rather than polluting downstream SEO.
  const resolvedLocale = isValidPublicLocale(resolved.resolvedLocale)
    ? resolved.resolvedLocale
    : resolved.defaultLocale;

  return {
    ...resolved,
    resolvedLocale,
    localizedPathname: buildPublicLocalizedPath(
      pathname,
      resolvedLocale,
      resolved.defaultLocale,
    ),
  };
}

export function hreflangLinksToLanguageRecord(
  links: Array<{ hreflang: string; href: string }>,
): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const link of links) {
    languages[link.hreflang] = link.href;
  }
  return languages;
}

export function buildLocaleAwareAlternateLanguages(
  baseUrl: string,
  pathname: string,
  localeContext: Pick<PublicMetadataLocaleContext, 'defaultLocale' | 'supportedLocales'>,
  options?: {
    translatedLocales?: string[];
  },
): Record<string, string> {
  return hreflangLinksToLanguageRecord(
    generateHreflangLinksForLocales(baseUrl, pathname, {
      defaultLocale: localeContext.defaultLocale,
      supportedLocales: localeContext.supportedLocales,
    }, options?.translatedLocales),
  );
}
