import { SECTION_TYPES } from "@bukeer/website-contract";
import type { WebsiteData, WebsiteSection } from "@/lib/supabase/get-website";
import { applyContentTranslations } from "@/lib/sections/apply-content-translations";
import { resolveTemplateSet } from "@/lib/sections/template-set";

const SECTION_HERO = SECTION_TYPES.find((t) => t === "hero")!;
const SECTION_DESTINATIONS = SECTION_TYPES.find((t) => t === "destinations")!;
const SECTION_PACKAGES = SECTION_TYPES.find((t) => t === "packages")!;
const SECTION_ACTIVITIES = SECTION_TYPES.find((t) => t === "activities")!;
const SECTION_HOTELS = SECTION_TYPES.find((t) => t === "hotels")!;
const SECTION_TESTIMONIALS = SECTION_TYPES.find((t) => t === "testimonials")!;
const SECTION_STATS = SECTION_TYPES.find((t) => t === "stats")!;
const SECTION_CTA = SECTION_TYPES.find((t) => t === "cta")!;
const SECTION_CONTACT = SECTION_TYPES.find((t) => t === "contact")!;
const SECTION_CONTACT_FORM = SECTION_TYPES.find((t) => t === "contact_form")!;

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

const EDITORIAL_DEFERRED_OMIT_TYPES = new Set<string>([
  SECTION_ACTIVITIES,
  SECTION_HOTELS,
  SECTION_TYPES.find((t) => t === "blog")!,
]);

export interface CriticalHomeData {
  website: WebsiteData;
  locale: string;
  heroSection: WebsiteSection | null;
  baseUrl: string;
  templateSet: string | null;
}

export interface DeferredHomeDataInput {
  website: WebsiteData;
  websiteForRender: WebsiteData;
  subdomain: string;
  locale: string;
  defaultLocale: string;
  enabledSections: WebsiteSection[];
  templateSet: string | null;
}

export interface HomeSectionPlan {
  criticalSections: WebsiteSection[];
  deferredSections: WebsiteSection[];
  enabledSections: WebsiteSection[];
  criticalSectionIds: Set<string>;
}

export type HomeRenderWebsiteData = WebsiteData & {
  resolvedLocale?: string;
  isCustomDomain?: boolean;
  effective_theme?: WebsiteData["theme"];
  effective_theme_source?: string;
};

function toSectionSummary(section: WebsiteSection): WebsiteSection {
  return {
    id: section.id,
    section_type: section.section_type,
    variant: section.variant,
    display_order: section.display_order,
    is_enabled: section.is_enabled,
    config: {},
    content: {},
  };
}

export function createHomeRenderWebsite(input: {
  website: WebsiteData;
  resolvedLocale: string;
  defaultLocale: string;
  isCustomDomain: boolean;
  includeSectionSummaries?: boolean;
}): HomeRenderWebsiteData {
  const {
    website,
    resolvedLocale,
    defaultLocale,
    isCustomDomain,
    includeSectionSummaries = false,
  } = input;
  const content = website.content;
  const account = content.account;

  return {
    id: website.id,
    account_id: website.account_id,
    subdomain: website.subdomain,
    custom_domain: website.custom_domain,
    default_locale: defaultLocale,
    supported_locales: website.supported_locales,
    status: website.status,
    template_id: website.template_id,
    theme: website.theme,
    effective_theme: (website as HomeRenderWebsiteData).effective_theme,
    effective_theme_source: (website as HomeRenderWebsiteData)
      .effective_theme_source,
    analytics: undefined,
    featured_products: {
      destinations: [],
      hotels: [],
      activities: [],
      transfers: [],
      packages: [],
    },
    sections: includeSectionSummaries
      ? (website.sections || []).map(toSectionSummary)
      : [],
    site_parts: website.site_parts,
    content: {
      siteName: content.siteName,
      tagline: content.tagline,
      logo: content.logo,
      logoLight: content.logoLight,
      logoDark: content.logoDark,
      locale: resolvedLocale || content.locale,
      headerCta: content.headerCta,
      seo: {
        title: content.seo?.title ?? content.siteName ?? website.subdomain,
        description: content.seo?.description ?? content.tagline ?? "",
        keywords: content.seo?.keywords ?? "",
      },
      contact: {
        email: content.contact?.email ?? account?.email ?? "",
        phone: content.contact?.phone ?? account?.phone ?? "",
        address: content.contact?.address ?? account?.location ?? "",
      },
      social: {
        facebook: content.social?.facebook,
        instagram: content.social?.instagram,
        twitter: content.social?.twitter,
        youtube: content.social?.youtube,
        linkedin: content.social?.linkedin,
        tiktok: content.social?.tiktok,
        whatsapp: content.social?.whatsapp,
      },
      account: account
        ? {
            name: account.name,
            logo: account.logo,
            email: account.email,
            phone: account.phone,
            phone2: account.phone2,
            website: account.website,
            location: account.location,
            primary_currency: account.primary_currency,
            enabled_currencies: account.enabled_currencies,
            currency: account.currency,
          }
        : undefined,
      market_experience: content.market_experience,
      trust: content.trust,
    },
    resolvedLocale,
    isCustomDomain,
  } as HomeRenderWebsiteData;
}

export function resolveHomeEnabledSections(input: {
  website: WebsiteData;
  locale: string;
  defaultLocale: string;
  templateSet?: string | null;
}): WebsiteSection[] {
  const templateSet = input.templateSet ?? resolveTemplateSet(input.website);
  const seenSingletonTypes = new Set<string>();
  const localeAwareSections = applyContentTranslations(
    input.website.sections || [],
    input.locale,
    input.defaultLocale,
  );

  return localeAwareSections
    .filter(
      (section) =>
        section.section_type !== SECTION_CONTACT &&
        section.section_type !== SECTION_CONTACT_FORM,
    )
    .filter((section) => {
      if (templateSet !== "editorial-v1") return true;
      return !EDITORIAL_DEFERRED_OMIT_TYPES.has(section.section_type);
    })
    .sort((a, b) => a.display_order - b.display_order)
    .filter((section) => {
      if (!SINGLETON_SECTION_TYPES.has(section.section_type)) return true;
      if (seenSingletonTypes.has(section.section_type)) return false;
      seenSingletonTypes.add(section.section_type);
      return true;
    });
}

export function buildHomeSectionPlan(
  enabledSections: WebsiteSection[],
): HomeSectionPlan {
  const heroSection = enabledSections.find(
    (section) => section.section_type === SECTION_HERO,
  );
  const criticalSections = heroSection ? [heroSection] : [];
  const criticalSectionIds = new Set(
    criticalSections
      .map((section) => section.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0),
  );

  return {
    criticalSections,
    deferredSections: enabledSections.filter(
      (section) => !criticalSectionIds.has(section.id),
    ),
    enabledSections,
    criticalSectionIds,
  };
}
