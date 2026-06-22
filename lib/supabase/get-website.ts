import { createClient } from "@supabase/supabase-js";
import type {
  WebsiteData,
  AnalyticsConfig,
  WebsiteContent,
  FeaturedProducts,
  AccountCurrencyRate,
  WebsiteSection,
  BlogPost,
  BlogCategory,
  ThemeV3,
} from "@bukeer/website-contract";
import {
  resolveThemeDesignerV1Flag,
  selectPublicThemeForDesignerFlag,
} from "@/lib/features/theme-designer-v1";

// Re-export types from contract
export type {
  WebsiteData,
  AnalyticsConfig,
  WebsiteContent,
  FeaturedProducts,
  WebsiteSection,
  BlogPost,
  BlogCategory,
  ThemeV3,
  AccountCurrencyRate,
};

// Create a Supabase client for server-side data fetching
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const WEBSITE_CACHE_TTL_MS = Number(
  process.env.WEBSITE_CACHE_TTL_MS || 5 * 60 * 1000,
);
const THEME_RESOLUTION_CACHE_TTL_MS = Number(
  process.env.THEME_RESOLUTION_CACHE_TTL_MS || 2 * 60 * 1000,
);
const BLOG_LIST_CACHE_TTL_MS = Number(
  process.env.BLOG_LIST_CACHE_TTL_MS || 2 * 60 * 1000,
);
const websiteBySubdomainCache = new Map<
  string,
  { value: WebsiteData; expiresAt: number }
>();
const themeResolutionCache = new Map<
  string,
  { value: WebsiteWithEffectiveTheme; expiresAt: number }
>();
const blogPostsCache = new Map<
  string,
  { value: { posts: BlogPost[]; total: number }; expiresAt: number }
>();
const websiteBySubdomainInflight = new Map<
  string,
  Promise<WebsiteData | null>
>();
const blogPostsInflight = new Map<
  string,
  Promise<{ posts: BlogPost[]; total: number }>
>();

type WebsiteWithEffectiveTheme = WebsiteData & {
  effective_theme?: ThemeV3;
  effective_theme_source?:
    | "website_theme_flag_on"
    | "snapshot_fallback"
    | "website_theme_default";
};

export function invalidateWebsiteDataCache(input: {
  subdomain?: string | null;
  websiteId?: string | null;
}): void {
  const subdomain = input.subdomain?.trim().toLowerCase();
  const websiteId = input.websiteId?.trim();

  if (subdomain) {
    websiteBySubdomainCache.delete(subdomain);
    websiteBySubdomainInflight.delete(subdomain);
  }

  for (const key of themeResolutionCache.keys()) {
    if (!websiteId || key.startsWith(`${websiteId}:`)) {
      themeResolutionCache.delete(key);
    }
  }

  for (const key of blogPostsCache.keys()) {
    if (!websiteId || key.includes(`"websiteId":"${websiteId}"`)) {
      blogPostsCache.delete(key);
    }
  }

  for (const key of blogPostsInflight.keys()) {
    if (!websiteId || key.includes(`"websiteId":"${websiteId}"`)) {
      blogPostsInflight.delete(key);
    }
  }
}

interface AccountCurrencyColumns {
  primary_currency: string | null;
  enabled_currencies: string[] | null;
  currency: AccountCurrencyRate[] | null;
}

interface WebsiteLocaleColumns {
  default_locale: string | null;
  supported_locales: string[] | null;
}

interface WebsiteAnalyticsColumns {
  analytics: AnalyticsConfig | null;
}

function normalizeLocaleList(locales: unknown): string[] | undefined {
  if (!Array.isArray(locales)) return undefined;
  const normalized = locales
    .filter(
      (locale): locale is string =>
        typeof locale === "string" && locale.trim().length > 0,
    )
    .map((locale) => locale.trim());
  return normalized.length > 0 ? Array.from(new Set(normalized)) : undefined;
}

