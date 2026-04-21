/**
 * editorial-v1 — <DestinationsSection /> behavioural tests.
 *
 * Coverage (SSR via renderToStaticMarkup — matches node testEnvironment):
 *  - Empty destinations → renders fallback + section header.
 *  - Eyebrow defaults to "RUTAS INCONFUNDIBLES" when absent.
 *  - List view paints all cards with the asymmetric feature layout.
 *  - Map view (via `view: 'map'` + toggle disabled) renders the
 *    interactive map side list and the SVG stage with pins.
 *  - Toggle pill markup (list + map buttons) is present when enabled.
 *
 * Map client + next/image + next/navigation are stubbed — the map SVG
 * ports are server-safe but their hydration path is not relevant to
 * what the SSR pass verifies (SEO-indexable markup).
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { DestinationsSection } from '@/components/site/themes/editorial-v1/sections/destinations';
import type { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: { src?: string; alt?: string }) =>
    // eslint-disable-next-line @next/next/no-img-element
    React.createElement('img', { src: props.src, alt: props.alt ?? '' }),
}));

function makeWebsite(overrides: Partial<WebsiteData> = {}): WebsiteData {
  return {
    id: 'w1',
    account_id: 'a1',
    subdomain: 'acme',
    custom_domain: null,
    status: 'published',
    template_id: 't1',
    theme: { tokens: {}, profile: { metadata: { templateSet: 'editorial-v1' } } },
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
    id: 'dest-1',
    section_type: 'destinations',
    variant: 'editorial',
    display_order: 1,
    is_enabled: true,
    config: {},
    content,
  };
}

const SIX_DESTINATIONS = [
  {
    id: 'd1',
    name: 'Cartagena',
    slug: 'cartagena',
    image: 'https://cdn.example/cartagena.jpg',
    state: 'Bolívar',
    region: 'caribe',
    hotel_count: 12,
    activity_count: 8,
    total: 20,
    lat: 10.393,
    lng: -75.483,
  },
  {
    id: 'd2',
    name: 'Medellín',
    slug: 'medellin',
    image: 'https://cdn.example/medellin.jpg',
    region: 'andes',
    hotel_count: 6,
    activity_count: 11,
    total: 17,
  },
  {
    id: 'd3',
    name: 'Tayrona',
    slug: 'tayrona',
    image: 'https://cdn.example/tayrona.jpg',
    region: 'caribe',
    activitiesCount: 5,
    packagesCount: 3,
  },
  {
    id: 'd4',
    name: 'Guatapé',
    slug: 'guatape',
    image: 'https://cdn.example/guatape.jpg',
    region: 'andes',
  },
  {
    id: 'd5',
    name: 'San Andrés',
    slug: 'san-andres',
    image: 'https://cdn.example/sanandres.jpg',
    region: 'caribe',
  },
  {
    id: 'd6',
    name: 'Leticia',
    slug: 'leticia',
    region: 'selva',
  },
];

describe('editorial-v1 <DestinationsSection>', () => {
  it('renders fallback + default eyebrow when destinations is empty', () => {
    const section = makeSection({
      title: 'Ocho Colombias',
      destinations: [],
    });

    const html = renderToStaticMarkup(
      React.createElement(DestinationsSection, {
        section,
        website: makeWebsite(),
      }),
    );

    expect(html).toContain('RUTAS INCONFUNDIBLES');
    expect(html).toContain('Ocho Colombias');
    expect(html).toContain('Sin destinos disponibles');
    // Grid/toggle should not render without items.
    expect(html).not.toContain('class="dest-grid"');
    expect(html).not.toContain('view-toggle');
  });

  it('respects a custom eyebrow when provided', () => {
    const section = makeSection({
      eyebrow: 'Destinos',
      title: 'Ocho Colombias',
      destinations: SIX_DESTINATIONS,
    });

    const html = renderToStaticMarkup(
      React.createElement(DestinationsSection, {
        section,
        website: makeWebsite(),
      }),
    );

    expect(html).toContain('>Destinos<');
    expect(html).not.toContain('RUTAS INCONFUNDIBLES');
  });

  it('list view paints every destination using the asymmetric feature grid', () => {
    const section = makeSection({
      title: 'Ocho Colombias',
      destinations: SIX_DESTINATIONS,
    });

    const html = renderToStaticMarkup(
      React.createElement(DestinationsSection, {
        section,
        website: makeWebsite(),
      }),
    );

    // Grid wrapper + all card names present.
    expect(html).toContain('class="dest-grid"');
    for (const d of SIX_DESTINATIONS) {
      expect(html).toContain(d.name);
    }
    // Feature layout classes — the first two tiles are the big + medium
    // "feature" tiles; the third slot starts the smaller-square rhythm.
    expect(html).toContain('dest-card c-12-4');
    expect(html).toContain('dest-card c-5-4');
    expect(html).toContain('dest-card c-4');
    expect(html).toContain('dest-card c-4-tall');
  });

  it('builds `/destinos/{slug}` links when slug is present', () => {
    const section = makeSection({
      title: 'Ocho Colombias',
      destinations: SIX_DESTINATIONS,
    });

    const html = renderToStaticMarkup(
      React.createElement(DestinationsSection, {
        section,
        website: makeWebsite(),
      }),
    );

    expect(html).toContain('/site/acme/destinos/cartagena');
    expect(html).toContain('/site/acme/destinos/medellin');
  });

  it('renders counts string (activities · paquetes) when provided', () => {
    const section = makeSection({
      title: 'Ocho Colombias',
      destinations: [
        {
          id: 'd-cart',
          name: 'Cartagena',
          slug: 'cartagena',
          image: 'https://cdn.example/cartagena.jpg',
          activity_count: 8,
          hotel_count: 12,
        },
      ],
    });

    const html = renderToStaticMarkup(
      React.createElement(DestinationsSection, {
        section,
        website: makeWebsite(),
      }),
    );

    // Default mapping: activity_count → activities, hotel_count → packages
    // (we don't have a separate package count on the hydrated payload,
    // so activity_count is the real signal here).
    expect(html).toContain('8 actividades');
    // hotel_count is NOT wired to packages today — so the count string
    // should contain "8 actividades" but NOT an invented packages count.
    expect(html).not.toContain('12 paquetes');
  });

  it('wires toggle pill (list + map) when there are destinations and toggle is enabled', () => {
    const section = makeSection({
      title: 'Ocho Colombias',
      destinations: SIX_DESTINATIONS,
    });

    const html = renderToStaticMarkup(
      React.createElement(DestinationsSection, {
        section,
        website: makeWebsite(),
      }),
    );

    expect(html).toContain('view-toggle');
    // Buttons render with the designer labels.
    expect(html).toContain('>Lista');
    expect(html).toContain('>Mapa');
    // Both view slots are mounted — only the active one is visible.
    expect(html).toContain('data-view="list"');
    expect(html).toContain('data-view="map"');
  });

  it('hides the toggle pill but still renders the chosen view when enableToggle=false', () => {
    const section = makeSection({
      title: 'Ocho Colombias',
      view: 'list',
      enableToggle: false,
      destinations: SIX_DESTINATIONS,
    });

    const html = renderToStaticMarkup(
      React.createElement(DestinationsSection, {
        section,
        website: makeWebsite(),
      }),
    );

    expect(html).not.toContain('view-toggle');
    expect(html).toContain('class="dest-grid"');
  });

  it('map view (view=map + toggle off) renders the map stage and side cards', () => {
    const section = makeSection({
      title: 'Ocho Colombias',
      view: 'map',
      enableToggle: false,
      destinations: SIX_DESTINATIONS,
    });

    const html = renderToStaticMarkup(
      React.createElement(DestinationsSection, {
        section,
        website: makeWebsite(),
      }),
    );

    // Map stage container + SVG + side list markers.
    expect(html).toContain('dest-map-view');
    expect(html).toContain('dest-map-stage');
    expect(html).toContain('dest-map-side');
    // Side cards repeat each destination's name.
    for (const d of SIX_DESTINATIONS) {
      expect(html).toContain(d.name);
    }
    // Side card numbering (1..N) is present.
    expect(html).toContain('>1<');
    expect(html).toContain('>6<');
  });
});
