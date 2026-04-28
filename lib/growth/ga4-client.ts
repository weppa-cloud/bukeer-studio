/**
 * Growth — GA4 Data API client wrapper
 *
 * Tenant-scoped wrapper over GA4 Data API v1beta. Adds:
 *   - Cache layer (6h TTL via ADR-016 tags)
 *   - Multi-tenant scoping by account_id + website_id (ADR-009) →
 *     property_id resolved per (account_id, website_id, locale).
 *   - Edge-safe (Web Crypto + fetch only)
 *
 * Cache tag pattern (ADR-016):
 *   growth:ga4:website:<website_id>:locale:<locale>
 *
 * @see SPEC #337 (W2 day 10-11) — A1 Backend/Contracts
 * @see lib/seo/google-client.ts — refreshGoogleToken reused
 * @see lib/analytics/track.ts — client-side GA4 dispatch (NOT server)
 */

import type { GrowthLocale } from '@bukeer/website-contract';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { refreshGoogleToken } from '@/lib/seo/google-client';

const GA4_DATA_ENDPOINT = 'https://analyticsdata.googleapis.com/v1beta';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h

export interface Ga4TenantScope {
  account_id: string;
  website_id: string;
  locale?: GrowthLocale;
}

export interface Ga4ReportInput extends Ga4TenantScope {
  /** ISO date YYYY-MM-DD inclusive */
  startDate: string;
  /** ISO date YYYY-MM-DD inclusive */
  endDate: string;
  metrics: string[]; // e.g. ['sessions','engagedSessions','conversions']
  dimensions?: string[]; // e.g. ['pagePath','sessionSource']
  /** Optional dimension filter expression (raw GA4 format) */
  dimensionFilter?: Record<string, unknown>;
  forceRefresh?: boolean;
  limit?: number;
}

export interface Ga4Row {
  dimensionValues: string[];
  metricValues: number[];
}

export interface Ga4ReportResult {
  rows: Ga4Row[];
  metricHeaders: string[];
  dimensionHeaders: string[];
  fetchedAt: string;
  cacheHit: boolean;
  cacheTag: string;
  propertyId: string | null;
  source: 'cache' | 'live' | 'mock';
}

