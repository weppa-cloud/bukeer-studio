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

const PRODUCT_SECTION_ORDER = [SECTION_PACKAGES, SECTION_ACTIVITIES, SECTION_HOTELS] as const;
type ProductSectionType = (typeof PRODUCT_SECTION_ORDER)[number];

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

function buildAutoProductSection(
  sectionType: ProductSectionType,
  displayOrder: number,
  items: Array<Record<string, unknown>>
): WebsiteSection | null {
  if (items.length === 0) return null;

  if (sectionType === SECTION_PACKAGES) {
    return {
      id: '00000000-0000-4000-8000-000000009001',
      section_type: SECTION_PACKAGES,
      variant: 'carousel',
      display_order: displayOrder,
      is_enabled: true,
      config: {},
      content: {
        eyebrow: 'Experiencias Curadas',
        title: 'Paquetes de Viaje',
        subtitle: 'Itinerarios completos con logística resuelta de principio a fin',
        packages: items,
      },
    };
  }

  if (sectionType === SECTION_ACTIVITIES) {
    return {
      id: '00000000-0000-4000-8000-000000009002',
      section_type: SECTION_ACTIVITIES,
      variant: 'carousel',
      display_order: displayOrder,
      is_enabled: true,
      config: {},
      content: {
        title: 'Actividades Destacadas',
        subtitle: 'Experiencias por duración, dificultad y estilo de viaje',
        activities: items,
      },
    };
  }

  return {
    id: '00000000-0000-4000-8000-000000009003',
    section_type: SECTION_HOTELS,
    variant: 'carousel',
    display_order: displayOrder,
    is_enabled: true,
    config: {},
    content: {
      title: 'Hoteles Recomendados',
      subtitle: 'Estancias seleccionadas por ubicación, reviews y relación valor',
      hotels: items,
    },
  };
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

  let hydratedSections: WebsiteSection[] = enabledSections.map((section) => {
    if (section.section_type === SECTION_DESTINATIONS) {
      const content = (section.content as Record<string, unknown>) || {};
      const source = content.source === 'manual' ? 'manual' : 'dynamic';
      const shouldUseDynamic = source !== 'manual' && sectionDynamicDestinations.length > 0;
      if (!shouldUseDynamic) return section;

      return {
        ...section,
        content: {
          ...content,
          destinations: sectionDynamicDestinations,
        },
      } as WebsiteSection;
    }

    if (section.section_type === SECTION_PACKAGES) {
      const content = (section.content as Record<string, unknown>) || {};
      const current = Array.isArray(content.packages) ? content.packages : [];
      const resolvedItems = packageItems.length > 0 ? packageItems : current;
      return {
        ...section,
        variant: 'carousel',
        content: {
          ...content,
          title: content.title || 'Paquetes de Viaje',
          subtitle: content.subtitle || 'Itinerarios completos con logística resuelta de principio a fin',
          eyebrow: content.eyebrow || 'Experiencias Curadas',
          packages: resolvedItems,
        },
      } as WebsiteSection;
    }

    if (section.section_type === SECTION_ACTIVITIES) {
      const content = (section.content as Record<string, unknown>) || {};
      const current = Array.isArray(content.activities) ? content.activities : [];
      const resolvedItems = activityItems.length > 0 ? activityItems : current;
      return {
        ...section,
        variant: 'carousel',
        content: {
          ...content,
          title: content.title || 'Actividades Destacadas',
          subtitle: content.subtitle || 'Experiencias por duración, dificultad y estilo de viaje',
          activities: resolvedItems,
        },
      } as WebsiteSection;
    }

    if (section.section_type === SECTION_HOTELS) {
      const content = (section.content as Record<string, unknown>) || {};
      const current = Array.isArray(content.hotels) ? content.hotels : [];
      const resolvedItems = hotelItems.length > 0 ? hotelItems : current;
      return {
        ...section,
        variant: 'carousel',
        content: {
          ...content,
          title: content.title || 'Hoteles Recomendados',
          subtitle: content.subtitle || 'Estancias seleccionadas por ubicación, reviews y relación valor',
          hotels: resolvedItems,
        },
      } as WebsiteSection;
    }

    return section;
  });

  const heroSection = hydratedSections.find((section) => section.section_type === SECTION_HERO);
  const heroContent = (heroSection?.content as { heroStats?: unknown } | undefined) || undefined;
  const hasHeroStats = Array.isArray(heroContent?.heroStats) && heroContent.heroStats.length > 0;
  if (hasHeroStats) {
    hydratedSections = hydratedSections.filter((section) => section.section_type !== SECTION_STATS);
  }

  const sectionByType = new Map(hydratedSections.map((section) => [section.section_type, section]));
  const autoItemsByType: Record<ProductSectionType, Array<Record<string, unknown>>> = {
    [SECTION_PACKAGES]: packageItems,
    [SECTION_ACTIVITIES]: activityItems,
    [SECTION_HOTELS]: hotelItems,
  };

  const orderedProductSections: WebsiteSection[] = PRODUCT_SECTION_ORDER
    .map((sectionType, index) => {
      const existing = sectionByType.get(sectionType);
      if (existing) return existing;
      return buildAutoProductSection(sectionType, 100 + index, autoItemsByType[sectionType]);
    })
    .filter((section): section is WebsiteSection => Boolean(section));

  const nonProductSections = hydratedSections.filter(
    (section) =>
      section.section_type !== SECTION_PACKAGES &&
      section.section_type !== SECTION_ACTIVITIES &&
      section.section_type !== SECTION_HOTELS
  );

  let insertionIndex = nonProductSections.findIndex((section) => section.section_type === SECTION_DESTINATIONS);
  if (insertionIndex >= 0) {
    insertionIndex += 1;
  } else {
    const heroIndex = nonProductSections.findIndex((section) => section.section_type === SECTION_HERO);
    insertionIndex = heroIndex >= 0 ? heroIndex + 1 : 0;
  }

  hydratedSections = [
    ...nonProductSections.slice(0, insertionIndex),
    ...orderedProductSections,
    ...nonProductSections.slice(insertionIndex),
  ].map((section, index) => ({
    ...section,
    display_order: index,
  }));

  const accountContent = (website.content as Record<string, unknown>)?.account as Record<string, unknown> | undefined;
  const googleReviewsEnabled = accountContent?.google_reviews_enabled === true;

  if (googleReviewsEnabled && website.account_id) {
    const cached = await getCachedGoogleReviews(website.account_id);
    if (cached && cached.reviews.length > 0) {
      const visibleReviews = cached.reviews.filter((r) => r.is_visible !== false);
      for (let i = 0; i < hydratedSections.length; i++) {
        if (hydratedSections[i].section_type !== SECTION_TESTIMONIALS) continue;
        hydratedSections[i] = {
          ...hydratedSections[i],
          content: {
            ...(hydratedSections[i].content as Record<string, unknown>),
            testimonials: visibleReviews.map((r) => ({
              name: r.author_name,
              avatar: r.author_photo,
              text: r.text,
              rating: r.rating,
              location: r.relative_time,
              images: r.images,
              response: r.response,
            })),
            source: 'google_reviews',
            averageRating: cached.average_rating,
            totalReviews: cached.total_reviews,
            googleMapsUrl: cached.google_maps_url,
            businessName: cached.business_name,
          },
        } as WebsiteSection;
      }
    }
  }

  const ctaSection = hydratedSections.find((section) => section.section_type === SECTION_CTA);
  if (ctaSection) {
    hydratedSections = [
      ...hydratedSections.filter((section) => section.section_type !== SECTION_CTA),
      ctaSection,
    ].map((section, index) => ({
      ...section,
      display_order: index,
    }));
  }

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
