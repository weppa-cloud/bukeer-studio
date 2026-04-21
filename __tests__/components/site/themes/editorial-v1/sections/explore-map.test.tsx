/**
 * editorial-v1 — <ExploreMapSection /> behavioral tests.
 *
 * Coverage (per Wave 2.8 deliverable):
 *  1. Renders 4 region legend chips by default (fallback editorial copy).
 *  2. Renders the SVG Colombia map with pins for every destination that
 *     resolves against `COLOMBIA_CITIES`.
 *  3. Missing destinations → map still renders (legend-only, zero pins).
 *
 * We render via `renderToStaticMarkup` (Node test env) — the section is
 * a server component that delegates to a `'use client'` leaf, but under
 * SSR markup the leaf's JSX tree still serialises. The mouse hover
 * orchestration (chip ↔ pin sync, analytics) runs at hydration time
 * and is exercised via the integration/e2e layer, not here.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { ExploreMapSection } from '@/components/site/themes/editorial-v1/sections/explore-map';
import type { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';

// next/link is a thin wrapper in SSR — the default ts-jest setup resolves
// it fine, but mock it defensively so the test doesn't depend on the
// app-router runtime being available.
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...rest
  }: { href: string; children: React.ReactNode } & Record<string, unknown>) =>
    React.createElement('a', { href, ...rest }, children),
}));

function makeWebsite(overrides: Partial<WebsiteData> = {}): WebsiteData {
  return {
    id: 'w1',
    account_id: 'a1',
    subdomain: 'acme',
    custom_domain: null,
    status: 'published',
    template_id: 't1',
    theme: {
      tokens: {},
      profile: { metadata: { templateSet: 'editorial-v1' } },
    },
    content: {
      siteName: 'Acme Travel',
      tagline: 'Viaja más hondo.',
      seo: { title: '', description: '', keywords: '' },
      contact: { email: '', phone: '', address: '' },
      social: { whatsapp: '+573000000000' },
    },
    featured_products: {
      destinations: [],
      hotels: [],
      activities: [],
      transfers: [],
      packages: [],
    },
    sections: [],
    ...overrides,
  } as unknown as WebsiteData;
}

function makeSection(content: Record<string, unknown>): WebsiteSection {
  return {
    id: 'explore-1',
    section_type: 'explore_map',
    variant: 'editorial',
    display_order: 0,
    is_enabled: true,
    config: {},
    content,
  };
}

describe('<ExploreMapSection /> editorial-v1', () => {
  it('renders 4 region legend chips by default (fallback copy)', () => {
    const section = makeSection({});

    const html = renderToStaticMarkup(
      <ExploreMapSection section={section} website={makeWebsite()} />,
    );

    // Section wrapper + editorial data-screen-label
    expect(html).toContain('explore-map-section');
    expect(html).toContain('data-screen-label="ExploreMap"');

    // Default eyebrow + title fallbacks
    expect(html).toContain('EXPLORA');
    expect(html).toContain('Colombia, a tu ritmo');

    // 4 chips — one per region, each tagged with data-region
    expect(html).toContain('data-region="caribe"');
    expect(html).toContain('data-region="andes"');
    expect(html).toContain('data-region="selva"');
    expect(html).toContain('data-region="pacifico"');

    // Labels on chips
    expect(html).toContain('>Caribe<');
    expect(html).toContain('>Andes<');
    expect(html).toContain('>Selva<');
    expect(html).toContain('>Pacífico<');

    // Default CTA
    expect(html).toContain('Ver todos los destinos');
    expect(html).toContain('/site/acme/destinos');

    // Legend wrapper has role="tablist"
    expect(html).toContain('region-legend');
    expect(html).toContain('role="tablist"');

    // Exactly 4 chips in the legend
    const chipMatches = html.match(/region-legend-chip/g) || [];
    expect(chipMatches.length).toBe(4);
  });

  it('renders the Colombia SVG map with pins projected from destinations', () => {
    const section = makeSection({
      destinations: [
        { id: 'd-ctg', name: 'Cartagena', slug: 'cartagena' },
        { id: 'd-mde', name: 'Medellín', slug: 'medellin' },
        { id: 'd-ltc', name: 'Leticia', slug: 'leticia' },
      ],
    });

    const html = renderToStaticMarkup(
      <ExploreMapSection section={section} website={makeWebsite()} />,
    );

    // SVG map wrapper
    expect(html).toContain('co-map');
    expect(html).toContain('co-map-editorial');
    // ariaLabel passed through
    expect(html).toContain('Mapa de Colombia — destinos por región');
    // The co-land silhouette path renders
    expect(html).toContain('class="co-land"');

    // Pins — one <g class="co-pin"> per destination that resolved
    const pinMatches = html.match(/data-pin-id="/g) || [];
    expect(pinMatches.length).toBe(3);

    // Per-destination pin metadata
    expect(html).toContain('data-pin-id="d-ctg"');
    expect(html).toContain('data-pin-id="d-mde"');
    expect(html).toContain('data-pin-id="d-ltc"');

    // Region derivation — Cartagena → caribe, Medellín → andes, Leticia → selva
    expect(html).toMatch(/data-pin-id="d-ctg"[^>]*data-region="caribe"/);
    expect(html).toMatch(/data-pin-id="d-mde"[^>]*data-region="andes"/);
    expect(html).toMatch(/data-pin-id="d-ltc"[^>]*data-region="selva"/);
  });

  it('falls back to hydrated featuredDestinations when no explicit destinations given', () => {
    const section = makeSection({
      featuredDestinations: [
        {
          slug: 'cartagena',
          headline: 'Cartagena',
          tagline: null,
          heroImageUrl: null,
          featuredOrder: 1,
        },
      ],
    });

    const html = renderToStaticMarkup(
      <ExploreMapSection section={section} website={makeWebsite()} />,
    );

    // featuredDestinations[0].headline === 'Cartagena' → matches
    // COLOMBIA_CITIES → caribe pin rendered.
    expect(html).toContain('data-pin-id="cartagena"');
    expect(html).toMatch(/data-pin-id="cartagena"[^>]*data-region="caribe"/);
  });

  it('renders legend-only (no pins) when destinations are missing', () => {
    const section = makeSection({
      title: 'Colombia, a tu ritmo',
      // No destinations, no featuredDestinations
    });

    const html = renderToStaticMarkup(
      <ExploreMapSection section={section} website={makeWebsite()} />,
    );

    // The map SVG still mounts (legend-only variant)
    expect(html).toContain('co-map-editorial');
    // Region chips still render
    expect(html).toContain('data-region="caribe"');
    // But there are ZERO pins in the SVG
    expect(html).not.toContain('data-pin-id="');
  });

  it('ignores unknown destinations that do not match COLOMBIA_CITIES', () => {
    const section = makeSection({
      destinations: [
        { id: 'd-ctg', name: 'Cartagena' },
        { id: 'd-xx', name: 'Planeta Marte' }, // unknown
      ],
    });

    const html = renderToStaticMarkup(
      <ExploreMapSection section={section} website={makeWebsite()} />,
    );

    // Only the known pin survives
    expect(html).toContain('data-pin-id="d-ctg"');
    expect(html).not.toContain('data-pin-id="d-xx"');
  });

  it('honours authored eyebrow / title / subtitle / ctaLabel overrides', () => {
    const section = makeSection({
      eyebrow: 'DESCUBRE',
      title: 'Regiones que cuentan historias',
      subtitle: 'Del mar al Amazonas, cada región con su propio ritmo.',
      ctaLabel: 'Explora más',
      ctaHref: '/custom-destinos',
    });

    const html = renderToStaticMarkup(
      <ExploreMapSection section={section} website={makeWebsite()} />,
    );

    expect(html).toContain('DESCUBRE');
    expect(html).toContain('Regiones que cuentan historias');
    expect(html).toContain('Del mar al Amazonas');
    expect(html).toContain('Explora más');
    expect(html).toContain('/site/acme/custom-destinos');
  });
});
