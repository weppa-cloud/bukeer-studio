// supabase/functions/dispatch-funnel-event/index.ts
//
// SPEC F1 AC1.7 — Funnel events dispatcher (Meta destination only in this PR).
//
// Contract:
//   POST /functions/v1/dispatch-funnel-event
//     body:    { funnel_event_id: string }
//     headers: Authorization: Bearer <SERVICE_ROLE_KEY>
//   returns: { dispatched: number, skipped: number, failed: number }
//
// Behaviour:
//   1. Reads the funnel_events row by event_id.
//   2. Reads enabled destinations from event_destination_mapping for this
//      event_name.
//   3. For each destination, calls a destination-specific handler. Currently
//      ONLY 'meta' is wired (covers AC1.7). Other destinations are skipped
//      with note 'destination_not_implemented' until F2/F3.
//   4. Updates funnel_events.dispatch_status to 'dispatched' (any one
//      destination succeeded), 'failed' (all enabled destinations failed),
//      or leaves 'pending' for retry (only if EVERY destination was a
//      transient skip — currently never).
//   5. Returns a summary so the caller (DB trigger or manual invocation)
//      can log the outcome.
//
// Deliberately single-file: per F1 instructions, "don't try to be perfect on
// the Edge Function packaging — keep it simple". Once F2 adds Google Ads we
// can extract destinations into separate modules.
//
// Deno runtime. No npm imports allowed; use the Deno-compatible Supabase
// client and Web Crypto for SHA-256.

// @ts-expect-error — Deno-specific URL imports; types unavailable in Node
// build but resolve in the Supabase Edge Functions runtime.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

type DispatchStatus = 'pending' | 'dispatched' | 'failed';

interface FunnelEventRow {
  event_id: string;
  pixel_event_id: string | null;
  event_name: string;
  occurred_at: string;
  source: string;
  account_id: string;
  website_id: string;
  reference_code: string;
  source_url: string | null;
  user_email: string | null;
  user_phone: string | null;
  external_id: string | null;
  fbp: string | null;
  fbc: string | null;
  ctwa_clid: string | null;
  ip_address: string | null;
  user_agent: string | null;
  value_amount: string | number | null;
  value_currency: string | null;
  payload: Record<string, unknown> | null;
  attribution: Record<string, unknown> | null;
  dispatch_status: DispatchStatus;
  dispatch_attempt_count: number;
}

interface MappingRow {
  destination: string;
  destination_event_name: string;
  value_field: string | null;
  enabled: boolean;
}

interface DestinationResult {
  destination: string;
  outcome: 'dispatched' | 'skipped' | 'failed';
  reason?: string;
}

const META_PROVIDER = 'meta';
const DEFAULT_META_API_VERSION = 'v21.0';

// --------------------------------------------------------------------------
// Tiny helpers (mirror lib/meta/conversions-api.ts hashing rules — kept
// inline so the Edge Function has no cross-package import).
// --------------------------------------------------------------------------

function cleanString(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  );
  return bytesToHex(digest);
}

async function hashed(value: string | null | undefined): Promise<string[] | undefined> {
  const cleaned = cleanString(value);
  if (!cleaned) return undefined;
  return [await sha256Hex(cleaned.toLowerCase())];
}

async function hashedPhone(
  value: string | null | undefined,
): Promise<string[] | undefined> {
  const digits = cleanString(value)?.replace(/\D/g, '');
  if (!digits) return undefined;
  return [await sha256Hex(digits)];
}

// --------------------------------------------------------------------------
// Meta destination handler.
// --------------------------------------------------------------------------

