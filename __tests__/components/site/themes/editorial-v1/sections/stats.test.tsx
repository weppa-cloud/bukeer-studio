/**
 * editorial-v1 — <StatsSection /> tests.
 *
 * Coverage:
 *  - renders explicit metrics verbatim
 *  - falls back to brandClaims derivation when `metrics` is empty
 *  - uses conservative defaults when no metrics + no brandClaims
 *  - renders eyebrow + title when provided
 *  - suffix goes inside <em> so it picks up the serif-italic accent style
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { StatsSection } from '@/components/site/themes/editorial-v1/sections/stats';
import type { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';

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
    id: 's-1',
    section_type: 'stats',
    variant: 'default',
    display_order: 0,
    is_enabled: true,
    config: {},
    content,
  };
}

describe('editorial-v1 <StatsSection>', () => {
  it('renders explicit metrics', () => {
    const html = renderToStaticMarkup(
      <StatsSection
        section={makeSection({
          metrics: [
            { value: 12, suffix: 'k+', label: 'viajeros' },
            { value: 4.9, suffix: '/5', label: 'rating', decimals: 1 },
            { value: 96, suffix: '%', label: 'satisfacción' },
            { value: 32, label: 'destinos' },
          ],
        })}
        website={makeWebsite()}
      />,
    );
    expect(html).toContain('data-screen-label="Stats"');
    expect(html).toContain('class="stats-row"');
    expect(html).toContain('viajeros');
    expect(html).toContain('rating');
    expect(html).toContain('satisfacción');
    expect(html).toContain('destinos');
    // Suffix in <em>
    expect(html).toContain('<em>k+</em>');
    expect(html).toContain('<em>/5</em>');
    expect(html).toContain('<em>%</em>');
    // 4 items
    expect((html.match(/class="stat"/g) || []).length).toBe(4);
  });

  it('derives metrics from brandClaims when `metrics` not provided', () => {
    const html = renderToStaticMarkup(
      <StatsSection
        section={makeSection({
          brandClaims: {
            yearsInOperation: 14,
            totalDestinations: 32,
            totalPackages: 42,
            totalActivities: null,
            avgRating: 4.9,
            totalReviews: 3200,
            satisfactionPct: 96,
            totalBookings: 12400,
            totalPlanners: null,
            plannersAvgRating: null,
          },
        })}
        website={makeWebsite()}
      />,
    );
    // Up to 4 metrics derived
    expect(html).toContain('años');
    expect(html).toContain('paquetes');
    expect(html).toContain('destinos');
    expect(html).toContain('viajeros');
    expect(html).toContain('<em>+</em>');
    // rating gets skipped because we capped at 4 metrics — order:
    // years, packages, destinations, bookings, rating (rating is dropped).
  });

  it('respects null brandClaims fields by skipping them', () => {
    const html = renderToStaticMarkup(
      <StatsSection
        section={makeSection({
          brandClaims: {
            yearsInOperation: null,
            totalDestinations: 10,
            totalPackages: null,
            totalActivities: null,
            avgRating: 4.8,
            totalReviews: null,
            satisfactionPct: null,
            totalBookings: null,
            totalPlanners: null,
            plannersAvgRating: null,
          },
        })}
        website={makeWebsite()}
      />,
    );
    // 2 derived: destinations + rating
    expect(html).toContain('destinos');
    expect(html).toContain('rating');
    expect((html.match(/class="stat"/g) || []).length).toBe(2);
  });

  it('falls back to conservative defaults when nothing is provided', () => {
    const html = renderToStaticMarkup(
      <StatsSection section={makeSection({})} website={makeWebsite()} />,
    );
    expect(html).toContain('Viajeros felices');
    expect(html).toContain('Destinos');
    expect(html).toContain('Años de experiencia');
    expect(html).toContain('Satisfacción');
  });

  it('renders header when eyebrow + title provided', () => {
    const html = renderToStaticMarkup(
      <StatsSection
        section={makeSection({
          eyebrow: 'Bukeer en números',
          title: 'Confianza construida',
          metrics: [{ value: 10, label: 'test' }],
        })}
        website={makeWebsite()}
      />,
    );
    expect(html).toContain('Bukeer en números');
    expect(html).toContain('Confianza construida');
    expect(html).toContain('ev-stats-head');
  });
});
