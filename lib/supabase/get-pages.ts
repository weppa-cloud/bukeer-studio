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

    return {
      product: data.product as ProductData,
      page: data.page as ProductPageCustomization | undefined,
    };
  } catch (e) {
    console.error('[getProductPage] Exception:', e);
    return null;
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

    // Backward compatibility: tolerate array payloads during RPC cutover.
    if (Array.isArray(data)) {
      return { items: data as ProductData[], total: data.length };
    }

    const payload = data as { items?: unknown; total?: unknown };
    const items = Array.isArray(payload.items)
      ? (payload.items as ProductData[])
      : [];
    const total = typeof payload.total === 'number' ? payload.total : 0;

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

    const payload = data as { destinations?: DestinationData[] };
    return payload?.destinations || [];
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