async function hydrateWebsiteLocaleColumns(
  website: WebsiteData,
  subdomain: string,
): Promise<WebsiteData> {
  const hasDefaultLocale =
    typeof website.default_locale === "string" &&
    website.default_locale.trim().length > 0;
  const hasSupportedLocales =
    Array.isArray(website.supported_locales) &&
    website.supported_locales.length > 0;
  if (hasDefaultLocale && hasSupportedLocales) {
    return website;
  }

  let query = supabase
    .from("websites")
    .select("default_locale, supported_locales")
    .limit(1);

  if (typeof website.id === "string" && website.id.trim().length > 0) {
    query = query.eq("id", website.id);
  } else {
    query = query.eq("subdomain", subdomain);
  }

  const { data, error } = await query.maybeSingle<WebsiteLocaleColumns>();
  if (error || !data) {
    return website;
  }

  const defaultLocale =
    typeof data.default_locale === "string" &&
    data.default_locale.trim().length > 0
      ? data.default_locale.trim()
      : website.default_locale;
  const supportedLocales =
    normalizeLocaleList(data.supported_locales) ??
    normalizeLocaleList(website.supported_locales);

  if (!defaultLocale && !supportedLocales) {
    return website;
  }

  return {
    ...website,
    default_locale: defaultLocale,
    supported_locales: supportedLocales,
  };
}

async function hydrateWebsiteAnalyticsColumns(
  website: WebsiteData,
  subdomain: string,
): Promise<WebsiteData> {
  if (website.analytics && Object.keys(website.analytics).length > 0) {
    return website;
  }

  let query = supabase.from("websites").select("analytics").limit(1);

  if (typeof website.id === "string" && website.id.trim().length > 0) {
    query = query.eq("id", website.id);
  } else {
    query = query.eq("subdomain", subdomain);
  }

  const { data, error } = await query.maybeSingle<WebsiteAnalyticsColumns>();
  if (error || !data?.analytics) {
    return website;
  }

  return {
    ...website,
    analytics: data.analytics,
  };
}

async function getAccountCurrencyColumns(
  accountId: string,
): Promise<AccountCurrencyColumns | null> {
  // Column-scoped public read (no PII). Uses the SECURITY DEFINER RPC instead of
  // a raw anon SELECT on `accounts`, so the broad anon RLS policy can be dropped.
  const { data, error } = await supabase
    .rpc("get_public_account_currency", { p_account_id: accountId })
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const primaryCurrency =
    typeof data.primary_currency === "string"
      ? data.primary_currency.toUpperCase()
      : null;
  const enabledCurrencies = Array.isArray(data.enabled_currencies)
    ? data.enabled_currencies
        .filter(
          (item): item is string =>
            typeof item === "string" && item.trim().length > 0,
        )
        .map((item) => item.toUpperCase())
    : null;
  const currencyRates: AccountCurrencyRate[] | null = Array.isArray(
    data.currency,
  )
    ? data.currency.reduce<AccountCurrencyRate[]>((acc, entry) => {
        if (!entry || typeof entry !== "object") return acc;
        const name =
          typeof entry.name === "string" ? entry.name.toUpperCase() : null;
        const rawRate =
          typeof entry.rate === "number" ? entry.rate : Number(entry.rate);
        if (!name || !Number.isFinite(rawRate) || rawRate <= 0) return acc;
        const type = typeof entry.type === "string" ? entry.type : null;
        if (type) {
          acc.push({ name, rate: rawRate, type });
        } else {
          acc.push({ name, rate: rawRate });
        }
        return acc;
      }, [])
    : null;

  return {
    primary_currency: primaryCurrency,
    enabled_currencies: enabledCurrencies,
    currency: currencyRates,
  };
}

