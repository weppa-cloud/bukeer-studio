import { z } from 'zod';
import { defaultProviderRunnerExecutor, type ProviderRunnerExecutor } from './executors';
import { buildIdempotencyKey, evidenceFingerprint } from './idempotency';
import { getProviderProfileManifest } from './manifest';
import type {
  FreshnessStatus,
  GateDecision,
  GrowthProviderRunnerProfileManifest,
  LedgerIntent,
  ProviderCacheRow,
  ProviderRunLedgerRow,
  ProviderRunnerInput,
  ProviderRunnerResult,
  ProviderRunnerStore,
  QualityStatus,
  RunStatus,
  SourceRef,
} from './types';

const uuidSchema = z.string().uuid();
const inputSchema = z.object({
  profileId: z.string().min(1),
  websiteId: uuidSchema,
  accountId: uuidSchema,
  windowStart: z.string().min(1),
  windowEnd: z.string().min(1),
  mode: z.enum(['dry-run', 'apply']).default('dry-run'),
  allowLiveProviderCall: z.boolean().optional().default(false),
  ownerIssue: z.string().optional(),
  approvalId: z.string().optional(),
  approvalIssue: z.string().optional(),
  approvedBy: z.string().optional(),
  approvedAt: z.string().optional(),
  estimatedCostUsd: z.number().nonnegative().optional(),
  approvalScope: z.record(z.string(), z.unknown()).optional(),
  now: z.string().datetime().optional(),
  fixtureFreshCache: z.boolean().optional().default(false),
});

export async function buildProviderRunPlan(
  rawInput: ProviderRunnerInput,
  options: { store: ProviderRunnerStore },
): Promise<ProviderRunnerResult> {
  return runProviderProfile(rawInput, { ...options, executor: async () => ({ rowCount: 0, sourceRefs: [] }), planOnly: true });
}

