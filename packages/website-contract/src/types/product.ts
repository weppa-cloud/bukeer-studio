/**
 * Product types — extracted from web-public/lib/supabase/get-pages.ts
 */

import type { PageSection } from './section.js';

export interface ProductData {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  images?: string[];
  location?: string;
  country?: string;
  city?: string;
  type: 'destination' | 'hotel' | 'activity' | 'transfer' | 'package';

  // Hotel-specific
  amenities?: string[];
  star_rating?: number;

  // Activity/Transfer shared
  inclusions?: string;
  exclusions?: string;
  recommendations?: string;
  instructions?: string;

  // Activity-specific
  duration_minutes?: number;
  duration?: string;

  // Transfer-specific
  from_location?: string;
  to_location?: string;

  // Package-specific (itinerary items)
  itinerary_items?: Array<{
    day?: number;
    title: string;
    description?: string;
  }>;

  // Geo coordinates
  latitude?: number;
  longitude?: number;

  // Rating / reviews
  rating?: number;
  review_count?: number;

  // Pricing (from RPC — hotel_rates / activities_rates / itineraries.total)
  price?: number | string;
  currency?: string;
  includes?: string[] | string;
  excludes?: string[] | string;
}

export interface ProductPageCustomization {
  id: string;
  custom_hero?: {
    title?: string;
    subtitle?: string;
    backgroundImage?: string;
  };
  custom_sections: PageSection[];
  sections_order: string[];
  hidden_sections: string[];
  custom_seo_title?: string;
  custom_seo_description?: string;
  robots_noindex?: boolean;
  is_published: boolean;
}

export interface ProductPageData {
  product: ProductData;
  page?: ProductPageCustomization;
}

export interface CategoryProducts {
  items: ProductData[];
  total: number;
}