async function applyThemeDesignerV1Resolution(
  website: WebsiteData,
): Promise<WebsiteWithEffectiveTheme> {
  const cacheKey = `${website.id}:${website.account_id ?? "no-account"}:${JSON.stringify(website.theme ?? {})}`;
  const cached = themeResolutionCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  if (!website.account_id) {
    return {
      ...website,
      effective_theme: website.theme,
      effective_theme_source: "website_theme_default",
    };
  }

  const flagResolution = await resolveThemeDesignerV1Flag(
    supabase,
    website.account_id,
    website.id,
  );

  let snapshotTheme: unknown = null;
  if (!flagResolution.enabled) {
    const { data, error } = await supabase.rpc(
      "get_latest_pilot_theme_snapshot",
      {
        p_website_id: website.id,
      },
    );
    if (error) {
      console.error(
        "[getWebsiteBySubdomain] get_latest_pilot_theme_snapshot error:",
        error,
      );
    } else {
      snapshotTheme = data;
    }
  }

  const selected = selectPublicThemeForDesignerFlag({
    currentTheme: website.theme,
    snapshotTheme,
    flagResolution,
  });

  const resolved = {
    ...website,
    theme: selected.theme,
    effective_theme: selected.theme,
    effective_theme_source: selected.source,
  };
  themeResolutionCache.set(cacheKey, {
    value: resolved,
    expiresAt: Date.now() + THEME_RESOLUTION_CACHE_TTL_MS,
  });
  return resolved;
}

/**
 * Get website data by subdomain
 * Uses RPC function for optimized query
 */
export async function getWebsiteBySubdomain(
  subdomain: string,
): Promise<WebsiteData | null> {
  try {
    const cacheKey = subdomain.toLowerCase();
    const cached = websiteBySubdomainCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const inflight = websiteBySubdomainInflight.get(cacheKey);
    if (inflight) return inflight;

    const load = (async () => {
      const { data, error } = await supabase.rpc("get_website_by_subdomain", {
        p_subdomain: subdomain,
      });

      if (error) {
        console.error("[getWebsiteBySubdomain] Error:", error);
        return null;
      }

      if (!data) return null;

      let website = await hydrateWebsiteLocaleColumns(
        data as WebsiteData,
        subdomain,
      );
      website = await hydrateWebsiteAnalyticsColumns(website, subdomain);
      const featuredProducts = website.featured_products || {
        destinations: [],
        hotels: [],
        activities: [],
        transfers: [],
        packages: [],
      };

      if (website.account_id && website.content.account) {
        const accountCurrencyColumns = await getAccountCurrencyColumns(
          website.account_id,
        );
        if (accountCurrencyColumns) {
          website.content = {
            ...website.content,
            account: {
              ...website.content.account,
              ...accountCurrencyColumns,
            },
          };
        }
      }

      const hydratedWebsite = {
        ...website,
        featured_products: {
          destinations: featuredProducts.destinations || [],
          hotels: featuredProducts.hotels || [],
          activities: featuredProducts.activities || [],
          transfers: featuredProducts.transfers || [],
          packages: featuredProducts.packages || [],
        },
      };
      const resolvedWebsite =
        await applyThemeDesignerV1Resolution(hydratedWebsite);

      websiteBySubdomainCache.set(cacheKey, {
        value: resolvedWebsite,
        expiresAt: Date.now() + WEBSITE_CACHE_TTL_MS,
      });

      return resolvedWebsite;
    })();

    websiteBySubdomainInflight.set(cacheKey, load);
    try {
      return await load;
    } finally {
      websiteBySubdomainInflight.delete(cacheKey);
    }
  } catch (e) {
    console.error("[getWebsiteBySubdomain] Exception:", e);
    return null;
  }
}

/**
 * Get blog posts for a website with pagination
 */
