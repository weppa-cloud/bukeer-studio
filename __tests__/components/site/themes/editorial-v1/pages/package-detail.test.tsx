/**
 * editorial-v1 — <EditorialPackageDetail /> behavioral tests.
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
    content: {},
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
  it('renders standalone package detail with editorial shell and seo blocks', () => {
    const markup = renderToStaticMarkup(
      <EditorialPackageDetail
        website={makeWebsite()}
        payload={{
          product: makeProduct(),
          basePath: '/site/acme',
          displayName: 'Caribe esencial',
          displayLocation: 'Cartagena, Colombia',
          resolvedLocale: 'es-CO',
          googleReviews: [],
          similarProducts: [],
          faqs: [{ question: '¿Qué incluye?', answer: 'Incluye logística.' }],
        }}
      >
        <section data-testid="generic-body">generic</section>
      </EditorialPackageDetail>
    );

    expect(markup).toContain('data-template-set="editorial-v1"');
    expect(markup).toContain('data-editorial-variant="package-detail"');
    expect(markup).toContain('data-screen-label="PackageDetail"');
    expect(markup).toContain('application/ld+json');
    expect(markup).toContain('Caribe esencial');
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

