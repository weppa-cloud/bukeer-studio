/**
 * funnel_events writer — SPEC #337 (ADR-018 idempotency)
 *
 * Persists AARRR funnel events through the public.funnel_events table.
 *
 * Contract:
 *   - Caller supplies a `FunnelEventIngest` payload (event_id pre-built via
 *     `lib/growth/event-id.ts`).
 *   - We validate via `FunnelEventSchema.parse()` (applies defaults for
 *     channel/payload/provider_status/source_url/page_path/attribution and
 *     strict tenant scope).
 *   - Insert is idempotent via `event_id` PK + `ON CONFLICT DO NOTHING`.
 *   - PII redaction is the caller's responsibility (see
 *     docs/ops/growth-attribution-governance.md).
 *
 * Edge-first (ADR-007): no Node `crypto`. Schema validation uses Zod which
 * works on Workers runtime.
 */

import {
  FunnelEventSchema,
  type FunnelEvent,
  type FunnelEventIngest,
  EVENT_NAME_TO_STAGE,
} from '@bukeer/website-contract';

import { createLogger } from '@/lib/logger';

const log = createLogger('growth.funnel-events');

interface SupabaseLike {
  // PostgREST builders are generic and chainable; keep narrow at usage sites.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
}

export interface InsertFunnelEventResult {
  inserted: boolean;
  event_id: string;
  /** True when the row already existed (PK conflict). */
  deduped: boolean;
}

/**
 * Apply minimal defaults the schema cannot infer (stage from event_name).
 * The schema does the rest of the validation/coercion.
 */
function withDerivedStage(input: FunnelEventIngest): FunnelEventIngest {
  if (input.stage) return input;
  const stage = EVENT_NAME_TO_STAGE[input.event_name];
  return { ...input, stage };
}

function toRow(event: FunnelEvent): Record<string, unknown> {
  return {
    event_id: event.event_id,
    event_name: event.event_name,
    stage: event.stage,
    channel: event.channel,
    reference_code: event.reference_code,
    account_id: event.account_id,
    website_id: event.website_id,
    locale: event.locale,
    market: event.market,
    occurred_at: event.occurred_at,
    attribution: event.attribution ?? null,
    payload: event.payload ?? {},
    provider_status: event.provider_status ?? [],
    source_url: event.source_url ?? null,
    page_path: event.page_path ?? null,
  };
}

/**
 * Insert a funnel event idempotently. Returns `{ inserted: false, deduped: true }`
 * when the event_id already exists.
 */
export async function insertFunnelEvent(
  supabase: SupabaseLike,
  raw: FunnelEventIngest,
): Promise<InsertFunnelEventResult> {
  const candidate = withDerivedStage(raw);
  const event = FunnelEventSchema.parse(candidate);
  const row = toRow(event);

  const insertBuilder = supabase.from('funnel_events').insert(row);
  const selectBuilder = insertBuilder.select?.('event_id');
  const result = await (selectBuilder?.maybeSingle?.() ??
    insertBuilder?.maybeSingle?.());

  const error = result?.error as { code?: string; message?: string } | undefined;
  if (!error) {
    return { inserted: true, event_id: event.event_id, deduped: false };
  }

  // 23505 = unique_violation → row already exists (idempotent path).
  if (error.code === '23505') {
    return { inserted: false, event_id: event.event_id, deduped: true };
  }

  log.warn('insert_failed', {
    event_id: event.event_id,
    event_name: event.event_name,
    code: error.code,
    error: error.message,
  });
  throw new Error(error.message ?? 'funnel_events insert failed');
}
