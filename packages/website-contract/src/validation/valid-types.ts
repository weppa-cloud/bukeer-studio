/**
 * Type guard helpers for runtime type checking
 */

import type { SectionTypeValue } from '../types/section';
import { SECTION_TYPES } from '../types/section';

/**
 * Checks if a string is a valid section type.
 */
export function isValidSectionType(value: string): value is SectionTypeValue {
  return (SECTION_TYPES as readonly string[]).includes(value);
}

/**
 * Valid page types for website pages.
 */
export const PAGE_TYPES = ['category', 'static', 'custom', 'anchor', 'external'] as const;
export type PageType = (typeof PAGE_TYPES)[number];

export function isValidPageType(value: string): value is PageType {
  return (PAGE_TYPES as readonly string[]).includes(value);
}

/**
 * Valid category types for category pages.
 */
export const CATEGORY_TYPES = [
  'destinations', 'hotels', 'activities', 'transfers', 'packages',
] as const;
export type CategoryType = (typeof CATEGORY_TYPES)[number];

export function isValidCategoryType(value: string): value is CategoryType {
  return (CATEGORY_TYPES as readonly string[]).includes(value);
}

/**
 * Valid product types.
 */
export const PRODUCT_TYPES = [
  'destination', 'hotel', 'activity', 'transfer', 'package',
] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export function isValidProductType(value: string): value is ProductType {
  return (PRODUCT_TYPES as readonly string[]).includes(value);
}

/**
 * Valid blog post statuses.
 */
export const BLOG_STATUSES = ['draft', 'published', 'scheduled'] as const;
export type BlogStatus = (typeof BLOG_STATUSES)[number];

export function isValidBlogStatus(value: string): value is BlogStatus {
  return (BLOG_STATUSES as readonly string[]).includes(value);
}

/**
 * Valid website statuses.
 */
export const WEBSITE_STATUSES = ['draft', 'published'] as const;
export type WebsiteStatus = (typeof WEBSITE_STATUSES)[number];

export function isValidWebsiteStatus(value: string): value is WebsiteStatus {
  return (WEBSITE_STATUSES as readonly string[]).includes(value);
}
