import { z } from 'zod';

// ============================================================================
// Section Types - Aligned with DB and section-renderer
// ============================================================================

/**
 * All valid section types supported by the CMS.
 * These map directly to Flutter's section_type values and the renderer's switch cases.
 */
export const SectionType = z.enum([
  // Hero sections
  'hero',
  'hero_image',

  // Content sections
  'text',
  'rich_text',

  // Feature sections
  'features',
  'features_grid',

  // Social proof
  'testimonials',
  'testimonials_carousel',
  'logo_cloud',

  // Data display
  'stats',
  'gallery',

  // Conversion
  'pricing',
  'cta',

  // Interactive
  'faq',
  'faq_accordion',
  'contact_form',

  // Blog
  'blog_grid',
]);

export type SectionTypeValue = z.infer<typeof SectionType>;

// ============================================================================
// Safe String - XSS Prevention
// ============================================================================

/**
 * String that is safe for rendering.
 * Rejects executable content patterns.
 */
export const SafeString = z.string().max(10000).refine(
  (val) => !/<script|javascript:|on\w+\s*=/i.test(val),
  { message: 'Content contains potentially executable code' }
);

/**
 * Short safe string for titles, labels, etc.
 */
export const SafeTitle = z.string().max(200).refine(
  (val) => !/<script|javascript:|on\w+\s*=/i.test(val),
  { message: 'Title contains potentially executable code' }
);

// ============================================================================
// Content Schemas by Section Type
// ============================================================================

// Hero section content
export const HeroContentSchema = z.object({
  title: SafeTitle,
  subtitle: SafeString.optional(),
  ctaText: z.string().max(50).optional(),
  ctaUrl: z.string().url().optional(),
  backgroundImage: z.string().url().optional(),
});

// Features section content
export const FeaturesContentSchema = z.object({
  title: SafeTitle.optional(),
  subtitle: SafeString.optional(),
  items: z.array(z.object({
    icon: z.string().max(50).optional(),
    title: SafeTitle,
    description: SafeString,
  })).max(12),
});

// Stats section content
export const StatsContentSchema = z.object({
  title: SafeTitle.optional(),
  items: z.array(z.object({
    value: z.string().max(20),
    label: SafeTitle,
    prefix: z.string().max(5).optional(),
    suffix: z.string().max(10).optional(),
  })).max(8),
});

// Testimonials section content
export const TestimonialsContentSchema = z.object({
  title: SafeTitle.optional(),
  items: z.array(z.object({
    quote: SafeString,
    author: SafeTitle,
    company: z.string().max(100).optional(),
    avatar: z.string().url().optional(),
    rating: z.number().int().min(1).max(5).optional(),
  })).max(20),
});

// Pricing section content
export const PricingContentSchema = z.object({
  title: SafeTitle.optional(),
  subtitle: SafeString.optional(),
  tiers: z.array(z.object({
    name: SafeTitle,
    price: z.string().max(50),
    period: z.string().max(20).optional(),
    description: SafeString.optional(),
    features: z.array(z.string().max(200)).max(15),
    ctaText: z.string().max(50).optional(),
    ctaUrl: z.string().url().optional(),
    highlighted: z.boolean().optional(),
  })).max(5),
});

// FAQ section content
export const FaqContentSchema = z.object({
  title: SafeTitle.optional(),
  items: z.array(z.object({
    question: SafeTitle,
    answer: SafeString,
  })).max(30),
});

// CTA section content
export const CtaContentSchema = z.object({
  title: SafeTitle,
  subtitle: SafeString.optional(),
  buttonText: z.string().max(50),
  buttonUrl: z.string().url(),
  secondaryButtonText: z.string().max(50).optional(),
  secondaryButtonUrl: z.string().url().optional(),
});

// Rich text / Text section content
export const RichTextContentSchema = z.object({
  title: SafeTitle.optional(),
  text: SafeString,
});

// Gallery section content
export const GalleryContentSchema = z.object({
  title: SafeTitle.optional(),
  images: z.array(z.object({
    src: z.string().url(),
    alt: z.string().max(200).optional(),
    caption: z.string().max(500).optional(),
  })).max(50),
});

