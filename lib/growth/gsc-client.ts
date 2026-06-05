/**
 * Growth — Google Search Console client wrapper
 *
 * Tenant-scoped wrapper over the existing OAuth-based Search Console
 * integration in `lib/seo/google-client.ts`. Adds:
 *   - Cache layer (24h TTL via ADR-016 tags)
 *   - Multi-tenant scoping by account_id + website_id (ADR-009)
 *   - Edge-safe (Web Crypto + fetch only)
 *
 * Usage from API routes / RSC ONLY (never render-path).
 *
 * Cache tag pattern (ADR-016):
 *   growth:gsc:website:<website_id>:locale:<locale>
 *
 * @see SPEC #337 (W2 day 8-9) — A1 Backend/Contracts
 * @see lib/seo/google-client.ts — underlying OAuth client (Node-only refresh)
 * @see lib/seo/serp-snapshot.ts — pattern reference for cache + tenant scoping
 */

import type { GrowthLocale } from '@bukeer/website-contract';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import {
  querySearchConsole,
  refreshGoogleToken,
  type SearchConsoleRow,
} from '@/lib/seo/google-client';
import {
  hydrateGoogleCredential,
  mergeRefreshedGoogleSecret,
  storeGoogleProviderCredentialSecret,
  type GoogleProviderCredentialSecret,
} from '@/lib/growth/provider-credentials/vault';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const DEFAULT_ROW_LIMIT = 25_000;

export interface GscTenantScope {
  account_id: string;
  website_id: string;
  locale?: GrowthLocale;
}

export interface GscQueryInput extends GscTenantScope {
  /** ISO date YYYY-MM-DD inclusive */
  startDate: string;
  /** ISO date YYYY-MM-DD inclusive */
  endDate: string;
  /** Search Console dimensions, e.g. ['page'], ['query','page'] */
  dimensions?: Array<'query' | 'page' | 'country' | 'device' | 'date' | 'searchAppearance'>;
  /** Optional country filter (ISO-3166 alpha-3 lowercase, e.g. 'col') */
  country?: string;
  /** Force a refetch ignoring cache */
  forceRefresh?: boolean;
  /** Max rows returned (default 25000, max GSC limit) */
  rowLimit?: number;
}

export interface GscRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscQueryResult {
  rows: GscRow[];
  fetchedAt: string;
  cacheHit: boolean;
  cacheTag: string;
  /** Site URL on record for the website (sc-domain: or https://) */
  siteUrl: string | null;
  source: 'cache' | 'live' | 'mock';
}

export interface GscDateTrendProfileInput extends GscTenantScope {
  startDate: string;
  endDate: string;
  dimensions?: Array<'query' | 'page' | 'country' | 'device' | 'searchAppearance'>;
  country?: string;
  rowLimit?: number;
}

export interface GscIndexabilityHealthInput extends GscTenantScope {
  urls?: string[];
  includeSitemaps?: boolean;
  includeSites?: boolean;
  dryRun?: boolean;
}

export interface GscInspectionResult {
  inspectionUrl: string;
  indexStatusResult?: Record<string, unknown>;
  mobileUsabilityResult?: Record<string, unknown>;
  richResultsResult?: Record<string, unknown>;
  fetchedAt: string;
  source: 'live' | 'mock';
}

export interface GscSitemapEntry {
  path: string;
  lastSubmitted?: string;
  lastDownloaded?: string;
  isPending?: boolean;
  isSitemapsIndex?: boolean;
  type?: string;
  errors?: number;
  warnings?: number;
}

export interface GscSiteEntry {
  siteUrl: string;
  permissionLevel?: string;
}

export interface GscIndexabilityHealthPlan extends GscTenantScope {
  profileId: 'gsc_indexability_v1';
  urls: string[];
  includeSitemaps: boolean;
  includeSites: boolean;
  dryRun: boolean;
  blockedReason?: string;
}

export interface GscIndexabilityHealthResult {
  plan: GscIndexabilityHealthPlan;
  inspections: GscInspectionResult[];
  sitemaps: GscSitemapEntry[];
  sites: GscSiteEntry[];
  status: 'planned' | 'completed' | 'blocked';
}