export async function getBlogPosts(
  websiteId: string,
  options: {
    limit?: number;
    offset?: number;
    categorySlug?: string;
    locale?: string;
  } = {},
): Promise<{ posts: BlogPost[]; total: number }> {
  try {
    const locale =
      typeof options.locale === "string" ? options.locale.trim() : "";
    const limit = options.limit || 10;
    const offset = options.offset || 0;
    const cacheKey = JSON.stringify({
      websiteId,
      limit,
      offset,
      categorySlug: options.categorySlug || null,
      locale: locale || null,
    });
    const cached = blogPostsCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    const inflight = blogPostsInflight.get(cacheKey);
    if (inflight) return inflight;

    const load = (async () => {
      const localeCandidates: string[] = [];

      if (locale) {
        localeCandidates.push(locale);
        const lang = locale.split("-")[0]?.toLowerCase();
        if (lang && lang !== locale) localeCandidates.push(lang);

        // Legacy blog rows may still store ISO-639 locales (`es`, `en`, etc.).
        if (locale === "es") localeCandidates.push("es-CO");
        if (locale === "en") localeCandidates.push("en-US");
        if (locale === "pt") localeCandidates.push("pt-BR");
        if (locale === "fr") localeCandidates.push("fr-FR");
        if (locale === "de") localeCandidates.push("de-DE");
        if (locale === "es-CO") localeCandidates.push("es");
        if (locale === "en-US") localeCandidates.push("en");
        if (locale === "pt-BR") localeCandidates.push("pt");
        if (locale === "fr-FR") localeCandidates.push("fr");
        if (locale === "de-DE") localeCandidates.push("de");
      } else {
        localeCandidates.push("");
      }

      const uniqueLocales = [...new Set(localeCandidates.filter(Boolean))];
      // Locale-aware listing: include legacy + canonical locale variants of the
      // same language (e.g., `es` + `es-CO`) using the public RPC path to avoid
      // direct-table RLS differences in runtime.
      if (uniqueLocales.length > 1) {
        const perLocaleWindow = Math.max(limit + offset, limit);
        const mergedById = new Map<string, BlogPost>();
        let atLeastOneSuccess = false;
        let totalAcrossLocales = 0;

        for (const localeCandidate of uniqueLocales) {
          const { data, error } = await supabase.rpc(
            "get_website_blog_post_summaries",
            {
              p_website_id: websiteId,
              p_limit: perLocaleWindow,
              p_offset: 0,
              p_category_slug: options.categorySlug || null,
              p_tag_slug: null,
              p_locale: localeCandidate || null,
              p_search: null,
            },
          );

          if (error) continue;
          atLeastOneSuccess = true;
          const localePosts = (data?.posts || []) as BlogPost[];
          totalAcrossLocales += Number(data?.total || 0);
          for (const post of localePosts) {
            if (!post?.id) continue;
            if (!mergedById.has(post.id)) mergedById.set(post.id, post);
          }
        }

        if (atLeastOneSuccess) {
          const merged = Array.from(mergedById.values()).sort((a, b) => {
            const publishedA = a.published_at
              ? new Date(a.published_at).getTime()
              : 0;
            const publishedB = b.published_at
              ? new Date(b.published_at).getTime()
              : 0;
            if (publishedA !== publishedB) return publishedB - publishedA;

            const updatedA = a.updated_at
              ? new Date(a.updated_at).getTime()
              : 0;
            const updatedB = b.updated_at
              ? new Date(b.updated_at).getTime()
              : 0;
            return updatedB - updatedA;
          });

          const paginated = merged.slice(offset, offset + limit);
          const total = Math.max(totalAcrossLocales, mergedById.size);
          const result = {
            posts: paginated,
            total,
          };
          blogPostsCache.set(cacheKey, {
            value: result,
            expiresAt: Date.now() + BLOG_LIST_CACHE_TTL_MS,
          });
          return result;
        }
      }

      const { data, error } = await supabase.rpc(
        "get_website_blog_post_summaries",
        {
          p_website_id: websiteId,
          p_limit: limit,
          p_offset: offset,
          p_category_slug: options.categorySlug || null,
          p_tag_slug: null,
          p_locale: locale || null,
          p_search: null,
        },
      );

      if (error) {
        console.error("[getBlogPosts] Error:", error);
        return { posts: [], total: 0 };
      }

      const result = {
        posts: data?.posts || [],
        total: data?.total || 0,
      };
      blogPostsCache.set(cacheKey, {
        value: result,
        expiresAt: Date.now() + BLOG_LIST_CACHE_TTL_MS,
      });
      return result;
    })();

    blogPostsInflight.set(cacheKey, load);
    try {
      return await load;
    } finally {
      blogPostsInflight.delete(cacheKey);
    }
  } catch (e) {
    console.error("[getBlogPosts] Exception:", e);
    return { posts: [], total: 0 };
  }
}

