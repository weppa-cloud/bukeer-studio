/**
 * Content Normalizer for Section Components
 *
 * Normalizes section content from various formats (snake_case, camelCase, aliases)
 * to a canonical camelCase format that components expect.
 *
 * This allows backward compatibility with:
 * - Legacy DB data (snake_case)
 * - Edge Functions (snake_case)
 * - Flutter (ctaLink variants)
 * - New content (camelCase)
 */

/**
 * Aliases for normalizing different sources to canonical format.
 * Maps various key names to their canonical camelCase equivalent.
 */
const KEY_ALIASES: Record<string, string> = {
  // CTA URLs - canonical: ctaUrl
  'cta_href': 'ctaUrl',
  'cta_url': 'ctaUrl',
  'ctaHref': 'ctaUrl',
  'ctaLink': 'ctaUrl',
  'cta_link': 'ctaUrl',

  // CTA Text - canonical: ctaText
  'cta_text': 'ctaText',

  // Background Image - canonical: backgroundImage
  'background_image': 'backgroundImage',
  'bg_image': 'backgroundImage',
  'bgImage': 'backgroundImage',

  // Button Text - canonical: buttonText
  'button_text': 'buttonText',

  // Button URL - canonical: buttonUrl
  'button_href': 'buttonUrl',
  'button_url': 'buttonUrl',
  'buttonHref': 'buttonUrl',
  'buttonLink': 'buttonUrl',

  // Secondary Button Text - canonical: secondaryButtonText
  'secondary_button_text': 'secondaryButtonText',
  'secondaryButtontext': 'secondaryButtonText',

  // Secondary Button URL - canonical: secondaryButtonUrl
  'secondary_button_href': 'secondaryButtonUrl',
  'secondary_button_url': 'secondaryButtonUrl',
  'secondaryButtonHref': 'secondaryButtonUrl',
  'secondaryButtonLink': 'secondaryButtonUrl',

  // Featured Image - canonical: featuredImage
  'featured_image': 'featuredImage',

  // Show Categories - canonical: showCategories
  'show_categories': 'showCategories',

  // Posts Per Page - canonical: postsPerPage
  'posts_per_page': 'postsPerPage',

  // Success Message - canonical: successMessage
  'success_message': 'successMessage',
};

/**
 * Converts snake_case string to camelCase
 */
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Normalizes an object recursively.
 * - Applies known aliases first
 * - Converts snake_case to camelCase
 * - Processes nested objects and arrays
 *
 * @param content - The content object to normalize
 * @returns Normalized content with camelCase keys
 */
export function normalizeContent<T = Record<string, unknown>>(
  content: Record<string, unknown> | null | undefined
): T {
  if (!content || typeof content !== 'object') {
    return {} as T;
  }

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(content)) {
    // 1. Check for known alias first
    // 2. If no alias, convert snake_case to camelCase
    const normalizedKey = KEY_ALIASES[key] || snakeToCamel(key);

    // Process value recursively
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[normalizedKey] = normalizeContent(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      result[normalizedKey] = value.map(item =>
        item && typeof item === 'object' && !Array.isArray(item)
          ? normalizeContent(item as Record<string, unknown>)
          : item
      );
    } else {
      result[normalizedKey] = value;
    }
  }

  return result as T;
}

// ============================================================================
// Type Definitions for Normalized Content
// ============================================================================

export interface NormalizedHeroContent {
  title?: string;
  subtitle?: string;
  ctaText?: string;
  ctaUrl?: string;
  backgroundImage?: string;
}

export interface NormalizedCtaContent {
  title?: string;
  subtitle?: string;
  buttonText?: string;
  buttonUrl?: string;
  secondaryButtonText?: string;
  secondaryButtonUrl?: string;
}

export interface NormalizedFeaturesContent {
  title?: string;
  subtitle?: string;
  items?: Array<{
    icon?: string;
    title?: string;
    description?: string;
  }>;
}

export interface NormalizedStatsContent {
  title?: string;
  items?: Array<{
    value?: string;
    label?: string;
    prefix?: string;
    suffix?: string;
  }>;
}

export interface NormalizedTestimonialsContent {
  title?: string;
  items?: Array<{
    quote?: string;
    author?: string;
    company?: string;
    avatar?: string;
    rating?: number;
  }>;
}

export interface NormalizedFaqContent {
  title?: string;
  items?: Array<{
    question?: string;
    answer?: string;
  }>;
}

export interface NormalizedGalleryContent {
  title?: string;
  images?: Array<{
    src?: string;
    alt?: string | Record<string, string>;
    caption?: string | Record<string, string>;
    mediaAssetId?: string;
  }>;
}

export interface NormalizedContactFormContent {
  title?: string;
  subtitle?: string;
  successMessage?: string;
}

export interface NormalizedBlogGridContent {
  title?: string;
  subtitle?: string;
  showCategories?: boolean;
  postsPerPage?: number;
}

export interface NormalizedRichTextContent {
  title?: string;
  text?: string;
  image?: string;
  imageAlt?: string | Record<string, string>;
  imageCaption?: string | Record<string, string>;
}

export interface NormalizedLogoCloudContent {
  title?: string;
  logos?: Array<{
    src?: string;
    alt?: string;
    href?: string;
  }>;
}

export interface NormalizedPricingContent {
  title?: string;
  subtitle?: string;
  tiers?: Array<{
    name?: string;
    price?: string;
    period?: string;
    description?: string;
    features?: string[];
    ctaText?: string;
    ctaUrl?: string;
    highlighted?: boolean;
  }>;
}

// ============================================================================
// Typed Helper Functions
// ============================================================================

export function normalizeHeroContent(content: unknown): NormalizedHeroContent {
  return normalizeContent<NormalizedHeroContent>(content as Record<string, unknown>);
}

export function normalizeCtaContent(content: unknown): NormalizedCtaContent {
  return normalizeContent<NormalizedCtaContent>(content as Record<string, unknown>);
}

export function normalizeFeaturesContent(content: unknown): NormalizedFeaturesContent {
  return normalizeContent<NormalizedFeaturesContent>(content as Record<string, unknown>);
}

export function normalizeStatsContent(content: unknown): NormalizedStatsContent {
  return normalizeContent<NormalizedStatsContent>(content as Record<string, unknown>);
}

export function normalizeTestimonialsContent(content: unknown): NormalizedTestimonialsContent {
  return normalizeContent<NormalizedTestimonialsContent>(content as Record<string, unknown>);
}

export function normalizeFaqContent(content: unknown): NormalizedFaqContent {
  return normalizeContent<NormalizedFaqContent>(content as Record<string, unknown>);
}

export function normalizeGalleryContent(content: unknown): NormalizedGalleryContent {
  return normalizeContent<NormalizedGalleryContent>(content as Record<string, unknown>);
}

export function normalizeContactFormContent(content: unknown): NormalizedContactFormContent {
  return normalizeContent<NormalizedContactFormContent>(content as Record<string, unknown>);
}

export function normalizeBlogGridContent(content: unknown): NormalizedBlogGridContent {
  return normalizeContent<NormalizedBlogGridContent>(content as Record<string, unknown>);
}

export function normalizeRichTextContent(content: unknown): NormalizedRichTextContent {
  return normalizeContent<NormalizedRichTextContent>(content as Record<string, unknown>);
}

export function normalizeLogoCloudContent(content: unknown): NormalizedLogoCloudContent {
  return normalizeContent<NormalizedLogoCloudContent>(content as Record<string, unknown>);
}

export function normalizePricingContent(content: unknown): NormalizedPricingContent {
  return normalizeContent<NormalizedPricingContent>(content as Record<string, unknown>);
}