export class GscClientError extends Error {
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

const GSC_API_ENDPOINT = 'https://searchconsole.googleapis.com/webmasters/v3';
const GSC_URL_INSPECTION_ENDPOINT = 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect';

// ─── Cache helpers (Supabase-backed; Cloudflare Worker-safe) ─────────────────

interface GscCacheRow {
  website_id: string;
  cache_key: string;
  payload: unknown;
  fetched_at: string;
}

function buildCacheKey(input: GscQueryInput): string {
  const parts = [
    input.startDate,
    input.endDate,
    (input.dimensions ?? ['page']).join(','),
    input.country ?? '*',
    input.locale ?? '*',
    String(input.rowLimit ?? DEFAULT_ROW_LIMIT),
  ];
  return parts.join('|');
}

export function buildGscCacheTag(input: GscTenantScope): string {
  return `growth:gsc:website:${input.website_id}:locale:${input.locale ?? '*'}`;
}

function isFresh(fetchedAtRaw: string | null | undefined): boolean {
  if (!fetchedAtRaw) return false;
  const t = new Date(fetchedAtRaw).getTime();
  if (!Number.isFinite(t)) return false;
  return Date.now() - t <= CACHE_TTL_MS;
}

function assertIsoDate(value: string, field: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(new Date(`${value}T00:00:00Z`).getTime())) {
    throw new GscClientError('INVALID_PROFILE_INPUT', `${field} must be YYYY-MM-DD`, 400);
  }
}

export function buildGscDateTrendQuery(input: GscDateTrendProfileInput): GscQueryInput {
  assertIsoDate(input.startDate, 'startDate');
  assertIsoDate(input.endDate, 'endDate');
  return {
    ...input,
    dimensions: ['date', ...(input.dimensions ?? ['page'])],
    rowLimit: input.rowLimit ?? DEFAULT_ROW_LIMIT,
  };
}

export function buildGscIndexabilityHealthPlan(input: GscIndexabilityHealthInput): GscIndexabilityHealthPlan {
  const urls = input.urls ?? [];
  if (urls.length > 50) {
    throw new GscClientError('PROFILE_SCOPE_TOO_BROAD', 'GSC URL Inspection sample cap is 50', 400, {
      count: urls.length,
    });
  }
  return {
    account_id: input.account_id,
    website_id: input.website_id,
    locale: input.locale,
    profileId: 'gsc_indexability_v1',
    urls,
    includeSitemaps: input.includeSitemaps ?? true,
    includeSites: input.includeSites ?? true,
    dryRun: input.dryRun ?? true,
  };
}

// ─── Tenant integration record (where we get OAuth tokens + site URL) ───────

interface GscIntegrationRow {
  account_id: string;
  website_id: string;
  refresh_token: string | null;
  access_token: string | null;
  access_token_expires_at: string | null;
  site_url: string | null;
  credential_ref: string | null;
  scopes?: string[] | null;
  credential_source?: 'vault' | 'legacy';
  credential_secret?: GoogleProviderCredentialSecret | null;
}

async function loadGscIntegration(scope: GscTenantScope): Promise<GscIntegrationRow | null> {
  const admin = createSupabaseServiceRoleClient();
  const { data, error } = await admin
    .from('seo_integrations')
    .select('account_id,website_id,refresh_token,access_token,access_token_expires_at,site_url,credential_ref,scopes')
    .eq('account_id', scope.account_id)
    .eq('website_id', scope.website_id)
    .eq('provider', 'gsc')
    .maybeSingle();

  if (error) {
    throw new GscClientError('INTEGRATION_READ_FAILED', 'Unable to load GSC integration', 500, error.message);
  }
  const integration = (data as GscIntegrationRow | null) ?? null;
  if (!integration) return null;
  const hydrated = await hydrateGoogleCredential({
    supabase: admin,
    provider: 'gsc',
    integration,
  });
  return {
    ...hydrated.integration,
    credential_source: hydrated.credentialSource,
    credential_secret: hydrated.secret,
  };
}

