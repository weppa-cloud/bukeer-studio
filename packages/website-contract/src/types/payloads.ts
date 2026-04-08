/**
 * @bukeer/website-contract — Write DTOs (Payloads)
 *
 * Typed payloads for all website mutation operations.
 * Used by: Next.js admin dashboard, API routes, MCP tools.
 */

import type { ThemeV3 } from './theme';
import type { WebsiteContent, AnalyticsConfig, FeaturedProducts } from './website';
import type { SiteParts } from './site-parts';
import type { PageSection } from './section';
import type { PageType, HeaderMode } from './page';

// ---------------------------------------------------------------------------
// Website Payloads
// ---------------------------------------------------------------------------

export interface WebsiteCreatePayload {
  name: string;
  subdomain: string;
  template_id?: string;
  theme_preset?: string;
}

export interface WebsiteUpdatePayload {
  theme?: ThemeV3;
  content?: Partial<WebsiteContent>;
  analytics?: Partial<AnalyticsConfig>;
  site_parts?: Partial<SiteParts>;
  featured_products?: Partial<FeaturedProducts>;
  status?: 'draft' | 'published';
}

export interface WebsitePublishPayload {
  website_id: string;
  message?: string;
}

// ---------------------------------------------------------------------------
// Page Payloads
// ---------------------------------------------------------------------------

export interface PageCreatePayload {
  title: string;
  slug: string;
  page_type: PageType;
  category_type?: 'destinations' | 'hotels' | 'activities' | 'transfers' | 'packages';
  sections?: PageSection[];
  hero_config?: {
    title?: string;
    subtitle?: string;
    backgroundImage?: string;
  };
  intro_content?: {
    text?: string;
    highlights?: string[];
  };
  cta_config?: {
    title?: string;
    subtitle?: string;
    buttonText?: string;
    buttonLink?: string;
  };
  seo_title?: string;
  seo_description?: string;
  parent_page_id?: string;
  header_mode?: HeaderMode;
  is_published?: boolean;
}

export interface PageUpdatePayload {
  title?: string;
  slug?: string;
  page_type?: PageType;
  sections?: PageSection[];
  hero_config?: {
    title?: string;
    subtitle?: string;
    backgroundImage?: string;
  };
  intro_content?: {
    text?: string;
    highlights?: string[];
  };
  cta_config?: {
    title?: string;
    subtitle?: string;
    buttonText?: string;
    buttonLink?: string;
  };
  seo_title?: string;
  seo_description?: string;
  parent_page_id?: string | null;
  header_mode?: HeaderMode;
  is_published?: boolean;
}

export interface PageReorderPayload {
  page_ids: string[];
}

// ---------------------------------------------------------------------------
// Blog Payloads
// ---------------------------------------------------------------------------

export interface BlogPostCreatePayload {
  title: string;
  content?: string;
  excerpt?: string;
  category_id?: string;
  featured_image?: string;
  status?: 'draft' | 'published' | 'scheduled';
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string[];
  published_at?: string;
}

export interface BlogPostUpdatePayload {
  title?: string;
  slug?: string;
  content?: string;
  excerpt?: string;
  category_id?: string | null;
  featured_image?: string | null;
  status?: 'draft' | 'published' | 'scheduled';
  seo_title?: string | null;
  seo_description?: string | null;
  seo_keywords?: string[] | null;
  published_at?: string | null;
}

// ---------------------------------------------------------------------------
// Lead / Quote Query
// ---------------------------------------------------------------------------

export interface LeadQueryParams {
  status?: 'new' | 'contacted' | 'converted' | 'archived';
  search?: string;
  offset?: number;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Theme Payload
// ---------------------------------------------------------------------------

export interface ThemeUpdatePayload {
  tokens: Record<string, unknown>;
  profile: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Error Codes
// ---------------------------------------------------------------------------

export type WebsiteErrorCode =
  | 'SUBDOMAIN_TAKEN'
  | 'SUBDOMAIN_INVALID'
  | 'SUBDOMAIN_RESERVED'
  | 'THEME_INVALID'
  | 'THEME_WCAG_VIOLATION'
  | 'TEMPLATE_NOT_FOUND'
  | 'PAGE_SLUG_TAKEN'
  | 'PAGE_NOT_FOUND'
  | 'BLOG_SLUG_TAKEN'
  | 'BLOG_NOT_FOUND'
  | 'WEBSITE_NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'PUBLISH_VALIDATION_FAILED'
  | 'DOMAIN_ALREADY_CLAIMED'
  | 'DOMAIN_DNS_NOT_VERIFIED';

export interface WebsiteError {
  code: WebsiteErrorCode;
  message: string;
  details?: Record<string, unknown>;
}
