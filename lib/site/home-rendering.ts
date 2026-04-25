import { SECTION_TYPES } from '@bukeer/website-contract';
import type { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';
import { applyContentTranslations } from '@/lib/sections/apply-content-translations';
import { resolveTemplateSet } from '@/lib/sections/template-set';

const SECTION_HERO = SECTION_TYPES.find((t) => t === 'hero')!;
const SECTION_DESTINATIONS = SECTION_TYPES.find((t) => t === 'destinations')!;
const SECTION_PACKAGES = SECTION_TYPES.find((t) => t === 'packages')!;
const SECTION_ACTIVITIES = SECTION_TYPES.find((t) => t === 'activities')!;
const SECTION_HOTELS = SECTION_TYPES.find((t) => t === 'hotels')!;
const SECTION_TESTIMONIALS = SECTION_TYPES.find((t) => t === 'testimonials')!;
const SECTION_STATS = SECTION_TYPES.find((t) => t === 'stats')!;
const SECTION_CTA = SECTION_TYPES.find((t) => t === 'cta')!;
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

const EDITORIAL_DEFERRED_OMIT_TYPES = new Set<string>([
  SECTION_ACTIVITIES,
  SECTION_HOTELS,
  SECTION_TYPES.find((t) => t === 'blog')!,
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
  criticalSectionIds: Set<string>;
  templateSet: string | null;
}

export interface HomeSectionPlan {
  criticalSections: WebsiteSection[];
  deferredSections: WebsiteSection[];
  enabledSections: WebsiteSection[];
  criticalSectionIds: Set<string>;
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
    .filter((section) => section.section_type !== SECTION_CONTACT && section.section_type !== SECTION_CONTACT_FORM)
    .filter((section) => {
      if (templateSet !== 'editorial-v1') return true;
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

export function buildHomeSectionPlan(enabledSections: WebsiteSection[]): HomeSectionPlan {
  const heroSection = enabledSections.find((section) => section.section_type === SECTION_HERO);
  const criticalSections = heroSection ? [heroSection] : [];
  const criticalSectionIds = new Set(
    criticalSections
      .map((section) => section.id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0),
  );

  return {
    criticalSections,
    deferredSections: enabledSections.filter((section) => !criticalSectionIds.has(section.id)),
    enabledSections,
    criticalSectionIds,
  };
}
