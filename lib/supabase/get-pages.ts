import { createClient } from '@supabase/supabase-js';
import type {
  WebsitePage,
  NavigationItem,
  PageSection,
  ProductData,
  ProductPageCustomization,
  ProductPageData,
  CategoryProducts,
} from '@bukeer/website-contract';
import {
  ProductPageDataSchema,
  CategoryProductsSchema,
  ProductDataSchema,
  PackageAggregatedDataSchema,
} from '@bukeer/website-contract';

// Re-export types from contract (Strangler migration)
export type {
  WebsitePage,
  NavigationItem,
  PageSection,
  ProductData,
  ProductPageCustomization,
  ProductPageData,
  CategoryProducts,
};

// Create a Supabase client for server-side data fetching
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseService = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;
const ENABLE_IN_MEMORY_CACHE = process.env.NODE_ENV === 'production';
const PRODUCT_PAGE_CACHE_TTL_MS = Number(process.env.PRODUCT_PAGE_CACHE_TTL_MS || 5 * 60 * 1000);
const CATEGORY_PRODUCTS_CACHE_TTL_MS = Number(process.env.CATEGORY_PRODUCTS_CACHE_TTL_MS || 2 * 60 * 1000);
const productPageCache = new Map<string, { value: ProductPageData; expiresAt: number }>();
const categoryProductsCache = new Map<string, { value: CategoryProducts; expiresAt: number }>();

/**
 * Manual in-memory caches here are independent from Next ISR caches.
 * Revalidation flows must explicitly clear these entries to avoid stale reads.
 */
export function invalidatePublicDataCache(subdomain: string): void {
  const prefix = `${subdomain.toLowerCase()}::`;

  for (const key of productPageCache.keys()) {
    if (key.startsWith(prefix)) {
      productPageCache.delete(key);
    }
  }

  for (const key of categoryProductsCache.keys()) {
    if (key.startsWith(prefix)) {
      categoryProductsCache.delete(key);
    }
  }
}

function logProductV2ParseWarning(
  scope: string,
  payload: unknown,
  issues: Array<{ path: Array<PropertyKey>; message: string }>
) {
  console.warn('[product.v2-parse] Schema mismatch', {
    scope,
    issues: issues.slice(0, 5),
    totalIssues: issues.length,
    payloadType: Array.isArray(payload) ? 'array' : typeof payload,
  });
}

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const rows = value.filter((item): item is string => typeof item === 'string');
  return rows;
}

/**
 * Normalize a `program_gallery`-shaped value (string[] | {url, alt?}[]) into a
 * URL-only string[]. Returns `null` if no usable URLs are present so callers
 * can preserve upstream fallbacks instead of overwriting with an empty array.
 */
function asGalleryUrlArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const urls = value
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') {
        const rec = item as Record<string, unknown>;
        if (typeof rec.url === 'string') return rec.url;
      }
      return null;
    })
    .filter((url): url is string => Boolean(url));
  return urls.length > 0 ? urls : null;
}

type TranslationOverlay = Record<string, unknown>;

function resolveTranslationOverlay(
  translations: unknown,
  locale: string | null | undefined
): TranslationOverlay | null {
  if (!translations || typeof translations !== 'object' || !locale) return null;
  const map = translations as Record<string, unknown>;
  const exact = map[locale];
  if (exact && typeof exact === 'object' && !Array.isArray(exact)) {
    return exact as TranslationOverlay;
  }

  const lang = locale.split('-')[0]?.toLowerCase();
  if (!lang) return null;
  for (const [key, value] of Object.entries(map)) {
    if (!key.toLowerCase().startsWith(`${lang}-`)) continue;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as TranslationOverlay;
    }
  }
  return null;
}

