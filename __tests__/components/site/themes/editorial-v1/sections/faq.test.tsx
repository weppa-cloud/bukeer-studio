/**
 * editorial-v1 — <FaqSection /> tests.
 *
 * Coverage:
 *  - returns null when no FAQs provided
 *  - renders eyebrow + default title when minimal content
 *  - preserves `<em>` in title
 *  - renders question/answer pairs in server HTML (good for SEO)
 *  - resolves `{{whatsapp}}` CTA magic token
 *  - accepts `questions` as alias for `faqs`
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { FaqSection } from '@/components/site/themes/editorial-v1/sections/faq';
import type { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';

function makeWebsite(): WebsiteData {
  return {
    id: 'w1',
    subdomain: 'acme',
    theme: { tokens: {}, profile: { metadata: { templateSet: 'editorial-v1' } } },
    content: {
      social: { whatsapp: '+573001234567' },
    },
    sections: [],
  } as unknown as WebsiteData;
}

function makeSection(content: Record<string, unknown>): WebsiteSection {
  return {
    id: 'f-1',
    section_type: 'faq',
    variant: 'default',
    display_order: 0,
    is_enabled: true,
    config: {},
    content,
  };
}

const SAMPLE_FAQS = [
  { question: '¿Es seguro viajar?', answer: 'Sí, es seguro.' },
  { question: '¿Qué incluye?', answer: 'Todo lo especificado.' },
  { question: '¿Puedo personalizar?', answer: 'Totalmente ajustable.' },
];

describe('editorial-v1 <FaqSection>', () => {
  it('returns null when no FAQs provided', () => {
    const html = renderToStaticMarkup(
      <FaqSection
        section={makeSection({ faqs: [] })}
        website={makeWebsite()}
      />,
    );
    expect(html).toBe('');
  });

  it('renders eyebrow + default title when minimal content', () => {
    const html = renderToStaticMarkup(
      <FaqSection
        section={makeSection({ faqs: SAMPLE_FAQS })}
        website={makeWebsite()}
      />,
    );
    expect(html).toContain('data-screen-label="FAQ"');
    expect(html).toContain('Preguntas frecuentes');
    expect(html).toContain('Lo que nos preguntan');
  });

  it('preserves <em> in title', () => {
    const html = renderToStaticMarkup(
      <FaqSection
        section={makeSection({
          title: 'Lo que <em>nos preguntan.</em>',
          faqs: SAMPLE_FAQS,
        })}
        website={makeWebsite()}
      />,
    );
    expect(html).toContain('<em>nos preguntan.</em>');
  });

  it('renders all question/answer pairs in server HTML', () => {
    const html = renderToStaticMarkup(
      <FaqSection
        section={makeSection({ faqs: SAMPLE_FAQS })}
        website={makeWebsite()}
      />,
    );
    for (const f of SAMPLE_FAQS) {
      expect(html).toContain(f.question);
      expect(html).toContain(f.answer);
    }
    // Accordion triggers as buttons with aria-expanded
    expect(html).toContain('aria-expanded');
    // First item open by default
    expect(html).toMatch(/class="faq-item open"/);
  });

  it('accepts `questions` as an alias for `faqs`', () => {
    const html = renderToStaticMarkup(
      <FaqSection
        section={makeSection({ questions: SAMPLE_FAQS })}
        website={makeWebsite()}
      />,
    );
    expect(html).toContain('¿Es seguro viajar?');
    expect(html).toContain('¿Qué incluye?');
  });

  it('resolves {{whatsapp}} CTA to wa.me link', () => {
    const html = renderToStaticMarkup(
      <FaqSection
        section={makeSection({
          faqs: SAMPLE_FAQS,
          ctaLabel: 'Chat por WhatsApp',
          ctaUrl: '{{whatsapp}}',
        })}
        website={makeWebsite()}
      />,
    );
    expect(html).toContain('Chat por WhatsApp');
    expect(html).toContain('https://wa.me/573001234567');
  });

  it('skips invalid FAQ entries silently', () => {
    const html = renderToStaticMarkup(
      <FaqSection
        section={makeSection({
          faqs: [
            { question: '', answer: 'orphan answer' },
            { question: 'valid', answer: 'valid answer' },
            { question: 'no answer', answer: '' },
          ],
        })}
        website={makeWebsite()}
      />,
    );
    expect(html).toContain('valid');
    expect(html).toContain('valid answer');
    // Only 1 valid item renders
    expect((html.match(/faq-item/g) || []).length).toBe(1);
  });
});
