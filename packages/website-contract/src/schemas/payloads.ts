/**
 * @bukeer/website-contract — Zod Schemas for Write DTOs
 *
 * Runtime validation for all website mutation payloads.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

const Slug = z.string().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Must be a valid URL slug (lowercase, hyphens only)');
const Subdomain = z.string().min(3).max(63).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Must be a valid subdomain');
const HexColor = z.string().regex(/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/);
const PageTypeEnum = z.enum(['category', 'static', 'custom', 'anchor', 'external']);
const HeaderModeEnum = z.enum(['default', 'minimal', 'none']);
const BlogStatusEnum = z.enum(['draft', 'published', 'scheduled']);
const WebsiteStatusEnum = z.enum(['draft', 'published']);
const LeadStatusEnum = z.enum(['new', 'contacted', 'converted', 'archived']);
const CategoryTypeEnum = z.enum(['destinations', 'hotels', 'activities', 'transfers', 'packages']);

// ---------------------------------------------------------------------------
// Website Schemas
// ---------------------------------------------------------------------------

export const WebsiteCreateSchema = z.object({
  name: z.string().min(1).max(200),
  subdomain: Subdomain,
  template_id: z.string().uuid().optional(),
  theme_preset: z.string().optional(),
});

export const WebsiteUpdateSchema = z.object({
  theme: z.object({
    tokens: z.record(z.string(), z.unknown()),
    profile: z.record(z.string(), z.unknown()),
  }).optional(),
  content: z.object({
    siteName: z.string().optional(),
    tagline: z.string().optional(),
    logo: z.string().optional(),
    logoLight: z.string().optional(),
    logoDark: z.string().optional(),
    locale: z.string().optional(),
    market_experience: z.object({
      switcher_style: z.enum(['compact', 'chips', 'segmented']).optional(),
      show_in_header: z.boolean().optional(),
      show_in_footer: z.boolean().optional(),
      show_language: z.boolean().optional(),
      show_currency: z.boolean().optional(),
    }).optional(),
    headerCta: z.object({
      label: z.string(),
      href: z.string(),
      variant: z.enum(['primary', 'outline', 'whatsapp']),
      icon: z.enum(['whatsapp', 'phone', 'mail', 'calendar']).optional(),
      enabled: z.boolean(),
    }).optional(),
    seo: z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      keywords: z.string().optional(),
    }).optional(),
    contact: z.object({
      email: z.string().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
    }).optional(),
    social: z.record(z.string(), z.string()).optional(),
  }).optional(),
  analytics: z.object({
    gtm_id: z.string().optional(),
    ga4_id: z.string().optional(),
    facebook_pixel_id: z.string().optional(),
    custom_head_scripts: z.string().optional(),
    custom_body_scripts: z.string().optional(),
  }).optional(),
  site_parts: z.record(z.string(), z.unknown()).optional(),
  featured_products: z.object({
    destinations: z.array(z.string()).optional(),
    hotels: z.array(z.string()).optional(),
    activities: z.array(z.string()).optional(),
    transfers: z.array(z.string()).optional(),
  }).optional(),
  status: WebsiteStatusEnum.optional(),
});

export const WebsitePublishSchema = z.object({
  website_id: z.string().uuid(),
  message: z.string().max(500).optional(),
});

// ---------------------------------------------------------------------------
// Page Schemas
// ---------------------------------------------------------------------------

const HeroConfigSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  backgroundImage: z.string().optional(),
}).optional();

const IntroContentSchema = z.object({
  text: z.string().optional(),
  highlights: z.array(z.string()).optional(),
}).optional();

const CtaConfigSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  buttonText: z.string().optional(),
  buttonLink: z.string().optional(),
}).optional();

export const PageCreateSchema = z.object({
  title: z.string().min(1).max(200),
  slug: Slug,
  page_type: PageTypeEnum,
  category_type: CategoryTypeEnum.optional(),
  sections: z.array(z.record(z.string(), z.unknown())).optional(),
  hero_config: HeroConfigSchema,
  intro_content: IntroContentSchema,
  cta_config: CtaConfigSchema,
  seo_title: z.string().max(70).optional(),
  seo_description: z.string().max(160).optional(),
  parent_page_id: z.string().uuid().optional(),
  header_mode: HeaderModeEnum.optional(),
  is_published: z.boolean().optional(),
});

export const PageUpdateSchema = PageCreateSchema.partial();

export const PageReorderSchema = z.object({
  page_ids: z.array(z.string().uuid()).min(1),
});

// ---------------------------------------------------------------------------
// Blog Schemas
// ---------------------------------------------------------------------------

export const BlogPostCreateSchema = z.object({
  title: z.string().min(1).max(300),
  content: z.string().optional(),
  excerpt: z.string().max(500).optional(),
  category_id: z.string().uuid().optional(),
  featured_image: z.string().url().optional(),
  status: BlogStatusEnum.optional(),
  seo_title: z.string().max(70).optional(),
  seo_description: z.string().max(160).optional(),
  seo_keywords: z.array(z.string()).optional(),
  published_at: z.string().datetime().optional(),
});

export const BlogPostUpdateSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  slug: Slug.optional(),
  content: z.string().optional(),
  excerpt: z.string().max(500).optional(),
  category_id: z.string().uuid().nullable().optional(),
  featured_image: z.string().url().nullable().optional(),
  status: BlogStatusEnum.optional(),
  seo_title: z.string().max(70).nullable().optional(),
  seo_description: z.string().max(160).nullable().optional(),
  seo_keywords: z.array(z.string()).nullable().optional(),
  published_at: z.string().datetime().nullable().optional(),
});

// ---------------------------------------------------------------------------
// Lead Query Schema
// ---------------------------------------------------------------------------

export const LeadQuerySchema = z.object({
  status: LeadStatusEnum.optional(),
  search: z.string().max(200).optional(),
  offset: z.number().int().min(0).default(0),
  limit: z.number().int().min(1).max(100).default(20),
});

// ---------------------------------------------------------------------------
// Theme Schema
// ---------------------------------------------------------------------------

export const ThemeUpdateSchema = z.object({
  tokens: z.record(z.string(), z.unknown()).refine(
    (t) => t.colors && typeof t.colors === 'object' && 'seedColor' in (t.colors as Record<string, unknown>),
    'tokens.colors.seedColor is required'
  ),
  profile: z.record(z.string(), z.unknown()),
});

// ---------------------------------------------------------------------------
// Error Code Schema
// ---------------------------------------------------------------------------

export const WebsiteErrorCodeEnum = z.enum([
  'SUBDOMAIN_TAKEN',
  'SUBDOMAIN_INVALID',
  'SUBDOMAIN_RESERVED',
  'THEME_INVALID',
  'THEME_WCAG_VIOLATION',
  'TEMPLATE_NOT_FOUND',
  'PAGE_SLUG_TAKEN',
  'PAGE_NOT_FOUND',
  'BLOG_SLUG_TAKEN',
  'BLOG_NOT_FOUND',
  'WEBSITE_NOT_FOUND',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'PUBLISH_VALIDATION_FAILED',
  'DOMAIN_ALREADY_CLAIMED',
  'DOMAIN_DNS_NOT_VERIFIED',
]);

// ---------------------------------------------------------------------------
// Inferred types (for consumers that prefer Zod inference)
// ---------------------------------------------------------------------------

export type WebsiteCreate = z.infer<typeof WebsiteCreateSchema>;
export type WebsiteUpdate = z.infer<typeof WebsiteUpdateSchema>;
export type WebsitePublish = z.infer<typeof WebsitePublishSchema>;
export type PageCreate = z.infer<typeof PageCreateSchema>;
export type PageUpdate = z.infer<typeof PageUpdateSchema>;
export type PageReorder = z.infer<typeof PageReorderSchema>;
export type BlogPostCreate = z.infer<typeof BlogPostCreateSchema>;
export type BlogPostUpdate = z.infer<typeof BlogPostUpdateSchema>;
export type LeadQuery = z.infer<typeof LeadQuerySchema>;
export type ThemeUpdate = z.infer<typeof ThemeUpdateSchema>;
