import { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';

import { ProductLandingPage } from '@/components/pages/product-landing-page';
import { getCategoryProducts, getProductPage } from '@/lib/supabase/get-pages';
import { getReviewsForContext, type ReviewContext } from '@/lib/supabase/get-reviews';
import { getWebsiteBySubdomain } from '@/lib/supabase/get-website';
import { generateHreflangLinks, generateOgLocale } from '@/lib/seo/hreflang';
import { resolveOgImage } from '@/lib/seo/og-helpers';
import { normalizeLanguage } from '@/components/seo/product-schema';
import { sanitizeProductCopy } from '@/lib/products/normalize-product';

interface PackagePageProps {
  params: Promise<{ subdomain: string; slug: string }>;
}

function buildAlternateLanguages(baseUrl: string, pathname: string): Record<string, string> {
  const links = generateHreflangLinks(baseUrl, pathname);
  const languages: Record<string, string> = {};
  for (const link of links) {
    languages[link.hreflang] = link.href;
  }
  return languages;
}

function looksLikeLegacyId(value: string): boolean {
  return /^[0-9]+$/.test(value) || /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function resolveLegacyPackageSlug(subdomain: string, value: string): Promise<string | null> {
  if (!looksLikeLegacyId(value)) {
    return null;
  }

  const { items } = await getCategoryProducts(subdomain, 'packages', { limit: 500, offset: 0 });
  const match = items.find((item) => item.id === value && typeof item.slug === 'string' && item.slug.trim().length > 0);
  return match?.slug ?? null;
}

export async function generateMetadata({ params }: PackagePageProps): Promise<Metadata> {
  const { subdomain, slug } = await params;
  const website = await getWebsiteBySubdomain(subdomain);

  if (!website) {
    return { title: 'Sitio no encontrado' };
  }

  const baseUrl = website.custom_domain
    ? `https://${website.custom_domain}`
    : `https://${subdomain}.bukeer.com`;

  const websiteLang = normalizeLanguage(
    (website as unknown as Record<string, unknown>).language as string
      || (website as unknown as Record<string, unknown>).locale as string
      || null,
  );
  const { locale: ogLocale } = generateOgLocale(websiteLang);

  const productPage = await getProductPage(subdomain, 'package', slug);
  if (!productPage?.product) {
    return {
      title: 'Paquete no encontrado',
      robots: { index: false, follow: true },
    };
  }

  const pathname = `/paquetes/${productPage.product.slug || slug}`;
  const rawTitle = productPage.page?.custom_seo_title || productPage.product.name;
  const rawDescription = productPage.page?.custom_seo_description || productPage.product.description || '';
  const title = sanitizeProductCopy(rawTitle) || 'Paquete de viaje';
  const description = (sanitizeProductCopy(rawDescription) || 'Paquete de viaje').slice(0, 160);
  const ogImage = resolveOgImage(website, productPage.product.social_image || productPage.product.image);

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
      canonical: `${baseUrl}${pathname}`,
      languages: buildAlternateLanguages(baseUrl, pathname),
    },
  };

  if (productPage.page?.robots_noindex) {
    metadata.robots = { index: false, follow: true };
  }

  return metadata;
}

export default async function PackageSlugPage({ params }: PackagePageProps) {
  const { subdomain, slug } = await params;
  const website = await getWebsiteBySubdomain(subdomain);

  if (!website || website.status !== 'published') {
    notFound();
  }

  // Legacy UUID/numeric ID routing: if the slug segment is actually a legacy
  // record id, resolve it to the current slug and emit a permanent redirect
  // so search engines collapse old URLs onto the slug canonical.
  // Next.js `permanentRedirect` returns 308 which Google treats equivalently
  // to 301 for SEO purposes (and preserves the original method).
  if (looksLikeLegacyId(slug)) {
    const migratedSlug = await resolveLegacyPackageSlug(subdomain, slug);
    if (migratedSlug && migratedSlug !== slug) {
      permanentRedirect(`/site/${subdomain}/paquetes/${migratedSlug}`);
    }
    // Legacy id with no matching slug → 404 instead of trying to render.
    notFound();
  }

  const productPage = await getProductPage(subdomain, 'package', slug);
  if (!productPage?.product) {
    notFound();
  }

  const accountContent = ((website.content as unknown as Record<string, unknown>)?.account as Record<string, unknown> | undefined);
  const googleEnabled = accountContent?.google_reviews_enabled === true;
  const reviewContext: ReviewContext = {
    type: 'package',
    destination: productPage.product.location || productPage.product.city || productPage.product.name,
  };
  const packageReviews = googleEnabled && website.account_id
    ? await getReviewsForContext(website.account_id, reviewContext, 3)
    : [];

  return (
    <ProductLandingPage
      website={website}
      product={productPage.product}
      pageCustomization={productPage.page}
      productType="package"
      googleReviews={packageReviews}
    />
  );
}

export const revalidate = 300;
