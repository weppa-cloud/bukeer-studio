/**
 * editorial-v1 — <PromiseSection /> tests.
 *
 * Coverage:
 *  - renders minimal content with defaults (eyebrow + sanitized default title)
 *  - preserves `<em>` in title
 *  - strips disallowed tags from title
 *  - renders features list with titles and descriptions
 *  - resolves `{{whatsapp}}` magic token in CTA url
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { PromiseSection } from '@/components/site/themes/editorial-v1/sections/promise';
import type { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';

function makeWebsite(overrides: Partial<WebsiteData> = {}): WebsiteData {
  return {
    id: 'w1',
    account_id: 'a1',
    subdomain: 'acme',
    custom_domain: null,
    status: 'published',
    template_id: 't1',
    theme: { tokens: {}, profile: { metadata: {} } },
    content: {
      siteName: 'Acme',
      tagline: '',
      seo: { title: '', description: '', keywords: '' },
      contact: { email: '', phone: '', address: '' },
      social: { whatsapp: '+573001234567' },
    },
    sections: [],
    ...overrides,
  } as unknown as WebsiteData;
}

function makeSection(content: Record<string, unknown>): WebsiteSection {
  return {
    id: 'p-1',
    section_type: 'about',
    variant: 'promise',
    display_order: 0,
    is_enabled: true,
    config: {},
    content,
  };
}

describe('editorial-v1 <PromiseSection>', () => {
  it('renders minimal content with defaults', () => {
    const html = renderToStaticMarkup(
      <PromiseSection
        section={makeSection({})}
        website={makeWebsite()}
      />,
    );
    expect(html).toContain('data-screen-label="Promise"');
    expect(html).toContain('class="promise"');
    expect(html).toContain('Por qué nosotros');
    // Default title contains <em>se nota.</em>
    expect(html).toContain('<em>se nota.</em>');
  });

  it('preserves <em> inside title', () => {
    const html = renderToStaticMarkup(
      <PromiseSection
        section={makeSection({
          title: 'Un viaje bien hecho <em>se siente</em>',
          eyebrow: 'Confianza',
        })}
        website={makeWebsite()}
      />,
    );
    expect(html).toContain('<em>se siente</em>');
    expect(html).toContain('Confianza');
  });

  it('strips disallowed tags from title', () => {
    const html = renderToStaticMarkup(
      <PromiseSection
        section={makeSection({
          title: '<script>alert(1)</script>Real <em>ok</em>',
        })}
        website={makeWebsite()}
      />,
    );
    expect(html).not.toContain('<script');
    expect(html).toContain('Real ');
    expect(html).toContain('<em>ok</em>');
  });

  it('renders features grid with titles and descriptions', () => {
    const html = renderToStaticMarkup(
      <PromiseSection
        section={makeSection({
          features: [
            { icon: 'pin', title: 'Operador local', description: 'Sin intermediarios.' },
            { icon: 'shield', title: 'Seguro 24/7', description: 'Asistencia global.' },
            { icon: 'leaf', title: 'Turismo con impacto', description: 'Comunidades locales.' },
            { icon: 'sparkle', title: 'A tu medida', description: 'Ajustable siempre.' },
          ],
        })}
        website={makeWebsite()}
      />,
    );
    expect(html).toContain('Operador local');
    expect(html).toContain('Sin intermediarios.');
    expect(html).toContain('Seguro 24/7');
    expect(html).toContain('Turismo con impacto');
    expect(html).toContain('A tu medida');
    // Role assignments
    expect(html).toMatch(/role="list"/);
    expect((html.match(/role="listitem"/g) || []).length).toBe(4);
  });

  it('resolves {{whatsapp}} CTA token to wa.me URL', () => {
    const html = renderToStaticMarkup(
      <PromiseSection
        section={makeSection({
          ctaLabel: 'Hablar con un planner',
          ctaUrl: '{{whatsapp}}',
        })}
        website={makeWebsite()}
      />,
    );
    expect(html).toContain('Hablar con un planner');
    expect(html).toContain('https://wa.me/573001234567');
  });

  it('omits CTA block entirely when no ctaLabel', () => {
    const html = renderToStaticMarkup(
      <PromiseSection
        section={makeSection({})}
        website={makeWebsite()}
      />,
    );
    expect(html).not.toContain('btn-accent');
  });
});
