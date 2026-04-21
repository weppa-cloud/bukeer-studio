/**
 * editorial-v1 Itinerary Accordion section.
 *
 * Port of the PackageDetailV2 itinerary section in
 *   themes/references/claude design 1/project/details.jsx
 *
 * Layout:
 *  - Section header: eyebrow "Itinerario" + h2 from content.title + subtitle
 *  - Accordion of day cards: day number badge, title, location chip, summary,
 *    activities list, optional day image
 *  - First day expanded by default — interactive state delegated to
 *    `ItineraryAccordionClient` leaf so all day content is SSR'd for SEO.
 *
 * Content contract:
 *   title?:    string
 *   subtitle?: string
 *   days:      Array<{
 *     dayNumber:  number
 *     title:      string
 *     summary:    string
 *     location:   string
 *     activities: string[]
 *     image?:     string
 *   }>
 *   schema?:   boolean — emit JSON-LD TouristTrip itinerary
 */

import type { ReactElement } from 'react';

import type { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';

import { Eyebrow } from '../primitives/eyebrow';
import { getEditorialTextGetter, localizeEditorialText } from '../i18n';
import {
  ItineraryAccordionClient,
  type ItineraryDayProps,
} from './itinerary-accordion.client';

export interface EditorialItineraryAccordionSectionProps {
  section: WebsiteSection;
  website: WebsiteData;
}

interface ItineraryAccordionContent {
  title?: string;
  subtitle?: string;
  days?: Array<{
    dayNumber?: number;
    title?: string;
    summary?: string;
    location?: string;
    activities?: string[];
    image?: string;
  }>;
  schema?: boolean;
}

const DEFAULT_EYEBROW_KEY = 'editorialItineraryEyebrowFallback' as const;

function buildSchemaLD(
  title: string,
  days: ItineraryDayProps[],
  websiteName: string,
): string {
  const itineraryItems = days.map((d, i) => ({
    '@type': 'Accommodation',
    position: i + 1,
    name: d.title,
    description: d.summary,
    address: { '@type': 'PostalAddress', addressLocality: d.location },
  }));

  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    name: title,
    provider: { '@type': 'TravelAgency', name: websiteName },
    itinerary: {
      '@type': 'ItemList',
      itemListElement: itineraryItems,
    },
  });
}

export function ItineraryAccordionSection({
  section,
  website,
}: EditorialItineraryAccordionSectionProps): ReactElement | null {
  const editorialText = getEditorialTextGetter(website);
  const content = (section.content || {}) as ItineraryAccordionContent;

  const rawDays = Array.isArray(content.days) ? content.days : [];

  const days: ItineraryDayProps[] = rawDays
    .filter(
      (d): d is NonNullable<typeof d> =>
        !!d &&
        typeof d.title === 'string' &&
        d.title.trim().length > 0,
    )
    .map((d, i) => ({
      dayNumber:
        typeof d.dayNumber === 'number' && d.dayNumber > 0 ? d.dayNumber : i + 1,
      title: localizeEditorialText(website, d.title?.trim() ?? ''),
      summary: localizeEditorialText(website, d.summary?.trim() ?? ''),
      location: localizeEditorialText(website, d.location?.trim() ?? ''),
      activities: Array.isArray(d.activities)
        ? d.activities
            .filter((a): a is string => typeof a === 'string' && a.trim().length > 0)
            .map((a) => localizeEditorialText(website, a.trim()))
        : [],
      image: d.image?.trim() || undefined,
    }));

  if (days.length === 0) return null;

  const eyebrow = localizeEditorialText(
    website,
    editorialText(DEFAULT_EYEBROW_KEY) || 'Itinerario',
  );
  const title = localizeEditorialText(website, content.title?.trim() || '');
  const subtitle = localizeEditorialText(website, content.subtitle?.trim() || '');

  const emitSchema = content.schema === true && !!title;
  const websiteName =
    (website.content as { brandName?: string } | null)?.brandName ||
    website.subdomain ||
    '';

  return (
    <section
      className="ev-section ev-itinerary-accordion"
      data-screen-label="ItineraryAccordion"
      aria-label={eyebrow}
    >
      {emitSchema ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: buildSchemaLD(title, days, websiteName),
          }}
        />
      ) : null}

      <div className="ev-container">
        {/* Section header */}
        <div className="itinerary-header" style={{ marginBottom: 40 }}>
          <Eyebrow>{eyebrow}</Eyebrow>
          {title ? (
            <h2 className="headline-lg" style={{ marginTop: 12 }}>
              {title}
            </h2>
          ) : null}
          {subtitle ? (
            <p className="body-md" style={{ marginTop: 16, maxWidth: '56ch' }}>
              {subtitle}
            </p>
          ) : null}
        </div>

        {/* Client accordion — receives serializable day data */}
        <ItineraryAccordionClient days={days} initialOpen={0} />
      </div>
    </section>
  );
}

export default ItineraryAccordionSection;
