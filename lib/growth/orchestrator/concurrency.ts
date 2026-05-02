/**
 * Three-layer concurrency check (global / per-tenant / per-lane).
 *
 * Per SPEC §"Orchestration Flow", the orchestrator must be fair across
 * tenants. Before claiming a row we count in-flight runs (status IN
 * ('claimed','running')) and refuse to claim if any of the three caps are
 * already saturated.
 *
 * Counts come from a single SELECT — we then bucket in-process. For the
 * scaffold we accept the read-then-decide race: the authoritative protection
 * lives inside the claim's `select … for update skip locked` (#403 RPC).
 * This pre-check just lets us avoid hammering the DB when we already know we
 * have no headroom.
 *
 * Refs:
 *   - SPEC_GROWTH_OS_SYMPHONY_ORCHESTRATOR.md §"Orchestration Flow"
 *   - ADR-003 / ADR-009 (multi-tenant fairness)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { AgentLane } from '@bukeer/website-contract';

import { asTyped } from '@/lib/supabase/typed-client';
import type { ConcurrencyCaps } from './types';

export interface ConcurrencyCheckRequest {
  supabase: SupabaseClient;
  account_id: string;
  website_id: string;
  lane: AgentLane;
  caps: ConcurrencyCaps;
}

export type ConcurrencyLevel = 'global' | 'tenant' | 'lane' | 'none';

export interface ConcurrencyCheckResult {
  allowed: boolean;
  /**
   * Which cap blocked us, or `'none'` when we have headroom in all three.
   */
  level: ConcurrencyLevel;
  counts: {
    global: number;
    tenant: number;
    lane: number;
  };
}

const ACTIVE_STATUSES = ['claimed', 'running'] as const;

/**
 * Reads in-flight runs and decides whether the caller may attempt a claim.
 *
 * - `global` — count of all `claimed`+`running` rows in the table.
 * - `tenant` — count for this (account_id, website_id) pair.
 * - `lane`   — count for this (account_id, website_id, lane) triple.
 *
 * Order of failure is deliberate: the most-restrictive cap that's saturated
 * wins (`lane` reported before `tenant` before `global`) so callers can give
 * a useful reason in the skip event payload.
 */
export async function checkConcurrency(
  req: ConcurrencyCheckRequest,
): Promise<ConcurrencyCheckResult> {
  const { supabase, account_id, website_id, lane, caps } = req;

  const { data, error } = await asTyped(supabase)
    .from('growth_agent_runs')
    .select('account_id, website_id, lane, status')
    .in('status', [...ACTIVE_STATUSES]);

  if (error) {
    throw new Error(
      `[orchestrator] failed to read in-flight runs for concurrency check: ${error.message}`,
    );
  }

  const rows = (data ?? []) as Array<{
    account_id: string;
    website_id: string;
    lane: AgentLane;
    status: string;
  }>;

  const counts = {
    global: rows.length,
    tenant: rows.filter(
      (r) => r.account_id === account_id && r.website_id === website_id,
    ).length,
    lane: rows.filter(
      (r) =>
        r.account_id === account_id &&
        r.website_id === website_id &&
        r.lane === lane,
    ).length,
  };

  // Most-restrictive-first reporting.
  if (counts.lane >= caps.per_lane) {
    return { allowed: false, level: 'lane', counts };
  }
  if (counts.tenant >= caps.per_tenant) {
    return { allowed: false, level: 'tenant', counts };
  }
  if (counts.global >= caps.global) {
    return { allowed: false, level: 'global', counts };
  }
  return { allowed: true, level: 'none', counts };
}
