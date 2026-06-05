import { buildProviderRunPlan, runProviderProfile } from '@/lib/growth/provider-runner/runner';
import { createMemoryProviderRunnerStore } from '@/lib/growth/provider-runner/ledger';
import type { ProviderRunnerExecutor } from '@/lib/growth/provider-runner/executors';

const WEBSITE_ID = '894545b7-73ca-4dae-b76a-da5b6a3f8441';
const ACCOUNT_ID = '9fc24733-b127-4184-aa22-12f03b98927a';
const WINDOW_START = '2026-05-13';
const WINDOW_END = '2026-05-14';

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    profileId: 'gsc_daily_complete_web_v1',
    websiteId: WEBSITE_ID,
    accountId: ACCOUNT_ID,
    windowStart: WINDOW_START,
    windowEnd: WINDOW_END,
    mode: 'dry-run' as const,
    now: '2026-05-14T12:00:00.000Z',
    ...overrides,
  };
}

function executor(): jest.MockedFunction<ProviderRunnerExecutor> {
  return jest.fn<ReturnType<ProviderRunnerExecutor>, Parameters<ProviderRunnerExecutor>>(async () => ({
    rowCount: 42,
    sourceRefs: [
      { type: 'script' as const, ref: 'scripts/seo/populate-growth-google-cache.ts' },
      { type: 'script' as const, ref: 'scripts/seo/normalize-growth-gsc-cache.mjs' },
    ],
  }));
}