function pickTranslatedString(overlay: TranslationOverlay | null, keys: string[]): string | null {
  if (!overlay) return null;
  for (const key of keys) {
    const value = overlay[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

async function applyTranslationOverlayToProducts(
  items: ProductData[],
  categoryType: string,
  locale: string | null | undefined
): Promise<ProductData[]> {
  if (!locale || items.length === 0) return items;

  const ids = items
    .map((item) => item.id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);
  if (ids.length === 0) return items;

  const overlayByProductId = new Map<string, TranslationOverlay>();

  if (categoryType === 'packages') {
    const { data, error } = await supabase
      .from('package_kits')
      .select('id, source_itinerary_id, translations')
      .or(`id.in.(${ids.join(',')}),source_itinerary_id.in.(${ids.join(',')})`);

    if (error || !Array.isArray(data)) return items;

    for (const row of data) {
      const overlay = resolveTranslationOverlay(row.translations, locale);
      if (!overlay) continue;
      if (typeof row.id === 'string' && row.id.length > 0) {
        overlayByProductId.set(row.id, overlay);
      }
      if (typeof row.source_itinerary_id === 'string' && row.source_itinerary_id.length > 0) {
        overlayByProductId.set(row.source_itinerary_id, overlay);
      }
    }
  } else {
    // Activities: query activities table (no products table in this schema)
    const { data, error } = await supabase
      .from('activities')
      .select('id, translations')
      .in('id', ids);

    if (error || !Array.isArray(data)) return items;

    for (const row of data) {
      const overlay = resolveTranslationOverlay(row.translations, locale);
      if (!overlay) continue;
      if (typeof row.id === 'string' && row.id.length > 0) {
        overlayByProductId.set(row.id, overlay);
      }
    }
  }

  return items.map((item) => {
    const overlay = overlayByProductId.get(item.id);
    if (!overlay) return item;
    const translatedName = pickTranslatedString(overlay, ['name', 'title']);
    const translatedDescription = pickTranslatedString(overlay, [
      'description_short',
      'short_description',
      'description',
    ]);

    return {
      ...item,
      name: translatedName ?? item.name,
      description: translatedDescription ?? item.description,
      translations: {
        ...(item.translations ?? {}),
        [locale]: overlay,
      },
    };
  });
}

/**
 * Get a page by slug
 */
export async function getPageBySlug(
  subdomain: string,
  slug: string
): Promise<WebsitePage | null> {
  try {
    const { data, error } = await supabase.rpc('get_website_page_by_slug', {
      p_subdomain: subdomain,
      p_slug: slug,
    });

    if (error) {
      console.error('[getPageBySlug] Error:', error);
      return null;
    }

    return data as WebsitePage | null;
  } catch (e) {
    console.error('[getPageBySlug] Exception:', e);
    return null;
  }
}

/**
 * Find the translated variant of a page by translation_group_id + locale.
 * Returns a minimal shape (id, slug, locale) — enough to build a redirect URL.
 */
export async function getPageByTranslationGroup(
  websiteId: string,
  translationGroupId: string,
  locale: string,
): Promise<Pick<WebsitePage, 'id' | 'slug' | 'locale'> | null> {
  try {
    const { data, error } = await supabase
      .from('website_pages')
      .select('id, slug, locale')
      .eq('website_id', websiteId)
      .eq('translation_group_id', translationGroupId)
      .eq('locale', locale)
      .eq('is_published', true)
      .maybeSingle();

    if (error) {
      console.error('[getPageByTranslationGroup] Error:', error);
      return null;
    }
    return data as Pick<WebsitePage, 'id' | 'slug' | 'locale'> | null;
  } catch (e) {
    console.error('[getPageByTranslationGroup] Exception:', e);
    return null;
  }
}

/**
 * Get a product page with product data
 */
export async function getProductPage(
  subdomain: string,
  productType: string,
  productSlug: string,
  options?: { locale?: string }
): Promise<ProductPageData | null> {
  try {
    const cacheKey = `${subdomain.toLowerCase()}::${productType.toLowerCase()}::${productSlug.toLowerCase()}::${(options?.locale ?? '').toLowerCase()}`;
    if (ENABLE_IN_MEMORY_CACHE) {
      const cached = productPageCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.value;
      }
    }

    const { data, error } = await supabase.rpc('get_website_product_page', {
      p_subdomain: subdomain,
      p_product_type: productType,
      p_product_slug: productSlug,
    });

    if (error) {
      console.error('[getProductPage] Error:', error);
      return null;
    }

    if (!data?.product) {
      return null;
    }

    const parsed = ProductPageDataSchema.safeParse(data);
    let result: ProductPageData;

    if (parsed.success) {
      result = parsed.data as ProductPageData;
    } else {
      logProductV2ParseWarning('getProductPage', data, parsed.error.issues);

      // Graceful fallback for legacy/partial payloads.
      const parsedLegacyProduct = ProductDataSchema.safeParse(data.product);
      result = {
        product: parsedLegacyProduct.success
          ? (parsedLegacyProduct.data as ProductData)
          : (data.product as ProductData),
        page: data.page as ProductPageCustomization | undefined,
      };
    }

    if (productType === 'package' && result.product) {
      const product = result.product as ProductData & {
        program_inclusions?: string[] | null;
        program_exclusions?: string[] | null;
        program_gallery?: string[] | null;
        program_highlights?: string[] | null;
        video_url?: string | null;
        video_caption?: string | null;
        social_image?: string | null;
      };

      // Package SSR RPC still misses some kit-origin marketing fields on certain
      // paths. Overlay `package_kits` values when resolvable by itinerary link.
      try {
        const packageReader = supabaseService ?? supabase;
        const kitFields = 'id, name, description, program_highlights, program_inclusions, program_exclusions, program_gallery, cover_image_url, video_url, video_caption, translations';
        const byItinerary = await packageReader
          .from('package_kits')
          .select(kitFields)
          .eq('source_itinerary_id', product.id)
          .maybeSingle();

        let kit = byItinerary.data;
        if ((!kit || byItinerary.error) && product.id) {
          const byId = await packageReader
            .from('package_kits')
            .select(kitFields)
            .eq('id', product.id)
            .maybeSingle();
          if (!byId.error) kit = byId.data;
        }
        // Third path: itinerary.source_package_id → kit.
        // Handles the case where multiple itineraries share a kit but only one
        // has source_itinerary_id set on the kit side.
        if (!kit && product.id) {
          const { data: itinRow } = await supabase
            .from('itineraries')
            .select('source_package_id')
            .eq('id', product.id)
            .maybeSingle();
          const kitId = itinRow?.source_package_id ? String(itinRow.source_package_id) : null;
          if (kitId) {
            const bySourcePkg = await packageReader
              .from('package_kits')
              .select(kitFields)
              .eq('id', kitId)
              .maybeSingle();
            if (!bySourcePkg.error) kit = bySourcePkg.data;
          }
        }

        if (kit) {
          if (typeof kit.description === 'string') {
            product.description = kit.description;
          }

          const highlights = asStringArray(kit.program_highlights);
          if (highlights) product.program_highlights = highlights;

          const inclusions = asStringArray(kit.program_inclusions);
          if (inclusions) product.program_inclusions = inclusions;

          const exclusions = asStringArray(kit.program_exclusions);
          if (exclusions) product.program_exclusions = exclusions;

          const gallery = asGalleryUrlArray(kit.program_gallery);
          if (gallery) product.program_gallery = gallery;

          if (typeof kit.video_url === 'string' || kit.video_url === null) {
            product.video_url = kit.video_url;
          }
          if (typeof kit.video_caption === 'string' || kit.video_caption === null) {
            product.video_caption = kit.video_caption;
          }
          if (!product.social_image && typeof kit.cover_image_url === 'string') {
            product.social_image = kit.cover_image_url;
          }

          // Apply locale-specific content translations (name, description, highlights).
          if (options?.locale) {
            const localeOverlay = resolveTranslationOverlay(
              (kit as unknown as Record<string, unknown>).translations,
              options.locale,
            );
            if (localeOverlay) {
              const tName = pickTranslatedString(localeOverlay, ['name', 'title']);
              const tDesc = pickTranslatedString(localeOverlay, ['description', 'description_short']);
              const tHighlights = Array.isArray(localeOverlay.program_highlights)
                ? (localeOverlay.program_highlights as unknown[])
                    .filter((h): h is string => typeof h === 'string')
                : null;
              if (tName) product.name = tName;
              if (tDesc) product.description = tDesc;
              if (tHighlights?.length) product.program_highlights = tHighlights;
            }
          }
        }
      } catch {
        // Keep the base RPC payload if kit overlay lookup is unavailable.
      }
    }

    // Gate B — F1 layer (#172): for packages, fetch aggregated inclusions/exclusions/gallery
    // when the kit-level fields are absent or empty.
    if (productType === 'package' && result.product) {
      const prod = result.product as ProductData & {
        program_inclusions?: string[];
        program_exclusions?: string[];
        program_gallery?: string[];
      };
      const needsAgg =
        !prod.program_inclusions?.length ||
        !prod.program_exclusions?.length ||
        !prod.program_gallery?.length;

      if (needsAgg) {
        try {
          const { data: aggData, error: aggError } = await supabase.rpc(
            'get_package_aggregated_data',
            { p_package_id: prod.id }
          );
          if (!aggError && aggData) {
            const aggParsed = PackageAggregatedDataSchema.safeParse(aggData);
            if (aggParsed.success) {
              if (!prod.program_inclusions?.length) {
                (result.product as typeof prod).program_inclusions = aggParsed.data.inclusions;
              }
              if (!prod.program_exclusions?.length) {
                (result.product as typeof prod).program_exclusions = aggParsed.data.exclusions;
              }
              if (!prod.program_gallery?.length) {
                (result.product as typeof prod).program_gallery = aggParsed.data.gallery;
              }
            }
          }
        } catch {
          // Graceful degrade: use kit-raw data (ADR-015)
        }
      }
    }

    if (ENABLE_IN_MEMORY_CACHE) {
      productPageCache.set(cacheKey, {
        value: result,
        expiresAt: Date.now() + PRODUCT_PAGE_CACHE_TTL_MS,
      });
    }

    return result;
  } catch (e) {
    console.error('[getProductPage] Exception:', e);
    return null;
  }
}

// Alias kept for backwards compatibility with callers that still use "BySlug" naming.
export const getProductPageBySlug = getProductPage;

/**
 * Locale-aware overlay fetch for product pages (pkg / activity / hotel /
 * transfer). The base `get_website_product_page` RPC resolves the default
 * locale overlay only. When a request resolves to a non-default locale (e.g.
 * `/en/paquetes/<slug>`), the page SSR must also pick up the localized
 * overlay row from `website_product_pages` keyed by
 * `(website_id, product_type, product_id, locale)` so applied transcreate
 * `custom_seo_title` + `custom_seo_description` render in the `<title>` /
 * `<meta description>` of the translated URL.
 *
 * Returns the overlay row subset used by `generateMetadata` (seo fields +
 * robots). Returns `null` when no localized overlay exists; callers should
 * fall back to the default-locale row from `getProductPage` in that case.
 *
 * Introduced for Stage 6 Bug 9 (2026-04-20): pkg `/en/` render was leaking
 * the es-CO `custom_seo_title` because no locale-aware lookup existed.
 */
export async function getLocalizedProductOverlay(input: {
  websiteId: string;
  productType: string;
  productId: string;
  locale: string;
}): Promise<{
  custom_seo_title: string | null;
  custom_seo_description: string | null;
  custom_faq: unknown;
  robots_noindex: boolean | null;
  locale: string;
} | null> {
  try {
    const primary = await supabase
      .from('website_product_pages')
      .select('custom_seo_title, custom_seo_description, custom_faq, robots_noindex, locale')
      .eq('website_id', input.websiteId)
      .eq('product_type', input.productType)
      .eq('product_id', input.productId)
      .eq('locale', input.locale)
      .maybeSingle();

    if (!primary.error && primary.data) {
      return primary.data as {
        custom_seo_title: string | null;
        custom_seo_description: string | null;
        custom_faq: unknown;
        robots_noindex: boolean | null;
        locale: string;
      };
    }

    // Package overlays may be keyed by the package_kit id (transcreate apply
    // uses `job.page_id` = package_kits.id) while the public SSR receives the
    // underlying itinerary id from `get_website_product_page` (it returns
    // `i.id` as the product id). Mirror the RPC's dual-id lookup
    // (`pp.product_id = v_product_id OR v_package_kit_id`) at the overlay
    // reader layer so applied EN transcreate rows surface regardless of which
    // id the apply path happened to store. See Stage 6 Cluster F — Bug F1.
    //
    // `package_kits` itself is not anon-readable (account-scoped RLS), but
    // `itineraries.source_package_id` is anon-exposed and stores the kit id —
    // reverse-lookup via the public `itineraries` row keeps us under the
    // anon client's permission envelope.
    if (input.productType === 'package') {
      const { data: itinRow } = await supabase
        .from('itineraries')
        .select('source_package_id')
        .eq('id', input.productId)
        .maybeSingle();
      const kitId = itinRow?.source_package_id ? String(itinRow.source_package_id) : null;
      if (kitId && kitId !== input.productId) {
        const fallback = await supabase
          .from('website_product_pages')
          .select('custom_seo_title, custom_seo_description, custom_faq, robots_noindex, locale')
          .eq('website_id', input.websiteId)
          .eq('product_type', input.productType)
          .eq('product_id', kitId)
          .eq('locale', input.locale)
          .maybeSingle();
        if (!fallback.error && fallback.data) {
          return fallback.data as {
            custom_seo_title: string | null;
            custom_seo_description: string | null;
            custom_faq: unknown;
            robots_noindex: boolean | null;
            locale: string;
          };
        }
      }
    }

    return null;
  } catch (e) {
    console.warn('[getLocalizedProductOverlay] Exception:', e);
    return null;
  }
}

/**
 * Return the subset of product IDs that have a website_product_pages overlay
 * for the given locale. Used to filter listing pages so only transcreated
 * products appear on non-default locale routes (e.g. /en/actividades).
 */
async function getProductIdsWithLocaleOverlay(
  websiteId: string,
  productType: string,
  productIds: string[],  // itinerary IDs from RPC
  locale: string
): Promise<Set<string>> {
  if (productIds.length === 0) return new Set();
  try {
    // Packages: website_product_pages stores kit IDs (source_package_id), but
    // the RPC returns itinerary IDs. Resolve via itineraries.source_package_id.
    if (productType === 'package') {
      const { data: itinData } = await supabase
        .from('itineraries')
        .select('id, source_package_id')
        .in('id', productIds)
        .not('source_package_id', 'is', null);

      if (!Array.isArray(itinData) || itinData.length === 0) return new Set();

      const kitToItinerary = new Map<string, string>();
      const kitIds: string[] = [];
      for (const row of itinData) {
        if (row.source_package_id) {
          kitToItinerary.set(String(row.source_package_id), String(row.id));
          kitIds.push(String(row.source_package_id));
        }
      }
      if (kitIds.length === 0) return new Set();

      const { data, error } = await supabase
        .from('website_product_pages')
        .select('product_id')
        .eq('website_id', websiteId)
        .eq('product_type', productType)
        .eq('locale', locale)
        .in('product_id', kitIds);

      if (error || !Array.isArray(data)) return new Set();
      // Return itinerary IDs so the caller can filter baseItems correctly
      const result = new Set<string>();
      for (const r of data) {
        const itinId = kitToItinerary.get(String(r.product_id));
        if (itinId) result.add(itinId);
      }
      return result;
    }

    const { data, error } = await supabase
      .from('website_product_pages')
      .select('product_id')
      .eq('website_id', websiteId)
      .eq('product_type', productType)
      .eq('locale', locale)
      .in('product_id', productIds);

    if (error || !Array.isArray(data)) return new Set();
    return new Set(data.map((r) => String(r.product_id)));
  } catch {
    return new Set();
  }
}

/**
 * Get navigation items for a website
 */
export async function getWebsiteNavigation(
  subdomain: string
): Promise<NavigationItem[]> {
  try {
    const { data, error } = await supabase.rpc('get_website_navigation', {
      p_subdomain: subdomain,
    });

    if (error) {
      console.error('[getWebsiteNavigation] Error:', error);
      return [];
    }

    return (data as NavigationItem[]) || [];
  } catch (e) {
    console.error('[getWebsiteNavigation] Exception:', e);
    return [];
  }
}

/**
 * Get all page slugs for a website (for SSG)
 */
export async function getAllPageSlugs(subdomain: string): Promise<string[]> {
  try {
    // Get website first
    const { data: websiteData, error: websiteError } = await supabase
      .from('websites')
      .select('id')
      .eq('subdomain', subdomain)
      .eq('status', 'published')
      .is('deleted_at', null)
      .single();

    if (websiteError || !websiteData) {
      return [];
    }

    // Get all published pages
    const { data, error } = await supabase
      .from('website_pages')
      .select('slug')
      .eq('website_id', websiteData.id)
      .eq('is_published', true);

    if (error) {
      console.error('[getAllPageSlugs] Error:', error);
      return [];
    }

    return data.map((p) => p.slug);
  } catch (e) {
    console.error('[getAllPageSlugs] Exception:', e);
    return [];
  }
}

/**
 * Get all published page slugs excluding those marked as noindex.
 * Used by the sitemap generator to avoid listing noindex pages.
 */
export async function getIndexablePageSlugs(subdomain: string): Promise<string[]> {
  try {
    const { data: websiteData, error: websiteError } = await supabase
      .from('websites')
      .select('id')
      .eq('subdomain', subdomain)
      .eq('status', 'published')
      .is('deleted_at', null)
      .single();

    if (websiteError || !websiteData) {
      return [];
    }

    const { data, error } = await supabase
      .from('website_pages')
      .select('slug, robots_noindex')
      .eq('website_id', websiteData.id)
      .eq('is_published', true);

    if (error) {
      console.error('[getIndexablePageSlugs] Error:', error);
      return [];
    }

    return data
      .filter((p) => !p.robots_noindex)
      .map((p) => p.slug);
  } catch (e) {
    console.error('[getIndexablePageSlugs] Exception:', e);
    return [];
  }
}

/**
 * Get products for a category page (with pagination)
 */
export async function getCategoryProducts(
  subdomain: string,
  categoryType: string,
  options: {
    limit?: number;
    offset?: number;
    search?: string;
    locale?: string;
    defaultLocale?: string;
    websiteId?: string;
  } = {}
): Promise<CategoryProducts> {
  try {
    const cacheKey = [
      subdomain.toLowerCase(),
      categoryType.toLowerCase(),
      String(options.limit || 12),
      String(options.offset || 0),
      (options.search || '').toLowerCase(),
      (options.locale || '').toLowerCase(),
    ].join('::');
    if (ENABLE_IN_MEMORY_CACHE) {
      const cached = categoryProductsCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.value;
      }
    }

    const { data, error } = await supabase.rpc('get_website_category_products', {
      p_subdomain: subdomain,
      p_category: categoryType,
      p_search: options.search || null,
      p_limit: options.limit || 12,
      p_offset: options.offset || 0,
    });

    if (error) {
      console.error('[getCategoryProducts] Error:', error);
      return { items: [], total: 0 };
    }

    if (!data) {
      return { items: [], total: 0 };
    }

    // Backward compatibility: normalize array payloads during RPC cutover.
    const normalizedPayload = Array.isArray(data)
      ? { items: data, total: data.length }
      : data;

    const parsed = CategoryProductsSchema.safeParse(normalizedPayload);
    if (parsed.success) {
      let baseItems = parsed.data.items as ProductData[];

      // For non-default locale: filter to products that have an en overlay.
      const locale = options.locale;
      const defaultLocale = options.defaultLocale ?? 'es-CO';
      if (locale && locale !== defaultLocale && options.websiteId) {
        const productType = categoryType === 'packages' ? 'package' : categoryType.replace(/s$/, '');
        const productIds = baseItems.map((i) => i.id).filter((id): id is string => !!id);
        const idsWithOverlay = await getProductIdsWithLocaleOverlay(
          options.websiteId, productType, productIds, locale
        );
        baseItems = baseItems.filter((i) => i.id && idsWithOverlay.has(i.id));
      }

      const localizedItems = await applyTranslationOverlayToProducts(
        baseItems,
        categoryType,
        locale ?? null,
      );
      const result = {
        items: localizedItems,
        total: locale && locale !== defaultLocale ? localizedItems.length : Number(parsed.data.total),
      };
      if (ENABLE_IN_MEMORY_CACHE) {
        categoryProductsCache.set(cacheKey, {
          value: result,
          expiresAt: Date.now() + CATEGORY_PRODUCTS_CACHE_TTL_MS,
        });
      }
      return result;
    }

    logProductV2ParseWarning('getCategoryProducts', normalizedPayload, parsed.error.issues);

    const payload = normalizedPayload as { items?: unknown; total?: unknown };
    const items = Array.isArray(payload.items)
      ? (payload.items as ProductData[])
      : [];
    const total = typeof payload.total === 'number'
      ? payload.total
      : Number(payload.total) || 0;

    const localizedItems = await applyTranslationOverlayToProducts(
      items,
      categoryType,
      options.locale ?? null,
    );
    const result = { items: localizedItems, total };
    if (ENABLE_IN_MEMORY_CACHE) {
      categoryProductsCache.set(cacheKey, {
        value: result,
        expiresAt: Date.now() + CATEGORY_PRODUCTS_CACHE_TTL_MS,
      });
    }
    return result;
  } catch (e) {
    console.error('[getCategoryProducts] Exception:', e);
    return { items: [], total: 0 };
  }
}

/**
 * Get dynamic destinations from inventory (hotels + activities locations)
 */
export interface DestinationData {
  id: string;
  name: string;
  slug: string;
  state: string;
  lat: number;
  lng: number;
  hotel_count: number;
  activity_count: number;
  /**
   * Editorial v1 — count of featured package_kits whose
   * free-text `destination` field mentions this city (fuzzy match,
   * unaccented + lowercased). Added by migration
   * `20260503000130_editorial_v1_destinations_package_count`.
   * Always a number; 0 when the RPC returns null/undefined.
   */
  package_count: number;
  total: number;
  min_price: string | null;
  image: string | null;
}

export async function getDestinations(
  subdomain: string
): Promise<DestinationData[]> {
  try {
    const { data, error } = await supabase.rpc('get_website_destinations', {
      p_subdomain: subdomain,
    });

    if (error) {
      console.error('[getDestinations] Error:', error);
      return [];
    }

    const payload = data as { destinations?: Omit<DestinationData, 'id'>[] };
    const destinations = payload?.destinations || [];

    return destinations.map((destination, index) => ({
      ...destination,
      // Defensive: coerce package_count to a number (RPC always returns int,
      // but some environments may surface null on fuzzy-match misses).
      package_count:
        typeof destination.package_count === 'number'
          ? destination.package_count
          : 0,
      id:
        (typeof destination.slug === 'string' && destination.slug) ||
        `${destination.name}-${index}`,
    }));
  } catch (e) {
    console.error('[getDestinations] Exception:', e);
    return [];
  }
}

/**
 * Get products (hotels + activities) for a specific destination city
 */
export async function getDestinationProducts(
  subdomain: string,
  cityName: string
): Promise<ProductData[]> {
  try {
    const { data, error } = await supabase.rpc('get_website_destination_products', {
      p_subdomain: subdomain,
      p_city_name: cityName,
    });

    if (error) {
      console.error('[getDestinationProducts] Error:', error);
      return [];
    }

    const payload = data as { items?: ProductData[] };
    return payload?.items || [];
  } catch (e) {
    console.error('[getDestinationProducts] Exception:', e);
    return [];
  }
}

/**
 * Get cached Google Reviews for a website's account
 */
export interface GoogleReviewData {
  review_id: string;
  author_name: string;
  author_photo: string | null;
  author_link: string | null;
  rating: number;
  text: string;
  date: string;
  iso_date: string | null;
  relative_time: string | null;
  likes: number;
  images: Array<{ url: string; thumbnail?: string }>;
  response: { text: string; date: string } | null;
  is_visible: boolean;
  tags: string[];
}

export interface GoogleReviewsCache {
  reviews: GoogleReviewData[];
  business_name: string | null;
  average_rating: number | null;
  total_reviews: number | null;
  google_maps_url: string | null;
  fetched_at: string;
}

export async function getCachedGoogleReviews(
  accountId: string
): Promise<GoogleReviewsCache | null> {
  try {
    const { data, error } = await supabase
      .from('account_google_reviews')
      .select('reviews, business_name, average_rating, total_reviews, google_maps_url, fetched_at')
      .eq('account_id', accountId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      reviews: (data.reviews as GoogleReviewData[]) || [],
      business_name: data.business_name,
      average_rating: data.average_rating,
      total_reviews: data.total_reviews,
      google_maps_url: data.google_maps_url,
      fetched_at: data.fetched_at,
    };
  } catch (e) {
    console.error('[getCachedGoogleReviews] Exception:', e);
    return null;
  }
}

/**
 * Get reviews matching a product's location/city for product detail pages.
 * Returns visible reviews whose tags match the product's city slug.
 * Falls back to general reviews (no tags) if no specific match.
 */
/**
 * Get all destination SEO overrides for a website
 */
export async function getDestinationSeoOverrides(websiteId: string) {
  try {
    const { data, error } = await supabase
      .from('destination_seo_overrides')
      .select('*')
      .eq('website_id', websiteId);

    if (error) {
      console.error('[getDestinationSeoOverrides] Error:', error);
      return [];
    }

    return data || [];
  } catch (e) {
    console.error('[getDestinationSeoOverrides] Exception:', e);
    return [];
  }
}

/**
 * Get a single destination SEO override by slug
 */
export async function getDestinationSeoOverride(websiteId: string, destinationSlug: string) {
  try {
    const { data, error } = await supabase
      .from('destination_seo_overrides')
      .select('*')
      .eq('website_id', websiteId)
      .eq('destination_slug', destinationSlug)
      .single();

    if (error) {
      // PGRST116 = no rows found — not a real error for .single()
      if (error.code === 'PGRST116') return null;
      console.error('[getDestinationSeoOverride] Error:', error);
      return null;
    }

    return data;
  } catch (e) {
    console.error('[getDestinationSeoOverride] Exception:', e);
    return null;
  }
}

/**
 * Upsert a destination SEO override (insert or update on conflict)
 */
export async function upsertDestinationSeoOverride(
  websiteId: string,
  destinationSlug: string,
  fields: {
    custom_seo_title?: string;
    custom_seo_description?: string;
    custom_description?: string;
    target_keyword?: string;
  }
) {
  const { data, error } = await supabase
    .from('destination_seo_overrides')
    .upsert(
      {
        website_id: websiteId,
        destination_slug: destinationSlug,
        ...fields,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'website_id,destination_slug' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get noindex product slugs for a website (from website_product_pages)
 */
export async function getNoindexProductSlugs(websiteId: string): Promise<Set<string>> {
  try {
    const { data, error } = await supabase
      .from('website_product_pages')
      .select('slug, robots_noindex')
      .eq('website_id', websiteId)
      .eq('robots_noindex', true);

    if (error || !data) return new Set();
    return new Set(data.map(p => p.slug).filter(Boolean));
  } catch {
    return new Set();
  }
}

/**
 * Get noindex destination slugs for a website (from destination_seo_overrides)
 */
export async function getNoindexDestinationSlugs(websiteId: string): Promise<Set<string>> {
  try {
    const { data, error } = await supabase
      .from('destination_seo_overrides')
      .select('destination_slug, robots_noindex')
      .eq('website_id', websiteId)
      .eq('robots_noindex', true);

    if (error || !data) return new Set();
    return new Set(data.map(d => d.destination_slug).filter(Boolean));
  } catch {
    return new Set();
  }
}

export async function getReviewsForProduct(
  accountId: string,
  cityOrDestination: string,
  limit: number = 3
): Promise<GoogleReviewData[]> {
  const cached = await getCachedGoogleReviews(accountId);
  if (!cached || cached.reviews.length === 0) return [];

  const visible = cached.reviews.filter((r) => r.is_visible !== false);
  const slug = cityOrDestination.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  // Match reviews by tag
  const matched = visible.filter((r) =>
    (r.tags || []).some((t) => slug.includes(t) || t.includes(slug))
  );

  // If we have enough matched reviews, return them
  if (matched.length >= limit) {
    return matched.slice(0, limit);
  }

  // Fill remaining slots with general reviews (no tags) or other reviews not already matched
  const matchedIds = new Set(matched.map((r) => r.review_id));
  const others = visible.filter((r) => !matchedIds.has(r.review_id));
  const combined = [...matched, ...others];
  return combined.slice(0, limit);
}
