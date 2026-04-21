/**
 * editorial-v1 <FooterSwitcher> — SSR smoke tests.
 *
 * ts-jest + `testEnvironment: 'node'` setup; no jsdom. We render the client
 * component SSR-side and check the rendered pills + labels. Actual
 * `<select>` change + `trackEvent` dispatch is exercised by the Playwright
 * suite.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { FooterSwitcher } from '@/components/site/themes/editorial-v1/layout/footer-switcher';
import type { WebsiteData } from '@/lib/supabase/get-website';

jest.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  useSearchParams: () => new URLSearchParams(''),
}));

function makeWebsite(overrides: Partial<WebsiteData> = {}): WebsiteData {
  return {
    id: 'w1',
    account_id: 'a1',
    subdomain: 'acme',
    custom_domain: null,
    status: 'published',
    template_id: 't1',
    default_locale: 'es-CO',
    supported_locales: ['es-CO', 'en-US'],
    theme: { tokens: {}, profile: { metadata: {} } },
    content: {
      siteName: 'Acme',
      locale: 'es-CO',
      seo: { title: '', description: '', keywords: '' },
      contact: { email: '', phone: '', address: '' },
      social: {},
      account: {
        name: 'Acme',
        primary_currency: 'COP',
        enabled_currencies: ['COP', 'USD'],
        currency: [
          { name: 'COP', rate: 1, type: 'base' },
          { name: 'USD', rate: 0.00025 },
        ],
      },
      market_experience: {
        show_in_header: true,
        show_in_footer: true,
        show_language: true,
        show_currency: true,
        switcher_style: 'compact',
      },
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

describe('editorial-v1 <FooterSwitcher>', () => {
  it('renders both compact pills with language + currency labels', () => {
    const html = renderToStaticMarkup(
      React.createElement(FooterSwitcher, { website: makeWebsite() }),
    );

    // Wrapper + test id
    expect(html).toContain('class="mkt-footer"');
    expect(html).toContain('data-testid="editorial-footer-switcher"');
    // Language pill shows native label + flag
    expect(html).toContain('Español');
    expect(html).toContain('🇨🇴');
    // Currency pill shows symbol + code
    expect(html).toContain('>COP<');
    // Overlay selects contain options (locales normalised to 2-letter codes)
    expect(html).toContain('<option');
    expect(html).toContain('value="es"');
    expect(html).toContain('value="en"');
    expect(html).toContain('value="COP"');
    expect(html).toContain('value="USD"');
  });

  it('returns null when nothing is switchable', () => {
    const html = renderToStaticMarkup(
      React.createElement(FooterSwitcher, {
        website: makeWebsite({
          supported_locales: ['es-CO'],
          content: {
            ...makeWebsite().content,
            market_experience: {
              show_in_header: true,
              show_in_footer: true,
              show_language: false,
              show_currency: false,
              switcher_style: 'compact',
            },
            account: {
              ...makeWebsite().content.account,
              enabled_currencies: ['COP'],
            },
          },
        } as unknown as Partial<WebsiteData>),
      }),
    );
    expect(html).toBe('');
  });

  it('renders only the currency pill when only currency switching is enabled', () => {
    const html = renderToStaticMarkup(
      React.createElement(FooterSwitcher, {
        website: makeWebsite({
          content: {
            ...makeWebsite().content,
            market_experience: {
              show_in_header: true,
              show_in_footer: true,
              show_language: false,
              show_currency: true,
              switcher_style: 'compact',
            },
          },
        } as unknown as Partial<WebsiteData>),
      }),
    );

    // No language flag
    expect(html).not.toContain('Español');
    // Currency code still present
    expect(html).toContain('>COP<');
  });

  it('uses resolvedLocale over content.locale for footer locale label', () => {
    const html = renderToStaticMarkup(
      React.createElement(FooterSwitcher, {
        website: makeWebsite({
          content: { ...makeWebsite().content, locale: 'es-CO' },
          resolvedLocale: 'en-US',
        } as unknown as Partial<WebsiteData>),
      }),
    );

    expect(html).toContain('English');
    expect(html).toContain('🇺🇸');
  });
});
