import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SectionRenderer } from '@/components/site/section-renderer';
import { JsonLd, generateHomepageSchemas } from '@/lib/schema';
import type { ImageObject } from '@/lib/schema/types';
import {
  buildLocaleAwareAlternateLanguages,
  resolvePublicMetadataLocale,
} from '@/lib/seo/public-metadata';
import { localeToOgLocale } from '@/lib/seo/locale-routing';
import { resolveOgImage } from '@/lib/seo/og-helpers';
import { getWebsiteBySubdomain, getBlogPosts } from '@/lib/supabase/get-website';
import { getCachedGoogleReviews, getCategoryProducts, getDestinations } from '@/lib/supabase/get-pages';
import { getPlanners } from '@/lib/supabase/get-planners';
import type { PlannerData } from '@/lib/supabase/get-planners';
import { getBrandClaims } from '@/lib/supabase/get-brand-claims';
import { getFeaturedDestinations } from '@/lib/supabase/get-featured-destinations';
import { SECTION_TYPES } from '@bukeer/website-contract';
import { hydrateSections } from '@/lib/sections/hydrate-sections';
import { toPackageItems, toActivityItems, toHotelItems } from '@/lib/products/to-items';

const SECTION_DESTINATIONS = SECTION_TYPES.find((t) => t === 'destinations')!;
const SECTION_TESTIMONIALS = SECTION_TYPES.find((t) => t === 'testimonials')!;
const SECTION_PACKAGES = SECTION_TYPES.find((t) => t === 'packages')!;
const SECTION_ACTIVITIES = SECTION_TYPES.find((t) => t === 'activities')!;
const SECTION_HOTELS = SECTION_TYPES.find((t) => t === 'hotels')!;
const SECTION_CTA = SECTION_TYPES.find((t) => t === 'cta')!;
const SECTION_HERO = SECTION_TYPES.find((t) => t === 'hero')!;
const SECTION_STATS = SECTION_TYPES.find((t) => t === 'stats')!;
const SECTION_CONTACT = SECTION_TYPES.find((t) => t === 'contact')!;
const SECTION_CONTACT_FORM = SECTION_TYPES.find((t) => t === 'contact_form')!;
const SECTION_BLOG = SECTION_TYPES.find((t) => t === 'blog')!;

const SINGLETON_SECTION_TYPES = new Set<string>([
  SECTION_HERO,
  SECTION_DESTINATIONS,
  SECTION_PACKAGES,
  SECTION_ACTIVITIES,
  SECTION_HOTELS,
  SECTION_TESTIMONIALS,
  SECTION_STATS,
  SECTION_CTA,
]);

// ISR: Revalidate every 5 minutes for fresh content with edge caching
export const revalidate = 300;

interface SitePageProps {
  params: Promise<{ subdomain: string }>;
}

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

export default async function SitePage({ params }: SitePageProps) {
  const { subdomain } = await params;
  const website = await getWebsiteBySubdomain(subdomain);

  if (!website || website.status !== 'published') {
    notFound();
  }

  const baseUrl = website.custom_domain
    ? `https://${website.custom_domain}`
    : `https://${subdomain}.bukeer.com`;

  const accountContent = ((website.content as unknown as Record<string, unknown>)?.account as Record<string, unknown> | undefined);
  const googleReviewsEnabled = accountContent?.google_reviews_enabled === true;
  const agencyName = (accountContent?.name as string | undefined) || website.content.siteName || '';

  // Fetch Google reviews early — used for both JSON-LD photo[] and testimonials hydration
  let googleReviewsCache: Awaited<ReturnType<typeof getCachedGoogleReviews>> = null;
  if (googleReviewsEnabled && website.account_id) {
    googleReviewsCache = await getCachedGoogleReviews(website.account_id);
  }

  // Build review ImageObjects for JSON-LD TravelAgency.photo[]
  // Prefer Supabase Storage URLs (stable), also accept Google review photo CDN (geougc-cs).
  // Profile thumbnails (lh3.googleusercontent.com/a-/) are excluded — too small for schema.
  const reviewImages: ImageObject[] = [];
  if (googleReviewsCache?.reviews?.length) {
    for (const review of googleReviewsCache.reviews.filter((r) => r.is_visible !== false)) {
      for (const img of (review.images || []).slice(0, 3)) {
        if (!img?.url) continue;
        const isCached = img.url.includes('supabase.co/storage');
        const isGoogleReviewPhoto = img.url.includes('googleusercontent.com/geougc-cs');
        if (!isCached && !isGoogleReviewPhoto) continue;
        reviewImages.push({
          '@type': 'ImageObject',
          url: img.url,
          name: `${review.author_name} · ${agencyName}`,
          description: (review.text || '').slice(0, 120).trim() || undefined,
          author: { '@type': 'Person', name: review.author_name },
          contentLocation: { '@type': 'Place', name: 'Colombia' },
        });
        if (reviewImages.length >= 10) break;
      }
      if (reviewImages.length >= 10) break;
    }
  }

  const localeContext = await resolvePublicMetadataLocale(website, '/');
  const schemas = generateHomepageSchemas(
    website,
    baseUrl,
    reviewImages.length > 0 ? reviewImages : undefined,
    localeContext.resolvedLocale,
  );

  const PLANNER_TYPES = new Set(['planners', 'team', 'travel_planners']);
  const hasPlannersSection = (website.sections || []).some(
    (s) => PLANNER_TYPES.has(s.section_type)
  );
  const hasBlogSection = (website.sections || []).some(
    (s) => s.section_type === SECTION_BLOG
  );

  const [
    dynamicDestinations,
    packagesCatalog,
    activitiesCatalog,
    hotelsCatalog,
    dbPlanners,
    blogResult,
    brandClaims,
    featuredDestinations,
  ] = await Promise.all([
    getDestinations(subdomain),
    getCategoryProducts(subdomain, SECTION_PACKAGES, { limit: 8 }),
    getCategoryProducts(subdomain, SECTION_ACTIVITIES, { limit: 8 }),
    getCategoryProducts(subdomain, SECTION_HOTELS, { limit: 8 }),
    hasPlannersSection && website.account_id
      ? getPlanners(website.account_id)
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

  const seenSingletonTypes = new Set<string>();
  const enabledSections = (website.sections || [])
    .filter((section) => section.section_type !== SECTION_CONTACT && section.section_type !== SECTION_CONTACT_FORM)
    .sort((a, b) => a.display_order - b.display_order)
    .filter((section) => {
      if (!SINGLETON_SECTION_TYPES.has(section.section_type)) return true;
      if (seenSingletonTypes.has(section.section_type)) return false;
      seenSingletonTypes.add(section.section_type);
      return true;
    });

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
    sectionDynamicDestinations,
    packageItems,
    activityItems,
    hotelItems,
    googleReviews,
    blogPosts: blogResult.posts.length > 0 ? blogResult.posts : undefined,
    brandClaims,
    featuredDestinations,
  });

  return (
    <>
      <JsonLd data={schemas} />

      {hydratedSections.map((section) => (
        <SectionRenderer
          key={section.id}
          section={section}
          website={website}
          dbPlanners={PLANNER_TYPES.has(section.section_type) ? dbPlanners : undefined}
        />
      ))}
    </>
  );
}
