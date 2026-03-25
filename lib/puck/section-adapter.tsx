/**
 * Section Adapter — Wraps existing Bukeer section components for Puck.
 *
 * Puck passes props as a flat object. Bukeer section components expect
 * { section: WebsiteSection, website: WebsiteData }. This adapter bridges
 * the gap by reconstructing the section/website objects from Puck props.
 *
 * Usage:
 *   const PuckHero = createSectionAdapter(HeroSection, 'hero');
 */

import React from 'react';
import type { WebsiteSection, WebsiteData } from '@/lib/supabase/get-website';

interface PuckRenderProps {
  /** Puck injects an `id` prop for each component */
  id: string;
  /** Puck internal render context */
  puck?: { metadata?: { website?: WebsiteData } };
  /** Bukeer variant prop */
  variant?: string;
  /** Edit mode flag (optional, for future use) */
  editMode?: boolean;
  /** All other props are section content fields */
  [key: string]: unknown;
}

/**
 * Creates a Puck-compatible component from an existing Bukeer section component.
 *
 * @param Component - The Bukeer section component (e.g., HeroSection)
 * @param sectionType - The section_type value (e.g., 'hero')
 * @returns A React component compatible with Puck's component interface
 */
export function createSectionAdapter(
  Component: React.ComponentType<{
    section: WebsiteSection;
    website: WebsiteData;
  }>,
  sectionType: string
) {
  const PuckAdapter = (props: PuckRenderProps) => {
    const { id, puck, editMode, variant, ...contentProps } = props;

    // Reconstruct section object from flat props
    const section: WebsiteSection = {
      id: id || crypto.randomUUID(),
      section_type: sectionType,
      variant: variant || 'default',
      display_order: 0,
      is_enabled: true,
      config: {},
      content: contentProps as Record<string, unknown>,
    };

    // Website data comes from Puck metadata (injected via Puck's metadata prop)
    const website = puck?.metadata?.website;
    if (!website) {
      return (
        <div className="p-8 text-center text-muted-foreground">
          <p>Loading website data...</p>
        </div>
      );
    }

    return <Component section={section} website={website} />;
  };

  PuckAdapter.displayName = `PuckAdapter(${sectionType})`;
  return PuckAdapter;
}
