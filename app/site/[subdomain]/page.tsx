import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SectionRenderer } from '@/components/site/section-renderer';
import { JsonLd, generateHomepageSchemas } from '@/lib/schema';
import { generateHreflangLinks } from '@/lib/seo/hreflang';
import { resolveOgImage } from '@/lib/seo/og-helpers';
import { getWebsiteBySubdomain } from '@/lib/supabase/get-website';
import { getCachedGoogleReviews, getCategoryProducts, getDestinations } from '@/lib/supabase/get-pages';
import type { ProductData, WebsiteSection } from '@bukeer/website-contract';
import { SECTION_TYPES } from '@bukeer/website-contract';
import { hydrateSections } from '@/lib/sections/hydrate-sections';

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

function formatProductPrice(rawPrice: unknown, currency?: string): string | undefined {
  if (typeof rawPrice === 'string' && rawPrice.trim().length > 0) return rawPrice.trim();
  if (typeof rawPrice !== 'number' || Number.isNaN(rawPrice)) return undefined;

  const code = currency?.toUpperCase() || 'USD';
  return `$${new Intl.NumberFormat('en-US').format(Math.round(rawPrice))} ${code}`;
}

function toProductLocation(product: ProductData): string | undefined {
  if (product.location) return product.location;
  if (product.city && product.country) return `${product.city}, ${product.country}`;
  return product.city || product.country;
}

function toDurationLabel(product: ProductData): string | undefined {
  const dynamicDuration = (product as unknown as { duration?: string }).duration;
  if (typeof dynamicDuration === 'string' && dynamicDuration.trim().length > 0) {
    return dynamicDuration.trim();
  }

  if (!product.duration_minutes || product.duration_minutes <= 0) return undefined;
  if (product.duration_minutes < 60) return `${product.duration_minutes} min`;
  return `${Math.max(1, Math.round(product.duration_minutes / 60))} h`;
}

function toPackageItems(products: ProductData[]): Array<Record<string, unknown>> {
  return products.map((product) => {
    const reviewRating = typeof product.rating === 'number' ? product.rating : undefined;
    let category = 'Popular';
    if (reviewRating && reviewRating >= 4.8) category = 'Exclusivo';
    else if (reviewRating && reviewRating >= 4.5) category = 'Premium';

    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      image: product.image || product.images?.[0],
      destination: toProductLocation(product),
      duration: product.itinerary_items?.length ? `${product.itinerary_items.length} días` : toDurationLabel(product),
      price: formatProductPrice(product.price, product.currency),
      description: product.description,
      category,
    };
  }).slice(0, 8);
}

function toActivityItems(products: ProductData[]): Array<Record<string, unknown>> {
  return products.map((product) => ({
    id: product.id,
    slug: product.slug,
    name: product.name,
    image: product.image || product.images?.[0],
    duration: toDurationLabel(product),
    price: formatProductPrice(product.price, product.currency),
    category: product.type === 'activity' ? 'Actividad' : 'Experiencia',
    location: toProductLocation(product),
    rating: product.rating,
    reviewCount: product.review_count,
    description: product.description,
    difficulty: product.duration_minutes && product.duration_minutes > 360 ? 'Intensa' : 'Fácil',
  })).slice(0, 8);
}

function toHotelItems(products: ProductData[]): Array<Record<string, unknown>> {
  return products.map((product) => ({
    id: product.id,
    slug: product.slug,
    name: product.name,
    image: product.image || product.images?.[0],
    location: toProductLocation(product),
    rating: product.star_rating || undefined,
    reviewRating: product.rating,
    reviewCount: product.review_count,
    price: formatProductPrice(product.price, product.currency),
    badge: product.star_rating ? `${product.star_rating}★` : undefined,
  })).slice(0, 8);
}

export async function generateMetadata({ params }: SitePageProps): Promise<Metadata> {
  const { subdomain } = await params;
  const website = await getWebsiteBySubdomain(subdomain);
  if (!website) return { title: 'Sitio no encontrado' };

  const baseUrl = website.custom_domain
    ? `https://${website.custom_domain}`
    : `https://${subdomain}.bukeer.com`;
  const hreflangLinks = generateHreflangLinks(baseUrl, '/');
  const languages: Record<string, string> = {};
  for (const link of hreflangLinks) {
    languages[link.hreflang] = link.href;
  }

  const title = website.content.seo?.title || website.content.siteName || subdomain;
  const description = website.content.seo?.description || website.content.tagline || '';
  const siteName = website.content?.account?.name || website.content?.siteName || subdomain;
  const ogImage = resolveOgImage(website);

  return {
    title,
    description,
    robots: { index: true, follow: true },
    alternates: {
      canonical: baseUrl,
      languages,
    },
    openGraph: {
      title,
      description,
      url: baseUrl,
      siteName,
      locale: 'es_ES',
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
  const schemas = generateHomepageSchemas(website, baseUrl);

  const [dynamicDestinations, packagesCatalog, activitiesCatalog, hotelsCatalog] = await Promise.all([
    getDestinations(subdomain),
    getCategoryProducts(subdomain, SECTION_PACKAGES, { limit: 8 }),
    getCategoryProducts(subdomain, SECTION_ACTIVITIES, { limit: 8 }),
    getCategoryProducts(subdomain, SECTION_HOTELS, { limit: 8 }),
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

  const accountContent = (website.content as Record<string, unknown>)?.account as Record<string, unknown> | undefined;
  const googleReviewsEnabled = accountContent?.google_reviews_enabled === true;

  let googleReviews: Parameters<typeof hydrateSections>[0]['googleReviews'] = null;
  if (googleReviewsEnabled && website.account_id) {
    const cached = await getCachedGoogleReviews(website.account_id);
    if (cached && cached.reviews.length > 0) {
      googleReviews = cached;
    }
  }

  const hydratedSections = hydrateSections({
    enabledSections,
    sectionDynamicDestinations,
    packageItems,
    activityItems,
    hotelItems,
    googleReviews,
  });

  return (
    <>
      <JsonLd data={schemas} />

      {hydratedSections.map((section) => (
        <SectionRenderer
          key={section.id}
          section={section}
          website={website}
        />
      ))}
    </>
  );
}
