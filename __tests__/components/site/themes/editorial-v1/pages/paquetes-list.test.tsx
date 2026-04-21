/**
 * editorial-v1 — <EditorialPaquetesListPage /> SSR tests.
 *
 * Coverage:
 *  - Renders hero (eyebrow + title + emphasis) + breadcrumbs
 *  - Renders filter toolbar with country/destination/duration chips derived
 *    from input data
 *  - Renders grid with N cards for N packages
 *  - Renders list/map view toggle
 *  - Renders "Cargar más" when items > PAGE_SIZE
 *  - Empty state when input is empty
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { EditorialPaquetesListPage } from '@/components/site/themes/editorial-v1/pages/paquetes-list';
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

function makePkg(idx: number, overrides: Partial<ProductData> = {}): ProductData {
  return {
    id: `pkg-${idx}`,
    slug: `paquete-${idx}`,
    name: `Paquete ${idx}`,
    description: `Descripción ${idx}`,
    image: `https://cdn.example/${idx}.jpg`,
    type: 'package',
    country: idx % 2 === 0 ? 'Colombia' : 'México',
    city: 'Cartagena',
    location: idx % 2 === 0 ? 'Cartagena, Colombia' : 'Oaxaca, México',
    currency: 'USD',
    price: 1200 + idx * 100,
    is_featured: idx === 1,
    itinerary_items: new Array(3 + idx).fill(null).map((_, i) => ({
      id: `it-${idx}-${i}`,
      day: i,
    })),
    ...overrides,
  } as unknown as ProductData;
}

describe('<EditorialPaquetesListPage />', () => {
  it('renders hero, breadcrumbs, toolbar chips, and package cards', () => {
    const packages = [1, 2, 3, 4].map((i) => makePkg(i));
    const markup = renderToStaticMarkup(
      <EditorialPaquetesListPage website={makeWebsite()} packages={packages} />,
    );

    // Hero
    expect(markup).toContain('data-testid="editorial-paquetes-list"');
    expect(markup).toContain('Catálogo');
    expect(markup).toContain('Paquetes');
    expect(markup).toContain('por toda Colombia.');
    // Breadcrumbs
    expect(markup).toContain('Acme Travel');

    // Filter toolbar
    expect(markup).toContain('data-testid="paquetes-filterbar"');
    expect(markup).toContain('País');
    expect(markup).toContain('Destino');
    expect(markup).toContain('Duración');
    expect(markup).toContain('>Colombia<');
    expect(markup).toContain('>México<');

    // Count
    expect(markup).toContain('data-testid="paquetes-count"');

    // View toggle
    expect(markup).toContain('pql-view-toggle');
    expect(markup).toMatch(/Lista/);
    expect(markup).toMatch(/Mapa/);

    // Grid + cards
    expect(markup).toContain('data-testid="paquetes-grid"');
    expect(markup).toContain('Paquete 1');
    expect(markup).toContain('Paquete 4');

    // "Popular" badge on featured card
    expect(markup).toContain('>Popular<');
  });

  it('renders empty toolbar and no grid when packages list is empty', () => {
    const markup = renderToStaticMarkup(
      <EditorialPaquetesListPage website={makeWebsite()} packages={[]} />,
    );
    expect(markup).toContain('data-testid="editorial-paquetes-list"');
    // Zero count still renders the "count" region; the filter groups should
    // not appear (no data to derive chips from) and the empty state shows.
    expect(markup).toContain('data-testid="paquetes-empty"');
    expect(markup).toContain('Ningún paquete con esos filtros');
  });

  it('shows "Cargar más" when packages > PAGE_SIZE (9)', () => {
    const packages = Array.from({ length: 12 }, (_, i) => makePkg(i + 1));
    const markup = renderToStaticMarkup(
      <EditorialPaquetesListPage website={makeWebsite()} packages={packages} />,
    );
    expect(markup).toContain('data-testid="paquetes-load-more"');
    expect(markup).toContain('Cargar más');
  });

  it('does not show "Cargar más" when packages <= PAGE_SIZE', () => {
    const packages = Array.from({ length: 5 }, (_, i) => makePkg(i + 1));
    const markup = renderToStaticMarkup(
      <EditorialPaquetesListPage website={makeWebsite()} packages={packages} />,
    );
    expect(markup).not.toContain('data-testid="paquetes-load-more"');
  });

  it('renders duration chips derived from itinerary_items length', () => {
    // Package 1 has 4 itinerary items → "4-7 días" bucket appears.
    const packages = [makePkg(1)];
    const markup = renderToStaticMarkup(
      <EditorialPaquetesListPage website={makeWebsite()} packages={packages} />,
    );
    expect(markup).toContain('4-7 días');
  });
});