export async function runProviderProfile(
  rawInput: ProviderRunnerInput,
  options: {
    store: ProviderRunnerStore;
    executor?: ProviderRunnerExecutor;
    planOnly?: boolean;
  },
): Promise<ProviderRunnerResult> {
  const input = inputSchema.parse(rawInput);
  const now = input.now ?? new Date().toISOString();
  const mode = input.mode;
  const profile = getProviderProfileManifest(input.profileId);
  const gates: GateDecision[] = [
    { gate: 'input_manifest', status: 'pass', reason: 'profile_manifest_validated' },
  ];

  const fresh = await evaluateFreshness(input, profile, options.store, now);
  if (fresh) {
    gates.push(fresh.gate, previewGate(mode));
    const row = makeLedgerRow(input, profile, {
      now,
      runStatus: 'completed',
      freshnessStatus: 'fresh',
      qualityStatus: 'pass',
      sourceRefs: fresh.sourceRefs,
      payload: {
        skip_reason: 'freshness_gate',
        row_count: 0,
        freshness: fresh.metadata,
      },
    });
    return finishDecision({ mode, profile, gates, row, store: options.store, write: mode === 'apply', reason: mode === 'apply' ? 'apply_freshness_skip' : 'dry_run_preview_only' });
  }
  gates.push({ gate: 'freshness', status: 'pass', reason: 'ledger_and_cache_stale_or_missing' });

  const budgetBlock = evaluateBudget(input, profile);
  if (budgetBlock) {
    gates.push(budgetBlock.gate);
    const row = makeLedgerRow(input, profile, {
      now,
      runStatus: 'cost_gated',
      freshnessStatus: 'cost_gated',
      qualityStatus: 'watch',
      payload: { no_go_reasons: budgetBlock.reasons },
    });
    return finishDecision({ mode, profile, gates, row, store: options.store, write: mode === 'apply', reason: mode === 'apply' ? 'apply_cost_gate' : 'dry_run_preview_only' });
  }
  gates.push({ gate: 'budget', status: 'pass', reason: profile.cost_policy.cost_class === 'free' ? 'free_read_only_profile' : 'cost_metadata_valid' });

  const approvalBlock = evaluateApproval(input, profile);
  if (approvalBlock) {
    gates.push(approvalBlock.gate);
    const row = makeLedgerRow(input, profile, {
      now,
      runStatus: 'blocked',
      freshnessStatus: 'approval_required',
      qualityStatus: 'blocked',
      payload: { no_go_reasons: approvalBlock.reasons },
    });
    return finishDecision({ mode, profile, gates, row, store: options.store, write: mode === 'apply', reason: mode === 'apply' ? 'apply_approval_gate' : 'dry_run_preview_only' });
  }
  gates.push({ gate: 'approval', status: 'pass', reason: profile.approval_policy.mode === 'automatic_read_only' ? 'automatic_read_only_profile' : 'approval_metadata_valid' });

  const circuit = await evaluateCircuitBreaker(input, profile, options.store, now);
  if (circuit) {
    gates.push(circuit.gate);
    const row = makeLedgerRow(input, profile, {
      now,
      runStatus: 'blocked',
      freshnessStatus: 'blocked',
      qualityStatus: 'blocked',
      circuitBreaker: circuit.circuitBreaker,
      payload: { no_go_reasons: ['circuit_breaker_open'] },
    });
    return finishDecision({ mode, profile, gates, row, store: options.store, write: mode === 'apply', reason: mode === 'apply' ? 'apply_circuit_gate' : 'dry_run_preview_only' });
  }
  gates.push({ gate: 'circuit_breaker', status: 'pass', reason: 'recent_failure_threshold_not_met' });

  if (mode === 'dry-run') {
    gates.push(previewGate(mode));
    const row = makeLedgerRow(input, profile, {
      now,
      runStatus: 'queued',
      freshnessStatus: 'stale',
      qualityStatus: 'watch',
      payload: { planned_transitions: ['queued', 'running', 'completed'] },
    });
    return finishDecision({ mode, profile, gates, row, store: options.store, write: false, reason: 'dry_run_preview_only' });
  }

  if (!input.allowLiveProviderCall) {
    gates.push({ gate: 'apply_live_call', status: 'blocked', reason: 'apply_requires_allow_live_provider_call_before_provider_invocation' });
    const row = makeLedgerRow(input, profile, {
      now,
      runStatus: 'blocked',
      freshnessStatus: 'blocked',
      qualityStatus: 'blocked',
      payload: { no_go_reasons: ['missing_allow_live_provider_call'] },
    });
    return finishDecision({ mode, profile, gates, row, store: options.store, write: true, reason: 'apply_live_call_gate' });
  }

  gates.push({ gate: 'apply_live_call', status: 'pass', reason: 'apply_and_allow_live_provider_call_present' });
  if (options.planOnly) {
    const row = makeLedgerRow(input, profile, { now, runStatus: 'queued', freshnessStatus: 'stale', qualityStatus: 'watch' });
    return finishDecision({ mode, profile, gates, row, store: options.store, write: false, reason: 'plan_only' });
  }

  const queued = makeLedgerRow(input, profile, { now, runStatus: 'queued', freshnessStatus: 'stale', qualityStatus: 'watch' });
  await options.store.writeLedger(queued);
  await options.store.writeLedger({ ...queued, id: undefined, run_status: 'running', started_at: now, updated_at: now });

  const executor = options.executor ?? defaultProviderRunnerExecutor;
  const execution = await executor(input, profile);
  const completed = makeLedgerRow(input, profile, {
    now,
    runStatus: 'completed',
    freshnessStatus: 'fresh',
    qualityStatus: 'pass',
    sourceRefs: execution.sourceRefs,
    payload: { row_count: execution.rowCount },
  });
  const persisted = await options.store.writeLedger(completed);
  return makeResult({ mode, profile, gates, row: persisted, write: true, reason: 'apply_completed', providerCalled: true });
}

async function evaluateFreshness(
  input: z.infer<typeof inputSchema>,
  profile: GrowthProviderRunnerProfileManifest,
  store: ProviderRunnerStore,
  now: string,
): Promise<{ gate: GateDecision; sourceRefs: SourceRef[]; metadata: Record<string, unknown> } | null> {
  if (!profile.freshness_ttl_hours) return null;
  const ttlMs = profile.freshness_ttl_hours * 60 * 60 * 1000;
  const latestRun = await store.findLatestRun({ accountId: input.accountId, websiteId: input.websiteId, provider: profile.provider, profileId: profile.profile_id });
  if (latestRun && latestRun.run_status === 'completed' && withinTtl(latestRun.completed_at ?? latestRun.updated_at, now, ttlMs)) {
    return {
      gate: { gate: 'freshness', status: 'skip', reason: 'fresh_completed_ledger_row_found', metadata: { source: 'ledger', id: latestRun.id } },
      sourceRefs: [{ type: 'run', ref: `growth_profile_runs:${latestRun.id ?? latestRun.idempotency_key}` }],
      metadata: { source: 'ledger', id: latestRun.id },
    };
  }
  if (profile.cache_target) {
    const latestCache = await store.findLatestCache({ accountId: input.accountId, websiteId: input.websiteId, provider: profile.provider, profileId: profile.profile_id, cacheTarget: profile.cache_target });
    if (latestCache && cacheCoversWindow(latestCache, input.windowStart, input.windowEnd) && withinTtl(latestCache.updated_at ?? latestCache.created_at, now, ttlMs)) {
      return {
        gate: { gate: 'freshness', status: 'skip', reason: 'fresh_cache_row_found', metadata: { source: 'cache', id: latestCache.id } },
        sourceRefs: [{ type: 'cache', ref: `${profile.cache_target}:${latestCache.id}` }],
        metadata: { source: 'cache', id: latestCache.id, row_count: latestCache.row_count ?? 0 },
      };
    }
  }
  return null;
}

