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
const GA4_ADMIN_ENDPOINT = 'https://analyticsadmin.googleapis.com/v1beta';
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

export interface Ga4AdminGovernancePlan extends Ga4TenantScope {
  profileId: 'ga4_admin_governance_v1';
  dryRun: boolean;
  checks: Array<'key_events' | 'audiences' | 'data_streams'>;
}

export interface Ga4AdminGovernanceResult {
  plan: Ga4AdminGovernancePlan;
  propertyId: string | null;
  keyEvents: Array<Record<string, unknown>>;
  audiences: Array<Record<string, unknown>>;
  dataStreams: Array<Record<string, unknown>>;
  fetchedAt: string;
  source: 'live' | 'mock';
}

export interface Ga4BatchReportInput extends Ga4TenantScope {
  requests: Array<Omit<Ga4ReportInput, keyof Ga4TenantScope | 'forceRefresh'>>;
  dryRun?: boolean;
}

export interface Ga4PivotReportInput extends Ga4ReportInput {
  pivots: Array<Record<string, unknown>>;
  dryRun?: boolean;
}

export interface Ga4RealtimeSmokeInput extends Ga4TenantScope {
  metrics?: string[];
  dimensions?: string[];
  minuteRanges?: Array<Record<string, unknown>>;
  dryRun?: boolean;
}

export interface Ga4ProviderPlan extends Ga4TenantScope {
  profileId: 'ga4_batch_funnel_v1' | 'ga4_pivot_funnel_v1' | 'ga4_realtime_smoke_v1';
  body: Record<string, unknown>;
  dryRun: boolean;
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

function assertReportScope(metrics: string[], dimensions: string[], metricCap = 10, dimensionCap = 9): void {
  if (!Array.isArray(metrics) || metrics.length === 0) {
    throw new Ga4ClientError('INVALID_PROFILE_INPUT', 'At least one GA4 metric is required', 400);
  }
  if (metrics.length > metricCap) {
    throw new Ga4ClientError('PROFILE_SCOPE_TOO_BROAD', `GA4 metric cap is ${metricCap}`, 400, { count: metrics.length });
  }
  if (dimensions.length > dimensionCap) {
    throw new Ga4ClientError('PROFILE_SCOPE_TOO_BROAD', `GA4 dimension cap is ${dimensionCap}`, 400, {
      count: dimensions.length,
    });
  }
}

function reportBody(input: Pick<Ga4ReportInput, 'startDate' | 'endDate' | 'metrics' | 'dimensions' | 'dimensionFilter' | 'limit'>): Record<string, unknown> {
  assertReportScope(input.metrics, input.dimensions ?? []);
  const body: Record<string, unknown> = {
    dateRanges: [{ startDate: input.startDate, endDate: input.endDate }],
    metrics: input.metrics.map((name) => ({ name })),
    dimensions: (input.dimensions ?? []).map((name) => ({ name })),
    limit: String(input.limit ?? 1000),
  };
  if (input.dimensionFilter) body.dimensionFilter = input.dimensionFilter;
  return body;
}

export function buildGa4AdminGovernancePlan(
  input: Ga4TenantScope & { dryRun?: boolean; checks?: Ga4AdminGovernancePlan['checks'] },
): Ga4AdminGovernancePlan {
  return {
    account_id: input.account_id,
    website_id: input.website_id,
    locale: input.locale,
    profileId: 'ga4_admin_governance_v1',
    dryRun: input.dryRun ?? true,
    checks: input.checks ?? ['key_events', 'audiences', 'data_streams'],
  };
}

export function buildGa4BatchReportPlan(input: Ga4BatchReportInput): Ga4ProviderPlan {
  if (input.requests.length === 0) {
    throw new Ga4ClientError('INVALID_PROFILE_INPUT', 'At least one GA4 batch request is required', 400);
  }
  if (input.requests.length > 5) {
    throw new Ga4ClientError('PROFILE_SCOPE_TOO_BROAD', 'GA4 batch request cap is 5', 400, {
      count: input.requests.length,
    });
  }
  return {
    account_id: input.account_id,
    website_id: input.website_id,
    locale: input.locale,
    profileId: 'ga4_batch_funnel_v1',
    dryRun: input.dryRun ?? true,
    body: { requests: input.requests.map(reportBody) },
  };
}

export function buildGa4PivotReportPlan(input: Ga4PivotReportInput): Ga4ProviderPlan {
  if (input.pivots.length === 0 || input.pivots.length > 2) {
    throw new Ga4ClientError('PROFILE_SCOPE_TOO_BROAD', 'GA4 pivot count must be 1-2', 400, { count: input.pivots.length });
  }
  const body = reportBody(input);
  delete body.limit;
  const pivots = input.pivots.map((pivot) => ({
    ...pivot,
    limit: pivot.limit === undefined ? undefined : String(pivot.limit),
    offset: pivot.offset === undefined ? undefined : String(pivot.offset),
  }));
  return {
    account_id: input.account_id,
    website_id: input.website_id,
    locale: input.locale,
    profileId: 'ga4_pivot_funnel_v1',
    dryRun: input.dryRun ?? true,
    body: { ...body, pivots },
  };
}

export function buildGa4RealtimeSmokePlan(input: Ga4RealtimeSmokeInput): Ga4ProviderPlan {
  const metrics = input.metrics ?? ['activeUsers'];
  const dimensions = input.dimensions ?? [];
  assertReportScope(metrics, dimensions, 5, 4);
  return {
    account_id: input.account_id,
    website_id: input.website_id,
    locale: input.locale,
    profileId: 'ga4_realtime_smoke_v1',
    dryRun: input.dryRun ?? true,
    body: {
      metrics: metrics.map((name) => ({ name })),
      dimensions: dimensions.map((name) => ({ name })),
      minuteRanges: input.minuteRanges ?? [{ name: 'last_30_minutes', startMinutesAgo: 29, endMinutesAgo: 0 }],
    },
  };
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
        status: 'connected',
        access_token: refreshed.access_token,
        access_token_expires_at: newExpiresAt,
        last_error: null,
      })
      .eq('account_id', integration.account_id)
      .eq('website_id', integration.website_id)
      .eq('provider', 'ga4');
  } catch {
    // ignore
  }
  return refreshed.access_token;
}

