import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getWebsiteBySubdomain } from '@/lib/supabase/get-website';
import { getPageBySlug, getProductPage, getDestinations, getDestinationProducts, getDestinationSeoOverride, getCategoryProducts } from '@/lib/supabase/get-pages';
import { getReviewsForContext, type ReviewContext } from '@/lib/supabase/get-reviews';
import { enrichDestinationFromSerpAPI } from '@/lib/services/serpapi-enrichment';
import { resolveOgImage } from '@/lib/seo/og-helpers';
import {
  buildLocaleAwareAlternateLanguages,
  resolvePublicMetadataLocale,
  type PublicMetadataLocaleContext,
} from '@/lib/seo/public-metadata';
import { buildPublicLocalizedPath, localeToOgLocale } from '@/lib/seo/locale-routing';
import { CategoryPage } from '@/components/pages/category-page';
import { StaticPage } from '@/components/pages/static-page';
import { ProductLandingPage } from '@/components/pages/product-landing-page';
import { getActivityCircuitStops, type ActivityCircuitStop } from '@/lib/products/activity-circuit';
import { sanitizeProductCopy } from '@/lib/products/normalize-product';
import dynamic from 'next/dynamic';

const DestinationListingPage = dynamic(
  () => import('@/components/pages/destination-listing-page').then(m => m.DestinationListingPage)
);
const DestinationDetailPage = dynamic(
  () => import('@/components/pages/destination-detail-page').then(m => m.DestinationDetailPage)
);
const ActivitiesListingPage = dynamic(
  () => import('@/components/pages/activities-listing-page').then(m => m.ActivitiesListingPage)
);
const PackagesListingPage = dynamic(
  () => import('@/components/pages/packages-listing-page').then(m => m.PackagesListingPage)
);

interface DynamicPageProps {
  params: Promise<{
    subdomain: string;
    slug: string[];
  }>;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), timeoutMs)),
  ]);
}

function buildCanonicalUrl(
  baseUrl: string,
  pathname: string,
  localeContext: PublicMetadataLocaleContext,
): string {
  const localizedPath = buildPublicLocalizedPath(
    pathname,
    localeContext.resolvedLocale,
    localeContext.defaultLocale,
  );

  if (localizedPath === '/') {
    return baseUrl;
  }

  return `${baseUrl}${localizedPath}`;
}

async function getListingRobotsNoindex(
  subdomain: string,
  candidateSlugs: string[],
): Promise<boolean> {
  for (const candidate of candidateSlugs) {
    const page = await getPageBySlug(subdomain, candidate);
    if (page) {
      return Boolean(page.robots_noindex);
    }
  }
  return false;
}