export class Ga4ClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;
  constructor(code: string, message: string, status = 400, details?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

interface Ga4IntegrationRow {
  account_id: string;
  website_id: string;
  property_id: string | null;
  refresh_token: string | null;
  access_token: string | null;
  access_token_expires_at: string | null;
}

function buildCacheKey(input: Ga4ReportInput): string {
  return [
    input.startDate,
    input.endDate,
    input.metrics.join(','),
    (input.dimensions ?? []).join(','),
    input.locale ?? '*',
    String(input.limit ?? 1000),
    input.dimensionFilter ? JSON.stringify(input.dimensionFilter) : '*',
  ].join('|');
}

export function buildGa4CacheTag(input: Ga4TenantScope): string {
  return `growth:ga4:website:${input.website_id}:locale:${input.locale ?? '*'}`;
}

function isFresh(fetchedAtRaw: string | null | undefined): boolean {
  if (!fetchedAtRaw) return false;
  const t = new Date(fetchedAtRaw).getTime();
  if (!Number.isFinite(t)) return false;
  return Date.now() - t <= CACHE_TTL_MS;
}

async function loadGa4Integration(scope: Ga4TenantScope): Promise<Ga4IntegrationRow | null> {
  const admin = createSupabaseServiceRoleClient();
  const { data, error } = await admin
    .from('seo_integrations')
    .select('account_id,website_id,property_id,refresh_token,access_token,access_token_expires_at')
    .eq('account_id', scope.account_id)
    .eq('website_id', scope.website_id)
    .eq('provider', 'ga4')
    .maybeSingle();

  if (error) {
    throw new Ga4ClientError('INTEGRATION_READ_FAILED', 'Unable to load GA4 integration', 500, error.message);
  }
  return (data as Ga4IntegrationRow | null) ?? null;
}

async function ensureFreshAccessToken(integration: Ga4IntegrationRow): Promise<string> {
  const expiresAt = integration.access_token_expires_at
    ? new Date(integration.access_token_expires_at).getTime()
    : 0;
  if (integration.access_token && expiresAt - Date.now() > 60_000) {
    return integration.access_token;
  }
  if (!integration.refresh_token) {
    throw new Ga4ClientError('AUTH_NOT_CONFIGURED', 'GA4 refresh token missing for tenant', 503);
  }
  const refreshed = await refreshGoogleToken(integration.refresh_token);
  try {
    const admin = createSupabaseServiceRoleClient();
    const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
    await admin
      .from('seo_integrations')
      .update({
        access_token: refreshed.access_token,
        access_token_expires_at: newExpiresAt,
      })
      .eq('account_id', integration.account_id)
      .eq('website_id', integration.website_id)
      .eq('provider', 'ga4');
  } catch {
    // ignore
  }
  return refreshed.access_token;
}

export async function runGa4Report(input: Ga4ReportInput): Promise<Ga4ReportResult> {
  const cacheTag = buildGa4CacheTag(input);
  const cacheKey = buildCacheKey(input);
  const admin = createSupabaseServiceRoleClient();

  if (!input.forceRefresh) {
    const { data: cached } = await admin
      .from('growth_ga4_cache')
      .select('payload,fetched_at')
      .eq('website_id', input.website_id)
      .eq('cache_key', cacheKey)
      .maybeSingle();
    const row = cached as { payload: unknown; fetched_at: string } | null;
    if (row && isFresh(row.fetched_at) && row.payload && typeof row.payload === 'object') {
      const payload = row.payload as Pick<Ga4ReportResult, 'rows' | 'metricHeaders' | 'dimensionHeaders'>;
      return {
        rows: payload.rows ?? [],
        metricHeaders: payload.metricHeaders ?? input.metrics,
        dimensionHeaders: payload.dimensionHeaders ?? (input.dimensions ?? []),
        fetchedAt: row.fetched_at,
        cacheHit: true,
        cacheTag,
        propertyId: null,
        source: 'cache',
      };
    }
  }

  const integration = await loadGa4Integration(input);
  if (!integration?.property_id || !integration.refresh_token) {
    return {
      rows: [],
      metricHeaders: input.metrics,
      dimensionHeaders: input.dimensions ?? [],
      fetchedAt: new Date().toISOString(),
      cacheHit: false,
      cacheTag,
      propertyId: integration?.property_id ?? null,
      source: 'mock',
    };
  }

  const accessToken = await ensureFreshAccessToken(integration);

  const body: Record<string, unknown> = {
    dateRanges: [{ startDate: input.startDate, endDate: input.endDate }],
    metrics: input.metrics.map((name) => ({ name })),
    dimensions: (input.dimensions ?? []).map((name) => ({ name })),
    limit: String(input.limit ?? 1000),
  };
  if (input.dimensionFilter) body.dimensionFilter = input.dimensionFilter;

  const url = `${GA4_DATA_ENDPOINT}/properties/${integration.property_id}:runReport`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const text = await response.text();
    if (response.status === 401) {
      throw new Ga4ClientError('AUTH_EXPIRED', 'GA4 access token rejected', 401, text);
    }
    if (response.status === 429) {
      throw new Ga4ClientError('RATE_LIMIT', 'GA4 rate limited', 429, text);
    }
    throw new Ga4ClientError('UPSTREAM_ERROR', 'GA4 runReport failed', 502, text);
  }

  const json = (await response.json()) as {
    rows?: Array<{
      dimensionValues?: Array<{ value?: string }>;
      metricValues?: Array<{ value?: string }>;
    }>;
    metricHeaders?: Array<{ name?: string }>;
    dimensionHeaders?: Array<{ name?: string }>;
  };

  const rows: Ga4Row[] = (json.rows ?? []).map((r) => ({
    dimensionValues: (r.dimensionValues ?? []).map((d) => d.value ?? ''),
    metricValues: (r.metricValues ?? []).map((m) => Number(m.value ?? 0)),
  }));
  const metricHeaders = (json.metricHeaders ?? []).map((h) => h.name ?? '');
  const dimensionHeaders = (json.dimensionHeaders ?? []).map((h) => h.name ?? '');

  const fetchedAt = new Date().toISOString();
  try {
    await admin.from('growth_ga4_cache').upsert(
      {
        website_id: input.website_id,
        account_id: input.account_id,
        cache_key: cacheKey,
        cache_tag: cacheTag,
        payload: { rows, metricHeaders, dimensionHeaders },
        fetched_at: fetchedAt,
      },
      { onConflict: 'website_id,cache_key' },
    );
  } catch {
    // ignore
  }

  return {
    rows,
    metricHeaders,
    dimensionHeaders,
    fetchedAt,
    cacheHit: false,
    cacheTag,
    propertyId: integration.property_id,
    source: 'live',
  };
}