function evaluateBudget(input: z.infer<typeof inputSchema>, profile: GrowthProviderRunnerProfileManifest): { gate: GateDecision; reasons: string[] } | null {
  if (profile.cost_policy.cost_class === 'free') return null;
  const reasons: string[] = [];
  if (!input.ownerIssue) reasons.push('costed_profile_requires_owner_issue');
  if (!input.estimatedCostUsd || input.estimatedCostUsd <= 0) reasons.push('costed_profile_requires_positive_estimated_cost_usd');
  if (!input.approvalId && !input.approvalIssue) reasons.push('costed_profile_requires_approval_reference');
  if (!input.approvedBy || !input.approvedAt) reasons.push('costed_profile_requires_approver_and_timestamp');
  if (reasons.length === 0) return null;
  return { gate: { gate: 'budget', status: 'cost_gated', reason: 'cost_metadata_missing_or_invalid', metadata: { reasons } }, reasons };
}

function evaluateApproval(input: z.infer<typeof inputSchema>, profile: GrowthProviderRunnerProfileManifest): { gate: GateDecision; reasons: string[] } | null {
  if (!profile.approval_policy.approval_metadata_required) return null;
  const reasons: string[] = [];
  const scope = input.approvalScope;
  if (!scope) reasons.push('approval_scope_required');
  if (scope && (scope.website_id !== input.websiteId || scope.account_id !== input.accountId || scope.profile_id !== profile.profile_id)) {
    reasons.push('approval_scope_mismatch');
  }
  if (scope && profile.cost_policy.cost_class !== 'free') {
    if (scope.provider !== profile.provider) {
      reasons.push('approval_scope_provider_mismatch');
    }
    const costCap = typeof scope.cost_cap_usd === 'number' ? scope.cost_cap_usd : null;
    if (!costCap || costCap <= 0) {
      reasons.push('approval_scope_cost_cap_usd_required');
    } else if (input.estimatedCostUsd && input.estimatedCostUsd > costCap) {
      reasons.push('approval_scope_cost_cap_exceeded');
    }
  }
  if (reasons.length === 0) return null;
  return { gate: { gate: 'approval', status: 'blocked', reason: 'approval_metadata_invalid', metadata: { reasons } }, reasons };
}

