/**
 * lib/funnel/dispatch — F1 (#420) helper for synchronous dispatch trigger.
 *
 * Default behaviour: trust the DB AFTER INSERT trigger
 * (`trg_funnel_events_dispatch_after_insert`) and the pg_cron re-dispatch
 * loop. Routes call `triggerDispatch` after RPC success but the helper is
 * a no-op unless `FUNNEL_DISPATCH_SYNC=true` is set.
 *
 * Why a sync mode at all?
 *   - E2E tests assert that a Meta CAPI log row exists within ~5s of a
 *     submission. Trusting the DB trigger requires the test runner to set
 *     up `app.dispatch_function_url` GUC + Edge Function — heavyweight.
 *   - When debugging a single waflow submit, sync mode gives the dev a
 *     synchronous error surface ("Meta returned 400") instead of having to
 *     scrape pg_net.http_response.
 *
 * Production routes do NOT enable sync mode. The async path is the SOT.
 */

import { createLogger } from '@/lib/logger';

const log = createLogger('funnel.dispatch');

export interface TriggerDispatchOptions {
  /**
   * Override the SUPABASE_URL prefix used to compute the Edge Function URL.
   * Defaults to `${NEXT_PUBLIC_SUPABASE_URL}/functions/v1/dispatch-funnel-event`.
   */
  endpoint?: string;
  /**
   * Override the bearer token. Defaults to `SUPABASE_SERVICE_ROLE_KEY`.
   */
  serviceRoleKey?: string;
  /**
   * Inject fetch (test seam). Defaults to global fetch.
   */
  fetchImpl?: typeof fetch;
  /**
   * Force sync mode regardless of the env var (useful for tests).
   */
  forceSync?: boolean;
}

export interface TriggerDispatchResult {
  invoked: boolean;
  reason: 'env_disabled' | 'missing_config' | 'invoked' | 'fetch_error';
  status?: number;
  error?: string;
}

function isSyncEnabled(forceSync?: boolean): boolean {
  if (forceSync) return true;
  return process.env.FUNNEL_DISPATCH_SYNC === 'true';
}

/**
 * Optionally invoke the dispatch-funnel-event Edge Function synchronously
 * (only when FUNNEL_DISPATCH_SYNC=true). In production this is a no-op —
 * the DB AFTER INSERT trigger handles dispatch.
 *
 * Never throws. Returns a structured result so callers can log without
 * adding error-handling boilerplate.
 */
export async function triggerDispatch(
  funnelEventId: string,
  opts: TriggerDispatchOptions = {},
): Promise<TriggerDispatchResult> {
  if (!isSyncEnabled(opts.forceSync)) {
    return { invoked: false, reason: 'env_disabled' };
  }

  const baseUrl = opts.endpoint
    ?? (process.env.NEXT_PUBLIC_SUPABASE_URL
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '')}/functions/v1/dispatch-funnel-event`
      : undefined);
  const key = opts.serviceRoleKey ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!baseUrl || !key) {
    log.warn('triggerDispatch_missing_config', {
      hasUrl: Boolean(baseUrl),
      hasKey: Boolean(key),
    });
    return { invoked: false, reason: 'missing_config' };
  }

  const fetchImpl = opts.fetchImpl ?? fetch;

  try {
    const response = await fetchImpl(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ funnel_event_id: funnelEventId }),
    });

    if (!response.ok) {
      log.warn('triggerDispatch_non_2xx', {
        funnel_event_id: funnelEventId,
        status: response.status,
      });
    }

    return { invoked: true, reason: 'invoked', status: response.status };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.warn('triggerDispatch_fetch_error', {
      funnel_event_id: funnelEventId,
      error: message,
    });
    return { invoked: false, reason: 'fetch_error', error: message };
  }
}
