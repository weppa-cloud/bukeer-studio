import { createClient } from '@supabase/supabase-js';
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
} from '@bukeer/website-contract';
import {
  resolveThemeDesignerV1Flag,
  selectPublicThemeForDesignerFlag,
} from '@/lib/features/theme-designer-v1';

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
const WEBSITE_CACHE_TTL_MS = Number(process.env.WEBSITE_CACHE_TTL_MS || 5 * 60 * 1000);
const websiteBySubdomainCache = new Map<string, { value: WebsiteData; expiresAt: number }>();

type WebsiteWithEffectiveTheme = WebsiteData & {
  effective_theme?: ThemeV3;
  effective_theme_source?: 'website_theme_flag_on' | 'snapshot_fallback' | 'website_theme_default';
};

interface AccountCurrencyColumns {
  primary_currency: string | null;
  enabled_currencies: string[] | null;
  currency: AccountCurrencyRate[] | null;
}

interface WebsiteLocaleColumns {
  default_locale: string | null;
  supported_locales: string[] | null;
}

function normalizeLocaleList(locales: unknown): string[] | undefined {
  if (!Array.isArray(locales)) return undefined;
  const normalized = locales
    .filter((locale): locale is string => typeof locale === 'string' && locale.trim().length > 0)
    .map((locale) => locale.trim());
  return normalized.length > 0 ? Array.from(new Set(normalized)) : undefined;
}

async function hydrateWebsiteLocaleColumns(
  website: WebsiteData,
  subdomain: string
): Promise<WebsiteData> {
  const hasDefaultLocale = typeof website.default_locale === 'string' && website.default_locale.trim().length > 0;
  const hasSupportedLocales = Array.isArray(website.supported_locales) && website.supported_locales.length > 0;
  if (hasDefaultLocale && hasSupportedLocales) {
    return website;
  }

  let query = supabase
    .from('websites')
    .select('default_locale, supported_locales')
    .limit(1);

  if (typeof website.id === 'string' && website.id.trim().length > 0) {
    query = query.eq('id', website.id);
  } else {
    query = query.eq('subdomain', subdomain);
  }

  const { data, error } = await query.maybeSingle<WebsiteLocaleColumns>();
  if (error || !data) {
    return website;
  }

  const defaultLocale = typeof data.default_locale === 'string' && data.default_locale.trim().length > 0
    ? data.default_locale.trim()
    : website.default_locale;
  const supportedLocales = normalizeLocaleList(data.supported_locales) ?? normalizeLocaleList(website.supported_locales);

  if (!defaultLocale && !supportedLocales) {
    return website;
  }

  return {
    ...website,
    default_locale: defaultLocale,
    supported_locales: supportedLocales,
  };
}

