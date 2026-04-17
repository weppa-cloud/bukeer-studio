/**
 * Page types — extracted from web-public/lib/supabase/get-pages.ts
 */

import type { PageSection } from './section';

export type PageType = 'category' | 'static' | 'custom' | 'anchor' | 'external';
export type HeaderMode = 'default' | 'minimal' | 'none';

export interface WebsitePage {
  id: string;
  page_type: PageType;
  category_type?: 'destinations' | 'hotels' | 'activities' | 'transfers' | 'packages';
  slug: string;
  title: string;
  hero_config: {
    title?: string;
    subtitle?: string;
    backgroundImage?: string;
    eyebrow?: string;
    ctaText?: string;
    ctaUrl?: string;
    secondaryCtaText?: string;
    secondaryCtaUrl?: string;
  };
  intro_content: {
    text?: string;
    highlights?: string[];
  };
  sections: PageSection[];
  cta_config: {
    title?: string;
    subtitle?: string;
    buttonText?: string;
    buttonLink?: string;
  };
  seo_title?: string;
  seo_description?: string;
  robots_noindex?: boolean;
  parent_page_id?: string;
  header_mode?: HeaderMode;
  is_published: boolean;
}

export interface NavigationItem {
  slug: string;
  label: string;
  page_type: PageType;
  category_type?: string;
  href?: string;
  parent_slug?: string;
  target?: '_self' | '_blank';
  header_mode?: HeaderMode;
  children?: NavigationItem[];
}