describe('provider runner beta', () => {
  it('derives the GSC beta profile manifest and dry-run plan without provider calls or ledger writes', async () => {
    const store = createMemoryProviderRunnerStore();
    const providerExecutor = executor();

    const result = await runProviderProfile(baseInput(), { store, executor: providerExecutor });

    expect(result.mode).toBe('dry-run');
    expect(result.profile.profile_id).toBe('gsc_daily_complete_web_v1');
    expect(result.profile.provider).toBe('gsc');
    expect(result.profile.freshness_ttl_hours).toBe(24);
    expect(result.profile.cost_policy.cost_class).toBe('free');
    expect(result.profile.approval_policy.mode).toBe('automatic_read_only');
    expect(result.decision.run_status).toBe('queued');
    expect(result.ledgerIntent.write).toBe(false);
    expect(providerExecutor).not.toHaveBeenCalled();
    expect(store.writes).toHaveLength(0);
  });

  it('skips fresh ledger runs and does not call the provider executor', async () => {
    const store = createMemoryProviderRunnerStore({
      runs: [
        {
          id: 'fresh-run-1',
          account_id: ACCOUNT_ID,
          website_id: WEBSITE_ID,
          provider: 'gsc',
          profile_id: 'gsc_daily_complete_web_v1',
          run_status: 'completed',
          freshness_status: 'fresh',
          quality_status: 'pass',
          source_refs: [],
          cost_usd: 0,
          payload: { window: { start: WINDOW_START, end: WINDOW_END } },
          idempotency_key: 'existing',
          started_at: '2026-05-14T09:00:00.000Z',
          completed_at: '2026-05-14T09:05:00.000Z',
          created_at: '2026-05-14T09:00:00.000Z',
          updated_at: '2026-05-14T09:05:00.000Z',
        },
      ],
    });
    const providerExecutor = executor();

    const result = await runProviderProfile(baseInput({ mode: 'apply' }), { store, executor: providerExecutor });

    expect(result.decision.run_status).toBe('completed');
    expect(result.decision.freshness_status).toBe('fresh');
    expect(result.decision.payload.skip_reason).toBe('freshness_gate');
    expect(providerExecutor).not.toHaveBeenCalled();
    expect(store.writes).toHaveLength(1);
  });

  it('skips fresh cache rows without provider calls', async () => {
    const store = createMemoryProviderRunnerStore({
      cacheRows: [
        {
          id: 'cache-1',
          account_id: ACCOUNT_ID,
          website_id: WEBSITE_ID,
          provider: 'gsc',
          profile_id: 'gsc_daily_complete_web_v1',
          cache_target: 'growth_gsc_cache',
          created_at: '2026-05-14T08:00:00.000Z',
          updated_at: '2026-05-14T08:00:00.000Z',
          window_start: WINDOW_START,
          window_end: WINDOW_END,
          row_count: 99,
        },
      ],
    });
    const providerExecutor = executor();

    const result = await runProviderProfile(baseInput({ mode: 'apply' }), { store, executor: providerExecutor });

    expect(result.decision.run_status).toBe('completed');
    expect(result.decision.source_refs).toContainEqual({ type: 'cache', ref: 'growth_gsc_cache:cache-1' });
    expect(providerExecutor).not.toHaveBeenCalled();
  });

  it('cost-gates DataForSEO when approval metadata is missing', async () => {
    const store = createMemoryProviderRunnerStore();
    const providerExecutor = executor();

    const result = await runProviderProfile(
      baseInput({ profileId: 'dfs_onpage_full_comparable_v3', mode: 'apply', allowLiveProviderCall: true }),
      { store, executor: providerExecutor },
    );

    expect(result.decision.run_status).toBe('cost_gated');
    expect(result.decision.freshness_status).toBe('cost_gated');
    expect(result.decision.payload.no_go_reasons).toContain('costed_profile_requires_owner_issue');
    expect(providerExecutor).not.toHaveBeenCalled();
  });

  it('blocks paid DataForSEO when approval scope lacks a provider cost cap', async () => {
    const store = createMemoryProviderRunnerStore();
    const providerExecutor = executor();

    const result = await runProviderProfile(
      baseInput({
        profileId: 'dataforseo_serp_opportunity_v1',
        mode: 'apply',
        allowLiveProviderCall: true,
        ownerIssue: '#600',
        approvalIssue: '#600',
        approvedBy: 'growth-owner',
        approvedAt: '2026-05-28T12:00:00.000Z',
        estimatedCostUsd: 1.25,
        approvalScope: {
          account_id: ACCOUNT_ID,
          website_id: WEBSITE_ID,
          profile_id: 'dataforseo_serp_opportunity_v1',
        },
      }),
      { store, executor: providerExecutor },
    );

    expect(result.decision.run_status).toBe('blocked');
    expect(result.decision.freshness_status).toBe('approval_required');
    expect(result.decision.payload.no_go_reasons).toContain('approval_scope_provider_mismatch');
    expect(result.decision.payload.no_go_reasons).toContain('approval_scope_cost_cap_usd_required');
    expect(providerExecutor).not.toHaveBeenCalled();
  });

  it('allows paid DataForSEO provider calls only with scoped approval and cost cap', async () => {
    const store = createMemoryProviderRunnerStore();
    const providerExecutor = executor();

    const result = await runProviderProfile(
      baseInput({
        profileId: 'dataforseo_serp_opportunity_v1',
        mode: 'apply',
        allowLiveProviderCall: true,
        ownerIssue: '#600',
        approvalIssue: '#600',
        approvedBy: 'growth-owner',
        approvedAt: '2026-05-28T12:00:00.000Z',
        estimatedCostUsd: 1.25,
        approvalScope: {
          account_id: ACCOUNT_ID,
          website_id: WEBSITE_ID,
          profile_id: 'dataforseo_serp_opportunity_v1',
          provider: 'dataforseo',
          cost_cap_usd: 2,
        },
      }),
      { store, executor: providerExecutor },
    );

    expect(result.decision.run_status).toBe('completed');
    expect(result.decision.cost_usd).toBe(1.25);
    expect(providerExecutor).toHaveBeenCalledTimes(1);
  });

  it('blocks paid DataForSEO when estimated cost exceeds approved cap', async () => {
    const store = createMemoryProviderRunnerStore();
    const providerExecutor = executor();

    const result = await runProviderProfile(
      baseInput({
        profileId: 'dataforseo_serp_opportunity_v1',
        mode: 'apply',
        allowLiveProviderCall: true,
        ownerIssue: '#600',
        approvalIssue: '#600',
        approvedBy: 'growth-owner',
        approvedAt: '2026-05-28T12:00:00.000Z',
        estimatedCostUsd: 3,
        approvalScope: {
          account_id: ACCOUNT_ID,
          website_id: WEBSITE_ID,
          profile_id: 'dataforseo_serp_opportunity_v1',
          provider: 'dataforseo',
          cost_cap_usd: 2,
        },
      }),
      { store, executor: providerExecutor },
    );

    expect(result.decision.run_status).toBe('blocked');
    expect(result.decision.payload.no_go_reasons).toContain('approval_scope_cost_cap_exceeded');
    expect(providerExecutor).not.toHaveBeenCalled();
  });

  it('opens the circuit breaker after repeated provider failures', async () => {
    const failures = [0, 1, 2].map((index) => ({
      id: `failed-${index}`,
      account_id: ACCOUNT_ID,
      website_id: WEBSITE_ID,
      provider: 'gsc' as const,
      profile_id: 'gsc_daily_complete_web_v1',
      run_status: 'blocked_provider_error' as const,
      freshness_status: 'blocked' as const,
      quality_status: 'blocked' as const,
      source_refs: [],
      cost_usd: 0,
      payload: { window: { start: WINDOW_START, end: WINDOW_END } },
      idempotency_key: `failed-${index}`,
      started_at: '2026-05-14T08:00:00.000Z',
      completed_at: '2026-05-14T08:01:00.000Z',
      created_at: `2026-05-14T0${index + 8}:00:00.000Z`,
      updated_at: `2026-05-14T0${index + 8}:01:00.000Z`,
    }));
    const store = createMemoryProviderRunnerStore({ runs: failures });
    const providerExecutor = executor();

    const result = await runProviderProfile(
      baseInput({ mode: 'apply', allowLiveProviderCall: true }),
      { store, executor: providerExecutor },
    );

    expect(result.decision.run_status).toBe('blocked');
    expect(result.decision.circuit_breaker?.state).toBe('open');
    expect(result.decision.circuit_breaker?.failure_count).toBe(3);
    expect(providerExecutor).not.toHaveBeenCalled();
  });

  it('writes queued/running/completed ledger rows with stable shape for successful apply', async () => {
    const store = createMemoryProviderRunnerStore();
    const providerExecutor = executor();

    const result = await runProviderProfile(
      baseInput({ mode: 'apply', allowLiveProviderCall: true, ownerIssue: '#538' }),
      { store, executor: providerExecutor },
    );

    expect(providerExecutor).toHaveBeenCalledTimes(1);
    expect(result.decision.run_status).toBe('completed');
    expect(result.decision.freshness_status).toBe('fresh');
    expect(result.decision.quality_status).toBe('pass');
    expect(result.decision.cost_usd).toBe(0);
    expect(result.decision.idempotency_key).toContain(`growth-provider-runner:v1:${ACCOUNT_ID}:${WEBSITE_ID}:gsc_daily_complete_web_v1`);
    expect(result.decision.evidence_fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(result.decision.payload.window).toEqual({ start: WINDOW_START, end: WINDOW_END });
    expect(result.decision.payload.row_count).toBe(42);
    expect(store.writes.map((row) => row.run_status)).toEqual(['queued', 'running', 'completed']);
  });

  it('builds a dry-run command summary with gates and ledger intent', async () => {
    const store = createMemoryProviderRunnerStore();
    const result = await buildProviderRunPlan(baseInput(), { store });

    expect(result.profile.profile_id).toBe('gsc_daily_complete_web_v1');
    expect(result.gates.map((gate) => gate.gate)).toEqual([
      'input_manifest',
      'freshness',
      'budget',
      'approval',
      'circuit_breaker',
      'apply_live_call',
    ]);
    expect(result.ledgerIntent).toMatchObject({ write: false, reason: 'dry_run_preview_only' });
  });
});
