import { headers } from 'next/headers';
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

  return {
    ...resolved,
    localizedPathname: buildPublicLocalizedPath(
      pathname,
      resolved.resolvedLocale,
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
