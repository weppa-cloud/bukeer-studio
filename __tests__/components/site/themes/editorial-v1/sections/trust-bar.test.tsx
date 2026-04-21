/**
 * editorial-v1 — <TrustBarSection /> tests.
 *
 * Coverage:
 *  - renders authored items verbatim
 *  - derives default badge set from brandClaims
 *  - always renders the live "Planners en línea" dot badge by default
 *  - returns null when no items and no brandClaims produce content
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { TrustBarSection } from '@/components/site/themes/editorial-v1/sections/trust-bar';
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
    id: 't-1',
    section_type: 'trust_bar',
    variant: 'default',
    display_order: 0,
    is_enabled: true,
    config: {},
    content,
  };
}

describe('editorial-v1 <TrustBarSection>', () => {
  it('renders authored items verbatim', () => {
    const html = renderToStaticMarkup(
      <TrustBarSection
        section={makeSection({
          items: [
            { live: true, bold: 'Planners en línea', body: 'responden en ~3 min' },
            { icon: 'shield', bold: 'RNT 83412', body: 'Operador local desde 2011' },
            { icon: 'star', bold: '4.9/5', body: '3,200+ reseñas verificadas' },
          ],
        })}
        website={makeWebsite()}
      />,
    );
    expect(html).toContain('class="trust-bar-f1"');
    expect(html).toContain('dot-live');
    expect(html).toContain('Planners en línea');
    expect(html).toContain('RNT 83412');
    expect(html).toContain('4.9/5');
    expect(html).toContain('3,200+ reseñas verificadas');
  });

  it('derives default items from brandClaims', () => {
    const html = renderToStaticMarkup(
      <TrustBarSection
        section={makeSection({
          brandClaims: {
            yearsInOperation: 14,
            totalDestinations: null,
            totalPackages: null,
            totalActivities: null,
            avgRating: 4.9,
            totalReviews: 3200,
            satisfactionPct: 96,
            totalBookings: null,
            totalPlanners: null,
            plannersAvgRating: null,
          },
          liveResponseTime: '3 min',
        })}
        website={makeWebsite()}
      />,
    );
    expect(html).toContain('Planners en línea');
    expect(html).toContain('responden en ~3 min');
    expect(html).toContain('14 años');
    expect(html).toContain('4.9/5');
    expect(html).toContain('96% satisfacción');
  });

  it('still renders live badge when no brandClaims', () => {
    const html = renderToStaticMarkup(
      <TrustBarSection
        section={makeSection({ liveResponseTime: '5 min' })}
        website={makeWebsite()}
      />,
    );
    expect(html).toContain('Planners en línea');
    expect(html).toContain('responden en ~5 min');
  });

  it('normalizes legacy logos string into separated tokens', () => {
    const html = renderToStaticMarkup(
      <TrustBarSection
        section={makeSection({
          items: [{ live: true, bold: 'Planners en línea', body: 'responden en ~3 min' }],
          logos: 'ProColombiaANATOTravellers ChoiceMinCITRainforest AllianceRNT 83412',
        })}
        website={makeWebsite()}
      />,
    );
    expect(html).toContain('trust-reconocidos');
    expect(html).toContain('trust-logo-sep');
    expect(html).toContain('ProColombia');
    expect(html).toContain('ANATO');
    expect(html).toContain('Travellers Choice');
    expect(html).toContain('Rainforest Alliance');
    expect(html).toContain('RNT 83412');
  });
});
