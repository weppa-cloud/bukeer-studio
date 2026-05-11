import { z } from 'zod';

import { AgentLaneSchema } from './growth-agent-definitions';
import { GrowthTenantScopeSchema } from './growth-attribution';

const DateTimeSchema = z.string().datetime();
const JsonRecordSchema = z.record(z.string(), z.unknown()).default({});
const UuidArraySchema = z.array(z.string().uuid()).default([]);

export const GrowthEffectivenessSourceGroupSchema = z.enum([
  'baseline_human_codex',
  'growth_os_deterministic',
  'growth_os_hermes_isolated',
]);
export type GrowthEffectivenessSourceGroup = z.infer<
  typeof GrowthEffectivenessSourceGroupSchema
>;

export const GrowthEffectivenessExperimentStatusSchema = z.enum([
  'planned',
  'running',
  'initial_verdict',
  'final_verdict',
  'cancelled',
]);
export type GrowthEffectivenessExperimentStatus = z.infer<
  typeof GrowthEffectivenessExperimentStatusSchema
>;

export const GrowthEffectivenessObservationStatusSchema = z.enum([
  'draft',
  'candidate_created',
  'work_item_created',
  'executed',
  'measuring',
  'evaluated',
  'rejected',
  'blocked',
]);
export type GrowthEffectivenessObservationStatus = z.infer<
  typeof GrowthEffectivenessObservationStatusSchema
>;

const ExperimentBaseSchema = GrowthTenantScopeSchema.omit({
  locale: true,
  market: true,
}).extend({
  id: z.string().uuid(),
  experiment_key: z.string().min(8).max(160),
  title: z.string().min(1).max(240),
  objective: z.string().min(1).max(2000),
  status: GrowthEffectivenessExperimentStatusSchema.default('planned'),
  baseline_actor: GrowthEffectivenessSourceGroupSchema.default(
    'baseline_human_codex',
  ),
  source_groups: z.array(GrowthEffectivenessSourceGroupSchema).min(1).default([
    'baseline_human_codex',
    'growth_os_deterministic',
    'growth_os_hermes_isolated',
  ]),
  lane_targets: JsonRecordSchema,
  success_criteria: JsonRecordSchema,
  evidence_snapshot: JsonRecordSchema,
  initial_scorecard: JsonRecordSchema,
  final_scorecard: JsonRecordSchema,
  created_by: z.string().uuid().nullable().default(null),
  started_at: DateTimeSchema.nullable().default(null),
  initial_verdict_at: DateTimeSchema.nullable().default(null),
  final_verdict_at: DateTimeSchema.nullable().default(null),
  created_at: DateTimeSchema,
  updated_at: DateTimeSchema,
});

export const GrowthEffectivenessExperimentSchema = ExperimentBaseSchema;
export type GrowthEffectivenessExperiment = z.infer<
  typeof GrowthEffectivenessExperimentSchema
>;

export const GrowthEffectivenessExperimentInsertSchema =
  ExperimentBaseSchema.omit({
    id: true,
    created_at: true,
    updated_at: true,
  });
export type GrowthEffectivenessExperimentInsert = z.infer<
  typeof GrowthEffectivenessExperimentInsertSchema
>;

const ObservationBaseSchema = GrowthTenantScopeSchema.omit({
  locale: true,
  market: true,
}).extend({
  id: z.string().uuid(),
  experiment_id: z.string().uuid(),
  source_group: GrowthEffectivenessSourceGroupSchema,
  lane: AgentLaneSchema,
  status: GrowthEffectivenessObservationStatusSchema.default('draft'),
  idempotency_key: z.string().min(8).max(240),
  evidence_snapshot: JsonRecordSchema,
  human_packet: JsonRecordSchema,
  metrics: JsonRecordSchema,
  timing: JsonRecordSchema,
  cost: JsonRecordSchema,
  quality_verdict: JsonRecordSchema,
  safety_verdict: JsonRecordSchema,
  decision_id: z.string().uuid().nullable().default(null),
  artifact_id: z.string().uuid().nullable().default(null),
  candidate_id: z.string().uuid().nullable().default(null),
  work_item_id: z.string().uuid().nullable().default(null),
  publication_job_id: z.string().uuid().nullable().default(null),
  outcome_id: z.string().uuid().nullable().default(null),
  profile_run_ids: UuidArraySchema,
  completed_at: DateTimeSchema.nullable().default(null),
  created_at: DateTimeSchema,
  updated_at: DateTimeSchema,
});

export const GrowthEffectivenessObservationSchema = ObservationBaseSchema;
export type GrowthEffectivenessObservation = z.infer<
  typeof GrowthEffectivenessObservationSchema
>;

export const GrowthEffectivenessObservationInsertSchema =
  ObservationBaseSchema.omit({
    id: true,
    created_at: true,
    updated_at: true,
  });
export type GrowthEffectivenessObservationInsert = z.infer<
  typeof GrowthEffectivenessObservationInsertSchema
>;
