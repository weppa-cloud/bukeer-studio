/**
 * Product types — extracted from web-public/lib/supabase/get-pages.ts
 */

import type { PageSection } from './section.js';

export type ScheduleEventType =
  | 'transport'
  | 'activity'
  | 'meal'
  | 'lodging'
  | 'free_time'
  | 'flight';

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface ScheduleEntry {
  day?: number;
  title: string;
  description?: string;
  image?: string;
  time?: string;
  event_type?: ScheduleEventType;
}

export interface MeetingPoint {
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zip_code?: string;
  google_place_id?: string;
  latitude?: number;
  longitude?: number;
}

export interface ActivityPrice {
  unit_type_code: string;
  season: string;
  price: number;
  currency: string;
  valid_from?: string;
  valid_until?: string;
}

export interface ActivityOption {
  id: string;
  name: string;
  pricing_per: 'UNIT' | 'BOOKING';
  min_units?: number;
  max_units?: number;
  start_times?: string[];
  is_refundable?: boolean;
  prices: ActivityPrice[];
}

export interface PackageVersion {
  version_number: number;
  total_price: number;
  base_currency: string;
  services_snapshot_summary: string;
  duration_days?: number;
  duration_nights?: number;
}

export interface ProductFAQ {
  question: string;
  answer: string;
}

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

  // Package-specific flags
  is_featured?: boolean;

  // Activity/Transfer shared
  inclusions?: string | string[] | Record<string, unknown>[];
  exclusions?: string | string[] | Record<string, unknown>[];
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
    event_type?: ScheduleEventType;
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

  // V2 enrichment (all optional for backwards compatibility)
  schedule?: ScheduleEntry[];
  meeting_point?: MeetingPoint;
  highlights?: string[];
  photos?: string[] | Record<string, unknown>[];
  social_image?: string;
  user_rating?: number;
  experience_type?: string;
  activity_type?: string;
  region?: string;
  options?: ActivityOption[];
  package_version?: PackageVersion;
  package_versions?: PackageVersion[];
  services_snapshot_summary?: string;
  duration_days?: number;
  duration_nights?: number;

  // Video field (#165)
  video_url?: string | null;
  video_caption?: string | null;

  // Package aggregated + AI-generated fields (Gate B #172, Gate D #174)
  program_inclusions?: string[] | null;
  program_exclusions?: string[] | null;
  program_gallery?: string[] | null;
  program_highlights?: string[] | null;
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
  custom_faq?: ProductFAQ[];
  custom_highlights?: string[];
  custom_tiers?: Array<Record<string, JsonValue>>;
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
