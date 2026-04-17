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

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const PRODUCT_PAGE_CACHE_TTL_MS = Number(process.env.PRODUCT_PAGE_CACHE_TTL_MS || 5 * 60 * 1000);
const productPageCache = new Map<string, { value: ProductPageData; expiresAt: number }>();

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
 * Get a product page with product data
 */
export async function getProductPage(
  subdomain: string,
  productType: string,
  productSlug: string
): Promise<ProductPageData | null> {
  try {
    const cacheKey = `${subdomain.toLowerCase()}::${productType.toLowerCase()}::${productSlug.toLowerCase()}`;
    const cached = productPageCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
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

    productPageCache.set(cacheKey, {
      value: result,
      expiresAt: Date.now() + PRODUCT_PAGE_CACHE_TTL_MS,
    });

    return result;
  } catch (e) {
    console.error('[getProductPage] Exception:', e);
    return null;
  }
}

// Alias kept for backwards compatibility with callers that still use "BySlug" naming.
export const getProductPageBySlug = getProductPage;

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
  } = {}
): Promise<CategoryProducts> {
  try {
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
      return {
        items: parsed.data.items as ProductData[],
        total: Number(parsed.data.total),
      };
    }

    logProductV2ParseWarning('getCategoryProducts', normalizedPayload, parsed.error.issues);

    const payload = normalizedPayload as { items?: unknown; total?: unknown };
    const items = Array.isArray(payload.items)
      ? (payload.items as ProductData[])
      : [];
    const total = typeof payload.total === 'number'
      ? payload.total
      : Number(payload.total) || 0;

    return { items, total };
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
