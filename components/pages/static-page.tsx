'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';
import type { WebsitePage, PageSection, DestinationData } from '@/lib/supabase/get-pages';
import { renderSection } from '@/lib/sections/render-section';
import { SECTION_TYPES } from '@bukeer/website-contract';

const HERO_SECTION_TYPES = SECTION_TYPES.filter((t) => t.startsWith('hero'));

interface StaticPageProps {
  website: WebsiteData;
  page: WebsitePage;
  dynamicDestinations?: DestinationData[];
}

/**
 * Adapts PageSection to WebsiteSection format.
 *
 * DB sections may use different key names depending on how they were created:
 * - `type`         — PageSection interface (contract types)
 * - `sectionType`  — Template contract blueprints (camelCase, stored by apply_template RPC)
 * - `section_type` — Flutter page builder (snake_case)
 *
 * We normalise all three to `section_type` for the unified renderer.
 */
function adaptPageSectionToWebsiteSection(
  section: PageSection,
  index: number
): WebsiteSection {
  const raw = section as unknown as Record<string, unknown>;
  const sectionType =
    section.type ||
    (raw.sectionType as string) ||
    (raw.section_type as string) ||
    'text'; // safe fallback — text renders gracefully with any content

  return {
    id: section.id,
    section_type: sectionType,
    variant: section.variant || (raw.variant as string) || '',
    display_order: index,
    is_enabled: true,
    config: section.config || (raw.config as Record<string, unknown>) || {},
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

  // Skip the hardcoded fallback hero when sections already include a hero-type section
  const sectionsHaveHero = sections.some((s) => {
    const raw = s as unknown as Record<string, unknown>;
    const t = s.type || (raw.sectionType as string) || (raw.section_type as string) || '';
    return HERO_SECTION_TYPES.includes(t as typeof HERO_SECTION_TYPES[number]);
  });

  return (
    <div className="min-h-screen">
      {/* Fallback Hero — only when sections don't include their own hero */}
      {!sectionsHaveHero && (
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
      )}

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
