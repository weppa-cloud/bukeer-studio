'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';
import type { WebsitePage, PageSection, DestinationData } from '@/lib/supabase/get-pages';
import { renderSection } from '@/lib/sections/render-section';

interface StaticPageProps {
  website: WebsiteData;
  page: WebsitePage;
  dynamicDestinations?: DestinationData[];
}

/**
 * Adapts PageSection to WebsiteSection format.
 * PageSection uses 'type' while WebsiteSection uses 'section_type'.
 */
function adaptPageSectionToWebsiteSection(
  section: PageSection,
  index: number
): WebsiteSection {
  return {
    id: section.id,
    section_type: section.type, // Map 'type' to 'section_type'
    variant: section.variant || '',
    display_order: index,
    is_enabled: true,
    config: section.config || {},
    content: section.content || {},
  };
}

export function StaticPage({ website, page, dynamicDestinations = [] }: StaticPageProps) {
  const heroConfig = page.hero_config || {};
  const sections = page.sections || [];
  const ctaConfig = page.cta_config || {};
  const curatedDynamicDestinations = dynamicDestinations.filter((d) => d.total > 1);
  const sectionDynamicDestinations = (
    curatedDynamicDestinations.length > 0 ? curatedDynamicDestinations : dynamicDestinations
  ).slice(0, 8);
  const hasDynamicDestinations = sectionDynamicDestinations.length > 0;

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section
        className="relative h-[40vh] min-h-[300px] flex items-center justify-center"
        style={{
          backgroundColor: 'var(--md-sys-color-primary-container)',
        }}
      >
        {heroConfig.backgroundImage && (
          <Image
            src={heroConfig.backgroundImage}
            alt={heroConfig.title || page.title}
            fill
            className="object-cover"
            priority
          />
        )}
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 text-center text-white px-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {heroConfig.title || page.title}
          </h1>
          {heroConfig.subtitle && (
            <p className="text-lg md:text-xl max-w-2xl mx-auto opacity-90">
              {heroConfig.subtitle}
            </p>
          )}
        </div>
      </section>

      {/* Dynamic Sections - Using unified renderer */}
      {sections.map((section, index) => {
        const adaptedSection = adaptPageSectionToWebsiteSection(section, index);
        const content = (adaptedSection.content as Record<string, unknown>) || {};
        const source = content.source === 'manual' ? 'manual' : 'dynamic';
        const shouldUseDynamic =
          adaptedSection.section_type === 'destinations' &&
          hasDynamicDestinations &&
          source !== 'manual';

        const hydratedSection = shouldUseDynamic
            ? ({
                ...adaptedSection,
                content: {
                  ...content,
                  destinations: sectionDynamicDestinations,
                },
              } as WebsiteSection)
            : adaptedSection;

        return (
          <div key={section.id || index}>
            {renderSection({ section: hydratedSection, website })}
          </div>
        );
      })}

      {/* CTA Section */}
      {ctaConfig.title && (
        <section className="py-16 px-4 bg-primary-container">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-on-primary-container mb-4">
              {ctaConfig.title}
            </h2>
            {ctaConfig.subtitle && (
              <p className="text-on-primary-container/80 mb-8">
                {ctaConfig.subtitle}
              </p>
            )}
            {ctaConfig.buttonText && (
              <Link
                href={ctaConfig.buttonLink || '/contacto'}
                className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-on-primary rounded-full font-medium hover:bg-primary/90 transition-colors"
              >
                {ctaConfig.buttonText}
              </Link>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
