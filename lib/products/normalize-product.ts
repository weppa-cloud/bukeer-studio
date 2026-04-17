import type {
  MeetingPoint,
  ProductData,
  ProductFAQ,
  ProductPageCustomization,
  ScheduleEntry,
} from '@bukeer/website-contract';

type LogSource = 'v2' | 'legacy' | 'null';

export interface ProductNormalizeLog {
  field: keyof NormalizedProductViewModel;
  from: LogSource;
  to: LogSource;
}

export interface NormalizedMeetingPoint {
  location: string | null;
  instructions: string | null;
  raw: MeetingPoint | null;
}

export interface NormalizedProductViewModel {
  inclusions: Array<string | Record<string, unknown>> | null;
  exclusions: Array<string | Record<string, unknown>> | null;
  highlights: Array<string | Record<string, unknown>> | null;
  schedule: Array<ScheduleEntry | Record<string, unknown>> | null;
  meeting_point: NormalizedMeetingPoint | null;
  gallery: string[];
  price: number | null;
  rating: number | null;
  faq: ProductFAQ[] | null;
}

export interface NormalizeProductOptions {
  page?: ProductPageCustomization | null;
  logger?: (event: ProductNormalizeLog) => void;
}

const defaultLogger = (event: ProductNormalizeLog) => {
  console.warn('[product.normalize] fallback', event);
};

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseNumeric(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function splitLegacyText(value: string): string[] | null {
  const items = value
    .split(/\n|,|;/g)
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length > 0 ? items : null;
}

function normalizeV2ListValue(value: unknown): Array<string | Record<string, unknown>> | null {
  if (Array.isArray(value)) {
    const rows = value.filter(
      (item) => typeof item === 'string' || (item !== null && typeof item === 'object')
    ) as Array<string | Record<string, unknown>>;
    return rows.length ? rows : null;
  }
  return null;
}

function fallbackLogger(
  logger: (event: ProductNormalizeLog) => void,
  field: keyof NormalizedProductViewModel,
  from: LogSource,
  to: LogSource
) {
  logger({ field, from, to });
}

function normalizeListWithPrecedence(
  field: 'inclusions' | 'exclusions',
  v2Value: unknown,
  logger: (event: ProductNormalizeLog) => void
): Array<string | Record<string, unknown>> | null {
  const normalizedV2 = normalizeV2ListValue(v2Value);
  if (normalizedV2) {
    return normalizedV2;
  }

  if (typeof v2Value === 'string') {
    const legacySplit = splitLegacyText(v2Value);
    if (legacySplit) {
      fallbackLogger(logger, field, 'v2', 'legacy');
      return legacySplit;
    }
  }

  fallbackLogger(logger, field, 'v2', 'null');
  return null;
}

function normalizeHighlights(
  value: unknown,
  logger: (event: ProductNormalizeLog) => void
): Array<string | Record<string, unknown>> | null {
  if (Array.isArray(value)) {
    const rows = value.filter(
      (item) => typeof item === 'string' || (item !== null && typeof item === 'object')
    ) as Array<string | Record<string, unknown>>;
    return rows.length ? rows : null;
  }

  fallbackLogger(logger, 'highlights', 'v2', 'null');
  return null;
}

function normalizeSchedule(
  product: ProductData,
  logger: (event: ProductNormalizeLog) => void
): Array<ScheduleEntry | Record<string, unknown>> | null {
  if (Array.isArray(product.schedule) && product.schedule.length > 0) {
    return product.schedule as Array<ScheduleEntry | Record<string, unknown>>;
  }

  const legacyProduct = product as ProductData & { schedule_data?: unknown };
  if (Array.isArray(legacyProduct.schedule_data) && legacyProduct.schedule_data.length > 0) {
    fallbackLogger(logger, 'schedule', 'v2', 'legacy');
    return legacyProduct.schedule_data as Array<ScheduleEntry | Record<string, unknown>>;
  }

  if (Array.isArray(product.itinerary_items) && product.itinerary_items.length > 0) {
    fallbackLogger(logger, 'schedule', 'legacy', 'legacy');
    return product.itinerary_items as Array<ScheduleEntry | Record<string, unknown>>;
  }

  fallbackLogger(logger, 'schedule', 'legacy', 'null');
  return null;
}

function normalizeMeetingPoint(
  product: ProductData,
  logger: (event: ProductNormalizeLog) => void
): NormalizedMeetingPoint | null {
  if (product.meeting_point) {
    const parts = [
      product.meeting_point.address,
      product.meeting_point.city,
      product.meeting_point.state,
      product.meeting_point.country,
    ].filter(Boolean);

    return {
      location: parts.length > 0 ? parts.join(', ') : null,
      instructions: asNonEmptyString(product.instructions),
      raw: product.meeting_point,
    };
  }

  const legacy = product as ProductData & {
    meeting_point_location?: unknown;
    meeting_point_instructions?: unknown;
  };
  const legacyLocation = asNonEmptyString(legacy.meeting_point_location) || asNonEmptyString(product.location);
  const legacyInstructions = asNonEmptyString(legacy.meeting_point_instructions) || asNonEmptyString(product.instructions);

  if (legacyLocation || legacyInstructions) {
    fallbackLogger(logger, 'meeting_point', 'v2', 'legacy');
    return {
      location: legacyLocation,
      instructions: legacyInstructions,
      raw: null,
    };
  }

  fallbackLogger(logger, 'meeting_point', 'legacy', 'null');
  return null;
}

function normalizeGallery(product: ProductData, logger: (event: ProductNormalizeLog) => void): string[] {
  if (Array.isArray(product.photos) && product.photos.length > 0) {
    const urls = product.photos
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && typeof item.url === 'string') return item.url;
        return null;
      })
      .filter((url): url is string => Boolean(url));

    if (urls.length > 0) {
      return urls;
    }
  }

  if (Array.isArray(product.images) && product.images.length > 0) {
    fallbackLogger(logger, 'gallery', 'v2', 'legacy');
    return product.images;
  }

  if (asNonEmptyString(product.image)) {
    fallbackLogger(logger, 'gallery', 'legacy', 'legacy');
    return [product.image as string];
  }

  fallbackLogger(logger, 'gallery', 'legacy', 'null');
  return [];
}

