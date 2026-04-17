import type { MeetingPoint, ProductData, ProductFAQ } from '@bukeer/website-contract';

interface ProductSchemaProps {
  product: ProductData;
  productType: string;
  websiteUrl?: string;
  language?: string | null;
  faqs?: ProductFAQ[] | null;
}

export function ProductSchema({
  product,
  productType,
  websiteUrl,
  language,
  faqs,
}: ProductSchemaProps) {
  if (!product?.name) return null;

  const schemas = generateSchemas(product, productType, websiteUrl, language, faqs);
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

function generateSchemas(
  product: ProductData,
  productType: string,
  websiteUrl?: string,
  language?: string | null,
  faqs?: ProductFAQ[] | null,
): Record<string, unknown>[] {
  const inLanguage = normalizeLanguage(language);
  const productSchema = buildProductSchema(product, productType, websiteUrl, inLanguage);
  const breadcrumb = buildBreadcrumbSchema(product, productType, websiteUrl, inLanguage);
  const faqSchema = buildFaqSchema(faqs, inLanguage);

  const schemas: Record<string, unknown>[] = [];
  if (productSchema) schemas.push(productSchema);
  if (breadcrumb) schemas.push(breadcrumb);
  if (faqSchema) schemas.push(faqSchema);
  return schemas;
}

function buildProductSchema(
  product: ProductData,
  productType: string,
  websiteUrl: string | undefined,
  inLanguage: string,
): Record<string, unknown> | null {
  switch (productType) {
    case 'hotel':
      return clean(buildHotelSchema(product, websiteUrl, inLanguage));
    case 'activity':
      return clean(buildActivitySchema(product, websiteUrl, inLanguage));
    case 'transfer':
      return clean(buildTransferSchema(product, websiteUrl, inLanguage));
    case 'destination':
      return clean(buildDestinationSchema(product, websiteUrl, inLanguage));
    case 'package':
      return clean(buildPackageSchema(product, websiteUrl, inLanguage));
    default:
      return null;
  }
}

function buildHotelSchema(product: ProductData, websiteUrl: string | undefined, inLanguage: string) {
  const aggregateRating = buildAggregateRating(product);
  const offer = buildOffer(product);
  const place = buildPlace(product);

  return {
    '@context': 'https://schema.org',
    '@type': 'LodgingBusiness',
    name: product.name,
    description: product.description,
    image: getPrimaryImage(product),
    url: websiteUrl,
    inLanguage,
    address: buildAddress(product),
    geo: place?.geo,
    containsPlace: place,
    starRating: product.star_rating
      ? {
          '@type': 'Rating',
          ratingValue: normalizeNumber(product.star_rating),
        }
      : undefined,
    amenityFeature: product.amenities?.map((a) => ({
      '@type': 'LocationFeatureSpecification',
      name: a,
      value: true,
    })),
    aggregateRating,
    offers: offer,
  };
}

function buildActivitySchema(product: ProductData, websiteUrl: string | undefined, inLanguage: string) {
  const offer = buildOffer(product);
  const aggregateRating = buildAggregateRating(product);
  const place = buildPlace(product);

  return {
    '@context': 'https://schema.org',
    '@type': 'TouristAttraction',
    name: product.name,
    description: product.description,
    image: getPrimaryImage(product),
    url: websiteUrl,
    inLanguage,
    address: buildAddress(product),
    location: place,
    aggregateRating,
    offers: offer,
  };
}

function buildTransferSchema(product: ProductData, websiteUrl: string | undefined, inLanguage: string) {
  const offer = buildOffer(product);
  const place = buildPlace(product);

  return {
    '@context': 'https://schema.org',
    '@type': 'TaxiService',
    name: product.name,
    description: product.description,
    image: getPrimaryImage(product),
    url: websiteUrl,
    inLanguage,
    areaServed: place
      ? {
          '@type': 'Place',
          name: place.name,
          geo: place.geo,
        }
      : (product.from_location || product.location)
      ? {
          '@type': 'Place',
          name: product.from_location || product.location,
        }
      : undefined,
    offers: offer,
  };
}

function buildDestinationSchema(product: ProductData, websiteUrl: string | undefined, inLanguage: string) {
  const place = buildPlace(product);
  return {
    '@context': 'https://schema.org',
    '@type': 'TouristDestination',
    name: product.name,
    description: product.description,
    image: getPrimaryImage(product),
    url: websiteUrl,
    inLanguage,
    address: buildAddress(product),
    geo: place?.geo,
    aggregateRating: buildAggregateRating(product),
  };
}

function buildPackageSchema(product: ProductData, websiteUrl: string | undefined, inLanguage: string) {
  const itinerary = (product.itinerary_items ?? []).filter((item) => item && typeof item.title === 'string' && item.title.trim());

  return {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    name: product.name,
    description: product.description,
    image: getPrimaryImage(product),
    url: websiteUrl,
    inLanguage,
    touristType: 'Leisure',
    offers: buildOffer(product),
    itinerary: itinerary.length
      ? {
          '@type': 'ItemList',
          itemListElement: itinerary.map((item, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: item.title || `Day ${i + 1}`,
          })),
        }
      : undefined,
    subTrip: itinerary.length
      ? itinerary.map((item, i) => ({
          '@type': 'TouristTrip',
          name: item.title || `Day ${i + 1}`,
          description: item.description || undefined,
        }))
      : undefined,
  };
}

