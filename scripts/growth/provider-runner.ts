#!/usr/bin/env tsx

import { createMemoryProviderRunnerStore } from '../../lib/growth/provider-runner/ledger';
import { buildProviderRunPlan, runProviderProfile } from '../../lib/growth/provider-runner/runner';
import type { ProviderCacheRow, ProviderRunnerInput } from '../../lib/growth/provider-runner/types';

function main() {
  run().catch((error) => {
    console.error(JSON.stringify({ error: redactError(error) }, null, 2));
    process.exit(1);
  });
}

async function run() {
  const parsed = parseArgs(process.argv.slice(2));
  const input: ProviderRunnerInput = {
    profileId: parsed.profileId,
    websiteId: parsed.websiteId,
    accountId: parsed.accountId,
    windowStart: parsed.windowStart,
    windowEnd: parsed.windowEnd,
    mode: parsed.mode,
    allowLiveProviderCall: parsed.allowLiveProviderCall,
    ownerIssue: parsed.ownerIssue,
    approvalId: parsed.approvalId,
    approvalIssue: parsed.approvalIssue,
    approvedBy: parsed.approvedBy,
    approvedAt: parsed.approvedAt,
    estimatedCostUsd: parsed.estimatedCostUsd,
    approvalScope: parsed.approvalScope,
  };

  const cacheRows: ProviderCacheRow[] = parsed.fixtureFreshCache
    ? [
        {
          id: 'fixture-fresh-cache',
          account_id: parsed.accountId,
          website_id: parsed.websiteId,
          provider: 'gsc',
          profile_id: parsed.profileId,
          cache_target: 'growth_gsc_cache',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          window_start: parsed.windowStart,
          window_end: parsed.windowEnd,
          row_count: 1,
        },
      ]
    : [];

  const store = createMemoryProviderRunnerStore({ cacheRows });
  const result = parsed.mode === 'dry-run'
    ? await buildProviderRunPlan(input, { store })
    : await runProviderProfile(input, { store });

  console.log(JSON.stringify({
    profile: {
      profile_id: result.profile.profile_id,
      provider: result.profile.provider,
      cache_target: result.profile.cache_target,
      cost_policy: result.profile.cost_policy,
      approval_policy: result.profile.approval_policy,
    },
    why: result.decision.payload.skip_reason ?? result.decision.payload.no_go_reasons ?? result.decision.payload.planned_transitions ?? result.decision.run_status,
    gates: result.gates,
    freshness_status: result.decision.freshness_status,
    cost_approval_decision: {
      run_status: result.decision.run_status,
      cost_usd: result.decision.cost_usd,
      approval: result.decision.approval,
    },
    circuit_breaker: result.decision.circuit_breaker,
    ledger_intent: result.ledgerIntent,
    provider_invocation: result.providerInvocation,
  }, null, 2));
}

function parseArgs(argv: string[]) {
  const flags = new Map<string, string | boolean>();
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) continue;
    const [rawKey, inlineValue] = arg.slice(2).split('=', 2);
    if (inlineValue !== undefined) {
      flags.set(rawKey, inlineValue);
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith('--')) {
      flags.set(rawKey, next);
      index += 1;
    } else {
      flags.set(rawKey, true);
    }
  }

  const dryRun = flags.has('dry-run') || (!flags.has('apply') && !flags.has('dry-run'));
  const apply = flags.has('apply');
  if (dryRun && apply) throw new Error('--dry-run and --apply are mutually exclusive');

  return {
    profileId: required(flags, 'profile-id'),
    websiteId: required(flags, 'website-id'),
    accountId: required(flags, 'account-id'),
    windowStart: required(flags, 'window-start'),
    windowEnd: required(flags, 'window-end'),
    mode: apply ? 'apply' as const : 'dry-run' as const,
    allowLiveProviderCall: flags.has('allow-live-provider-call'),
    ownerIssue: optional(flags, 'owner-issue'),
    approvalId: optional(flags, 'approval-id'),
    approvalIssue: optional(flags, 'approval-issue'),
    approvedBy: optional(flags, 'approved-by'),
    approvedAt: optional(flags, 'approved-at'),
    estimatedCostUsd: optionalNumber(flags, 'estimated-cost-usd'),
    approvalScope: optionalJson(flags, 'approval-scope-json'),
    fixtureFreshCache: flags.has('fixture-fresh-cache'),
  };
}

function required(flags: Map<string, string | boolean>, key: string): string {
  const value = optional(flags, key);
  if (!value) throw new Error(`Missing required --${key}`);
  return value;
}

function optional(flags: Map<string, string | boolean>, key: string): string | undefined {
  const value = flags.get(key);
  return typeof value === 'string' ? value : undefined;
}

function optionalNumber(flags: Map<string, string | boolean>, key: string): number | undefined {
  const value = optional(flags, key);
  return value ? Number(value) : undefined;
}

function optionalJson(flags: Map<string, string | boolean>, key: string): Record<string, unknown> | undefined {
  const value = optional(flags, key);
  return value ? JSON.parse(value) as Record<string, unknown> : undefined;
}

function redactError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/(token|key|secret|password)=?[^\s,]*/gi, '$1=[REDACTED]');
}

main();
