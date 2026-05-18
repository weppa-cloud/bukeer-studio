import { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SectionRenderer } from "@/components/site/section-renderer";
import { JsonLd, generateHomepageSchemas } from "@/lib/schema";
import {
  buildLocaleAwareAlternateLanguages,
  resolvePublicMetadataLocale,
} from "@/lib/seo/public-metadata";
import { localeToOgLocale } from "@/lib/seo/locale-routing";
import { resolveOgImage } from "@/lib/seo/og-helpers";
import {
  getWebsiteBySubdomain,
  getBlogPosts,
} from "@/lib/supabase/get-website";
import type { WebsiteSection } from "@/lib/supabase/get-website";
import {
  getCachedGoogleReviews,
  getCategoryProducts,
  getDestinations,
} from "@/lib/supabase/get-pages";
import { getPlanners } from "@/lib/supabase/get-planners";
import type { PlannerData } from "@/lib/supabase/get-planners";
import { getBrandClaims } from "@/lib/supabase/get-brand-claims";
import { getFeaturedDestinations } from "@/lib/supabase/get-featured-destinations";
import { SECTION_TYPES } from "@bukeer/website-contract";
import { hydrateSections } from "@/lib/sections/hydrate-sections";
import {
  toPackageItems,
  toActivityItems,
  toHotelItems,
} from "@/lib/products/to-items";
import { resolveTemplateSet } from "@/lib/sections/template-set";
import {
  buildHomeSectionPlan,
  createHomeRenderWebsite,
  resolveHomeEnabledSections,
  type DeferredHomeDataInput,
} from "@/lib/site/home-rendering";
import { inferIsCustomDomainWebsite } from "@/lib/utils/base-path";

const SECTION_PACKAGES = SECTION_TYPES.find((t) => t === "packages")!;
const SECTION_ACTIVITIES = SECTION_TYPES.find((t) => t === "activities")!;
const SECTION_HOTELS = SECTION_TYPES.find((t) => t === "hotels")!;
const SECTION_BLOG = SECTION_TYPES.find((t) => t === "blog")!;
const PUBLIC_HOME_TIMING_HEADER = "x-bukeer-debug-timing";

// ISR: Revalidate every 5 minutes for fresh content with edge caching
export const revalidate = 300;

interface SitePageProps {
  params: Promise<{ subdomain: string }>;
}

const PLANNER_TYPES = new Set(["planners", "team", "travel_planners"]);

interface PublicHomeTimingProbe {
  enabled: boolean;
  subdomain: string;
  startedAt: number;
  marks: Array<{ label: string; durationMs: number }>;
}

type DeferredHomeSectionsProps = DeferredHomeDataInput & {
  timing?: PublicHomeTimingProbe;
};

