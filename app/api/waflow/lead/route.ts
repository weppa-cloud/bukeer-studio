/**
 * POST /api/waflow/lead
 *
 * Editorial v1 WhatsApp Flow lead-persistence endpoint. The drawer calls
 * this on every step advance (small `payload`, same `sessionKey`); the
 * server upserts into `public.waflow_leads` and returns { id, step }.
 *
 * Contract:
 *   Request body:
 *     {
 *       sessionKey: string;          // client uuid (localStorage)
 *       subdomain?: string;          // tenant lookup for account/website id
 *       variant: 'A' | 'B' | 'D';
 *       step: 'intent' | 'dates' | 'party' | 'interests' | 'country' | 'contact' | 'confirmation';
 *       referenceCode?: string;      // only on submission step
 *       submitted?: boolean;         // stamps submitted_at
 *       payload: Record<string, unknown>;
 *     }
 *
 *   Response (201 | 200):
 *     { id: string, step: string }
 *
 * Guarantees:
 *   - Idempotent per (session_key, variant) thanks to the unique index.
 *   - Anon-safe: service role is used server-side; RLS insert policy is
 *     also permissive for anon for defense-in-depth.
 *   - Errors swallow gracefully client-side (the drawer can still proceed
 *     to the WhatsApp redirect without a persisted lead).
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import { z } from 'zod';

import {
  apiError,
  apiInternalError,
  apiRateLimited,
  apiSuccess,
  apiValidationError,
} from '@/lib/api';
import { checkRateLimit, extractClientIp } from '@/lib/booking/rate-limit';
import { triggerDispatch } from '@/lib/funnel/dispatch';
import { parseAttribution } from '@/lib/growth/attribution-parser';
import { buildEventId } from '@/lib/growth/event-id';
import { insertFunnelEvent } from '@/lib/growth/funnel-events';
import { createLogger } from '@/lib/logger';
import { sendMetaConversionEvent } from '@/lib/meta/conversions-api';
import {
  GrowthAttributionSchema,
  type GrowthAttribution,
  type GrowthMarket,
  type FunnelEventIngest,
} from '@bukeer/website-contract';

// ---------------------------------------------------------------------------
// Feature flag — F1 (#420) dispatcher cutover.
// ---------------------------------------------------------------------------
// When FUNNEL_EVENTS_DISPATCHER_V1 === 'true':
//   1. Lead is persisted (unchanged).
//   2. Funnel event is recorded via record_funnel_event RPC with
//      pixel_event_id populated (preserves Pixel↔CAPI dedup) and the typed
//      attribution columns (gclid/fbp/fbc/utm_*/...).
//   3. Direct sendMetaConversionEvent call is SKIPPED — the DB AFTER INSERT
//      trigger + dispatcher Edge Function (or the pg_cron re-dispatch loop)
//      now owns Meta CAPI fan-out.
//
// When the flag is unset/false (DEFAULT — production today):
//   * Behaviour is byte-for-byte unchanged. The existing
//     sendWaflowLeadConversion path runs; the existing
//     emitWaflowSubmitFunnelEvent helper still writes to funnel_events via
//     the legacy lib/growth/funnel-events insertFunnelEvent path.
//
// To flip:
//   FUNNEL_EVENTS_DISPATCHER_V1=true (Cloudflare Worker env / Vercel env)
//
// Rollback: unset the flag → next request reverts to the legacy direct-call
// path. New writes to funnel_events keep flowing (the trigger no-ops if
// app.dispatch_function_url is unset).
// ---------------------------------------------------------------------------
const DISPATCHER_V1_ENABLED = process.env.FUNNEL_EVENTS_DISPATCHER_V1 === 'true';

const log = createLogger('api.waflow.lead');

