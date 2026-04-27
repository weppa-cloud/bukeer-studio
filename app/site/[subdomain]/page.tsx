import { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { SectionRenderer } from '@/components/site/section-renderer';
import { JsonLd, generateHomepageSchemas } from '@/lib/schema';
import {
  buildLocaleAwareAlternateLanguages,
  resolvePublicMetadataLocale,
} from '@/lib/seo/public-metadata';
import { localeToOgLocale } from '@/lib/seo/locale-routing';
import { resolveOgImage } from '@/lib/seo/og-helpers';
import { getWebsiteBySubdomain, getBlogPosts } from '@/lib/supabase/get-website';
import type { WebsiteData } from '@/lib/supabase/get-website';
import { getCachedGoogleReviews, getCategoryProducts, getDestinations } from '@/lib/supabase/get-pages';
import { getPlanners } from '@/lib/supabase/get-planners';
import type { PlannerData } from '@/lib/supabase/get-planners';
import { getBrandClaims } from '@/lib/supabase/get-brand-claims';
import { getFeaturedDestinations } from '@/lib/supabase/get-featured-destinations';
import { SECTION_TYPES } from '@bukeer/website-contract';
import { hydrateSections } from '@/lib/sections/hydrate-sections';
import { toPackageItems, toActivityItems, toHotelItems } from '@/lib/products/to-items';
import { resolveTemplateSet } from '@/lib/sections/template-set';
import {
  buildHomeSectionPlan,
  resolveHomeEnabledSections,
  type DeferredHomeDataInput,
} from '@/lib/site/home-rendering';

const SECTION_PACKAGES = SECTION_TYPES.find((t) => t === 'packages')!;
const SECTION_ACTIVITIES = SECTION_TYPES.find((t) => t === 'activities')!;
const SECTION_HOTELS = SECTION_TYPES.find((t) => t === 'hotels')!;
const SECTION_BLOG = SECTION_TYPES.find((t) => t === 'blog')!;

// ISR: Revalidate every 5 minutes for fresh content with edge caching
export const revalidate = 300;

interface SitePageProps {
  params: Promise<{ subdomain: string }>;
}

const PLANNER_TYPES = new Set(['planners', 'team', 'travel_planners']);

export async function generateMetadata({ params }: SitePageProps): Promise<Metadata> {
  const { subdomain } = await params;
  const website = await getWebsiteBySubdomain(subdomain);
  if (!website) return { title: 'Sitio no encontrado' };

  const baseUrl = website.custom_domain
    ? `https://${website.custom_domain}`
    : `https://${subdomain}.bukeer.com`;
  const localeContext = await resolvePublicMetadataLocale(website, '/');
  const languages = buildLocaleAwareAlternateLanguages(baseUrl, '/', localeContext);
  const canonical = localeContext.localizedPathname === '/'
    ? baseUrl
    : `${baseUrl}${localeContext.localizedPathname}`;

  const title = website.content.seo?.title || website.content.siteName || subdomain;
  const description = website.content.seo?.description || website.content.tagline || '';
  const siteName = website.content?.account?.name || website.content?.siteName || subdomain;
  const ogImage = resolveOgImage(website);

  return {
    title,
    description,
    robots: { index: true, follow: true },
    alternates: {
      canonical,
      languages,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName,
      locale: localeToOgLocale(localeContext.resolvedLocale),
      type: 'website',
      ...(ogImage && { images: [{ url: ogImage }] }),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(ogImage && { images: [ogImage] }),
    },
  };
}

async function DeferredHomeSections({
  website,
  websiteForRender,
  subdomain,
  locale,
  enabledSections,
  criticalSectionIds,
  templateSet,
}: DeferredHomeDataInput) {
  const accountContent = ((website.content as unknown as Record<string, unknown>)?.account as Record<string, unknown> | undefined);
  const googleReviewsEnabled = accountContent?.google_reviews_enabled === true;
  const hasPlannersSection = enabledSections.some(
    (s) => PLANNER_TYPES.has(s.section_type)
  );
  const hasBlogSection = enabledSections.some(
    (s) => s.section_type === SECTION_BLOG
  );

  const [
    googleReviewsCache,
    dynamicDestinations,
    packagesCatalog,
    activitiesCatalog,
    hotelsCatalog,
    dbPlanners,
    blogResult,
    brandClaims,
    featuredDestinations,
  ] = await Promise.all([
    googleReviewsEnabled && website.account_id
      ? getCachedGoogleReviews(website.account_id)
      : Promise.resolve(null),
    getDestinations(subdomain),
    getCategoryProducts(subdomain, SECTION_PACKAGES, { limit: 8, locale }),
    getCategoryProducts(subdomain, SECTION_ACTIVITIES, { limit: 8, locale }),
    getCategoryProducts(subdomain, SECTION_HOTELS, { limit: 8, locale }),
    hasPlannersSection && website.account_id
      ? getPlanners(website.account_id, { locale })
      : Promise.resolve<PlannerData[]>([]),
    hasBlogSection && website.id
      ? getBlogPosts(website.id, { limit: 6 })
      : Promise.resolve({ posts: [], total: 0 }),
    website.account_id
      ? getBrandClaims(website.account_id)
      : Promise.resolve(null),
    website.id
      ? getFeaturedDestinations(website.id, 4)
      : Promise.resolve([]),
  ]);

  const curatedDynamicDestinations = dynamicDestinations.filter((d) => d.total > 1);
  const sectionDynamicDestinations = (
    curatedDynamicDestinations.length > 0 ? curatedDynamicDestinations : dynamicDestinations
  ).slice(0, 8);

  const packageItems = toPackageItems(packagesCatalog.items);
  const activityItems = toActivityItems(activitiesCatalog.items);
  const hotelItems = toHotelItems(hotelsCatalog.items);

  let googleReviews: Parameters<typeof hydrateSections>[0]['googleReviews'] = null;
  if (googleReviewsCache && googleReviewsCache.reviews.length > 0) {
    googleReviews = {
      ...googleReviewsCache,
      average_rating: googleReviewsCache.average_rating ?? 0,
      total_reviews: googleReviewsCache.total_reviews ?? 0,
      google_maps_url: googleReviewsCache.google_maps_url ?? undefined,
      business_name: googleReviewsCache.business_name ?? undefined,
      reviews: googleReviewsCache.reviews.map((review) => ({
        ...review,
        images: review.images,
        response: review.response?.text,
      })),
    };
  }

  const hydratedSections = hydrateSections({
    enabledSections,
    templateSet,
    sectionDynamicDestinations,
    packageItems,
    activityItems,
    hotelItems,
    googleReviews,
    blogPosts: blogResult.posts.length > 0 ? blogResult.posts : undefined,
    brandClaims,
    featuredDestinations,
  }).filter((section) => !criticalSectionIds.has(section.id));

  return (
    <>
      {hydratedSections.map((section) => (
        <SectionRenderer
          key={section.id}
          section={section}
          website={websiteForRender}
          dbPlanners={PLANNER_TYPES.has(section.section_type) ? dbPlanners : undefined}
        />
      ))}
    </>
  );
}

export default async function SitePage({ params }: SitePageProps) {
  const { subdomain } = await params;
  const website = await getWebsiteBySubdomain(subdomain);

  if (!website || website.status !== 'published') {
    notFound();
  }

  const baseUrl = website.custom_domain
    ? `https://${website.custom_domain}`
    : `https://${subdomain}.bukeer.com`;

  const templateSet = resolveTemplateSet(website);
  const localeContext = await resolvePublicMetadataLocale(website, '/');
  const headerList = await headers();
  const isCustomDomain = Boolean(headerList.get('x-custom-domain'));
  const websiteForRender = {
    ...website,
    resolvedLocale: localeContext.resolvedLocale,
    defaultLocale: localeContext.defaultLocale,
    isCustomDomain,
  } as WebsiteData & { resolvedLocale?: string; isCustomDomain?: boolean };
  const schemas = generateHomepageSchemas(
    website,
    baseUrl,
    undefined,
    localeContext.resolvedLocale,
  );
  const enabledSections = resolveHomeEnabledSections({
    website,
    templateSet,
    locale: localeContext.resolvedLocale,
    defaultLocale: localeContext.defaultLocale,
  });
  const { criticalSections, criticalSectionIds } = buildHomeSectionPlan(enabledSections);

  return (
    <>
      <JsonLd data={schemas} />

      {criticalSections.map((section) => (
        <SectionRenderer
          key={section.id}
          section={section}
          website={websiteForRender}
        />
      ))}

      <Suspense fallback={null}>
        <DeferredHomeSections
          website={website}
          websiteForRender={websiteForRender}
          subdomain={subdomain}
          locale={localeContext.resolvedLocale}
          defaultLocale={localeContext.defaultLocale}
          enabledSections={enabledSections}
          criticalSectionIds={criticalSectionIds}
          templateSet={templateSet}
        />
      </Suspense>
    </>
  );
}
