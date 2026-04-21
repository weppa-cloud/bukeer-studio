/**
 * editorial-v1 <MarketSwitcher> — SSR smoke tests.
 *
 * The harness is ts-jest + `testEnvironment: 'node'` (see `jest.config.js`),
 * so we can't use React Testing Library for click-driven assertions. Instead
 * we render the initial client-component tree with `renderToStaticMarkup`
 * and verify:
 *   - the pill surface renders when either switcher is enabled
 *   - the correct flag + currency code + ARIA label appear
 *   - the component returns null when neither locale nor currency is switchable
 *   - the analytics catalogue accepts the new event names
 *
 * Click + dropdown interaction is covered by the editorial-v1 Playwright
 * suite (see `playwright-report/s{1..4}` after a session run).
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { MarketSwitcher } from '@/components/site/themes/editorial-v1/layout/market-switcher';
import { trackEvent, type AnalyticsEventName } from '@/lib/analytics/track';
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
    supported_locales: ['es-CO', 'en-US', 'pt-BR'],
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
        enabled_currencies: ['COP', 'USD', 'EUR'],
        currency: [
          { name: 'COP', rate: 1, type: 'base' },
          { name: 'USD', rate: 0.00025 },
          { name: 'EUR', rate: 0.00022 },
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

describe('editorial-v1 <MarketSwitcher>', () => {
  it('renders the pill with flag + currency code and an aria-label', () => {
    const html = renderToStaticMarkup(
      React.createElement(MarketSwitcher, { website: makeWebsite() }),
    );

    expect(html).toContain('class="mkt-pill"');
    // Colombia flag (es → 🇨🇴 in our override map)
    expect(html).toContain('🇨🇴');
    // Language code
    expect(html).toContain('>ES<');
    // Currency code (from primary_currency)
    expect(html).toContain('COP');
    // ARIA trigger label is localised
    expect(html).toContain('Abrir preferencias');
    // Dropdown is closed initially (no dialog)
    expect(html).not.toContain('role="dialog"');
  });

  it('adds on-dark class when rendered over a dark hero surface', () => {
    const html = renderToStaticMarkup(
      React.createElement(MarketSwitcher, {
        website: makeWebsite(),
        onDark: true,
      }),
    );
    expect(html).toMatch(/class="mkt-pill[^"]* on-dark"/);
  });

  it('returns null when neither locale nor currency is switchable', () => {
    const html = renderToStaticMarkup(
      React.createElement(MarketSwitcher, {
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

  it('exposes `locale_switch` and `currency_switch` via the analytics catalogue', () => {
    // Type-check only — if the union ever drops these, this file stops compiling.
    const locale: AnalyticsEventName = 'locale_switch';
    const currency: AnalyticsEventName = 'currency_switch';
    expect(locale).toBe('locale_switch');
    expect(currency).toBe('currency_switch');
    // Sanity: calling trackEvent on the server is a silent no-op (no gtag).
    expect(() =>
      trackEvent('locale_switch', { from: 'es', to: 'en', surface: 'header' }),
    ).not.toThrow();
    expect(() =>
      trackEvent('currency_switch', { from: 'COP', to: 'USD', surface: 'header' }),
    ).not.toThrow();
  });
});