export async function getPublishedBlogPostSitemapRows(
  websiteId: string,
): Promise<
  Array<{
    id: string;
    slug: string;
    locale: string | null;
    translation_group_id: string | null;
    published_at: string | null;
    updated_at: string | null;
    robots_noindex: boolean | null;
  }>
> {
  try {
    const rows: Array<{
      id: string;
      slug: string;
      locale: string | null;
      translation_group_id: string | null;
      published_at: string | null;
      updated_at: string | null;
      robots_noindex: boolean | null;
    }> = [];
    const pageSize = 1000;

    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabase
        .from("website_blog_posts")
        .select(
          "id, slug, locale, translation_group_id, published_at, updated_at, robots_noindex",
        )
        .eq("website_id", websiteId)
        .eq("status", "published")
        .is("deleted_at", null)
        .range(from, from + pageSize - 1);

      if (error) {
        console.error("[getPublishedBlogPostSitemapRows] Error:", error);
        return [];
      }

      rows.push(...(data ?? []));
      if (!data || data.length < pageSize) break;
    }

    return rows;
  } catch (e) {
    console.error("[getPublishedBlogPostSitemapRows] Exception:", e);
    return [];
  }
}

/**
 * Get a single blog post by slug
 */
export async function getBlogPostBySlug(
  websiteId: string,
  slug: string,
  locale?: string,
): Promise<BlogPost | null> {
  try {
    const normalizedSlug = typeof slug === "string" ? slug.trim() : "";
    if (!normalizedSlug) return null;

    // Fast path: direct row lookup (without relation join to reduce chances of
    // policy/join-induced query failures in public runtime).
    let query = supabase
      .from("website_blog_posts")
      .select("*")
      .eq("website_id", websiteId)
      .eq("slug", normalizedSlug)
      .eq("status", "published")
      .is("deleted_at", null);

    if (locale) query = query.eq("locale", locale);

    const { data, error } = await query
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      const post = data as BlogPost & { category_id?: string | null };
      if (post.category_id) {
        const { data: category } = await supabase
          .from("website_blog_categories")
          .select("*")
          .eq("id", post.category_id)
          .maybeSingle();
        if (category) {
          post.category = category;
        }
      }
      return post as BlogPost;
    }

    // Fallback path: RPC locale-window lookup (legacy `es/en` + canonical
    // `es-CO/en-US`) to avoid hard failures when direct query errors.
    const normalizedLocale = typeof locale === "string" ? locale.trim() : "";
    const uniqueLocales = normalizedLocale
      ? getBlogLocaleLookupCandidates(normalizedLocale)
      : [""];

    for (const localeCandidate of uniqueLocales) {
      let fallbackQuery = supabase
        .from("website_blog_posts")
        .select("*, category:website_blog_categories(*)")
        .eq("website_id", websiteId)
        .eq("slug", normalizedSlug)
        .eq("status", "published")
        .is("deleted_at", null);

      if (localeCandidate)
        fallbackQuery = fallbackQuery.eq("locale", localeCandidate);

      const { data: fallbackPost, error: fallbackError } = await fallbackQuery
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("updated_at", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      if (!fallbackError && fallbackPost) return fallbackPost as BlogPost;
    }

    if (normalizedLocale) {
      const postInAnotherLocale = await getBlogPostAnyLocale(
        websiteId,
        normalizedSlug,
      );
      if (postInAnotherLocale?.translation_group_id) {
        const localizedPost = await getBlogPostByTranslationGroup(
          websiteId,
          postInAnotherLocale.translation_group_id,
          normalizedLocale,
        );
        if (localizedPost) return localizedPost;
      }
    }

    return null;
  } catch {
    // Keep public blog detail resilient — do not raise noisy dev overlay logs
    // for recoverable lookup failures.
    return null;
  }
}