// Contact form section content
export const ContactFormContentSchema = z.object({
  title: SafeTitle.optional(),
  subtitle: SafeString.optional(),
  successMessage: SafeString.optional(),
});

// Logo cloud section content
export const LogoCloudContentSchema = z.object({
  title: SafeTitle.optional(),
  logos: z.array(z.object({
    src: z.string().url(),
    alt: z.string().max(100),
    href: z.string().url().optional(),
  })).max(20),
});

// Blog grid section content
export const BlogGridContentSchema = z.object({
  title: SafeTitle.optional(),
  subtitle: SafeString.optional(),
  showCategories: z.boolean().optional(),
  postsPerPage: z.number().int().min(1).max(24).optional(),
});

// ============================================================================
// Section Config Schema
// ============================================================================

export const SectionConfigSchema = z.object({
  // Layout
  alignment: z.enum(['left', 'center', 'right']).optional(),
  columns: z.number().int().min(1).max(6).optional(),
  spacing: z.enum(['compact', 'normal', 'relaxed']).optional(),

  // Styling
  background: z.enum(['default', 'muted', 'primary', 'gradient']).optional(),
  container: z.enum(['full', 'wide', 'narrow']).optional(),

  // Animation
  animate: z.boolean().optional(),
  animation_type: z.enum(['fade', 'slide', 'scale']).optional(),
}).passthrough(); // Allow additional config properties

// ============================================================================
// Main Section Schema
// ============================================================================

/**
 * Complete section schema for validation.
 * Used by AI generator and section renderer.
 */
export const SectionSchema = z.object({
  id: z.string().uuid().optional(),
  section_type: SectionType,
  variant: z.string().max(50).optional(),
  display_order: z.number().int().min(0).optional(),
  is_enabled: z.boolean().default(true),
  config: SectionConfigSchema.optional(),
  content: z.record(z.string(), z.unknown()),
});

export type Section = z.infer<typeof SectionSchema>;

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates a section object.
 * Returns success with data or failure with errors.
 */
export function validateSection(input: unknown) {
  return SectionSchema.safeParse(input);
}

/**
 * Validates section content based on section type.
 * Provides type-specific validation.
 */
export function validateSectionContent(sectionType: SectionTypeValue, content: unknown) {
  switch (sectionType) {
    case 'hero':
    case 'hero_image':
      return HeroContentSchema.safeParse(content);
    case 'features':
    case 'features_grid':
      return FeaturesContentSchema.safeParse(content);
    case 'stats':
      return StatsContentSchema.safeParse(content);
    case 'testimonials':
    case 'testimonials_carousel':
      return TestimonialsContentSchema.safeParse(content);
    case 'pricing':
      return PricingContentSchema.safeParse(content);
    case 'faq':
    case 'faq_accordion':
      return FaqContentSchema.safeParse(content);
    case 'cta':
      return CtaContentSchema.safeParse(content);
    case 'text':
    case 'rich_text':
      return RichTextContentSchema.safeParse(content);
    case 'gallery':
      return GalleryContentSchema.safeParse(content);
    case 'contact_form':
      return ContactFormContentSchema.safeParse(content);
    case 'logo_cloud':
      return LogoCloudContentSchema.safeParse(content);
    case 'blog_grid':
      return BlogGridContentSchema.safeParse(content);
    default:
      // For unknown types, just validate as generic record
      return z.record(z.string(), z.unknown()).safeParse(content);
  }
}

/**
 * Validates a complete section with type-specific content validation.
 */
export function validateSectionComplete(input: unknown) {
  // First validate the base structure
  const baseResult = SectionSchema.safeParse(input);
  if (!baseResult.success) {
    return baseResult;
  }

  // Then validate content based on section type
  const contentResult = validateSectionContent(
    baseResult.data.section_type,
    baseResult.data.content
  );

  if (!contentResult.success) {
    return {
      success: false as const,
      error: contentResult.error,
    };
  }

  return {
    success: true as const,
    data: {
      ...baseResult.data,
      content: contentResult.data,
    },
  };
}
