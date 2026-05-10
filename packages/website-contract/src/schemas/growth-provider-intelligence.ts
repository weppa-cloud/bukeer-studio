import { z } from 'zod';

import { GrowthTenantScopeSchema } from './growth-attribution';

const DateTimeSchema = z.string().datetime();
const JsonRecordSchema = z.record(z.string(), z.unknown()).default({});
const SourceRefsSchema = z
  .union([
    JsonRecordSchema,
    z.array(z.string().min(1).max(240)),
  ])
  .default([]);

export const GrowthProviderSchema = z.enum([
  'dataforseo',
  'gsc',
  'ga4',
  'clarity',
]);
export type GrowthProvider = z.infer<typeof GrowthProviderSchema>;

export const GrowthProviderProfileRunStatusSchema = z.enum([
  'queued',
  'running',
  'completed',
  'failed',
  'blocked',
  'cost_gated',
  'quota_exhausted',
  'blocked_provider_error',
]);
export type GrowthProviderProfileRunStatus = z.infer<
  typeof GrowthProviderProfileRunStatusSchema
>;

export const GrowthProviderFreshnessStatusSchema = z.enum([
  'fresh',
  'stale',
  'missing',
  'blocked',
  'approval_required',
  'cost_gated',
  'quota_exhausted',
]);
export type GrowthProviderFreshnessStatus = z.infer<
  typeof GrowthProviderFreshnessStatusSchema
>;

export const GrowthProviderQualityStatusSchema = z.enum([
  'pass',
  'watch',
  'blocked',
]);
export type GrowthProviderQualityStatus = z.infer<
  typeof GrowthProviderQualityStatusSchema
>;

export const GrowthProviderCostModeSchema = z.enum([
  'free',
  'included',
  'cost_gated',
  'approval_required',
]);
export type GrowthProviderCostMode = z.infer<
  typeof GrowthProviderCostModeSchema
>;

export const GrowthEvidenceDedupeVerdictSchema = z.enum([
  'create',
  'coalesce',
  'skip',
  'reopen',
  'block',
  'scale',
]);
export type GrowthEvidenceDedupeVerdict = z.infer<
  typeof GrowthEvidenceDedupeVerdictSchema
>;

export const GrowthProviderApprovalSchema = z
  .object({
    owner_issue: z.string().min(1).max(120),
    approver_role: z.string().min(1).max(80),
    approved_by: z.string().min(1).max(160),
    approved_at: DateTimeSchema,
    expires_at: DateTimeSchema,
    scope: JsonRecordSchema,
    max_cost_usd_per_run: z.number().min(0).nullable().default(null),
    monthly_cap_usd: z.number().min(0).nullable().default(null),
  })
  .superRefine((row, ctx) => {
    if (Date.parse(row.expires_at) <= Date.parse(row.approved_at)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['expires_at'],
        message: 'expires_at must be after approved_at.',
      });
    }
  });
export type GrowthProviderApproval = z.infer<typeof GrowthProviderApprovalSchema>;

export const GrowthProviderCircuitBreakerSchema = z.object({
  failure_count: z.number().int().min(0).default(0),
  status: z
    .enum([
      'closed',
      'open',
      'cooldown',
      'blocked_provider_error',
      'quota_exhausted',
      'cost_gated',
    ])
    .default('closed'),
  last_error_class: z.string().max(200).nullable().default(null),
  last_error_at: DateTimeSchema.nullable().default(null),
  cooldown_until: DateTimeSchema.nullable().default(null),
  reset_by: z.string().max(160).nullable().default(null),
});
export type GrowthProviderCircuitBreaker = z.infer<
  typeof GrowthProviderCircuitBreakerSchema
>;

const ProviderProfileRunBaseSchema = GrowthTenantScopeSchema.extend({
  provider: GrowthProviderSchema,
  profile_id: z.string().min(1).max(120),
  run_status: GrowthProviderProfileRunStatusSchema.default('queued'),
  freshness_status: GrowthProviderFreshnessStatusSchema.default('missing'),
  quality_status: GrowthProviderQualityStatusSchema.default('watch'),
  source_refs: SourceRefsSchema,
  cost_usd: z.number().min(0).default(0),
  evidence_fingerprint: z.string().min(8).max(160).nullable().default(null),
  entity_key: z.string().min(1).max(300).nullable().default(null),
  action_key: z.string().min(1).max(300).nullable().default(null),
  approval: GrowthProviderApprovalSchema.nullable().default(null),
  circuit_breaker: GrowthProviderCircuitBreakerSchema.default({
    failure_count: 0,
    status: 'closed',
    last_error_class: null,
    last_error_at: null,
    cooldown_until: null,
    reset_by: null,
  }),
  payload: JsonRecordSchema,
  idempotency_key: z.string().min(8).max(240),
  started_at: DateTimeSchema.nullable().default(null),
  completed_at: DateTimeSchema.nullable().default(null),
  error: z.string().max(2000).nullable().default(null),
}).superRefine((row, ctx) => {
  if (
    row.completed_at &&
    row.started_at &&
    Date.parse(row.completed_at) < Date.parse(row.started_at)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['completed_at'],
      message: 'completed_at must be after started_at.',
    });
  }

  if (
    (row.run_status === 'cost_gated' ||
      row.freshness_status === 'approval_required') &&
    !row.approval
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['approval'],
      message:
        'Cost-gated or approval-required runs must include approval metadata.',
    });
  }
});