/**
 * Find the default-locale counterpart of a blog post via translation_group_id.
 * Used to redirect non-default-locale 404s to the canonical ES version.
 */
export async function getBlogPostByTranslationGroup(
  websiteId: string,
  translationGroupId: string,
  locale: string,
): Promise<BlogPost | null> {
  try {
    for (const localeCandidate of getBlogLocaleLookupCandidates(locale)) {
      const { data, error } = await supabase
        .from("website_blog_posts")
        .select(`*, category:website_blog_categories(*)`)
        .eq("website_id", websiteId)
        .eq("translation_group_id", translationGroupId)
        .eq("locale", localeCandidate)
        .eq("status", "published")
        .is("deleted_at", null)
        .limit(1)
        .maybeSingle();

      if (!error && data) return data as BlogPost;
    }

    return null;
  } catch {
    return null;
  }
}


export function getBlogLocaleLookupCandidates(locale: string): string[] {
  const normalizedLocale = typeof locale === "string" ? locale.trim() : "";
  if (!normalizedLocale) return [];

  const localeCandidates = [normalizedLocale];
  const lang = normalizedLocale.split("-")[0]?.toLowerCase();
  if (lang && lang !== normalizedLocale) localeCandidates.push(lang);
  if (normalizedLocale === "es-CO") localeCandidates.push("es");
  if (normalizedLocale === "en-US") localeCandidates.push("en");
  if (normalizedLocale === "pt-BR") localeCandidates.push("pt");
  if (normalizedLocale === "fr-FR") localeCandidates.push("fr");
  if (normalizedLocale === "de-DE") localeCandidates.push("de");
  if (normalizedLocale === "es") localeCandidates.push("es-CO");
  if (normalizedLocale === "en") localeCandidates.push("en-US");
  if (normalizedLocale === "pt") localeCandidates.push("pt-BR");
  if (normalizedLocale === "fr") localeCandidates.push("fr-FR");
  if (normalizedLocale === "de") localeCandidates.push("de-DE");

  return [...new Set(localeCandidates)];
}

export async function getBlogPostTranslationLocales(
  websiteId: string,
  translationGroupId: string | null | undefined,
  fallbackLocale?: string | null,
): Promise<string[]> {
  const fallback = fallbackLocale ? [fallbackLocale] : [];
  if (!translationGroupId) return fallback;

  try {
    const { data, error } = await supabase
      .from("website_blog_posts")
      .select("locale")
      .eq("website_id", websiteId)
      .eq("translation_group_id", translationGroupId)
      .eq("status", "published")
      .is("deleted_at", null);

    if (error) return fallback;

    const locales = (data ?? [])
      .map((row: { locale: unknown }) => row.locale)
      .filter(
        (locale): locale is string =>
          typeof locale === "string" && locale.trim().length > 0,
      );

    const normalizedLocales = locales
      .map((locale) => normalizeBlogPublicLocale(locale))
      .filter((locale): locale is string => Boolean(locale));

    return normalizedLocales.length > 0
      ? [...new Set(normalizedLocales)]
      : fallback;
  } catch {
    return fallback;
  }
}

