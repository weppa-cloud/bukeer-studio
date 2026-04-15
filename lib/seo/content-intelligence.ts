import type { ApiResponse } from '@/lib/api/response';

export type SeoConfidence = 'live' | 'partial' | 'exploratory';
export type SeoDecisionSource = {
  source: string;
  fetchedAt: string;
  confidence: SeoConfidence;
};

export const DECISION_GRADE_CONFIDENCE: SeoConfidence[] = ['live', 'partial'];

export const TRANSACTIONAL_ITEM_TYPES = new Set(['package', 'activity']);
export const TRANSACTIONAL_BLOCKED_FIELDS = new Set([
  'price',
  'availability',
  'itinerary',
  'itineraryTruth',
  'policies',
  'policy',
]);

const CONVERSION_PROBABILITY_BY_CONTENT_TYPE: Record<string, number> = {
  blog: 0.04,
  destination: 0.06,
  page: 0.05,
  landing: 0.07,
  package: 0.11,
  activity: 0.1,
  hotel: 0.08,
  transfer: 0.09,
};

const REVENUE_BY_CONTENT_TYPE: Record<string, number> = {
  blog: 220,
  destination: 310,
  page: 260,
  landing: 350,
  package: 1250,
  activity: 480,
  hotel: 920,
  transfer: 300,
};

export function buildSourceMeta(source: string, confidence: SeoConfidence): SeoDecisionSource {
  return {
    source,
    fetchedAt: new Date().toISOString(),
    confidence,
  };
}

export function withNoStoreHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'no-store');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function withSharedCacheHeaders(response: Response, ttlSeconds: number): Response {
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', `public, s-maxage=${ttlSeconds}, stale-while-revalidate=${ttlSeconds}`);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function isDecisionGrade(confidence: SeoConfidence): boolean {
  return DECISION_GRADE_CONFIDENCE.includes(confidence);
}

export function extractBlockedTransactionalFields(patch: Record<string, unknown>): string[] {
  return Object.keys(patch).filter((field) => TRANSACTIONAL_BLOCKED_FIELDS.has(field));
}

export function computePriorityScore(input: {
  searchVolume: number;
  contentType: string;
  locale?: string;
}): number {
  const conversionProbability =
    CONVERSION_PROBABILITY_BY_CONTENT_TYPE[input.contentType] ??
    CONVERSION_PROBABILITY_BY_CONTENT_TYPE.page;
  const revenuePerConversion =
    REVENUE_BY_CONTENT_TYPE[input.contentType] ??
    REVENUE_BY_CONTENT_TYPE.page;

  const localeMultiplier = input.locale?.toLowerCase().startsWith('en') ? 1.15 : 1;
  const raw = input.searchVolume * conversionProbability * revenuePerConversion * localeMultiplier;
  return Number(raw.toFixed(2));
}

export function parseLocaleParts(input: {
  sourceLocale?: string;
  targetLocale?: string;
  country?: string;
  language?: string;
}) {
  return {
    source_locale: input.sourceLocale,
    target_locale: input.targetLocale,
    country: input.country,
    language: input.language,
  };
}

export function okWithSource<T>(data: T, sourceMeta: SeoDecisionSource): ApiResponse<T & { sourceMeta: SeoDecisionSource }> {
  return {
    success: true,
    data: {
      ...(data as T & Record<string, unknown>),
      sourceMeta,
    },
  };
}
