import { z } from 'zod';
import {
  GrowthAttributionSchema,
  GrowthChannelSchema,
  GrowthTenantScopeSchema,
} from './growth-attribution';

/**
 * Growth Funnel Events — SPEC #337 / #452
 *
 * Canonical funnel events emitted by browser, server, CRM, and DB triggers.
 * event_id contract (ADR-018 / ADR-029):
 *   event_id = unique text. Current Studio writers use lowercase sha256; DB
 *   triggers may use deterministic hashes; future server writers may use other
 *   stable text ids. Pixel/CAPI dedupe MUST use pixel_event_id, not event_id.
 *
 * - reference_code: stable per-session id minted on first WAFlow open or page view
 * - event_name: enum below
 * - occurred_at_ms: unix millis truncated to seconds for browser/server alignment
 *
 * event_id is the immutable text PK for funnel_events. pixel_event_id is the
 * platform dedupe id sent to browser Pixel and server CAPI/Events API.
 */

export const FunnelEventNameSchema = z.enum([
  // Canonical ADR-029 event matrix.
  'pageview',
  'phone_cta_click',
  'email_cta_click',
  'cal_booking_click',
  'quote_form_submit',
  'chatwoot_conversation_started',
  'chatwoot_message_received',
  'chatwoot_label_qualified',
  'crm_lead_stage_qualified',
  'crm_quote_sent',
  'crm_booking_confirmed',
  'crm_booking_cancelled',
  'crm_lead_dropped',

  // Existing Studio events and legacy aliases accepted during F1-F3 migration.
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

export const BusinessStageSchema = z.enum([
  'awareness',
  'intent',
  'lead',
  'engagement',
  'qualify',
  'quote',
  'booking',
  'review_referral',
  'dropped',
]);
export type BusinessStage = z.infer<typeof BusinessStageSchema>;

/**
 * Legacy operational stage aliases. Prefer BusinessStageSchema for new code.
 */
export const FunnelStageSchema = z.enum([
  'acquisition',
  'activation',
  'qualified_lead',
  'quote_sent',
  'booking',
  'review_referral',
]);
export type FunnelStage = z.infer<typeof FunnelStageSchema>;

export const FunnelSourceSystemSchema = z.enum([
  'studio_web',
  'waflow',
  'chatwoot',
  'flutter_crm',
  'db_trigger',
  'unknown',
]);
export type FunnelSourceSystem = z.infer<typeof FunnelSourceSystemSchema>;

export const FunnelEventOwnerSchema = z.enum([
  'studio',
  'chatwoot',
  'crm',
  'booking',
  'growth_ops',
]);
export type FunnelEventOwner = z.infer<typeof FunnelEventOwnerSchema>;

export const FunnelOptimizationPolicySchema = z.enum([
  'primary_conversion',
  'secondary_conversion',
  'observation_only',
  'internal_only',
  'do_not_dispatch',
]);
export type FunnelOptimizationPolicy = z.infer<typeof FunnelOptimizationPolicySchema>;

export const FunnelConfidenceSchema = z.enum([
  'high',
  'medium',
  'low',
  'unknown',
]);
export type FunnelConfidence = z.infer<typeof FunnelConfidenceSchema>;

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
  event_id: z.string().min(1).max(200),
  pixel_event_id: z.string().min(1).max(200).nullable().default(null),
  event_version: z.number().int().positive().default(1),
  event_name: FunnelEventNameSchema,
  source_system: FunnelSourceSystemSchema.default('studio_web'),
  business_stage: BusinessStageSchema.default('lead'),
  owner: FunnelEventOwnerSchema.default('studio'),
  optimization_policy: FunnelOptimizationPolicySchema.default('observation_only'),
  identity_confidence: FunnelConfidenceSchema.default('unknown'),
  attribution_confidence: FunnelConfidenceSchema.default('unknown'),

  // Legacy compatibility aliases. New writers should use source_system,
  // business_stage, and raw_payload.
  source: FunnelSourceSystemSchema.optional(),
  stage: FunnelStageSchema,
  channel: GrowthChannelSchema.default('unknown'),
  reference_code: z.string().min(8).max(64),
  occurred_at: z.string().datetime(),
  event_time: z.string().datetime().optional(),
  attribution: GrowthAttributionSchema.nullable().default(null),
  payload: z.record(z.string(), z.unknown()).default({}),
  raw_payload: z.record(z.string(), z.unknown()).default({}),
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
  pixel_event_id: true,
  event_version: true,
  source_system: true,
  business_stage: true,
  owner: true,
  optimization_policy: true,
  identity_confidence: true,
  attribution_confidence: true,
  source: true,
  event_time: true,
  raw_payload: true,
});
export type FunnelEventIngest = z.infer<typeof FunnelEventIngestSchema>;

