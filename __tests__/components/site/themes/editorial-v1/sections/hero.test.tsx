import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { HeroSection } from '@/components/site/themes/editorial-v1/sections/hero';
import type { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';

// next/navigation is only needed by the HeroSearch client leaf (useRouter).
// When the form is absent from the render tree, the mock is harmless; when it
// is present, we stub useRouter with a no-op.
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

// next/image is not wired for tests; render a plain <img>.
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: { src?: string; alt?: string }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return React.createElement('img', {
      src: props.src,
      alt: props.alt ?? '',
    });
  },
}));

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
      siteName: 'Acme Travel',
      tagline: 'Viaja más hondo.',
      seo: { title: '', description: '', keywords: '' },
      contact: { email: '', phone: '', address: '' },
      social: { whatsapp: '+573000000000' },
    },
    featured_products: {
      destinations: [],
      hotels: [],
      activities: [],
      transfers: [],
      packages: [],
    },
    sections: [],
    ...overrides,
  } as unknown as WebsiteData;
}

function makeSection(content: Record<string, unknown>): WebsiteSection {
  return {
    id: 'hero-1',
    section_type: 'hero',
    variant: 'editorial',
    display_order: 0,
    is_enabled: true,
    config: {},
    content,
  };
}

describe('editorial-v1 <HeroSection>', () => {
  it('renders minimal content with defaults', () => {
    const section = makeSection({
      headline: 'Colombia a tu medida',
    });

    const html = renderToStaticMarkup(
      React.createElement(HeroSection, {
        section,
        website: makeWebsite(),
      }),
    );

    // Section wrapper
    expect(html).toContain('class="hero"');
    expect(html).toContain('data-screen-label="Hero"');
    // Default eyebrow fallback
    expect(html).toContain('DESCUBRE · VIVE · CONECTA');
    // Headline text
    expect(html).toContain('Colombia a tu medida');
    // No authored slides/featured destinations -> fallback rotator with scenic layer.
    expect(html).toContain('class="scenic"');
    expect(html).toContain('role="tab"');
    expect(html).toContain('01 / 04');
  });

  it('preserves <em> inside headline markup', () => {
    const section = makeSection({
      headline: 'Colombia<br><em>como la cuenta</em><br>quien la camina.',
    });

    const html = renderToStaticMarkup(
      React.createElement(HeroSection, {
        section,
        website: makeWebsite(),
      }),
    );

    expect(html).toMatch(/<em>como la cuenta<\/em>/);
    expect(html).toMatch(/<br\s*\/?>/);
  });

  it('strips tags outside the <em>/<br> allowlist', () => {
    const section = makeSection({
      headline: 'Colombia <script>alert(1)</script><em>real</em>',
    });

    const html = renderToStaticMarkup(
      React.createElement(HeroSection, {
        section,
        website: makeWebsite(),
      }),
    );

    expect(html).not.toContain('<script');
    expect(html).toContain('<em>real</em>');
  });

  it('omits the search form when search.enabled is not true', () => {
    const section = makeSection({
      headline: 'Sin búsqueda',
    });

    const html = renderToStaticMarkup(
      React.createElement(HeroSection, {
        section,
        website: makeWebsite(),
      }),
    );

    expect(html).not.toContain('class="hero-search"');
    expect(html).not.toContain('role="search"');
  });

  it('renders the search form when search.enabled is true', () => {
    const section = makeSection({
      headline: 'Con búsqueda',
      search: {
        enabled: true,
        placeholderDestino: 'Caribe · Colombia',
      },
    });

    const html = renderToStaticMarkup(
      React.createElement(HeroSection, {
        section,
        website: makeWebsite(),
      }),
    );

    expect(html).toContain('class="hero-search"');
    expect(html).toContain('role="search"');
    expect(html).toContain('Caribe · Colombia');
  });

  it('renders HeroRotator (meta strip) when slides are present', () => {
    const section = makeSection({
      headline: 'Con rotator',
      slides: [
        { imageUrl: 'https://example.com/a.jpg', city: 'Cartagena', alt: 'A' },
        { imageUrl: 'https://example.com/b.jpg', city: 'Tayrona', alt: 'B' },
      ],
    });

    const html = renderToStaticMarkup(
      React.createElement(HeroSection, {
        section,
        website: makeWebsite(),
      }),
    );

    expect(html).toContain('class="hero-media"');
    // Counter renders as `01 / 02`
    expect(html).toContain('01 / 02');
    // Dots track
    expect(html).toContain('role="tab"');
  });
});
