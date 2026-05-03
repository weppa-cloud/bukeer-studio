import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound, permanentRedirect, redirect } from 'next/navigation';

import { ProductLandingPage } from '@/components/pages/product-landing-page';
import { TemplateSlot } from '@/components/site/themes/editorial-v1/template-slot';
import type { EditorialActivityDetailPayload } from '@/components/site/themes/editorial-v1/pages/activity-detail';
import { ACTIVITY_FAQS_DEFAULT } from '@/lib/products/activity-faqs-default';
import { getActivityCircuitStops, type ActivityCircuitStop } from '@/lib/products/activity-circuit';
import { sanitizeProductCopy } from '@/lib/products/normalize-product';
import { resolveTemplateSet } from '@/lib/sections/template-set';
import {
  getCategoryProducts,
  getLocalizedProductOverlay,
  getProductPage,
  getProductSlugRedirect,
} from '@/lib/supabase/get-pages';
import { getReviewsForContext, type ReviewContext } from '@/lib/supabase/get-reviews';
import { getWebsiteBySubdomain } from '@/lib/supabase/get-website';
import { buildLocaleAwareAlternateLanguages, resolvePublicMetadataLocale } from '@/lib/seo/public-metadata';
import { buildPublicLocalizedPath, localeToOgLocale } from '@/lib/seo/locale-routing';
import { resolveOgImage } from '@/lib/seo/og-helpers';
import { getBasePath } from '@/lib/utils/base-path';

interface ActivityPageProps {
  params: Promise<{ subdomain: string; slug: string }>;
}

function ensureSeoDescription(seed: string, fallback: string): string {
  const base = sanitizeProductCopy(seed) || sanitizeProductCopy(fallback);
  const expanded = base.length >= 120
    ? base
    : `${base} Incluye información práctica, soporte local y opciones flexibles para sumar la experiencia a tu viaje.`;
  return expanded.slice(0, 160);
}

export async function generateMetadata({ params }: ActivityPageProps): Promise<Metadata> {
  const { subdomain, slug } = await params;
  const website = await getWebsiteBySubdomain(subdomain);
  const siteName = website?.content?.account?.name || website?.content?.siteName || subdomain;
  const fallbackDescription = `${siteName} - Actividades y experiencias en Colombia con información clara, soporte local y opciones de reserva.`;

  if (!website) {
    return {
      title: 'Actividad no encontrada',
      description: fallbackDescription,
      robots: { index: false, follow: true },
    };
  }

  const baseUrl = website.custom_domain
    ? `https://${website.custom_domain}`
    : `https://${subdomain}.bukeer.com`;
  const pathname = `/actividades/${slug}`;
  const localeContext = await resolvePublicMetadataLocale(website, pathname);
  const productPage = await getProductPage(subdomain, 'activity', slug, {
    locale: localeContext.resolvedLocale,
  });

  if (!productPage?.product) {
    return {
      title: 'Actividad no encontrada',
      description: fallbackDescription,
      robots: { index: false, follow: true },
    };
  }

  let localizedOverlayTitle: string | null = null;
  let localizedOverlayDescription: string | null = null;
  let localizedOverlayNoindex: boolean | null = null;
  if (
    localeContext.resolvedLocale !== localeContext.defaultLocale &&
    website.id &&
    productPage.product.id
  ) {
    const overlay = await getLocalizedProductOverlay({
      websiteId: String(website.id),
      productType: 'activity',
      productId: String(productPage.product.id),
      locale: localeContext.resolvedLocale,
    });
    if (overlay) {
      localizedOverlayTitle = overlay.custom_seo_title ?? null;
      localizedOverlayDescription = overlay.custom_seo_description ?? null;
      localizedOverlayNoindex = overlay.robots_noindex ?? null;
    }
  }

  const isDefaultLocale = localeContext.resolvedLocale === localeContext.defaultLocale;
  const rawTitle =
    localizedOverlayTitle ||
    (isDefaultLocale ? productPage.page?.custom_seo_title : null) ||
    productPage.product.name;
  const title = sanitizeProductCopy(rawTitle) || productPage.product.name;
  const locationHint = sanitizeProductCopy(
    productPage.product.location ||
      productPage.product.city ||
      productPage.product.country ||
      ''
  );
  const rawDescription =
    localizedOverlayDescription ||
    (isDefaultLocale ? productPage.page?.custom_seo_description : null) ||
    productPage.product.description ||
    '';
  const description = ensureSeoDescription(
    rawDescription,
    `Reserva ${title}${locationHint ? ` en ${locationHint}` : ''} con ${siteName}, acompañamiento local e información práctica para tu viaje.`
  );
  const canonicalPathname = `/actividades/${productPage.product.slug || slug}`;
  const localizedPathname = buildPublicLocalizedPath(
    canonicalPathname,
    localeContext.resolvedLocale,
    localeContext.defaultLocale,
  );
  const canonical = `${baseUrl}${localizedPathname}`;
  const ogImage = resolveOgImage(website, productPage.product.social_image || productPage.product.image);

  const metadata: Metadata = {
    title,
    description,
    alternates: {
      canonical,
      languages: buildLocaleAwareAlternateLanguages(baseUrl, canonicalPathname, localeContext),
    },
    openGraph: {
      title,
      description,
      type: 'website',
      url: canonical,
      siteName,
      locale: localeToOgLocale(localeContext.resolvedLocale),
      ...(ogImage && { images: [{ url: ogImage }] }),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(ogImage && { images: [ogImage] }),
    },
  };

  const effectiveNoindex =
    localizedOverlayNoindex !== null ? localizedOverlayNoindex : productPage.page?.robots_noindex;
  if (effectiveNoindex) {
    metadata.robots = { index: false, follow: true };
  }

  return metadata;
}

