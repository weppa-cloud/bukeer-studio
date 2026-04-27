import { z } from 'zod';
import {
  GrowthAttributionSchema,
  GrowthChannelSchema,
  GrowthTenantScopeSchema,
} from './growth-attribution';

/**
 * Growth Funnel Events — SPEC #337
 *
 * Minimum funnel events emitted by browser + server.
 * event_id contract (ADR-018):
 *   event_id = lowercase(sha256(reference_code + ':' + event_name + ':' + occurred_at_ms))
 *
 * - reference_code: stable per-session id minted on first WAFlow open or page view
 * - event_name: enum below
 * - occurred_at_ms: unix millis truncated to seconds for browser/server alignment
 *
 * Same event_id MUST be sent from browser pixel and server CAPI/Events API for
 * dedupe via meta_conversion_events (provider, event_name, event_id) unique key.
 */

export const FunnelEventNameSchema = z.enum([
  'waflow_open',
  'waflow_step_next',
  'waflow_submit',
  'whatsapp_cta_click',
  'qualified_lead',
  'quote_sent',
  'booking_confirmed',
  'review_submitted',
  'referral_lead',
]);
export type FunnelEventName = z.infer<typeof FunnelEventNameSchema>;

export const FunnelStageSchema = z.enum([
  'acquisition',
  'activation',
  'qualified_lead',
  'quote_sent',
  'booking',
  'review_referral',
]);
export type FunnelStage = z.infer<typeof FunnelStageSchema>;

export const ProviderEventStatusSchema = z.enum([
  'pending',
  'sent',
  'failed',
  'skipped',
]);
export type ProviderEventStatus = z.infer<typeof ProviderEventStatusSchema>;

export const FunnelEventProviderSchema = z.enum([
  'meta_capi',
  'meta_pixel',
  'google_ads_enhanced',
  'google_ads_offline',
  'tiktok_pixel',
  'tiktok_events_api',
  'ga4',
  'chatwoot',
  'waflow',
]);
export type FunnelEventProvider = z.infer<typeof FunnelEventProviderSchema>;

export const FunnelEventProviderRecordSchema = z.object({
  provider: FunnelEventProviderSchema,
  status: ProviderEventStatusSchema,
  attempted_at: z.string().datetime(),
  error_code: z.string().max(120).nullable().default(null),
});
export type FunnelEventProviderRecord = z.infer<typeof FunnelEventProviderRecordSchema>;

export const FunnelEventSchema = GrowthTenantScopeSchema.extend({
  event_id: z.string().regex(/^[0-9a-f]{64}$/, 'event_id must be sha256 hex lowercase'),
  event_name: FunnelEventNameSchema,
  stage: FunnelStageSchema,
  channel: GrowthChannelSchema.default('unknown'),
  reference_code: z.string().min(8).max(64),
  occurred_at: z.string().datetime(),
  attribution: GrowthAttributionSchema.nullable().default(null),
  payload: z.record(z.string(), z.unknown()).default({}),
  provider_status: z.array(FunnelEventProviderRecordSchema).default([]),
  source_url: z.string().url().max(2048).nullable().default(null),
  page_path: z.string().min(1).max(2048).nullable().default(null),
});
export type FunnelEvent = z.infer<typeof FunnelEventSchema>;

export const FunnelEventIngestSchema = FunnelEventSchema.partial({
  attribution: true,
  payload: true,
  provider_status: true,
  source_url: true,
  page_path: true,
  channel: true,
});
export type FunnelEventIngest = z.infer<typeof FunnelEventIngestSchema>;

export const EVENT_NAME_TO_STAGE: Record<FunnelEventName, FunnelStage> = {
  waflow_open: 'acquisition',
  waflow_step_next: 'activation',
  waflow_submit: 'activation',
  whatsapp_cta_click: 'activation',
  qualified_lead: 'qualified_lead',
  quote_sent: 'quote_sent',
  booking_confirmed: 'booking',
  review_submitted: 'review_referral',
  referral_lead: 'review_referral',
};
