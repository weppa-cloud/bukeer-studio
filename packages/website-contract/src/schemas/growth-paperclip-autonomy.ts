import { z } from 'zod';

import { AgentLaneSchema } from './growth-agent-definitions';
import { GrowthTenantScopeSchema } from './growth-attribution';

/**
 * Growth OS Paperclip Autonomy Contract - #431 / #432
 *
 * Data contracts for the autonomy policy layer, publication/application job
 * ledger and outcome measurement ledger used by the Paperclip-style CEO
 * cockpit. Runtime writes are service-role only; Studio reads are tenant scoped.
 */

const DateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const JsonRecordSchema = z.record(z.string(), z.unknown()).default({});
const NonEmptyJsonRecordSchema = JsonRecordSchema.refine(
  (value) => Object.keys(value).length > 0,
  'Must contain at least one key.',
);

export const GrowthAutonomyActionClassSchema = z.enum([
  'observe',
  'prepare',
  'route',
  'split',
  'follow_up_backlog_create',
  'research_packet',
  'safe_apply',
  'content_publish',
  'transcreation_merge',
  'paid_mutation',
  'experiment_activation',
  'outreach_send',
]);
export type GrowthAutonomyActionClass = z.infer<
  typeof GrowthAutonomyActionClassSchema
>;

export const GrowthAutonomousExecutableActionClassSchema = z.enum([
  'safe_apply',
  'content_publish',
  'transcreation_merge',
]);
export type GrowthAutonomousExecutableActionClass = z.infer<
  typeof GrowthAutonomousExecutableActionClassSchema
>;

export const GrowthAutonomyRequiredCheckSchema = z.enum([
  'before_snapshot',
  'rollback_payload',
  'smoke_check',
  'baseline',
  'success_metric',
  'evaluation_date',
  'no_paid_mutation',
  'tenant_allowlist',
  'technical_reversibility',
]);
export type GrowthAutonomyRequiredCheck = z.infer<
  typeof GrowthAutonomyRequiredCheckSchema
>;

export const GrowthAutonomyRiskLevelSchema = z.enum([
  'low',
  'medium',
  'high',
]);
export type GrowthAutonomyRiskLevel = z.infer<
  typeof GrowthAutonomyRiskLevelSchema
>;

const GrowthAutonomyPolicyBaseSchema = GrowthTenantScopeSchema.extend({
  id: z.string().uuid(),
  lane: AgentLaneSchema,
  action_class: GrowthAutonomyActionClassSchema,
  enabled: z.boolean().default(false),
  dry_run_only: z.boolean().default(true),
  kill_switch_enabled: z.boolean().default(false),
  paused_reason: z.string().max(1000).nullable().default(null),
  max_risk_level: GrowthAutonomyRiskLevelSchema.default('medium'),
  max_risk_score: z.number().int().min(0).max(100).default(60),
  daily_cap: z.number().int().min(0).default(0),
  weekly_cap: z.number().int().min(0).default(0),
  required_checks: z
    .array(GrowthAutonomyRequiredCheckSchema)
    .default([
      'before_snapshot',
      'rollback_payload',
      'smoke_check',
      'baseline',
      'success_metric',
      'evaluation_date',
    ]),
  policy_version: z.string().min(1).max(80).default('paperclip-v1'),
  notes: z.string().max(4000).nullable().default(null),
  created_by: z.string().uuid().nullable().default(null),
  updated_by: z.string().uuid().nullable().default(null),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

function refineAutonomyPolicy(
  row: Pick<
    z.infer<typeof GrowthAutonomyPolicyBaseSchema>,
    'daily_cap' | 'weekly_cap'
  >,
  ctx: z.RefinementCtx,
) {
  if (row.weekly_cap < row.daily_cap) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['weekly_cap'],
      message: 'weekly_cap must be greater than or equal to daily_cap.',
    });
  }
}

export const GrowthAutonomyPolicySchema =
  GrowthAutonomyPolicyBaseSchema.superRefine(refineAutonomyPolicy);
export type GrowthAutonomyPolicy = z.infer<
  typeof GrowthAutonomyPolicySchema
>;

export const GrowthAutonomyPolicyInsertSchema =
  GrowthAutonomyPolicyBaseSchema.omit({
    id: true,
    created_at: true,
    updated_at: true,
  }).superRefine(refineAutonomyPolicy);
export type GrowthAutonomyPolicyInsert = z.infer<
  typeof GrowthAutonomyPolicyInsertSchema
>;

export const GrowthAutonomyPolicyUpdateSchema =
  GrowthAutonomyPolicyBaseSchema.partial().omit({
    id: true,
    account_id: true,
    website_id: true,
    created_at: true,
  });
export type GrowthAutonomyPolicyUpdate = z.infer<
  typeof GrowthAutonomyPolicyUpdateSchema