async function dispatchToMeta(
  event: FunnelEventRow,
  mapping: MappingRow,
  supabase: ReturnType<typeof createClient>,
): Promise<DestinationResult> {
  // @ts-expect-error — Deno global namespace available in Edge runtime
  const env = (globalThis as unknown as { Deno: { env: { get(k: string): string | undefined } } }).Deno?.env;
  const enabled = env?.get('META_CONVERSIONS_API_ENABLED') === 'true';
  const pixelId = cleanString(env?.get('META_PIXEL_ID'));
  const accessToken = cleanString(env?.get('META_ACCESS_TOKEN'));
  const apiVersion = cleanString(env?.get('META_API_VERSION')) ?? DEFAULT_META_API_VERSION;
  const testEventCode = cleanString(env?.get('META_TEST_EVENT_CODE'));

  if (!enabled || !pixelId || !accessToken) {
    // Match lib/meta/conversions-api.ts skipped semantics — log + return.
    await insertMetaLog(supabase, event, mapping, 'skipped', null, {
      error: 'Meta CAPI is disabled or missing META_PIXEL_ID/META_ACCESS_TOKEN',
    });
    return { destination: mapping.destination, outcome: 'skipped', reason: 'config' };
  }

  // The Meta CAPI event_id MUST be the pixel_event_id (browser-paired) when
  // set, falling back to the sha256 funnel_events.event_id only when no
  // pixel-paired id was minted (e.g. backfilled rows). See ADR-029
  // §"Implementation reality check" point 2.
  const metaEventId = event.pixel_event_id || event.event_id;
  const eventTimeSeconds = Math.floor(new Date(event.occurred_at).getTime() / 1000);

  const userData: Record<string, unknown> = {};
  const em = await hashed(event.user_email);
  const ph = await hashedPhone(event.user_phone);
  const externalId = await hashed(event.external_id ?? event.reference_code);
  if (em) userData.em = em;
  if (ph) userData.ph = ph;
  if (externalId) userData.external_id = externalId;
  if (cleanString(event.fbp)) userData.fbp = cleanString(event.fbp);
  if (cleanString(event.fbc)) userData.fbc = cleanString(event.fbc);
  if (cleanString(event.ctwa_clid)) userData.ctwa_clid = cleanString(event.ctwa_clid);
  if (cleanString(event.ip_address)) userData.client_ip_address = cleanString(event.ip_address);
  if (cleanString(event.user_agent)) userData.client_user_agent = cleanString(event.user_agent);

  const customData: Record<string, unknown> = {
    reference_code: event.reference_code,
    source: event.source,
  };
  if (mapping.value_field === 'value_amount' && event.value_amount != null) {
    customData.value = Number(event.value_amount);
    if (event.value_currency) customData.currency = event.value_currency;
  }

  const body = {
    data: [
      {
        event_name: mapping.destination_event_name,
        event_time: eventTimeSeconds,
        event_id: metaEventId,
        action_source: mapping.destination === 'meta_messaging' ? 'business_messaging' : 'website',
        ...(event.source_url && mapping.destination !== 'meta_messaging'
          ? { event_source_url: event.source_url }
          : {}),
        user_data: userData,
        ...(Object.keys(customData).length > 0 ? { custom_data: customData } : {}),
      },
    ],
    ...(testEventCode ? { test_event_code: testEventCode } : {}),
  };

  // Insert pending log row first so we can dedup on (provider, event_name,
  // event_id) — same pattern as lib/meta/conversions-api.ts.
  const logInsert = await insertMetaLog(supabase, event, mapping, 'pending', body, {});
  if (logInsert.deduped) {
    return {
      destination: mapping.destination,
      outcome: 'skipped',
      reason: 'duplicate_log_row',
    };
  }

  try {
    const url = `https://graph.facebook.com/${apiVersion}/${pixelId}/events?access_token=${encodeURIComponent(
      accessToken,
    )}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    let responseBody: unknown = null;
    try {
      responseBody = await response.json();
    } catch {
      responseBody = await response.text().catch(() => null);
    }
    const status = response.ok ? 'sent' : 'failed';
    await updateMetaLog(supabase, mapping.destination_event_name, metaEventId, {
      status,
      provider_response: responseBody,
      error: response.ok ? null : `Meta CAPI returned HTTP ${response.status}`,
      sent_at: response.ok ? new Date().toISOString() : null,
    });
    return {
      destination: mapping.destination,
      outcome: response.ok ? 'dispatched' : 'failed',
      reason: response.ok ? undefined : `http_${response.status}`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await updateMetaLog(supabase, mapping.destination_event_name, metaEventId, {
      status: 'failed',
      error: message,
    });
    return { destination: mapping.destination, outcome: 'failed', reason: message };
  }
}

async function insertMetaLog(
  supabase: ReturnType<typeof createClient>,
  event: FunnelEventRow,
  mapping: MappingRow,
  status: 'pending' | 'sent' | 'failed' | 'skipped',
  requestPayload: unknown,
  details: { error?: string },
): Promise<{ deduped: boolean }> {
  const metaEventId = event.pixel_event_id || event.event_id;
  const row = {
    provider: META_PROVIDER,
    account_id: event.account_id,
    website_id: event.website_id,
    event_name: mapping.destination_event_name,
    event_id: metaEventId,
    action_source: mapping.destination === 'meta_messaging' ? 'business_messaging' : 'website',
    event_time: event.occurred_at,
    event_source_url: event.source_url,
    status,
    request_payload: requestPayload ?? {},
    error: details.error ?? null,
    trace: {
      funnel_event_id: event.event_id,
      funnel_event_name: event.event_name,
      reference_code: event.reference_code,
      dispatcher: 'dispatch-funnel-event-edge-fn',
    },
    sent_at: status === 'sent' ? new Date().toISOString() : null,
  };

  const { error } = await supabase.from('meta_conversion_events').insert(row);
  if (!error) return { deduped: false };
  if ((error as { code?: string }).code === '23505') return { deduped: true };
  throw new Error(error.message ?? 'meta_conversion_events insert failed');
}

async function updateMetaLog(
  supabase: ReturnType<typeof createClient>,
  eventName: string,
  eventId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase
    .from('meta_conversion_events')
    .update(patch)
    .eq('provider', META_PROVIDER)
    .eq('event_name', eventName)
    .eq('event_id', eventId);
  if (error) throw new Error(error.message);
}

// --------------------------------------------------------------------------
// Main dispatcher entry point.
// --------------------------------------------------------------------------

async function handle(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // @ts-expect-error — Deno global namespace available in Edge runtime
  const env = (globalThis as unknown as { Deno: { env: { get(k: string): string | undefined } } }).Deno.env;
  const supabaseUrl = env.get('SUPABASE_URL');
  const serviceRoleKey = env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: 'missing_supabase_env' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  let body: { funnel_event_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const funnelEventId = body.funnel_event_id;
  if (!funnelEventId || typeof funnelEventId !== 'string') {
    return new Response(JSON.stringify({ error: 'missing_funnel_event_id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: eventRow, error: eventErr } = await supabase
    .from('funnel_events')
    .select(
      'event_id, pixel_event_id, event_name, occurred_at, source, account_id, website_id, reference_code, source_url, user_email, user_phone, external_id, fbp, fbc, ctwa_clid, ip_address, user_agent, value_amount, value_currency, payload, attribution, dispatch_status, dispatch_attempt_count',
    )
    .eq('event_id', funnelEventId)
    .maybeSingle();

  if (eventErr) {
    return new Response(
      JSON.stringify({ error: 'event_lookup_failed', detail: eventErr.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
  if (!eventRow) {
    return new Response(JSON.stringify({ error: 'event_not_found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const event = eventRow as unknown as FunnelEventRow;

  // Skip rows already in a terminal state to keep replay/cron loops safe.
  if (event.dispatch_status === 'dispatched') {
    return new Response(
      JSON.stringify({ dispatched: 0, skipped: 1, failed: 0, reason: 'already_dispatched' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const { data: mappings, error: mapErr } = await supabase
    .from('event_destination_mapping')
    .select('destination, destination_event_name, value_field, enabled')
    .eq('funnel_event_name', event.event_name)
    .eq('enabled', true);

  if (mapErr) {
    return new Response(
      JSON.stringify({ error: 'mapping_lookup_failed', detail: mapErr.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const results: DestinationResult[] = [];
  for (const m of (mappings ?? []) as unknown as MappingRow[]) {
    if (m.destination === 'meta' || m.destination === 'meta_messaging') {
      results.push(await dispatchToMeta(event, m, supabase));
    } else {
      // F2/F3 destinations not implemented in this PR.
      results.push({
        destination: m.destination,
        outcome: 'skipped',
        reason: 'destination_not_implemented',
      });
    }
  }

  const dispatched = results.filter((r) => r.outcome === 'dispatched').length;
  const skipped = results.filter((r) => r.outcome === 'skipped').length;
  const failed = results.filter((r) => r.outcome === 'failed').length;

  // Determine final dispatch_status:
  //   * dispatched: at least one destination succeeded (or all configured
  //     destinations were intentionally skipped — config no-op should not
  //     keep the row pending forever).
  //   * failed:     no destination succeeded AND at least one failed.
  //   * pending:    no enabled mappings at all (nothing to do; mark dispatched
  //     so cron stops retrying).
  let nextStatus: DispatchStatus;
  if (results.length === 0) {
    nextStatus = 'dispatched';
  } else if (dispatched > 0 || (failed === 0 && skipped > 0)) {
    nextStatus = 'dispatched';
  } else {
    nextStatus = 'failed';
  }

  await supabase
    .from('funnel_events')
    .update({
      dispatch_status: nextStatus,
      dispatch_attempted_at: new Date().toISOString(),
      // attempt_count is incremented by the cron loop; happy-path trigger
      // calls don't increment to avoid double-counting.
    })
    .eq('event_id', funnelEventId);

  return new Response(
    JSON.stringify({ dispatched, skipped, failed, results }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}

// @ts-expect-error — Deno global namespace available in Edge runtime
(globalThis as unknown as { Deno: { serve(handler: (req: Request) => Promise<Response>): void } }).Deno.serve(handle);