export async function getBlogPostTranslationRoutes(
  websiteId: string,
  translationGroupId: string | null | undefined,
  fallback?: { locale?: string | null; slug?: string | null },
): Promise<Array<{ locale: string; slug: string }>> {
  const fallbackRoutes = (() => {
    const locale = normalizeBlogPublicLocale(fallback?.locale);
    const slug = fallback?.slug?.trim();
    return locale && slug ? [{ locale, slug }] : [];
  })();
  if (!translationGroupId) return fallbackRoutes;

  try {
    const { data, error } = await supabase
      .from("website_blog_posts")
      .select("locale, slug")
      .eq("website_id", websiteId)
      .eq("translation_group_id", translationGroupId)
      .eq("status", "published")
      .is("deleted_at", null);

    if (error) return fallbackRoutes;

    const routes = new Map<string, string>();
    for (const row of data ?? []) {
      const locale = normalizeBlogPublicLocale(
        (row as { locale?: string | null }).locale,
      );
      const slug = (row as { slug?: string | null }).slug?.trim();
      if (locale && slug && !routes.has(locale)) routes.set(locale, slug);
    }

    return routes.size > 0
      ? Array.from(routes.entries()).map(([locale, slug]) => ({ locale, slug }))
      : fallbackRoutes;
  } catch {
    return fallbackRoutes;
  }
}

export function normalizeBlogPublicLocale(
  locale: string | null | undefined,
): string | null {
  if (!locale) return null;
  if (locale === "es") return "es-CO";
  if (locale === "en") return "en-US";
  if (locale === "pt") return "pt-BR";
  if (locale === "fr") return "fr-FR";
  if (locale === "de") return "de-DE";
  return locale;
}

/**
 * Find a blog post by slug in ANY locale, then return its translation_group_id.
 * Used to locate the default-locale version when a non-default slug 404s.
 */
export async function getBlogPostAnyLocale(
  websiteId: string,
  slug: string,
): Promise<Pick<
  BlogPost,
  "id" | "slug" | "locale" | "translation_group_id"
> | null> {
  try {
    const { data, error } = await supabase
      .from("website_blog_posts")
      .select("id, slug, locale, translation_group_id")
      .eq("website_id", websiteId)
      .eq("slug", slug)
      .eq("status", "published")
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();

    if (error) return null;
    return data as Pick<
      BlogPost,
      "id" | "slug" | "locale" | "translation_group_id"
    >;
  } catch {
    return null;
  }
}

/**
 * Get blog categories for a website
 */
export async function getBlogCategories(
  websiteId: string,
): Promise<BlogCategory[]> {
  try {
    const { data, error } = await supabase
      .from("website_blog_categories")
      .select("*")
      .eq("website_id", websiteId)
      .order("name");

    if (error) {
      console.error("[getBlogCategories] Error:", error);
      return [];
    }

    return data as BlogCategory[];
  } catch (e) {
    console.error("[getBlogCategories] Exception:", e);
    return [];
  }
}

/**
 * Get all published website subdomains for SSG
 */
export async function getAllWebsiteSubdomains(): Promise<string[]> {
  const buildStaticSubdomains = process.env.BUILD_STATIC_SUBDOMAINS;
  if (buildStaticSubdomains) {
    return buildStaticSubdomains
      .split(",")
      .map((subdomain) => subdomain.trim())
      .filter(Boolean);
  }

  try {
    const { data, error } = await supabase
      .from("websites")
      .select("subdomain")
      .eq("status", "published")
      .is("deleted_at", null);

    if (error) {
      console.error("[getAllWebsiteSubdomains] Error:", error);
      return [];
    }

    return data.map((w) => w.subdomain);
  } catch (e) {
    console.error("[getAllWebsiteSubdomains] Exception:", e);
    return [];
  }
}

/**
 * Get all published blog post slugs for a website (for SSG)
 */
export async function getAllBlogSlugs(websiteId: string): Promise<string[]> {
  if (process.env.BUILD_SKIP_BLOG_STATIC_PARAMS === "1") {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("website_blog_posts")
      .select("slug")
      .eq("website_id", websiteId)
      .eq("status", "published")
      .is("deleted_at", null);

    if (error) {
      console.error("[getAllBlogSlugs] Error:", error);
      return [];
    }

    return [...new Set(data.map((p) => p.slug).filter(Boolean))];
  } catch (e) {
    console.error("[getAllBlogSlugs] Exception:", e);
    return [];
  }
}
