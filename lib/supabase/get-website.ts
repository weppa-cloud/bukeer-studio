import { createClient } from '@supabase/supabase-js';
import type { M3Theme } from '../theme/m3-theme-provider';

// Create a Supabase client for server-side data fetching
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Analytics configuration for tracking integrations
 */
export interface AnalyticsConfig {
  gtm_id?: string;             // Google Tag Manager ID (GTM-XXXXXX)
  ga4_id?: string;             // Google Analytics 4 ID (G-XXXXXXXXXX)
  facebook_pixel_id?: string;  // Facebook Pixel ID
  custom_head_scripts?: string; // Custom scripts for <head>
  custom_body_scripts?: string; // Custom scripts for <body>
}

export interface WebsiteData {
  id: string;
  account_id: string | null;
  subdomain: string;
  custom_domain: string | null;
  status: 'draft' | 'published';
  template_id: string;
  theme: M3Theme;
  content: {
    siteName: string;
    tagline: string;
    logo?: string;
    seo: {
      title: string;
      description: string;
      keywords: string;
    };
    contact: {
      email: string;
      phone: string;
      address: string;
    };
    social: {
      facebook?: string;
      instagram?: string;
      twitter?: string;
      youtube?: string;
      linkedin?: string;
      tiktok?: string;
      whatsapp?: string;
    };
    // Datos reales de la cuenta (inyectados por RPC)
    account?: {
      name: string;
      logo: string | null;
      email: string | null;
      phone: string | null;
      phone2: string | null;
      website: string | null;
      location: string | null;
    };
  };
  analytics?: AnalyticsConfig;
  featured_products: {
    destinations: string[];
    hotels: string[];
    activities: string[];
  };
  sections: WebsiteSection[];
}

export interface WebsiteSection {
  id: string;
  section_type: string;
  variant: string;
  display_order: number;
  is_enabled: boolean;
  config: Record<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: Record<string, any>;
}

export interface BlogPost {
  id: string;
  website_id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featured_image: string | null;
  category_id: string | null;
  status: 'draft' | 'published' | 'scheduled';
  published_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  category?: BlogCategory;
}

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
}

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

    return data as WebsiteData;
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
      .single();

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
      .eq('status', 'published');

    if (error) {
      console.error('[getAllBlogSlugs] Error:', error);
      return [];
    }

    return data.map(p => p.slug);
  } catch (e) {
    console.error('[getAllBlogSlugs] Exception:', e);
    return [];
  }
}
