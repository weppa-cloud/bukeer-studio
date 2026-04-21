/**
 * editorial-v1 section registry (Wave 1.1 stub)
 *
 * Opt-in alternate components for sites whose theme profile declares
 * `metadata.templateSet = 'editorial-v1'`. When a section type is present
 * here, the unified renderer uses this component INSTEAD of the generic
 * one from `lib/sections/section-registry.tsx`. Otherwise it falls back.
 *
 * Wave 1.1 keeps this registry empty on purpose — plumbing only. Later waves
 * populate it (hero, destinations, packages, planners, blog, experiences).
 */

import type { ComponentType } from 'react';
import type { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';
import type { PlannerData } from '@/lib/supabase/get-planners';
import type { TemplateSet } from '@/lib/sections/template-set';

import { CtaSection } from './sections/cta';
import { DestinationsSection } from './sections/destinations';
import { ExploreMapSection } from './sections/explore-map';
import { FaqSection } from './sections/faq';
import { HeroSection } from './sections/hero';
import { PackagesSection } from './sections/packages';
import { PlannersSection } from './sections/planners';
import { PromiseSection } from './sections/promise';
import { StatsSection } from './sections/stats';
import { TestimonialsSection } from './sections/testimonials';
import { TrustBarSection } from './sections/trust-bar';
import { BlogSection } from './sections/blog';

export type EditorialSectionComponentProps = {
  section: WebsiteSection;
  website: WebsiteData;
  dbPlanners?: PlannerData[];
};

export type EditorialSectionComponent =
  ComponentType<EditorialSectionComponentProps>;

/**
 * Map of section type → editorial-v1 component override.
 * Populated incrementally by each wave; missing entries fall back to the
 * generic registry in `lib/sections/section-registry.tsx`.
 */
export const editorialV1SectionComponents: Record<
  string,
  EditorialSectionComponent
> = {
  hero: HeroSection as EditorialSectionComponent,
  destinations: DestinationsSection as EditorialSectionComponent,
  packages: PackagesSection,
  explore_map: ExploreMapSection as EditorialSectionComponent,
  // Planners section — also responds to `team` and `travel_planners` types
  // for backward compatibility with legacy sections.
  planners: PlannersSection as EditorialSectionComponent,
  team: PlannersSection as EditorialSectionComponent,
  travel_planners: PlannersSection as EditorialSectionComponent,
  // Wave 2.simpler — editorial variants of "simpler" home sections.
  // `about` is aliased to the Promise (feature split) visual treatment.
  about: PromiseSection as EditorialSectionComponent,
  stats: StatsSection as EditorialSectionComponent,
  trust_bar: TrustBarSection as EditorialSectionComponent,
  testimonials: TestimonialsSection as EditorialSectionComponent,
  faq: FaqSection as EditorialSectionComponent,
  cta: CtaSection as EditorialSectionComponent,
  blog: BlogSection as EditorialSectionComponent,
};

/**
 * Lookup an editorial-set override for a section type.
 *
 * @param templateSet The resolved template set for the website.
 * @param sectionType The section_type from the DB row.
 * @returns The override component, or `undefined` if no override exists
 *   (caller must fall back to the generic registry).
 */
export function getEditorialSectionComponent(
  templateSet: TemplateSet,
  sectionType: string,
): EditorialSectionComponent | undefined {
  if (templateSet === 'editorial-v1') {
    return editorialV1SectionComponents[sectionType];
  }
  return undefined;
}
