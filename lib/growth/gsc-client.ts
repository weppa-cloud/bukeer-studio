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
  dimensions?: Array<'query' | 'page' | 'country' | 'device' | 'date'>;
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

// ─── Tenant integration record (where we get OAuth tokens + site URL) ───────

interface GscIntegrationRow {
  account_id: string;
  website_id: string;
  refresh_token: string | null;
  access_token: string | null;
  access_token_expires_at: string | null;
  site_url: string | null;
}

async function loadGscIntegration(scope: GscTenantScope): Promise<GscIntegrationRow | null> {
  const admin = createSupabaseServiceRoleClient();
  const { data, error } = await admin
    .from('seo_integrations')
    .select('account_id,website_id,refresh_token,access_token,access_token_expires_at,site_url')
    .eq('account_id', scope.account_id)
    .eq('website_id', scope.website_id)
    .eq('provider', 'gsc')
    .maybeSingle();

  if (error) {
    throw new GscClientError('INTEGRATION_READ_FAILED', 'Unable to load GSC integration', 500, error.message);
  }
  return (data as GscIntegrationRow | null) ?? null;
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
    await admin
      .from('seo_integrations')
      .update({
        access_token: refreshed.access_token,
        access_token_expires_at: newExpiresAt,
      })
      .eq('account_id', integration.account_id)
      .eq('website_id', integration.website_id)
      .eq('provider', 'gsc');
  } catch {
    // ignore — token rotation will retry next call
  }
  return refreshed.access_token;
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
