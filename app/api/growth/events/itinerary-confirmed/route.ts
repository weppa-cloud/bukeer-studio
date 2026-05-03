/**
 * POST /api/growth/events/itinerary-confirmed
 *
 * Server-to-server CRM/Flutter hook for the operational sale event.
 *
 * Policy: first confirmation wins. Re-confirming the same itinerary after
 * adjustments is deduped by a stable purchase event id derived from
 * `purchase:${itinerary_id}`.
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import { z } from 'zod';

import {
  apiError,
  apiInternalError,
  apiSuccess,
  apiUnauthorized,
  apiValidationError,
} from '@/lib/api/response';
import { insertFunnelEvent } from '@/lib/growth/funnel-events';
import { sendPurchaseConversions } from '@/lib/growth/purchase-conversions';
import { createLogger } from '@/lib/logger';
import { sha256Hex } from '@/lib/meta/conversions-api';
import {
  GrowthAttributionSchema,
  type FunnelEventIngest,
  type GrowthAttribution,
  type GrowthMarket,
} from '@bukeer/website-contract';

const log = createLogger('api.growth.events.itinerary-confirmed');

const UUID_PATTERN =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

const CustomerSchema = z
  .object({
    email: z.string().trim().email().optional().nullable(),
    phone: z.string().trim().min(4).max(80).optional().nullable(),
    name: z.string().trim().min(2).max(160).optional().nullable(),
    first_name: z.string().trim().min(1).max(80).optional().nullable(),
    last_name: z.string().trim().min(1).max(120).optional().nullable(),
  })
  .strict()
  .optional()
  .nullable();

const RequestSchema = z.object({
  itinerary_id: z.string().trim().uuid(),
  booking_id: z.string().trim().min(1).max(120).optional().nullable(),
  previous_status: z.string().trim().max(80).optional().nullable(),
  new_status: z.literal('Confirmado'),
  confirmed_at: z.string().datetime(),
  value: z.number().positive().optional().nullable(),
  currency: z.string().trim().length(3).optional().nullable(),
  reference_code: z.string().trim().min(8).max(64),
  source_url: z.string().trim().url().max(2048).optional().nullable(),
  page_path: z.string().trim().min(1).max(2048).optional().nullable(),
  locale: z
    .string()
    .regex(/^[a-z]{2}(-[A-Z]{2})?$/)
    .optional()
    .nullable(),
  market: z.enum(['CO', 'MX', 'US', 'CA', 'EU', 'OTHER']).optional().nullable(),
  customer: CustomerSchema,
});

type RequestBody = z.infer<typeof RequestSchema>;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function createSupabaseAdmin() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables for itinerary confirmation API');
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function timingSafeEqual(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left[i] ^ right[i];
  return diff === 0;
}

function authorize(request: NextRequest): boolean {
  const secret = process.env.CRM_CONVERSION_WEBHOOK_SECRET;
  if (!secret) return false;

  const header =
    request.headers.get('x-bukeer-crm-secret') ??
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
    '';
  return Boolean(header && timingSafeEqual(header, secret));
}

function normalizeCurrency(value: string | null | undefined): string | null {
  const text = value?.trim().toUpperCase();
  return text && /^[A-Z]{3}$/.test(text) ? text : null;
}

function deriveMarket(currency: string | null, explicit: GrowthMarket | null | undefined): GrowthMarket {
  if (explicit) return explicit;
  if (currency === 'MXN') return 'MX';
  if (currency === 'USD') return 'US';
  if (currency === 'EUR') return 'EU';
  return 'CO';
}

function deriveLocale(
  explicit: string | null | undefined,
  attribution: GrowthAttribution | null,
  itineraryLanguage: string | null,
): string {
  if (explicit && /^[a-z]{2}(-[A-Z]{2})?$/.test(explicit)) return explicit;
  if (attribution?.locale) return attribution.locale;
  const language = itineraryLanguage?.toLowerCase();
  if (language === 'en' || language === 'en-us' || language === 'english' || language === 'ingles' || language === 'inglés') {
    return 'en-US';
  }
  return 'es-CO';
}

async function resolveTenant(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  itineraryId: string,
): Promise<{
  accountId: string | null;
  websiteId: string | null;
  itinerary: Record<string, unknown> | null;
}> {
  const { data: itinerary, error } = await supabase
    .from('itineraries')
    .select('id,account_id,status,total_amount,total_cost,currency_type,language,custom_fields')
    .eq('id', itineraryId)
    .maybeSingle<Record<string, unknown>>();

  if (error) throw new Error(error.message);
  const accountId = typeof itinerary?.account_id === 'string' ? itinerary.account_id : null;
  if (!accountId) return { accountId: null, websiteId: null, itinerary: itinerary ?? null };

  const { data: website, error: websiteError } = await supabase
    .from('websites')
    .select('id')
    .eq('account_id', accountId)
    .eq('status', 'published')
    .order('updated_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (websiteError) throw new Error(websiteError.message);
  return { accountId, websiteId: website?.id ?? null, itinerary: itinerary ?? null };
}

async function findExistingBookingEvent(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  itineraryId: string,
): Promise<{ event_id: string; provider_status?: unknown } | null> {
  const { data, error } = await supabase
    .from('funnel_events')
    .select('event_id,provider_status')
    .eq('event_name', 'booking_confirmed')
    .contains('payload', { itinerary_id: itineraryId })
    .order('occurred_at', { ascending: true })
    .limit(1)
    .maybeSingle<{ event_id: string; provider_status?: unknown }>();

  if (error && error.code !== 'PGRST116') throw new Error(error.message);
  return data ?? null;
}

async function findExistingPurchaseConversion(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  purchaseEventId: string,
): Promise<{ status: string } | null> {
  const { data, error } = await supabase
    .from('meta_conversion_events')
    .select('status')
    .eq('provider', 'meta')
    .eq('event_name', 'Purchase')
    .eq('event_id', purchaseEventId)
    .limit(1)
    .maybeSingle<{ status: string }>();

  if (error && error.code !== 'PGRST116') throw new Error(error.message);
  return data ?? null;
}

async function updateFunnelProviderStatus(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  eventId: string,
  providerStatus: unknown,
): Promise<void> {
  const result = await supabase
    .from('funnel_events')
    .update({ provider_status: providerStatus })
    .eq('event_id', eventId);
  const error = (result as { error?: { message?: string } | null } | undefined)?.error;
  if (error) throw new Error(error.message ?? 'funnel_events provider_status update failed');
}

async function resolveAttribution(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  referenceCode: string,
  accountId: string,
  websiteId: string,
): Promise<GrowthAttribution | null> {
  const { data, error } = await supabase
    .from('funnel_events')
    .select('attribution,source_url,page_path')
    .eq('reference_code', referenceCode)
    .eq('account_id', accountId)
    .eq('website_id', websiteId)
    .not('attribution', 'is', null)
    .order('occurred_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ attribution: unknown; source_url?: string | null; page_path?: string | null }>();

  if (error && error.code !== 'PGRST116') throw new Error(error.message);
  const parsed = GrowthAttributionSchema.safeParse(data?.attribution);
  return parsed.success ? parsed.data : null;
}

function readItineraryNumber(itinerary: Record<string, unknown> | null, key: string): number | null {
  const value = itinerary?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readItineraryString(itinerary: Record<string, unknown> | null, key: string): string | null {
  const value = itinerary?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export async function POST(request: NextRequest) {
  if (!process.env.CRM_CONVERSION_WEBHOOK_SECRET) {
    return apiInternalError('CRM conversion webhook secret is not configured');
  }
  if (!authorize(request)) return apiUnauthorized('Invalid CRM conversion webhook secret');

  let body: RequestBody;
  try {
    const parsed = RequestSchema.safeParse(await request.json());
    if (!parsed.success) return apiValidationError(parsed.error);
    body = parsed.data;
  } catch {
    return apiError('INVALID_JSON', 'Invalid JSON body', 400);
  }

  const confirmedAt = new Date(body.confirmed_at);
  if (Number.isNaN(confirmedAt.getTime())) {
    return apiError('VALIDATION_ERROR', 'confirmed_at is not a valid ISO datetime', 400);
  }

  const supabase = createSupabaseAdmin();

  try {
    const tenant = await resolveTenant(supabase, body.itinerary_id);
    if (!tenant.accountId || !tenant.websiteId) {
      return apiError('TENANT_NOT_FOUND', 'Itinerary tenant or published website not found', 404);
    }
    if (!UUID_PATTERN.test(tenant.accountId) || !UUID_PATTERN.test(tenant.websiteId)) {
      return apiError('TENANT_NOT_FOUND', 'Itinerary tenant is not valid for growth events', 404);
    }

    const currency = normalizeCurrency(body.currency ?? readItineraryString(tenant.itinerary, 'currency_type'));
    const value = body.value ?? readItineraryNumber(tenant.itinerary, 'total_amount');
    const totalCost = readItineraryNumber(tenant.itinerary, 'total_cost');
    const attribution = await resolveAttribution(
      supabase,
      body.reference_code,
      tenant.accountId,
      tenant.websiteId,
    );
    const bookingId = body.booking_id ?? body.itinerary_id;
    const purchaseEventId = `purchase:${body.itinerary_id}`;
    const funnelEventId = await sha256Hex(`booking_confirmed:${body.itinerary_id}`);
    const existing = await findExistingBookingEvent(supabase, body.itinerary_id);
    const existingPurchase = await findExistingPurchaseConversion(supabase, purchaseEventId);

    if (existing && existingPurchase && (existingPurchase.status === 'sent' || existingPurchase.status === 'pending')) {
      return apiSuccess({
        event_id: existing.event_id,
        purchase_event_id: purchaseEventId,
        deduped: true,
        provider_status: existing.provider_status ?? [],
        purchase_status: existingPurchase.status,
      });
    }

    const providerStatus = await sendPurchaseConversions(supabase, {
      accountId: tenant.accountId,
      websiteId: tenant.websiteId,
      itineraryId: body.itinerary_id,
      bookingId,
      referenceCode: body.reference_code,
      purchaseEventId,
      occurredAt: confirmedAt,
      value,
      currency,
      eventSourceUrl: body.source_url ?? attribution?.source_url ?? null,
      attribution,
      customer: body.customer
        ? {
            email: body.customer.email ?? null,
            phone: body.customer.phone ?? null,
            name: body.customer.name ?? null,
            firstName: body.customer.first_name ?? null,
            lastName: body.customer.last_name ?? null,
          }
        : null,
    });

    if (existing) {
      await updateFunnelProviderStatus(supabase, existing.event_id, providerStatus);
      return apiSuccess({
        event_id: existing.event_id,
        purchase_event_id: purchaseEventId,
        deduped: true,
        provider_status: providerStatus,
      });
    }

    const ingest: FunnelEventIngest = {
      event_id: funnelEventId,
      event_name: 'booking_confirmed',
      stage: 'booking',
      channel: attribution?.channel ?? 'unknown',
      reference_code: body.reference_code,
      account_id: tenant.accountId,
      website_id: tenant.websiteId,
      locale: deriveLocale(body.locale ?? null, attribution, readItineraryString(tenant.itinerary, 'language')),
      market: deriveMarket(currency, body.market ?? attribution?.market ?? null),
      occurred_at: confirmedAt.toISOString(),
      source_url: body.source_url ?? attribution?.source_url ?? null,
      page_path: body.page_path ?? attribution?.page_path ?? null,
      attribution,
      provider_status: providerStatus,
      payload: {
        source: 'itinerary_confirmed_endpoint',
        itinerary_id: body.itinerary_id,
        booking_id: bookingId,
        previous_status: body.previous_status ?? null,
        new_status: body.new_status,
        amount: value ?? null,
        currency,
        gross_margin: value != null && totalCost != null ? value - totalCost : null,
        purchase_event_id: purchaseEventId,
      },
    };

    const result = await insertFunnelEvent(supabase, ingest);
    return apiSuccess({
      event_id: result.event_id,
      purchase_event_id: purchaseEventId,
      deduped: result.deduped,
      provider_status: providerStatus,
    });
  } catch (error) {
    log.error('emit_failed', {
      itinerary_id: body.itinerary_id,
      error: error instanceof Error ? error.message : String(error),
    });
    return apiInternalError('Failed to record itinerary confirmation event');
  }
}