async function getAccountCurrencyColumns(accountId: string): Promise<AccountCurrencyColumns | null> {
  const { data, error } = await supabase
    .from('accounts')
    .select('primary_currency, enabled_currencies, currency')
    .eq('id', accountId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const primaryCurrency = typeof data.primary_currency === 'string'
    ? data.primary_currency.toUpperCase()
    : null;
  const enabledCurrencies = Array.isArray(data.enabled_currencies)
    ? data.enabled_currencies
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .map((item) => item.toUpperCase())
    : null;
  const currencyRates: AccountCurrencyRate[] | null = Array.isArray(data.currency)
    ? data.currency.reduce<AccountCurrencyRate[]>((acc, entry) => {
      if (!entry || typeof entry !== 'object') return acc;
      const name = typeof entry.name === 'string' ? entry.name.toUpperCase() : null;
      const rawRate = typeof entry.rate === 'number' ? entry.rate : Number(entry.rate);
      if (!name || !Number.isFinite(rawRate) || rawRate <= 0) return acc;
      const type = typeof entry.type === 'string' ? entry.type : null;
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

async function applyThemeDesignerV1Resolution(website: WebsiteData): Promise<WebsiteWithEffectiveTheme> {
  if (!website.account_id) {
    return {
      ...website,
      effective_theme: website.theme,
      effective_theme_source: 'website_theme_default',
    };
  }

  const flagResolution = await resolveThemeDesignerV1Flag(
    supabase,
    website.account_id,
    website.id,
  );

  let snapshotTheme: unknown = null;
  if (!flagResolution.enabled) {
    const { data, error } = await supabase.rpc('get_latest_pilot_theme_snapshot', {
      p_website_id: website.id,
    });
    if (error) {
      console.error('[getWebsiteBySubdomain] get_latest_pilot_theme_snapshot error:', error);
    } else {
      snapshotTheme = data;
    }
  }

  const selected = selectPublicThemeForDesignerFlag({
    currentTheme: website.theme,
    snapshotTheme,
    flagResolution,
  });

  return {
    ...website,
    theme: selected.theme,
    effective_theme: selected.theme,
    effective_theme_source: selected.source,
  };
}

/**
 * Get website data by subdomain
 * Uses RPC function for optimized query
 */
export async function getWebsiteBySubdomain(subdomain: string): Promise<WebsiteData | null> {
  try {
    const cacheKey = subdomain.toLowerCase();
    const cached = websiteBySubdomainCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return applyThemeDesignerV1Resolution(cached.value);
    }

    const { data, error } = await supabase
      .rpc('get_website_by_subdomain', { p_subdomain: subdomain });

    if (error) {
      console.error('[getWebsiteBySubdomain] Error:', error);
      return null;
    }

    if (!data) return null;

    const website = await hydrateWebsiteLocaleColumns(data as WebsiteData, subdomain);
    const featuredProducts = website.featured_products || {
      destinations: [],
      hotels: [],
      activities: [],
      transfers: [],
      packages: [],
    };

    if (website.account_id && website.content.account) {
      const accountCurrencyColumns = await getAccountCurrencyColumns(website.account_id);
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
    websiteBySubdomainCache.set(cacheKey, {
      value: hydratedWebsite,
      expiresAt: Date.now() + WEBSITE_CACHE_TTL_MS,
    });

    return applyThemeDesignerV1Resolution(hydratedWebsite);
  } catch (e) {
    console.error('[getWebsiteBySubdomain] Exception:', e);
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
  } = {}
): Promise<{ posts: BlogPost[]; total: number }> {
  try {
    const locale = typeof options.locale === 'string' ? options.locale.trim() : '';
    const localeCandidates: string[] = [];

    if (locale) {
      localeCandidates.push(locale);
      const lang = locale.split('-')[0]?.toLowerCase();
      if (lang && lang !== locale) localeCandidates.push(lang);

      // Legacy blog rows may still store ISO-639 locales (`es`, `en`).
      if (locale === 'es') localeCandidates.push('es-CO');
      if (locale === 'en') localeCandidates.push('en-US');
      if (locale === 'es-CO') localeCandidates.push('es');
      if (locale === 'en-US') localeCandidates.push('en');
    } else {
      localeCandidates.push('');
    }

    const uniqueLocales = [...new Set(localeCandidates.filter(Boolean))];
    const limit = options.limit || 10;
    const offset = options.offset || 0;

    // Locale-aware listing: include legacy + canonical locale variants of the
    // same language in one paginated query (e.g., `es` + `es-CO`).
    if (uniqueLocales.length > 1) {
      const categorySelect = options.categorySlug
        ? '*, category:website_blog_categories!inner(*)'
        : '*, category:website_blog_categories(*)';

      let query = supabase
        .from('website_blog_posts')
        .select(categorySelect, { count: 'exact' })
        .eq('website_id', websiteId)
        .eq('status', 'published')
        .is('deleted_at', null)
        .in('locale', uniqueLocales)
        .order('published_at', { ascending: false, nullsFirst: false })
        .order('updated_at', { ascending: false, nullsFirst: false })
        .range(offset, offset + limit - 1);

      if (options.categorySlug) {
        query = query.eq('category.slug', options.categorySlug);
      }

      const { data, error, count } = await query;
      if (error) {
        console.error('[getBlogPosts] Locale query error:', error);
      } else {
        return {
          posts: (data as BlogPost[]) || [],
          total: count || 0,
        };
      }
    }

    const { data, error } = await supabase
      .rpc('get_website_blog_posts', {
        p_website_id: websiteId,
        p_limit: limit,
        p_offset: offset,
        p_category_slug: options.categorySlug || null,
        p_locale: locale || null,
      });

    if (error) {
      console.error('[getBlogPosts] Error:', error);
      return { posts: [], total: 0 };
    }

    return {
      posts: data?.posts || [],
      total: data?.total || 0,
    };
  } catch (e) {
    console.error('[getBlogPosts] Exception:', e);
    return { posts: [], total: 0 };
  }
}

/**
 * Get a single blog post by slug
 */
export async function getBlogPostBySlug(
  websiteId: string,
  slug: string,
  locale?: string
): Promise<BlogPost | null> {
  try {
    let query = supabase
      .from('website_blog_posts')
      .select(`*, category:website_blog_categories(*)`)
      .eq('website_id', websiteId)
      .eq('slug', slug)
      .eq('status', 'published')
      .is('deleted_at', null);

    if (locale) query = query.eq('locale', locale);

    const { data, error } = await query
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('updated_at', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[getBlogPostBySlug] Error:', error);
      return null;
    }

    return data as BlogPost;
  } catch (e) {
    console.error('[getBlogPostBySlug] Exception:', e);
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
  locale: string
): Promise<BlogPost | null> {
  try {
    const { data, error } = await supabase
      .from('website_blog_posts')
      .select(`*, category:website_blog_categories(*)`)
      .eq('website_id', websiteId)
      .eq('translation_group_id', translationGroupId)
      .eq('locale', locale)
      .eq('status', 'published')
      .is('deleted_at', null)
      .limit(1)
      .maybeSingle();

    if (error) return null;
    return data as BlogPost;
  } catch {
    return null;
  }
}

/**
 * Find a blog post by slug in ANY locale, then return its translation_group_id.
 * Used to locate the default-locale version when a non-default slug 404s.
 */
export async function getBlogPostAnyLocale(
  websiteId: string,
  slug: string
): Promise<Pick<BlogPost, 'id' | 'slug' | 'locale' | 'translation_group_id'> | null> {
  try {
    const { data, error } = await supabase
      .from('website_blog_posts')
      .select('id, slug, locale, translation_group_id')
      .eq('website_id', websiteId)
      .eq('slug', slug)
      .eq('status', 'published')
      .is('deleted_at', null)
      .limit(1)
      .maybeSingle();

    if (error) return null;
    return data as Pick<BlogPost, 'id' | 'slug' | 'locale' | 'translation_group_id'>;
  } catch {
    return null;
  }
}

/**
 * Get blog categories for a website
 */
export async function getBlogCategories(websiteId: string): Promise<BlogCategory[]> {
  try {
    const { data, error } = await supabase
      .from('website_blog_categories')
      .select('*')
      .eq('website_id', websiteId)
      .order('name');

    if (error) {
      console.error('[getBlogCategories] Error:', error);
      return [];
    }

    return data as BlogCategory[];
  } catch (e) {
    console.error('[getBlogCategories] Exception:', e);
    return [];
  }
}

/**
 * Get all published website subdomains for SSG
 */
export async function getAllWebsiteSubdomains(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('websites')
      .select('subdomain')
      .eq('status', 'published')
      .is('deleted_at', null);

    if (error) {
      console.error('[getAllWebsiteSubdomains] Error:', error);
      return [];
    }

    return data.map(w => w.subdomain);
  } catch (e) {
    console.error('[getAllWebsiteSubdomains] Exception:', e);
    return [];
  }
}

/**
 * Get all published blog post slugs for a website (for SSG)
 */
export async function getAllBlogSlugs(websiteId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('website_blog_posts')
      .select('slug')
      .eq('website_id', websiteId)
      .eq('status', 'published')
      .is('deleted_at', null);

    if (error) {
      console.error('[getAllBlogSlugs] Error:', error);
      return [];
    }

    return [...new Set(data.map(p => p.slug).filter(Boolean))];
  } catch (e) {
    console.error('[getAllBlogSlugs] Exception:', e);
    return [];
  }
}
