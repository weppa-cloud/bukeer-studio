import { z } from 'zod';
import {
  GrowthChannelSchema,
  GrowthTenantScopeSchema,
} from './growth-attribution';
import { FunnelStageSchema } from './growth-events';

/**
 * Growth Inventory Contract — SPEC #337 (#311)
 *
 * Each row represents one growth-actionable surface (URL/funnel step) tracked
 * by the Weekly Growth Council. Multi-tenant scoped (ADR-009): account_id +
 * website_id + locale + market are mandatory and reports never aggregate
 * across tenants without an explicit flag.
 *
 * Decision rule (SPEC #337):
 *   No row moves to in_progress unless it has hypothesis, baseline, owner,
 *   success_metric and evaluation_date.
 */

export const ExperimentResultSchema = z.enum([
  'pending',
  'win',
  'loss',
  'inconclusive',
  'scale',
  'stop',
]);
export type ExperimentResult = z.infer<typeof ExperimentResultSchema>;

export const InventoryStatusSchema = z.enum([
  'idea',
  'queued',
  'in_progress',
  'shipped',
  'evaluated',
  'archived',
]);
export type InventoryStatus = z.infer<typeof InventoryStatusSchema>;

export const InventorySubStatusSchema = z.enum([
  'pass',
  'pass_with_watch',
  'blocked',
  'unknown',
]);
export type InventorySubStatus = z.infer<typeof InventorySubStatusSchema>;

export const TemplateTypeSchema = z.enum([
  'home',
  'destination',
  'package',
  'activity',
  'hotel',
  'transfer',
  'blog',
  'landing',
  'other',
]);
export type TemplateType = z.infer<typeof TemplateTypeSchema>;

export const SearchIntentSchema = z.enum([
  'informational',
  'navigational',
  'commercial',
  'transactional',
  'mixed',
]);
export type SearchIntent = z.infer<typeof SearchIntentSchema>;

export const GrowthInventoryRowSchema = GrowthTenantScopeSchema.extend({
  source_url: z.string().url().max(2048),
  canonical_url: z.string().url().max(2048),

  template_type: TemplateTypeSchema,
  cluster: z.string().min(1).max(200).nullable().default(null),
  intent: SearchIntentSchema.nullable().default(null),
  funnel_stage: FunnelStageSchema,
  channel: GrowthChannelSchema,

  gsc_clicks_28d: z.number().int().nonnegative().default(0),
  gsc_impressions_28d: z.number().int().nonnegative().default(0),
  gsc_ctr: z.number().min(0).max(1).default(0),
  gsc_avg_position: z.number().min(0).default(0),

  ga4_sessions_28d: z.number().int().nonnegative().default(0),
  ga4_engagement: z.number().min(0).max(1).default(0),

  waflow_opens: z.number().int().nonnegative().default(0),
  waflow_submits: z.number().int().nonnegative().default(0),
  whatsapp_clicks: z.number().int().nonnegative().default(0),
  qualified_leads: z.number().int().nonnegative().default(0),
  quotes_sent: z.number().int().nonnegative().default(0),
  bookings_confirmed: z.number().int().nonnegative().default(0),
  booking_value: z.number().nonnegative().default(0),
  gross_margin: z.number().default(0),

  hypothesis: z.string().max(2000).nullable().default(null),
  experiment_id: z.string().max(120).nullable().default(null),
  ICE_score: z.number().min(0).nullable().default(null),
  RICE_score: z.number().min(0).nullable().default(null),
  success_metric: z.string().max(500).nullable().default(null),
  baseline_start: z.string().datetime().nullable().default(null),
  baseline_end: z.string().datetime().nullable().default(null),
  owner: z.string().min(1).max(120).nullable().default(null),
  owner_issue: z.string().regex(/^#?\d+$/).nullable().default(null),
  change_shipped_at: z.string().datetime().nullable().default(null),
  evaluation_date: z.string().datetime().nullable().default(null),
  result: ExperimentResultSchema.default('pending'),
  learning: z.string().max(2000).nullable().default(null),
  next_action: z.string().max(2000).nullable().default(null),

  technical_status: InventorySubStatusSchema.default('unknown'),
  content_status: InventorySubStatusSchema.default('unknown'),
  conversion_status: InventorySubStatusSchema.default('unknown'),
  attribution_status: InventorySubStatusSchema.default('unknown'),

  status: InventoryStatusSchema.default('idea'),
  priority_score: z.number().min(0).default(0),

  updated_at: z.string().datetime(),
});
export type GrowthInventoryRow = z.infer<typeof GrowthInventoryRowSchema>;

export const GrowthInventoryQuerySchema = z.object({
  account_id: z.string().uuid(),
  website_id: z.string().uuid(),
  locale: z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/).optional(),
  market: z.string().optional(),
  cluster: z.string().optional(),
  funnel_stage: FunnelStageSchema.optional(),
  status: InventoryStatusSchema.optional(),
  result: ExperimentResultSchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
});
export type GrowthInventoryQuery = z.infer<typeof GrowthInventoryQuerySchema>;

export const READY_FOR_IN_PROGRESS_FIELDS = [
  'hypothesis',
  'baseline_start',
  'owner',
  'success_metric',
  'evaluation_date',
] as const satisfies readonly (keyof GrowthInventoryRow)[];

export function isReadyForInProgress(row: GrowthInventoryRow): boolean {
  return READY_FOR_IN_PROGRESS_FIELDS.every((field) => row[field] != null);
}
