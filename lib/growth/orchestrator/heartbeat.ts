/**
 * Heartbeat & stall detection for `growth_agent_runs`.
 *
 * Each running agent must call `markHeartbeat` periodically (cadence ≤
 * `heartbeat_ttl_seconds / 2`). A separate sweeper invokes `detectStalled`
 * to flip rows whose `heartbeat_at < now() - ttl` to status `stalled` and
 * emit a `stalled` event so reviewers see them in Studio Reviews & Runs.
 *
 * Refs:
 *   - SPEC_GROWTH_OS_SYMPHONY_ORCHESTRATOR.md §"Orchestration Flow"
 *   - ADR-010 (observability)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { GrowthAgentRun } from '@bukeer/website-contract';

import { asTyped } from '@/lib/supabase/typed-client';
import { writeRunEvent } from './event-writer';

/**
 * Bump `heartbeat_at` on the run row to `now()`. No tenant guard needed: the
 * `runId` lookup is filtered by RLS at the DB layer and we don't surface the
 * row contents back to the caller.
 */
export async function markHeartbeat(
  supabase: SupabaseClient,
  runId: string,
): Promise<void> {
  const heartbeat_at = new Date().toISOString();

  const { error } = await asTyped(supabase)
    .from('growth_agent_runs')
    .update({ heartbeat_at })
    .eq('run_id', runId);

  if (error) {
    throw new Error(
      `[orchestrator] failed to mark heartbeat (run_id=${runId}): ${error.message}`,
    );
  }
}

export interface DetectStalledResult {
  /** Number of rows transitioned to `stalled`. */
  stalled: number;
  /** run_id values that were affected (for logging). */
  run_ids: string[];
}

/**
 * Find runs whose heartbeat is older than `ttlSeconds`, mark them `stalled`,
 * and emit a `stalled` event for each.
 *
 * The detection is implemented as: SELECT in-flight rows older than the
 * threshold, then UPDATE + event-emit per row. This trades a single SQL pass
 * for the ability to write a per-run event without an additional read. For
 * the production runtime #403 may swap this for an RPC.
 */
export async function detectStalled(
  supabase: SupabaseClient,
  ttlSeconds: number,
): Promise<DetectStalledResult> {
  if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
    throw new Error(
      `[orchestrator] detectStalled: ttlSeconds must be a positive number, got ${ttlSeconds}`,
    );
  }

  const cutoff = new Date(Date.now() - ttlSeconds * 1000).toISOString();

  const { data, error } = await asTyped(supabase)
    .from('growth_agent_runs')
    .select('*')
    .in('status', ['claimed', 'running'])
    .lt('heartbeat_at', cutoff);

  if (error) {
    throw new Error(
      `[orchestrator] detectStalled select failed: ${error.message}`,
    );
  }

  const candidates = (data ?? []) as GrowthAgentRun[];
  const flipped: string[] = [];

  for (const run of candidates) {
    const { error: updErr } = await asTyped(supabase)
      .from('growth_agent_runs')
      .update({ status: 'stalled', finished_at: new Date().toISOString() })
      .eq('run_id', run.run_id)
      .in('status', ['claimed', 'running']);

    if (updErr) {
      // Don't abort the sweep — record and continue.
      // eslint-disable-next-line no-console
      console.error(
        `[orchestrator] detectStalled: failed to flip run_id=${run.run_id}: ${updErr.message}`,
      );
      continue;
    }

    try {
      await writeRunEvent({
        supabase,
        run,
        event_type: 'stalled',
        severity: 'warn',
        message: `No heartbeat for ${ttlSeconds}s; flipped to stalled`,
        payload: { ttl_seconds: ttlSeconds, last_heartbeat_at: run.heartbeat_at },
      });
    } catch (eventErr) {
      // eslint-disable-next-line no-console
      console.error(
        `[orchestrator] detectStalled: failed to emit stalled event for run_id=${run.run_id}:`,
        eventErr,
      );
    }

    flipped.push(run.run_id);
  }

  return { stalled: flipped.length, run_ids: flipped };
}