function minActivityOptionPrice(product: ProductData): number | null {
  if (!Array.isArray(product.options) || product.options.length === 0) {
    return null;
  }

  const prices = product.options
    .flatMap((option) => option.prices || [])
    .map((price) => parseNumeric(price.price))
    .filter((value): value is number => value !== null && value > 0);

  if (prices.length === 0) {
    return null;
  }

  return Math.min(...prices);
}

function normalizePrice(product: ProductData, logger: (event: ProductNormalizeLog) => void): number | null {
  const optionMinPrice = minActivityOptionPrice(product);
  if (optionMinPrice !== null) {
    return optionMinPrice;
  }

  const fallbackPrice = parseNumeric(product.price);
  if (fallbackPrice !== null && fallbackPrice > 0) {
    fallbackLogger(logger, 'price', 'v2', 'legacy');
    return fallbackPrice;
  }

  fallbackLogger(logger, 'price', 'legacy', 'null');
  return null;
}

function normalizeRating(product: ProductData, logger: (event: ProductNormalizeLog) => void): number | null {
  const v2Rating = parseNumeric(product.user_rating);
  if (v2Rating !== null) {
    return v2Rating;
  }

  const legacyRating = parseNumeric(product.rating);
  if (legacyRating !== null) {
    fallbackLogger(logger, 'rating', 'v2', 'legacy');
    return legacyRating;
  }

  fallbackLogger(logger, 'rating', 'legacy', 'null');
  return null;
}

function normalizeFaq(
  page: ProductPageCustomization | null | undefined,
  logger: (event: ProductNormalizeLog) => void
): ProductFAQ[] | null {
  if (Array.isArray(page?.custom_faq) && page.custom_faq.length > 0) {
    return page.custom_faq;
  }

  fallbackLogger(logger, 'faq', 'v2', 'null');
  return null;
}

export function normalizeProduct(
  product: ProductData,
  options: NormalizeProductOptions = {}
): NormalizedProductViewModel {
  const logger = options.logger || defaultLogger;

  return {
    inclusions: normalizeListWithPrecedence('inclusions', product.inclusions, logger),
    exclusions: normalizeListWithPrecedence('exclusions', product.exclusions, logger),
    highlights: normalizeHighlights(product.highlights, logger),
    schedule: normalizeSchedule(product, logger),
    meeting_point: normalizeMeetingPoint(product, logger),
    gallery: normalizeGallery(product, logger),
    price: normalizePrice(product, logger),
    rating: normalizeRating(product, logger),
    faq: normalizeFaq(options.page, logger),
  };
}
