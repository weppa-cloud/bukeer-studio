import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getWebsiteBySubdomain } from "@/lib/supabase/get-website";
import type { WebsiteData } from "@/lib/supabase/get-website";
import {
  getCategoryProducts,
  getDestinations,
  getDestinationProducts,
  getDestinationSeoOverride,
  getLocalizedProductOverlay,
  getPageBySlug,
  getPageBySlugForLocale,
  getPageByTranslationGroup,
  getProductPage,
} from "@/lib/supabase/get-pages";
import {
  getReviewsForContext,
  type ReviewContext,
} from "@/lib/supabase/get-reviews";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { enrichDestinationFromSerpAPI } from "@/lib/services/serpapi-enrichment";
import { resolveOgImage } from "@/lib/seo/og-helpers";
import { normalizePublicMetadataTitle } from "@/lib/seo/metadata-title";
import {
  buildLocaleAwareAlternateLanguages,
  resolvePublicMetadataLocale,
  type PublicMetadataLocaleContext,
} from "@/lib/seo/public-metadata";
import {
  buildPublicLocalizedPath,
  localeToLanguage,
  localeToOgLocale,
  normalizeLocale,
} from "@/lib/seo/locale-routing";
import { CategoryPage } from "@/components/pages/category-page";
import { StaticPage } from "@/components/pages/static-page";
import { ProductLandingPage } from "@/components/pages/product-landing-page";
import { ActivitiesListingPage } from "@/components/pages/activities-listing-page";
import {
  TemplateSlot,
  type TemplateSlotName,
} from "@/components/site/themes/editorial-v1/template-slot";
import type { EditorialPackageDetailPayload } from "@/components/site/themes/editorial-v1/pages/package-detail";
import type { EditorialActivityDetailPayload } from "@/components/site/themes/editorial-v1/pages/activity-detail";
import type { EditorialHotelDetailPayload } from "@/components/site/themes/editorial-v1/pages/hotel-detail";
import type { EditorialDestinosListPagePayload } from "@/components/site/themes/editorial-v1/pages/destinos-list";
import type { EditorialDestinoDetailPayload } from "@/components/site/themes/editorial-v1/pages/destino-detail";
import type { EditorialPaquetesListPagePayload } from "@/components/site/themes/editorial-v1/pages/paquetes-list";
import type { EditorialHotelesListPagePayload } from "@/components/site/themes/editorial-v1/pages/hoteles-list";
import {
  getActivityCircuitStops,
  type ActivityCircuitStop,
} from "@/lib/products/activity-circuit";
import { sanitizeProductCopy } from "@/lib/products/normalize-product";
import { toSimilarProductSummaries } from "@/lib/products/similar-product-summary";
import { getBasePath, inferIsCustomDomainWebsite } from "@/lib/utils/base-path";
import dynamic from "next/dynamic";
import { applyContentTranslations } from "@/lib/sections/apply-content-translations";
import { resolveTemplateSet } from "@/lib/sections/template-set";
import { ACTIVITY_FAQS_DEFAULT } from "@/lib/products/activity-faqs-default";
import { PACKAGE_FAQS_DEFAULT } from "@/lib/products/package-faqs-default";
import { resolvePublicPageForRoute } from "@/lib/site/public-page-resolution";
import { getSystemFallbackPage } from "@/lib/site/system-fallback-pages";
import { getPublicUiMessages } from "@/lib/site/public-ui-messages";
import { getPublicUiExtraTextGetter } from "@/lib/site/public-ui-extra-text";

const DestinationListingPage = dynamic(() =>
  import("@/components/pages/destination-listing-page").then(
    (m) => m.DestinationListingPage,
  ),
);
const DestinationDetailPage = dynamic(() =>
  import("@/components/pages/destination-detail-page").then(
    (m) => m.DestinationDetailPage,
  ),
);
const PackagesListingPage = dynamic(() =>
  import("@/components/pages/packages-listing-page").then(
    (m) => m.PackagesListingPage,
  ),
);

interface DynamicPageProps {
  params: Promise<{
    subdomain: string;
    slug: string[];
  }>;
}

type TranscreatePageType =
  | "blog"
  | "page"
  | "destination"
  | "hotel"
  | "activity"
  | "package"
  | "transfer";

const UUID_PATTERN =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallback: T,
): Promise<T> {
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

  if (localizedPath === "/") {
    return baseUrl;
  }

  return `${baseUrl}${localizedPath}`;
}