async function evaluateCircuitBreaker(
  input: z.infer<typeof inputSchema>,
  profile: GrowthProviderRunnerProfileManifest,
  store: ProviderRunnerStore,
  now: string,
): Promise<{ gate: GateDecision; circuitBreaker: Record<string, unknown> } | null> {
  const nowDate = new Date(now);
  const since = new Date(nowDate.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const failures = await store.findRecentFailures({ accountId: input.accountId, websiteId: input.websiteId, provider: profile.provider, profileId: profile.profile_id, since });
  if (failures.length < 3) return null;
  const cooldownUntil = new Date(nowDate.getTime() + 6 * 60 * 60 * 1000).toISOString();
  const circuitBreaker = {
    state: 'open',
    failure_count: failures.length,
    cooldown_until: cooldownUntil,
    reason: 'recent_provider_failure_threshold_met',
  };
  return {
    gate: { gate: 'circuit_breaker', status: 'blocked', reason: 'recent_provider_failure_threshold_met', metadata: circuitBreaker },
    circuitBreaker,
  };
}

function makeLedgerRow(
  input: z.infer<typeof inputSchema>,
  profile: GrowthProviderRunnerProfileManifest,
  options: {
    now: string;
    runStatus: RunStatus;
    freshnessStatus: FreshnessStatus;
    qualityStatus: QualityStatus;
    sourceRefs?: SourceRef[];
    circuitBreaker?: Record<string, unknown>;
    payload?: Record<string, unknown>;
  },
): ProviderRunLedgerRow {
  const sourceRefs = options.sourceRefs ?? [];
  const idempotencyKey = buildIdempotencyKey({
    accountId: input.accountId,
    websiteId: input.websiteId,
    profileId: profile.profile_id,
    windowStart: input.windowStart,
    windowEnd: input.windowEnd,
    mode: input.mode,
    sourceRefs,
  });
  const rowCount = typeof options.payload?.row_count === 'number' ? options.payload.row_count : 0;
  return {
    account_id: input.accountId,
    website_id: input.websiteId,
    provider: profile.provider,
    profile_id: profile.profile_id,
    run_status: options.runStatus,
    freshness_status: options.freshnessStatus,
    quality_status: options.qualityStatus,
    source_refs: sourceRefs,
    cost_usd: profile.cost_policy.estimated_cost_usd ?? input.estimatedCostUsd ?? 0,
    evidence_fingerprint: evidenceFingerprint({ accountId: input.accountId, websiteId: input.websiteId, profileId: profile.profile_id, windowStart: input.windowStart, windowEnd: input.windowEnd, sourceRefs, rowCount }),
    approval: approvalFromInput(input),
    circuit_breaker: options.circuitBreaker ?? { state: 'closed' },
    payload: {
      window: { start: input.windowStart, end: input.windowEnd },
      row_count: rowCount,
      ...options.payload,
    },
    idempotency_key: idempotencyKey,
    started_at: options.runStatus === 'queued' || options.runStatus === 'running' || options.runStatus === 'completed' ? options.now : null,
    completed_at: ['completed', 'blocked', 'cost_gated', 'failed', 'quota_exhausted', 'blocked_provider_error'].includes(options.runStatus) ? options.now : null,
    created_at: options.now,
    updated_at: options.now,
  };
}

function approvalFromInput(input: z.infer<typeof inputSchema>) {
  if (!input.ownerIssue && !input.approvalId && !input.approvalIssue && !input.approvedBy && !input.approvedAt) return null;
  return {
    owner_issue: input.ownerIssue,
    approval_id: input.approvalId,
    approval_issue: input.approvalIssue,
    approved_by: input.approvedBy,
    approved_at: input.approvedAt,
    estimated_cost_usd: input.estimatedCostUsd,
    scope: input.approvalScope,
  };
}

async function finishDecision(input: {
  mode: 'dry-run' | 'apply';
  profile: GrowthProviderRunnerProfileManifest;
  gates: GateDecision[];
  row: ProviderRunLedgerRow;
  store: ProviderRunnerStore;
  write: boolean;
  reason: string;
}): Promise<ProviderRunnerResult> {
  const rowWithGates = { ...input.row, payload: { ...input.row.payload, gate_decisions: input.gates } };
  const row = input.write ? await input.store.writeLedger(rowWithGates) : rowWithGates;
  return makeResult({ mode: input.mode, profile: input.profile, gates: input.gates, row, write: input.write, reason: input.reason, providerCalled: false });
}

function makeResult(input: {
  mode: 'dry-run' | 'apply';
  profile: GrowthProviderRunnerProfileManifest;
  gates: GateDecision[];
  row: ProviderRunLedgerRow;
  write: boolean;
  reason: string;
  providerCalled: boolean;
}): ProviderRunnerResult {
  const ledgerIntent: LedgerIntent = {
    write: input.write,
    reason: input.reason,
    table: 'growth_profile_runs',
    row: input.row,
  };
  return {
    mode: input.mode,
    profile: input.profile,
    gates: input.gates,
    decision: input.row,
    ledgerIntent,
    providerInvocation: { called: input.providerCalled, reason: input.providerCalled ? 'apply_live_call_allowed' : input.reason },
  };
}

function previewGate(mode: string): GateDecision {
  return mode === 'dry-run'
    ? { gate: 'apply_live_call', status: 'preview', reason: 'dry_run_never_invokes_provider_or_writes_ledger' }
    : { gate: 'apply_live_call', status: 'skip', reason: 'freshness_or_gate_decision_requires_no_provider_call' };
}

function withinTtl(value: string | null | undefined, now: string, ttlMs: number): boolean {
  if (!value) return false;
  return Date.parse(value) + ttlMs > Date.parse(now);
}

function cacheCoversWindow(cache: ProviderCacheRow, windowStart: string, windowEnd: string): boolean {
  if (!cache.window_start || !cache.window_end) return true;
  return cache.window_start <= windowStart && cache.window_end >= windowEnd;
}
