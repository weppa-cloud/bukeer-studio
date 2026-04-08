/**
 * Website types — extracted from web-public/lib/supabase/get-website.ts
 */

import type { ThemeV3 } from './theme';
import type { WebsiteSection } from './section';
import type { SiteParts } from './site-parts';

export interface AnalyticsConfig {
  gtm_id?: string;
  ga4_id?: string;
  facebook_pixel_id?: string;
  custom_head_scripts?: string;
  custom_body_scripts?: string;
}

export interface HeaderCTA {
  label: string;
  href: string;
  variant: 'primary' | 'outline' | 'whatsapp';
  icon?: 'whatsapp' | 'phone' | 'mail' | 'calendar';
  enabled: boolean;
}

export interface WebsiteContent {
  siteName: string;
  tagline: string;
  logo?: string;
  headerCta?: HeaderCTA;
  seo: {
    title: string;
    description: string;
    keywords: string;
  };
  contact: {
    email: string;
    phone: string;
    address: string;
  };
  social: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
    linkedin?: string;
    tiktok?: string;
    whatsapp?: string;
  };
  account?: {
    name: string;
    logo: string | null;
    email: string | null;
    phone: string | null;
    phone2: string | null;
    website: string | null;
    location: string | null;
    legal?: {
      terms_conditions: string | null;
      privacy_policy: string | null;
      cancellation_policy: string | null;
    };
  };
}

export interface FeaturedProducts {
  destinations: string[];
  hotels: string[];
  activities: string[];
  transfers: string[];
  packages: string[];
}

export interface WebsiteData {
  id: string;
  account_id: string | null;
  subdomain: string;
  custom_domain: string | null;
  status: 'draft' | 'published';
  template_id: string;
  theme: ThemeV3;
  content: WebsiteContent;
  analytics?: AnalyticsConfig;
  featured_products: FeaturedProducts;
  sections: WebsiteSection[];
  site_parts?: SiteParts;
}