function buildFaqSchema(faqs: ProductFAQ[] | null | undefined, inLanguage: string): Record<string, unknown> | null {
  if (!Array.isArray(faqs) || faqs.length === 0) {
    return null;
  }

  const mainEntity = faqs
    .filter((faq) => Boolean(faq?.question?.trim()) && Boolean(faq?.answer?.trim()))
    .map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    }));

  if (mainEntity.length === 0) {
    return null;
  }

  return clean({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    inLanguage,
    mainEntity,
  });
}

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  destination: 'Destinos',
  hotel: 'Hoteles',
  activity: 'Actividades',
  transfer: 'Traslados',
  package: 'Paquetes',
};

const PRODUCT_TYPE_SLUGS: Record<string, string> = {
  destination: 'destinos',
  hotel: 'hoteles',
  activity: 'actividades',
  transfer: 'traslados',
  package: 'paquetes',
};

function buildBreadcrumbSchema(
  product: ProductData,
  productType: string,
  websiteUrl: string | undefined,
  inLanguage: string,
): Record<string, unknown> | null {
  if (!websiteUrl) return null;

  const typeName = PRODUCT_TYPE_LABELS[productType];
  const typeSlug = PRODUCT_TYPE_SLUGS[productType];
  if (!typeName || !typeSlug) return null;

  const hasDestination = product.location && productType !== 'destination';

  const items: Array<{ '@type': string; position: number; name: string; item?: string }> = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Inicio',
      item: websiteUrl,
    },
  ];

  let pos = 2;

  if (hasDestination) {
    items.push({
      '@type': 'ListItem',
      position: pos++,
      name: 'Destinos',
      item: `${websiteUrl}/destinos`,
    });
    items.push({
      '@type': 'ListItem',
      position: pos++,
      name: product.location!,
      item: `${websiteUrl}/destinos/${slugify(product.location!)}`,
    });
  }

  items.push({
    '@type': 'ListItem',
    position: pos++,
    name: typeName,
    item: `${websiteUrl}/${typeSlug}`,
  });

  items.push({
    '@type': 'ListItem',
    position: pos,
    name: product.name,
  });

  return clean({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    inLanguage,
    itemListElement: items,
  });
}

function buildAddress(product: ProductData) {
  const locality = product.city || product.location;
  if (!locality) return undefined;

  return {
    '@type': 'PostalAddress',
    addressLocality: locality,
    addressCountry: product.country,
  };
}

function buildOffer(product: ProductData): Record<string, unknown> | undefined {
  const price = normalizeNumber(product.price);
  if (price === null) {
    return undefined;
  }

  const validUntil = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365)
    .toISOString()
    .split('T')[0];

  return {
    '@type': 'Offer',
    price,
    priceCurrency: product.currency || 'USD',
    availability: 'https://schema.org/InStock',
    priceValidUntil: validUntil,
  };
}

function buildAggregateRating(product: ProductData): Record<string, unknown> | undefined {
  const rating = normalizeNumber(product.user_rating);
  const reviewCount = normalizeNumber(product.review_count);

  if (rating === null || reviewCount === null || reviewCount <= 0) {
    return undefined;
  }

  return {
    '@type': 'AggregateRating',
    ratingValue: rating,
    reviewCount,
  };
}

function buildPlace(product: ProductData): { name?: string; geo?: Record<string, unknown> } | undefined {
  const meetingPoint = product.meeting_point as MeetingPoint | undefined;
  const lat = normalizeNumber(meetingPoint?.latitude ?? product.latitude);
  const lng = normalizeNumber(meetingPoint?.longitude ?? product.longitude);

  if (lat === null || lng === null) {
    return undefined;
  }

  const locationLabel = [
    meetingPoint?.address,
    meetingPoint?.city,
    meetingPoint?.state,
    meetingPoint?.country,
    product.location,
    product.city,
  ]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .map((part) => part.trim())[0];

  return {
    name: locationLabel,
    geo: {
      '@type': 'GeoCoordinates',
      latitude: lat,
      longitude: lng,
    },
  };
}

function getPrimaryImage(product: ProductData): string | undefined {
  if (typeof product.social_image === 'string' && product.social_image.trim()) {
    return product.social_image;
  }

  if (typeof product.image === 'string' && product.image.trim()) {
    return product.image;
  }

  if (Array.isArray(product.photos) && product.photos.length > 0) {
    const first = product.photos[0];
    if (typeof first === 'string') return first;
    if (first && typeof first === 'object' && typeof first.url === 'string') return first.url;
  }

  if (Array.isArray(product.images) && product.images.length > 0) {
    return product.images[0];
  }

  return undefined;
}

function normalizeNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function normalizeLanguage(language: string | null | undefined): string {
  if (!language || typeof language !== 'string' || !language.trim()) {
    return 'es';
  }
  return language;
}

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function clean(obj: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(obj));
}
