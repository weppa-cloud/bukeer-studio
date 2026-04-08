/**
 * Section validation — type-specific content validation
 */

import type { SectionTypeValue } from '../schemas/sections';
import {
  SectionSchema,
  HeroContentSchema,
  FeaturesContentSchema,
  StatsContentSchema,
  TestimonialsContentSchema,
  PricingContentSchema,
  FaqContentSchema,
  CtaContentSchema,
  RichTextContentSchema,
  GalleryContentSchema,
  ContactFormContentSchema,
  LogoCloudContentSchema,
  BlogGridContentSchema,
  DestinationsContentSchema,
  HotelsContentSchema,
  ActivitiesContentSchema,
  PackagesContentSchema,
  AboutContentSchema,
  PartnersContentSchema,
  NewsletterContentSchema,
  GenericContentSchema,
} from '../schemas/sections';

/**
 * Validates a section object (base structure only).
 */
export function validateSection(input: unknown) {
  return SectionSchema.safeParse(input);
}

/**
 * Validates section content based on section type.
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
    case 'destinations':
      return DestinationsContentSchema.safeParse(content);
    case 'hotels':
      return HotelsContentSchema.safeParse(content);
    case 'activities':
      return ActivitiesContentSchema.safeParse(content);
    case 'packages':
      return PackagesContentSchema.safeParse(content);
    case 'about':
      return AboutContentSchema.safeParse(content);
    case 'partners':
      return PartnersContentSchema.safeParse(content);
    case 'newsletter':
      return NewsletterContentSchema.safeParse(content);
    default:
      return GenericContentSchema.safeParse(content);
  }
}

/**
 * Validates a complete section with type-specific content validation.
 */
export function validateSectionComplete(input: unknown) {
  const baseResult = SectionSchema.safeParse(input);
  if (!baseResult.success) {
    return baseResult;
  }

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