async function ensureFreshAccessToken(integration: GscIntegrationRow): Promise<string> {
  const expiresAt = integration.access_token_expires_at
    ? new Date(integration.access_token_expires_at).getTime()
    : 0;
  const stillValid = integration.access_token && expiresAt - Date.now() > 60_000;
  if (stillValid && integration.access_token) return integration.access_token;

  if (!integration.refresh_token) {
    throw new GscClientError('AUTH_NOT_CONFIGURED', 'GSC refresh token missing for tenant', 503);
  }

  const refreshed = await refreshGoogleToken(integration.refresh_token);
  // Best-effort persist (non-fatal) — keep cache hot for next call.
  try {
    const admin = createSupabaseServiceRoleClient();
    const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
    if (integration.credential_ref) {
      const refreshToken = refreshed.refresh_token ?? integration.refresh_token;
      const credentialRef = await storeGoogleProviderCredentialSecret({
        supabase: admin,
        websiteId: integration.website_id,
        provider: 'gsc',
        secret: mergeRefreshedGoogleSecret({
          provider: 'gsc',
          integration,
          secret: integration.credential_secret ?? null,
          accessToken: refreshed.access_token,
          refreshToken,
          expiresAt: newExpiresAt,
        }),
      });
      await admin
        .from('seo_integrations')
        .update({
          status: 'connected',
          credential_ref: credentialRef,
          access_token: null,
          refresh_token: null,
          access_token_expires_at: newExpiresAt,
          last_error: null,
        })
        .eq('account_id', integration.account_id)
        .eq('website_id', integration.website_id)
        .eq('provider', 'gsc');
      return refreshed.access_token;
    }

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
      .eq('provider', 'gsc');
  } catch {
    // ignore — token rotation will retry next call
  }
  return refreshed.access_token;
}

async function gscFetch<T>(url: string, accessToken: string, init?: RequestInit): Promise<T> {
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
    if (response.status === 401) throw new GscClientError('AUTH_EXPIRED', 'GSC access token rejected', 401, json);
    if (response.status === 429) throw new GscClientError('RATE_LIMIT', 'GSC rate limited', 429, json);
    throw new GscClientError('UPSTREAM_ERROR', 'GSC request failed', response.status >= 500 ? 502 : response.status, json);
  }
  return json;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Query Search Console with cache-first, tenant-scoped semantics.
 *
 * Returns `{ source: 'mock' }` when no integration is configured for the
 * tenant. Callers (Growth Inventory dashboard) MUST treat mock data as
 * non-production and label it accordingly.
 */
export async function queryGscSearchAnalytics(input: GscQueryInput): Promise<GscQueryResult> {
  const cacheTag = buildGscCacheTag(input);
  const cacheKey = buildCacheKey(input);
  const admin = createSupabaseServiceRoleClient();

  if (!input.forceRefresh) {
    const { data: cached } = await admin
      .from('growth_gsc_cache')
      .select('payload,fetched_at')
      .eq('website_id', input.website_id)
      .eq('cache_key', cacheKey)
      .maybeSingle();

    const row = cached as Pick<GscCacheRow, 'payload' | 'fetched_at'> | null;
    if (row && isFresh(row.fetched_at)) {
      const rows = Array.isArray(row.payload) ? (row.payload as GscRow[]) : [];
      return {
        rows,
        fetchedAt: row.fetched_at,
        cacheHit: true,
        cacheTag,
        siteUrl: null,
        source: 'cache',
      };
    }
  }

  const integration = await loadGscIntegration(input);
  if (!integration?.refresh_token || !integration.site_url) {
    return {
      rows: [],
      fetchedAt: new Date().toISOString(),
      cacheHit: false,
      cacheTag,
      siteUrl: null,
      source: 'mock',
    };
  }

  const accessToken = await ensureFreshAccessToken(integration);

  const body: Record<string, unknown> = {
    startDate: input.startDate,
    endDate: input.endDate,
    dimensions: input.dimensions ?? ['page'],
    rowLimit: Math.min(input.rowLimit ?? DEFAULT_ROW_LIMIT, DEFAULT_ROW_LIMIT),
    type: 'web',
  };
  if (input.country) {
    body.dimensionFilterGroups = [
      {
        filters: [{ dimension: 'country', operator: 'equals', expression: input.country }],
      },
    ];
  }

  const responseRows = await querySearchConsole({
    accessToken,
    siteUrl: integration.site_url,
    body,
  });

  const rows: GscRow[] = ((responseRows ?? []) as SearchConsoleRow[]).map((r) => ({
    keys: Array.isArray(r.keys) ? r.keys : [],
    clicks: typeof r.clicks === 'number' ? r.clicks : 0,
    impressions: typeof r.impressions === 'number' ? r.impressions : 0,
    ctr: typeof r.ctr === 'number' ? r.ctr : 0,
    position: typeof r.position === 'number' ? r.position : 0,
  }));

  const fetchedAt = new Date().toISOString();

  // Persist to cache (best-effort, non-fatal)
  try {
    await admin.from('growth_gsc_cache').upsert(
      {
        website_id: input.website_id,
        account_id: input.account_id,
        cache_key: cacheKey,
        cache_tag: cacheTag,
        payload: rows,
        fetched_at: fetchedAt,
      },
      { onConflict: 'website_id,cache_key' },
    );
  } catch {
    // ignore — render path doesn't depend on cache write
  }

  return {
    rows,
    fetchedAt,
    cacheHit: false,
    cacheTag,
    siteUrl: integration.site_url,
    source: 'live',
  };
}

