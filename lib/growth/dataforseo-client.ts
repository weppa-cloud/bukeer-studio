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

export type DataForSeoProfileId =
  | 'dfs_onpage_full_comparable_v3'
  | 'dfs_onpage_changed_urls_v1'
  | 'dfs_serp_labs_primary_v1'
  | 'dfs_serp_labs_secondary_v1'
  | 'dfs_historical_trends_v1'
  | 'dfs_authority_fallback_v1';

export interface DataForSeoApprovalScope {
  ownerIssue: string;
  approvedBy: string;
  maxCostUsdPerRun: number;
  expiresAt: string;
}

export interface DataForSeoProfilePlan<TBody = unknown> extends DataForSeoTenantScope {
  profileId: DataForSeoProfileId;
  endpoint: string;
  body: TBody;
  cacheKey: string;
  estimatedCostUsd: number;
  costMode: 'free_cache_read' | 'approval_required' | 'approved_costed';
  dryRun: boolean;
  blockedReason?: string;
}

export type DataForSeoOnPageMode = 'full' | 'changed';

export interface DataForSeoOnPageProfileInput extends DataForSeoTenantScope {
  target: string;
  mode: DataForSeoOnPageMode;
  changedUrls?: string[];
  maxCrawlPages?: number;
  tag?: string;
  approval?: DataForSeoApprovalScope;
  dryRun?: boolean;
}

export interface DataForSeoSerpLabsProfileInput extends DataForSeoTenantScope {
  market: 'CO' | 'US' | 'MX' | string;
  tier: 'primary' | 'secondary';
  keywords: string[];
  languageCode?: string;
  locationCode?: number;
  approval?: DataForSeoApprovalScope;
  dryRun?: boolean;
}

export interface DataForSeoHistoricalTrendProfileInput extends DataForSeoTenantScope {
  market: string;
  keywords: string[];
  dateFrom: string;
  dateTo: string;
  approval?: DataForSeoApprovalScope;
  dryRun?: boolean;
}

export interface DataForSeoAuthorityFallbackProfileInput extends DataForSeoTenantScope {
  targetDomain: string;
  competitorDomains?: string[];
  market?: string;
  approval?: DataForSeoApprovalScope;
  dryRun?: boolean;
}

export interface DataForSeoProfileRunResult<T = unknown> {
  plan: DataForSeoProfilePlan;
  result: DataForSeoCallResult<T> | null;
  status: 'planned' | 'blocked' | 'completed';
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

const ONPAGE_FULL_ESTIMATED_COST_USD = 2.5;
const ONPAGE_CHANGED_ESTIMATED_COST_USD = 0.25;
const SERP_PRIMARY_ESTIMATED_COST_USD = 1.5;
const SERP_SECONDARY_ESTIMATED_COST_USD = 0.75;
const HISTORICAL_ESTIMATED_COST_USD = 2;
const AUTHORITY_FALLBACK_ESTIMATED_COST_USD = 0.5;

function hasValidApproval(approval: DataForSeoApprovalScope | undefined, estimatedCostUsd: number): boolean {
  if (!approval) return false;
  const expiresAt = new Date(approval.expiresAt).getTime();
  return Boolean(
    approval.ownerIssue &&
      approval.approvedBy &&
      Number.isFinite(approval.maxCostUsdPerRun) &&
      approval.maxCostUsdPerRun >= estimatedCostUsd &&
      Number.isFinite(expiresAt) &&
      expiresAt > Date.now(),
  );
}

function costMode(
  approval: DataForSeoApprovalScope | undefined,
  estimatedCostUsd: number,
): Pick<DataForSeoProfilePlan, 'costMode' | 'blockedReason'> {
  if (hasValidApproval(approval, estimatedCostUsd)) return { costMode: 'approved_costed' };
  return {
    costMode: 'approval_required',
    blockedReason: 'DataForSEO profile requires explicit approval scope before live provider calls',
  };
}

function assertIsoDate(value: string, field: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(new Date(`${value}T00:00:00Z`).getTime())) {
    throw new DataForSeoClientError('INVALID_PROFILE_INPUT', `${field} must be YYYY-MM-DD`, 400);
  }
}

function assertKeywords(keywords: string[], max: number): void {
  if (!Array.isArray(keywords) || keywords.length === 0) {
    throw new DataForSeoClientError('INVALID_PROFILE_INPUT', 'At least one keyword is required', 400);
  }
  if (keywords.length > max) {
    throw new DataForSeoClientError('PROFILE_SCOPE_TOO_BROAD', `Keyword cap is ${max}`, 400, { count: keywords.length });
  }
}

function buildProfilePlan<TBody>(
  input: DataForSeoTenantScope & {
    profileId: DataForSeoProfileId;
    endpoint: string;
    body: TBody;
    cacheKey: string;
    estimatedCostUsd: number;
    approval?: DataForSeoApprovalScope;
    dryRun?: boolean;
  },
): DataForSeoProfilePlan<TBody> {
  const mode = costMode(input.approval, input.estimatedCostUsd);
  return {
    account_id: input.account_id,
    website_id: input.website_id,
    profileId: input.profileId,
    endpoint: input.endpoint,
    body: input.body,
    cacheKey: input.cacheKey,
    estimatedCostUsd: input.estimatedCostUsd,
    dryRun: input.dryRun ?? true,
    ...mode,
  };
}

