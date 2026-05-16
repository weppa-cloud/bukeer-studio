import { resolveLocaleFromPublicPath, normalizeLocale } from '@/lib/seo/locale-routing';
import { getSystemFallbackPage } from '@/lib/site/system-fallback-pages';
import type { WebsiteData } from '@/lib/supabase/get-website';
import type { WebsitePage } from '@/lib/supabase/get-pages';

type PageTranslationRef = Pick<WebsitePage, 'id' | 'slug' | 'locale'>;

export interface ResolvePublicPageForRouteOptions {
  website: WebsiteData;
  publicSlugPath: string;
  loadPageBySlug: (subdomain: string, slug: string) => Promise<WebsitePage | null>;
  loadPageBySlugForLocale?: (
    websiteId: string,
    slug: string,
    locale: string,
  ) => Promise<WebsitePage | null>;
  loadPageByTranslationGroup?: (
    websiteId: string,
    translationGroupId: string,
    locale: string,
  ) => Promise<PageTranslationRef | null>;
}

export interface ResolvedPublicPageForRoute {
  slugPath: string;
  page: WebsitePage | null;
  locale: ReturnType<typeof resolveLocaleFromPublicPath>;
}

function normalizeSlugPath(value: string): string {
  return value.trim().replace(/^\/+|\/+$/g, '');
}

function getWebsiteLocaleSettings(website: WebsiteData) {
  const explicitLocales = website.supported_locales ?? [];
  const supportedLocales =
    website.subdomain?.toLowerCase() === 'colombiatours'
      ? ['en-US', 'pt-BR', 'fr-FR', 'de-DE'].reduce(
          (acc, locale) => acc.includes(locale) ? acc : [...acc, locale],
          [...explicitLocales],
        )
      : explicitLocales;

  return {
    defaultLocale: website.default_locale ?? website.content?.locale ?? 'es-CO',
    supportedLocales,
  };
}

function isNonDefaultLocale(resolvedLocale: string, defaultLocale: string): boolean {
  return normalizeLocale(resolvedLocale) !== normalizeLocale(defaultLocale);
}

async function resolveTranslatedPageByGroup(
  options: ResolvePublicPageForRouteOptions,
  page: WebsitePage,
  locale: string,
): Promise<WebsitePage | null> {
  const translationGroupId = page.translation_group_id;
  if (!options.website.id || !translationGroupId || !options.loadPageByTranslationGroup) {
    return null;
  }

  const translatedRef = await options.loadPageByTranslationGroup(
    options.website.id,
    translationGroupId,
    locale,
  );
  if (!translatedRef) return null;

  if (translatedRef.id === page.id) return page;

  if (options.loadPageBySlugForLocale) {
    const translatedBySlugLocale = await options.loadPageBySlugForLocale(
      options.website.id,
      translatedRef.slug,
      locale,
    );
    if (translatedBySlugLocale) return translatedBySlugLocale;
  }

  return options.loadPageBySlug(options.website.subdomain, translatedRef.slug);
}

export async function resolvePublicPageForRoute(
  options: ResolvePublicPageForRouteOptions,
): Promise<ResolvedPublicPageForRoute> {
  const publicPath = `/${normalizeSlugPath(options.publicSlugPath)}`;
  const locale = resolveLocaleFromPublicPath(
    publicPath,
    getWebsiteLocaleSettings(options.website),
  );
  const slugPath = normalizeSlugPath(
    locale.canonicalPathname === '/' ? 'home' : locale.canonicalPathname,
  );

  const localizedSameSlugPage =
    isNonDefaultLocale(locale.resolvedLocale, locale.defaultLocale) &&
    options.loadPageBySlugForLocale &&
    options.website.id
      ? await options.loadPageBySlugForLocale(
          options.website.id,
          slugPath,
          locale.resolvedLocale,
        )
      : null;

  let page = localizedSameSlugPage ?? (await options.loadPageBySlug(options.website.subdomain, slugPath));

  if (
    page &&
    isNonDefaultLocale(locale.resolvedLocale, locale.defaultLocale) &&
    normalizeLocale(page.locale ?? locale.defaultLocale) !== normalizeLocale(locale.resolvedLocale)
  ) {
    page = await resolveTranslatedPageByGroup(options, page, locale.resolvedLocale);
  }

  if (!page) {
    page = getSystemFallbackPage(slugPath, options.website, locale.resolvedLocale);
  }

  return { slugPath, page, locale };
}