>;

export const GrowthPublicationJobModeSchema = z.enum(['dry_run', 'live']);
export type GrowthPublicationJobMode = z.infer<
  typeof GrowthPublicationJobModeSchema
>;

export const GrowthPublicationJobStatusSchema = z.enum([
  'queued',
  'snapshot_created',
  'dry_run_ready',
  'applying',
  'applied',
  'smoke_passed',
  'smoke_failed',
  'rolled_back',
  'blocked',
  'cancelled',
]);
export type GrowthPublicationJobStatus = z.infer<
  typeof GrowthPublicationJobStatusSchema
>;

export const GrowthPublicationTargetTableSchema = z.enum([
  'website_blog_posts',
  'website_pages',
  'website_sections',
  'seo_localized_variants',
  'seo_transcreation_jobs',
  'product_seo_overrides',
]);
export type GrowthPublicationTargetTable = z.infer<
  typeof GrowthPublicationTargetTableSchema
>;

const GrowthPublicationJobBaseSchema = GrowthTenantScopeSchema.extend({
  id: z.string().uuid(),
  work_item_id: z.string().uuid(),
  change_set_id: z.string().uuid(),
  policy_id: z.string().uuid().nullable().default(null),
  lane: AgentLaneSchema,
  action_class: GrowthAutonomousExecutableActionClassSchema,
  job_mode: GrowthPublicationJobModeSchema.default('dry_run'),
  status: GrowthPublicationJobStatusSchema.default('queued'),
  target_table: GrowthPublicationTargetTableSchema,
  target_id: z.string().uuid().nullable().default(null),
  target_path: z.string().min(1).max(2048).nullable().default(null),
  idempotency_key: z.string().min(16).max(200),
  before_snapshot: NonEmptyJsonRecordSchema,
  after_payload: NonEmptyJsonRecordSchema,
  smoke_result: JsonRecordSchema,
  rollback_payload: NonEmptyJsonRecordSchema,
  baseline: NonEmptyJsonRecordSchema,
  success_metric: z.string().min(1).max(200),
  evaluation_date: DateOnlySchema,
  evidence: JsonRecordSchema,
  created_by: z.string().min(1).max(120).default('growth_runtime'),
  applied_at: z.string().datetime().nullable().default(null),
  smoke_checked_at: z.string().datetime().nullable().default(null),
  rolled_back_at: z.string().datetime().nullable().default(null),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

function refinePublicationJob(
  row: Pick<
    z.infer<typeof GrowthPublicationJobBaseSchema>,
    | 'action_class'
    | 'lane'
    | 'status'
    | 'applied_at'
    | 'smoke_checked_at'
    | 'rolled_back_at'
  >,
  ctx: z.RefinementCtx,
) {
  if (row.action_class === 'safe_apply' && row.lane !== 'technical_remediation') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['lane'],
      message: 'safe_apply is only executable by technical_remediation.',
    });
  }

  if (row.action_class === 'transcreation_merge' && row.lane !== 'transcreation') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['lane'],
      message: 'transcreation_merge is only executable by transcreation.',
    });
  }

  if (
    row.action_class === 'content_publish' &&
    row.lane !== 'content_creator' &&
    row.lane !== 'content_curator'
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['lane'],
      message: 'content_publish is only executable by content lanes.',
    });
  }

  if (
    row.applied_at &&
    row.status !== 'applied' &&
    row.status !== 'smoke_passed' &&
    row.status !== 'smoke_failed' &&
    row.status !== 'rolled_back'
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['applied_at'],
      message: 'applied_at requires an applied, smoke, or rolled_back status.',
    });
  }

  if (
    row.smoke_checked_at &&
    row.status !== 'smoke_passed' &&
    row.status !== 'smoke_failed' &&
    row.status !== 'rolled_back'
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['smoke_checked_at'],
      message: 'smoke_checked_at requires smoke_passed, smoke_failed, or rolled_back.',
    });
  }

  if (row.rolled_back_at && row.status !== 'rolled_back') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['rolled_back_at'],
      message: 'rolled_back_at requires status=rolled_back.',
    });
  }
}

export const GrowthPublicationJobSchema =
  GrowthPublicationJobBaseSchema.superRefine(refinePublicationJob);
export type GrowthPublicationJob = z.infer<
  typeof GrowthPublicationJobSchema
>;

export const GrowthPublicationJobInsertSchema =
  GrowthPublicationJobBaseSchema.omit({
    id: true,
    created_at: true,
    updated_at: true,
  }).superRefine(refinePublicationJob);
export type GrowthPublicationJobInsert = z.infer<
  typeof GrowthPublicationJobInsertSchema
>;

export const GrowthPublicationJobUpdateSchema =
  GrowthPublicationJobBaseSchema.partial().omit({
    id: true,
    account_id: true,
    website_id: true,
    work_item_id: true,
    change_set_id: true,
    created_at: true,
  });
