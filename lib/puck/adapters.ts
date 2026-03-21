/**
 * Puck Data Adapters
 *
 * Bidirectional conversion between website_sections (DB schema)
 * and Puck Data format. Uses normalizeContent for field name
 * normalization (snake_case → camelCase).
 *
 * Roundtrip guarantee: sectionsToPuckData → puckDataToSections
 * produces equivalent data (modulo field name normalization).
 */

import { normalizeContent } from '@/lib/sections/normalize-content';
import type { WebsiteSection } from '@/lib/supabase/get-website';

// ============================================================================
// Puck Types (subset of @measured/puck types for decoupling)
// ============================================================================

export interface PuckComponentData {
  type: string;
  props: Record<string, unknown> & { id: string };
}

export interface PuckData {
  root: { props: Record<string, unknown> };
  content: PuckComponentData[];
}

// ============================================================================
// Section Type ↔ Puck Component Name Mapping
// ============================================================================

/**
 * Maps DB section_type to Puck component name (PascalCase).
 * Only includes types that have Puck component definitions.
 */
const SECTION_TO_COMPONENT: Record<string, string> = {
  hero: 'Hero',
  destinations: 'Destinations',
  hotels: 'Hotels',
  activities: 'Activities',
  testimonials: 'Testimonials',
  about: 'About',
  contact: 'Contact',
  cta: 'CTA',
  stats: 'Stats',
  partners: 'Partners',
  faq: 'FAQ',
  blog: 'Blog',
  text_image: 'TextImage',
  features_grid: 'FeaturesGrid',
  gallery: 'Gallery',
  newsletter: 'Newsletter',
};

/**
 * Reverse mapping: Puck component name → DB section_type
 */
const COMPONENT_TO_SECTION: Record<string, string> = Object.fromEntries(
  Object.entries(SECTION_TO_COMPONENT).map(([k, v]) => [v, k])
);

export function sectionTypeToComponentName(sectionType: string): string {
  return SECTION_TO_COMPONENT[sectionType] ?? sectionType;
}

export function componentNameToSectionType(componentName: string): string {
  return COMPONENT_TO_SECTION[componentName] ?? componentName;
}

// ============================================================================
// Adapters
// ============================================================================

/**
 * Convert website_sections[] → Puck Data.
 * Filters to enabled sections, sorts by display_order,
 * normalizes content keys to camelCase.
 */
export function sectionsToPuckData(sections: WebsiteSection[]): PuckData {
  return {
    root: { props: {} },
    content: sections
      .filter((s) => s.is_enabled)
      .sort((a, b) => a.display_order - b.display_order)
      .map((s) => ({
        type: sectionTypeToComponentName(s.section_type),
        props: {
          ...normalizeContent(s.content as Record<string, unknown>),
          id: s.id,
          variant: s.variant || 'default',
        },
      })),
  };
}

/**
 * Props that are Puck-internal and should NOT be persisted
 * back to the DB content field.
 */
const PUCK_INTERNAL_PROPS = new Set(['id', 'variant', 'puck', 'editMode']);

function omitPuckProps(
  props: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (!PUCK_INTERNAL_PROPS.has(key)) {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Convert Puck Data → Partial<WebsiteSection>[].
 * Strips Puck-internal props, maps component names back to section_type.
 */
export function puckDataToSections(
  data: PuckData
): Partial<WebsiteSection>[] {
  return data.content.map((item, index) => ({
    id: item.props.id,
    section_type: componentNameToSectionType(item.type),
    variant: (item.props.variant as string) || 'default',
    display_order: index,
    is_enabled: true,
    config: {},
    content: omitPuckProps(item.props),
  }));
}