export function buildDataForSeoOnPageProfilePlan(input: DataForSeoOnPageProfileInput): DataForSeoProfilePlan {
  const target = input.target.trim();
  if (!target) throw new DataForSeoClientError('INVALID_PROFILE_INPUT', 'OnPage target is required', 400);

  if (input.mode === 'changed') {
    const changedUrls = input.changedUrls ?? [];
    if (changedUrls.length === 0) {
      throw new DataForSeoClientError('INVALID_PROFILE_INPUT', 'changedUrls are required for changed OnPage profile', 400);
    }
    if (changedUrls.length > 50) {
      throw new DataForSeoClientError('PROFILE_SCOPE_TOO_BROAD', 'Changed URL cap is 50', 400, {
        count: changedUrls.length,
      });
    }
    return buildProfilePlan({
      ...input,
      profileId: 'dfs_onpage_changed_urls_v1',
      endpoint: '/v3/on_page/task_post',
      estimatedCostUsd: ONPAGE_CHANGED_ESTIMATED_COST_USD,
      cacheKey: `onpage:changed:${target}:${changedUrls.sort().join(',')}`,
      body: [
        {
          target,
          max_crawl_pages: Math.min(input.maxCrawlPages ?? changedUrls.length, 50),
          start_url: changedUrls[0],
          custom_js: null,
          tag: input.tag ?? 'growth-os-changed-urls',
        },
      ],
    });
  }

  return buildProfilePlan({
    ...input,
    profileId: 'dfs_onpage_full_comparable_v3',
    endpoint: '/v3/on_page/task_post',
    estimatedCostUsd: ONPAGE_FULL_ESTIMATED_COST_USD,
    cacheKey: `onpage:full:${target}:${input.maxCrawlPages ?? 'default'}`,
    body: [
      {
        target,
        max_crawl_pages: input.maxCrawlPages ?? 1000,
        enable_javascript: true,
        load_resources: true,
        enable_browser_rendering: true,
        tag: input.tag ?? 'growth-os-full-comparable',
      },
    ],
  });
}

export function buildDataForSeoSerpLabsProfilePlan(input: DataForSeoSerpLabsProfileInput): DataForSeoProfilePlan {
  const maxKeywords = input.tier === 'primary' ? 100 : 50;
  assertKeywords(input.keywords, maxKeywords);
  const profileId = input.tier === 'primary' ? 'dfs_serp_labs_primary_v1' : 'dfs_serp_labs_secondary_v1';
  const estimatedCostUsd = input.tier === 'primary' ? SERP_PRIMARY_ESTIMATED_COST_USD : SERP_SECONDARY_ESTIMATED_COST_USD;
  return buildProfilePlan({
    ...input,
    profileId,
    endpoint: '/v3/dataforseo_labs/google/keyword_ideas/live',
    estimatedCostUsd,
    cacheKey: `serp-labs:${input.tier}:${input.market}:${input.keywords.slice().sort().join(',')}`,
    body: [
      {
        keywords: input.keywords,
        language_code: input.languageCode ?? 'es',
        location_code: input.locationCode,
        include_serp_info: true,
        include_seed_keyword: true,
      },
    ],
  });
}

export function buildDataForSeoHistoricalTrendProfilePlan(
  input: DataForSeoHistoricalTrendProfileInput,
): DataForSeoProfilePlan {
  assertKeywords(input.keywords, 50);
  assertIsoDate(input.dateFrom, 'dateFrom');
  assertIsoDate(input.dateTo, 'dateTo');
  return buildProfilePlan({
    ...input,
    profileId: 'dfs_historical_trends_v1',
    endpoint: '/v3/dataforseo_labs/google/historical_search_volume/live',
    estimatedCostUsd: HISTORICAL_ESTIMATED_COST_USD,
    cacheKey: `historical:${input.market}:${input.dateFrom}:${input.dateTo}:${input.keywords.slice().sort().join(',')}`,
    body: [
      {
        keywords: input.keywords,
        date_from: input.dateFrom,
        date_to: input.dateTo,
      },
    ],
  });
}

export function buildDataForSeoAuthorityFallbackProfilePlan(
  input: DataForSeoAuthorityFallbackProfileInput,
): DataForSeoProfilePlan {
  const targetDomain = input.targetDomain.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (!targetDomain) throw new DataForSeoClientError('INVALID_PROFILE_INPUT', 'targetDomain is required', 400);
  if ((input.competitorDomains ?? []).length > 10) {
    throw new DataForSeoClientError('PROFILE_SCOPE_TOO_BROAD', 'Competitor domain cap is 10', 400);
  }
  return buildProfilePlan({
    ...input,
    profileId: 'dfs_authority_fallback_v1',
    endpoint: '/v3/dataforseo_labs/google/domain_intersection/live',
    estimatedCostUsd: AUTHORITY_FALLBACK_ESTIMATED_COST_USD,
    cacheKey: `authority-fallback:${input.market ?? '*'}:${targetDomain}:${(input.competitorDomains ?? []).sort().join(',')}`,
    body: [
      {
        target1: targetDomain,
        targets: input.competitorDomains ?? [],
        include_serp_info: true,
      },
    ],
  });
}

export async function runDataForSeoProfile<T = unknown>(
  plan: DataForSeoProfilePlan,
): Promise<DataForSeoProfileRunResult<T>> {
  if (plan.dryRun) return { plan, result: null, status: plan.blockedReason ? 'blocked' : 'planned' };
  if (plan.blockedReason) return { plan, result: null, status: 'blocked' };
  const result = await callDataForSeo<T>({
    account_id: plan.account_id,
    website_id: plan.website_id,
    endpoint: plan.endpoint,
    body: plan.body,
    cacheKey: plan.cacheKey,
    estimatedCostUsd: plan.estimatedCostUsd,
  });
  return { plan, result, status: 'completed' };
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
