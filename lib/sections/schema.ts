/**
 * Section schemas — re-exported from @bukeer/website-contract (Strangler migration)
 *
 * This file previously defined all schemas inline. Now it re-exports from the
 * shared contract package. Data fetching functions remain in web-public.
 */

// Re-export everything from contract schemas
export {
  SectionType,
  SafeString,
  SafeTitle,
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
  AboutContentSchema,
  PartnersContentSchema,
  NewsletterContentSchema,
  GenericContentSchema,
  SectionConfigSchema,
  SectionSchema,
} from '@bukeer/website-contract';

export type { SectionTypeValue, Section } from '@bukeer/website-contract';

export {
  validateSection,
  validateSectionContent,
  validateSectionComplete,
} from '@bukeer/website-contract';