export const ProviderProfileRunSchema = ProviderProfileRunBaseSchema.extend({
  id: z.string().uuid(),
  created_at: DateTimeSchema,
  updated_at: DateTimeSchema,
});
export type ProviderProfileRun = z.infer<typeof ProviderProfileRunSchema>;

export const ProviderProfileRunInsertSchema = ProviderProfileRunBaseSchema;
export type ProviderProfileRunInsert = z.infer<
  typeof ProviderProfileRunInsertSchema
>;

export const ProviderEvidenceReadSchema = z.object({
  provider: GrowthProviderSchema.or(z.string().min(1).max(80)),
  profile_id: z.string().min(1).max(120),
  profile_run_id: z.string().uuid().nullable().default(null),
  feature_profile: z.string().min(1).max(120).nullable().default(null),
  access_status: z.string().min(1).max(120).nullable().default(null),
  freshness_status: GrowthProviderFreshnessStatusSchema.nullable().default(null),
  quality_status: GrowthProviderQualityStatusSchema.nullable().default(null),
  source_refs: SourceRefsSchema,
  cache_ids: z.array(z.string().min(1).max(240)).default([]),
  fact_ids: z.array(z.string().uuid()).default([]),
  row_count: z.number().int().min(0).default(0),
  evidence_count: z.number().int().min(0).default(0),
  evidence_fingerprint: z.string().min(8).max(160),
  required_for_action: z.boolean().default(true),
  exception_reason: z.string().max(1000).nullable().default(null),
  entity_key: z.string().min(1).max(300).nullable().default(null),
  action_key: z.string().min(1).max(300).nullable().default(null),
  no_go_reasons: z.array(z.string().min(1).max(500)).default([]),
  cost_usd: z.number().min(0).default(0),
  fetched_at: DateTimeSchema.nullable().default(null),
  expires_at: DateTimeSchema.nullable().default(null),
}).superRefine((row, ctx) => {
  if (
    row.required_for_action &&
    ['missing', 'stale', 'blocked', 'approval_required', 'cost_gated'].includes(
      row.freshness_status ?? '',
    ) &&
    !row.exception_reason
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['exception_reason'],
      message:
        'Required provider evidence must be fresh or include an exception reason.',
    });
  }
});
export type ProviderEvidenceRead = z.infer<typeof ProviderEvidenceReadSchema>;

export const GrowthEvidenceCorrelationResultSchema = z.object({
  website_id: z.string().uuid().optional(),
  entity_key: z.string().min(1).max(300),
  action_key: z.string().min(1).max(300),
  correlation_key: z.string().min(1).max(500),
  evidence_fingerprint: z.string().min(8).max(160),
  decision_family: z.string().min(1).max(120).default('provider_intelligence'),
  dedupe_verdict: GrowthEvidenceDedupeVerdictSchema,
  confidence: z.number().min(0).max(1).default(0.7),
  previous_work_item_ids: z.array(z.string().uuid()).default([]),
  previous_candidate_ids: z.array(z.string().uuid()).default([]),
  previous_outcome_ids: z.array(z.string().uuid()).default([]),
  previous_work_item_id: z.string().uuid().nullable().default(null),
  previous_profile_run_id: z.string().uuid().nullable().default(null),
  coalesced_with_work_item_id: z.string().uuid().nullable().default(null),
  coalesced_into_work_item_id: z.string().uuid().nullable().default(null),
  reopened_from_work_item_id: z.string().uuid().nullable().default(null),
  reopen_of_work_item_id: z.string().uuid().nullable().default(null),
  cooldown_until: DateTimeSchema.nullable().default(null),
  measuring_until: DateTimeSchema.nullable().default(null),
  reason: z.string().min(1).max(1000).nullable().default(null),
  no_go_reasons: z.array(z.string().min(1).max(500)).default([]),
  material_evidence_change: z.boolean().default(false),
  metadata: JsonRecordSchema,
});
export type GrowthEvidenceCorrelationResult = z.infer<
  typeof GrowthEvidenceCorrelationResultSchema
>;
