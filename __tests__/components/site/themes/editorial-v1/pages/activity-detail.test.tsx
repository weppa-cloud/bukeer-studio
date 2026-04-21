/**
 * editorial-v1 — <EditorialActivityDetail /> behavioral tests.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { EditorialActivityDetail } from '@/components/site/themes/editorial-v1/pages/activity-detail';
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
    id: 'a1',
    name: 'Caminata Cocora',
    slug: 'caminata-cocora',
    type: 'activity',
    ...overrides,
  } as ProductData;
}

describe('<EditorialActivityDetail /> editorial-v1', () => {
  it('renders standalone activity detail with editorial shell', () => {
    const markup = renderToStaticMarkup(
      <EditorialActivityDetail
        website={makeWebsite()}
        payload={{
          product: makeProduct(),
          basePath: '/site/acme',
          displayName: 'Caminata Cocora',
          displayLocation: 'Salento, Colombia',
        }}
      >
        <section data-testid="generic-body">generic</section>
      </EditorialActivityDetail>
    );

    expect(markup).toContain('data-template-set="editorial-v1"');
    expect(markup).toContain('data-editorial-variant="activity-detail"');
    expect(markup).toContain('data-screen-label="ActivityDetail"');
    expect(markup).toContain('Salento, Colombia');
  });

  it('does not inject highlight copy into timeline when highlights are empty', () => {
    const markup = renderToStaticMarkup(
      <EditorialActivityDetail
        website={makeWebsite()}
        payload={{
          product: makeProduct({ highlights: [] }),
          basePath: '/site/acme',
          displayName: 'Caminata Cocora',
          displayLocation: null,
        }}
      >
        <section />
      </EditorialActivityDetail>
    );

    expect(markup).not.toContain('Palmas de cera');
    expect(markup).not.toContain('Vistas panorámicas');
  });

  it('injects highlight copy into timeline when highlights are present', () => {
    const markup = renderToStaticMarkup(
      <EditorialActivityDetail
        website={makeWebsite()}
        payload={{
          product: makeProduct({
            highlights: ['Palmas de cera', 'Vistas panorámicas'],
          }),
          basePath: '/site/acme',
          displayName: 'Caminata Cocora',
          displayLocation: null,
        }}
      >
        <section />
      </EditorialActivityDetail>
    );

    expect(markup).toContain('Palmas de cera');
    expect(markup).toContain('Vistas panorámicas');
  });

  it('falls back to generic body when payload is missing', () => {
    const markup = renderToStaticMarkup(
      <EditorialActivityDetail website={makeWebsite()} payload={undefined}>
        <section data-testid="generic-only">generic only</section>
      </EditorialActivityDetail>
    );

    expect(markup).toContain('data-testid="generic-only"');
    expect(markup).not.toContain('data-editorial-variant="activity-detail"');
  });
});
