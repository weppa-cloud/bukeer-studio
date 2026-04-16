import type { WebsiteSection, BlogPost } from '@bukeer/website-contract';
import { SECTION_TYPES } from '@bukeer/website-contract';

const SECTION_DESTINATIONS = SECTION_TYPES.find((t) => t === 'destinations')!;
const SECTION_TESTIMONIALS = SECTION_TYPES.find((t) => t === 'testimonials')!;
const SECTION_PACKAGES = SECTION_TYPES.find((t) => t === 'packages')!;
const SECTION_ACTIVITIES = SECTION_TYPES.find((t) => t === 'activities')!;
const SECTION_HOTELS = SECTION_TYPES.find((t) => t === 'hotels')!;
const SECTION_CTA = SECTION_TYPES.find((t) => t === 'cta')!;
const SECTION_HERO = SECTION_TYPES.find((t) => t === 'hero')!;
const SECTION_STATS = SECTION_TYPES.find((t) => t === 'stats')!;
const SECTION_BLOG = SECTION_TYPES.find((t) => t === 'blog')!;

const PRODUCT_SECTION_ORDER = [SECTION_PACKAGES, SECTION_ACTIVITIES, SECTION_HOTELS] as const;
type ProductSectionType = (typeof PRODUCT_SECTION_ORDER)[number];

export interface HydrationInput {
  enabledSections: WebsiteSection[];
  sectionDynamicDestinations: Array<unknown>;
  packageItems: Array<unknown>;
  activityItems: Array<unknown>;
  hotelItems: Array<unknown>;
  googleReviews: {
    reviews: Array<{
      author_name: string;
      author_photo?: string | null;
      text: string;
      rating: number;
      relative_time: string | null;
      images?: Array<{ url: string; thumbnail?: string }>;
      response?: string | { text: string; date: string };
      is_visible?: boolean;
    }>;
    average_rating: number;
    total_reviews: number;
    google_maps_url?: string;
    business_name?: string;
  } | null;
  blogPosts?: BlogPost[];
}

function buildAutoProductSection(
  sectionType: ProductSectionType,
  displayOrder: number,
  items: Array<unknown>
): WebsiteSection | null {
  if (items.length === 0) return null;

  if (sectionType === SECTION_PACKAGES) {
    return {
      id: '00000000-0000-4000-8000-000000009001',
      section_type: SECTION_PACKAGES,
      variant: 'carousel',
      display_order: displayOrder,
      is_enabled: true,
      config: {},
      content: {
        eyebrow: 'Experiencias Curadas',
        title: 'Paquetes de Viaje',
        subtitle: 'Itinerarios completos con logística resuelta de principio a fin',
        packages: items,
      },
    };
  }

  if (sectionType === SECTION_ACTIVITIES) {
    return {
      id: '00000000-0000-4000-8000-000000009002',
      section_type: SECTION_ACTIVITIES,
      variant: 'carousel',
      display_order: displayOrder,
      is_enabled: true,
      config: {},
      content: {
        title: 'Actividades Destacadas',
        subtitle: 'Experiencias por duración, dificultad y estilo de viaje',
        activities: items,
      },
    };
  }

  return {
    id: '00000000-0000-4000-8000-000000009003',
    section_type: SECTION_HOTELS,
    variant: 'carousel',
    display_order: displayOrder,
    is_enabled: true,
    config: {},
    content: {
      title: 'Hoteles Recomendados',
      subtitle: 'Estancias seleccionadas por ubicación, reviews y relación valor',
      hotels: items,
    },
  };
}

/**
 * Hydrates enabled sections with dynamic data (destinations, products, reviews)
 * and applies ordering rules (product section order, CTA at end).
 */
