import type {
  MeetingPoint,
  ProductData,
  ProductFAQ,
  ProductPageCustomization,
  ScheduleEntry,
  ScheduleEventType,
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
  priceCurrency: string | null;
  rating: number | null;
  faq: ProductFAQ[] | null;
}

export interface NormalizeProductOptions {
  page?: ProductPageCustomization | null;
  logger?: (event: ProductNormalizeLog) => void;
}

const defaultLogger = () => {
  // Fallbacks are expected while legacy catalog rows are progressively
  // normalized. Callers can pass a logger when they need diagnostics.
};

const INTERNAL_COPY_PATTERNS: RegExp[] = [
  /\bplan\s+pam\b/gi,
  /\bvisitor\b/gi,
  /\bpasaporte\s+natural\b/gi,
  /\b\d+\s*(?:a|-|–)\s*\d+\s*pax(?:\s*\d{4})?\b/gi,
  /\b\d+\s*pax(?:\s*\d{4})?\b/gi,
];

export function sanitizeProductCopy(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  let output = value;
  for (const pattern of INTERNAL_COPY_PATTERNS) {
    output = output.replace(pattern, ' ');
  }

  output = output
    .replace(/\b\d{4}\b(?=\s*$)/g, ' ')
    .replace(/\s+[-|/,:;]+\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return output;
}

export function sanitizeProductCopyNullable(value: unknown): string | null {
  const sanitized = sanitizeProductCopy(value);
  return sanitized.length > 0 ? sanitized : null;
}

function asNonEmptyString(value: unknown): string | null {
  return sanitizeProductCopyNullable(value);
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

const SCHEDULE_EVENT_TYPES: readonly ScheduleEventType[] = [
  'transport',
  'activity',
  'meal',
  'lodging',
  'free_time',
  'flight',
];

function isScheduleEventType(value: unknown): value is ScheduleEventType {
  return typeof value === 'string' && SCHEDULE_EVENT_TYPES.includes(value as ScheduleEventType);
}

function normalizeDay(value: unknown): number | undefined {
  const numeric = parseNumeric(value);
  if (numeric === null) return undefined;
  const rounded = Math.trunc(numeric);
  return rounded > 0 ? rounded : undefined;
}

function inferScheduleEventTypeFromText(text: string): ScheduleEventType | null {
  const normalized = text.toLowerCase();

  if (/\b(vuelo|flight|aeropuerto|airline|boarding)\b/.test(normalized)) return 'flight';
  if (/\b(traslado|transfer|transporte|bus|tren|shuttle|pickup)\b/.test(normalized)) return 'transport';
  if (/\b(desayuno|almuerzo|cena|comida|meal|dinner|lunch|breakfast)\b/.test(normalized)) return 'meal';
  if (/\b(hotel|hospedaje|alojamiento|check-?in|check-?out|lodging)\b/.test(normalized)) return 'lodging';
  if (/\b(libre|free time|tiempo libre|descanso)\b/.test(normalized)) return 'free_time';
  return null;
}

function defaultScheduleEventTypeByProductType(productType: ProductData['type'] | undefined): ScheduleEventType {
  switch (productType) {
    case 'transfer':
      return 'transport';
    case 'hotel':
      return 'lodging';
    case 'activity':
      return 'activity';
    case 'destination':
    case 'package':
    default:
      return 'activity';
  }
}

function resolveScheduleEventType(
  source: { event_type?: unknown; title?: unknown; description?: unknown },
  defaultType: ScheduleEventType
): ScheduleEventType {
  if (isScheduleEventType(source.event_type)) {
    return source.event_type;
  }

  const hint = inferScheduleEventTypeFromText(
    `${sanitizeProductCopy(source.title)} ${sanitizeProductCopy(source.description)}`
  );
  if (hint) {
    return hint;
  }

  return defaultType;
}

function splitLegacyText(value: string): string[] | null {
  const items = value
    .split(/\n|,|;/g)
    .map((item) => sanitizeProductCopy(item))
    .filter(Boolean);
  return items.length > 0 ? items : null;
}

function normalizeV2ListValue(value: unknown): Array<string | Record<string, unknown>> | null {
  if (Array.isArray(value)) {
    const rows = value
      .map((item) => {
        if (typeof item === 'string') {
          const cleaned = sanitizeProductCopy(item);
          return cleaned.length > 0 ? cleaned : null;
        }

        if (item !== null && typeof item === 'object') {
          return item as Record<string, unknown>;
        }

        return null;
      })
      .filter(Boolean) as Array<string | Record<string, unknown>>;
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
  logger: (event: ProductNormalizeLog) => void,
  programValue?: string[] | null
): Array<string | Record<string, unknown>> | null {
  // program_* fields (Gate B — package aggregated, #172) take highest precedence
  if (Array.isArray(programValue) && programValue.length > 0) {
    return programValue;
  }

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
    const rows = value
      .map((item) => {
        if (typeof item === 'string') {
          const cleaned = sanitizeProductCopy(item);
          return cleaned.length > 0 ? cleaned : null;
        }

        if (item !== null && typeof item === 'object') {
          return item as Record<string, unknown>;
        }

        return null;
      })
      .filter(Boolean) as Array<string | Record<string, unknown>>;
    return rows.length ? rows : null;
  }

  fallbackLogger(logger, 'highlights', 'v2', 'null');
  return null;
}

function normalizeSchedule(
  product: ProductData,
  logger: (event: ProductNormalizeLog) => void
): Array<ScheduleEntry | Record<string, unknown>> | null {
  const productDefaultEventType = defaultScheduleEventTypeByProductType(product.type);

  if (Array.isArray(product.schedule) && product.schedule.length > 0) {
    const cleaned = product.schedule.reduce<ScheduleEntry[]>((acc, entry) => {
      if (!entry || typeof entry !== 'object') return acc;
      const cleanedTitle = sanitizeProductCopyNullable(entry.title);
      if (!cleanedTitle) return acc;
      const event_type = resolveScheduleEventType(entry, productDefaultEventType);
      acc.push({
        ...entry,
        day: normalizeDay(entry.day),
        title: cleanedTitle,
        description: sanitizeProductCopyNullable(entry.description) || undefined,
        event_type,
      });
      return acc;
    }, []);
    return cleaned.length > 0 ? cleaned : null;
  }

  const legacyProduct = product as ProductData & { schedule_data?: unknown };
  if (Array.isArray(legacyProduct.schedule_data) && legacyProduct.schedule_data.length > 0) {
    fallbackLogger(logger, 'schedule', 'v2', 'legacy');
    const cleaned = legacyProduct.schedule_data.reduce<ScheduleEntry[]>((acc, entry) => {
      if (!entry || typeof entry !== 'object') return acc;
      const source = entry as Record<string, unknown>;
      const cleanedTitle = sanitizeProductCopyNullable(source.title);
      if (!cleanedTitle) return acc;
      // Legacy `schedule_data` (activities table) historically has no `event_type`.
      // Fallback order: explicit event_type -> title/description keyword inference -> `activity`.
      const event_type = resolveScheduleEventType(source, 'activity');
      acc.push({
        day: normalizeDay(source.day),
        title: cleanedTitle,
        description: sanitizeProductCopyNullable(source.description) || undefined,
        event_type,
      });
      return acc;
    }, []);
    return cleaned.length > 0 ? cleaned : null;
  }

  if (Array.isArray(product.itinerary_items) && product.itinerary_items.length > 0) {
    fallbackLogger(logger, 'schedule', 'legacy', 'legacy');
    const cleaned = product.itinerary_items.reduce<ScheduleEntry[]>((acc, entry) => {
      if (!entry || typeof entry !== 'object') return acc;
      const cleanedTitle = sanitizeProductCopyNullable(entry.title);
      if (!cleanedTitle) return acc;
      // Legacy `itinerary_items` can mix event kinds but are often untyped.
      // Fallback order: explicit event_type -> title/description keyword inference -> product-derived default.
      const event_type = resolveScheduleEventType(entry, productDefaultEventType);
      acc.push({
        day: normalizeDay(entry.day),
        title: cleanedTitle,
        description: sanitizeProductCopyNullable(entry.description) || undefined,
        event_type,
      });
      return acc;
    }, []);
    return cleaned.length > 0 ? cleaned : null;
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

function normalizeGallery(product: ProductData & { program_gallery?: unknown }, logger: (event: ProductNormalizeLog) => void): string[] {
  // program_gallery (Gate B — package aggregated, #172) takes highest precedence.
  // Accepts either `string[]` (legacy) or `{url, alt?}[]` (current SSR shape —
  // activity/package branch of `get_website_product_page` returns objects).
  if (Array.isArray(product.program_gallery) && product.program_gallery.length > 0) {
    const urls = (product.program_gallery as unknown[])
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          const rec = item as Record<string, unknown>;
          if (typeof rec.url === 'string') return rec.url;
        }
        return null;
      })
      .filter((url): url is string => Boolean(url));
    if (urls.length > 0) {
      return urls;
    }
  }

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

interface PriceWithCurrency {
  value: number;
  currency: string | null;
}

function minActivityOptionPrice(product: ProductData): PriceWithCurrency | null {
  if (!Array.isArray(product.options) || product.options.length === 0) {
    return null;
  }

  const rows = product.options
    .flatMap((option) => option.prices || [])
    .map((price) => {
      const numeric = parseNumeric(price.price);
      if (numeric === null || numeric <= 0) return null;
      const currency = typeof price.currency === 'string' && price.currency.trim().length > 0
        ? price.currency.trim().toUpperCase()
        : null;
      return { value: numeric, currency };
    })
    .filter((row): row is PriceWithCurrency => Boolean(row));

  if (rows.length === 0) {
    return null;
  }

  return rows.reduce((min, row) => (row.value < min.value ? row : min), rows[0]);
}

function normalizePrice(
  product: ProductData,
  logger: (event: ProductNormalizeLog) => void
): { value: number; currency: string | null } | null {
  const optionMinPrice = minActivityOptionPrice(product);
  if (optionMinPrice !== null) {
    return optionMinPrice;
  }

  const fallbackPrice = parseNumeric(product.price);
  if (fallbackPrice !== null && fallbackPrice > 0) {
    fallbackLogger(logger, 'price', 'v2', 'legacy');
    const currency = typeof product.currency === 'string' && product.currency.trim().length > 0
      ? product.currency.trim().toUpperCase()
      : null;
    return { value: fallbackPrice, currency };
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
    const cleaned = page.custom_faq
      .map((faq) => ({
        question: sanitizeProductCopy(faq.question),
        answer: sanitizeProductCopy(faq.answer),
      }))
      .filter((faq) => faq.question.length > 0 && faq.answer.length > 0);

    return cleaned.length > 0 ? cleaned : null;
  }

  fallbackLogger(logger, 'faq', 'v2', 'null');
  return null;
}

/**
 * Sanitize AI-generated marketing copy (renamed to avoid collision with legacy sanitizeProductCopy).
 */
export function sanitizeAiMarketingCopy(text: string, maxLength = 500): string {
  return text
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function normalizeProduct(
  product: ProductData & {
    program_inclusions?: string[] | null;
    program_exclusions?: string[] | null;
    program_gallery?: Array<string | { url: string; alt?: string; caption?: string }> | null;
    program_highlights?: string[] | null;
  },
  options: NormalizeProductOptions = {}
): NormalizedProductViewModel {
  const logger = options.logger || defaultLogger;
  const priceResult = normalizePrice(product, logger);

  return {
    inclusions: normalizeListWithPrecedence(
      'inclusions',
      product.inclusions,
      logger,
      product.program_inclusions
    ),
    exclusions: normalizeListWithPrecedence(
      'exclusions',
      product.exclusions,
      logger,
      product.program_exclusions
    ),
    highlights: normalizeHighlights(
      Array.isArray(product.program_highlights) && product.program_highlights.length > 0
        ? product.program_highlights
        : product.highlights,
      logger
    ),
    schedule: normalizeSchedule(product, logger),
    meeting_point: normalizeMeetingPoint(product, logger),
    gallery: normalizeGallery(product, logger),
    price: priceResult?.value ?? null,
    priceCurrency: priceResult?.currency ?? null,
    rating: normalizeRating(product, logger),
    faq: normalizeFaq(options.page, logger),
  };
}
