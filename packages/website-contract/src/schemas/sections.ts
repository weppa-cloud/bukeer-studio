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
  // SEM landing page sections (2026 blueprint)
  'trust_bar', 'itinerary_accordion', 'inclusions_exclusions',
  'comparison_table', 'guarantee_badges', 'countdown_timer',
  // editorial-v1 exclusive home section — hand-drawn Colombia map + region chips.
  'explore_map',
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

const LocalizedAltSchema = z.record(z.string(), z.string().max(200));
const LocalizedCaptionSchema = z.record(z.string(), z.string().max(500));
const LocalizableAltSchema = z.union([z.string().max(200), LocalizedAltSchema]);
const LocalizableCaptionSchema = z.union([z.string().max(500), LocalizedCaptionSchema]);

// ============================================================================
// Content Schemas by Section Type
// ============================================================================

export const HeroContentSchema = z.object({
  title: SafeTitle,
  subtitle: SafeString.optional(),
  ctaText: z.string().max(50).optional(),
  ctaUrl: SafeUrl,
  backgroundImage: z.string().url().optional(),
  backgroundImageAlt: LocalizableAltSchema.optional(),
  imageAlt: LocalizableAltSchema.optional(),
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
  // Extended fields for video testimonials + geo/date context
  videoUrl: z.string().url().optional(),
  youtubeUrl: z.string().url().optional(),
  market: z.string().max(100).optional(),
  dateLabel: z.string().max(50).optional(),
}).passthrough();

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
  currency: z.string().max(10).optional(),
  anchorLabel: z.string().max(30).optional(),
  tiers: z.array(z.object({
    name: SafeTitle,
    price: z.string().max(50),
    period: z.string().max(20).optional(),
    perPerson: z.boolean().optional(),
    installments: z.string().max(80).optional(),
    description: SafeString.optional(),
    features: z.array(z.string().max(200)).max(15),
    ctaText: z.string().max(50).optional(),
    ctaUrl: z.string().url().optional(),
    highlighted: z.boolean().optional(),
    badge: z.string().max(40).optional(),
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
  text: SafeString.optional(),
  headline: SafeTitle.optional(),
  body: SafeString.optional(),
  eyebrow: z.string().max(100).optional(),
  image: z.string().url().optional(),
  imageAlt: LocalizableAltSchema.optional(),
  imageCaption: LocalizableCaptionSchema.optional(),
  imagePosition: z.enum(['left', 'right']).optional(),
  ctaText: z.string().max(50).optional(),
  ctaUrl: SafeUrl,
}).passthrough();

export const GalleryContentSchema = z.object({
  title: SafeTitle.optional(),
  images: z.array(z.object({
    src: z.string().url(),
    alt: LocalizableAltSchema.optional(),
    caption: LocalizableCaptionSchema.optional(),
    mediaAssetId: z.string().uuid().optional(),
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
    imageAlt: LocalizableAltSchema.optional(),
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

// ============================================================================
// SEM Landing Page Schemas (2026 blueprint)
// ============================================================================

export const TrustBarContentSchema = z.object({
  rating: z.object({
    score: z.number().min(0).max(5),
    count: z.number().int().min(0),
    source: z.string().max(50).optional(),
  }).optional(),
  certifications: z.array(z.object({
    name: z.string().max(80),
    logo: z.string().url().optional(),
  })).max(6).optional(),
  travelerCount: z.number().int().min(0).optional(),
  travelerLabel: z.string().max(50).optional(),
  sslBadge: z.boolean().optional(),
});

export const ItineraryDaySchema = z.object({
  dayNumber: z.number().int().min(1).max(30),
  title: SafeTitle,
  location: z.string().max(100).optional(),
  summary: SafeString,
  activities: z.array(z.string().max(300)).max(10),
  included: z.array(z.string().max(200)).max(8).optional(),
  image: z.string().url().optional(),
  night: z.string().max(100).optional(),
});

export const ItineraryAccordionContentSchema = z.object({
  title: SafeTitle.optional(),
  subtitle: SafeString.optional(),
  days: z.array(ItineraryDaySchema).min(1).max(30),
  schema: z.boolean().optional(),
});

export const InclusionsExclusionsContentSchema = z.object({
  title: SafeTitle.optional(),
  included: z.array(z.string().max(200)).min(1).max(30),
  excluded: z.array(z.string().max(200)).max(20),
  note: SafeString.optional(),
});

export const ComparisonTableContentSchema = z.object({
  title: SafeTitle.optional(),
  subtitle: SafeString.optional(),
  columns: z.array(z.object({
    label: z.string().max(60),
    highlighted: z.boolean().optional(),
  })).min(2).max(5),
  rows: z.array(z.object({
    feature: z.string().max(120),
    values: z.array(z.union([z.string().max(100), z.boolean()])),
  })).min(1).max(15),
});

export const GuaranteeBadgesContentSchema = z.object({
  title: SafeTitle.optional(),
  badges: z.array(z.object({
    icon: z.string().max(50),
    label: z.string().max(80),
    description: z.string().max(200).optional(),
  })).min(1).max(6),
});

export const CountdownTimerContentSchema = z.object({
  title: SafeTitle,
  targetDate: z.string().datetime(),
  mode: z.enum(['departure', 'offer']),
  ctaText: z.string().max(60).optional(),
  ctaUrl: SafeUrl,
  fallbackText: z.string().max(200).optional(),
}).refine(
  (data) => {
    if (data.mode === 'offer') {
      const diff = new Date(data.targetDate).getTime() - Date.now();
      return diff >= 24 * 60 * 60 * 1000;
    }
    return true;
  },
  { message: 'mode=offer requires targetDate at least 24 hours in the future' }
);

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
