/**
 * Growth — DataForSEO client wrapper
 *
 * Thin tenant-scoped wrapper over the DataForSEO REST API. The official
 * MCP server (40 tools) wraps the same endpoints; this module is what the
 * Studio dashboard, AARRR funnel, and growth jobs call directly when MCP
 * is not available (server-side, Cloudflare Worker safe).
 *
 * Adds:
 *   - Cache layer (7d TTL via ADR-016 tags) — keeps cost-per-website bounded
 *   - Tenant-scoped budget tracking via `seo_provider_usage` (existing table)
 *   - Edge-safe (Web Crypto + fetch only)
 *
 * Cache tag pattern (ADR-016):
 *   growth:dfs:website:<website_id>:endpoint:<endpoint-slug>
 *
 * @see SPEC #337 (W2 day 12) — A1 Backend/Contracts
 * @see lib/seo/serp-snapshot.ts — pattern reference for DFS auth + cap enforcement
 */

import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';

const DATAFORSEO_BASE_URL = 'https://api.dataforseo.com';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7d

export interface DataForSeoTenantScope {
  account_id: string;
  website_id: string;
}

export interface DataForSeoCallInput<TBody = unknown> extends DataForSeoTenantScope {
  /**
   * Endpoint path beginning with '/v3/...', e.g.
   *   '/v3/serp/google/organic/live/advanced'
   *   '/v3/dataforseo_labs/google/keyword_ideas/live'
   */
  endpoint: string;
  /** POST body (DFS expects an array of task objects). */
  body: TBody;
  /** Optional cache key suffix (used to differentiate calls to same endpoint). */
  cacheKey?: string;
  /** Force refetch ignoring 7d cache. */
  forceRefresh?: boolean;
  /**
   * Estimated cost in USD for budget cap (defaults to env or 0.05).
   * Hard-capped per tenant via `seo_provider_usage` (same ledger SEO uses).
   */
  estimatedCostUsd?: number;
}

export interface DataForSeoCallResult<T = unknown> {
  data: T;
  fetchedAt: string;
  cacheHit: boolean;
  cacheTag: string;
  source: 'cache' | 'live' | 'mock';
}