export type GrowthPublicationJobUpdate = z.infer<
  typeof GrowthPublicationJobUpdateSchema
>;

export const GrowthWorkItemOutcomeTypeSchema = z.enum([
  'seo_content',
  'technical_seo',
  'crm_funnel',
]);
export type GrowthWorkItemOutcomeType = z.infer<
  typeof GrowthWorkItemOutcomeTypeSchema
>;

export const GrowthWorkItemOutcomeStatusSchema = z.enum([
  'scheduled',
  'measuring',
  'evaluated',
  'inconclusive',
  'won',
  'lost',
]);
export type GrowthWorkItemOutcomeStatus = z.infer<
  typeof GrowthWorkItemOutcomeStatusSchema
>;

export const GrowthOutcomeEvaluationWindowSchema = z.enum([
  'immediate',
  'day_1',
  'day_7',
  'day_21',
  'day_28',
  'day_30',
  'day_45',
]);
export type GrowthOutcomeEvaluationWindow = z.infer<
  typeof GrowthOutcomeEvaluationWindowSchema
>;

export const GrowthFunnelAttributionStatusSchema = z.enum([
  'not_applicable',
  'pending',
  'partial',
  'attributed',
  'unattributed',
]);
export type GrowthFunnelAttributionStatus = z.infer<
  typeof GrowthFunnelAttributionStatusSchema
>;

const OutcomeWindowsByType: Record<
  GrowthWorkItemOutcomeType,
  ReadonlySet<GrowthOutcomeEvaluationWindow>
> = {
  seo_content: new Set<GrowthOutcomeEvaluationWindow>(['day_21', 'day_45']),
  technical_seo: new Set<GrowthOutcomeEvaluationWindow>([
    'immediate',
    'day_7',
    'day_28',
  ]),
  crm_funnel: new Set<GrowthOutcomeEvaluationWindow>([
    'day_1',
    'day_7',
    'day_30',
  ]),
};

const GrowthWorkItemOutcomeBaseSchema = GrowthTenantScopeSchema.extend({
  id: z.string().uuid(),
  work_item_id: z.string().uuid(),
  publication_job_id: z.string().uuid(),
  change_set_id: z.string().uuid(),
  outcome_type: GrowthWorkItemOutcomeTypeSchema,
  status: GrowthWorkItemOutcomeStatusSchema.default('scheduled'),
  success_metric: z.string().min(1).max(200),
  baseline: NonEmptyJsonRecordSchema,
  current_result: JsonRecordSchema,
  evaluation_window: GrowthOutcomeEvaluationWindowSchema,
  evaluation_date: DateOnlySchema,
  funnel_attribution_status: GrowthFunnelAttributionStatusSchema.default('pending'),
  attribution_evidence: JsonRecordSchema,
  evaluated_at: z.string().datetime().nullable().default(null),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

function refineWorkItemOutcome(
  row: Pick<
    z.infer<typeof GrowthWorkItemOutcomeBaseSchema>,
    'outcome_type' | 'evaluation_window' | 'status' | 'evaluated_at'
  >,
  ctx: z.RefinementCtx,
) {
  if (!OutcomeWindowsByType[row.outcome_type].has(row.evaluation_window)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['evaluation_window'],
      message: `Invalid evaluation window for ${row.outcome_type}.`,
    });
  }

  if (
    row.evaluated_at &&
    row.status !== 'evaluated' &&
    row.status !== 'inconclusive' &&
    row.status !== 'won' &&
    row.status !== 'lost'
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['evaluated_at'],
      message: 'evaluated_at requires evaluated, inconclusive, won, or lost.',
    });
  }
}

export const GrowthWorkItemOutcomeSchema =
  GrowthWorkItemOutcomeBaseSchema.superRefine(refineWorkItemOutcome);
export type GrowthWorkItemOutcome = z.infer<
  typeof GrowthWorkItemOutcomeSchema
>;

export const GrowthWorkItemOutcomeInsertSchema =
  GrowthWorkItemOutcomeBaseSchema.omit({
    id: true,
    created_at: true,
    updated_at: true,
  }).superRefine(refineWorkItemOutcome);
export type GrowthWorkItemOutcomeInsert = z.infer<
  typeof GrowthWorkItemOutcomeInsertSchema
>;

export const GrowthWorkItemOutcomeUpdateSchema =
  GrowthWorkItemOutcomeBaseSchema.partial().omit({
    id: true,
    account_id: true,
    website_id: true,
    work_item_id: true,
    publication_job_id: true,
    change_set_id: true,
    created_at: true,
  });
export type GrowthWorkItemOutcomeUpdate = z.infer<
  typeof GrowthWorkItemOutcomeUpdateSchema
>;