// Generate metadata for SEO
export async function generateMetadata({ params }: DynamicPageProps): Promise<Metadata> {
  const { subdomain, slug } = await params;
  const website = await getWebsiteBySubdomain(subdomain);
  const siteName = website?.content?.account?.name || website?.content?.siteName || subdomain;
  const fallbackDescription = `${siteName} - Explora itinerarios, hoteles y experiencias con soporte local.`;

  if (!website) {
    return {
      title: 'Sitio no encontrado',
      description: fallbackDescription,
    };
  }

  // Canonical base URL: prefer custom_domain when available
  const baseUrl = website.custom_domain
    ? `https://${website.custom_domain}`
    : `https://${subdomain}.bukeer.com`;

  // Handle different page types based on slug
  const slugPath = slug.join('/');
  const localeContext = await resolvePublicMetadataLocale(
    website,
    slugPath ? `/${slugPath}` : '/',
  );
  const ogLocale = localeToOgLocale(localeContext.resolvedLocale);

  // Activities listing (/actividades or /activities)
  if (slug.length === 1 && (slug[0] === 'actividades' || slug[0] === 'activities')) {
    const siteName = website.content?.account?.name || website.content?.siteName || subdomain;
    const pathname = '/actividades';
    const ogImage = resolveOgImage(website);
    const metadata: Metadata = {
      title: `Actividades | ${siteName}`,
      description: `Descubre todas las actividades y experiencias disponibles con ${siteName}.`,
      openGraph: {
        title: `Actividades | ${siteName}`,
        description: `Descubre todas las actividades y experiencias disponibles con ${siteName}.`,
        type: 'website',
        locale: ogLocale,
        ...(ogImage && { images: [{ url: ogImage }] }),
      },
      twitter: {
        card: 'summary_large_image',
        title: `Actividades | ${siteName}`,
        description: `Descubre todas las actividades y experiencias disponibles con ${siteName}.`,
        ...(ogImage && { images: [ogImage] }),
      },
      alternates: {
        canonical: buildCanonicalUrl(baseUrl, pathname, localeContext),
        languages: buildLocaleAwareAlternateLanguages(baseUrl, pathname, localeContext),
      },
    };

    if (await getListingRobotsNoindex(subdomain, ['actividades', 'activities'])) {
      metadata.robots = { index: false, follow: true };
    }

    return metadata;
  }

  // Hotels listing (/hoteles or /hotels)
  if (slug.length === 1 && (slug[0] === 'hoteles' || slug[0] === 'hotels')) {
    const siteName = website.content?.account?.name || website.content?.siteName || subdomain;
    const pathname = '/hoteles';
    const ogImage = resolveOgImage(website);
    const metadata: Metadata = {
      title: `Hoteles | ${siteName}`,
      description: `Explora hoteles seleccionados por ${siteName} para tu proximo viaje.`,
      openGraph: {
        title: `Hoteles | ${siteName}`,
        description: `Explora hoteles seleccionados por ${siteName} para tu proximo viaje.`,
        type: 'website',
        locale: ogLocale,
        ...(ogImage && { images: [{ url: ogImage }] }),
      },
      twitter: {
        card: 'summary_large_image',
        title: `Hoteles | ${siteName}`,
        description: `Explora hoteles seleccionados por ${siteName} para tu proximo viaje.`,
        ...(ogImage && { images: [ogImage] }),
      },
      alternates: {
        canonical: buildCanonicalUrl(baseUrl, pathname, localeContext),
        languages: buildLocaleAwareAlternateLanguages(baseUrl, pathname, localeContext),
      },
    };

    if (await getListingRobotsNoindex(subdomain, ['hoteles', 'hotels'])) {
      metadata.robots = { index: false, follow: true };
    }

    return metadata;
  }

  // Transfers listing (/traslados or /transfers)
  if (slug.length === 1 && (slug[0] === 'traslados' || slug[0] === 'transfers')) {
    const siteName = website.content?.account?.name || website.content?.siteName || subdomain;
    const pathname = '/traslados';
    const ogImage = resolveOgImage(website);
    const metadata: Metadata = {
      title: `Traslados | ${siteName}`,
      description: `Reserva traslados privados y compartidos con ${siteName}.`,
      openGraph: {
        title: `Traslados | ${siteName}`,
        description: `Reserva traslados privados y compartidos con ${siteName}.`,
        type: 'website',
        locale: ogLocale,
        ...(ogImage && { images: [{ url: ogImage }] }),
      },
      twitter: {
        card: 'summary_large_image',
        title: `Traslados | ${siteName}`,
        description: `Reserva traslados privados y compartidos con ${siteName}.`,
        ...(ogImage && { images: [ogImage] }),
      },
      alternates: {
        canonical: buildCanonicalUrl(baseUrl, pathname, localeContext),
        languages: buildLocaleAwareAlternateLanguages(baseUrl, pathname, localeContext),
      },
    };

    if (await getListingRobotsNoindex(subdomain, ['traslados', 'transfers'])) {
      metadata.robots = { index: false, follow: true };
    }

    return metadata;
  }

  // Packages listing (/paquetes or /packages)
  if (slug.length === 1 && (slug[0] === 'paquetes' || slug[0] === 'packages')) {
    const siteName = website.content?.account?.name || website.content?.siteName || subdomain;
    const pathname = '/paquetes';
    const ogImage = resolveOgImage(website);
    const metadata: Metadata = {
      title: `Paquetes de Viaje | ${siteName}`,
      description: `Descubre los paquetes de viaje curados por ${siteName}. Experiencias únicas todo incluido.`,
      openGraph: {
        title: `Paquetes de Viaje | ${siteName}`,
        description: `Descubre los paquetes de viaje curados por ${siteName}. Experiencias únicas todo incluido.`,
        type: 'website',
        locale: ogLocale,
        ...(ogImage && { images: [{ url: ogImage }] }),
      },
      twitter: {
        card: 'summary_large_image',
        title: `Paquetes de Viaje | ${siteName}`,
        description: `Descubre los paquetes de viaje curados por ${siteName}. Experiencias únicas todo incluido.`,
        ...(ogImage && { images: [ogImage] }),
      },
      alternates: {
        canonical: buildCanonicalUrl(baseUrl, pathname, localeContext),
        languages: buildLocaleAwareAlternateLanguages(baseUrl, pathname, localeContext),
      },
    };

    if (await getListingRobotsNoindex(subdomain, ['paquetes', 'packages'])) {
      metadata.robots = { index: false, follow: true };
    }

    return metadata;
  }

  // Destination listing (/destinos or /destinations)
  if (slug.length === 1 && (slug[0] === 'destinos' || slug[0] === 'destinations')) {
    const siteName = website.content?.account?.name || website.content?.siteName || subdomain;
    const pathname = '/destinos';
    const ogImage = resolveOgImage(website);
    const metadata: Metadata = {
      title: `Destinos | ${siteName}`,
      description: `Descubre los mejores destinos de viaje con ${siteName}. Hoteles, actividades y experiencias seleccionadas.`,
      openGraph: {
        title: `Destinos | ${siteName}`,
        description: `Descubre los mejores destinos de viaje con ${siteName}.`,
        type: 'website',
        locale: ogLocale,
        ...(ogImage && { images: [{ url: ogImage }] }),
      },
      twitter: {
        card: 'summary_large_image',
        title: `Destinos | ${siteName}`,
        description: `Descubre los mejores destinos de viaje con ${siteName}.`,
        ...(ogImage && { images: [ogImage] }),
      },
      alternates: {
        canonical: buildCanonicalUrl(baseUrl, pathname, localeContext),
        languages: buildLocaleAwareAlternateLanguages(baseUrl, pathname, localeContext),
      },
    };

    if (await getListingRobotsNoindex(subdomain, ['destinos', 'destinations'])) {
      metadata.robots = { index: false, follow: true };
    }

    return metadata;
  }

  // Destination detail (/destinos/[slug])
  if (slug.length === 2 && (slug[0] === 'destinos' || slug[0] === 'destinations')) {
    const destinations = await getDestinations(subdomain);
    const dest = destinations.find(d => d.slug === slug[1]);
    if (dest) {
      const siteName = website.content?.account?.name || website.content?.siteName || subdomain;
      const override = await getDestinationSeoOverride(website.id, dest.slug);
      const title = override?.custom_seo_title || `${dest.name} | ${siteName}`;
      const description = override?.custom_seo_description || `Explora ${dest.name}: ${dest.hotel_count} hoteles y ${dest.activity_count} actividades${dest.min_price ? ` desde ${dest.min_price}` : ''}. Reserva con ${siteName}.`;
      const pathname = `/destinos/${dest.slug}`;
      const metadata: Metadata = {
        title,
        description,
        openGraph: {
          title,
          description,
          type: 'website',
          locale: ogLocale,
          ...(resolveOgImage(website, dest.image) && { images: [{ url: resolveOgImage(website, dest.image)! }] }),
        },
        twitter: {
          card: 'summary_large_image',
          title,
          description,
          ...(resolveOgImage(website, dest.image) && { images: [resolveOgImage(website, dest.image)!] }),
        },
        alternates: {
          canonical: buildCanonicalUrl(baseUrl, pathname, localeContext),
          languages: buildLocaleAwareAlternateLanguages(baseUrl, pathname, localeContext),
        },
      };

      if (override?.robots_noindex) {
        metadata.robots = { index: false, follow: true };
      }

      return metadata;
    }
  }

  // Check if this is a product page (has 2+ segments like /hoteles/hotel-name)
  if (slug.length >= 2) {
    const categorySlug = slug[0];
    const productSlug = slug.slice(1).join('/');
    const productType = getCategoryProductType(categorySlug);

    if (productType) {
      const productPage = await getProductPage(subdomain, productType, productSlug);
      if (productPage?.product) {
        const title = sanitizeProductCopy(productPage.page?.custom_seo_title || productPage.product.name) || productPage.product.name;
        const rawDescription = sanitizeProductCopy(
          productPage.page?.custom_seo_description || productPage.product.description || ''
        );
        const locationHint = sanitizeProductCopy(
          productPage.product.location || productPage.product.city || productPage.product.country || ''
        );
        const fallbackDescription = sanitizeProductCopy(
          `Reserva ${productPage.product.name}${locationHint ? ` en ${locationHint}` : ''} con soporte local, actividades y opciones flexibles.`
        );
        const description = (rawDescription || fallbackDescription).slice(0, 160);
        const pathname = `/${slugPath}`;

        const metadata: Metadata = {
          title,
          description,
          openGraph: {
            title,
            description,
            type: 'website',
            locale: ogLocale,
            ...(resolveOgImage(website, productPage.product.social_image || productPage.product.image) && {
              images: [{ url: resolveOgImage(website, productPage.product.social_image || productPage.product.image)! }],
            }),
          },
          twitter: {
            card: 'summary_large_image',
            title,
            description,
            ...(resolveOgImage(website, productPage.product.social_image || productPage.product.image) && {
              images: [resolveOgImage(website, productPage.product.social_image || productPage.product.image)!],
            }),
          },
          alternates: {
            canonical: buildCanonicalUrl(baseUrl, pathname, localeContext),
            languages: buildLocaleAwareAlternateLanguages(baseUrl, pathname, localeContext),
          },
        };

        if (productPage.page?.robots_noindex) {
          metadata.robots = { index: false, follow: true };
        }

        return metadata;
      }
    }
  }

  // Check for regular page (category, static, or custom)
  const page = await getPageBySlug(subdomain, slugPath);

  if (!page) {
    // Homepage fallback: use website SEO metadata from layout
    if (slugPath === '') {
      const { content } = website;
      const siteName = content?.account?.name || content?.siteName;
      const description = content?.seo?.description
        || content?.tagline
        || `${siteName || subdomain} - Tu agencia de viajes de confianza`;
      const ogImage = resolveOgImage(website);
      return {
        title: content?.seo?.title || siteName,
        description,
        openGraph: {
          title: content?.seo?.title || siteName,
          description,
          type: 'website',
          locale: ogLocale,
          ...(ogImage && { images: [{ url: ogImage }] }),
        },
        twitter: {
          card: 'summary_large_image',
          title: content?.seo?.title || siteName || undefined,
          description,
          ...(ogImage && { images: [ogImage] }),
        },
        alternates: {
          canonical: buildCanonicalUrl(baseUrl, '/', localeContext),
          languages: buildLocaleAwareAlternateLanguages(baseUrl, '/', localeContext),
        },
      };
    }
    return {
      title: 'Página no encontrada',
      description: fallbackDescription,
    };
  }

  const title = page.seo_title || page.title;
  const description = page.seo_description || '';
  const canonicalUrl = buildCanonicalUrl(baseUrl, `/${slugPath}`, localeContext);

  const ogImage = resolveOgImage(website);
  const metadata: Metadata = {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      locale: ogLocale,
      ...(ogImage && { images: [{ url: ogImage }] }),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(ogImage && { images: [ogImage] }),
    },
    alternates: {
      canonical: canonicalUrl,
      languages: buildLocaleAwareAlternateLanguages(baseUrl, `/${slugPath}`, localeContext),
    },
  };

  if (page.robots_noindex) {
    metadata.robots = { index: false, follow: true };
  }

  return metadata;
}

