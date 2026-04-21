/**
 * editorial-v1 — <TestimonialsSection /> tests.
 *
 * Coverage:
 *  - returns null when no testimonials
 *  - renders single-column layout when only 1 review
 *  - renders split layout when 2+ reviews
 *  - displays averageRating + totalReviews chip
 *  - handles googleMapsUrl by rendering chip as anchor
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { TestimonialsSection } from '@/components/site/themes/editorial-v1/sections/testimonials';
import type { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: { src?: string; alt?: string }) => {
    return React.createElement('img', { src: props.src, alt: props.alt ?? '' });
  },
}));

function makeWebsite(): WebsiteData {
  return {
    id: 'w1',
    subdomain: 'acme',
    theme: { tokens: {}, profile: { metadata: { templateSet: 'editorial-v1' } } },
    content: {},
    sections: [],
  } as unknown as WebsiteData;
}

function makeSection(content: Record<string, unknown>): WebsiteSection {
  return {
    id: 't-1',
    section_type: 'testimonials',
    variant: 'default',
    display_order: 0,
    is_enabled: true,
    config: {},
    content,
  };
}

const THREE_REVIEWS = [
  {
    id: 'r1',
    name: 'Camille Laurent',
    text: 'Un viaje increíble por <em>Colombia</em>. El planner fue maravilloso.',
    rating: 5,
    location: 'París',
  },
  {
    id: 'r2',
    name: 'Daniel Oster',
    text: 'Cafés y paisajes. Recomendado.',
    rating: 5,
    location: 'Berlín',
  },
  {
    id: 'r3',
    name: 'Sofía Herrera',
    text: 'Descubrí una Colombia diferente.',
    rating: 4,
    location: 'CDMX',
  },
];

describe('editorial-v1 <TestimonialsSection>', () => {
  it('returns null when no testimonials', () => {
    const html = renderToStaticMarkup(
      <TestimonialsSection
        section={makeSection({ testimonials: [] })}
        website={makeWebsite()}
      />,
    );
    expect(html).toBe('');
  });

  it('renders single-column featured card when only 1 review', () => {
    const html = renderToStaticMarkup(
      <TestimonialsSection
        section={makeSection({ testimonials: [THREE_REVIEWS[0]] })}
        website={makeWebsite()}
      />,
    );
    expect(html).toContain('Camille Laurent');
    expect(html).toContain('class="testi-big"');
    // No mini list when only 1 review
    expect(html).not.toContain('class="testi-list"');
  });

  it('renders split layout with mini list when 2+ reviews', () => {
    const html = renderToStaticMarkup(
      <TestimonialsSection
        section={makeSection({ testimonials: THREE_REVIEWS })}
        website={makeWebsite()}
      />,
    );
    expect(html).toContain('Camille Laurent');
    expect(html).toContain('Daniel Oster');
    expect(html).toContain('Sofía Herrera');
    expect(html).toContain('class="testi-list"');
    expect((html.match(/testi-mini/g) || []).length).toBeGreaterThanOrEqual(3);
  });

  it('preserves <em> in testimonial text', () => {
    const html = renderToStaticMarkup(
      <TestimonialsSection
        section={makeSection({ testimonials: [THREE_REVIEWS[0], THREE_REVIEWS[1]] })}
        website={makeWebsite()}
      />,
    );
    expect(html).toContain('<em>Colombia</em>');
  });

  it('renders rating chip with averageRating + totalReviews', () => {
    const html = renderToStaticMarkup(
      <TestimonialsSection
        section={makeSection({
          testimonials: THREE_REVIEWS,
          averageRating: 4.9,
          totalReviews: 3218,
        })}
        website={makeWebsite()}
      />,
    );
    expect(html).toContain('4.9');
    expect(html).toContain('3.218');
    expect(html).toContain('reseñas verificadas');
  });

  it('renders chip as anchor when googleMapsUrl provided', () => {
    const html = renderToStaticMarkup(
      <TestimonialsSection
        section={makeSection({
          testimonials: THREE_REVIEWS,
          averageRating: 4.9,
          totalReviews: 100,
          googleMapsUrl: 'https://g.co/place/123',
        })}
        website={makeWebsite()}
      />,
    );
    expect(html).toContain('href="https://g.co/place/123"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });
});
