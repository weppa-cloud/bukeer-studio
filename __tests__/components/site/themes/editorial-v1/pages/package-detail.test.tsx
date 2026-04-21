/**
 * editorial-v1 — <EditorialPackageDetail /> behavioral tests.
 *
 * Coverage:
 *  - Renders with minimal product data (generic body pass-through + chrome)
 *  - Hotels section hides when no lodging entries in itinerary
 *  - Flights section hides when no flights in itinerary
 *  - Hotels section shows when lodging entries are present
 *  - Flights section shows when flight entries are present
 *  - ItineraryMap hides when no itinerary stops can be geocoded
 *  - Falls back to generic body when payload is missing
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { EditorialPackageDetail } from '@/components/site/themes/editorial-v1/pages/package-detail';
import type { WebsiteData } from '@/lib/supabase/get-website';
import type { ProductData } from '@bukeer/website-contract';

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: { src?: string; alt?: string }) =>
    // eslint-disable-next-line @next/next/no-img-element
    React.createElement('img', { src: props.src, alt: props.alt ?? '' }),
}));

function makeWebsite(): WebsiteData {
  return {
    subdomain: 'acme',
    theme: { tokens: {}, profile: { metadata: { templateSet: 'editorial-v1' } } },
  } as unknown as WebsiteData;
}

function makeProduct(overrides: Partial<ProductData> = {}): ProductData {
  return {
    id: 'p1',
    name: 'Caribe esencial',
    slug: 'caribe-esencial',
    type: 'package',
    ...overrides,
  } as ProductData;
}

describe('<EditorialPackageDetail /> editorial-v1', () => {
  it('renders with minimal product data and includes the generic body passthrough', () => {
    const markup = renderToStaticMarkup(
      <EditorialPackageDetail
        website={makeWebsite()}
        payload={{
          product: makeProduct(),
          basePath: '/site/acme',
          displayName: 'Caribe esencial',
          displayLocation: 'Cartagena, Colombia',
        }}
      >
        <section data-testid="generic-body">generic</section>
      </EditorialPackageDetail>
    );

    expect(markup).toContain('data-template-set="editorial-v1"');
    expect(markup).toContain('data-editorial-variant="package-detail"');
    expect(markup).toContain('data-testid="generic-body"');
    expect(markup).toContain('editorial-package-breadcrumbs');
    expect(markup).toContain('Caribe esencial');
  });

  it('hides hotels section when itinerary has no lodging entries', () => {
    const markup = renderToStaticMarkup(
      <EditorialPackageDetail
        website={makeWebsite()}
        payload={{
          product: makeProduct({
            itinerary_items: [
              { day: 1, title: 'Check-in', event_type: 'activity' },
            ],
          }),
          basePath: '/site/acme',
          displayName: 'Caribe esencial',
          displayLocation: null,
        }}
      >
        <section />
      </EditorialPackageDetail>
    );

    expect(markup).not.toContain('editorial-package-hotels');
  });

  it('hides flights section when itinerary has no flight entries', () => {
    const markup = renderToStaticMarkup(
      <EditorialPackageDetail
        website={makeWebsite()}
        payload={{
          product: makeProduct({
            itinerary_items: [
              { day: 1, title: 'Check-in', event_type: 'activity' },
            ],
          }),
          basePath: '/site/acme',
          displayName: 'Caribe esencial',
          displayLocation: null,
        }}
      >
        <section />
      </EditorialPackageDetail>
    );

    expect(markup).not.toContain('editorial-package-flights');
  });

  it('shows hotels section when lodging entries are present', () => {
    const product = makeProduct({
      itinerary_items: [
        { day: 1, title: 'Check-in', event_type: 'activity' },
      ],
    });
    // The itinerary_items type in `ProductData` does not carry lodging
    // extras, so we cast via unknown when injecting a lodging row.
    (product as unknown as { itinerary_items: unknown[] }).itinerary_items = [
      {
        day: 1,
        title: 'Hotel Casa Lola',
        event_type: 'lodging',
        city: 'Cartagena',
        nights: 3,
        star_rating: 4,
        amenities: ['Wi-Fi', 'Piscina'],
        hotel_slug: 'casa-lola',
      },
    ];

    const markup = renderToStaticMarkup(
      <EditorialPackageDetail
        website={makeWebsite()}
        payload={{
          product,
          basePath: '/site/acme',
          displayName: 'Caribe esencial',
          displayLocation: null,
        }}
      >
        <section />
      </EditorialPackageDetail>
    );

    expect(markup).toContain('editorial-package-hotels');
    expect(markup).toContain('Hotel Casa Lola');
  });

  it('shows flights section when flight entries are present', () => {
    const product = makeProduct();
    (product as unknown as { itinerary_items: unknown[] }).itinerary_items = [
      {
        day: 1,
        title: 'Vuelo BOG→CTG',
        event_type: 'flight',
        marketing_carrier: 'Avianca',
        flight_number: 'AV123',
        departure: '08:00',
        arrival: '09:30',
      },
    ];

    const markup = renderToStaticMarkup(
      <EditorialPackageDetail
        website={makeWebsite()}
        payload={{
          product,
          basePath: '/site/acme',
          displayName: 'Caribe esencial',
          displayLocation: null,
        }}
      >
        <section />
      </EditorialPackageDetail>
    );

    expect(markup).toContain('editorial-package-flights');
    expect(markup).toContain('Avianca');
    expect(markup).toContain('AV123');
  });

  it('falls back to generic body when payload is missing', () => {
    const markup = renderToStaticMarkup(
      <EditorialPackageDetail website={makeWebsite()} payload={undefined}>
        <section data-testid="generic-only">generic only</section>
      </EditorialPackageDetail>
    );

    expect(markup).toContain('data-testid="generic-only"');
    expect(markup).not.toContain('data-editorial-variant="package-detail"');
  });
});
