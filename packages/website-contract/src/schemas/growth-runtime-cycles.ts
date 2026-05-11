import { z } from 'zod';

import { GrowthTenantScopeSchema } from './growth-attribution';

const DateTimeSchema = z.string().datetime();
const JsonRecordSchema = z.record(z.string(), z.unknown()).default({});

/**
 * Growth Runtime Cycle Contract — Epic #441
 *
 * Tenant-scoped production-cycle ledger for the Growth OS autonomy runtime.
 * A cycle is the top-level orchestration envelope that refreshes profiles,
 * discovers candidates, promotes work items, runs execution bridge hooks,
 * evaluates outcomes and emits a learning summary.
 */

export const GrowthRuntimeCycleStatusSchema = z.enum([
  'started',
  'running',
  'completed',
  'completed_with_blocks',
  'failed',
  'cancelled',
]);
export type GrowthRuntimeCycleStatus = z.infer<
  typeof GrowthRuntimeCycleStatusSchema
>;

export const GrowthRuntimeCycleTriggerSchema = z.enum([
  'manual',
  'scheduled',
  'webhook',
  'test',
]);
export type GrowthRuntimeCycleTrigger = z.infer<
  typeof GrowthRuntimeCycleTriggerSchema
>;

export const GrowthRuntimeCycleStageSchema = z.enum([
  'orchestrator_brain',
  'profile_refresh',
  'provider_profile_refresh',
  'candidate_discovery',
  'work_item_promotion',
  'execution_bridge',
  'outcome_evaluation',
  'learning_summary',
]);
export type GrowthRuntimeCycleStage = z.infer<
  typeof GrowthRuntimeCycleStageSchema
>;

const GrowthRuntimeCycleBaseSchema = GrowthTenantScopeSchema.extend({
  id: z.string().uuid(),
  cycle_key: z.string().min(12).max(240),
  cycle_window: z.string().min(1).max(80).nullable().default(null),
  environment: z
    .enum(['local', 'qa', 'staging', 'production'])
    .default('production'),
  git_sha: z.string().min(7).max(80).nullable().default(null),
  status: GrowthRuntimeCycleStatusSchema.default('started'),
  trigger_source: GrowthRuntimeCycleTriggerSchema.default('manual'),
  runtime_version: z.string().min(1).max(80).default('growth-runtime-v1'),
  dry_run: z.boolean().default(true),
  options: JsonRecordSchema,
  stage_results: JsonRecordSchema,
  summary: JsonRecordSchema,
  error_class: z.string().max(200).nullable().default(null),
  error_message: z.string().max(2000).nullable().default(null),
  started_at: DateTimeSchema,
  finished_at: DateTimeSchema.nullable().default(null),
  created_at: DateTimeSchema,
  updated_at: DateTimeSchema,
});

export const GrowthRuntimeCycleSchema =
  GrowthRuntimeCycleBaseSchema.superRefine((row, ctx) => {
    if (
      row.finished_at &&
      Date.parse(row.finished_at) < Date.parse(row.started_at)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['finished_at'],
        message: 'finished_at must be after started_at.',
      });
    }

    if (
      (row.status === 'completed' || row.status === 'completed_with_blocks') &&
      (!row.finished_at || row.error_class || row.error_message)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['status'],
        message: 'completed cycles require finished_at and no error fields.',
      });
    }
  });
export type GrowthRuntimeCycle = z.infer<typeof GrowthRuntimeCycleSchema>;

export const GrowthRuntimeCycleInsertSchema =
  GrowthRuntimeCycleBaseSchema.omit({
    id: true,
    created_at: true,
    updated_at: true,
  });
export type GrowthRuntimeCycleInsert = z.infer<
  typeof GrowthRuntimeCycleInsertSchema
>;

export const GrowthRuntimeCycleUpdateSchema =
  GrowthRuntimeCycleBaseSchema.partial().omit({
    id: true,
    account_id: true,
    website_id: true,
    cycle_key: true,
    created_at: true,
  });
export type GrowthRuntimeCycleUpdate = z.infer<
  typeof GrowthRuntimeCycleUpdateSchema
>;

export const GrowthSchedulerHeartbeatStatusSchema = z.enum([
  'healthy',
  'stale',
  'degraded',
  'failed',
  'paused',
]);
export type GrowthSchedulerHeartbeatStatus = z.infer<
  typeof GrowthSchedulerHeartbeatStatusSchema
>;

const GrowthSchedulerHeartbeatBaseSchema = GrowthTenantScopeSchema.extend({
  id: z.string().uuid(),
  scheduler_name: z.string().min(1).max(120).default('growth-os-production-cycle'),
  status: GrowthSchedulerHeartbeatStatusSchema.default('healthy'),
  health_status: GrowthSchedulerHeartbeatStatusSchema.default('healthy'),
  heartbeat_at: DateTimeSchema,
  last_cycle_id: z.string().uuid().nullable().default(null),
  last_cycle_status: z.string().max(80).nullable().default(null),
  last_message: z.string().max(1000).nullable().default(null),
  git_sha: z.string().min(7).max(80).nullable().default(null),
  interval_ms: z.number().int().positive().nullable().default(null),
  metadata: JsonRecordSchema,
  created_at: DateTimeSchema,
  updated_at: DateTimeSchema,
});

export const GrowthSchedulerHeartbeatSchema =
  GrowthSchedulerHeartbeatBaseSchema;
export type GrowthSchedulerHeartbeat = z.infer<
  typeof GrowthSchedulerHeartbeatSchema
>;

export const GrowthSchedulerHeartbeatInsertSchema =
  GrowthSchedulerHeartbeatBaseSchema.omit({
    id: true,
    created_at: true,
    updated_at: true,
  });
export type GrowthSchedulerHeartbeatInsert = z.infer<
  typeof GrowthSchedulerHeartbeatInsertSchema
>;