function toPlainMetadataText(value: string): string {
  return value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

async function resolveListingPageMeta(
  subdomain: string,
  candidateSlugs: string[],
): Promise<{ pageId: string | null; robotsNoindex: boolean }> {
  for (const candidate of candidateSlugs) {
    const page = await getPageBySlug(subdomain, candidate);
    if (page) {
      return {
        pageId: typeof page.id === "string" ? page.id : null,
        robotsNoindex: Boolean(page.robots_noindex),
      };
    }
  }
  return { pageId: null, robotsNoindex: false };
}

async function loadTranslatedLocalesForPage(input: {
  websiteId: string;
  pageType: TranscreatePageType;
  pageId: string;
  defaultLocale: string;
}): Promise<string[] | undefined> {
  try {
    if (!isUuid(input.websiteId) || !isUuid(input.pageId)) {
      return [normalizeLocale(input.defaultLocale)];
    }

    const admin = createSupabaseServiceRoleClient();
    const { data, error } = await admin
      .from("seo_transcreation_jobs")
      .select("target_locale")
      .eq("website_id", input.websiteId)
      .eq("page_type", input.pageType)
      .eq("page_id", input.pageId)
      .in("status", ["applied", "published"]);

    if (error) {
      return [normalizeLocale(input.defaultLocale)];
    }

    const translated = (data ?? [])
      .map((row) => row.target_locale)
      .filter(
        (locale): locale is string =>
          typeof locale === "string" && locale.trim().length > 0,
      )
      .map((locale) => normalizeLocale(locale));

    return Array.from(
      new Set([normalizeLocale(input.defaultLocale), ...translated]),
    );
  } catch {
    return [normalizeLocale(input.defaultLocale)];
  }
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: DynamicPageProps): Promise<Metadata> {
  const { subdomain, slug } = await params;
  const website = await getWebsiteBySubdomain(subdomain);
  const siteName =
    website?.content?.account?.name || website?.content?.siteName || subdomain;
  const fallbackDescription = `${siteName} - Explora itinerarios, hoteles y experiencias con soporte local.`;

  if (!website) {
    return {
      title: "Sitio no encontrado",
      description: fallbackDescription,
    };
  }

  // Canonical base URL: prefer custom_domain when available
  const baseUrl = website.custom_domain
    ? `https://${website.custom_domain}`
    : `https://${subdomain}.bukeer.com`;

  // Handle different page types based on slug
  const slugPath = slug.join("/");
  const localeContext = await resolvePublicMetadataLocale(
    website,
    slugPath ? `/${slugPath}` : "/",
  );
  const metadataSlug =
    localeContext.languageSegment && slug[0]?.toLowerCase() === localeContext.languageSegment
      ? slug.slice(1)
      : slug;
  const ogLocale = localeToOgLocale(localeContext.resolvedLocale);
  const translatedLocalesCache = new Map<string, string[] | undefined>();

  const buildAlternatesLanguages = async (
    pathname: string,
    pageRef?: { pageType: TranscreatePageType; pageId: string | null },
  ): Promise<Record<string, string>> => {
    if (!pageRef?.pageId) {
      return buildLocaleAwareAlternateLanguages(
        baseUrl,
        pathname,
        localeContext,
      );
    }

    const cacheKey = `${pageRef.pageType}:${pageRef.pageId}`;
    if (!translatedLocalesCache.has(cacheKey)) {
      const translatedLocales = await loadTranslatedLocalesForPage({
        websiteId: website.id,
        pageType: pageRef.pageType,
        pageId: pageRef.pageId,
        defaultLocale: localeContext.defaultLocale,
      });
      translatedLocalesCache.set(cacheKey, translatedLocales);
    }

    const translatedLocales = translatedLocalesCache.get(cacheKey);
    return buildLocaleAwareAlternateLanguages(
      baseUrl,
      pathname,
      localeContext,
      translatedLocales ? { translatedLocales } : undefined,
    );
  };

  // Activities listing (/actividades or /activities)
  if (
    metadataSlug.length === 1 &&
    (metadataSlug[0] === "actividades" || metadataSlug[0] === "activities")
  ) {
    const siteName =
      website.content?.account?.name || website.content?.siteName || subdomain;
    const pathname = "/actividades";
    const listingMeta = await resolveListingPageMeta(subdomain, [
      "actividades",
      "activities",
    ]);
    const ogImage = resolveOgImage(website);
    const messages = getPublicUiMessages(localeContext.resolvedLocale);
    const pageTitle = messages.nav.experiences;
    const pageDescriptionByLanguage: Record<string, string> = {
      en: `Discover all activities and experiences available with ${siteName}.`,
      fr: `Découvrez toutes les activités et expériences disponibles avec ${siteName}.`,
      pt: `Descubra todas as atividades e experiências disponíveis com ${siteName}.`,
      de: `Entdecken Sie alle Aktivitäten und Erlebnisse mit ${siteName}.`,
      es: `Descubre todas las actividades y experiencias disponibles con ${siteName}.`,
    };
    const pageDescription =
      pageDescriptionByLanguage[localeContext.resolvedLanguage] ??
      pageDescriptionByLanguage.es;
    const metadata: Metadata = {
      title: pageTitle,
      description: pageDescription,
      openGraph: {
        title: `${pageTitle} | ${siteName}`,
        description: pageDescription,
        type: "website",
        locale: ogLocale,
        ...(ogImage && { images: [{ url: ogImage }] }),
      },
      twitter: {
        card: "summary_large_image",
        title: `${pageTitle} | ${siteName}`,
        description: pageDescription,
        ...(ogImage && { images: [ogImage] }),
      },
      alternates: {
        canonical: buildCanonicalUrl(baseUrl, pathname, localeContext),
        languages: await buildAlternatesLanguages(pathname, {
          pageType: "page",
          pageId: listingMeta.pageId,
        }),
      },
    };

    if (listingMeta.robotsNoindex) {
      metadata.robots = { index: false, follow: true };
    }

    return metadata;
  }

  // Hotels listing (/hoteles or /hotels)
  if (metadataSlug.length === 1 && (metadataSlug[0] === "hoteles" || metadataSlug[0] === "hotels")) {
    const siteName =
      website.content?.account?.name || website.content?.siteName || subdomain;
    const pathname = "/hoteles";
    const listingMeta = await resolveListingPageMeta(subdomain, [
      "hoteles",
      "hotels",
    ]);
    const ogImage = resolveOgImage(website);
    const messages = getPublicUiMessages(localeContext.resolvedLocale);
    const editorialText = getPublicUiExtraTextGetter(
      localeContext.resolvedLocale,
    );
    const pageTitle = messages.nav.hotels;
    const pageDescription = toPlainMetadataText(
      editorialText("editorialHotelsSubtitle"),
    );
    const metadata: Metadata = {
      title: pageTitle,
      description: pageDescription,
      openGraph: {
        title: `${pageTitle} | ${siteName}`,
        description: pageDescription,
        type: "website",
        locale: ogLocale,
        ...(ogImage && { images: [{ url: ogImage }] }),
      },
      twitter: {
        card: "summary_large_image",
        title: `${pageTitle} | ${siteName}`,
        description: pageDescription,
        ...(ogImage && { images: [ogImage] }),
      },
      alternates: {
        canonical: buildCanonicalUrl(baseUrl, pathname, localeContext),
        languages: await buildAlternatesLanguages(pathname, {
          pageType: "page",
          pageId: listingMeta.pageId,
        }),
      },
    };

    if (listingMeta.robotsNoindex) {
      metadata.robots = { index: false, follow: true };
    }

    return metadata;
  }

  // Transfers listing (/traslados or /transfers)
  if (
    metadataSlug.length === 1 &&
    (metadataSlug[0] === "traslados" || metadataSlug[0] === "transfers")
  ) {
    const siteName =
      website.content?.account?.name || website.content?.siteName || subdomain;
    const pathname = "/traslados";
    const listingMeta = await resolveListingPageMeta(subdomain, [
      "traslados",
      "transfers",
    ]);
    const ogImage = resolveOgImage(website);
    const metadata: Metadata = {
      title: "Traslados",
      description: `Reserva traslados privados y compartidos con ${siteName}.`,
      openGraph: {
        title: `Traslados | ${siteName}`,
        description: `Reserva traslados privados y compartidos con ${siteName}.`,
        type: "website",
        locale: ogLocale,
        ...(ogImage && { images: [{ url: ogImage }] }),
      },
      twitter: {
        card: "summary_large_image",
        title: `Traslados | ${siteName}`,
        description: `Reserva traslados privados y compartidos con ${siteName}.`,
        ...(ogImage && { images: [ogImage] }),
      },
      alternates: {
        canonical: buildCanonicalUrl(baseUrl, pathname, localeContext),
        languages: await buildAlternatesLanguages(pathname, {
          pageType: "page",
          pageId: listingMeta.pageId,
        }),
      },
    };

    if (listingMeta.robotsNoindex) {
      metadata.robots = { index: false, follow: true };
    }

    return metadata;
  }

  // Packages listing (/paquetes or /packages)
  if (metadataSlug.length === 1 && (metadataSlug[0] === "paquetes" || metadataSlug[0] === "packages")) {
    const siteName =
      website.content?.account?.name || website.content?.siteName || subdomain;
    const pathname = "/paquetes";
    const listingMeta = await resolveListingPageMeta(subdomain, [
      "paquetes",
      "packages",
    ]);
    const ogImage = resolveOgImage(website);
    const editorialText = getPublicUiExtraTextGetter(
      localeContext.resolvedLocale,
    );
    const pageTitle = toPlainMetadataText(
      editorialText("editorialPackagesTitleFallback"),
    );
    const pageDescription = toPlainMetadataText(
      editorialText("editorialPackagesSubtitleFallback"),
    );
    const metadata: Metadata = {
      title: pageTitle,
      description: pageDescription,
      openGraph: {
        title: `${pageTitle} | ${siteName}`,
        description: pageDescription,
        type: "website",
        locale: ogLocale,
        ...(ogImage && { images: [{ url: ogImage }] }),
      },
      twitter: {
        card: "summary_large_image",
        title: `${pageTitle} | ${siteName}`,
        description: pageDescription,
        ...(ogImage && { images: [ogImage] }),
      },
      alternates: {
        canonical: buildCanonicalUrl(baseUrl, pathname, localeContext),
        languages: await buildAlternatesLanguages(pathname, {
          pageType: "page",
          pageId: listingMeta.pageId,
        }),
      },
    };

    if (listingMeta.robotsNoindex) {
      metadata.robots = { index: false, follow: true };
    }

    return metadata;
  }

  // Destination listing (/destinos or /destinations)
  if (
    metadataSlug.length === 1 &&
    (metadataSlug[0] === "destinos" || metadataSlug[0] === "destinations")
  ) {
    const siteName =
      website.content?.account?.name || website.content?.siteName || subdomain;
    const pathname = "/destinos";
    const listingMeta = await resolveListingPageMeta(subdomain, [
      "destinos",
      "destinations",
    ]);
    const ogImage = resolveOgImage(website);
    const editorialText = getPublicUiExtraTextGetter(
      localeContext.resolvedLocale,
    );
    const pageTitle = editorialText("editorialDestinoBreadcrumbDestinos");
    const pageDescription = toPlainMetadataText(
      editorialText("editorialDestinosListSubtitle"),
    );
    const metadata: Metadata = {
      title: pageTitle,
      description: pageDescription,
      openGraph: {
        title: `${pageTitle} | ${siteName}`,
        description: pageDescription,
        type: "website",
        locale: ogLocale,
        ...(ogImage && { images: [{ url: ogImage }] }),
      },
      twitter: {
        card: "summary_large_image",
        title: `${pageTitle} | ${siteName}`,
        description: pageDescription,
        ...(ogImage && { images: [ogImage] }),
      },
      alternates: {
        canonical: buildCanonicalUrl(baseUrl, pathname, localeContext),
        languages: await buildAlternatesLanguages(pathname, {
          pageType: "page",
          pageId: listingMeta.pageId,
        }),
      },
    };

    if (listingMeta.robotsNoindex) {
      metadata.robots = { index: false, follow: true };
    }

    return metadata;
  }

  // Destination detail (/destinos/[slug])
  if (
    metadataSlug.length === 2 &&
    (metadataSlug[0] === "destinos" || metadataSlug[0] === "destinations")
  ) {
    const destinations = await getDestinations(subdomain);
    const dest = destinations.find((d) => d.slug === metadataSlug[1]);
    if (dest) {
      const siteName =
        website.content?.account?.name ||
        website.content?.siteName ||
        subdomain;
      const override = await getDestinationSeoOverride(website.id, dest.slug);
      const title = normalizePublicMetadataTitle(
        override?.custom_seo_title || dest.name,
        siteName,
      );
      const description =
        override?.custom_seo_description ||
        `Explora ${dest.name}: ${dest.hotel_count} hoteles y ${dest.activity_count} actividades. Reserva con ${siteName}.`;
      const pathname = `/destinos/${dest.slug}`;
      const metadata: Metadata = {
        title,
        description,
        openGraph: {
          title,
          description,
          type: "website",
          locale: ogLocale,
          ...(resolveOgImage(website, dest.image) && {
            images: [{ url: resolveOgImage(website, dest.image)! }],
          }),
        },
        twitter: {
          card: "summary_large_image",
          title,
          description,
          ...(resolveOgImage(website, dest.image) && {
            images: [resolveOgImage(website, dest.image)!],
          }),
        },
        alternates: {
          canonical: buildCanonicalUrl(baseUrl, pathname, localeContext),
          languages: await buildAlternatesLanguages(pathname, {
            pageType: "destination",
            pageId: typeof dest.id === "string" ? dest.id : null,
          }),
        },
      };

      if (override?.robots_noindex) {
        metadata.robots = { index: false, follow: true };
      }

      return metadata;
    }
  }

  // Check if this is a product page (has 2+ segments like /hoteles/hotel-name)
  if (metadataSlug.length >= 2) {
    const categorySlug = metadataSlug[0];
    const productSlug = metadataSlug.slice(1).join("/");
    const productType = getCategoryProductType(categorySlug);

    if (productType) {
      const productPage = await getProductPage(
        subdomain,
        productType,
        productSlug,
        {
          locale: localeContext.resolvedLocale,
        },
      );
      if (productPage?.product) {
        // Bug 9 (Stage 6 2026-04-20): locale-aware overlay for /en/<seg>/<slug>
        // — see note in `app/site/[subdomain]/paquetes/[slug]/page.tsx`.
        let localizedOverlayTitle: string | null = null;
        let localizedOverlayDescription: string | null = null;
        let localizedOverlayNoindex: boolean | null = null;
        if (
          localeContext.resolvedLocale &&
          localeContext.resolvedLocale !== localeContext.defaultLocale &&
          website.id &&
          typeof productPage.product.id === "string"
        ) {
          const overlay = await getLocalizedProductOverlay({
            websiteId: String(website.id),
            productType,
            productId: String(productPage.product.id),
            locale: localeContext.resolvedLocale,
          });
          if (overlay) {
            localizedOverlayTitle = overlay.custom_seo_title ?? null;
            localizedOverlayDescription =
              overlay.custom_seo_description ?? null;
            localizedOverlayNoindex = overlay.robots_noindex ?? null;
          }
        }
        const title = normalizePublicMetadataTitle(
          sanitizeProductCopy(
            localizedOverlayTitle ||
              productPage.page?.custom_seo_title ||
              productPage.product.name,
          ) || productPage.product.name,
          siteName,
        );
        const rawDescription = sanitizeProductCopy(
          localizedOverlayDescription ||
            productPage.page?.custom_seo_description ||
            productPage.product.description ||
            "",
        );
        const locationHint = sanitizeProductCopy(
          productPage.product.location ||
            productPage.product.city ||
            productPage.product.country ||
            "",
        );
        const fallbackDescription = sanitizeProductCopy(
          `Reserva ${productPage.product.name}${locationHint ? ` en ${locationHint}` : ""} con soporte local, actividades y opciones flexibles.`,
        );
        const description = (rawDescription || fallbackDescription).slice(
          0,
          160,
        );
        const pathname = `/${metadataSlug.join("/")}`;

        const metadata: Metadata = {
          title,
          description,
          openGraph: {
            title,
            description,
            type: "website",
            locale: ogLocale,
            ...(resolveOgImage(
              website,
              productPage.product.social_image || productPage.product.image,
            ) && {
              images: [
                {
                  url: resolveOgImage(
                    website,
                    productPage.product.social_image ||
                      productPage.product.image,
                  )!,
                },
              ],
            }),
          },
          twitter: {
            card: "summary_large_image",
            title,
            description,
            ...(resolveOgImage(
              website,
              productPage.product.social_image || productPage.product.image,
            ) && {
              images: [
                resolveOgImage(
                  website,
                  productPage.product.social_image || productPage.product.image,
                )!,
              ],
            }),
          },
          alternates: {
            canonical: buildCanonicalUrl(baseUrl, pathname, localeContext),
            languages: await buildAlternatesLanguages(pathname, {
              pageType: productType as TranscreatePageType,
              pageId:
                typeof productPage.product.id === "string"
                  ? productPage.product.id
                  : null,
            }),
          },
        };

        const effectiveNoindex =
          localizedOverlayNoindex !== null
            ? localizedOverlayNoindex
            : productPage.page?.robots_noindex;
        if (effectiveNoindex) {
          metadata.robots = { index: false, follow: true };
        }

        return metadata;
      }
    }
  }

  // Check for regular page (category, static, or custom). Locale-aware page
  // resolution is required for custom-domain middleware rewrites: the internal
  // route receives `/site/<subdomain>/contact` while request headers carry
  // `pt-BR`/`fr-FR`/`de-DE`. Reconstruct the public localized path so same-slug
  // translated `website_pages` rows and localized system fallbacks win over the
  // default Spanish row.
  const resolvedPageRoute = await resolvePublicPageForRoute({
    website,
    publicSlugPath: localeContext.localizedPathname.replace(/^\//, "") || slugPath,
    loadPageBySlug: getPageBySlug,
    loadPageBySlugForLocale: getPageBySlugForLocale,
    loadPageByTranslationGroup: getPageByTranslationGroup,
  });
  const localizedSystemFallback =
    localeContext.resolvedLocale !== localeContext.defaultLocale
      ? getSystemFallbackPage(
          resolvedPageRoute.slugPath,
          website,
          localeContext.resolvedLocale,
        )
      : null;
  const page = localizedSystemFallback ?? resolvedPageRoute.page;

  if (!page) {
    // Homepage fallback: use website SEO metadata from layout
    if (slugPath === "") {
      const { content } = website;
      const siteName = content?.account?.name || content?.siteName;
      const description =
        content?.seo?.description ||
        content?.tagline ||
        `${siteName || subdomain} - Tu agencia de viajes de confianza`;
      const ogImage = resolveOgImage(website);
      return {
        title: content?.seo?.title || siteName,
        description,
        openGraph: {
          title: content?.seo?.title || siteName,
          description,
          type: "website",
          locale: ogLocale,
          ...(ogImage && { images: [{ url: ogImage }] }),
        },
        twitter: {
          card: "summary_large_image",
          title: content?.seo?.title || siteName || undefined,
          description,
          ...(ogImage && { images: [ogImage] }),
        },
        alternates: {
          canonical: buildCanonicalUrl(baseUrl, "/", localeContext),
          languages: await buildAlternatesLanguages("/"),
        },
      };
    }
    return {
      title: "Página no encontrada",
      description: fallbackDescription,
      robots: { index: false, follow: true },
    };
  }

  const title = normalizePublicMetadataTitle(
    page.seo_title || page.title,
    siteName,
  );
  const description = page.seo_description || "";
  const canonicalUrl = buildCanonicalUrl(
    baseUrl,
    `/${resolvedPageRoute.slugPath}`,
    localeContext,
  );

  // Prefer the page's own hero section backgroundImage as OG image.
  // This also causes Next.js to emit <link rel="preload"> for the LCP image in <head>,
  // fixing 5+ second Load Delay caused by the preload being discovered late in RSC payload.
  const pageHeroSection = page.sections?.find((s) => {
    const raw = s as unknown as Record<string, unknown>;
    const t =
      s.type ||
      (raw.sectionType as string) ||
      (raw.section_type as string) ||
      "";
    return t.startsWith("hero");
  });
  const pageHeroImage =
    ((pageHeroSection?.content as Record<string, unknown> | undefined)
      ?.backgroundImage as string | undefined) ||
    (page.hero_config?.backgroundImage as string | undefined);

  const ogImage = resolveOgImage(website, pageHeroImage || null);
  const metadata: Metadata = {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      locale: ogLocale,
      ...(ogImage && { images: [{ url: ogImage }] }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(ogImage && { images: [ogImage] }),
    },
    alternates: {
      canonical: canonicalUrl,
      languages: await buildAlternatesLanguages(`/${slugPath}`, {
        pageType: "page",
        pageId: typeof page.id === "string" ? page.id : null,
      }),
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

  if (!website || website.status !== "published") {
    notFound();
  }

  const slugPath = slug.join("/");
  const localeContext = await resolvePublicMetadataLocale(
    website,
    slugPath ? `/${slugPath}` : "/",
  );
  const routeSlug =
    localeContext.languageSegment && slug[0]?.toLowerCase() === localeContext.languageSegment
      ? slug.slice(1)
      : slug;
  const resolvedLocale = localeContext.resolvedLocale;
  const defaultLocale = localeContext.defaultLocale ?? "es-CO";
  const isCustomDomain = inferIsCustomDomainWebsite(website);

  const translatedSections = applyContentTranslations(
    website.sections || [],
    resolvedLocale,
    defaultLocale,
  );
  const websiteForRender = {
    ...website,
    sections: translatedSections,
    resolvedLocale,
    defaultLocale,
    isCustomDomain,
  } as WebsiteData & { resolvedLocale?: string };

  // Handle activities listing (/actividades)
  if (
    routeSlug.length === 1 &&
    (routeSlug[0] === "actividades" || routeSlug[0] === "activities")
  ) {
    const { items: activityProducts } = await getCategoryProducts(
      subdomain,
      "activities",
      {
        limit: 100,
        offset: 0,
        locale: resolvedLocale,
        defaultLocale,
        websiteId: String(website.id),
      },
    );
    const activitiesBody = (
      <ActivitiesListingPage
        website={websiteForRender}
        activities={activityProducts}
      />
    );
    const activitiesPayload = {
      subdomain,
      locale: resolvedLocale,
      activities: activityProducts,
    };
    return (
      <TemplateSlot
        name="experiences-page"
        website={websiteForRender}
        payload={activitiesPayload}
      >
        {activitiesBody}
      </TemplateSlot>
    );
  }

  // Handle packages listing (/paquetes) — editorial-v1 overlay (Wave 4)
  // wraps the generic `PackagesListingPage` via TemplateSlot. Non-editorial
  // tenants keep the existing generic body unchanged.
  if (routeSlug.length === 1 && (routeSlug[0] === "paquetes" || routeSlug[0] === "packages")) {
    const { items: packageProducts } = await getCategoryProducts(
      subdomain,
      "packages",
      {
        limit: 100,
        offset: 0,
        locale: resolvedLocale,
        defaultLocale,
        websiteId: String(website.id),
      },
    );
    const paquetesListBody = (
      <PackagesListingPage
        website={websiteForRender}
        packages={packageProducts}
      />
    );
    const paquetesListPayload: EditorialPaquetesListPagePayload = {
      packages: packageProducts,
    };
    const siteName =
      website.content?.account?.name || website.content?.siteName || subdomain;
    const baseUrl = website.custom_domain
      ? `https://${website.custom_domain}`
      : `https://${subdomain}.bukeer.com`;
    const schemaLanguage = localeToLanguage(
      normalizeLocale(resolvedLocale, "es-CO"),
    );
    const isEnglishSchema = schemaLanguage === "en";
    const packagesSegment = isEnglishSchema ? "packages" : "paquetes";
    const packagesLabel = isEnglishSchema ? "Packages" : "Paquetes";
    const homeLabel = isEnglishSchema ? "Home" : "Inicio";
    const paquetesSchemas = [
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        inLanguage: normalizeLocale(resolvedLocale, "es-CO"),
        name: `${packagesLabel} | ${siteName}`,
        description: isEnglishSchema
          ? `Discover curated travel packages by ${siteName}.`
          : `Descubre paquetes de viaje curados por ${siteName}.`,
        url: `${baseUrl}/${packagesSegment}`,
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: packageProducts.length,
          itemListElement: packageProducts
            .slice(0, 20)
            .map((product, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: product.name,
              url: product.slug
                ? `${baseUrl}/${packagesSegment}/${product.slug}`
                : undefined,
            })),
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        inLanguage: normalizeLocale(resolvedLocale, "es-CO"),
        itemListElement: [
          { "@type": "ListItem", position: 1, name: homeLabel, item: baseUrl },
          { "@type": "ListItem", position: 2, name: packagesLabel },
        ],
      },
      {
        "@context": "https://schema.org",
        "@type": "TravelAgency",
        name: siteName,
        url: baseUrl,
        inLanguage: normalizeLocale(resolvedLocale, "es-CO"),
      },
    ];
    return (
      <>
        {paquetesSchemas.map((schema, index) => (
          <script
            key={index}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          />
        ))}
        <TemplateSlot
          name="paquetes-list"
          website={websiteForRender}
          payload={paquetesListPayload}
        >
          {paquetesListBody}
        </TemplateSlot>
      </>
    );
  }

  // Handle hotels listing (/hoteles) — new route. Added here following the
  // `/paquetes` + `/destinos` pattern because no dedicated `HotelsListingPage`
  // exists in `components/pages/`. Editorial tenants get the overlay via the
  // TemplateSlot; non-editorial tenants currently fall through to the
  // generic packages-listing shell (shared filtering/grid) as a placeholder
  // until a dedicated hotels-listing generic body is built.
  if (routeSlug.length === 1 && (routeSlug[0] === "hoteles" || routeSlug[0] === "hotels")) {
    const { items: hotelProducts } = await getCategoryProducts(
      subdomain,
      "hotels",
      {
        limit: 100,
        offset: 0,
        locale: resolvedLocale,
        defaultLocale,
        websiteId: String(website.id),
      },
    );
    const hotelesListBody = (
      <PackagesListingPage
        website={websiteForRender}
        packages={hotelProducts}
      />
    );
    const hotelesListPayload: EditorialHotelesListPagePayload = {
      hotels: hotelProducts,
    };
    return (
      <TemplateSlot
        name="hoteles-list"
        website={websiteForRender}
        payload={hotelesListPayload}
      >
        {hotelesListBody}
      </TemplateSlot>
    );
  }

  // Handle destination listing (/destinos)
  if (
    routeSlug.length === 1 &&
    (routeSlug[0] === "destinos" || routeSlug[0] === "destinations")
  ) {
    const destinations = await getDestinations(subdomain);
    const destinosListBody = (
      <DestinationListingPage
        website={websiteForRender}
        destinations={destinations}
      />
    );
    const destinosListPayload: EditorialDestinosListPagePayload = {
      destinations,
    };
    return (
      <TemplateSlot
        name="destinos-list"
        website={websiteForRender}
        payload={destinosListPayload}
      >
        {destinosListBody}
      </TemplateSlot>
    );
  }

  // Handle destination detail (/destinos/[slug])
  if (
    routeSlug.length === 2 &&
    (routeSlug[0] === "destinos" || routeSlug[0] === "destinations")
  ) {
    const destinations = await getDestinations(subdomain);
    const dest = destinations.find((d) => d.slug === routeSlug[1]);
    if (dest) {
      const [products, serpData, destReviews, seoOverride] = await Promise.all([
        getDestinationProducts(subdomain, dest.name),
        // Prevent slow external enrichment from blocking destination detail navigation.
        withTimeout(enrichDestinationFromSerpAPI(dest.name), 1200, null),
        website.account_id
          ? getReviewsForContext(
              website.account_id,
              { type: "destination", name: dest.name },
              6,
            )
          : Promise.resolve([]),
        getDestinationSeoOverride(website.id, dest.slug),
      ]);
      // Issue #208: thread resolved request locale into JSON-LD `inLanguage`.
      const destLocaleContext = await resolvePublicMetadataLocale(
        website,
        `/destinos/${dest.slug}`,
      );
      const destinoDetailBody = (
        <DestinationDetailPage
          website={websiteForRender}
          destination={dest}
          products={products}
          serpEnrichment={serpData}
          googleReviews={destReviews}
          resolvedLocale={destLocaleContext.resolvedLocale}
        />
      );
      const whatsappNumber =
        (website as unknown as { social?: { whatsapp?: string | null } }).social
          ?.whatsapp || null;
      const destinoDetailPayload: EditorialDestinoDetailPayload = {
        destination: dest,
        products,
        relatedDestinations: destinations,
        seoOverride,
        whatsapp: whatsappNumber,
      };
      return (
        <TemplateSlot
          name="destino-detail"
          website={websiteForRender}
          payload={destinoDetailPayload}
        >
          {destinoDetailBody}
        </TemplateSlot>
      );
    }
  }

  // Handle product pages (2+ segments like /hoteles/hotel-name)
  if (routeSlug.length >= 2) {
    const categorySlug = routeSlug[0];
    const productSlug = routeSlug.slice(1).join("/");
    const productType = getCategoryProductType(categorySlug);

    if (productType) {
      const productPage = await getProductPage(
        subdomain,
        productType,
        productSlug,
        {
          locale: resolvedLocale,
        },
      );

      if (productPage?.product) {
        // Non-default locale + no overlay → redirect to default locale URL.
        if (
          resolvedLocale !== defaultLocale &&
          website.id &&
          typeof productPage.product.id === "string"
        ) {
          const overlay = await getLocalizedProductOverlay({
            websiteId: String(website.id),
            productType,
            productId: String(productPage.product.id),
            locale: resolvedLocale,
          });
          if (!overlay) {
            redirect(`/site/${subdomain}/${routeSlug.join("/")}`);
          }
        }

        // Fetch relevant Google Reviews using contextual scoring (photo-priority)
        const accountContent = (
          website.content as unknown as Record<string, unknown>
        )?.account as Record<string, unknown> | undefined;
        const googleEnabled = accountContent?.google_reviews_enabled === true;
        const product = productPage.product;
        const productLocation = product.location || product.city || "";
        const reviewContext: ReviewContext =
          productType === "activity"
            ? { type: "activity", name: product.name }
            : productType === "package"
              ? {
                  type: "package",
                  destination: productLocation || product.name,
                }
              : { type: "destination", name: productLocation || product.name };
        const categoryType = getProductCategoryType(productType);
        const [productReviews, similarProductsPayload] = await Promise.all([
          googleEnabled && website.account_id
            ? getReviewsForContext(website.account_id, reviewContext, 3)
            : Promise.resolve([]),
          getCategoryProducts(subdomain, categoryType, { limit: 8, offset: 0 }),
        ]);
        const similarProducts =
          productType === "package"
            ? toSimilarProductSummaries(similarProductsPayload.items)
            : similarProductsPayload.items;

        let activityCircuitStops: ActivityCircuitStop[] = [];
        if (productType === "activity") {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
          const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
          const maptilerKey = process.env.MAPTILER_GEOCODING_KEY ?? "";
          if (supabaseUrl && supabaseServiceRoleKey) {
            try {
              activityCircuitStops = await getActivityCircuitStops(product, {
                deps: { supabaseUrl, supabaseServiceRoleKey, maptilerKey },
              });
            } catch (error) {
              console.warn("[activity-circuit] extraction failed", {
                slug: productSlug,
                error,
              });
            }
          }
        }

        // Issue #208: thread resolved request locale into JSON-LD `inLanguage`.
        const productLocaleContext = await resolvePublicMetadataLocale(
          website,
          `/${routeSlug.join("/")}`,
        );

        // editorial-v1 dispatcher payload: lets the editorial overlay skip
        // data re-fetches by reading product/basePath/display* directly.
        const displayName =
          sanitizeProductCopy(
            productPage.page?.custom_hero?.title || productPage.product.name,
          ) || productPage.product.name;
        const displayLocation =
          sanitizeProductCopy(
            productPage.page?.custom_hero?.subtitle ||
              productPage.product.location ||
              [productPage.product.city, productPage.product.country]
                .filter(Boolean)
                .join(", "),
          ) || null;
        // `/site/[subdomain]` routes must keep the `/site/<subdomain>` prefix
        // even if the tenant has a custom domain configured in DB.
        const basePath = getBasePath(website.subdomain, isCustomDomain);
        let slotName: TemplateSlotName | null = null;
        let editorialPayload:
          | EditorialPackageDetailPayload
          | EditorialActivityDetailPayload
          | EditorialHotelDetailPayload
          | null = null;
        if (productType === "package") {
          const packageFaqs =
            Array.isArray(productPage.page?.custom_faq) &&
            productPage.page.custom_faq.length > 0
              ? productPage.page.custom_faq
              : PACKAGE_FAQS_DEFAULT;
          slotName = "package-detail";
          editorialPayload = {
            product: productPage.product,
            basePath,
            displayName,
            displayLocation,
            resolvedLocale: productLocaleContext.resolvedLocale,
            googleReviews: productReviews,
            similarProducts,
            faqs: packageFaqs,
            package_parity_snapshot: ((
              productPage.product as unknown as Record<string, unknown>
            ).package_parity_snapshot ??
              null) as EditorialPackageDetailPayload["package_parity_snapshot"],
          } satisfies EditorialPackageDetailPayload;
        } else if (productType === "activity") {
          slotName = "activity-detail";
          const activityFaqs =
            Array.isArray(productPage.page?.custom_faq) &&
            productPage.page.custom_faq.length > 0
              ? productPage.page.custom_faq
              : ACTIVITY_FAQS_DEFAULT;
          editorialPayload = {
            product: productPage.product,
            basePath,
            displayName,
            displayLocation,
            resolvedLocale: productLocaleContext.resolvedLocale,
            googleReviews: productReviews,
            similarProducts,
            activityCircuitStops,
            faqs: activityFaqs,
          } satisfies EditorialActivityDetailPayload;
        } else if (productType === "hotel") {
          slotName = "hotel-detail";
          editorialPayload = {
            product: productPage.product,
            basePath,
            displayName,
            displayLocation,
          } satisfies EditorialHotelDetailPayload;
        }

        const activeTemplateSet = resolveTemplateSet(websiteForRender);
        const isEditorialV1 = activeTemplateSet === "editorial-v1";

        const genericBody = (
          <ProductLandingPage
            website={websiteForRender}
            product={productPage.product}
            pageCustomization={productPage.page}
            productType={productType}
            googleReviews={productReviews}
            activityCircuitStops={activityCircuitStops}
            similarProducts={similarProducts}
            resolvedLocale={productLocaleContext.resolvedLocale}
            editorialMode={isEditorialV1 && productType === "activity"}
          />
        );

        if (slotName && editorialPayload) {
          return (
            <TemplateSlot
              name={slotName}
              website={websiteForRender}
              payload={editorialPayload}
            >
              {genericBody}
            </TemplateSlot>
          );
        }
        return genericBody;
      }
    }
  }

  // Handle regular pages with the same locale-aware resolver used by metadata.
  const resolvedPageRoute = await resolvePublicPageForRoute({
    website,
    publicSlugPath: localeContext.localizedPathname.replace(/^\//, "") || slugPath,
    loadPageBySlug: getPageBySlug,
    loadPageBySlugForLocale: getPageBySlugForLocale,
    loadPageByTranslationGroup: getPageByTranslationGroup,
  });
  const localizedSystemFallback =
    resolvedLocale !== defaultLocale
      ? getSystemFallbackPage(resolvedPageRoute.slugPath, website, resolvedLocale)
      : null;
  const page = localizedSystemFallback ?? resolvedPageRoute.page;

  if (!page || !page.is_published) {
    notFound();
  }

  // Non-default locale + page has a translation → redirect to translated slug.
  if (
    resolvedLocale !== defaultLocale &&
    page.translation_group_id &&
    website.id
  ) {
    const localizedPage = await getPageByTranslationGroup(
      website.id,
      page.translation_group_id,
      resolvedLocale,
    );
    if (localizedPage && localizedPage.slug !== page.slug) {
      redirect(`/site/${subdomain}/${localizedPage.slug}`);
    }
  }

  // Render based on page type
  switch (page.page_type) {
    case "category":
      return (
        <CategoryPage
          website={websiteForRender}
          page={page}
          categoryType={page.category_type}
        />
      );

    case "static":
    case "custom": {
      const dynamicDestinations = await getDestinations(subdomain);
      return (
        <StaticPage
          website={websiteForRender}
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
    destinos: "destination",
    destinations: "destination",
    hoteles: "hotel",
    hotels: "hotel",
    actividades: "activity",
    activities: "activity",
    traslados: "transfer",
    transfers: "transfer",
    paquetes: "package",
    packages: "package",
  };

  return mapping[categorySlug.toLowerCase()] || null;
}

function getProductCategoryType(productType: string): string {
  const mapping: Record<string, string> = {
    destination: "destinations",
    hotel: "hotels",
    activity: "activities",
    transfer: "transfers",
    package: "packages",
  };

  return mapping[productType] || "activities";
}

// Revalidate every 5 minutes
export const revalidate = 300;
