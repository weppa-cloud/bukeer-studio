import { buildPublicLocalizedPath } from "@/lib/seo/locale-routing";

export interface BlogPostAlternateRoute {
  locale: string | null | undefined;
  slug: string | null | undefined;
}

export function buildBlogPostAlternateLanguages(
  baseUrl: string,
  defaultLocale: string,
  routes: BlogPostAlternateRoute[],
): Record<string, string> {
  const languages: Record<string, string> = {};
  const normalizedDefaultLocale = defaultLocale || "es-CO";

  for (const route of routes) {
    const locale = route.locale?.trim();
    const slug = route.slug?.trim();
    if (!locale || !slug) continue;

    languages[locale] = `${baseUrl}${buildPublicLocalizedPath(
      `/blog/${slug}`,
      locale,
      normalizedDefaultLocale,
    )}`;
  }

  const defaultHref = languages[normalizedDefaultLocale];
  if (defaultHref) {
    languages["x-default"] = defaultHref;
  }

  return languages;
}
