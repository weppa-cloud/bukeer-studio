/**
 * Section Renderer Component
 *
 * This is the public-facing component for rendering sections.
 * It delegates to the unified render-section function which handles:
 * - Type validation
 * - Content validation (Zod schema)
 * - Content normalization (snake_case -> camelCase)
 * - Component rendering
 *
 * IMPORTANT: All section rendering should go through this component
 * or the renderSection/renderSections functions from render-section.tsx
 */

import { renderSection } from '@/lib/sections/render-section';
import type { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';

interface SectionRendererProps {
  section: WebsiteSection;
  website: WebsiteData;
}

export function SectionRenderer({ section, website }: SectionRendererProps) {
  return renderSection({ section, website });
}
