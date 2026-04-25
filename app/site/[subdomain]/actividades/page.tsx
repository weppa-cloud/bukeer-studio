/**
 * /site/[subdomain]/actividades — public activities listing.
 *
 * This route is indexable and canonical. Editorial-v1 may still expose the
 * softer "experiencias" copy in the UI, but SEO keeps /actividades as the
 * category URL used by product detail breadcrumbs, sitemap, and hreflang.
 */

import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

import { ActivitiesListingPage } from '@/components/pages/activities-listing-page';
import { TemplateSlot } from '@/components/site/themes/editorial-v1/template-slot';
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

interface ActividadesPageProps {
  params: Promise<{ subdomain: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const PAGE_PATH = '/actividades';

function getSiteName(website: Awaited<ReturnType<typeof getWebsiteBySubdomain>>, subdomain: string): string {
  return website?.content?.account?.name || website?.content?.siteName || subdomain;
}

function toArrayParam(raw: string | string[] | undefined): string[] {
  if (!raw) return [];
  const value = Array.isArray(raw) ? raw.join(',') : raw;
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

function buildActivitiesSchemas(input: {
  siteName: string;
  baseUrl: string;
  locale: string;
  activities: Array<{ name?: string | null; slug?: string | null }>;
}) {
  const normalizedLocale = normalizeLocale(input.locale, 'es-CO');
  const language = localeToLanguage(normalizedLocale);
  const isEnglish = language === 'en';
  const activitiesSegment = isEnglish ? 'activities' : 'actividades';
  const activitiesLabel = isEnglish ? 'Activities' : 'Actividades';
  const homeLabel = isEnglish ? 'Home' : 'Inicio';
  const description = isEnglish
    ? `Discover activities and local experiences available with ${input.siteName}.`
    : `Descubre actividades y experiencias locales disponibles con ${input.siteName}.`;

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      inLanguage: normalizedLocale,
      name: `${activitiesLabel} | ${input.siteName}`,
      description,
      url: `${input.baseUrl}/${activitiesSegment}`,
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: input.activities.length,
        itemListElement: input.activities.slice(0, 20).map((activity, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: activity.name,
          url: activity.slug ? `${input.baseUrl}/${activitiesSegment}/${activity.slug}` : undefined,
        })),
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      inLanguage: normalizedLocale,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: homeLabel, item: input.baseUrl },
        { '@type': 'ListItem', position: 2, name: activitiesLabel },
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

export async function generateMetadata({ params }: ActividadesPageProps): Promise<Metadata> {
  const { subdomain } = await params;
  const website = await getWebsiteBySubdomain(subdomain);
  const siteName = getSiteName(website, subdomain);
  const description = `Actividades y experiencias en Colombia seleccionadas por ${siteName}. Reserva con soporte local, información clara y opciones flexibles.`;

  if (!website) {
    return {
      title: 'Actividades',
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
    title: 'Actividades en Colombia',
    description,
    alternates: {
      canonical,
      languages: buildLocaleAwareAlternateLanguages(baseUrl, PAGE_PATH, localeContext),
    },
    openGraph: {
      title: `Actividades en Colombia | ${siteName}`,
      description,
      url: canonical,
      siteName,
      locale: localeToOgLocale(localeContext.resolvedLocale),
      type: 'website',
      ...(ogImage && { images: [{ url: ogImage }] }),
    },
    twitter: {
      card: 'summary_large_image',
      title: `Actividades en Colombia | ${siteName}`,
      description,
      ...(ogImage && { images: [ogImage] }),
    },
  };
}

export default async function ActividadesPage({
  params,
  searchParams,
}: ActividadesPageProps) {
  const { subdomain } = await params;
  const sp = await searchParams;
  const website = await getWebsiteBySubdomain(subdomain);

  if (!website || website.status !== 'published') {
    notFound();
  }

  const headerList = await headers();
  const isCustomDomain = Boolean(headerList.get('x-custom-domain'));
  const localeContext = await resolvePublicMetadataLocale(website, PAGE_PATH);
  const { items: activities } = await getCategoryProducts(subdomain, 'activities', {
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
  const schemas = buildActivitiesSchemas({
    siteName,
    baseUrl,
    locale: localeContext.resolvedLocale,
    activities,
  });

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
        name="experiences-page"
        website={websiteForRender}
        payload={{
          subdomain,
          locale: localeContext.resolvedLocale,
          activities,
          initialFilters: {
            level: toArrayParam(sp.level),
            region: toArrayParam(sp.region),
            location: toArrayParam(sp.location),
            category: Array.isArray(sp.category) ? sp.category[0] : sp.category || 'all',
            duration: Array.isArray(sp.duration) ? sp.duration[0] : sp.duration || 'all',
            sort: Array.isArray(sp.sort) ? sp.sort[0] : sp.sort || 'popular',
            q: Array.isArray(sp.q) ? sp.q[0] : sp.q || '',
          },
        }}
      >
        <ActivitiesListingPage website={websiteForRender} activities={activities} />
      </TemplateSlot>
    </>
  );
}

export const revalidate = 300;
