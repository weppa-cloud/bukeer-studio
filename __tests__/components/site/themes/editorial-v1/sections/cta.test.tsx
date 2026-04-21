/**
 * editorial-v1 — <CtaSection /> tests.
 *
 * Coverage:
 *  - renders minimal content (sanitized default title)
 *  - preserves `<em>` in title
 *  - strips disallowed tags in title
 *  - renders authored `ctas[]` buttons
 *  - falls back to legacy `ctaText`/`ctaUrl` + `secondaryButton*` aliases
 *  - renders backgroundImageUrl as cta-bg wrapper
 *  - resolves `{{whatsapp}}` magic token
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { CtaSection } from '@/components/site/themes/editorial-v1/sections/cta';
import type { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: { src?: string; alt?: string }) => {
    return React.createElement('img', { src: props.src, alt: props.alt ?? '' });
  },
}));

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
    id: 'c-1',
    section_type: 'cta',
    variant: 'default',
    display_order: 0,
    is_enabled: true,
    config: {},
    content,
  };
}

describe('editorial-v1 <CtaSection>', () => {
  it('renders minimal content with default title', () => {
    const html = renderToStaticMarkup(
      <CtaSection
        section={makeSection({})}
        website={makeWebsite()}
      />,
    );
    expect(html).toContain('data-screen-label="CTA"');
    expect(html).toContain('class="cta-banner"');
    expect(html).toContain('<em>tu viaje.</em>');
  });

  it('preserves <em> in authored title', () => {
    const html = renderToStaticMarkup(
      <CtaSection
        section={makeSection({
          eyebrow: 'Empieza hoy',
          title: 'Tu Colombia, <em>en 3 pasos.</em>',
          subtitle: 'Cuéntanos qué buscas.',
        })}
        website={makeWebsite()}
      />,
    );
    expect(html).toContain('Empieza hoy');
    expect(html).toContain('<em>en 3 pasos.</em>');
    expect(html).toContain('Cuéntanos qué buscas.');
  });

  it('strips disallowed tags from title', () => {
    const html = renderToStaticMarkup(
      <CtaSection
        section={makeSection({
          title: '<script>alert(1)</script>Tu viaje <em>ok</em>',
        })}
        website={makeWebsite()}
      />,
    );
    expect(html).not.toContain('<script');
    expect(html).toContain('<em>ok</em>');
  });

  it('renders authored ctas[] buttons', () => {
    const html = renderToStaticMarkup(
      <CtaSection
        section={makeSection({
          title: 'Test',
          ctas: [
            { label: 'Planea mi viaje', href: '/plan', variant: 'accent' },
            { label: 'Chat WhatsApp', href: '{{whatsapp}}', variant: 'ghost' },
          ],
        })}
        website={makeWebsite()}
      />,
    );
    expect(html).toContain('Planea mi viaje');
    expect(html).toContain('Chat WhatsApp');
    expect(html).toContain('https://wa.me/573001234567');
    expect(html).toContain('btn btn-accent');
    expect(html).toContain('btn btn-ghost');
  });

  it('falls back to legacy ctaText/ctaUrl aliases', () => {
    const html = renderToStaticMarkup(
      <CtaSection
        section={makeSection({
          ctaText: 'Contactar',
          ctaUrl: '/contact',
          secondaryButtonText: 'Ver paquetes',
          secondaryButtonUrl: '/packages',
        })}
        website={makeWebsite()}
      />,
    );
    expect(html).toContain('Contactar');
    expect(html).toContain('Ver paquetes');
    expect(html).toContain('href="/site/acme/contact"');
    expect(html).toContain('href="/site/acme/packages"');
  });

  it('renders backgroundImageUrl as img inside cta-bg', () => {
    const html = renderToStaticMarkup(
      <CtaSection
        section={makeSection({
          title: 'Bg',
          backgroundImageUrl: 'https://cdn.example/bg.jpg',
        })}
        website={makeWebsite()}
      />,
    );
    expect(html).toContain('class="cta-bg"');
    expect(html).toContain('src="https://cdn.example/bg.jpg"');
  });

  it('skips actions column when no ctas provided', () => {
    const html = renderToStaticMarkup(
      <CtaSection
        section={makeSection({ title: 'Only head' })}
        website={makeWebsite()}
      />,
    );
    expect(html).not.toContain('class="actions"');
  });
});