function nowMs(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function createPublicHomeTimingProbe(
  requestHeaders: Headers,
  subdomain: string,
): PublicHomeTimingProbe {
  const enabled =
    requestHeaders.get(PUBLIC_HOME_TIMING_HEADER) === "1" ||
    process.env.PUBLIC_SITE_TIMING_LOGS === "true";

  return {
    enabled,
    subdomain,
    startedAt: nowMs(),
    marks: [],
  };
}

async function timedPublicHome<T>(
  timing: PublicHomeTimingProbe | undefined,
  label: string,
  work: () => Promise<T>,
): Promise<T> {
  if (!timing?.enabled) return work();

  const startedAt = nowMs();
  try {
    return await work();
  } finally {
    timing.marks.push({
      label,
      durationMs: Math.round((nowMs() - startedAt) * 10) / 10,
    });
  }
}

function markPublicHome(
  timing: PublicHomeTimingProbe | undefined,
  label: string,
  startedAt: number,
) {
  if (!timing?.enabled) return;
  timing.marks.push({
    label,
    durationMs: Math.round((nowMs() - startedAt) * 10) / 10,
  });
}

function logPublicHomeTiming(
  timing: PublicHomeTimingProbe | undefined,
  phase: "critical" | "deferred",
  details: Record<string, unknown>,
) {
  if (!timing?.enabled) return;

  console.info(
    "[public_home_timing]",
    JSON.stringify({
      subdomain: timing.subdomain,
      phase,
      totalMs: Math.round((nowMs() - timing.startedAt) * 10) / 10,
      marks: timing.marks,
      ...details,
    }),
  );
}

function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getLocalizedHomeMetadataCopy(
  language: string,
  siteName: string,
): { title: string; description: string } | null {
  switch (language) {
    case "en":
      return {
        title: `${siteName} | Tailor-made Colombia tours`,
        description:
          "Plan tailor-made Colombia trips with local experts, curated hotels, experiences and on-trip support.",
      };
    case "pt":
      return {
        title: `${siteName} | Viagens personalizadas pela Colombia`,
        description:
          "Planeje viagens personalizadas pela Colombia com especialistas locais, hoteis selecionados, experiencias e suporte durante a viagem.",
      };
    case "fr":
      return {
        title: `${siteName} | Voyages sur mesure en Colombie`,
        description:
          "Planifiez des voyages sur mesure en Colombie avec des experts locaux, des hotels selectionnes, des experiences et une assistance pendant le voyage.",
      };
    case "de":
      return {
        title: `${siteName} | Massgeschneiderte Kolumbienreisen`,
        description:
          "Planen Sie massgeschneiderte Kolumbienreisen mit lokalen Experten, kuratierten Hotels, Erlebnissen und Betreuung wahrend der Reise.",
      };
    default:
      return null;
  }
}

function featuredDestinationsAsSectionItems(
  featuredDestinations: Awaited<ReturnType<typeof getFeaturedDestinations>>,
) {
  return featuredDestinations.map((destination, index) => ({
    id: destination.slug || `featured-destination-${index}`,
    name: destination.headline || titleFromSlug(destination.slug),
    slug: destination.slug,
    imageUrl: destination.heroImageUrl,
    packagesCount: null,
    activitiesCount: null,
  }));
}

function contentHasArray(section: WebsiteSection, key: string): boolean {
  const content = section.content as Record<string, unknown> | null | undefined;
  const value = content?.[key];
  return Array.isArray(value) && value.length > 0;
}

export async function generateMetadata({
  params,
}: SitePageProps): Promise<Metadata> {
  const { subdomain } = await params;
  const website = await getWebsiteBySubdomain(subdomain);
  if (!website) return { title: "Sitio no encontrado" };

  const baseUrl = website.custom_domain
    ? `https://${website.custom_domain}`
    : `https://${subdomain}.bukeer.com`;
  const localeContext = await resolvePublicMetadataLocale(website, "/");
  const languages = buildLocaleAwareAlternateLanguages(
    baseUrl,
    "/",
    localeContext,
  );
  const canonical =
    localeContext.localizedPathname === "/"
      ? baseUrl
      : `${baseUrl}${localeContext.localizedPathname}`;

  const siteName =
    website.content?.account?.name || website.content?.siteName || subdomain;
  const localizedHomeMetadata =
    localeContext.resolvedLocale !== localeContext.defaultLocale
      ? getLocalizedHomeMetadataCopy(localeContext.resolvedLanguage, siteName)
      : null;
  const title =
    localizedHomeMetadata?.title ||
    website.content.seo?.title ||
    website.content.siteName ||
    subdomain;
  const description =
    localizedHomeMetadata?.description ||
    website.content.seo?.description ||
    website.content.tagline ||
    "";
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
      type: "website",
      ...(ogImage && { images: [{ url: ogImage }] }),
    },
    twitter: {
      card: "summary_large_image",
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
  templateSet,
  timing,
}: DeferredHomeSectionsProps) {
  const accountContent = (website.content as unknown as Record<string, unknown>)
    ?.account as Record<string, unknown> | undefined;
  const googleReviewsEnabled = accountContent?.google_reviews_enabled === true;
  const hasPlannersSection = enabledSections.some((s) =>
    PLANNER_TYPES.has(s.section_type),
  );
  const hasBlogSection = enabledSections.some(
    (s) => s.section_type === SECTION_BLOG,
  );
  const hasDestinationsSection = enabledSections.some(
    (s) => s.section_type === "destinations",
  );
  const hasPackagesSection = enabledSections.some(
    (s) => s.section_type === SECTION_PACKAGES,
  );
  const hasActivitiesSection = enabledSections.some(
    (s) => s.section_type === SECTION_ACTIVITIES,
  );
  const hasHotelsSection = enabledSections.some(
    (s) => s.section_type === SECTION_HOTELS,
  );
  const accountId = website.account_id;
  const websiteId = website.id;

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
    googleReviewsEnabled && accountId
      ? timedPublicHome(timing, "deferred.google_reviews", () =>
          getCachedGoogleReviews(accountId),
        )
      : Promise.resolve(null),
    hasDestinationsSection
      ? timedPublicHome(timing, "deferred.destinations", () =>
          getDestinations(subdomain),
        )
      : Promise.resolve([]),
    hasPackagesSection
      ? timedPublicHome(timing, "deferred.packages", () =>
          getCategoryProducts(subdomain, SECTION_PACKAGES, { limit: 8, locale }),
        )
      : Promise.resolve({ items: [], total: 0 }),
    hasActivitiesSection
      ? timedPublicHome(timing, "deferred.activities", () =>
          getCategoryProducts(subdomain, SECTION_ACTIVITIES, {
            limit: 8,
            locale,
          }),
        )
      : Promise.resolve({ items: [], total: 0 }),
    hasHotelsSection
      ? timedPublicHome(timing, "deferred.hotels", () =>
          getCategoryProducts(subdomain, SECTION_HOTELS, { limit: 8, locale }),
        )
      : Promise.resolve({ items: [], total: 0 }),
    hasPlannersSection && accountId
      ? timedPublicHome(timing, "deferred.planners", () =>
          getPlanners(accountId, { locale }),
        )
      : Promise.resolve<PlannerData[]>([]),
    hasBlogSection && websiteId
      ? timedPublicHome(timing, "deferred.blog", () =>
          getBlogPosts(websiteId, { limit: 6 }),
        )
      : Promise.resolve({ posts: [], total: 0 }),
    accountId
      ? timedPublicHome(timing, "deferred.brand_claims", () =>
          getBrandClaims(accountId),
        )
      : Promise.resolve(null),
    websiteId
      ? timedPublicHome(timing, "deferred.featured_destinations", () =>
          getFeaturedDestinations(websiteId, 4),
        )
      : Promise.resolve([]),
  ]);

  const curatedDynamicDestinations = dynamicDestinations.filter(
    (d) => d.total > 1,
  );
  const sectionDynamicDestinations = (
    curatedDynamicDestinations.length > 0
      ? curatedDynamicDestinations
      : dynamicDestinations.length > 0
        ? dynamicDestinations
        : featuredDestinationsAsSectionItems(featuredDestinations)
  ).slice(0, 8);

  const packageItems = toPackageItems(packagesCatalog.items);
  const activityItems = toActivityItems(activitiesCatalog.items);
  const hotelItems = toHotelItems(hotelsCatalog.items);

  let googleReviews: Parameters<typeof hydrateSections>[0]["googleReviews"] =
    null;
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
  })
    .filter((section) => {
      if (section.section_type === SECTION_PACKAGES) {
        return packageItems.length > 0 || contentHasArray(section, "packages");
      }
      if (section.section_type === "destinations") {
        return (
          sectionDynamicDestinations.length > 0 ||
          contentHasArray(section, "destinations")
        );
      }
      return true;
    });

  logPublicHomeTiming(timing, "deferred", {
    enabledSections: enabledSections.length,
    renderedSections: hydratedSections.length,
    hasBlogSection,
    hasPackagesSection,
    hasActivitiesSection,
    hasHotelsSection,
  });

  return (
    <>
      {hydratedSections.map((section) => (
        <SectionRenderer
          key={section.id}
          section={section}
          website={websiteForRender}
          dbPlanners={
            PLANNER_TYPES.has(section.section_type) ? dbPlanners : undefined
          }
        />
      ))}
    </>
  );
}