export const EVENT_NAME_TO_BUSINESS_STAGE: Record<FunnelEventName, BusinessStage> = {
  pageview: 'awareness',
  whatsapp_cta_click: 'intent',
  phone_cta_click: 'intent',
  email_cta_click: 'intent',
  cal_booking_click: 'intent',
  waflow_open: 'awareness',
  waflow_step_next: 'intent',
  waflow_submit: 'lead',
  quote_form_submit: 'lead',
  chatwoot_conversation_started: 'lead',
  chatwoot_message_received: 'engagement',
  chatwoot_label_qualified: 'qualify',
  crm_lead_stage_qualified: 'qualify',
  qualified_lead: 'qualify',
  crm_quote_sent: 'quote',
  quote_sent: 'quote',
  crm_booking_confirmed: 'booking',
  booking_confirmed: 'booking',
  crm_booking_cancelled: 'booking',
  crm_lead_dropped: 'dropped',
  review_submitted: 'review_referral',
  referral_lead: 'review_referral',
};

export const EVENT_NAME_TO_OWNER: Record<FunnelEventName, FunnelEventOwner> = {
  pageview: 'studio',
  whatsapp_cta_click: 'studio',
  phone_cta_click: 'studio',
  email_cta_click: 'studio',
  cal_booking_click: 'studio',
  waflow_open: 'studio',
  waflow_step_next: 'studio',
  waflow_submit: 'studio',
  quote_form_submit: 'studio',
  chatwoot_conversation_started: 'chatwoot',
  chatwoot_message_received: 'chatwoot',
  chatwoot_label_qualified: 'chatwoot',
  crm_lead_stage_qualified: 'crm',
  qualified_lead: 'crm',
  crm_quote_sent: 'crm',
  quote_sent: 'crm',
  crm_booking_confirmed: 'booking',
  booking_confirmed: 'booking',
  crm_booking_cancelled: 'booking',
  crm_lead_dropped: 'crm',
  review_submitted: 'growth_ops',
  referral_lead: 'growth_ops',
};

export const EVENT_NAME_TO_OPTIMIZATION_POLICY: Record<FunnelEventName, FunnelOptimizationPolicy> = {
  pageview: 'observation_only',
  whatsapp_cta_click: 'secondary_conversion',
  phone_cta_click: 'secondary_conversion',
  email_cta_click: 'secondary_conversion',
  cal_booking_click: 'secondary_conversion',
  waflow_open: 'observation_only',
  waflow_step_next: 'observation_only',
  waflow_submit: 'primary_conversion',
  quote_form_submit: 'primary_conversion',
  chatwoot_conversation_started: 'secondary_conversion',
  chatwoot_message_received: 'observation_only',
  chatwoot_label_qualified: 'primary_conversion',
  crm_lead_stage_qualified: 'primary_conversion',
  qualified_lead: 'primary_conversion',
  crm_quote_sent: 'primary_conversion',
  quote_sent: 'primary_conversion',
  crm_booking_confirmed: 'primary_conversion',
  booking_confirmed: 'primary_conversion',
  crm_booking_cancelled: 'internal_only',
  crm_lead_dropped: 'internal_only',
  review_submitted: 'observation_only',
  referral_lead: 'secondary_conversion',
};

export const EVENT_NAME_TO_STAGE: Record<FunnelEventName, FunnelStage> = {
  pageview: 'acquisition',
  phone_cta_click: 'activation',
  email_cta_click: 'activation',
  cal_booking_click: 'activation',
  waflow_open: 'acquisition',
  waflow_step_next: 'activation',
  waflow_submit: 'activation',
  quote_form_submit: 'activation',
  whatsapp_cta_click: 'activation',
  chatwoot_conversation_started: 'qualified_lead',
  chatwoot_message_received: 'activation',
  chatwoot_label_qualified: 'qualified_lead',
  crm_lead_stage_qualified: 'qualified_lead',
  qualified_lead: 'qualified_lead',
  crm_quote_sent: 'quote_sent',
  quote_sent: 'quote_sent',
  crm_booking_confirmed: 'booking',
  booking_confirmed: 'booking',
  crm_booking_cancelled: 'booking',
  crm_lead_dropped: 'qualified_lead',
  review_submitted: 'review_referral',
  referral_lead: 'review_referral',
};