export class DataForSeoClientError extends Error {
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

interface DataForSeoCredentials {
  login: string;
  password: string;
}

function getCredentials(): DataForSeoCredentials | null {
  const login = process.env.DATAFORSEO_LOGIN?.trim();
  const password = process.env.DATAFORSEO_PASSWORD?.trim();
  if (login && password) return { login, password };

  const legacy = process.env.DATAFORSEO_CREDENTIALS?.trim();
  if (legacy) {
    try {
      const parsed = JSON.parse(legacy) as { login?: string; password?: string };
      if (parsed.login?.trim() && parsed.password?.trim()) {
        return { login: parsed.login.trim(), password: parsed.password.trim() };
      }
    } catch {
      const idx = legacy.indexOf(':');
      if (idx > 0) {
        const l = legacy.slice(0, idx).trim();
        const p = legacy.slice(idx + 1).trim();
        if (l && p) return { login: l, password: p };
      }
    }
  }
  return null;
}

function endpointSlug(endpoint: string): string {
  return endpoint.replace(/^\/+/, '').replace(/\//g, '-');
}

export function buildDataForSeoCacheTag(scope: DataForSeoTenantScope, endpoint: string): string {
  return `growth:dfs:website:${scope.website_id}:endpoint:${endpointSlug(endpoint)}`;
}

function isFresh(fetchedAtRaw: string | null | undefined): boolean {
  if (!fetchedAtRaw) return false;
  const t = new Date(fetchedAtRaw).getTime();
  if (!Number.isFinite(t)) return false;
  return Date.now() - t <= CACHE_TTL_MS;
}

function getMonthlyCapUsd(): number | null {
  const raw = process.env.DATAFORSEO_MONTHLY_CAP_USD ?? process.env.SEO_PROVIDER_MONTHLY_CAP_USD;
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function defaultCallCostUsd(): number {
  const raw = process.env.DATAFORSEO_DEFAULT_COST_USD ?? '0.05';
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0.05;
}

function billingMonthIsoDate(now = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

async function enforceBudgetCap(
  scope: DataForSeoTenantScope,
  endpoint: string,
  estimatedCostUsd: number,
): Promise<void> {
  const cap = getMonthlyCapUsd();
  if (cap === null) return;
  const admin = createSupabaseServiceRoleClient();
  const { data, error } = await admin
    .from('seo_provider_usage')
    .select('total_cost_usd')
    .eq('website_id', scope.website_id)
    .eq('provider', 'dataforseo')
    .eq('endpoint', endpoint)
    .eq('billing_month', billingMonthIsoDate())
    .maybeSingle();
  if (error) {
    throw new DataForSeoClientError('USAGE_READ_FAILED', 'Unable to read provider usage', 500, error.message);
  }
  const current = Number(data?.total_cost_usd ?? 0);
  if (current + estimatedCostUsd > cap) {
    throw new DataForSeoClientError(
      'PROVIDER_CAP_REACHED',
      'DataForSEO monthly budget cap reached',
      429,
      { capUsd: cap, currentUsd: current, estimatedCostUsd },
    );
  }
}

async function recordUsage(
  scope: DataForSeoTenantScope,
  endpoint: string,
  costUsd: number,
): Promise<void> {
  const admin = createSupabaseServiceRoleClient();
  const now = new Date();
  const billingMonth = billingMonthIsoDate(now);
  const nowIso = now.toISOString();
  try {
    const { data: existing } = await admin
      .from('seo_provider_usage')
      .select('id,request_count,total_cost_usd,first_called_at')
      .eq('website_id', scope.website_id)
      .eq('provider', 'dataforseo')
      .eq('endpoint', endpoint)
      .eq('billing_month', billingMonth)
      .maybeSingle();

    if (!existing) {
      await admin.from('seo_provider_usage').insert({
        website_id: scope.website_id,
        provider: 'dataforseo',
        endpoint,
        billing_month: billingMonth,
        request_count: 1,
        total_cost_usd: costUsd,
        first_called_at: nowIso,
        last_called_at: nowIso,
      });
      return;
    }
    await admin
      .from('seo_provider_usage')
      .update({
        request_count: Number(existing.request_count ?? 0) + 1,
        total_cost_usd: Number(existing.total_cost_usd ?? 0) + costUsd,
        first_called_at: existing.first_called_at ?? nowIso,
        last_called_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', existing.id);
  } catch {
    // best-effort; never break the caller
  }
}

/**
 * Generic tenant-scoped DataForSEO call with 7d cache.
 *
 * Higher-level helpers (e.g. `lib/seo/serp-snapshot.ts`) own their own
 * persistence schemas; this wrapper is for inventory enrichment and ad-hoc
 * growth queries where the response shape is endpoint-specific.
 */
export async function callDataForSeo<T = unknown>(
  input: DataForSeoCallInput,
): Promise<DataForSeoCallResult<T>> {
  const cacheTag = buildDataForSeoCacheTag(input, input.endpoint);
  const cacheKey = `${input.endpoint}|${input.cacheKey ?? hashJson(input.body)}`;
  const admin = createSupabaseServiceRoleClient();

  if (!input.forceRefresh) {
    const { data: cached } = await admin
      .from('growth_dataforseo_cache')
      .select('payload,fetched_at')
      .eq('website_id', input.website_id)
      .eq('cache_key', cacheKey)
      .maybeSingle();
    const row = cached as { payload: unknown; fetched_at: string } | null;
    if (row && isFresh(row.fetched_at)) {
      return {
        data: row.payload as T,
        fetchedAt: row.fetched_at,
        cacheHit: true,
        cacheTag,
        source: 'cache',
      };
    }
  }

  const credentials = getCredentials();
  if (!credentials) {
    // TODO: wire live credentials via env (DATAFORSEO_LOGIN/PASSWORD)
    return {
      data: {} as T,
      fetchedAt: new Date().toISOString(),
      cacheHit: false,
      cacheTag,
      source: 'mock',
    };
  }

  const estimatedCostUsd = input.estimatedCostUsd ?? defaultCallCostUsd();
  await enforceBudgetCap(input, input.endpoint, estimatedCostUsd);

  const authHeader = base64(`${credentials.login}:${credentials.password}`);
  const response = await fetch(`${DATAFORSEO_BASE_URL}${input.endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${authHeader}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input.body),
    signal: AbortSignal.timeout(30_000),
  });

  const json = (await response.json().catch(() => ({}))) as T;

  if (!response.ok) {
    throw new DataForSeoClientError(
      'UPSTREAM_ERROR',
      'DataForSEO request failed',
      response.status >= 500 ? 502 : response.status,
      json,
    );
  }

  const fetchedAt = new Date().toISOString();
  try {
    await admin.from('growth_dataforseo_cache').upsert(
      {
        website_id: input.website_id,
        account_id: input.account_id,
        cache_key: cacheKey,
        cache_tag: cacheTag,
        endpoint: input.endpoint,
        payload: json,
        fetched_at: fetchedAt,
      },
      { onConflict: 'website_id,endpoint,cache_key' },
    );
  } catch {
    // ignore
  }
  await recordUsage(input, input.endpoint, estimatedCostUsd);

  return {
    data: json,
    fetchedAt,
    cacheHit: false,
    cacheTag,
    source: 'live',
  };
}

// ─── Edge-safe helpers ───────────────────────────────────────────────────────

function base64(input: string): string {
  // Edge runtime: btoa available; Node18+: Buffer also works. Prefer btoa for portability.
  if (typeof btoa === 'function') {
    return btoa(unescape(encodeURIComponent(input)));
  }
  // Buffer fallback for Node-only contexts
  return Buffer.from(input, 'utf-8').toString('base64');
}

function hashJson(value: unknown): string {
  // Stable string for cache key — not cryptographic; collisions OK at 7d TTL.
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
