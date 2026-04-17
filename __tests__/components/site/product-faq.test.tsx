import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { ProductFAQ } from '@/components/site/product-faq';
import type { WebsiteData } from '@/lib/supabase/get-website';

const baseWebsite = {
  content: {
    siteName: 'Test Travel',
    tagline: 'Travel well',
    seo: { title: 'Test Travel', description: 'Desc', keywords: 'travel' },
    contact: { email: 'hello@test.com', phone: '+57 300 000 0000', address: 'Cartagena' },
    social: {},
    locale: 'es-CO',
  },
} as WebsiteData & { language?: string; locale?: string };

const faqs = [
  { question: 'What is included?', answer: 'All transfers and breakfast.' },
  { question: 'Can I cancel?', answer: 'Yes, up to 24 hours before departure.' },
];

describe('ProductFAQ', () => {
  it('returns null when the FAQ list is empty', () => {
    const markup = renderToStaticMarkup(
      React.createElement(ProductFAQ, { faqs: [], website: baseWebsite })
    );

    expect(markup).toBe('');
  });

  it('renders FAQPage JSON-LD and accordion content', () => {
    const markup = renderToStaticMarkup(
      React.createElement(ProductFAQ, {
        faqs,
        website: { ...baseWebsite, language: 'en-US' },
      })
    );

    expect(markup).toContain('lang="en-US"');
    expect(markup).toContain('What is included?');
    expect(markup).toContain('Can I cancel?');

    const scriptMatch = markup.match(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/
    );

    expect(scriptMatch).not.toBeNull();
    const schema = JSON.parse(scriptMatch?.[1] ?? '{}');

    expect(schema['@type']).toBe('FAQPage');
    expect(schema.mainEntity).toHaveLength(2);
    expect(schema.mainEntity[0].acceptedAnswer.text).toBe('All transfers and breakfast.');
  });

  it('falls back to website.locale when language is missing', () => {
    const markup = renderToStaticMarkup(
      React.createElement(ProductFAQ, {
        faqs,
        website: { ...baseWebsite, language: undefined, locale: 'pt-BR' },
      })
    );

    expect(markup).toContain('lang="pt-BR"');
  });
});
