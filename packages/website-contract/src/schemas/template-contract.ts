/**
 * Template Contract v1 — Zod validation schemas.
 *
 * Validates the JSON stored in `website_templates.template_data`.
 * Theme validation is delegated to @bukeer/theme-sdk (not duplicated here).
 *
 * Spec: docs/specs/SPEC_TEMPLATE_CONTRACT_V1.md
 * Issue: #572, #573
 */

import { z } from 'zod';
import { SectionType } from './sections';

// ============================================================================
// Page Roles
// ============================================================================

export const PageRoleSchema = z.enum([
  'home', 'about', 'contact',
  'hotel_listing', 'hotel_detail',
  'activity_listing', 'activity_detail',
  'destination_listing',
  'package_listing',
  'blog_listing', 'blog_detail',
  'legal', 'custom',
]);

// ============================================================================
// Template Category
// ============================================================================

export const TemplateCategorySchema = z.enum([
  'adventure', 'luxury', 'tropical', 'corporate',
  'boutique', 'cultural', 'eco', 'romantic', 'custom',
]);

// ============================================================================
// Section Blueprint
// ============================================================================

export const SectionBlueprintConfigSchema = z.object({
  alignment: z.enum(['left', 'center', 'right']).optional(),
  columns: z.number().int().min(1).max(6).optional(),
  spacing: z.enum(['compact', 'normal', 'relaxed']).optional(),
  background: z.enum(['default', 'muted', 'primary', 'gradient']).optional(),
  container: z.enum(['full', 'wide', 'narrow']).optional(),
}).optional();

export const SectionBlueprintSchema = z.object({
  sectionType: SectionType,
  variant: z.string().max(50).optional(),
  isRequired: z.boolean(),
  purpose: z.string().max(300).optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  config: SectionBlueprintConfigSchema,
});

// ============================================================================
// Page Blueprint
// ============================================================================

export const PageBlueprintSchema = z.object({
  slug: z.string().max(50).regex(/^[a-z0-9-]+$/),
  routePattern: z.string().max(120).regex(/^\/[a-z0-9\-\/\[\]]+$/).optional(),
  title: z.string().max(100),
  role: PageRoleSchema,
  isRequired: z.boolean(),
  isAutoPopulated: z.boolean(),
  headerMode: z.enum(['default', 'minimal', 'none']),
  sections: z.array(SectionBlueprintSchema).min(1).max(12),
  seo: z.object({
    title: z.string().max(200),
    description: z.string().max(300),
    focusKeyword: z.string().max(100).optional(),
  }),
  dataSource: z.object({
    type: z.enum(['crm_hotels', 'crm_activities', 'crm_destinations', 'blog_posts']),
    displayMode: z.enum(['grid', 'list', 'carousel']),
    itemsPerPage: z.number().int().min(1).max(48).optional(),
  }).optional(),
  showInNav: z.boolean(),
  navLabel: z.string().max(50).optional(),
  navOrder: z.number().int().min(0),
});

// ============================================================================
// Detail Page Config (post-MVP)
// ============================================================================

export const DetailPageVariantSchema = z.enum([
  'gallery-hero', 'side-by-side', 'fullscreen-hero', 'classic',
]);

export const DetailPageConfigSchema = z.object({
  variant: DetailPageVariantSchema,
  showPricing: z.boolean(),
  showMap: z.boolean(),
  showGallery: z.boolean(),
  showRelated: z.boolean(),
  showReviews: z.boolean(),
  // Activity-specific
  showDuration: z.boolean().optional(),
  showDifficulty: z.boolean().optional(),
  // Hotel-specific
  showAmenities: z.boolean().optional(),
  showRoomTypes: z.boolean().optional(),
});

export const BlogDetailConfigSchema = z.object({
  showAuthor: z.boolean(),
  showRelatedPosts: z.boolean(),
  showNewsletter: z.boolean(),
});

export const DetailPagesSchema = z.object({
  hotel: DetailPageConfigSchema.optional(),
  activity: DetailPageConfigSchema.optional(),
  blog: BlogDetailConfigSchema.optional(),
}).optional();

// ============================================================================
// Template Contract v1
// ============================================================================

export const TemplateContractSchema = z.object({
  $schema: z.literal('bukeer-template-contract/v1'),

  metadata: z.object({
    name: z.string().max(100),
    slug: z.string().max(50).regex(/^[a-z0-9-]+$/),
    description: z.string().max(500),
    category: TemplateCategorySchema,
    thumbnail: z.string().url().optional(),
    tags: z.array(z.string().max(50)).max(10),
    isSystem: z.boolean(),
    isPublic: z.boolean(),
    authorAccountId: z.string().uuid().optional(),
  }),

  // Theme validation delegated to @bukeer/theme-sdk
  theme: z.object({
    tokens: z.record(z.string(), z.unknown()),
    profile: z.record(z.string(), z.unknown()),
  }),

  siteParts: z.object({
    header: z.object({
      variant: z.string(),
      blocks: z.array(z.string()),
      shrinkOnScroll: z.boolean(),
    }),
    footer: z.object({
      variant: z.string(),
      blocks: z.array(z.string()),
    }),
    mobileStickyBar: z.object({
      enabled: z.boolean(),
      buttons: z.array(z.unknown()),
    }).optional(),
  }),

  pages: z.array(PageBlueprintSchema).min(1).max(15),

  demoContent: z.object({
    siteName: z.string().max(100),
    tagline: z.string().max(200),
    seo: z.object({
      title: z.string(),
      description: z.string(),
      keywords: z.string(),
    }),
    contact: z.object({
      email: z.string(),
      phone: z.string(),
      address: z.string(),
    }),
    social: z.record(z.string(), z.string()).optional(),
  }),

  compatibility: z.object({
    supportedSections: z.array(SectionType),
    minSectionsPerPage: z.number().int().min(1),
    maxSectionsPerPage: z.number().int().max(20),
  }),

  brandVoice: z.object({
    tone: z.enum(['professional', 'friendly', 'luxurious', 'adventurous', 'trustworthy']),
    keywords: z.array(z.string().max(50)).max(15),
    ctaStyle: z.enum(['action', 'benefit', 'urgency', 'curiosity']),
  }),

  detailPages: DetailPagesSchema,

}).refine(
  (t) => t.pages.some(p => p.role === 'home' && p.isRequired),
  { message: 'Template must have a required home page' }
).refine(
  (t) => t.pages.every(p =>
    p.sections.every(s => t.compatibility.supportedSections.includes(s.sectionType as any))
  ),
  { message: 'All section types must be in compatibility.supportedSections' }
);

export type TemplateContractInput = z.input<typeof TemplateContractSchema>;
export type TemplateContractOutput = z.output<typeof TemplateContractSchema>;
