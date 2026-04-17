import type { ApiResponse } from '@/lib/api/response';

export type SeoConfidence = 'live' | 'partial' | 'exploratory';
export type SeoDecisionSource = {
  source: string;
  fetchedAt: string;
  confidence: SeoConfidence;
};

export type SeoContentIntelligenceCacheTagInput = {
  route: 'audit' | 'research' | 'clusters' | 'track';
  websiteId?: string;
  locale?: string | null;
  contentType?: string | null;
  clusterId?: string | null;
  country?: string | null;
  language?: string | null;
  mode?: 'decision-grade' | 'exploratory';
};

export const DECISION_GRADE_CONFIDENCE: SeoConfidence[] = ['live'];
export const DECISION_GRADE_ERROR_CODE = 'DECISION_GRADE_BLOCKED';
export const AUTHORITATIVE_SOURCE_REQUIRED_CODE = 'AUTHORITATIVE_SOURCE_REQUIRED';
export const SYNC_QUEUED_CODE = 'SYNC_QUEUED';

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

function normalizeCacheTag(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9:_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-:]+|[-:]+$/g, '');
}

function applyCacheTags(headers: Headers, tags: string[]): void {
  const normalized = Array.from(
    new Set(
      tags
        .map((tag) => normalizeCacheTag(tag))
        .filter((tag) => tag.length > 0),
    ),
  ).sort();

  if (normalized.length > 0) {
    headers.set('Cache-Tag', normalized.join(','));
  }
}

export function buildSeoContentIntelligenceCacheTags(input: SeoContentIntelligenceCacheTagInput): string[] {
  const tags = [
    'seo-content-intelligence',
    `seo-content-intelligence:route:${input.route}`,
    input.websiteId ? `seo-content-intelligence:website:${input.websiteId}` : null,
    input.locale ? `seo-content-intelligence:locale:${input.locale}` : null,
    input.contentType ? `seo-content-intelligence:content-type:${input.contentType}` : null,
    input.clusterId ? `seo-content-intelligence:cluster:${input.clusterId}` : null,
    input.country ? `seo-content-intelligence:country:${input.country}` : null,
    input.language ? `seo-content-intelligence:language:${input.language}` : null,
    input.country && input.language
      ? `seo-content-intelligence:market:${input.country}:${input.language}${input.locale ? `:${input.locale}` : ''}`
      : null,
    `seo-content-intelligence:mode:${input.mode ?? 'decision-grade'}`,
  ];

  return Array.from(new Set(tags.filter((tag): tag is string => Boolean(tag)))).sort();
}

export function withNoStoreHeaders(response: Response, tags: string[] = []): Response {
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'no-store');
  applyCacheTags(headers, tags);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function withSharedCacheHeaders(response: Response, ttlSeconds: number, tags: string[] = []): Response {
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', `public, s-maxage=${ttlSeconds}, stale-while-revalidate=${ttlSeconds}`);
  applyCacheTags(headers, tags);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function isDecisionGrade(confidence: SeoConfidence): boolean {
  return DECISION_GRADE_CONFIDENCE.includes(confidence);
}

export function isDecisionGradeRow(row: {
  confidence?: SeoConfidence | null;
  decision_grade_ready?: boolean | null;
}): boolean {
  const confidence = row.confidence ?? null;
  return confidence === 'live' && row.decision_grade_ready === true;
}

export function buildDecisionGradeBlockDetails(input: {
  route: 'audit' | 'research' | 'track';
  websiteId: string;
  locale?: string;
  contentType?: string;
  from?: string;
  to?: string;
  missingSources: string[];
  syncRequestId?: string;
}) {
  return {
    code: AUTHORITATIVE_SOURCE_REQUIRED_CODE,
    route: input.route,
    websiteId: input.websiteId,
    locale: input.locale ?? null,
    contentType: input.contentType ?? null,
    from: input.from ?? null,
    to: input.to ?? null,
    missingSources: input.missingSources,
    sync: input.syncRequestId
      ? {
          code: SYNC_QUEUED_CODE,
          requestId: input.syncRequestId,
        }
      : null,
  };
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
