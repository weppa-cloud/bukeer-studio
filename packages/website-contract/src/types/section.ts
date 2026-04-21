/**
 * Section types — extracted from web-public/lib/supabase/get-website.ts
 * and web-public/lib/sections/schema.ts
 */

export interface WebsiteSection {
  id: string;
  section_type: string;
  variant: string;
  display_order: number;
  is_enabled: boolean;
  config: Record<string, unknown>;
  content: Record<string, unknown>;
  content_translations?: Record<string, Record<string, unknown>>;
}

export interface PageSection {
  id: string;
  type: string;
  variant?: string;
  content: Record<string, unknown>;
  config: Record<string, unknown>;
}

/**
 * All valid section types supported by the CMS.
 */
export type SectionTypeValue =
  // Hero sections
  | 'hero'
  | 'hero_image'
  | 'hero_video'
  | 'hero_minimal'
  // Content sections
  | 'text'
  | 'rich_text'
  | 'text_image'
  | 'about'
  // Feature sections
  | 'features'
  | 'features_grid'
  // Travel-specific sections
  | 'destinations'
  | 'hotels'
  | 'activities'
  | 'packages'
  // Social proof
  | 'testimonials'
  | 'testimonials_carousel'
  | 'logo_cloud'
  | 'logos_partners'
  | 'partners'
  // Data display
  | 'stats'
  | 'stats_counters'
  | 'gallery'
  | 'gallery_grid'
  | 'gallery_carousel'
  | 'gallery_masonry'
  // Conversion
  | 'pricing'
  | 'cta'
  | 'cta_banner'
  | 'newsletter'
  // Interactive
  | 'faq'
  | 'faq_accordion'
  | 'contact'
  | 'contact_form'
  // Blog
  | 'blog'
  | 'blog_grid'
  // Team / Planners
  | 'planners'
  | 'team'
  | 'travel_planners'
  // editorial-v1 exclusive home section — hand-drawn Colombia map + region chips.
  | 'explore_map';

export const SECTION_TYPES: SectionTypeValue[] = [
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
  'explore_map',
];
