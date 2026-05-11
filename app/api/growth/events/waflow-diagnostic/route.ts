/**
 * POST /api/growth/events/waflow-diagnostic
 *
 * First-party persistence for WAFlow diagnostic events:
 * `waflow_open`, `waflow_validation_error`, and `waflow_abandon`.
 *
 * These events are observation-only. They are written to `funnel_events` and
 * dispatched through the canonical dispatcher/mapping path so GA4 can measure
 * step loss without making the browser depend on GA4/GTM availability.
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import { z } from 'zod';

import {
  apiInternalError,
  apiSuccess,
  apiValidationError,
} from '@/lib/api/response';
import { triggerDispatch } from '@/lib/funnel/dispatch';
import { parseAttribution } from '@/lib/growth/attribution-parser';
import { buildEventId } from '@/lib/growth/event-id';
import { insertFunnelEvent } from '@/lib/growth/funnel-events';
import { createLogger } from '@/lib/logger';
import {
  GrowthAttributionSchema,
  type FunnelEventIngest,
  type FunnelEventName,
  type GrowthAttribution,
  type GrowthMarket,
} from '@bukeer/website-contract';

const log = createLogger('api.growth.events.waflow-diagnostic');

const WaflowDiagnosticEventSchema = z.enum([
  'waflow_open',
  'waflow_validation_error',
  'waflow_abandon',
]);

const RequestSchema = z.object({
  event_name: WaflowDiagnosticEventSchema,
  reference_code: z.string().trim().min(8).max(64),
  source_url: z.string().trim().max(2048).optional().nullable(),
  page_path: z.string().trim().max(2048).optional().nullable(),
  referrer: z.string().trim().max(2048).optional().nullable(),
  subdomain: z.string().trim().min(1).max(120).optional().nullable(),
  locale: z
    .string()
    .regex(/^[a-z]{2}(-[A-Z]{2})?$/)
    .optional()
    .nullable(),
  market: z.enum(['CO', 'MX', 'US', 'CA', 'EU', 'OTHER']).optional().nullable(),
  variant: z.string().trim().max(8).optional().nullable(),
  step: z.string().trim().max(80).optional().nullable(),
  reason: z.string().trim().max(120).optional().nullable(),
  fields: z.string().trim().max(500).optional().nullable(),
  destination_slug: z.string().trim().max(160).optional().nullable(),
  destination_name: z.string().trim().max(160).optional().nullable(),
  package_slug: z.string().trim().max(160).optional().nullable(),
  package_title: z.string().trim().max(240).optional().nullable(),
  has_phone: z.boolean().optional().nullable(),
  has_name: z.boolean().optional().nullable(),
  fbp: z.string().trim().max(255).optional().nullable(),
  fbc: z.string().trim().max(512).optional().nullable(),
  occurred_at: z.string().datetime().optional().nullable(),
});

type RequestBody = z.infer<typeof RequestSchema>;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function createSupabaseAdmin() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing Supabase environment variables for waflow-diagnostic beacon API',
    );
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function isDispatcherEnabled(): boolean {
  return process.env.FUNNEL_EVENTS_DISPATCHER_V1 === 'true';
}

function readAttributionClickId(
  attribution: GrowthAttribution | null,
  key: 'gclid' | 'gbraid' | 'wbraid' | 'fbclid',
): string | null {
  return attribution?.click_ids?.[key] ?? null;
}

async function resolveTenant(
  subdomain: string | null | undefined,
  sourceUrl: string | null | undefined,
  requestHost: string | null,
): Promise<{ accountId: string | null; websiteId: string | null }> {
  const tenantLookup = normalizeTenantLookup(subdomain, sourceUrl, requestHost);
  if (!tenantLookup) return { accountId: null, websiteId: null };

  try {
    const supabase = createSupabaseAdmin();
    let query = supabase
      .from('websites')
      .select('id,account_id')
      .eq('status', 'published');
    query =
      tenantLookup.kind === 'subdomain'
        ? query.eq('subdomain', tenantLookup.value)
        : query.eq('custom_domain', tenantLookup.value);

    const { data, error } = await query.maybeSingle<{
      id: string;
      account_id: string | null;
    }>();
    if (error) {
      log.warn('tenant_lookup_failed', {
        lookup: tenantLookup,
        error: error.message,
      });
      return { accountId: null, websiteId: null };
    }
    if (!data) return { accountId: null, websiteId: null };
    return { accountId: data.account_id, websiteId: data.id };
  } catch (error) {
    log.warn('tenant_lookup_threw', {
      lookup: tenantLookup,
      error: error instanceof Error ? error.message : String(error),
    });
    return { accountId: null, websiteId: null };
  }
}

function normalizeTenantLookup(
  subdomain: string | null | undefined,
  sourceUrl: string | null | undefined,
  requestHost: string | null,
): { kind: 'subdomain' | 'custom_domain'; value: string } | null {
  const explicitSubdomain = normalizeHostToken(subdomain);
  if (explicitSubdomain) {
    return { kind: 'subdomain', value: explicitSubdomain };
  }

  const host = normalizeHostToken(extractHost(sourceUrl) ?? requestHost);
  if (!host) return null;
  if (host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return null;

  if (host.endsWith('.bukeer.com')) {
    const [firstLabel] = host.split('.');
    return firstLabel ? { kind: 'subdomain', value: firstLabel } : null;
  }

  return { kind: 'custom_domain', value: host };
}

function extractHost(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
}

function normalizeHostToken(value: string | null | undefined): string | null {
  const text = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/^www\./, '')
    .replace(/\.$/, '');
  return text || null;
}

function safeAttribution(
  body: RequestBody,
  tenant: { accountId: string | null; websiteId: string | null },
): GrowthAttribution | null {
  if (!tenant.accountId || !tenant.websiteId) return null;
  if (!body.source_url) return null;
  try {
    const candidate = parseAttribution({
      url: body.source_url,
      referrer: body.referrer ?? null,
      account_id: tenant.accountId,
      website_id: tenant.websiteId,
      locale: body.locale ?? 'es-CO',
      market: (body.market ?? 'CO') as GrowthMarket,
      reference_code: body.reference_code,
      session_key: body.reference_code,
    });
    return GrowthAttributionSchema.parse(candidate);
  } catch (error) {
    log.warn('attribution_parse_failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

function businessStageFor(
  eventName: z.infer<typeof WaflowDiagnosticEventSchema>,
): 'awareness' | 'intent' | 'dropped' {
  if (eventName === 'waflow_open') return 'awareness';
  if (eventName === 'waflow_abandon') return 'dropped';
  return 'intent';
}

function buildRawPayload(body: RequestBody): Record<string, unknown> {
  return {
    variant: body.variant ?? null,
    step: body.step ?? null,
    reason: body.reason ?? null,
    fields: body.fields ?? null,
    destination_slug: body.destination_slug ?? null,
    destination_name: body.destination_name ?? null,
    package_slug: body.package_slug ?? null,
    package_title: body.package_title ?? null,
    has_phone: body.has_phone ?? null,
    has_name: body.has_name ?? null,
    subdomain: body.subdomain ?? null,
  };
}

async function recordViaRpc(
  body: RequestBody,
  tenant: { accountId: string; websiteId: string },
  eventId: string,
  occurredAt: Date,
  attribution: GrowthAttribution | null,
): Promise<void> {
  const rpcPayload = {
    event_id: eventId,
    pixel_event_id: eventId,
    event_name: body.event_name,
    event_time: occurredAt.toISOString(),
    source: 'waflow' as const,
    source_system: 'waflow' as const,
    business_stage: businessStageFor(body.event_name),
    owner: 'studio' as const,
    optimization_policy: 'observation_only' as const,
    reference_code: body.reference_code,
    account_id: tenant.accountId,
    website_id: tenant.websiteId,
    locale: body.locale ?? 'es-CO',
    market: (body.market ?? 'CO') as GrowthMarket,
    stage: body.event_name === 'waflow_open' ? 'acquisition' : 'activation',
    channel: 'waflow',
    source_url: body.source_url ?? undefined,
    page_path: body.page_path ?? undefined,
    external_id: body.reference_code,
    fbp: body.fbp ?? undefined,
    fbc: body.fbc ?? undefined,
    gclid: readAttributionClickId(attribution, 'gclid') ?? undefined,
    gbraid: readAttributionClickId(attribution, 'gbraid') ?? undefined,
    wbraid: readAttributionClickId(attribution, 'wbraid') ?? undefined,
    utm_source: attribution?.utm.utm_source ?? undefined,
    utm_medium: attribution?.utm.utm_medium ?? undefined,
    utm_campaign: attribution?.utm.utm_campaign ?? undefined,
    utm_term: attribution?.utm.utm_term ?? undefined,
    utm_content: attribution?.utm.utm_content ?? undefined,
    raw_payload: buildRawPayload(body),
    attribution: attribution ?? undefined,
  };

  const supabase = createSupabaseAdmin();
  const { error } = await supabase.rpc('record_funnel_event', {
    payload: rpcPayload,
  });
  if (error) throw new Error(error.message);
  await triggerDispatch(eventId);
}

export async function POST(request: NextRequest) {
  let body: RequestBody;
  try {
    const parsed = RequestSchema.safeParse(await request.json());
    if (!parsed.success) return apiValidationError(parsed.error);
    body = parsed.data;
  } catch {
    return apiValidationError(
      new z.ZodError([
        {
          code: 'custom',
          path: [],
          message: 'Invalid JSON body',
          input: undefined,
        },
      ]),
    );
  }

  const tenant = await resolveTenant(
    body.subdomain,
    body.source_url,
    request.headers.get('host'),
  );

  if (!tenant.accountId || !tenant.websiteId) {
    log.warn('orphan_beacon_dropped', {
      event_name: body.event_name,
      subdomain: body.subdomain ?? null,
      reference_code: body.reference_code,
    });
    return apiSuccess({ event_id: null, deduped: false, dropped: 'no_tenant' });
  }

  const occurredAt = body.occurred_at ? new Date(body.occurred_at) : new Date();
  if (Number.isNaN(occurredAt.getTime())) {
    return apiValidationError(
      new z.ZodError([
        {
          code: 'invalid_type',
          path: ['occurred_at'],
          message: 'occurred_at is not a valid ISO datetime',
          expected: 'string',
          input: body.occurred_at,
        } as z.core.$ZodIssue,
      ]),
    );
  }

  try {
    const eventName = body.event_name as FunnelEventName;
    const eventId = await buildEventId({
      reference_code: body.reference_code,
      event_name: eventName,
      occurred_at: occurredAt,
    });
    const attribution = safeAttribution(body, tenant);

    if (isDispatcherEnabled()) {
      await recordViaRpc(
        body,
        { accountId: tenant.accountId, websiteId: tenant.websiteId },
        eventId,
        occurredAt,
        attribution,
      );
      return apiSuccess({ event_id: eventId, deduped: false });
    }

    const ingest: FunnelEventIngest = {
      event_id: eventId,
      pixel_event_id: eventId,
      event_name: eventName,
      source_system: 'waflow',
      business_stage: businessStageFor(body.event_name),
      owner: 'studio',
      optimization_policy: 'observation_only',
      stage: body.event_name === 'waflow_open' ? 'acquisition' : 'activation',
      channel: 'waflow',
      reference_code: body.reference_code,
      account_id: tenant.accountId,
      website_id: tenant.websiteId,
      locale: body.locale ?? 'es-CO',
      market: (body.market ?? 'CO') as GrowthMarket,
      occurred_at: occurredAt.toISOString(),
      source_url: body.source_url ?? null,
      page_path: body.page_path ?? null,
      attribution: attribution ?? null,
      payload: buildRawPayload(body),
      raw_payload: buildRawPayload(body),
    };

    const result = await insertFunnelEvent(createSupabaseAdmin(), ingest);
    return apiSuccess({ event_id: result.event_id, deduped: result.deduped });
  } catch (error) {
    log.error('emit_failed', {
      event_name: body.event_name,
      reference_code: body.reference_code,
      error: error instanceof Error ? error.message : String(error),
    });
    return apiInternalError('Failed to record WAFlow diagnostic event');
  }
}
