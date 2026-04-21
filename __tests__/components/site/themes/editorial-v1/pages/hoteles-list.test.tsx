/**
 * editorial-v1 — <EditorialHotelesListPage /> SSR tests.
 *
 * Coverage:
 *  - Renders hero (eyebrow + title + emphasis) + breadcrumbs
 *  - Renders filter toolbar with city/stars/amenity chips derived from data
 *  - Renders grid with N cards for N hotels (using HotelCard variant="card")
 *  - Empty state when input is empty
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { EditorialHotelesListPage } from '@/components/site/themes/editorial-v1/pages/hoteles-list';
import type { WebsiteData } from '@/lib/supabase/get-website';
import type { ProductData } from '@bukeer/website-contract';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: { src?: string; alt?: string }) =>
    React.createElement('img', { src: props.src, alt: props.alt ?? '' }),
}));

function makeWebsite(): WebsiteData {
  return {
    id: 'w1',
    account_id: 'a1',
    subdomain: 'acme',
    custom_domain: null,
    status: 'published',
    template_id: 't1',
    theme: { tokens: {}, profile: { metadata: { templateSet: 'editorial-v1' } } },
    content: { siteName: 'Acme Travel' },
    featured_products: {
      destinations: [],
      hotels: [],
      activities: [],
      transfers: [],
      packages: [],
    },
    sections: [],
  } as unknown as WebsiteData;
}

function makeHotel(idx: number, overrides: Partial<ProductData> = {}): ProductData {
  return {
    id: `hotel-${idx}`,
    slug: `hotel-${idx}`,
    name: `Hotel ${idx}`,
    description: `Descripción del hotel ${idx}`,
    image: `https://cdn.example/hotel-${idx}.jpg`,
    type: 'hotel',
    city: idx % 2 === 0 ? 'Cartagena' : 'Medellín',
    country: 'Colombia',
    location: idx % 2 === 0 ? 'Cartagena, Colombia' : 'Medellín, Colombia',
    star_rating: idx <= 2 ? 5 : 4,
    amenities: idx === 1 ? ['Wifi', 'Piscina', 'Spa'] : ['Wifi', 'Restaurante'],
    ...overrides,
  } as unknown as ProductData;
}

describe('<EditorialHotelesListPage />', () => {
  it('renders hero, breadcrumbs, toolbar chips, and hotel cards', () => {
    const hotels = [1, 2, 3, 4].map((i) => makeHotel(i));
    const markup = renderToStaticMarkup(
      <EditorialHotelesListPage website={makeWebsite()} hotels={hotels} />,
    );

    // Hero
    expect(markup).toContain('data-testid="editorial-hoteles-list"');
    expect(markup).toContain('HOTELES');
    expect(markup).toContain('Estancias');
    expect(markup).toContain('curadas por ciudad.');
    // Breadcrumbs — site name label.
    expect(markup).toContain('Acme Travel');

    // Filter toolbar
    expect(markup).toContain('data-testid="hoteles-filterbar"');
    expect(markup).toContain('Ciudad');
    expect(markup).toContain('Estrellas');
    expect(markup).toContain('Servicios');
    expect(markup).toContain('>Cartagena<');
    expect(markup).toContain('>Medellín<');
    // Stars chips
    expect(markup).toContain('5★');
    expect(markup).toContain('4★');
    // Amenities — Wifi should appear (most frequent).
    expect(markup).toContain('>Wifi<');

    // Count
    expect(markup).toContain('data-testid="hoteles-count"');

    // View toggle
    expect(markup).toContain('pql-view-toggle');
    expect(markup).toMatch(/Lista/);
    expect(markup).toMatch(/Mapa/);

    // Grid + cards — HotelCard `variant="card"` exposes `data-testid="hotel-card"`.
    expect(markup).toContain('data-testid="hoteles-grid"');
    expect(markup).toContain('data-testid="hotel-list-card"');
    expect(markup).toContain('Hotel 1');
    expect(markup).toContain('Hotel 4');
  });

  it('renders empty state when hotels list is empty', () => {
    const markup = renderToStaticMarkup(
      <EditorialHotelesListPage website={makeWebsite()} hotels={[]} />,
    );
    expect(markup).toContain('data-testid="editorial-hoteles-list"');
    expect(markup).toContain('data-testid="hoteles-empty"');
    expect(markup).toContain('Ningún hotel con esos filtros');
  });

  it('shows "Cargar más" when hotels > PAGE_SIZE (9)', () => {
    const hotels = Array.from({ length: 12 }, (_, i) => makeHotel(i + 1));
    const markup = renderToStaticMarkup(
      <EditorialHotelesListPage website={makeWebsite()} hotels={hotels} />,
    );
    expect(markup).toContain('data-testid="hoteles-load-more"');
    expect(markup).toContain('Cargar más');
  });
});