export function hydrateSections(input: HydrationInput): WebsiteSection[] {
  const {
    enabledSections,
    sectionDynamicDestinations,
    packageItems,
    activityItems,
    hotelItems,
    googleReviews,
  } = input;

  // 1. Map sections — inject dynamic destinations, packages, activities, hotels
  let hydratedSections: WebsiteSection[] = enabledSections.map((section) => {
    if (section.section_type === SECTION_DESTINATIONS) {
      const content = (section.content as Record<string, unknown>) || {};
      const source = content.source === 'manual' ? 'manual' : 'dynamic';
      const shouldUseDynamic = source !== 'manual' && sectionDynamicDestinations.length > 0;
      if (!shouldUseDynamic) return section;

      return {
        ...section,
        content: {
          ...content,
          destinations: sectionDynamicDestinations,
        },
      } as WebsiteSection;
    }

    if (section.section_type === SECTION_PACKAGES) {
      const content = (section.content as Record<string, unknown>) || {};
      const current = Array.isArray(content.packages) ? content.packages : [];
      const resolvedItems = packageItems.length > 0 ? packageItems : current;
      return {
        ...section,
        variant: 'carousel',
        content: {
          ...content,
          title: content.title || 'Paquetes de Viaje',
          subtitle: content.subtitle || 'Itinerarios completos con logística resuelta de principio a fin',
          eyebrow: content.eyebrow || 'Experiencias Curadas',
          packages: resolvedItems,
        },
      } as WebsiteSection;
    }

    if (section.section_type === SECTION_ACTIVITIES) {
      const content = (section.content as Record<string, unknown>) || {};
      const current = Array.isArray(content.activities) ? content.activities : [];
      const resolvedItems = activityItems.length > 0 ? activityItems : current;
      return {
        ...section,
        variant: 'carousel',
        content: {
          ...content,
          title: content.title || 'Actividades Destacadas',
          subtitle: content.subtitle || 'Experiencias por duración, dificultad y estilo de viaje',
          activities: resolvedItems,
        },
      } as WebsiteSection;
    }

    if (section.section_type === SECTION_HOTELS) {
      const content = (section.content as Record<string, unknown>) || {};
      const current = Array.isArray(content.hotels) ? content.hotels : [];
      const resolvedItems = hotelItems.length > 0 ? hotelItems : current;
      return {
        ...section,
        variant: 'carousel',
        content: {
          ...content,
          title: content.title || 'Hoteles Recomendados',
          subtitle: content.subtitle || 'Estancias seleccionadas por ubicación, reviews y relación valor',
          hotels: resolvedItems,
        },
      } as WebsiteSection;
    }

    return section;
  });

  // 2. Handle hero stats (remove stats section if hero has stats)
  const heroSection = hydratedSections.find((section) => section.section_type === SECTION_HERO);
  const heroContent = (heroSection?.content as { heroStats?: unknown } | undefined) || undefined;
  const hasHeroStats = Array.isArray(heroContent?.heroStats) && heroContent.heroStats.length > 0;
  if (hasHeroStats) {
    hydratedSections = hydratedSections.filter((section) => section.section_type !== SECTION_STATS);
  }

  // 3. Order product sections
  const sectionByType = new Map(hydratedSections.map((section) => [section.section_type, section]));
  const autoItemsByType: Record<ProductSectionType, Array<unknown>> = {
    [SECTION_PACKAGES]: packageItems,
    [SECTION_ACTIVITIES]: activityItems,
    [SECTION_HOTELS]: hotelItems,
  };

  const orderedProductSections: WebsiteSection[] = PRODUCT_SECTION_ORDER
    .map((sectionType, index) => {
      const existing = sectionByType.get(sectionType);
      if (existing) return existing;
      return buildAutoProductSection(sectionType, 100 + index, autoItemsByType[sectionType]);
    })
    .filter((section): section is WebsiteSection => Boolean(section));

  const nonProductSections = hydratedSections.filter(
    (section) =>
      section.section_type !== SECTION_PACKAGES &&
      section.section_type !== SECTION_ACTIVITIES &&
      section.section_type !== SECTION_HOTELS
  );

  let insertionIndex = nonProductSections.findIndex((section) => section.section_type === SECTION_DESTINATIONS);
  if (insertionIndex >= 0) {
    insertionIndex += 1;
  } else {
    const heroIndex = nonProductSections.findIndex((section) => section.section_type === SECTION_HERO);
    insertionIndex = heroIndex >= 0 ? heroIndex + 1 : 0;
  }

  hydratedSections = [
    ...nonProductSections.slice(0, insertionIndex),
    ...orderedProductSections,
    ...nonProductSections.slice(insertionIndex),
  ].map((section, index) => ({
    ...section,
    display_order: index,
  }));

  // 4. Inject Google reviews into testimonials
  if (googleReviews && googleReviews.reviews.length > 0) {
    const visibleReviews = googleReviews.reviews.filter((r) => r.is_visible !== false);
    const sorted = [...visibleReviews].sort((a, b) => {
      const aScore = (a.author_photo ? 2 : 0) + ((a.images?.length ?? 0) > 0 ? 1 : 0) + (a.rating ?? 0);
      const bScore = (b.author_photo ? 2 : 0) + ((b.images?.length ?? 0) > 0 ? 1 : 0) + (b.rating ?? 0);
      return bScore - aScore;
    });
    for (let i = 0; i < hydratedSections.length; i++) {
      if (hydratedSections[i].section_type !== SECTION_TESTIMONIALS) continue;
      hydratedSections[i] = {
        ...hydratedSections[i],
        content: {
          ...(hydratedSections[i].content as Record<string, unknown>),
          testimonials: sorted.map((r) => ({
            name: r.author_name,
            avatar: r.author_photo,
            text: r.text,
            rating: r.rating,
            location: r.relative_time,
            images: r.images,
            response: r.response,
          })),
          source: 'google_reviews',
          averageRating: googleReviews.average_rating,
          totalReviews: googleReviews.total_reviews,
          googleMapsUrl: googleReviews.google_maps_url,
          businessName: googleReviews.business_name,
        },
      } as WebsiteSection;
    }
  }

  // 5. Inject real blog posts into blog sections
  const { blogPosts } = input;
  if (blogPosts && blogPosts.length > 0) {
    for (let i = 0; i < hydratedSections.length; i++) {
      if (hydratedSections[i].section_type !== SECTION_BLOG) continue;
      hydratedSections[i] = {
        ...hydratedSections[i],
        content: {
          ...(hydratedSections[i].content as Record<string, unknown>),
          posts: blogPosts.map((p) => ({
            id: p.id,
            title: p.title,
            slug: p.slug,
            excerpt: p.excerpt || undefined,
            featuredImage: p.featured_image || undefined,
            publishedAt: p.published_at || undefined,
            category: undefined, // category_id only — no join in RPC
          })),
        },
      } as WebsiteSection;
    }
  }

  // 6. Move CTA to end and re-index display_order
  const ctaSection = hydratedSections.find((section) => section.section_type === SECTION_CTA);
  if (ctaSection) {
    hydratedSections = [
      ...hydratedSections.filter((section) => section.section_type !== SECTION_CTA),
      ctaSection,
    ].map((section, index) => ({
      ...section,
      display_order: index,
    }));
  }

  return hydratedSections;
}
