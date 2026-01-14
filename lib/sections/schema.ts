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
  'hero_video',
  'hero_minimal',

  // Content sections
  'text',
  'rich_text',
  'text_image',
  'about',

  // Feature sections
  'features',
  'features_grid',

  // Travel-specific sections
  'destinations',
  'hotels',
  'activities',

  // Social proof
  'testimonials',
  'testimonials_carousel',
  'logo_cloud',
  'logos_partners',
  'partners',

  // Data display
  'stats',
  'stats_counters',
  'gallery',
  'gallery_grid',
  'gallery_carousel',
  'gallery_masonry',

  // Conversion
  'pricing',
  'cta',
  'cta_banner',
  'newsletter',

  // Interactive
  'faq',
  'faq_accordion',
  'contact',
  'contact_form',

  // Blog
  'blog',
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
  ctaUrl: z
    .string()
    .max(2048)
    .optional()
    .refine((val) => {
      if (!val) return true;
      if (/^javascript:/i.test(val)) return false;
      if (val.startsWith('/')) return true;
      try {
        // Accept only absolute http(s) URLs
        const parsed = new URL(val);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        return false;
      }
    }, { message: 'Invalid CTA URL' }),
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
// Accepts both 'items' (schema standard) and 'stats' (DB field name)
export const StatsContentSchema = z.object({
  title: SafeTitle.optional(),
  items: z.array(z.object({
    value: z.string().max(20),
    label: SafeTitle,
    prefix: z.string().max(5).optional(),
    suffix: z.string().max(10).optional(),
  })).max(8).optional(),
  stats: z.array(z.object({
    value: z.string().max(20),
    label: SafeTitle,
    prefix: z.string().max(5).optional(),
    suffix: z.string().max(10).optional(),
  })).max(8).optional(),
}).refine(
  (data) => data.items || data.stats,
  { message: 'Either items or stats must be provided' }
);

// Testimonials section content
// Accepts both 'items' (schema standard) and 'testimonials' (DB field name)
const TestimonialItemSchema = z.object({
  quote: SafeString.optional(),
  text: SafeString.optional(), // Alternative field name
  content: SafeString.optional(), // Another alternative
  author: SafeTitle.optional(),
  name: SafeTitle.optional(), // Alternative field name
  company: z.string().max(100).optional(),
  location: z.string().max(100).optional(),
  avatar: z.string().url().optional(),
  rating: z.number().int().min(1).max(5).optional(),
});

export const TestimonialsContentSchema = z.object({
  title: SafeTitle.optional(),
  items: z.array(TestimonialItemSchema).max(20).optional(),
  testimonials: z.array(TestimonialItemSchema).max(20).optional(),
}).refine(
  (data) => data.items || data.testimonials,
  { message: 'Either items or testimonials must be provided' }
);

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
// Accepts both 'items' (schema standard) and 'faqs'/'questions' (DB field names)
const FaqItemSchema = z.object({
  question: SafeTitle,
  answer: SafeString,
});

export const FaqContentSchema = z.object({
  title: SafeTitle.optional(),
  items: z.array(FaqItemSchema).max(30).optional(),
  faqs: z.array(FaqItemSchema).max(30).optional(),
  questions: z.array(FaqItemSchema).max(30).optional(),
}).refine(
  (data) => data.items || data.faqs || data.questions,
  { message: 'Either items, faqs, or questions must be provided' }
);

// CTA section content
// More flexible schema to handle various DB field names
export const CtaContentSchema = z.object({
  title: SafeTitle.optional(),
  subtitle: SafeString.optional(),
  text: SafeString.optional(), // Alternative
  description: SafeString.optional(), // Alternative
  // Primary button (various field names)
  buttonText: z.string().max(50).optional(),
  button_text: z.string().max(50).optional(),
  ctaText: z.string().max(50).optional(),
  cta_text: z.string().max(50).optional(),
  // Primary button URL
  buttonUrl: z.string().url().optional(),
  button_url: z.string().url().optional(),
  ctaUrl: z.string().url().optional(),
  cta_url: z.string().url().optional(),
  href: z.string().url().optional(),
  // Secondary button
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

// Destinations section content
export const DestinationsContentSchema = z.object({
  title: SafeTitle.optional(),
  subtitle: SafeString.optional(),
  destinations: z.array(z.object({
    id: z.string(),
    name: SafeTitle,
    image: z.string().url().optional(),
    description: SafeString.optional(),
    price: z.string().max(50).optional(),
  })).optional(),
});

// Hotels section content
export const HotelsContentSchema = z.object({
  title: SafeTitle.optional(),
  subtitle: SafeString.optional(),
  hotels: z.array(z.object({
    id: z.string(),
    name: SafeTitle,
    image: z.string().url().optional(),
    description: SafeString.optional(),
    stars: z.number().int().min(1).max(5).optional(),
    price: z.string().max(50).optional(),
  })).optional(),
});

// Activities section content
export const ActivitiesContentSchema = z.object({
  title: SafeTitle.optional(),
  subtitle: SafeString.optional(),
  activities: z.array(z.object({
    id: z.string(),
    name: SafeTitle,
    image: z.string().url().optional(),
    description: SafeString.optional(),
    duration: z.string().max(50).optional(),
    price: z.string().max(50).optional(),
  })).optional(),
});

// About section content
export const AboutContentSchema = z.object({
  title: SafeTitle.optional(),
  subtitle: SafeString.optional(),
  text: SafeString.optional(),
  image: z.string().url().optional(),
  stats: z.array(z.object({
    value: z.string().max(20),
    label: SafeTitle,
  })).optional(),
});

// Partners section content
export const PartnersContentSchema = z.object({
  title: SafeTitle.optional(),
  partners: z.array(z.object({
    name: SafeTitle,
    logo: z.string().url().optional(),
    href: z.string().url().optional(),
  })).optional(),
});

// Newsletter section content
export const NewsletterContentSchema = z.object({
  title: SafeTitle.optional(),
  subtitle: SafeString.optional(),
  buttonText: z.string().max(50).optional(),
  placeholder: z.string().max(100).optional(),
});

// Generic section content (fallback)
export const GenericContentSchema = z.record(z.string(), z.unknown());

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
    case 'hero_video':
    case 'hero_minimal':
      return HeroContentSchema.safeParse(content);
    case 'features':
    case 'features_grid':
      return FeaturesContentSchema.safeParse(content);
    case 'stats':
    case 'stats_counters':
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
    case 'cta_banner':
      return CtaContentSchema.safeParse(content);
    case 'text':
    case 'rich_text':
    case 'text_image':
      return RichTextContentSchema.safeParse(content);
    case 'gallery':
    case 'gallery_grid':
    case 'gallery_carousel':
    case 'gallery_masonry':
      return GalleryContentSchema.safeParse(content);
    case 'contact':
    case 'contact_form':
      return ContactFormContentSchema.safeParse(content);
    case 'logo_cloud':
    case 'logos_partners':
      return LogoCloudContentSchema.safeParse(content);
    case 'blog':
    case 'blog_grid':
      return BlogGridContentSchema.safeParse(content);
    // Travel-specific sections
    case 'destinations':
      return DestinationsContentSchema.safeParse(content);
    case 'hotels':
      return HotelsContentSchema.safeParse(content);
    case 'activities':
      return ActivitiesContentSchema.safeParse(content);
    case 'about':
      return AboutContentSchema.safeParse(content);
    case 'partners':
      return PartnersContentSchema.safeParse(content);
    case 'newsletter':
      return NewsletterContentSchema.safeParse(content);
    default:
      // For unknown types, just validate as generic record
      return GenericContentSchema.safeParse(content);
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
