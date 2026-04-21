/**
 * editorial-v1 — <EditorialDestinoDetailPage /> SSR tests.
 *
 * Coverage:
 *  - Hero + breadcrumbs + quick facts render for a minimal payload.
 *  - Activities / Hotels / Packages sections appear only when products exist.
 *  - Related destinations filter by region and exclude current.
 *  - CTA band + JSON-LD TouristDestination + BreadcrumbList emit.
 *  - Null payload short-circuits (returns null).
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { EditorialDestinoDetailPage } from '@/components/site/themes/editorial-v1/pages/destino-detail';
import type { WebsiteData } from '@/lib/supabase/get-website';
import type { DestinationData } from '@/lib/supabase/get-pages';
import type { ProductData } from '@bukeer/website-contract';

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
    social: { whatsapp: '+573101234567' },
  } as unknown as WebsiteData;
}

const CARTAGENA: DestinationData = {
  id: 'cartagena',
  name: 'Cartagena',
  slug: 'cartagena',
  state: 'Bolívar',
  lat: 10.393,
  lng: -75.483,
  hotel_count: 12,
  activity_count: 8,
  package_count: 3,
  total: 20,
  min_price: null,
  image: 'https://cdn.example/cartagena.jpg',
};

function makeProduct(
  id: string,
  name: string,
  type: 'package' | 'activity' | 'hotel',
  location = 'Cartagena',
): ProductData {
  return {
    id,
    name,
    slug: id,
    type,
    description: `Descripción de ${name}`,
    image: `https://cdn.example/${id}.jpg`,
    location,
  };
}

describe('<EditorialDestinoDetailPage />', () => {
  it('returns null for missing payload', () => {
    const markup = renderToStaticMarkup(
      <EditorialDestinoDetailPage website={makeWebsite()} />,
    );
    expect(markup).toBe('');
  });

  it('renders hero + breadcrumbs + quick facts for a minimal payload', () => {
    const markup = renderToStaticMarkup(
      <EditorialDestinoDetailPage
        website={makeWebsite()}
        payload={{
          destination: CARTAGENA,
          products: [],
        }}
      />,
    );
    // Top-level hooks
    expect(markup).toContain('data-testid="editorial-destino-detail"');
    expect(markup).toContain('data-testid="destino-hero"');
    // Breadcrumbs: Home → Destinos → Cartagena
    expect(markup).toContain('Inicio');
    expect(markup).toContain('Destinos');
    expect(markup).toContain('>Cartagena<');
    // H1 + state em
    expect(markup).toContain('Cartagena');
    expect(markup).toContain('Bolívar');
    // Quick facts
    expect(markup).toContain('data-testid="destino-quick-facts"');
    // About block
    expect(markup).toContain('data-testid="destino-about"');
    // JSON-LD
    expect(markup).toContain('"@type":"TouristDestination"');
    expect(markup).toContain('"@type":"BreadcrumbList"');
    // No product sections when there are no products
    expect(markup).not.toContain('data-testid="destino-activities"');
    expect(markup).not.toContain('data-testid="destino-hotels"');
    expect(markup).not.toContain('data-testid="destino-packages"');
  });

  it('renders activities / hotels / packages grids only when products exist', () => {
    const markup = renderToStaticMarkup(
      <EditorialDestinoDetailPage
        website={makeWebsite()}
        payload={{
          destination: CARTAGENA,
          products: [
            makeProduct('city-tour', 'Tour por la ciudad amurallada', 'activity'),
            makeProduct('boutique-hotel', 'Hotel Boutique Santo Toribio', 'hotel'),
            makeProduct('caribbean-week', 'Caribe en 7 días', 'package'),
          ],
        }}
      />,
    );
    // All three conditional sections present
    expect(markup).toContain('data-testid="destino-activities"');
    expect(markup).toContain('Tour por la ciudad amurallada');
    expect(markup).toContain('data-testid="destino-hotels"');
    expect(markup).toContain('Hotel Boutique Santo Toribio');
    expect(markup).toContain('data-testid="destino-packages"');
    expect(markup).toContain('Caribe en 7 días');
    // Links use editorial routes (destino detail doesn't link to /destinos)
    expect(markup).toContain('/site/acme/actividades/city-tour');
    expect(markup).toContain('/site/acme/hoteles/boutique-hotel');
    expect(markup).toContain('/site/acme/paquetes/caribbean-week');
  });

  it('filters related destinations to the same region and excludes current', () => {
    const related: DestinationData[] = [
      {
        ...CARTAGENA, // would self-match; must be excluded.
      },
      {
        id: 'santa-marta',
        name: 'Santa Marta',
        slug: 'santa-marta',
        state: 'Magdalena',
        lat: 11.24,
        lng: -74.21,
        hotel_count: 8,
        activity_count: 5,
        package_count: 1,
        total: 13,
        min_price: null,
        image: null,
      },
      {
        id: 'bogota',
        name: 'Bogotá',
        slug: 'bogota',
        state: 'Cundinamarca',
        lat: 4.711,
        lng: -74.072,
        hotel_count: 25,
        activity_count: 15,
        package_count: 4,
        total: 40,
        min_price: null,
        image: null,
      },
    ];
    const markup = renderToStaticMarkup(
      <EditorialDestinoDetailPage
        website={makeWebsite()}
        payload={{
          destination: CARTAGENA,
          products: [],
          relatedDestinations: related,
        }}
      />,
    );
    // Caribe region match: Santa Marta renders
    expect(markup).toContain('data-testid="destino-related"');
    expect(markup).toContain('Santa Marta');
    // Andes (Bogotá) excluded (different region)
    expect(markup).not.toContain('>Bogotá<');
  });

  it('renders CTA band with WhatsApp link when social.whatsapp is present', () => {
    const markup = renderToStaticMarkup(
      <EditorialDestinoDetailPage
        website={makeWebsite()}
        payload={{
          destination: CARTAGENA,
          products: [],
          whatsapp: '+573101234567',
        }}
      />,
    );
    expect(markup).toContain('data-testid="destino-cta"');
    expect(markup).toContain('Cotiza un viaje a');
    expect(markup).toContain('Cotizar viaje');
    // WhatsApp deep link present
    expect(markup).toContain('https://wa.me/573101234567');
  });

  it('omits the CTA WhatsApp button when no number is provided', () => {
    const markup = renderToStaticMarkup(
      <EditorialDestinoDetailPage
        website={makeWebsite()}
        payload={{
          destination: CARTAGENA,
          products: [],
        }}
      />,
    );
    expect(markup).toContain('data-testid="destino-cta"');
    expect(markup).toContain('Cotizar viaje');
    expect(markup).not.toContain('https://wa.me/');
  });
});
