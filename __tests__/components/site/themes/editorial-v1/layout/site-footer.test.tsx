/**
 * editorial-v1 <EditorialSiteFooter> — SSR localization checks.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { EditorialSiteFooter } from '@/components/site/themes/editorial-v1/layout/site-footer';
import type { WebsiteData } from '@/lib/supabase/get-website';

jest.mock('next/navigation', () => ({
  usePathname: () => '/fr',
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  useSearchParams: () => new URLSearchParams(''),
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
      tagline: 'Descubre Colombia con expertos locales',
      seo: {
        title: 'ColombiaTours',
        description: 'Descubre Colombia con expertos locales.',
        keywords: '',
      },
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

describe('editorial-v1 <EditorialSiteFooter>', () => {
  it('uses French copy and localized category paths for /fr shared footer chrome', () => {
    const html = renderToStaticMarkup(
      React.createElement(EditorialSiteFooter, {
        website: makeWebsite({ resolvedLocale: 'fr-FR' } as unknown as Partial<WebsiteData>),
        isCustomDomain: true,
      }),
    );

    expect(html).toContain('Découvrez la Colombie avec des experts locaux');
    expect(html).toContain('Forfaits');
    expect(html).toContain('Hôtels boutique');
    expect(html).toContain('Voyages de noces');
    expect(html).toContain('Groupes et entreprises');
    expect(html).toContain('À propos');
    expect(html).toContain('Nos planners');
    expect(html).toContain('Presse');
    expect(html).toContain('href="/fr/destinations/cartagena"');
    expect(html).toContain('href="/fr/forfaits"');

    expect(html).not.toContain('Descubre Colombia con expertos locales');
    expect(html).not.toContain('Paquetes');
    expect(html).not.toContain('Hoteles boutique');
    expect(html).not.toContain('Luna de miel');
    expect(html).not.toContain('Grupos y corporativo');
    expect(html).not.toContain('Sobre nosotros');
    expect(html).not.toContain('Nuestros planners');
    expect(html).not.toContain('Contacto');
    expect(html).not.toContain('/fr/destinos/');
    expect(html).not.toContain('/fr/paquetes');
  });
});