const AttributionSchema = z
  .object({
    fbp: z.string().trim().max(255).optional(),
    fbc: z.string().trim().max(512).optional(),
    fbclid: z.string().trim().max(512).optional(),
    utm_source: z.string().trim().max(255).optional(),
    utm_medium: z.string().trim().max(255).optional(),
    utm_campaign: z.string().trim().max(255).optional(),
    utm_term: z.string().trim().max(255).optional(),
    utm_content: z.string().trim().max(255).optional(),
    source_url: z.string().trim().max(2048).optional(),
    page_path: z.string().trim().max(2048).optional(),
    page_title: z.string().trim().max(512).optional(),
    referrer: z.string().trim().max(2048).optional(),
  })
  .strict();

const RequestSchema = z.object({
  sessionKey: z.string().trim().min(6).max(80),
  subdomain: z.string().trim().min(1).optional(),
  variant: z.enum(['A', 'B', 'D']),
  step: z.enum([
    'intent',
    'dates',
    'party',
    'interests',
    'country',
    'contact',
    'confirmation',
  ]),
  referenceCode: z.string().trim().min(4).max(40).optional().nullable(),
  submitted: z.boolean().optional(),
  attribution: AttributionSchema.optional(),
  locale: z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/).optional(),
  market: z.enum(['CO', 'MX', 'US', 'CA', 'EU', 'OTHER']).optional(),
  payload: z.record(z.string(), z.unknown()).default({}),
});

type WaflowLeadBody = z.infer<typeof RequestSchema>;
type JsonRecord = Record<string, unknown>;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const UUID_PATTERN =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

function createSupabaseAdmin() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables for waflow lead API');
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function resolveTenant(
  subdomain: string | undefined,
): Promise<{ accountId: string | null; websiteId: string | null } | null> {
  if (!subdomain) return { accountId: null, websiteId: null };
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from('websites')
    .select('id,account_id')
    .eq('subdomain', subdomain)
    .eq('status', 'published')
    .maybeSingle<{ id: string; account_id: string | null }>();
  if (error) {
    log.warn('tenant_lookup_failed', { subdomain, error: error.message });
    return null;
  }
  if (!data) return null;
  return { accountId: data.account_id, websiteId: data.id };
}

