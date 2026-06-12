import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  GrowthProviderRunnerProfileManifest,
  ProviderCacheRow,
  ProviderRunLedgerRow,
  ProviderRunnerStore,
} from './types';

type SupabaseAdmin = Pick<SupabaseClient, 'from'>;

export function createSupabaseProviderRunnerStore(supabase: SupabaseAdmin): ProviderRunnerStore {
  return {
    async findLatestRun(input) {
      const { data, error } = await supabase
        .from('growth_profile_runs')
        .select('*')
        .eq('account_id', input.accountId)
        .eq('website_id', input.websiteId)
        .eq('provider', input.provider)
        .eq('profile_id', input.profileId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw new Error(`Failed to read growth_profile_runs: ${error.message}`);
      return data ? normalizeRun(data as Record<string, unknown>) : null;
    },

    async findLatestCache(input) {
      const table = tableForCacheTarget(input.cacheTarget);
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('account_id', input.accountId)
        .eq('website_id', input.websiteId)
        .order('fetched_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw new Error(`Failed to read ${table}: ${error.message}`);
      return data ? normalizeCache(data as Record<string, unknown>, input.cacheTarget, input.provider, input.profileId) : null;
    },

    async findRecentFailures(input) {
      const { data, error } = await supabase
        .from('growth_profile_runs')
        .select('*')
        .eq('account_id', input.accountId)
        .eq('website_id', input.websiteId)
        .eq('provider', input.provider)
        .eq('profile_id', input.profileId)
        .in('run_status', ['failed', 'blocked_provider_error', 'quota_exhausted'])
        .gte('updated_at', input.since)
        .order('updated_at', { ascending: false })
        .limit(20);

      if (error) throw new Error(`Failed to read recent provider failures: ${error.message}`);
      return Array.isArray(data) ? data.map((row) => normalizeRun(row as Record<string, unknown>)) : [];
    },

    async writeLedger(row) {
      const payload = serializeRun(row);
      const { data, error } = await supabase
        .from('growth_profile_runs')
        .upsert(payload, { onConflict: 'website_id,idempotency_key' })
        .select('*')
        .single();

      if (error) throw new Error(`Failed to write growth_profile_runs: ${error.message}`);
      return normalizeRun(data as Record<string, unknown>);
    },
  };
}

function tableForCacheTarget(target: NonNullable<GrowthProviderRunnerProfileManifest['cache_target']>) {
  if (target === 'growth_gsc_cache') return 'growth_gsc_cache';
  if (target === 'growth_ga4_cache') return 'growth_ga4_cache';
  if (target === 'growth_dataforseo_cache') return 'growth_dataforseo_cache';
  throw new Error(`Unsupported cache target for freshness lookup: ${target}`);
}

function normalizeRun(row: Record<string, unknown>): ProviderRunLedgerRow {
  return {
    id: stringOrUndefined(row.id),
    account_id: String(row.account_id),
    website_id: String(row.website_id),
    provider: row.provider as ProviderRunLedgerRow['provider'],
    profile_id: String(row.profile_id),
    run_status: normalizeLower(row.run_status) as ProviderRunLedgerRow['run_status'],
    freshness_status: normalizeLower(row.freshness_status) as ProviderRunLedgerRow['freshness_status'],
    quality_status: normalizeLower(row.quality_status) as ProviderRunLedgerRow['quality_status'],
    source_refs: Array.isArray(row.source_refs) ? row.source_refs as ProviderRunLedgerRow['source_refs'] : [],
    cost_usd: Number(row.cost_usd ?? 0),
    evidence_fingerprint: stringOrNull(row.evidence_fingerprint),
    approval: isRecord(row.approval) ? row.approval : null,
    circuit_breaker: isRecord(row.circuit_breaker) ? row.circuit_breaker : {},
    payload: isRecord(row.payload) ? row.payload : {},
    idempotency_key: String(row.idempotency_key),
    started_at: stringOrNull(row.started_at),
    completed_at: stringOrNull(row.completed_at),
    error: stringOrNull(row.error),
    created_at: stringOrUndefined(row.created_at),
    updated_at: stringOrUndefined(row.updated_at),
  };
}

function serializeRun(row: ProviderRunLedgerRow) {
  const rowCount = isRecord(row.payload) && typeof row.payload.row_count === 'number'
    ? row.payload.row_count
    : 0;

  return {
    account_id: row.account_id,
    website_id: row.website_id,
    provider: row.provider,
    provider_family: providerFamily(row.provider),
    profile_id: row.profile_id,
    run_id: row.idempotency_key,
    cadence: 'daily',
    status: legacyStatus(row.run_status),
    observed_at: row.completed_at ?? row.started_at ?? new Date().toISOString(),
    row_count: rowCount,
    run_status: row.run_status,
    freshness_status: legacyVerdict(row.freshness_status),
    quality_status: legacyVerdict(row.quality_status),
    evidence: {
      source_refs: row.source_refs,
      evidence_fingerprint: row.evidence_fingerprint ?? null,
      approval: row.approval ?? null,
    },
    source_refs: row.source_refs,
    cost_usd: row.cost_usd,
    evidence_fingerprint: row.evidence_fingerprint ?? null,
    approval: row.approval ?? null,
    circuit_breaker: row.circuit_breaker ?? {},
    payload: row.payload,
    idempotency_key: row.idempotency_key,
    started_at: row.started_at ?? null,
    completed_at: row.completed_at ?? null,
    error: row.error ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function providerFamily(provider: ProviderRunLedgerRow['provider']) {
  if (provider === 'dataforseo') return 'seo_provider';
  if (provider === 'gsc' || provider === 'ga4') return 'first_party';
  return 'manual';
}

function legacyStatus(status: ProviderRunLedgerRow['run_status']) {
  if (status === 'completed') return 'success';
  if (status === 'running') return 'running';
  if (status === 'queued') return 'planned';
  if (status === 'failed' || status === 'blocked_provider_error') return 'failed';
  if (status === 'blocked' || status === 'quota_exhausted' || status === 'cost_gated') return 'blocked';
  return 'planned';
}

function legacyVerdict(status: ProviderRunLedgerRow['freshness_status'] | ProviderRunLedgerRow['quality_status']) {
  if (status === 'fresh' || status === 'pass') return 'PASS';
  if (status === 'blocked' || status === 'quota_exhausted') return 'BLOCKED';
  return 'WATCH';
}

function normalizeCache(
  row: Record<string, unknown>,
  target: NonNullable<GrowthProviderRunnerProfileManifest['cache_target']>,
  provider: ProviderCacheRow['provider'],
  profileId: string,
): ProviderCacheRow {
  const payload = isRecord(row.payload) ? row.payload : {};
  return {
    id: String(row.id),
    account_id: String(row.account_id),
    website_id: String(row.website_id),
    provider,
    profile_id: profileId,
    cache_target: target,
    created_at: stringOrUndefined(row.fetched_at) ?? stringOrUndefined(row.created_at),
    updated_at: stringOrUndefined(row.fetched_at) ?? stringOrUndefined(row.updated_at),
    window_start: stringOrNull(payload.window_start),
    window_end: stringOrNull(payload.window_end),
    row_count: typeof payload.row_count === 'number' ? payload.row_count : undefined,
  };
}

function normalizeLower(value: unknown) {
  return String(value ?? '').toLowerCase();
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