export default async function ActivitySlugPage({ params }: ActivityPageProps) {
  const { subdomain, slug } = await params;
  const website = await getWebsiteBySubdomain(subdomain);

  if (!website || website.status !== 'published') {
    notFound();
  }

  const localeContext = await resolvePublicMetadataLocale(website, `/actividades/${slug}`);
  const resolvedLocale = localeContext.resolvedLocale;
  const productPage = await getProductPage(subdomain, 'activity', slug, {
    locale: resolvedLocale,
  });

  if (!productPage?.product) {
    const redirectedSlug = website.account_id
      ? await getProductSlugRedirect(String(website.account_id), 'activity', slug)
      : null;
    if (redirectedSlug) {
      permanentRedirect(`/site/${subdomain}/actividades/${redirectedSlug}`);
    }
    notFound();
  }

  const defaultLocale = localeContext.defaultLocale ?? 'es-CO';
  if (resolvedLocale !== defaultLocale && website.id && productPage.product.id) {
    const overlay = await getLocalizedProductOverlay({
      websiteId: String(website.id),
      productType: 'activity',
      productId: String(productPage.product.id),
      locale: resolvedLocale,
    });
    if (!overlay) {
      redirect(`/site/${subdomain}/actividades/${productPage.product.slug || slug}`);
    }
  }

  const accountContent = ((website.content as unknown as Record<string, unknown>)?.account as Record<string, unknown> | undefined);
  const googleEnabled = accountContent?.google_reviews_enabled === true;
  const reviewContext: ReviewContext = { type: 'activity', name: productPage.product.name };
  const [activityReviews, similarActivitiesPayload] = await Promise.all([
    googleEnabled && website.account_id
      ? getReviewsForContext(website.account_id, reviewContext, 3)
      : Promise.resolve([]),
    getCategoryProducts(subdomain, 'activities', { limit: 8, offset: 0 }),
  ]);

  let activityCircuitStops: ActivityCircuitStop[] = [];
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const maptilerKey = process.env.MAPTILER_GEOCODING_KEY ?? '';
  if (supabaseUrl && supabaseServiceRoleKey) {
    try {
      activityCircuitStops = await getActivityCircuitStops(productPage.product, {
        deps: { supabaseUrl, supabaseServiceRoleKey, maptilerKey },
      });
    } catch (error) {
      console.warn('[activity-circuit] extraction failed', { slug, error });
    }
  }

  const headerList = await headers();
  const isCustomDomain = Boolean(headerList.get('x-custom-domain'));
  const websiteForRender = {
    ...website,
    resolvedLocale,
    defaultLocale,
    isCustomDomain,
  };
  const displayName = sanitizeProductCopy(
    productPage.page?.custom_hero?.title || productPage.product.name
  ) || productPage.product.name;
  const displayLocation = sanitizeProductCopy(
    productPage.page?.custom_hero?.subtitle ||
      productPage.product.location ||
      [productPage.product.city, productPage.product.country].filter(Boolean).join(', ')
  ) || null;
  const faqs =
    Array.isArray(productPage.page?.custom_faq) && productPage.page.custom_faq.length > 0
      ? productPage.page.custom_faq
      : ACTIVITY_FAQS_DEFAULT;
  const editorialPayload: EditorialActivityDetailPayload = {
    product: productPage.product,
    basePath: getBasePath(website.subdomain, isCustomDomain),
    displayName,
    displayLocation,
    resolvedLocale,
    googleReviews: activityReviews,
    similarProducts: similarActivitiesPayload.items,
    activityCircuitStops,
    faqs,
  };
  const isEditorialTemplate = resolveTemplateSet(websiteForRender) === 'editorial-v1';

  return (
    <TemplateSlot name="activity-detail" website={websiteForRender} payload={editorialPayload}>
      <ProductLandingPage
        website={websiteForRender}
        product={productPage.product}
        pageCustomization={productPage.page}
        productType="activity"
        googleReviews={activityReviews}
        activityCircuitStops={activityCircuitStops}
        similarProducts={similarActivitiesPayload.items}
        resolvedLocale={resolvedLocale}
        editorialMode={isEditorialTemplate}
      />
    </TemplateSlot>
  );
}

export const revalidate = 300;
