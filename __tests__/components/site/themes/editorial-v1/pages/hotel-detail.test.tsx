/**
 * editorial-v1 — <EditorialHotelDetail /> behavioral tests.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { EditorialHotelDetail } from '@/components/site/themes/editorial-v1/pages/hotel-detail';
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
    id: 'h1',
    name: 'Hotel Casa Lola',
    slug: 'hotel-casa-lola',
    type: 'hotel',
    ...overrides,
  } as ProductData;
}

describe('<EditorialHotelDetail /> editorial-v1', () => {
  it('renders with minimal product data and wraps the generic body', () => {
    const markup = renderToStaticMarkup(
      <EditorialHotelDetail
        website={makeWebsite()}
        payload={{
          product: makeProduct(),
          basePath: '/site/acme',
          displayName: 'Hotel Casa Lola',
          displayLocation: 'Cartagena, Colombia',
        }}
      >
        <section data-testid="generic-body">generic</section>
      </EditorialHotelDetail>
    );

    expect(markup).toContain('data-template-set="editorial-v1"');
    expect(markup).toContain('data-editorial-variant="hotel-detail"');
    expect(markup).toContain('data-testid="generic-body"');
    expect(markup).toContain('editorial-hotel-breadcrumbs');
  });

  it('hides amenities section when product.amenities is empty', () => {
    const markup = renderToStaticMarkup(
      <EditorialHotelDetail
        website={makeWebsite()}
        payload={{
          product: makeProduct({ amenities: [] }),
          basePath: '/site/acme',
          displayName: 'Hotel Casa Lola',
          displayLocation: null,
        }}
      >
        <section />
      </EditorialHotelDetail>
    );

    expect(markup).not.toContain('editorial-hotel-amenities');
  });

  it('shows amenities section when amenities are present', () => {
    const markup = renderToStaticMarkup(
      <EditorialHotelDetail
        website={makeWebsite()}
        payload={{
          product: makeProduct({
            amenities: ['Wi-Fi', 'Piscina', 'Desayuno'],
          }),
          basePath: '/site/acme',
          displayName: 'Hotel Casa Lola',
          displayLocation: null,
        }}
      >
        <section />
      </EditorialHotelDetail>
    );

    expect(markup).toContain('editorial-hotel-amenities');
    expect(markup).toContain('Wi-Fi');
    expect(markup).toContain('Piscina');
    expect(markup).toContain('Desayuno');
  });

  it('renders star rating when product.star_rating is set', () => {
    const markup = renderToStaticMarkup(
      <EditorialHotelDetail
        website={makeWebsite()}
        payload={{
          product: makeProduct({ star_rating: 4 }),
          basePath: '/site/acme',
          displayName: 'Hotel Casa Lola',
          displayLocation: 'Cartagena',
        }}
      >
        <section />
      </EditorialHotelDetail>
    );

    expect(markup).toContain('★★★★');
  });

  it('falls back to generic body when payload is missing', () => {
    const markup = renderToStaticMarkup(
      <EditorialHotelDetail website={makeWebsite()} payload={undefined}>
        <section data-testid="generic-only">generic only</section>
      </EditorialHotelDetail>
    );

    expect(markup).toContain('data-testid="generic-only"');
    expect(markup).not.toContain('data-editorial-variant="hotel-detail"');
  });
});
