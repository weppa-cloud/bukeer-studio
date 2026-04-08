/**
 * Template Contract v1 — Full website blueprint types.
 *
 * Defines the shape of `website_templates.template_data` JSONB.
 * A template contract packages theme + chrome + pages + demo content
 * into a single validated structure that hydrates a complete website.
 *
 * Spec: docs/specs/SPEC_TEMPLATE_CONTRACT_V1.md
 * Issue: #572, #573
 */

import type { ThemeV3 } from './theme';
import type { SiteParts } from './site-parts';
import type { SectionTypeValue } from './section';

// ============================================================================
// Page Roles — semantic purpose of each page
// ============================================================================

export type PageRole =
  | 'home'                // Landing principal (always required)
  | 'about'               // Company story
  | 'contact'             // Contact form (always required)
  | 'hotel_listing'       // Grid of hotels (auto-populated from CRM)
  | 'hotel_detail'        // Single hotel (auto-generated per product)
  | 'activity_listing'    // Grid of activities (auto-populated from CRM)
  | 'activity_detail'     // Single activity (auto-generated per product)
  | 'destination_listing' // Grid of destinations
  | 'package_listing'     // Grid of packages (auto-populated from CRM)
  | 'blog_listing'        // Blog index (auto-populated from CMS)
  | 'blog_detail'         // Single blog post (auto-generated per post)
  | 'legal'               // Terms, privacy, cancellation
  | 'custom';             // Free-form page

// ============================================================================
// Section Blueprint — recipe for one section in a page
// ============================================================================

export interface SectionBlueprint {
  sectionType: SectionTypeValue;           // Validated against section-registry
  variant?: string;
  isRequired: boolean;                     // Can't be removed from page
  purpose?: string;                        // "Showcase featured hotels" (optional, AI enrichment)
  content?: Record<string, unknown>;       // Pre-filled demo content
  config?: SectionBlueprintConfig;
}

export interface SectionBlueprintConfig {
  alignment?: 'left' | 'center' | 'right';
  columns?: number;
  spacing?: 'compact' | 'normal' | 'relaxed';
  background?: 'default' | 'muted' | 'primary' | 'gradient';
  container?: 'full' | 'wide' | 'narrow';
}

// ============================================================================
// Page Blueprint — recipe for one page
// ============================================================================

export interface PageBlueprint {
  slug: string;                            // URL segment: 'nosotros', 'hoteles'
  routePattern?: string;                   // Optional dynamic pattern: '/destinos/[slug]'
  title: string;                           // Display name
  role: PageRole;                          // Semantic role
  isRequired: boolean;                     // Can't delete from template
  isAutoPopulated: boolean;                // Sections fill from CRM/CMS data

  // Layout
  headerMode: 'default' | 'minimal' | 'none';
  sections: SectionBlueprint[];            // Ordered section list

  // SEO
  seo: {
    title: string;                         // Literal or pattern: "{siteName} — {pageTitle}"
    description: string;                   // Meta description
    focusKeyword?: string;                 // Primary SEO keyword (optional, AI enrichment)
  };

  // Data source (for auto-populated pages)
  dataSource?: {
    type: 'crm_hotels' | 'crm_activities' | 'crm_destinations' | 'blog_posts';
    displayMode: 'grid' | 'list' | 'carousel';
    itemsPerPage?: number;
  };

  // Navigation
  showInNav: boolean;
  navLabel?: string;                       // Override title in nav
  navOrder: number;
}

// ============================================================================
// Detail Page Config — lightweight layout for auto-generated pages
// ============================================================================
// Decision: Option C (Hybrid) — variant + feature flags, NOT full sections.
// MVP: optional field, ignored by product-landing-page.tsx
// Post-MVP: product-landing-page.tsx reads config to select variant

export type DetailPageVariant =
  | 'gallery-hero'        // Full-width gallery above fold
  | 'side-by-side'        // Image left, info right
  | 'fullscreen-hero'     // Immersive hero with overlay text
  | 'classic';            // Standard top-down layout (default)

export interface DetailPageConfig {
  variant: DetailPageVariant;
  showPricing: boolean;
  showMap: boolean;
  showGallery: boolean;
  showRelated: boolean;
  showReviews: boolean;
  // Activity-specific
  showDuration?: boolean;
  showDifficulty?: boolean;
  // Hotel-specific
  showAmenities?: boolean;
  showRoomTypes?: boolean;
}

export interface BlogDetailConfig {
  showAuthor: boolean;
  showRelatedPosts: boolean;
  showNewsletter: boolean;
}

export interface DetailPages {
  hotel?: DetailPageConfig;
  activity?: DetailPageConfig;
  blog?: BlogDetailConfig;
}

// ============================================================================
// Template Contract v1 — the full "theme" package
// ============================================================================

export interface TemplateContract {
  $schema: 'bukeer-template-contract/v1';

  // Metadata (stored in table columns, NOT inside template_data JSON)
  metadata: {
    name: string;
    slug: string;
    description: string;
    category: TemplateCategory;
    thumbnail?: string;
    tags: string[];
    isSystem: boolean;
    isPublic: boolean;
    authorAccountId?: string;
  };

  // Layer 1: Visual
  theme: ThemeV3;

  // Layer 2: Chrome
  siteParts: SiteParts;

  // Layer 3: Pages
  pages: PageBlueprint[];

  // Demo content pack
  demoContent: {
    siteName: string;
    tagline: string;
    seo: { title: string; description: string; keywords: string };
    contact: { email: string; phone: string; address: string };
    social?: Record<string, string>;
  };

  // Compatibility constraints
  compatibility: {
    supportedSections: SectionTypeValue[];
    minSectionsPerPage: number;
    maxSectionsPerPage: number;
  };

  // Brand voice (input for AI content generation)
  brandVoice: {
    tone: 'professional' | 'friendly' | 'luxurious' | 'adventurous' | 'trustworthy';
    keywords: string[];
    ctaStyle: 'action' | 'benefit' | 'urgency' | 'curiosity';
  };

  // Detail page layout (optional — post-MVP)
  detailPages?: DetailPages;
}

export type TemplateCategory =
  | 'adventure' | 'luxury' | 'tropical' | 'corporate'
  | 'boutique' | 'cultural' | 'eco' | 'romantic'
  | 'custom';
