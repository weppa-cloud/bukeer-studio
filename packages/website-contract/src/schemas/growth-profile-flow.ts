import { z } from 'zod';

import { AgentLaneSchema } from './growth-agent-definitions';
import {
  GrowthAutonomyActionClassSchema,
  GrowthOutcomeEvaluationWindowSchema,
} from './growth-paperclip-autonomy';
import { GrowthTenantScopeSchema } from './growth-attribution';

const DateTimeSchema = z.string().datetime();
const JsonRecordSchema = z.record(z.string(), z.unknown()).default({});
const NonEmptyJsonRecordSchema = JsonRecordSchema.refine(
  (value) => Object.keys(value).length > 0,
  'Must contain at least one key.',
);

export const GrowthSignalSourceSchema = z.enum([
  'gsc',
  'ga4',
  'dataforseo',
  'crm',
  'funnel_events',
  'technical_audit',
  'content_inventory',
  'competitor_serp',
  'manual',
]);
export type GrowthSignalSource = z.infer<typeof GrowthSignalSourceSchema>;

export const GrowthProfileTypeSchema = z.enum([
  'business',
  'buyer',
  'seo_market',
  'competitor',
  'page_product',
  'agent_lane',
  'risk_policy',
]);
export type GrowthProfileType = z.infer<typeof GrowthProfileTypeSchema>;

export const GrowthOpportunityCandidateTypeSchema = z.enum([
  'keyword_gap',
  'page_decay',
  'missing_translation',
  'technical_seo_issue',
  'funnel_leak',
  'content_refresh',
  'internal_linking_gap',
]);
export type GrowthOpportunityCandidateType = z.infer<
  typeof GrowthOpportunityCandidateTypeSchema
>;

export const GrowthOpportunityCandidateStatusSchema = z.enum([
  'candidate',
  'ready_for_backlog',
  'promoted',
  'blocked',
  'rejected',
]);
export type GrowthOpportunityCandidateStatus = z.infer<
  typeof GrowthOpportunityCandidateStatusSchema
>;

const ScoreSchema = z.number().int().min(0).max(100);

const GrowthSignalFactBaseSchema = GrowthTenantScopeSchema.extend({
  source: GrowthSignalSourceSchema.or(z.string().min(1).max(80)),
  signal_type: z.string().min(1).max(120),
  entity_table: z.string().max(120).nullable().default(null),
  entity_id: z.string().uuid().nullable().default(null),
  entity_path: z.string().max(2048).nullable().default(null),
  observed_at: DateTimeSchema,
  expires_at: DateTimeSchema,
  confidence: z.number().min(0).max(1).default(0.7),
  payload: NonEmptyJsonRecordSchema,
  idempotency_key: z.string().min(8).max(240),
});

export const GrowthSignalFactSchema = GrowthSignalFactBaseSchema.extend({
  id: z.string().uuid(),
  created_at: DateTimeSchema,
}).superRefine((row, ctx) => {
  if (Date.parse(row.expires_at) <= Date.parse(row.observed_at)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['expires_at'],
      message: 'expires_at must be after observed_at.',
    });
  }
});
export type GrowthSignalFact = z.infer<typeof GrowthSignalFactSchema>;

export const GrowthSignalFactInsertSchema =
  GrowthSignalFactBaseSchema.superRefine((row, ctx) => {
    if (Date.parse(row.expires_at) <= Date.parse(row.observed_at)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['expires_at'],
        message: 'expires_at must be after observed_at.',
      });
    }
  });
export type GrowthSignalFactInsert = z.infer<
  typeof GrowthSignalFactInsertSchema
>;

const GrowthProfileBaseSchema = GrowthTenantScopeSchema.extend({
  profile_type: GrowthProfileTypeSchema,
  subject_table: z.string().max(120).nullable().default(null),
  subject_id: z.string().uuid().nullable().default(null),
  subject_key: z.string().max(240).nullable().default(null),
  source: z.string().min(1).max(120).default('growth_profile_refresh'),
  confidence: z.number().min(0).max(1).default(0.7),
  valid_from: DateTimeSchema,
  valid_until: DateTimeSchema,
  freshness_ttl_hours: z.number().int().positive(),
  payload: NonEmptyJsonRecordSchema,
  source_signal_fact_ids: z.array(z.string().uuid()).default([]),
  policy_version: z.string().min(1).max(80).default('profile-freshness-v1'),
});

export const GrowthProfileSchema = GrowthProfileBaseSchema.extend({
  id: z.string().uuid(),
  created_at: DateTimeSchema,
  updated_at: DateTimeSchema,
}).superRefine((row, ctx) => {
  if (Date.parse(row.valid_until) <= Date.parse(row.valid_from)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['valid_until'],
      message: 'valid_until must be after valid_from.',
    });
  }
});
export type GrowthProfile = z.infer<typeof GrowthProfileSchema>;

export const GrowthProfileInsertSchema =
  GrowthProfileBaseSchema.superRefine((row, ctx) => {
    if (Date.parse(row.valid_until) <= Date.parse(row.valid_from)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['valid_until'],
        message: 'valid_until must be after valid_from.',
      });
    }
  });
export type GrowthProfileInsert = z.infer<typeof GrowthProfileInsertSchema>;

const GrowthOpportunityCandidateBaseSchema = GrowthTenantScopeSchema.extend({
  candidate_type: GrowthOpportunityCandidateTypeSchema,
  lane: AgentLaneSchema,
  allowed_action_class: GrowthAutonomyActionClassSchema,
  title: z.string().min(1).max(240),
  summary: z.string().min(1).max(2000),
  impact_score: ScoreSchema.default(0),
  confidence: z.number().min(0).max(1).default(0.5),
  urgency_score: ScoreSchema.default(0),
  cost_score: ScoreSchema.default(50),
  risk_score: ScoreSchema.default(50),
  total_score: ScoreSchema.default(0),
  status: GrowthOpportunityCandidateStatusSchema.default('candidate'),
  blocking_reason: z.string().max(1000).nullable().default(null),
  required_profile_types: z.array(GrowthProfileTypeSchema).default([]),
  profile_snapshot: JsonRecordSchema,
  source_signal_fact_ids: z.array(z.string().uuid()).default([]),
  evidence: NonEmptyJsonRecordSchema,
  success_metric: z.string().min(1).max(200).nullable().default(null),
  evaluation_window: GrowthOutcomeEvaluationWindowSchema.nullable().default(null),
  idempotency_key: z.string().min(8).max(240),
  promoted_work_item_id: z.string().uuid().nullable().default(null),
});

export const GrowthOpportunityCandidateSchema =
  GrowthOpportunityCandidateBaseSchema.extend({
    id: z.string().uuid(),
    created_at: DateTimeSchema,
    updated_at: DateTimeSchema,
  });
export type GrowthOpportunityCandidate = z.infer<
  typeof GrowthOpportunityCandidateSchema
>;

export const GrowthOpportunityCandidateInsertSchema =
  GrowthOpportunityCandidateBaseSchema;
export type GrowthOpportunityCandidateInsert = z.infer<
  typeof GrowthOpportunityCandidateInsertSchema
>;
