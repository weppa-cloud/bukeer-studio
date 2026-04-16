import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getWebsiteBySubdomain } from '@/lib/supabase/get-website';
import { getPageBySlug, getProductPage, getDestinations, getDestinationProducts, getDestinationSeoOverride } from '@/lib/supabase/get-pages';
import { getReviewsForContext, type ReviewContext } from '@/lib/supabase/get-reviews';
import { enrichDestinationFromSerpAPI } from '@/lib/services/serpapi-enrichment';
import { generateHreflangLinks, generateOgLocale } from '@/lib/seo/hreflang';
import { resolveOgImage } from '@/lib/seo/og-helpers';
import { CategoryPage } from '@/components/pages/category-page';
import { StaticPage } from '@/components/pages/static-page';
import { ProductLandingPage } from '@/components/pages/product-landing-page';
import dynamic from 'next/dynamic';

const DestinationListingPage = dynamic(
  () => import('@/components/pages/destination-listing-page').then(m => m.DestinationListingPage)
);
const DestinationDetailPage = dynamic(
  () => import('@/components/pages/destination-detail-page').then(m => m.DestinationDetailPage)
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

/**
 * Build alternate language links for Next.js metadata `alternates.languages`
 */
function buildAlternateLanguages(baseUrl: string, pathname: string): Record<string, string> {
  const links = generateHreflangLinks(baseUrl, pathname);
  const languages: Record<string, string> = {};
  for (const link of links) {
    languages[link.hreflang] = link.href;
  }
  return languages;
}

// Generate metadata for SEO
export async function generateMetadata({ params }: DynamicPageProps): Promise<Metadata> {
  const { subdomain, slug } = await params;
  const website = await getWebsiteBySubdomain(subdomain);

  if (!website) {
    return { title: 'Sitio no encontrado' };
  }

  // Canonical base URL: prefer custom_domain when available
  const baseUrl = website.custom_domain
    ? `https://${website.custom_domain}`
    : `https://${subdomain}.bukeer.com`;

  // OG locale from website language (default: es)
  const websiteLang = (website as unknown as Record<string, unknown>).language as string
    || (website as unknown as Record<string, unknown>).locale as string
    || 'es';
  const { locale: ogLocale } = generateOgLocale(websiteLang);

  // Handle different page types based on slug
  const slugPath = slug.join('/');

  // Destination listing (/destinos or /destinations)
  if (slug.length === 1 && (slug[0] === 'destinos' || slug[0] === 'destinations')) {
    const siteName = website.content?.account?.name || website.content?.siteName || subdomain;
    const pathname = '/destinos';
    const ogImage = resolveOgImage(website);
    return {
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
        canonical: `${baseUrl}${pathname}`,
        languages: buildAlternateLanguages(baseUrl, pathname),
      },
    };
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
          canonical: `${baseUrl}${pathname}`,
          languages: buildAlternateLanguages(baseUrl, pathname),
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
        const title = productPage.page?.custom_seo_title || productPage.product.name;
        const description = productPage.page?.custom_seo_description ||
          productPage.product.description?.substring(0, 160);
        const pathname = `/${slugPath}`;

        const metadata: Metadata = {
          title,
          description,
          openGraph: {
            title,
            description,
            type: 'website',
            locale: ogLocale,
            ...(resolveOgImage(website, productPage.product.image) && { images: [{ url: resolveOgImage(website, productPage.product.image)! }] }),
          },
          twitter: {
            card: 'summary_large_image',
            title,
            description,
            ...(resolveOgImage(website, productPage.product.image) && { images: [resolveOgImage(website, productPage.product.image)!] }),
          },
          alternates: {
            canonical: `${baseUrl}${pathname}`,
            languages: buildAlternateLanguages(baseUrl, pathname),
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
          canonical: baseUrl,
        },
      };
    }
    return { title: 'Página no encontrada' };
  }

  const title = page.seo_title || page.title;
  const description = page.seo_description || '';
  const canonicalUrl = `${baseUrl}/${slugPath}`;

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
        const productReviews = googleEnabled && website.account_id
          ? await getReviewsForContext(website.account_id, reviewContext, 3)
          : [];

        return (
          <ProductLandingPage
            website={website}
            product={productPage.product}
            pageCustomization={productPage.page}
            productType={productType}
            googleReviews={productReviews}
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

// Revalidate every 5 minutes
export const revalidate = 300;
