/**
 * POST /api/growth/events/itinerary-confirmed
 *
 * Thin compatibility wrapper around the canonical `record_booking_confirmed`
 * Supabase RPC introduced in migration
 * `20260503150100_record_booking_confirmed_rpc.sql` (F3 #422).
 *
 * Why a wrapper instead of a delete?
 *   * Flutter currently posts here from its booking-confirm UI flow as a
 *     belt-and-braces signal alongside the DB trigger
 *     (`trg_itinerary_emit_crm_booking_confirmed`). Removing the route
 *     mid-cutover would force a synchronised Studio + Flutter deploy. Per
 *     ADR-029 §"Migration path" we prefer additive changes during the F1->F3
 *     transition.
 *   * The RPC and the trigger share the same deterministic event_id, so
 *     calling both produces ONE funnel_events row (idempotent on PK).
 *   * Once cross-repo #797 lands and Flutter migrates to direct RPC calls,
 *     this route can be deleted in a follow-up PR (target sprint after F3
 *     ships).
 *
 * Behaviour change vs the pre-F3 route:
 *   * No more direct call to `lib/growth/purchase-conversions.ts` -- that
 *     code path duplicated dispatcher logic now owned by F1's
 *     `dispatch-funnel-event` Edge Function. The dispatcher fans the event
 *     out to Meta CAPI / Google Ads / GA4 driven by the
 *     `event_destination_mapping` config table.
 *   * Value carried by the funnel event is now `total_markup` (read inside
 *     the RPC), NOT `total_amount`. Callers can no longer override it via
 *     the `value` body field -- that field is silently ignored and recorded
 *     in the response as `value_override_ignored: true` for diagnostics.
 *
 * Auth contract (unchanged):
 *   * `x-bukeer-crm-secret` or `Authorization: Bearer <secret>` header MUST
 *     match `CRM_CONVERSION_WEBHOOK_SECRET`.
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
import { createLogger } from '@/lib/logger';

const log = createLogger('api.growth.events.itinerary-confirmed');

const RequestSchema = z
  .object({
    itinerary_id: z.string().trim().uuid(),
    booking_id: z.string().trim().min(1).max(120).optional().nullable(),
    previous_status: z.string().trim().max(80).optional().nullable(),
    new_status: z.literal('Confirmado').optional(),
    confirmed_at: z.string().datetime().optional(),
    value: z.number().positive().optional().nullable(),
    currency: z.string().trim().length(3).optional().nullable(),
    reference_code: z.string().trim().min(8).max(64).optional().nullable(),
    source_url: z.string().trim().url().max(2048).optional().nullable(),
    page_path: z.string().trim().min(1).max(2048).optional().nullable(),
    locale: z
      .string()
      .regex(/^[a-z]{2}(-[A-Z]{2})?$/)
      .optional()
      .nullable(),
    market: z.enum(['CO', 'MX', 'US', 'CA', 'EU', 'OTHER']).optional().nullable(),
    customer: z.unknown().optional().nullable(),
  })
  .strip();

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

  const supabase = createSupabaseAdmin();

  try {
    const { data, error } = await supabase.rpc('record_booking_confirmed', {
      p_itinerary_id: body.itinerary_id,
    });

    if (error) {
      log.error('rpc_failed', {
        itinerary_id: body.itinerary_id,
        code: error.code,
        message: error.message,
      });
      return apiInternalError('Failed to record itinerary confirmation event');
    }

    return apiSuccess({
      itinerary_id: body.itinerary_id,
      rpc: data,
      value_override_ignored: body.value != null,
      currency_override_ignored: body.currency != null,
      legacy_fields_received: {
        booking_id: body.booking_id ?? null,
        previous_status: body.previous_status ?? null,
        new_status: body.new_status ?? null,
        confirmed_at: body.confirmed_at ?? null,
        reference_code: body.reference_code ?? null,
        source_url: body.source_url ?? null,
        page_path: body.page_path ?? null,
        locale: body.locale ?? null,
        market: body.market ?? null,
      },
    });
  } catch (error) {
    log.error('emit_failed', {
      itinerary_id: body.itinerary_id,
      error: error instanceof Error ? error.message : String(error),
    });
    return apiInternalError('Failed to record itinerary confirmation event');
  }
}
