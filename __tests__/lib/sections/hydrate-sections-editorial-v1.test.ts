/**
 * Editorial v1 hydration tests — verifies that `hydrateSections` injects
 * `brandClaims` + `featuredDestinations` into the appropriate sections
 * without mutating the input and without overwriting authored content.
 *
 * Run with: npx jest __tests__/lib/sections/hydrate-sections-editorial-v1.test.ts
 */

import { hydrateSections } from '@/lib/sections/hydrate-sections';
import type {
  WebsiteSection,
  BrandClaims,
  FeaturedDestination,
} from '@bukeer/website-contract';

function makeSection(
  id: string,
  section_type: string,
  content: Record<string, unknown> = {},
  display_order = 0,
): WebsiteSection {
  return {
    id,
    section_type,
    variant: '',
    display_order,
    is_enabled: true,
    config: {},
    content,
  } as WebsiteSection;
}

const SAMPLE_CLAIMS: BrandClaims = {
  yearsInOperation: 15,
  totalDestinations: 9,
  totalPackages: 14,
  totalActivities: 734,
  avgRating: 4.9,
  totalReviews: 153,
  satisfactionPct: 98,
  totalBookings: 14,
  totalPlanners: 4,
  plannersAvgRating: null,
};

const SAMPLE_FEATURED: FeaturedDestination[] = [
  {
    slug: 'cartagena',
    headline: 'Cartagena Colonial',
    tagline: 'Patrimonio + Caribe',
    heroImageUrl: 'https://cdn.example.com/ctg.jpg',
    featuredOrder: 1,
  },
];

describe('hydrateSections — editorial v1 extensions', () => {
  it('injects brandClaims into hero/stats and pass-through sections', () => {
    const input = [
      makeSection('s-hero', 'hero', { title: 'Hola' }, 0),
      makeSection('s-stats', 'stats', {}, 1),
      // `about`, `trust_bar`, `planners` are strings that may not be in the
      // enum — cast to bypass the narrow `section_type` type.
      makeSection('s-about', 'about', {}, 2),
      makeSection('s-trust', 'trust_bar', {}, 3),
      makeSection('s-planners', 'planners', {}, 4),
      makeSection('s-gallery', 'gallery', {}, 5),
    ];

    const result = hydrateSections({
      enabledSections: input,
      sectionDynamicDestinations: [],
      packageItems: [],
      activityItems: [],
      hotelItems: [],
      googleReviews: null,
      brandClaims: SAMPLE_CLAIMS,
    });

    const byId = (id: string) => result.find((s) => s.id === id);

    const hero = byId('s-hero');
    const stats = byId('s-stats');
    const about = byId('s-about');
    const trust = byId('s-trust');
    const planners = byId('s-planners');
    const gallery = byId('s-gallery');

    expect((hero?.content as { brandClaims?: BrandClaims })?.brandClaims).toEqual(
      SAMPLE_CLAIMS,
    );
    // `stats` is stripped when hero.heroStats is set — here it isn't, so stats survives.
    expect(
      (stats?.content as { brandClaims?: BrandClaims } | undefined)?.brandClaims,
    ).toEqual(SAMPLE_CLAIMS);
    expect((about?.content as { brandClaims?: BrandClaims })?.brandClaims).toEqual(
      SAMPLE_CLAIMS,
    );
    expect((trust?.content as { brandClaims?: BrandClaims })?.brandClaims).toEqual(
      SAMPLE_CLAIMS,
    );
    expect(
      (planners?.content as { brandClaims?: BrandClaims })?.brandClaims,
    ).toEqual(SAMPLE_CLAIMS);
    expect(
      (gallery?.content as { brandClaims?: BrandClaims })?.brandClaims,
    ).toBeUndefined();
  });

  it('does not overwrite authored brandClaims on a section', () => {
    const authored = { ...SAMPLE_CLAIMS, yearsInOperation: 99 } satisfies BrandClaims;
    const input = [
      makeSection('s-hero', 'hero', { brandClaims: authored }, 0),
    ];

    const result = hydrateSections({
      enabledSections: input,
      sectionDynamicDestinations: [],
      packageItems: [],
      activityItems: [],
      hotelItems: [],
      googleReviews: null,
      brandClaims: SAMPLE_CLAIMS,
    });

    expect((result[0].content as { brandClaims: BrandClaims }).brandClaims).toBe(
      authored,
    );
  });

  it('injects featuredDestinations into hero + destinations sections', () => {
    const input = [
      makeSection('s-hero', 'hero', {}, 0),
      makeSection('s-dest', 'destinations', {}, 1),
      makeSection('s-cta', 'cta', {}, 2),
    ];

    const result = hydrateSections({
      enabledSections: input,
      sectionDynamicDestinations: [],
      packageItems: [],
      activityItems: [],
      hotelItems: [],
      googleReviews: null,
      featuredDestinations: SAMPLE_FEATURED,
    });

    const hero = result.find((s) => s.id === 's-hero');
    const dest = result.find((s) => s.id === 's-dest');
    const cta = result.find((s) => s.id === 's-cta');

    expect(
      (hero?.content as { featuredDestinations?: FeaturedDestination[] })
        ?.featuredDestinations,
    ).toEqual(SAMPLE_FEATURED);
    expect(
      (dest?.content as { featuredDestinations?: FeaturedDestination[] })
        ?.featuredDestinations,
    ).toEqual(SAMPLE_FEATURED);
    expect(
      (cta?.content as { featuredDestinations?: FeaturedDestination[] })
        ?.featuredDestinations,
    ).toBeUndefined();
  });

  it('does not mutate the input sections array', () => {
    const section = makeSection('s-hero', 'hero', {}, 0);
    const input: WebsiteSection[] = [section];

    hydrateSections({
      enabledSections: input,
      sectionDynamicDestinations: [],
      packageItems: [],
      activityItems: [],
      hotelItems: [],
      googleReviews: null,
      brandClaims: SAMPLE_CLAIMS,
      featuredDestinations: SAMPLE_FEATURED,
    });

    // Original section.content is still empty — mutation would have added keys.
    expect(section.content).toEqual({});
  });

  it('skips injection when brandClaims/featuredDestinations are absent', () => {
    const input = [makeSection('s-hero', 'hero', {}, 0)];
    const result = hydrateSections({
      enabledSections: input,
      sectionDynamicDestinations: [],
      packageItems: [],
      activityItems: [],
      hotelItems: [],
      googleReviews: null,
    });
    expect(result[0].content).toEqual({});
  });

  it('does not auto-insert activities/hotels for editorial-v1 home hydration', () => {
    const input = [
      makeSection('s-hero', 'hero', {}, 0),
      makeSection('s-packages', 'packages', {}, 1),
      makeSection('s-cta', 'cta', {}, 2),
    ];

    const result = hydrateSections({
      enabledSections: input,
      templateSet: 'editorial-v1',
      sectionDynamicDestinations: [],
      packageItems: [{ id: 'p1' }],
      activityItems: [{ id: 'a1' }],
      hotelItems: [{ id: 'h1' }],
      googleReviews: null,
    });

    const types = result.map((s) => s.section_type);
    expect(types).toContain('packages');
    expect(types).not.toContain('activities');
    expect(types).not.toContain('hotels');
  });
});
