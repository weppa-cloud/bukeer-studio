/**
 * Section Zod v4 schemas — extracted from web-public/lib/sections/schema.ts
 *
 * Source of truth for section content validation.
 * Used by: web-public section renderer, AI generators, MCP tools.
 */

import { z } from 'zod';

// ============================================================================
// Section Types Enum
// ============================================================================

export const SectionType = z.enum([
  'hero', 'hero_image', 'hero_video', 'hero_minimal',
  'text', 'rich_text', 'text_image', 'about',
  'features', 'features_grid',
  'destinations', 'hotels', 'activities', 'packages',
  'testimonials', 'testimonials_carousel', 'logo_cloud', 'logos_partners', 'partners',
  'stats', 'stats_counters', 'gallery', 'gallery_grid', 'gallery_carousel', 'gallery_masonry',
  'pricing', 'cta', 'cta_banner', 'newsletter',
  'faq', 'faq_accordion', 'contact', 'contact_form',
  'blog', 'blog_grid',
  'planners', 'team', 'travel_planners',
]);

export type SectionTypeValue = z.infer<typeof SectionType>;

// ============================================================================
// Safe Strings — XSS prevention
// ============================================================================

export const SafeString = z.string().max(10000).refine(
  (val) => !/<script|javascript:|on\w+\s*=/i.test(val),
  { message: 'Content contains potentially executable code' }
);

export const SafeTitle = z.string().max(200).refine(
  (val) => !/<script|javascript:|on\w+\s*=/i.test(val),
  { message: 'Title contains potentially executable code' }
);