export default async function DynamicPage({ params }: DynamicPageProps) {
  const { subdomain, slug } = await params;
  const website = await getWebsiteBySubdomain(subdomain);

  if (!website || website.status !== 'published') {
    notFound();
  }

  const slugPath = slug.join('/');

  // Handle activities listing (/actividades)
  if (slug.length === 1 && (slug[0] === 'actividades' || slug[0] === 'activities')) {
    const { items: activityProducts } = await getCategoryProducts(subdomain, 'activities', { limit: 100, offset: 0 });
    return <ActivitiesListingPage website={website} activities={activityProducts} />;
  }

  // Handle packages listing (/paquetes)
  if (slug.length === 1 && (slug[0] === 'paquetes' || slug[0] === 'packages')) {
    const { items: packageProducts } = await getCategoryProducts(subdomain, 'packages', { limit: 100, offset: 0 });
    return <PackagesListingPage website={website} packages={packageProducts} />;
  }

  // Handle destination listing (/destinos)
  if (slug.length === 1 && (slug[0] === 'destinos' || slug[0] === 'destinations')) {
    const destinations = await getDestinations(subdomain);
    return <DestinationListingPage website={website} destinations={destinations} />;
  }

  // Handle destination detail (/destinos/[slug])
  if (slug.length === 2 && (slug[0] === 'destinos' || slug[0] === 'destinations')) {
    const destinations = await getDestinations(subdomain);
    const dest = destinations.find(d => d.slug === slug[1]);
    if (dest) {
      const [products, serpData, destReviews] = await Promise.all([
        getDestinationProducts(subdomain, dest.name),
        // Prevent slow external enrichment from blocking destination detail navigation.
        withTimeout(enrichDestinationFromSerpAPI(dest.name), 1200, null),
        website.account_id
          ? getReviewsForContext(website.account_id, { type: 'destination', name: dest.name }, 6)
          : Promise.resolve([]),
      ]);
      return <DestinationDetailPage website={website} destination={dest} products={products} serpEnrichment={serpData} googleReviews={destReviews} />;
    }
  }

  // Handle product pages (2+ segments like /hoteles/hotel-name)
  if (slug.length >= 2) {
    const categorySlug = slug[0];
    const productSlug = slug.slice(1).join('/');
    const productType = getCategoryProductType(categorySlug);

    if (productType) {
      const productPage = await getProductPage(subdomain, productType, productSlug);

      if (productPage?.product) {
        // Fetch relevant Google Reviews using contextual scoring (photo-priority)
        const accountContent = ((website.content as unknown as Record<string, unknown>)?.account as Record<string, unknown> | undefined);
        const googleEnabled = accountContent?.google_reviews_enabled === true;
        const product = productPage.product;
        const productLocation = product.location || product.city || '';
        const reviewContext: ReviewContext = productType === 'activity'
          ? { type: 'activity', name: product.name }
          : productType === 'package'
          ? { type: 'package', destination: productLocation || product.name }
          : { type: 'destination', name: productLocation || product.name };
        const categoryType = getProductCategoryType(productType);
        const [productReviews, similarProductsPayload] = await Promise.all([
          googleEnabled && website.account_id
            ? getReviewsForContext(website.account_id, reviewContext, 3)
            : Promise.resolve([]),
          getCategoryProducts(subdomain, categoryType, { limit: 24, offset: 0 }),
        ]);
        const similarProducts = similarProductsPayload.items;

        let activityCircuitStops: ActivityCircuitStop[] = [];
        if (productType === 'activity') {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
          const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
          const maptilerKey = process.env.MAPTILER_GEOCODING_KEY ?? '';
          if (supabaseUrl && supabaseServiceRoleKey) {
            try {
              activityCircuitStops = await getActivityCircuitStops(product, {
                deps: { supabaseUrl, supabaseServiceRoleKey, maptilerKey },
              });
            } catch (error) {
              console.warn('[activity-circuit] extraction failed', { slug: productSlug, error });
            }
          }
        }

        return (
          <ProductLandingPage
            website={website}
            product={productPage.product}
            pageCustomization={productPage.page}
            productType={productType}
            googleReviews={productReviews}
            activityCircuitStops={activityCircuitStops}
            similarProducts={similarProducts}
          />
        );
      }
    }
  }

  // Handle regular pages
  const page = await getPageBySlug(subdomain, slugPath);

  if (!page || !page.is_published) {
    notFound();
  }

  // Render based on page type
  switch (page.page_type) {
    case 'category':
      return (
        <CategoryPage
          website={website}
          page={page}
          categoryType={page.category_type}
        />
      );

    case 'static':
    case 'custom': {
      const dynamicDestinations = await getDestinations(subdomain);
      return (
        <StaticPage
          website={website}
          page={page}
          dynamicDestinations={dynamicDestinations}
        />
      );
    }

    default:
      notFound();
  }
}

// Helper to map category slugs to product types
function getCategoryProductType(categorySlug: string): string | null {
  const mapping: Record<string, string> = {
    'destinos': 'destination',
    'destinations': 'destination',
    'hoteles': 'hotel',
    'hotels': 'hotel',
    'actividades': 'activity',
    'activities': 'activity',
    'traslados': 'transfer',
    'transfers': 'transfer',
    'paquetes': 'package',
    'packages': 'package',
  };

  return mapping[categorySlug.toLowerCase()] || null;
}

function getProductCategoryType(productType: string): string {
  const mapping: Record<string, string> = {
    destination: 'destinations',
    hotel: 'hotels',
    activity: 'activities',
    transfer: 'transfers',
    package: 'packages',
  };

  return mapping[productType] || 'activities';
}

// Revalidate every 5 minutes
export const revalidate = 300;
