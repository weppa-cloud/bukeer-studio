import { createClient } from '@supabase/supabase-js';
import type {
  WebsiteData,
  AnalyticsConfig,
  WebsiteContent,
  FeaturedProducts,
  WebsiteSection,
  BlogPost,
  BlogCategory,
  ThemeV3,
} from '@bukeer/website-contract';

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
};

// Create a Supabase client for server-side data fetching
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Get website data by subdomain
 * Uses RPC function for optimized query
 */
export async function getWebsiteBySubdomain(subdomain: string): Promise<WebsiteData | null> {
  try {
    const { data, error } = await supabase
      .rpc('get_website_by_subdomain', { p_subdomain: subdomain });

    if (error) {
      console.error('[getWebsiteBySubdomain] Error:', error);
      return null;
    }

    if (!data) return null;

    const website = data as WebsiteData;
    const featuredProducts = website.featured_products || {
      destinations: [],
      hotels: [],
      activities: [],
      transfers: [],
      packages: [],
    };

    return {
      ...website,
      featured_products: {
        destinations: featuredProducts.destinations || [],
        hotels: featuredProducts.hotels || [],
        activities: featuredProducts.activities || [],
        transfers: featuredProducts.transfers || [],
        packages: featuredProducts.packages || [],
      },
    };
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
  } = {}
): Promise<{ posts: BlogPost[]; total: number }> {
  try {
    const { data, error } = await supabase
      .rpc('get_website_blog_posts', {
        p_website_id: websiteId,
        p_limit: options.limit || 10,
        p_offset: options.offset || 0,
        p_category_slug: options.categorySlug || null,
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
  slug: string
): Promise<BlogPost | null> {
  try {
    const { data, error } = await supabase
      .from('website_blog_posts')
      .select(`
        *,
        category:website_blog_categories(*)
      `)
      .eq('website_id', websiteId)
      .eq('slug', slug)
      .eq('status', 'published')
      .is('deleted_at', null)
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