export default async function SitePage({ params }: SitePageProps) {
  const { subdomain } = await params;
  const requestHeaders = await headers();
  const timing = createPublicHomeTimingProbe(requestHeaders, subdomain);
  const website = await timedPublicHome(timing, "critical.website", () =>
    getWebsiteBySubdomain(subdomain),
  );

  if (!website || website.status !== "published") {
    notFound();
  }

  const baseUrl = website.custom_domain
    ? `https://${website.custom_domain}`
    : `https://${subdomain}.bukeer.com`;

  const templateSet = resolveTemplateSet(website);
  const localeContext = await timedPublicHome(timing, "critical.locale", () =>
    resolvePublicMetadataLocale(website, "/"),
  );
  const isCustomDomain = inferIsCustomDomainWebsite(website);
  const websiteForRender = createHomeRenderWebsite({
    website,
    resolvedLocale: localeContext.resolvedLocale,
    defaultLocale: localeContext.defaultLocale,
    isCustomDomain,
  });
  const schemaStartedAt = nowMs();
  const schemas = generateHomepageSchemas(
    website,
    baseUrl,
    undefined,
    localeContext.resolvedLocale,
  );
  markPublicHome(timing, "critical.schemas", schemaStartedAt);
  const enabledStartedAt = nowMs();
  const enabledSections = resolveHomeEnabledSections({
    website,
    templateSet,
    locale: localeContext.resolvedLocale,
    defaultLocale: localeContext.defaultLocale,
  });
  markPublicHome(timing, "critical.enabled_sections", enabledStartedAt);
  const { criticalSections, deferredSections } =
    buildHomeSectionPlan(enabledSections);

  logPublicHomeTiming(timing, "critical", {
    enabledSections: enabledSections.length,
    criticalSections: criticalSections.length,
    deferredSections: deferredSections.length,
    customDomain: Boolean(website.custom_domain),
  });

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
          enabledSections={deferredSections}
          templateSet={templateSet}
          timing={timing}
        />
      </Suspense>
    </>
  );
}
