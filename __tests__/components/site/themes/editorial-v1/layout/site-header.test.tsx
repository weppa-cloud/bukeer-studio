/**
 * editorial-v1 <EditorialSiteHeader> — SSR localization checks.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { EditorialSiteHeader } from '@/components/site/themes/editorial-v1/layout/site-header';
import type { WebsiteData } from '@/lib/supabase/get-website';
import type { NavigationItem } from '@bukeer/website-contract';

jest.mock('next/navigation', () => ({
  usePathname: () => '/fr',
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  useSearchParams: () => new URLSearchParams(''),
}));

jest.mock('@/components/site/themes/editorial-v1/layout/market-switcher', () => ({
  MarketSwitcher: () => null,
}));

function makeWebsite(overrides: Partial<WebsiteData> = {}): WebsiteData {
  return {
    id: 'colombiatours',
    account_id: 'a1',
    subdomain: 'colombiatours',
    custom_domain: 'colombiatours.travel',
    status: 'published',
    template_id: 'editorial-v1',
    default_locale: 'es-CO',
    supported_locales: ['es-CO', 'fr-FR'],
    theme: { tokens: {}, profile: { metadata: {} } },
    content: {
      siteName: 'ColombiaTours',
      locale: 'es-CO',
      seo: { title: 'ColombiaTours', description: '', keywords: '' },
      contact: { email: 'hola@example.com', phone: '', address: '' },
      social: {},
      account: {
        name: 'ColombiaTours',
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

const mixedLocaleNav: NavigationItem[] = [
  { slug: 'destinations', label: 'Destinations', page_type: 'anchor', href: '#destinations', target: '_self' },
  { slug: 'packages', label: 'Paquetes', page_type: 'anchor', href: '#packages', target: '_self' },
  { slug: 'activities', label: 'Activities', page_type: 'anchor', href: '#activities', target: '_self' },
  { slug: 'blog', label: 'Blog', page_type: 'custom', href: '/blog', target: '_self' },
];

describe('editorial-v1 <EditorialSiteHeader>', () => {
  it('localizes mixed CMS nav labels on French pages', () => {
    const html = renderToStaticMarkup(
      React.createElement(EditorialSiteHeader, {
        website: makeWebsite({ resolvedLocale: 'fr-FR' } as unknown as Partial<WebsiteData>),
        navigation: mixedLocaleNav,
        isCustomDomain: true,
      }),
    );

    expect(html).toContain('Destinations');
    expect(html).toContain('Forfaits');
    expect(html).toContain('Expériences');
    expect(html).toContain('Blog');

    expect(html).not.toContain('Paquetes');
    expect(html).not.toContain('Activities');
  });
});
