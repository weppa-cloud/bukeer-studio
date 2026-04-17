import type { PageSection } from '@/lib/supabase/get-pages';

interface LandingPageSchemaProps {
  sections: PageSection[];
  pageTitle: string;
  pageUrl: string;
  inLanguage?: string;
}

function clean(obj: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(obj));
}

function buildTouristTripSchema(
  sections: PageSection[],
  pageTitle: string,
  pageUrl: string,
  inLanguage: string,
): Record<string, unknown> | null {
  const itinerarySec = sections.find((s) => {
    const raw = s as unknown as Record<string, unknown>;
    return s.type === 'itinerary_accordion'
      || raw.sectionType === 'itinerary_accordion'
      || raw.section_type === 'itinerary_accordion';
  });

  const pricingSec = sections.find((s) => {
    const raw = s as unknown as Record<string, unknown>;
    return s.type === 'pricing'
      || raw.sectionType === 'pricing'
      || raw.section_type === 'pricing';
  });

  const days = (itinerarySec?.content as Record<string, unknown> | null)?.days as Array<{
    dayNumber: number;
    title: string;
    location?: string;
    summary?: string;
  }> | undefined;

  const tiers = (pricingSec?.content as Record<string, unknown> | null)?.tiers as Array<{
    price: string;
    highlighted?: boolean;
  }> | undefined;

  if (!days?.length && !tiers?.length) return null;

  const featuredTier = tiers?.find((t) => t.highlighted) ?? tiers?.[0];
  const priceStr = featuredTier?.price ?? '';
  const numericMatch = priceStr.replace(/[^0-9.]/g, '');
  const numericPrice = parseFloat(numericMatch);

  return clean({
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    name: pageTitle,
    url: pageUrl,
    inLanguage,
    touristType: ['Leisure', 'Cultural'],
    offers: !isNaN(numericPrice) && numericPrice > 0
      ? {
          '@type': 'Offer',
          price: numericPrice,
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
          priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        }
      : undefined,
    itinerary: days?.length
      ? {
          '@type': 'ItemList',
          itemListElement: days.map((day, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: `Día ${day.dayNumber}: ${day.title}`,
            item: day.location
              ? { '@type': 'Place', name: day.location }
              : undefined,
          })),
        }
      : undefined,
  });
}

function buildFaqPageSchema(
  sections: PageSection[],
  inLanguage: string,
): Record<string, unknown> | null {
  const faqSec = sections.find((s) => {
    const raw = s as unknown as Record<string, unknown>;
    return s.type === 'faq'
      || s.type === 'faq_accordion'
      || raw.sectionType === 'faq_accordion'
      || raw.section_type === 'faq_accordion';
  });

  if (!faqSec) return null;

  const content = faqSec.content as Record<string, unknown> | null;
  const items = (content?.items ?? content?.faqs ?? content?.questions) as Array<{
    question: string;
    answer: string;
  }> | undefined;

  if (!items?.length) return null;

  const mainEntity = items
    .filter((item) => item?.question?.trim() && item?.answer?.trim())
    .map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    }));

  if (!mainEntity.length) return null;

  return clean({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    inLanguage,
    mainEntity,
  });
}

function buildAggregateRatingSchema(
  sections: PageSection[],
  pageTitle: string,
  pageUrl: string,
  inLanguage: string,
): Record<string, unknown> | null {
  const trustSec = sections.find((s) => {
    const raw = s as unknown as Record<string, unknown>;
    return s.type === 'trust_bar'
      || raw.sectionType === 'trust_bar'
      || raw.section_type === 'trust_bar';
  });

  if (!trustSec) return null;

  const content = trustSec.content as Record<string, unknown> | null;
  const rating = content?.rating as { score?: number; count?: number; source?: string } | undefined;

  if (!rating?.score || !rating?.count || rating.count <= 0) return null;

  return clean({
    '@context': 'https://schema.org',
    '@type': 'TravelAgency',
    name: pageTitle,
    url: pageUrl,
    inLanguage,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: rating.score,
      reviewCount: rating.count,
      bestRating: 5,
      worstRating: 1,
    },
  });
}

function buildBreadcrumbSchema(
  pageTitle: string,
  pageUrl: string,
  baseUrl: string,
  inLanguage: string,
): Record<string, unknown> {
  return clean({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    inLanguage,
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: baseUrl },
      { '@type': 'ListItem', position: 2, name: pageTitle, item: pageUrl },
    ],
  });
}

export function LandingPageSchema({
  sections,
  pageTitle,
  pageUrl,
  inLanguage = 'es',
}: LandingPageSchemaProps) {
  if (!sections?.length) return null;

  const baseUrl = new URL(pageUrl).origin;

  const schemas: Record<string, unknown>[] = [];

  const touristTrip = buildTouristTripSchema(sections, pageTitle, pageUrl, inLanguage);
  if (touristTrip) schemas.push(touristTrip);

  const faqPage = buildFaqPageSchema(sections, inLanguage);
  if (faqPage) schemas.push(faqPage);

  const aggregateRating = buildAggregateRatingSchema(sections, pageTitle, pageUrl, inLanguage);
  if (aggregateRating) schemas.push(aggregateRating);

  const breadcrumb = buildBreadcrumbSchema(pageTitle, pageUrl, baseUrl, inLanguage);
  schemas.push(breadcrumb);

  if (schemas.length === 0) return null;

  return (
    <>
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}
