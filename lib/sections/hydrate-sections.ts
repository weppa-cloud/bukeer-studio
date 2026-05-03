import type {
  BlogPost,
  BrandClaims,
  FeaturedDestination,
  WebsiteSection,
} from "@bukeer/website-contract";

import type { TemplateSet } from "./template-set";

interface GoogleReviewInput {
  review_id?: string;
  author_name?: string;
  author_photo?: string | null;
  rating?: number | null;
  text?: string | null;
  date?: string | null;
  relative_time?: string | null;
  images?: Array<{ url: string; thumbnail?: string }>;
  response?: string | { text?: string | null } | null;
  is_visible?: boolean;
  tags?: string[];
}

interface GoogleReviewsInput {
  reviews: GoogleReviewInput[];
  business_name?: string | null;
  average_rating?: number | null;
  total_reviews?: number | null;
  google_maps_url?: string | null;
}

export interface HydrateSectionsInput {
  enabledSections: WebsiteSection[];
  templateSet?: TemplateSet | string | null;
  sectionDynamicDestinations: unknown[];
  packageItems: unknown[];
  activityItems: unknown[];
  hotelItems: unknown[];
  googleReviews?: GoogleReviewsInput | null;
  blogPosts?: BlogPost[];
  brandClaims?: BrandClaims | null;
  featuredDestinations?: FeaturedDestination[];
}

const BRAND_CLAIMS_SECTION_TYPES = new Set([
  "hero",
  "stats",
  "about",
  "trust_bar",
  "planners",
  "team",
  "travel_planners",
]);

const FEATURED_DESTINATIONS_SECTION_TYPES = new Set([
  "hero",
  "destinations",
  "explore_map",
]);

function hasOwnContentKey(
  content: Record<string, unknown>,
  key: string,
): boolean {
  return Object.prototype.hasOwnProperty.call(content, key);
}

function withInjectedContent(
  section: WebsiteSection,
  additions: Record<string, unknown>,
): WebsiteSection {
  if (Object.keys(additions).length === 0) return section;

  return {
    ...section,
    content: {
      ...(section.content ?? {}),
      ...additions,
    },
  };
}

function toTestimonials(
  googleReviews: GoogleReviewsInput | null | undefined,
): Array<Record<string, unknown>> {
  if (!googleReviews?.reviews?.length) return [];

  return googleReviews.reviews
    .filter((review) => review.is_visible !== false)
    .filter(
      (review) =>
        typeof review.text === "string" && review.text.trim().length > 0,
    )
    .map((review) => ({
      id: review.review_id,
      name: review.author_name ?? "Viajero",
      avatar: review.author_photo,
      rating: review.rating ?? 5,
      text: review.text,
      date: review.relative_time ?? review.date,
      location: review.tags?.[0],
      images: review.images,
      response:
        typeof review.response === "string"
          ? review.response
          : review.response?.text,
      source: "google_reviews",
    }))
    .slice(0, 8);
}

function hydrateSection(
  section: WebsiteSection,
  input: HydrateSectionsInput,
): WebsiteSection {
  const content = section.content ?? {};
  const additions: Record<string, unknown> = {};

  if (
    input.brandClaims &&
    BRAND_CLAIMS_SECTION_TYPES.has(section.section_type) &&
    !hasOwnContentKey(content, "brandClaims")
  ) {
    additions.brandClaims = input.brandClaims;
  }

  if (
    input.featuredDestinations?.length &&
    FEATURED_DESTINATIONS_SECTION_TYPES.has(section.section_type) &&
    !hasOwnContentKey(content, "featuredDestinations")
  ) {
    additions.featuredDestinations = input.featuredDestinations;
  }

  if (
    section.section_type === "destinations" &&
    input.sectionDynamicDestinations.length > 0 &&
    !hasOwnContentKey(content, "destinations")
  ) {
    additions.destinations = input.sectionDynamicDestinations;
  }

  if (
    section.section_type === "packages" &&
    input.packageItems.length > 0 &&
    !hasOwnContentKey(content, "packages")
  ) {
    additions.packages = input.packageItems;
  }

  if (
    section.section_type === "activities" &&
    input.activityItems.length > 0 &&
    !hasOwnContentKey(content, "activities")
  ) {
    additions.activities = input.activityItems;
  }

  if (
    section.section_type === "hotels" &&
    input.hotelItems.length > 0 &&
    !hasOwnContentKey(content, "hotels")
  ) {
    additions.hotels = input.hotelItems;
  }

  if (
    section.section_type === "blog" &&
    input.blogPosts?.length &&
    !hasOwnContentKey(content, "posts")
  ) {
    additions.posts = input.blogPosts;
  }

  if (section.section_type === "testimonials") {
    const testimonials = toTestimonials(input.googleReviews);
    if (testimonials.length > 0) {
      if (!hasOwnContentKey(content, "testimonials")) {
        additions.testimonials = testimonials;
      }
      if (!hasOwnContentKey(content, "averageRating")) {
        additions.averageRating = input.googleReviews?.average_rating ?? null;
      }
      if (!hasOwnContentKey(content, "totalReviews")) {
        additions.totalReviews = input.googleReviews?.total_reviews ?? null;
      }
      if (!hasOwnContentKey(content, "googleMapsUrl")) {
        additions.googleMapsUrl = input.googleReviews?.google_maps_url ?? null;
      }
      if (!hasOwnContentKey(content, "source")) {
        additions.source = "google_reviews";
      }
    }
  }

  return withInjectedContent(section, additions);
}

function shouldOmitStatsSection(
  section: WebsiteSection,
  sections: WebsiteSection[],
): boolean {
  if (section.section_type !== "stats") return false;

  return sections.some((candidate) => {
    if (candidate.section_type !== "hero") return false;
    const heroStats = candidate.content?.heroStats;
    return Array.isArray(heroStats) && heroStats.length > 0;
  });
}

export function hydrateSections(input: HydrateSectionsInput): WebsiteSection[] {
  const enabledSections = [...input.enabledSections]
    .filter((section) => section.is_enabled !== false)
    .sort((a, b) => a.display_order - b.display_order);

  return enabledSections
    .filter((section) => !shouldOmitStatsSection(section, enabledSections))
    .map((section) => hydrateSection(section, input));
}
