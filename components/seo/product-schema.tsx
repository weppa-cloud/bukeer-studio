import type { MeetingPoint, ProductData, ProductFAQ } from '@bukeer/website-contract';
import { parseVideoMeta } from '@/lib/products/video-url';
import { localeToLanguage, normalizeLocale } from '@/lib/seo/locale-routing';

interface ProductSchemaProps {
  product: ProductData;
  productType: string;
  websiteUrl?: string;
  organizationName?: string | null;
  language?: string | null;
  faqs?: ProductFAQ[] | null;
}

export function ProductSchema({
  product,
  productType,
  websiteUrl,
  organizationName,
  language,
  faqs,
}: ProductSchemaProps) {
  if (!product?.name) return null;

  const schemas = generateSchemas(product, productType, websiteUrl, organizationName, language, faqs);
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
  organizationName?: string | null,
  language?: string | null,
  faqs?: ProductFAQ[] | null,
): Record<string, unknown>[] {
  const inLanguage = normalizeLanguage(language);
  const productSchema = buildProductSchema(product, productType, websiteUrl, organizationName, inLanguage);
  const commercialSchema = buildCommercialProductSchema(product, productType, websiteUrl, organizationName, inLanguage);
  const breadcrumb = buildBreadcrumbSchema(product, productType, websiteUrl, inLanguage);
  const faqSchema = buildFaqSchema(faqs, inLanguage);
  const videoSchema = buildVideoObjectSchema(product);

  const schemas: Record<string, unknown>[] = [];
  if (productSchema) schemas.push(productSchema);
  if (commercialSchema) schemas.push(commercialSchema);
  if (breadcrumb) schemas.push(breadcrumb);
  if (faqSchema) schemas.push(faqSchema);
  if (videoSchema) schemas.push(videoSchema);
  return schemas;
}

function buildProductSchema(
  product: ProductData,
  productType: string,
  websiteUrl: string | undefined,
  organizationName: string | null | undefined,
  inLanguage: string,
): Record<string, unknown> | null {
  switch (productType) {
    case 'hotel':
      return clean(buildHotelSchema(product, websiteUrl, organizationName, inLanguage));
    case 'activity':
      return clean(buildActivitySchema(product, websiteUrl, organizationName, inLanguage));
    case 'transfer':
      return clean(buildTransferSchema(product, websiteUrl, inLanguage));
    case 'destination':
      return clean(buildDestinationSchema(product, websiteUrl, inLanguage));
    case 'package':
      return clean(buildPackageSchema(product, websiteUrl, organizationName, inLanguage));
    default:
      return null;
  }
}

function buildHotelSchema(
  product: ProductData,
  websiteUrl: string | undefined,
  organizationName: string | null | undefined,
  inLanguage: string
) {
  const aggregateRating = buildAggregateRating(product);
  const offer = buildOffer(product, websiteUrl, organizationName);
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

function buildActivitySchema(
  product: ProductData,
  websiteUrl: string | undefined,
  organizationName: string | null | undefined,
  inLanguage: string
) {
  const offer = buildOffer(product, websiteUrl, organizationName);
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
    touristType: product.experience_type || product.activity_type,
    provider: buildTravelAgencyRef(websiteUrl, organizationName),
    aggregateRating,
    offers: offer,
  };
}

function buildTransferSchema(product: ProductData, websiteUrl: string | undefined, inLanguage: string) {
  const offer = buildOffer(product, websiteUrl);
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

function buildPackageSchema(
  product: ProductData,
  websiteUrl: string | undefined,
  organizationName: string | null | undefined,
  inLanguage: string
) {
  const itinerary = getItineraryItems(product);
  const aggregateRating = buildAggregateRating(product);
  const language = localeToLanguage(normalizeLocale(inLanguage, 'es-CO'));
  const dayLabel = language === 'en' ? 'Day' : 'Día';

  return {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    name: product.name,
    description: product.description,
    image: getPrimaryImage(product),
    url: websiteUrl,
    inLanguage,
    touristType: 'Leisure',
    provider: buildTravelAgencyRef(websiteUrl, organizationName),
    organizer: buildTravelAgencyRef(websiteUrl, organizationName),
    offers: buildOffer(product, websiteUrl, organizationName),
    aggregateRating,
    itinerary: itinerary.length
      ? {
          '@type': 'ItemList',
          itemListElement: itinerary.map((item, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: item.title || `${dayLabel} ${i + 1}`,
            description: item.description || undefined,
            item: {
              '@type': 'TouristDestination',
              name: item.title || `${dayLabel} ${i + 1}`,
              description: item.description || undefined,
            },
          })),
        }
      : undefined,
    subTrip: itinerary.length
      ? itinerary.map((item, i) => ({
          '@type': 'TouristTrip',
          name: item.title || `${dayLabel} ${i + 1}`,
          description: item.description || undefined,
        }))
      : undefined,
  };
}

