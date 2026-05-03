/**
 * /site/[subdomain]/paquetes — public packages listing.
 *
 * Dedicated route for the canonical package collection. Keeping this out of
 * the catch-all makes metadata, hreflang, JSON-LD, and Lighthouse SEO checks
 * deterministic for the public /paquetes URL.
 */

import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

import { PackagesListingPage } from '@/components/pages/packages-listing-page';
import { TemplateSlot } from '@/components/site/themes/editorial-v1/template-slot';
import type { EditorialPaquetesListPagePayload } from '@/components/site/themes/editorial-v1/pages/paquetes-list';
import { getCategoryProducts } from '@/lib/supabase/get-pages';
import { getWebsiteBySubdomain } from '@/lib/supabase/get-website';
import {
  buildLocaleAwareAlternateLanguages,
  resolvePublicMetadataLocale,
} from '@/lib/seo/public-metadata';
import {
  buildPublicLocalizedPath,
  localeToLanguage,
  localeToOgLocale,
  normalizeLocale,
} from '@/lib/seo/locale-routing';
import { resolveOgImage } from '@/lib/seo/og-helpers';

interface PaquetesPageProps {
  params: Promise<{ subdomain: string }>;
}

const PAGE_PATH = '/paquetes';

function getSiteName(website: Awaited<ReturnType<typeof getWebsiteBySubdomain>>, subdomain: string): string {
  return website?.content?.account?.name || website?.content?.siteName || subdomain;
}

function buildPackagesDescription(siteName: string): string {
  return `Descubre los paquetes de viaje curados por ${siteName}. Experiencias únicas todo incluido.`;
}

function buildPackagesSchemas(input: {
  siteName: string;
  baseUrl: string;
  locale: string;
  packages: Array<{ name?: string | null; slug?: string | null }>;
}) {
  const normalizedLocale = normalizeLocale(input.locale, 'es-CO');
  const language = localeToLanguage(normalizedLocale);
  const isEnglish = language === 'en';
  const packagesSegment = isEnglish ? 'packages' : 'paquetes';
  const packagesLabel = isEnglish ? 'Packages' : 'Paquetes';
  const homeLabel = isEnglish ? 'Home' : 'Inicio';
  const description = isEnglish
    ? `Discover curated travel packages by ${input.siteName}. All-in-one unique experiences.`
    : buildPackagesDescription(input.siteName);

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      inLanguage: normalizedLocale,
      name: `${packagesLabel} | ${input.siteName}`,
      description,
      url: `${input.baseUrl}/${packagesSegment}`,
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: input.packages.length,
        itemListElement: input.packages.slice(0, 20).map((product, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: product.name,
          url: product.slug ? `${input.baseUrl}/${packagesSegment}/${product.slug}` : undefined,
        })),
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      inLanguage: normalizedLocale,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: homeLabel, item: input.baseUrl },
        { '@type': 'ListItem', position: 2, name: packagesLabel },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'TravelAgency',
      name: input.siteName,
      url: input.baseUrl,
      inLanguage: normalizedLocale,
    },
  ];
}

export async function generateMetadata({ params }: PaquetesPageProps): Promise<Metadata> {
  const { subdomain } = await params;
  const website = await getWebsiteBySubdomain(subdomain);
  const siteName = getSiteName(website, subdomain);
  const description = buildPackagesDescription(siteName);

  if (!website) {
    return {
      title: 'Paquetes de Viaje',
      description,
    };
  }

  const baseUrl = website.custom_domain
    ? `https://${website.custom_domain}`
    : `https://${subdomain}.bukeer.com`;
  const localeContext = await resolvePublicMetadataLocale(website, PAGE_PATH);
  const canonicalPath = buildPublicLocalizedPath(
    PAGE_PATH,
    localeContext.resolvedLocale,
    localeContext.defaultLocale,
  );
  const canonical = `${baseUrl}${canonicalPath}`;
  const ogImage = resolveOgImage(website);

  return {
    title: 'Paquetes de Viaje',
    description,
    alternates: {
      canonical,
      languages: buildLocaleAwareAlternateLanguages(baseUrl, PAGE_PATH, localeContext),
    },
    openGraph: {
      title: `Paquetes de Viaje | ${siteName}`,
      description,
      url: canonical,
      siteName,
      locale: localeToOgLocale(localeContext.resolvedLocale),
      type: 'website',
      ...(ogImage && { images: [{ url: ogImage }] }),
    },
    twitter: {
      card: 'summary_large_image',
      title: `Paquetes de Viaje | ${siteName}`,
      description,
      ...(ogImage && { images: [ogImage] }),
    },
  };
}

export default async function PaquetesPage({ params }: PaquetesPageProps) {
  const { subdomain } = await params;
  const website = await getWebsiteBySubdomain(subdomain);

  if (!website || website.status !== 'published') {
    notFound();
  }

  const headerList = await headers();
  const isCustomDomain = Boolean(headerList.get('x-custom-domain'));
  const localeContext = await resolvePublicMetadataLocale(website, PAGE_PATH);
  const { items: packageProducts } = await getCategoryProducts(subdomain, 'packages', {
    limit: 100,
    offset: 0,
    locale: localeContext.resolvedLocale,
    defaultLocale: localeContext.defaultLocale ?? 'es-CO',
    websiteId: String(website.id),
  });

  const websiteForRender = {
    ...website,
    resolvedLocale: localeContext.resolvedLocale,
    defaultLocale: localeContext.defaultLocale,
    isCustomDomain,
  };
  const siteName = getSiteName(website, subdomain);
  const baseUrl = website.custom_domain
    ? `https://${website.custom_domain}`
    : `https://${subdomain}.bukeer.com`;
  const schemas = buildPackagesSchemas({
    siteName,
    baseUrl,
    locale: localeContext.resolvedLocale,
    packages: packageProducts,
  });
  const payload: EditorialPaquetesListPagePayload = {
    packages: packageProducts,
  };

  return (
    <>
      {schemas.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <TemplateSlot
        name="paquetes-list"
        website={websiteForRender}
        payload={payload}
      >
        <PackagesListingPage website={websiteForRender} packages={packageProducts} />
      </TemplateSlot>
    </>
  );
}

export const revalidate = 300;
