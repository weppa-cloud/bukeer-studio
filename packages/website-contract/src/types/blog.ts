/**
 * Blog types — extracted from web-public/lib/supabase/get-website.ts
 * Extended for SEO pipeline v2 (Epic #520, Issue #531)
 */

export interface BlogPost {
  id: string;
  website_id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featured_image: string | null;
  featured_alt?: string | null;
  category_id: string | null;
  status: 'draft' | 'published' | 'scheduled';
  published_at: string | null;
  updated_at?: string | null;
  created_by?: string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string[] | null;
  word_count: number | null;
  author_name?: string | null;
  author_avatar?: string | null;
  reading_time_minutes?: number | null;
  category?: BlogCategory;

  // V2 fields (SEO pipeline)
  content_version?: number;
  ai_generated?: boolean;
  ai_model?: string | null;
  human_edited?: boolean;
  locale?: string;
  translation_group_id?: string | null;
  canonical_post_id?: string | null;
  faq_items?: FAQItem[] | null;
  internal_links?: InternalLink[] | null;
  content_structure?: ContentStructure | null;
  last_refreshed_at?: string | null;
}

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
}

// === SEO Pipeline V2 Types ===

export interface FAQItem {
  question: string;
  answer: string;
}

export interface InternalLink {
  url: string;
  anchor: string;
  target_post_id?: string;
}

export interface ContentStructure {
  sections: SectionAnalysis[];
  totalWords: number;
  avgParagraphWords: number;
  internalLinkCount: number;
  externalLinkCount: number;
  imageCount: number;
  hasTLDR: boolean;
  hasFAQ: boolean;
}

export interface SectionAnalysis {
  heading: string;
  level: number;
  wordCount: number;
  hasAnswerFirst: boolean;
  dataPoints: number;
}

export interface ContentScore {
  id: string;
  post_id: string;
  website_id: string;
  overall_score: number;
  seo_score: number;
  readability_score: number;
  structure_score: number;
  geo_score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  checks: ScoreCheck[];
  word_count: number | null;
  estimated_read_time_min: number | null;
  content_hash: string;
  scored_at: string;
  last_refreshed_at: string | null;
  refresh_recommended_at: string | null;
}

export interface ScoreCheck {
  id: string;
  pass: boolean;
  score: number;
  weight: number;
  message: string;
  category: 'seo' | 'readability' | 'structure' | 'geo';
}
