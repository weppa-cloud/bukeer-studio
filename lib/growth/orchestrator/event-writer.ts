/**
 * Append-only run event writer.
 *
 * `growth_agent_run_events` is append-only at the DB layer (RLS + trigger
 * block UPDATE/DELETE). Every lifecycle transition or tool call must produce
 * one row. The writer is responsible for:
 *   - re-asserting tenant scope on the run row before insert (defence-in-depth);
 *   - filling `occurred_at` with `now()` if the caller didn't supply it;
 *   - serializing payload as JSONB (Supabase handles this — we just pass JS).
 *
 * Refs:
 *   - SPEC_GROWTH_OS_SYMPHONY_ORCHESTRATOR.md §"Orchestration Flow"
 *   - SPEC_GROWTH_OS_SYMPHONY_ORCHESTRATOR.md §"Security And Multi-Tenant Rules"
 *   - ADR-009 (tenant guard)
 *   - ADR-010 (observability & event logging)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AgentRunEventSeverity,
  AgentRunEventType,
  GrowthAgentRun,
} from '@bukeer/website-contract';

import { asTyped, toJson } from '@/lib/supabase/typed-client';
import { assertTenantScope } from './tenant-guard';

export interface WriteRunEventOptions {
  supabase: SupabaseClient;
  run: GrowthAgentRun;
  event_type: AgentRunEventType;
  severity?: AgentRunEventSeverity;
  message?: string;
  payload?: Record<string, unknown>;
}

/**
 * Insert a single event row for the given run. The function asserts tenant
 * scope on the supplied run before touching the DB and is intentionally a
 * no-return — callers should not await event order semantics.
 *
 * Throws on insert error so callers can decide whether to retry, classify the
 * error, or surface it to observability.
 */
export async function writeRunEvent(opts: WriteRunEventOptions): Promise<void> {
  const { supabase, run, event_type, severity, message, payload } = opts;

  assertTenantScope(
    { account_id: run.account_id, website_id: run.website_id },
    { account_id: run.account_id, website_id: run.website_id },
  );

  const row = {
    account_id: run.account_id,
    website_id: run.website_id,
    locale: run.locale,
    market: run.market,
    run_id: run.run_id,
    event_type,
    severity: severity ?? 'info',
    payload: payload ? toJson(payload) : null,
    message: message ?? null,
    occurred_at: new Date().toISOString(),
  };

  const { error } = await asTyped(supabase)
    .from('growth_agent_run_events')
    .insert(row);

  if (error) {
    throw new Error(
      `[orchestrator] failed to write run event ` +
        `(run_id=${run.run_id}, event_type=${event_type}): ${error.message}`,
    );
  }
}
