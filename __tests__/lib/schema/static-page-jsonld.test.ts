import { generateStaticPageSchemas } from '@/lib/schema';
import type { WebsiteData } from '@/lib/supabase/get-website';

describe('generateStaticPageSchemas', () => {
  const website = {
    id: 'website-1',
    account_id: 'account-1',
    subdomain: 'colombiatours',
    custom_domain: 'colombiatours.travel',
    default_locale: 'es-CO',
    supported_locales: ['es-CO', 'fr-FR'],
    content: {
      siteName: 'ColombiaTours.Travel',
      tagline: 'Viajes a Colombia con expertos locales',
      seo: { description: 'Tours privados por Colombia.' },
      account: {
        name: 'ColombiaTours',
        logo: 'https://cdn.example.com/logo.png',
        phone: '+57 300 000 0000',
        email: 'hola@colombiatours.travel',
      },
      contact: {},
      social: {},
    },
  } as unknown as WebsiteData;

  it('emits valid WebPage and TravelAgency schemas on the custom-domain URL', () => {
    const schemas = generateStaticPageSchemas(
      website,
      {
        title: 'Hôtels en Colombie',
        seo_title: 'Hôtels en Colombie | ColombiaTours.Travel',
        seo_description: 'Sélection d’hôtels en Colombie par ColombiaTours.',
        intro_content: { text: 'Intro fallback should not win over SEO description.' },
      },
      'https://colombiatours.travel/fr/h%C3%B4tels',
      { publicBaseUrl: 'https://colombiatours.travel', inLanguage: 'fr-FR' },
    );

    expect(schemas).toHaveLength(2);
    expect(schemas[0]).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Hôtels en Colombie | ColombiaTours.Travel',
      description: 'Sélection d’hôtels en Colombie par ColombiaTours.',
      url: 'https://colombiatours.travel/fr/h%C3%B4tels',
      inLanguage: 'fr-FR',
      isPartOf: {
        '@type': 'WebSite',
        name: 'ColombiaTours',
        url: 'https://colombiatours.travel',
      },
    });
    expect(schemas[1]).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'TravelAgency',
      name: 'ColombiaTours',
      url: 'https://colombiatours.travel',
      logo: 'https://cdn.example.com/logo.png',
      telephone: '+57 300 000 0000',
      email: 'hola@colombiatours.travel',
    });
  });

  it('falls back to intro text/site copy when page SEO description is absent', () => {
    const [webPage] = generateStaticPageSchemas(
      website,
      {
        title: 'À propos',
        intro_content: { text: 'Notre équipe locale en Colombie.' },
      },
      'https://colombiatours.travel/fr/a-propos',
      { publicBaseUrl: 'https://colombiatours.travel', inLanguage: 'fr-FR' },
    );

    expect(webPage).toMatchObject({
      '@type': 'WebPage',
      name: 'À propos',
      description: 'Notre équipe locale en Colombie.',
      inLanguage: 'fr-FR',
    });
  });
});
