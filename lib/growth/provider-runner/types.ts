export type ProviderId = 'dataforseo' | 'gsc' | 'ga4' | 'clarity';
export type RunnerMode = 'dry-run' | 'apply';

export type RunStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'blocked'
  | 'cost_gated'
  | 'quota_exhausted'
  | 'blocked_provider_error';

export type FreshnessStatus =
  | 'fresh'
  | 'stale'
  | 'missing'
  | 'blocked'
  | 'approval_required'
  | 'cost_gated'
  | 'quota_exhausted';

export type QualityStatus = 'pass' | 'watch' | 'blocked';

export interface SourceRef {
  type: 'run' | 'cache' | 'script' | 'issue' | 'normalizer' | 'provider';
  ref: string;
}

export interface GateDecision {
  gate:
    | 'input_manifest'
    | 'freshness'
    | 'budget'
    | 'approval'
    | 'circuit_breaker'
    | 'apply_live_call';
  status: 'pass' | 'skip' | 'blocked' | 'cost_gated' | 'preview';
  reason: string;
  metadata?: Record<string, unknown>;
}

export interface ApprovalMetadata {
  owner_issue?: string;
  approval_id?: string;
  approval_issue?: string;
  approved_by?: string;
  approved_at?: string;
  estimated_cost_usd?: number;
  scope?: Record<string, unknown>;
}

export interface GrowthProviderRunnerProfileManifest {
  profile_id: string;
  provider: ProviderId;
  domain: 'seo' | 'analytics' | 'paid_media' | 'ux' | 'tracking' | 'joint';
  family: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  cadence: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'on_approval' | 'continuous' | 'no_default';
  freshness_ttl_hours: number | null;
  cost_policy: {
    cost_class: 'free' | 'paid_normal' | 'paid_heavy';
    estimated_cost_usd?: number;
    cost_requires_owner_issue: boolean;
  };
  approval_policy: {
    mode:
      | 'automatic_read_only'
      | 'required_to_start'
      | 'required_every_run'
      | 'profile_approved_scope_required'
      | 'blocked';
    owner_issues: string[];
    approval_metadata_required: boolean;
  };
  runner_policy: {
    mutation_allowed: false;
    read_only: true;
    dry_run_supported: true;
    live_call_flag_required: true;
    blocked_direct_consumers: string[];
  };
  required_identifiers: Array<'website_id' | 'account_id' | 'site_url' | 'ga4_property_id' | 'provider_account_id' | 'customer_id'>;
  cache_target: 'growth_gsc_cache' | 'growth_ga4_cache' | 'growth_dataforseo_cache' | 'growth_profile_runs' | null;
  extraction_scripts: string[];
  normalizer_scripts: string[];
  fact_outputs: string[];
  pii_policy: 'aggregate_only' | 'redacted_rows_only' | 'blocked_raw_pii';
  status: 'implemented' | 'partial' | 'planned' | 'excluded';
}

export interface ProviderRunnerInput {
  profileId: string;
  websiteId: string;
  accountId: string;
  windowStart: string;
  windowEnd: string;
  mode?: RunnerMode;
  allowLiveProviderCall?: boolean;
  ownerIssue?: string;
  approvalId?: string;
  approvalIssue?: string;
  approvedBy?: string;
  approvedAt?: string;
  estimatedCostUsd?: number;
  approvalScope?: Record<string, unknown>;
  now?: string;
  fixtureFreshCache?: boolean;
}

export interface ProviderRunLedgerRow {
  id?: string;
  account_id: string;
  website_id: string;
  provider: ProviderId;
  profile_id: string;
  run_status: RunStatus;
  freshness_status: FreshnessStatus;
  quality_status: QualityStatus;
  source_refs: SourceRef[];
  cost_usd: number;
  evidence_fingerprint?: string | null;
  approval?: ApprovalMetadata | null;
  circuit_breaker?: Record<string, unknown>;
  payload: Record<string, unknown>;
  idempotency_key: string;
  started_at?: string | null;
  completed_at?: string | null;
  error?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ProviderCacheRow {
  id: string;
  account_id: string;
  website_id: string;
  provider: ProviderId;
  profile_id?: string | null;
  cache_target: NonNullable<GrowthProviderRunnerProfileManifest['cache_target']>;
  created_at?: string;
  updated_at?: string;
  window_start?: string | null;
  window_end?: string | null;
  row_count?: number;
}

export interface ProviderRunnerStore {
  findLatestRun(input: {
    accountId: string;
    websiteId: string;
    provider: ProviderId;
    profileId: string;
  }): Promise<ProviderRunLedgerRow | null>;
  findLatestCache(input: {
    accountId: string;
    websiteId: string;
    provider: ProviderId;
    profileId: string;
    cacheTarget: NonNullable<GrowthProviderRunnerProfileManifest['cache_target']>;
  }): Promise<ProviderCacheRow | null>;
  findRecentFailures(input: {
    accountId: string;
    websiteId: string;
    provider: ProviderId;
    profileId: string;
    since: string;
  }): Promise<ProviderRunLedgerRow[]>;
  writeLedger(row: ProviderRunLedgerRow): Promise<ProviderRunLedgerRow>;
}

export interface LedgerIntent {
  write: boolean;
  reason: string;
  table: 'growth_profile_runs';
  row: ProviderRunLedgerRow;
}

export interface ProviderRunnerResult {
  mode: RunnerMode;
  profile: GrowthProviderRunnerProfileManifest;
  gates: GateDecision[];
  decision: ProviderRunLedgerRow;
  ledgerIntent: LedgerIntent;
  providerInvocation: {
    called: boolean;
    reason: string;
  };
}