export async function inspectGscUrl(input: GscTenantScope & { url: string }): Promise<GscInspectionResult> {
  const integration = await loadGscIntegration(input);
  if (!integration?.refresh_token || !integration.site_url) {
    return { inspectionUrl: input.url, fetchedAt: new Date().toISOString(), source: 'mock' };
  }
  const accessToken = await ensureFreshAccessToken(integration);
  const json = await gscFetch<{
    inspectionResult?: {
      inspectionResultLink?: string;
      indexStatusResult?: Record<string, unknown>;
      mobileUsabilityResult?: Record<string, unknown>;
      richResultsResult?: Record<string, unknown>;
    };
  }>(GSC_URL_INSPECTION_ENDPOINT, accessToken, {
    method: 'POST',
    body: JSON.stringify({
      inspectionUrl: input.url,
      siteUrl: integration.site_url,
    }),
  });
  return {
    inspectionUrl: input.url,
    indexStatusResult: json.inspectionResult?.indexStatusResult,
    mobileUsabilityResult: json.inspectionResult?.mobileUsabilityResult,
    richResultsResult: json.inspectionResult?.richResultsResult,
    fetchedAt: new Date().toISOString(),
    source: 'live',
  };
}

export async function listGscSitemaps(input: GscTenantScope): Promise<GscSitemapEntry[]> {
  const integration = await loadGscIntegration(input);
  if (!integration?.refresh_token || !integration.site_url) return [];
  const accessToken = await ensureFreshAccessToken(integration);
  const site = encodeURIComponent(integration.site_url);
  const json = await gscFetch<{ sitemap?: Array<Record<string, unknown>> }>(
    `${GSC_API_ENDPOINT}/sites/${site}/sitemaps`,
    accessToken,
  );
  return (json.sitemap ?? []).map((entry) => ({
    path: String(entry.path ?? ''),
    lastSubmitted: typeof entry.lastSubmitted === 'string' ? entry.lastSubmitted : undefined,
    lastDownloaded: typeof entry.lastDownloaded === 'string' ? entry.lastDownloaded : undefined,
    isPending: typeof entry.isPending === 'boolean' ? entry.isPending : undefined,
    isSitemapsIndex: typeof entry.isSitemapsIndex === 'boolean' ? entry.isSitemapsIndex : undefined,
    type: typeof entry.type === 'string' ? entry.type : undefined,
    errors: typeof entry.errors === 'number' ? entry.errors : undefined,
    warnings: typeof entry.warnings === 'number' ? entry.warnings : undefined,
  }));
}

export async function listGscSites(input: GscTenantScope): Promise<GscSiteEntry[]> {
  const integration = await loadGscIntegration(input);
  if (!integration?.refresh_token) return [];
  const accessToken = await ensureFreshAccessToken(integration);
  const json = await gscFetch<{ siteEntry?: Array<Record<string, unknown>> }>(`${GSC_API_ENDPOINT}/sites`, accessToken);
  return (json.siteEntry ?? []).map((entry) => ({
    siteUrl: String(entry.siteUrl ?? ''),
    permissionLevel: typeof entry.permissionLevel === 'string' ? entry.permissionLevel : undefined,
  }));
}

export async function runGscIndexabilityHealth(
  plan: GscIndexabilityHealthPlan,
): Promise<GscIndexabilityHealthResult> {
  if (plan.dryRun) {
    return { plan, inspections: [], sitemaps: [], sites: [], status: plan.blockedReason ? 'blocked' : 'planned' };
  }
  const inspections = await Promise.all(plan.urls.map((url) => inspectGscUrl({ ...plan, url })));
  const [sitemaps, sites] = await Promise.all([
    plan.includeSitemaps ? listGscSitemaps(plan) : Promise.resolve([]),
    plan.includeSites ? listGscSites(plan) : Promise.resolve([]),
  ]);
  return { plan, inspections, sitemaps, sites, status: 'completed' };
}
