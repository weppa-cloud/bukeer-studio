import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// `@/lib/sanitize` pulls in `isomorphic-dompurify`, whose transitive ESM deps
// break ts-jest's CommonJS runtime. The blog-detail page imports SafeHtml at
// top level, so when template-slot imports blog-detail the chain loads here.
// Mock it to a trivial passthrough for the slot test.
jest.mock('@/lib/sanitize', () => ({
  SafeHtml: ({ content }: { content: string }) =>
    React.createElement('div', { dangerouslySetInnerHTML: { __html: content } }),
}));

import { TemplateSlot } from '@/components/site/themes/editorial-v1/template-slot';
import type { WebsiteData } from '@/lib/supabase/get-website';

// Minimal website shape — we only need `theme.profile.metadata.templateSet`
// for `resolveTemplateSet`.
function makeWebsite(templateSet: string | null): WebsiteData {
  const metadata = templateSet ? { templateSet } : {};
  return {
    theme: {
      tokens: {},
      profile: { metadata },
    },
  } as unknown as WebsiteData;
}

describe('editorial-v1 <TemplateSlot>', () => {
  it('renders editorial package-detail variant when payload is provided', () => {
    const element = (
      <TemplateSlot
        name="package-detail"
        website={makeWebsite('editorial-v1')}
        payload={{
          product: { id: 'p1', name: 'Caribe', slug: 'caribe', type: 'package' },
          basePath: '/site/acme',
          displayName: 'Caribe',
          displayLocation: 'Cartagena',
          resolvedLocale: 'es-CO',
          googleReviews: [],
          similarProducts: [],
          faqs: [{ question: 'q', answer: 'a' }],
        }}
      >
        <section data-testid="fallback">generic body</section>
      </TemplateSlot>
    );
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain('data-editorial-variant="package-detail"');
    expect(markup).toContain('data-screen-label="PackageDetail"');
  });

  it('falls back to children when package-detail payload is missing', () => {
    const element = (
      <TemplateSlot name="package-detail" website={makeWebsite('editorial-v1')}>
        <section data-testid="fallback">generic body</section>
      </TemplateSlot>
    );
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain('data-testid="fallback"');
  });

  it('renders children for websites with no template set', () => {
    const element = (
      <TemplateSlot name="blog-detail" website={makeWebsite(null)}>
        <div>plain blog</div>
      </TemplateSlot>
    );
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain('plain blog');
  });

  it('renders children when website is null', () => {
    const element = (
      <TemplateSlot name="planner-detail" website={null}>
        <span>planner fallback</span>
      </TemplateSlot>
    );
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain('planner fallback');
  });
});
