/**
 * Section Registry - Source of Truth for Section Types
 *
 * This file is the single source of truth for:
 * 1. Valid section types (VALID_SECTION_TYPES)
 * 2. Section type to component mapping (sectionComponents)
 *
 * IMPORTANT: Do NOT create manual lists of section types elsewhere.
 * Always derive from this registry.
 */

import dynamic from 'next/dynamic';
import type { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';

// ============================================================================
// Component Type Definition
// ============================================================================

export type SectionComponentProps = {
  section: WebsiteSection;
  website: WebsiteData;
};

export type SectionComponent = React.ComponentType<SectionComponentProps>;

// ============================================================================
// Above-fold Components - Eager load for LCP optimization
// ============================================================================

import { HeroSection } from '@/components/site/sections/hero-section';

// ============================================================================
// Below-fold Components - Lazy load with loading skeletons
// ============================================================================

// Loading skeleton for below-fold sections — branded compass loader
const SectionSkeleton = () => {
  const { SectionLoader } = require('@/components/ui/branded-loader');
  return <SectionLoader />;
};

const DestinationsSection = dynamic(
  () => import('@/components/site/sections/destinations-section').then((mod) => mod.DestinationsSection),
  { loading: SectionSkeleton }
);

const HotelsSection = dynamic(
  () => import('@/components/site/sections/hotels-section').then((mod) => mod.HotelsSection),
  { loading: SectionSkeleton }
);

const ActivitiesSection = dynamic(
  () => import('@/components/site/sections/activities-section').then((mod) => mod.ActivitiesSection),
  { loading: SectionSkeleton }
);

const PackagesSection = dynamic(
  () => import('@/components/site/sections/packages-section').then((mod) => mod.PackagesSection),
  { loading: SectionSkeleton }
);

const TestimonialsSection = dynamic(
  () => import('@/components/site/sections/testimonials-section').then((mod) => mod.TestimonialsSection),
);

const AboutSection = dynamic(
  () => import('@/components/site/sections/about-section').then((mod) => mod.AboutSection),
  { loading: SectionSkeleton }
);

const ContactSection = dynamic(
  () => import('@/components/site/sections/contact-section').then((mod) => mod.ContactSection),
  { loading: SectionSkeleton }
);

const CtaSection = dynamic(
  () => import('@/components/site/sections/cta-section').then((mod) => mod.CtaSection),
  { loading: SectionSkeleton }
);

const StatsSection = dynamic(
  () => import('@/components/site/sections/stats-section').then((mod) => mod.StatsSection),
  { loading: SectionSkeleton }
);

const PartnersSection = dynamic(
  () => import('@/components/site/sections/partners-section').then((mod) => mod.PartnersSection),
  { loading: SectionSkeleton }
);

const FaqSection = dynamic(
  () => import('@/components/site/sections/faq-section').then((mod) => mod.FaqSection),
  { loading: SectionSkeleton }
);

const BlogSection = dynamic(
  () => import('@/components/site/sections/blog-section').then((mod) => mod.BlogSection),
  { loading: SectionSkeleton }
);

const TextImageSection = dynamic(
  () => import('@/components/site/sections/text-image-section').then((mod) => mod.TextImageSection),
  { loading: SectionSkeleton }
);

const FeaturesGridSection = dynamic(
  () => import('@/components/site/sections/features-grid-section').then((mod) => mod.FeaturesGridSection),
  { loading: SectionSkeleton }
);

const GallerySection = dynamic(
  () => import('@/components/site/sections/gallery-section').then((mod) => mod.GallerySection),
  { loading: SectionSkeleton }
);

const NewsletterSection = dynamic(
  () => import('@/components/site/sections/newsletter-section').then((mod) => mod.NewsletterSection),
  { loading: SectionSkeleton }
);

const PlannersSection = dynamic(
  () => import('@/components/site/sections/planners-section').then((mod) => mod.PlannersSection),
  { loading: SectionSkeleton }
);

// ============================================================================
// Section Components Registry
// ============================================================================

/**
 * Map of section types to their React components.
 * This is the SINGLE SOURCE OF TRUTH for valid section types.
 *
 * To add a new section type:
 * 1. Create the component in components/site/sections/
 * 2. Add the dynamic import above
 * 3. Add the mapping here
 */
export const sectionComponents: Record<string, SectionComponent> = {
  // Homepage sections
  hero: HeroSection,
  destinations: DestinationsSection,
  hotels: HotelsSection,
  activities: ActivitiesSection,
  packages: PackagesSection,
  testimonials: TestimonialsSection,
  about: AboutSection,
  contact: ContactSection,
  cta: CtaSection,
  stats: StatsSection,
  partners: PartnersSection,
  faq: FaqSection,
  blog: BlogSection,

  // Page Builder sections - Hero variants
  hero_image: HeroSection,
  hero_video: HeroSection,
  hero_minimal: HeroSection,

  // Page Builder sections - Content
  text: TextImageSection,           // Text-only section (uses TextImageSection)
  rich_text: TextImageSection,      // Rich text section (uses TextImageSection)
  text_image: TextImageSection,
  features: FeaturesGridSection,    // Features list (uses FeaturesGridSection)
  features_grid: FeaturesGridSection,
  faq_accordion: FaqSection,

  // Page Builder sections - Gallery
  gallery: GallerySection,          // Generic gallery
  gallery_grid: GallerySection,
  gallery_carousel: GallerySection,
  gallery_masonry: GallerySection,

  // Page Builder sections - Social Proof
  testimonials_carousel: TestimonialsSection,
  logos_partners: PartnersSection,
  logo_cloud: PartnersSection,      // Alias for logos_partners
  stats_counters: StatsSection,

  // Page Builder sections - Conversion
  cta_banner: CtaSection,
  contact_form: ContactSection,
  newsletter: NewsletterSection,

  // Travel Planners / Team
  planners: PlannersSection,
  team: PlannersSection,
  travel_planners: PlannersSection,

  // Pricing (schema supports it)
  pricing: CtaSection,              // Use CTA for now, create PricingSection later

  // Blog
  blog_grid: BlogSection,
};

// ============================================================================
// Derived Constants
// ============================================================================

/**
 * List of all valid section types.
 * Derived from sectionComponents to ensure consistency.
 *
 * Use this for:
 * - Validating section types from DB/API
 * - AI firewall (filtering unknown types)
 * - Type guards
 */
export const VALID_SECTION_TYPES = Object.keys(sectionComponents) as SectionType[];

/**
 * Type for valid section type strings.
 */
export type SectionType = keyof typeof sectionComponents;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a string is a valid section type.
 */
export function isValidSectionType(type: string): type is SectionType {
  return type in sectionComponents;
}

/**
 * Get the component for a section type.
 * Returns undefined if the type is not valid.
 */
export function getSectionComponent(type: string): SectionComponent | undefined {
  return sectionComponents[type];
}

/**
 * Get section types grouped by category.
 * Useful for UI selection menus.
 */
export const sectionTypesByCategory = {
  homepage: ['hero', 'destinations', 'hotels', 'activities', 'packages', 'testimonials', 'about', 'contact', 'cta', 'stats', 'partners', 'faq', 'blog'],
  heroVariants: ['hero_image', 'hero_video', 'hero_minimal'],
  content: ['text_image', 'features_grid', 'faq_accordion'],
  gallery: ['gallery_grid', 'gallery_carousel', 'gallery_masonry'],
  socialProof: ['testimonials_carousel', 'logos_partners', 'stats_counters'],
  conversion: ['cta_banner', 'contact_form', 'newsletter'],
} as const;