const SafeUrl = z.string().max(2048).optional().refine((val) => {
  if (!val) return true;
  if (/^javascript:/i.test(val)) return false;
  if (val.startsWith('/')) return true;
  try {
    const parsed = new URL(val);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}, { message: 'Invalid URL' });

// ============================================================================
// Content Schemas by Section Type
// ============================================================================

export const HeroContentSchema = z.object({
  title: SafeTitle,
  subtitle: SafeString.optional(),
  ctaText: z.string().max(50).optional(),
  ctaUrl: SafeUrl,
  backgroundImage: z.string().url().optional(),
  // Immersive variant fields
  eyebrow: z.string().max(100).optional(),
  secondaryCtaText: z.string().max(50).optional(),
  secondaryCtaUrl: SafeUrl,
  secondaryCta: z.object({ text: z.string(), link: z.string() }).optional(),
  heroStats: z.array(z.object({
    num: z.string().max(20),
    label: z.string().max(50),
  })).max(5).optional(),
}).passthrough();

export const FeaturesContentSchema = z.object({
  title: SafeTitle.optional(),
  subtitle: SafeString.optional(),
  items: z.array(z.object({
    icon: z.string().max(50).optional(),
    title: SafeTitle,
    description: SafeString,
  })).max(12),
});

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

const TestimonialItemSchema = z.object({
  quote: SafeString.optional(),
  text: SafeString.optional(),
  content: SafeString.optional(),
  author: SafeTitle.optional(),
  name: SafeTitle.optional(),
  company: z.string().max(100).optional(),
  location: z.string().max(100).optional(),
  avatar: z.string().url().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  tour: z.string().max(100).optional(),
});

export const TestimonialsContentSchema = z.object({
  title: SafeTitle.optional(),
  items: z.array(TestimonialItemSchema).max(20).optional(),
  testimonials: z.array(TestimonialItemSchema).max(20).optional(),
}).refine(
  (data) => data.items || data.testimonials,
  { message: 'Either items or testimonials must be provided' }
);

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

export const CtaContentSchema = z.object({
  title: SafeTitle.optional(),
  subtitle: SafeString.optional(),
  text: SafeString.optional(),
  description: SafeString.optional(),
  buttonText: z.string().max(50).optional(),
  button_text: z.string().max(50).optional(),
  ctaText: z.string().max(50).optional(),
  cta_text: z.string().max(50).optional(),
  buttonUrl: SafeUrl,
  button_url: SafeUrl,
  ctaUrl: SafeUrl,
  cta_url: SafeUrl,
  href: SafeUrl,
  secondaryButtonText: z.string().max(50).optional(),
  secondaryButtonUrl: SafeUrl,
}).passthrough();

export const RichTextContentSchema = z.object({
  title: SafeTitle.optional(),
  text: SafeString.optional().default(''),
});

export const GalleryContentSchema = z.object({
  title: SafeTitle.optional(),
  images: z.array(z.object({
    src: z.string().url(),
    alt: z.string().max(200).optional(),
    caption: z.string().max(500).optional(),
  })).max(50),
});

export const ContactFormContentSchema = z.object({
  title: SafeTitle.optional(),
  subtitle: SafeString.optional(),
  successMessage: SafeString.optional(),
});

export const LogoCloudContentSchema = z.object({
  title: SafeTitle.optional(),
  logos: z.array(z.object({
    src: z.string().url(),
    alt: z.string().max(100),
    href: z.string().url().optional(),
  })).max(20),
});

export const BlogGridContentSchema = z.object({
  title: SafeTitle.optional(),
  subtitle: SafeString.optional(),
  showCategories: z.boolean().optional(),
  postsPerPage: z.number().int().min(1).max(24).optional(),
});

export const DestinationsContentSchema = z.object({
  title: SafeTitle.optional(),
  subtitle: SafeString.optional(),
  destinations: z.array(z.object({
    id: z.string(),
    name: SafeTitle,
    image: z.string().url().nullish(),
    description: SafeString.optional(),
    price: z.string().max(50).optional(),
  })).optional(),
});

export const HotelsContentSchema = z.object({
  title: SafeTitle.optional(),
  subtitle: SafeString.optional(),
  hotels: z.array(z.object({
    id: z.string(),
    name: SafeTitle,
    image: z.string().url().nullish(),
    description: SafeString.optional(),
    stars: z.number().int().min(1).max(5).optional(),
    price: z.string().max(50).optional(),
  })).optional(),
});

export const ActivitiesContentSchema = z.object({
  title: SafeTitle.optional(),
  subtitle: SafeString.optional(),
  activities: z.array(z.object({
    id: z.string(),
    name: SafeTitle,
    image: z.string().url().nullish(),
    description: SafeString.optional(),
    duration: z.string().max(50).optional(),
    price: z.string().max(50).optional(),
  })).optional(),
});

export const PackagesContentSchema = z.object({
  title: SafeTitle.optional(),
  subtitle: SafeString.optional(),
  packages: z.array(z.object({
    id: z.string(),
    name: SafeTitle,
    image: z.string().url().nullish(),
    destination: z.string().max(100).optional(),
    duration: z.string().max(50).optional(),
    price: z.string().max(50).optional(),
    description: SafeString.optional(),
    highlights: z.array(z.string().max(200)).max(5).optional(),
    servicesCount: z.number().int().min(0).optional(),
    category: z.string().max(50).optional(),
  })).optional(),
});

export const AboutContentSchema = z.object({
  title: SafeTitle.optional(),
  subtitle: SafeString.optional(),
  text: SafeString.optional(),
  image: z.string().url().nullish(),
  eyebrow: z.string().max(100).optional(),
  stats: z.array(z.object({
    value: z.string().max(20),
    label: SafeTitle,
  })).optional(),
  features: z.array(z.object({
    icon: z.string().max(50).optional(),
    title: SafeTitle,
    description: SafeString,
  })).max(8).optional(),
}).passthrough();

export const PartnersContentSchema = z.object({
  title: SafeTitle.optional(),
  partners: z.array(z.object({
    name: SafeTitle,
    logo: z.string().url().optional(),
    href: z.string().url().optional(),
  })).optional(),
});

export const NewsletterContentSchema = z.object({
  title: SafeTitle.optional(),
  subtitle: SafeString.optional(),
  buttonText: z.string().max(50).optional(),
  placeholder: z.string().max(100).optional(),
});

export const GenericContentSchema = z.record(z.string(), z.unknown());

// ============================================================================
// Section Config Schema
// ============================================================================

export const SectionConfigSchema = z.object({
  alignment: z.enum(['left', 'center', 'right']).optional(),
  columns: z.number().int().min(1).max(6).optional(),
  spacing: z.enum(['compact', 'normal', 'relaxed']).optional(),
  background: z.enum(['default', 'muted', 'primary', 'gradient']).optional(),
  container: z.enum(['full', 'wide', 'narrow']).optional(),
  animate: z.boolean().optional(),
  animation_type: z.enum(['fade', 'slide', 'scale']).optional(),
}).passthrough();

// ============================================================================
// Main Section Schema
// ============================================================================

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