async function ga4Fetch<T>(url: string, accessToken: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    signal: init?.signal ?? AbortSignal.timeout(15_000),
  });
  const json = (await response.json().catch(() => ({}))) as T;
  if (!response.ok) {
    if (response.status === 401) throw new Ga4ClientError('AUTH_EXPIRED', 'GA4 access token rejected', 401, json);
    if (response.status === 429) throw new Ga4ClientError('RATE_LIMIT', 'GA4 rate limited', 429, json);
    throw new Ga4ClientError('UPSTREAM_ERROR', 'GA4 request failed', response.status >= 500 ? 502 : response.status, json);
  }
  return json;
}

async function ga4FetchOptionalList<T extends Record<string, unknown>>({
  accessToken,
  primaryUrl,
  fallbackUrl,
  field,
  fallbackField,
}: {
  accessToken: string;
  primaryUrl: string;
  fallbackUrl?: string;
  field: string;
  fallbackField?: string;
}): Promise<T[]> {
  const fetchList = async (url: string, responseField: string) => {
    const json = await ga4Fetch<Record<string, unknown>>(url, accessToken);
    const rows = json[responseField];
    return Array.isArray(rows) ? (rows as T[]) : [];
  };

  try {
    return await fetchList(primaryUrl, field);
  } catch (error) {
    if (
      fallbackUrl &&
      error instanceof Ga4ClientError &&
      (error.status === 404 || error.status === 400)
    ) {
      try {
        return await fetchList(fallbackUrl, fallbackField ?? field);
      } catch {
        return [];
      }
    }
    if (error instanceof Ga4ClientError && (error.status === 404 || error.status === 403)) {
      return [];
    }
    throw error;
  }
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

  const body = reportBody(input);

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

export async function runGa4AdminGovernance(
  plan: Ga4AdminGovernancePlan,
): Promise<Ga4AdminGovernanceResult> {
  if (plan.dryRun) {
    return {
      plan,
      propertyId: null,
      keyEvents: [],
      audiences: [],
      dataStreams: [],
      fetchedAt: new Date().toISOString(),
      source: 'mock',
    };
  }
  const integration = await loadGa4Integration(plan);
  if (!integration?.property_id || !integration.refresh_token) {
    return {
      plan,
      propertyId: integration?.property_id ?? null,
      keyEvents: [],
      audiences: [],
      dataStreams: [],
      fetchedAt: new Date().toISOString(),
      source: 'mock',
    };
  }
  const accessToken = await ensureFreshAccessToken(integration);
  const property = `properties/${integration.property_id}`;
  const [keyEventsJson, audiencesJson, dataStreamsJson] = await Promise.all([
    plan.checks.includes('key_events')
      ? ga4FetchOptionalList<Record<string, unknown>>({
          accessToken,
          primaryUrl: `${GA4_ADMIN_ENDPOINT}/${property}/keyEvents`,
          fallbackUrl: `${GA4_ADMIN_ENDPOINT}/${property}/conversionEvents`,
          field: 'keyEvents',
          fallbackField: 'conversionEvents',
        })
      : Promise.resolve([]),
    plan.checks.includes('audiences')
      ? ga4FetchOptionalList<Record<string, unknown>>({
          accessToken,
          primaryUrl: `${GA4_ADMIN_ENDPOINT}/${property}/audiences`,
          field: 'audiences',
        })
      : Promise.resolve([]),
    plan.checks.includes('data_streams')
      ? ga4FetchOptionalList<Record<string, unknown>>({
          accessToken,
          primaryUrl: `${GA4_ADMIN_ENDPOINT}/${property}/dataStreams`,
          field: 'dataStreams',
        })
      : Promise.resolve([]),
  ]);
  return {
    plan,
    propertyId: integration.property_id,
    keyEvents: keyEventsJson,
    audiences: audiencesJson,
    dataStreams: dataStreamsJson,
    fetchedAt: new Date().toISOString(),
    source: 'live',
  };
}

export async function runGa4ProviderPlan<T = unknown>(
  plan: Ga4ProviderPlan,
): Promise<{ plan: Ga4ProviderPlan; data: T | null; status: 'planned' | 'completed' | 'mock' }> {
  if (plan.dryRun) return { plan, data: null, status: 'planned' };
  const integration = await loadGa4Integration(plan);
  if (!integration?.property_id || !integration.refresh_token) return { plan, data: null, status: 'mock' };
  const accessToken = await ensureFreshAccessToken(integration);
  const action =
    plan.profileId === 'ga4_batch_funnel_v1'
      ? 'batchRunReports'
      : plan.profileId === 'ga4_pivot_funnel_v1'
        ? 'runPivotReport'
        : 'runRealtimeReport';
  const url = `${GA4_DATA_ENDPOINT}/properties/${integration.property_id}:${action}`;
  const data = await ga4Fetch<T>(url, accessToken, {
    method: 'POST',
    body: JSON.stringify(plan.body),
  });
  return { plan, data, status: 'completed' };
}