function buildCommercialProductSchema(
  product: ProductData,
  productType: string,
  websiteUrl: string | undefined,
  organizationName: string | null | undefined,
  inLanguage: string,
): Record<string, unknown> | null {
  if (productType !== 'package' && productType !== 'activity') {
    return null;
  }

  const offer = buildOffer(product, websiteUrl, organizationName);
  if (!offer) {
    return null;
  }

  const place = buildPlace(product);
  const category = productType === 'package' ? 'Travel package' : 'Tour activity';
  const allImages = getProductImages(product);
  const itinerary = productType === 'package' ? buildItineraryList(product, inLanguage) : undefined;
  const places = buildProductPlaces(product);

  return clean({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: allImages.length > 0 ? allImages : undefined,
    url: websiteUrl,
    inLanguage,
    category,
    brand: {
      '@type': 'Brand',
      name: organizationName || category,
    },
    additionalType: productType === 'package'
      ? 'https://schema.org/TouristTrip'
      : 'https://schema.org/TouristAttraction',
    areaServed: place
      ? {
          '@type': 'Place',
          name: place.name,
          geo: place.geo,
        }
      : product.location || product.city || product.country
      ? {
          '@type': 'Place',
          name: product.location || product.city || product.country,
        }
      : undefined,
    provider: buildTravelAgencyRef(websiteUrl, organizationName),
    organizer: productType === 'package' ? buildTravelAgencyRef(websiteUrl, organizationName) : undefined,
    hasPart: itinerary,
    itinerary,
    subjectOf: itinerary,
    spatialCoverage: places.length > 0 ? places : undefined,
    offers: offer,
    aggregateRating: buildAggregateRating(product),
  });
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

function buildVideoObjectSchema(product: ProductData): Record<string, unknown> | null {
  const videoUrl = product.video_url;
  if (!videoUrl || typeof videoUrl !== 'string') return null;
  const meta = parseVideoMeta(videoUrl);
  if (!meta || meta.provider === 'external') return null;

  return clean({
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: product.video_caption ?? product.name,
    description: product.description,
    thumbnailUrl: meta.thumbnailUrl ?? getPrimaryImage(product),
    contentUrl: meta.provider === 'mp4' ? videoUrl : undefined,
    embedUrl: meta.provider !== 'mp4' ? meta.embedUrl : undefined,
    uploadDate: undefined,
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

const PRODUCT_TYPE_LABELS_EN: Record<string, string> = {
  destination: 'Destinations',
  hotel: 'Hotels',
  activity: 'Activities',
  transfer: 'Transfers',
  package: 'Packages',
};

const PRODUCT_TYPE_SLUGS_EN: Record<string, string> = {
  destination: 'destinations',
  hotel: 'hotels',
  activity: 'activities',
  transfer: 'transfers',
  package: 'packages',
};

function buildBreadcrumbSchema(
  product: ProductData,
  productType: string,
  websiteUrl: string | undefined,
  inLanguage: string,
): Record<string, unknown> | null {
  if (!websiteUrl) return null;

  const language = localeToLanguage(normalizeLocale(inLanguage, 'es-CO'));
  const isEnglish = language === 'en';
  const labels = isEnglish ? PRODUCT_TYPE_LABELS_EN : PRODUCT_TYPE_LABELS;
  const slugs = isEnglish ? PRODUCT_TYPE_SLUGS_EN : PRODUCT_TYPE_SLUGS;
  const typeName = labels[productType];
  const typeSlug = slugs[productType];
  if (!typeName || !typeSlug) return null;
  const homeLabel = isEnglish ? 'Home' : 'Inicio';
  const destinationsLabel = isEnglish ? 'Destinations' : 'Destinos';
  const destinationsSlug = isEnglish ? 'destinations' : 'destinos';

  const hasDestination = product.location && productType !== 'destination';

  const items: Array<{ '@type': string; position: number; name: string; item?: string }> = [
    {
      '@type': 'ListItem',
      position: 1,
      name: homeLabel,
      item: websiteUrl,
    },
  ];

  let pos = 2;

  if (hasDestination) {
    items.push({
      '@type': 'ListItem',
      position: pos++,
      name: destinationsLabel,
      item: `${websiteUrl}/${destinationsSlug}`,
    });
    items.push({
      '@type': 'ListItem',
      position: pos++,
      name: product.location!,
      item: `${websiteUrl}/${destinationsSlug}/${slugify(product.location!)}`,
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

function buildOffer(
  product: ProductData,
  url?: string,
  organizationName?: string | null
): Record<string, unknown> | undefined {
  const optionMinPrice = Array.isArray(product.options)
    ? product.options
        .flatMap((option) => option?.prices ?? [])
        .map((p) => ({
          value: normalizeNumber(p?.price),
          currency: typeof p?.currency === 'string' ? p.currency.toUpperCase() : null,
        }))
        .filter((row): row is { value: number; currency: string | null } => row.value !== null && row.value > 0)
        .reduce<{ value: number; currency: string | null } | null>(
          (min, row) => (min === null || row.value < min.value ? row : min),
          null
        )
    : null;

  const fallbackPrice = normalizeNumber(product.price);
  const packageVersionPrice = normalizeNumber(product.package_version?.total_price);
  const packageVersionsMinPrice = Array.isArray(product.package_versions)
    ? product.package_versions
        .map((version) => normalizeNumber(version?.total_price))
        .filter((value): value is number => value !== null && value > 0)
        .reduce<number | null>((min, value) => (min === null || value < min ? value : min), null)
    : null;
  const price = optionMinPrice?.value ?? fallbackPrice ?? packageVersionPrice ?? packageVersionsMinPrice;
  if (price === null) {
    return undefined;
  }

  const currency = optionMinPrice?.currency
    || (typeof product.currency === 'string' ? product.currency.toUpperCase() : null)
    || (typeof product.package_version?.base_currency === 'string' ? product.package_version.base_currency.toUpperCase() : null)
    || (Array.isArray(product.package_versions)
      ? product.package_versions.find((version) => typeof version?.base_currency === 'string')?.base_currency.toUpperCase()
      : null);
  if (!currency) {
    return undefined;
  }

  const availability = resolveAvailability(product);
  const validUntil = resolveOfferValidUntil(product);
  const returnPolicy = buildMerchantReturnPolicy(product);

  return {
    '@type': 'Offer',
    url,
    price,
    priceCurrency: currency,
    availability,
    priceValidUntil: validUntil,
    itemCondition: 'https://schema.org/NewCondition',
    category: 'Travel',
    hasMerchantReturnPolicy: returnPolicy,
    seller: url
      ? {
          '@type': 'TravelAgency',
          ...(organizationName && { name: organizationName }),
          url: new URL(url).origin,
        }
      : undefined,
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

function buildTravelAgencyRef(url: string | undefined, organizationName: string | null | undefined): Record<string, unknown> | undefined {
  if (!url && !organizationName) return undefined;
  return {
    '@type': 'TravelAgency',
    ...(organizationName && { name: organizationName }),
    ...(url && { url: new URL(url).origin }),
  };
}

function getItineraryItems(product: ProductData): NonNullable<ProductData['itinerary_items']> {
  return (product.itinerary_items ?? []).filter((item) => item && typeof item.title === 'string' && item.title.trim());
}

function buildItineraryList(product: ProductData, inLanguage: string): Record<string, unknown> | undefined {
  const itinerary = getItineraryItems(product);
  if (itinerary.length === 0) return undefined;

  const language = localeToLanguage(normalizeLocale(inLanguage, 'es-CO'));
  const dayLabel = language === 'en' ? 'Day' : 'Día';
  return {
    '@type': 'ItemList',
    itemListElement: itinerary.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.title || `${dayLabel} ${i + 1}`,
      description: item.description || undefined,
      item: {
        '@type': 'TouristDestination',
        name: item.title || `${dayLabel} ${i + 1}`,
        description: item.description || undefined,
      },
    })),
  };
}

function buildProductPlaces(product: ProductData): Array<Record<string, unknown>> {
  const names = new Set<string>();
  for (const value of [product.location, product.city, product.country, product.region]) {
    if (typeof value === 'string' && value.trim().length > 0) names.add(value.trim());
  }
  for (const item of getItineraryItems(product)) {
    if (item.title?.trim()) names.add(item.title.trim());
  }
  return Array.from(names).slice(0, 12).map((name) => ({
    '@type': 'Place',
    name,
  }));
}

function resolveAvailability(product: ProductData): string | undefined {
  const raw = getStringField(product, ['availability', 'availability_status']);
  if (!raw) return undefined;
  const normalized = raw.toLowerCase().replace(/[\s_-]+/g, '');
  if (['instock', 'available', 'active', 'published'].includes(normalized)) return 'https://schema.org/InStock';
  if (['soldout', 'unavailable', 'outofstock'].includes(normalized)) return 'https://schema.org/OutOfStock';
  if (['preorder', 'preventa'].includes(normalized)) return 'https://schema.org/PreOrder';
  if (['limited', 'limitedavailability'].includes(normalized)) return 'https://schema.org/LimitedAvailability';
  return undefined;
}

function resolveOfferValidUntil(product: ProductData): string | undefined {
  const explicit = getStringField(product, ['price_valid_until', 'valid_until']);
  if (explicit && isDateLike(explicit)) return explicit.slice(0, 10);

  if (!Array.isArray(product.options)) return undefined;
  const validUntilValues = product.options
    .flatMap((option) => option?.prices ?? [])
    .map((price) => price?.valid_until)
    .filter((value): value is string => typeof value === 'string' && isDateLike(value))
    .sort();

  return validUntilValues[0]?.slice(0, 10);
}

function buildMerchantReturnPolicy(product: ProductData): Record<string, unknown> | undefined {
  const policy = getRecordField(product, 'cancellation_policy');
  if (policy) {
    const tiers = Array.isArray(policy.tiers) ? policy.tiers : [];
    const normalizedTiers = tiers
      .map((tier) => {
        if (!tier || typeof tier !== 'object') return null;
        const row = tier as Record<string, unknown>;
        const daysBefore = normalizeNumber(row.days_before);
        const refundPct = normalizeNumber(row.refund_pct);
        const label = typeof row.label === 'string' ? row.label.trim() : '';
        if (daysBefore === null || refundPct === null) return null;
        return { daysBefore, refundPct, label };
      })
      .filter((tier): tier is { daysBefore: number; refundPct: number; label: string } => tier !== null);

    if (normalizedTiers.length > 0) {
      const maxRefund = Math.max(...normalizedTiers.map((tier) => tier.refundPct));
      const maxDays = Math.max(...normalizedTiers.map((tier) => tier.daysBefore));
      return {
        '@type': 'MerchantReturnPolicy',
        returnPolicyCategory: maxRefund > 0
          ? 'https://schema.org/MerchantReturnFiniteReturnWindow'
          : 'https://schema.org/MerchantReturnNotPermitted',
        ...(maxRefund > 0 && { merchantReturnDays: maxDays }),
        refundType: maxRefund >= 100
          ? 'https://schema.org/FullRefund'
          : maxRefund > 0
            ? 'https://schema.org/PartialRefund'
            : undefined,
        description: normalizedTiers.map((tier) => tier.label).filter(Boolean).join('; ') || undefined,
      };
    }
  }

  const explicitRefundable = getBooleanField(product, ['is_refundable', 'refundable']);
  const optionRefundable = Array.isArray(product.options)
    ? product.options.find((option) => typeof option?.is_refundable === 'boolean')?.is_refundable
    : undefined;
  const isRefundable = explicitRefundable ?? optionRefundable;
  if (typeof isRefundable !== 'boolean') return undefined;

  return {
    '@type': 'MerchantReturnPolicy',
    returnPolicyCategory: isRefundable
      ? 'https://schema.org/MerchantReturnFiniteReturnWindow'
      : 'https://schema.org/MerchantReturnNotPermitted',
  };
}

function getStringField(product: ProductData, keys: string[]): string | undefined {
  const record = product as unknown as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  }
  return undefined;
}

function getBooleanField(product: ProductData, keys: string[]): boolean | undefined {
  const record = product as unknown as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'boolean') return value;
  }
  return undefined;
}

function getRecordField(product: ProductData, key: string): Record<string, unknown> | undefined {
  const value = (product as unknown as Record<string, unknown>)[key];
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function isDateLike(value: string): boolean {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed);
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

function getProductImages(product: ProductData): string[] {
  const urls: string[] = [];
  const add = (value: unknown) => {
    if (typeof value === 'string' && value.trim() && !urls.includes(value.trim())) {
      urls.push(value.trim());
    }
  };

  add(product.social_image);
  add(product.image);

  if (Array.isArray(product.photos)) {
    for (const photo of product.photos) {
      if (typeof photo === 'string') {
        add(photo);
      } else if (photo && typeof photo === 'object') {
        add((photo as { url?: unknown }).url);
      }
    }
  }

  if (Array.isArray(product.images)) {
    product.images.forEach(add);
  }

  return urls;
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
    return 'es-CO';
  }
  return normalizeLocale(language, 'es-CO');
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
