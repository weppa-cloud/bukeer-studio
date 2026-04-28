/**
 * POST /api/growth/events/whatsapp-cta
 *
 * Server beacon for the `whatsapp_cta_click` funnel event (SPEC #337).
 *
 * The browser fires `navigator.sendBeacon()` BEFORE redirecting to wa.me so
 * the server has a deterministic record of the click — independent of
 * gtag/fbq, useful for dedupe with Meta CAPI / GA4 measurement protocol and
 * for funnel attribution when third-party pixels are blocked.
 *
 * Contract:
 *   Request body (JSON):
 *     {
 *       reference_code: string;       // 8-64 chars, stable per-session id
 *       source_url?: string | null;   // page where the CTA was rendered
 *       page_path?: string | null;
 *       referrer?: string | null;
 *       subdomain?: string | null;    // tenant lookup
 *       locale?: string | null;       // BCP-47, defaults to es-CO
 *       market?: 'CO'|'MX'|'US'|'CA'|'EU'|'OTHER';
 *       location_context?: string | null;  // hero | sticky | sidebar | waflow_*
 *       variant?: string | null;
 *       destination_slug?: string | null;
 *       package_slug?: string | null;
 *       occurred_at?: string;         // ISO. Defaults to server now.
 *     }
 *
 *   Response (ADR-012 envelope):
 *     200 { success: true, data: { event_id, deduped } }
 *     400 { success: false, error: { code: 'VALIDATION_ERROR', ... } }
 *     404 { success: false, error: { code: 'TENANT_NOT_FOUND', ... } }
 *     500 { success: false, error: { code: 'INTERNAL_ERROR', ... } }
 *
 * Guarantees:
 *   - OpenNext-compatible: this endpoint runs in the default Worker function
 *     because OpenNext cannot bundle this API route as an Edge runtime route.
 *   - Idempotent (ADR-018): event_id is sha256(reference_code:event_name:occurred_at_s);
 *     duplicate POSTs (e.g. Beacon + onClick double-fire) dedupe at the DB layer
 *     via funnel_events.event_id PK + ON CONFLICT DO NOTHING.
 *   - Multi-tenant (ADR-009): always scopes account_id + website_id when
 *     subdomain resolves; orphan beacons (no tenant) are dropped without error
 *     so the client redirect path is never blocked.
 *   - Privacy (growth-attribution-governance.md): no PII fields are accepted
 *     or persisted (no phone, name, email).
 *   - STRICT_ADS_ZERO=1 unaffected: this is a first-party endpoint; the smoke
 *     test only counts pings to googleadservices.com / facebook.com / etc.
 *
 * @see lib/growth/funnel-events.ts
 * @see lib/growth/event-id.ts
 * @see lib/growth/attribution-parser.ts
 * @see app/api/waflow/lead/route.ts (pattern reference)
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import { z } from 'zod';

import {
  apiInternalError,
  apiSuccess,
  apiValidationError,
} from '@/lib/api/response';
import { buildEventId } from '@/lib/growth/event-id';
import { insertFunnelEvent } from '@/lib/growth/funnel-events';
import { parseAttribution } from '@/lib/growth/attribution-parser';
import { createLogger } from '@/lib/logger';
import {
  GrowthAttributionSchema,
  type FunnelEventIngest,
  type GrowthAttribution,
  type GrowthMarket,
} from '@bukeer/website-contract';

const log = createLogger('api.growth.events.whatsapp-cta');

const RequestSchema = z.object({
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
  location_context: z.string().trim().max(80).optional().nullable(),
  variant: z.string().trim().max(8).optional().nullable(),
  destination_slug: z.string().trim().max(160).optional().nullable(),
  package_slug: z.string().trim().max(160).optional().nullable(),
  occurred_at: z.string().datetime().optional().nullable(),
});

type RequestBody = z.infer<typeof RequestSchema>;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function createSupabaseAdmin() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing Supabase environment variables for whatsapp-cta beacon API',
    );
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function resolveTenant(
  subdomain: string | null | undefined,
): Promise<{ accountId: string | null; websiteId: string | null }> {
  if (!subdomain) return { accountId: null, websiteId: null };
  try {
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from('websites')
      .select('id,account_id')
      .eq('subdomain', subdomain)
      .eq('status', 'published')
      .maybeSingle<{ id: string; account_id: string | null }>();
    if (error) {
      log.warn('tenant_lookup_failed', { subdomain, error: error.message });
      return { accountId: null, websiteId: null };
    }
    if (!data) return { accountId: null, websiteId: null };
    return { accountId: data.account_id, websiteId: data.id };
  } catch (error) {
    log.warn('tenant_lookup_threw', {
      subdomain,
      error: error instanceof Error ? error.message : String(error),
    });
    return { accountId: null, websiteId: null };
  }
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
      // session_key has its own contract; the CTA beacon doesn't carry the
      // WAFlow session uuid so we use the reference_code as a stable surrogate.
      session_key: body.reference_code,
    });
    // Coerce the Input shape (utm/click_ids/channel optional) into the strict
    // `GrowthAttribution` shape FunnelEventSchema expects.
    return GrowthAttributionSchema.parse(candidate);
  } catch (error) {
    log.warn('attribution_parse_failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
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

  const tenant = await resolveTenant(body.subdomain);

  // Orphan beacon (no tenant resolved) — drop silently. The redirect to wa.me
  // already happened on the client; failing here would be noise without
  // signal. We still return 200 so sendBeacon() doesn't surface as an error.
  if (!tenant.accountId || !tenant.websiteId) {
    log.warn('orphan_beacon_dropped', {
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
    const eventId = await buildEventId({
      reference_code: body.reference_code,
      event_name: 'whatsapp_cta_click',
      occurred_at: occurredAt,
    });

    const attribution = safeAttribution(body, tenant);

    const ingest: FunnelEventIngest = {
      event_id: eventId,
      event_name: 'whatsapp_cta_click',
      stage: 'activation',
      channel: 'whatsapp',
      reference_code: body.reference_code,
      account_id: tenant.accountId,
      website_id: tenant.websiteId,
      locale: body.locale ?? 'es-CO',
      market: (body.market ?? 'CO') as GrowthMarket,
      occurred_at: occurredAt.toISOString(),
      source_url: body.source_url ?? null,
      page_path: body.page_path ?? null,
      attribution: attribution ?? null,
      payload: {
        location_context: body.location_context ?? null,
        variant: body.variant ?? null,
        destination_slug: body.destination_slug ?? null,
        package_slug: body.package_slug ?? null,
        subdomain: body.subdomain ?? null,
      },
    };

    const result = await insertFunnelEvent(createSupabaseAdmin(), ingest);
    return apiSuccess({ event_id: result.event_id, deduped: result.deduped });
  } catch (error) {
    log.error('emit_failed', {
      reference_code: body.reference_code,
      error: error instanceof Error ? error.message : String(error),
    });
    return apiInternalError('Failed to record whatsapp_cta_click event');
  }
}
