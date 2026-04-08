/**
 * Template types — aligned with website_templates table
 */

import type { ThemeV3 } from './theme';

export interface WebsiteTemplate {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  thumbnail_url?: string;
  category?: string;
  is_active: boolean;
  is_official?: boolean;
  is_public?: boolean;
  author_account_id?: string;
  install_count?: number;
  template_data: {
    theme: ThemeV3;
    sections: TemplateSectionConfig[];
    content?: Record<string, unknown>;
  };
  created_at: string;
  updated_at: string;
}

export interface TemplateSectionConfig {
  section_type: string;
  variant?: string;
  display_order: number;
  is_enabled: boolean;
  config: Record<string, unknown>;
  content: Record<string, unknown>;
}