async function upsertLead(
  body: WaflowLeadBody,
  tenant: { accountId: string | null; websiteId: string | null },
  request: NextRequest,
): Promise<{ id: string; created_at: string } | null> {
  const supabase = createSupabaseAdmin();
  const submittedAt = body.submitted ? new Date().toISOString() : null;
  const ip = extractClientIp(request.headers);
  const ua = request.headers.get('user-agent');
  const payload = body.attribution
    ? {
        ...body.payload,
        attribution: {
          ...(typeof body.payload.attribution === 'object' && body.payload.attribution !== null
            ? body.payload.attribution
            : {}),
          ...body.attribution,
        },
      }
    : body.payload;

  const { data, error } = await supabase
    .from('waflow_leads')
    .upsert(
      {
        account_id: tenant.accountId,
        website_id: tenant.websiteId,
        subdomain: body.subdomain ?? null,
        variant: body.variant,
        step: body.step,
        payload,
        session_key: body.sessionKey,
        reference_code: body.referenceCode ?? null,
        submitted_at: submittedAt,
        source_ip: ip,
        source_user_agent: ua,
      },
      {
        onConflict: 'session_key,variant',
        ignoreDuplicates: false,
      },
    )
    .select('id,created_at')
    .maybeSingle<{ id: string; created_at: string }>();

  if (error) {
    log.error('lead_upsert_failed', {
      subdomain: body.subdomain ?? null,
      variant: body.variant,
      step: body.step,
      error: error.message,
    });
    return null;
  }
  return data ?? null;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readNestedString(record: JsonRecord, key: string, nestedKey: string): string | null {
  const nested = record[key];
  if (!isRecord(nested)) return null;
  return readString(nested[nestedKey]);
}

function resolveLeadEventId(body: WaflowLeadBody): string | null {
  const fromPayload = readNestedString(body.payload, 'eventIds', 'lead');
  if (fromPayload) return fromPayload;
  return body.referenceCode ? `${body.referenceCode}:lead` : null;
}

function resolveAttribution(body: WaflowLeadBody): JsonRecord {
  if (body.attribution) return body.attribution;
  const attribution = body.payload.attribution;
  return isRecord(attribution) ? attribution : {};
}

function deriveMarket(body: WaflowLeadBody): GrowthMarket {
  if (body.market) return body.market;
  const country =
    readString(body.payload.country) ?? readString(body.payload.market);
  const upper = country?.toUpperCase();
  if (upper === 'CO' || upper === 'MX' || upper === 'US' || upper === 'CA' || upper === 'EU') {
    return upper;
  }
  return 'CO';
}

function deriveLocale(body: WaflowLeadBody): string {
  if (body.locale) return body.locale;
  const candidate = readString(body.payload.locale) ?? readString(body.payload.lang);
  if (candidate && /^[a-z]{2}(-[A-Z]{2})?$/.test(candidate)) return candidate;
  return 'es-CO';
}

function buildFunnelAttribution(
  body: WaflowLeadBody,
  tenant: { accountId: string; websiteId: string },
  capturedAt: Date,
): GrowthAttribution | null {
  if (!UUID_PATTERN.test(tenant.accountId) || !UUID_PATTERN.test(tenant.websiteId)) return null;

  const raw = resolveAttribution(body);
  const existing = GrowthAttributionSchema.safeParse(raw);
  if (existing.success) return existing.data;

  const sourceUrl = readString(raw.source_url);
  if (!sourceUrl || !body.referenceCode) return null;

  try {
    const url = new URL(sourceUrl);
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid'] as const) {
      const value = readString(raw[key]);
      if (value && !url.searchParams.has(key)) url.searchParams.set(key, value);
    }

    return GrowthAttributionSchema.parse(
      parseAttribution({
        url,
        referrer: readString(raw.referrer),
        account_id: tenant.accountId,
        website_id: tenant.websiteId,
        locale: deriveLocale(body),
        market: deriveMarket(body),
        reference_code: body.referenceCode,
        session_key: body.sessionKey,
        capturedAt,
      }),
    );
  } catch (error) {
    log.warn('attribution_parse_failed', {
      reference_code: body.referenceCode,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

async function emitWaflowSubmitFunnelEvent(
  body: WaflowLeadBody,
  tenant: { accountId: string | null; websiteId: string | null },
  lead: { created_at: string },
): Promise<void> {
  if (!body.submitted || body.step !== 'confirmation') return;
  if (!tenant.accountId || !tenant.websiteId) return;
  if (!body.referenceCode) return;

  const createdAt = new Date(lead.created_at);
  const occurredAt = Number.isNaN(createdAt.getTime()) ? new Date(0) : createdAt;
  const attribution = resolveAttribution(body);
  const sourceUrl = readString(attribution.source_url);
  const pagePath = readString(attribution.page_path);
  const funnelAttribution = buildFunnelAttribution(
    body,
    { accountId: tenant.accountId, websiteId: tenant.websiteId },
    occurredAt,
  );

  const eventId = await buildEventId({
    reference_code: body.referenceCode,
    event_name: 'waflow_submit',
    occurred_at: occurredAt,
  });

  const ingest: FunnelEventIngest = {
    event_id: eventId,
    event_name: 'waflow_submit',
    stage: 'activation',
    channel: 'waflow',
    reference_code: body.referenceCode,
    account_id: tenant.accountId,
    website_id: tenant.websiteId,
    locale: deriveLocale(body),
    market: deriveMarket(body),
    occurred_at: occurredAt.toISOString(),
    source_url: sourceUrl ?? null,
    page_path: pagePath ?? null,
    attribution: funnelAttribution,
    payload: {
      variant: body.variant,
      session_key: body.sessionKey,
      subdomain: body.subdomain ?? null,
      package_slug: readString(body.payload.packageSlug),
      destination_slug: readString(body.payload.destinationSlug),
      package_tier: readString(body.payload.packageTier),
    },
  };

  try {
    await insertFunnelEvent(createSupabaseAdmin(), ingest);
  } catch (error) {
    log.warn('funnel_event_insert_failed', {
      event_id: eventId,
      reference_code: body.referenceCode,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * F1 dispatcher path — record the funnel event via the canonical
 * record_funnel_event RPC. Called only when DISPATCHER_V1_ENABLED.
 *
 * Maps the existing Pixel-paired id (`${referenceCode}:lead`) to
 * pixel_event_id (NOT event_id — the sha256 stays the PK). The dispatcher
 * Edge Function will read pixel_event_id when forwarding to Meta CAPI so
 * browser Pixel ↔ server CAPI dedup keeps working.
 */
async function recordWaflowLeadViaRpc(
  body: WaflowLeadBody,
  tenant: { accountId: string | null; websiteId: string | null },
  request: NextRequest,
  lead: { created_at: string },
): Promise<void> {
  if (!body.submitted || body.step !== 'confirmation') return;
  if (!tenant.accountId || !tenant.websiteId) return;
  if (!body.referenceCode) return;

  const createdAt = new Date(lead.created_at);
  const occurredAt = Number.isNaN(createdAt.getTime()) ? new Date() : createdAt;
  const attribution = resolveAttribution(body);
  const ip = extractClientIp(request.headers);
  const ua = request.headers.get('user-agent');
  const sourceUrl = readString(attribution.source_url);
  const pagePath = readString(attribution.page_path);

  const eventId = await buildEventId({
    reference_code: body.referenceCode,
    event_name: 'waflow_submit',
    occurred_at: occurredAt,
  });

  const pixelEventId = resolveLeadEventId(body); // e.g. `${referenceCode}:lead`

  const rpcPayload = {
    event_id: eventId,
    pixel_event_id: pixelEventId ?? undefined,
    event_name: 'waflow_submit' as const,
    event_time: occurredAt.toISOString(),
    source: 'studio_web' as const,
    reference_code: body.referenceCode,
    account_id: tenant.accountId,
    website_id: tenant.websiteId,
    locale: deriveLocale(body),
    market: deriveMarket(body),
    stage: 'activation',
    channel: 'waflow',
    source_url: sourceUrl,
    page_path: pagePath,
    user_email: readString(body.payload.email),
    user_phone: readString(body.payload.phone),
    external_id: body.referenceCode ?? body.sessionKey,
    fbp: readString(attribution.fbp),
    fbc: readString(attribution.fbc),
    gclid: readString(attribution.gclid),
    gbraid: readString(attribution.gbraid),
    wbraid: readString(attribution.wbraid),
    utm_source: readString(attribution.utm_source),
    utm_medium: readString(attribution.utm_medium),
    utm_campaign: readString(attribution.utm_campaign),
    utm_term: readString(attribution.utm_term),
    utm_content: readString(attribution.utm_content),
    ip_address: ip ?? undefined,
    user_agent: ua ?? undefined,
    raw_payload: {
      variant: body.variant,
      session_key: body.sessionKey,
      subdomain: body.subdomain ?? null,
      package_slug: readString(body.payload.packageSlug),
      destination_slug: readString(body.payload.destinationSlug),
      package_tier: readString(body.payload.packageTier),
    },
    attribution,
  };

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase.rpc('record_funnel_event', {
    payload: rpcPayload,
  });

  if (error) {
    log.warn('record_funnel_event_rpc_failed', {
      event_id: eventId,
      reference_code: body.referenceCode,
      code: error.code,
      message: error.message,
    });
    return;
  }

  // Optional sync trigger (default: trust the DB AFTER INSERT trigger).
  await triggerDispatch(eventId);

  log.info('record_funnel_event_rpc_ok', {
    event_id: eventId,
    pixel_event_id: pixelEventId,
    rpc_result: data,
  });
}

async function sendWaflowLeadConversion(
  body: WaflowLeadBody,
  tenant: { accountId: string | null; websiteId: string | null },
  leadId: string,
  request: NextRequest,
): Promise<void> {
  if (!body.submitted || body.step !== 'confirmation') return;

  const eventId = resolveLeadEventId(body);
  if (!eventId) return;

  const attribution = resolveAttribution(body);
  const ip = extractClientIp(request.headers);
  const ua = request.headers.get('user-agent');
  const name = readString(body.payload.name);
  const [firstName, ...lastNameParts] = name?.split(/\s+/) ?? [];
  const phone = readString(body.payload.phone);
  const sourceUrl =
    readString(attribution.source_url) ??
    readString(body.payload.sourceUrl) ??
    null;

  await sendMetaConversionEvent(
    {
      eventName: 'Lead',
      eventId,
      actionSource: 'website',
      eventSourceUrl: sourceUrl,
      userData: {
        phone,
        firstName: firstName ?? null,
        lastName: lastNameParts.join(' ') || null,
        externalId: body.referenceCode ?? body.sessionKey,
        fbp: readString(attribution.fbp),
        fbc: readString(attribution.fbc),
        clientIpAddress: ip,
        clientUserAgent: ua,
      },
      customData: {
        content_name:
          readString(body.payload.packageTitle) ??
          readString(body.payload.destinationName) ??
          'WAFlow Lead',
        content_category: readString(body.payload.packageTier) ?? body.variant,
        destination_slug: readString(body.payload.destinationSlug),
        package_slug: readString(body.payload.packageSlug),
        reference_code: body.referenceCode ?? null,
        session_key: body.sessionKey,
        subdomain: body.subdomain ?? null,
      },
      accountId: tenant.accountId,
      websiteId: tenant.websiteId,
      waflowLeadId: leadId,
      trace: {
        reference_code: body.referenceCode ?? null,
        session_key: body.sessionKey,
        variant: body.variant,
        source: 'waflow_submit',
      },
    },
    { supabase: createSupabaseAdmin() },
  );
}

export async function POST(request: NextRequest) {
  try {
    const parsed = RequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }
    const body = parsed.data;

    const ip = extractClientIp(request.headers);
    const rate = await checkRateLimit(
      {
        scope: 'waflow_lead',
        key: `${body.subdomain ?? 'global'}:${body.sessionKey.slice(0, 24)}:${ip}`,
        limit: 30,
        windowSeconds: 10 * 60,
      },
      {
        supabaseUrl: supabaseUrl ?? '',
        supabaseServiceRoleKey: serviceRoleKey ?? '',
      },
    );
    if (!rate.allowed) {
      const retryAfter = Math.max(
        1,
        Math.ceil((rate.resetAt.getTime() - Date.now()) / 1000),
      );
      return apiRateLimited(retryAfter);
    }

    const tenant = await resolveTenant(body.subdomain);
    if (tenant === null && body.subdomain) {
      return apiError(
        'TENANT_NOT_FOUND',
        'Website subdomain not found or not published',
        404,
      );
    }

    const lead = await upsertLead(body, tenant ?? { accountId: null, websiteId: null }, request);
    if (!lead) {
      return apiInternalError('Failed to persist waflow lead');
    }

    if (DISPATCHER_V1_ENABLED) {
      // F1 dispatcher path. The RPC writes to funnel_events; the DB
      // AFTER INSERT trigger fans out to Meta CAPI (via the dispatcher
      // Edge Function). The legacy direct-call sendWaflowLeadConversion is
      // intentionally skipped to avoid double-sending to Meta.
      try {
        await recordWaflowLeadViaRpc(
          body,
          tenant ?? { accountId: null, websiteId: null },
          request,
          lead,
        );
      } catch (error) {
        log.warn('funnel_dispatcher_v1_failed', {
          reference_code: body.referenceCode ?? null,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } else {
      // Legacy path (DEFAULT). Unchanged from before F1.
      try {
        await sendWaflowLeadConversion(body, tenant ?? { accountId: null, websiteId: null }, lead.id, request);
      } catch (error) {
        log.warn('meta_lead_conversion_failed', {
          reference_code: body.referenceCode ?? null,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      try {
        await emitWaflowSubmitFunnelEvent(body, tenant ?? { accountId: null, websiteId: null }, lead);
      } catch (error) {
        log.warn('funnel_event_emit_failed', {
          reference_code: body.referenceCode ?? null,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return apiSuccess({ id: lead.id, step: body.step }, 201);
  } catch (error) {
    log.error('unhandled_error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return apiInternalError();
  }
}
