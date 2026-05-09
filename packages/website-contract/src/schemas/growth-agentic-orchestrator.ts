import { z } from 'zod';

import { AgentLaneSchema } from './growth-agent-definitions';
import { GrowthTenantScopeSchema } from './growth-attribution';
import {
  GrowthAutonomyActionClassSchema,
  GrowthOutcomeEvaluationWindowSchema,
} from './growth-paperclip-autonomy';
import { GrowthOpportunityCandidateTypeSchema } from './growth-profile-flow';

const DateTimeSchema = z.string().datetime();
const JsonRecordSchema = z.record(z.string(), z.unknown()).default({});
const NonEmptyJsonRecordSchema = JsonRecordSchema.refine(
  (value) => Object.keys(value).length > 0,
  'Must contain at least one key.',
);

export const GrowthAgentWakeupSourceSchema = z.enum([
  'timer',
  'data_refresh',
  'assignment',
  'outcome_due',
  'blocked_unblock',
  'user_on_demand',
  'policy_change',
]);
export type GrowthAgentWakeupSource = z.infer<
  typeof GrowthAgentWakeupSourceSchema
>;

export const GrowthAgentWakeupStatusSchema = z.enum([
  'queued',
  'claimed',
  'completed',
  'failed',
  'cancelled',
  'coalesced',
]);
export type GrowthAgentWakeupStatus = z.infer<
  typeof GrowthAgentWakeupStatusSchema
>;

export const GrowthAgentRuntimeStatusSchema = z.enum([
  'idle',
  'queued',
  'running',
  'paused',
  'blocked',
  'failed',
]);
export type GrowthAgentRuntimeStatus = z.infer<
  typeof GrowthAgentRuntimeStatusSchema
>;

export const GrowthAgentTaskSessionStatusSchema = z.enum([
  'created',
  'assigned',
  'running',
  'blocked',
  'completed',
  'cancelled',
]);
export type GrowthAgentTaskSessionStatus = z.infer<
  typeof GrowthAgentTaskSessionStatusSchema
>;

export const GrowthOrchestratorDecisionTypeSchema = z.enum([
  'create_work',
  'delegate',
  'block',
  'learn',
  'recommend_policy',
  'observe',
]);
export type GrowthOrchestratorDecisionType = z.infer<
  typeof GrowthOrchestratorDecisionTypeSchema
>;

const DecisionCandidateSchema = z
  .object({
    candidate_type: GrowthOpportunityCandidateTypeSchema,
    lane: AgentLaneSchema,
    allowed_action_class: GrowthAutonomyActionClassSchema,
    title: z.string().min(1).max(240),
    summary: z.string().min(1).max(2000),
    confidence: z.number().min(0).max(1),
    total_score: z.number().int().min(0).max(100),
    success_metric: z.string().min(1).max(200),
    evaluation_window: GrowthOutcomeEvaluationWindowSchema,
    evidence: NonEmptyJsonRecordSchema,
    source_signal_fact_ids: z.array(z.string().uuid()).default([]),
  })
  .passthrough();

const DecisionWorkItemSchema = z
  .object({
    lane: AgentLaneSchema,
    allowed_action_class: GrowthAutonomyActionClassSchema,
    title: z.string().min(1).max(240),
    intent: z.string().min(1).max(400),
    operator_summary: z.string().min(1).max(2000),
    risk_score: z.number().int().min(0).max(100),
    evidence: NonEmptyJsonRecordSchema,
  })
  .passthrough();

const DelegatedTaskSchema = z
  .object({
    parent_work_item_id: z.string().uuid().nullable().default(null),
    delegated_by_agent_id: z.string().min(1).max(120).default('growth_ceo_brain'),
    assigned_agent_lane: AgentLaneSchema,
    title: z.string().min(1).max(240),
    handoff_summary: z.string().min(1).max(2000),
    completion_contract: NonEmptyJsonRecordSchema,
    required_context_refs: z.array(z.string().min(1).max(240)).default([]),
    dependencies: z.array(z.string().uuid()).default([]),
  })
  .passthrough();

const BlockedDecisionSchema = z
  .object({
    action_class: GrowthAutonomyActionClassSchema.or(z.string().min(1).max(120)),
    reason: z.string().min(1).max(1000),
    surface: z.string().min(1).max(120).nullable().default(null),
    evidence: JsonRecordSchema,
  })
  .passthrough();

const ContextSnapshotBaseSchema = GrowthTenantScopeSchema.extend({
  id: z.string().uuid(),
  lane: AgentLaneSchema.or(z.literal('all')).default('all'),
  wakeup_request_id: z.string().uuid().nullable().default(null),
  cycle_id: z.string().uuid().nullable().default(null),
  context_version: z.string().min(1).max(80).default('agentic-context-v1'),
  objective: z.string().min(1).max(1000),
  sanitized_context: NonEmptyJsonRecordSchema,
  source_refs: z.array(z.string().min(1).max(240)).default([]),
  injection_scan: JsonRecordSchema,
  token_estimate: z.number().int().min(0).default(0),
  created_at: DateTimeSchema,
});

export const GrowthContextSnapshotSchema = ContextSnapshotBaseSchema;
export type GrowthContextSnapshot = z.infer<
  typeof GrowthContextSnapshotSchema
>;
export const GrowthContextSnapshotInsertSchema =
  ContextSnapshotBaseSchema.omit({
    id: true,
    created_at: true,
  });
export type GrowthContextSnapshotInsert = z.infer<
  typeof GrowthContextSnapshotInsertSchema
>;

const OrchestratorDecisionBaseSchema = GrowthTenantScopeSchema.extend({
  id: z.string().uuid(),
  cycle_id: z.string().uuid().nullable().default(null),
  wakeup_request_id: z.string().uuid().nullable().default(null),
  context_snapshot_id: z.string().uuid(),
  objective: z.string().min(1).max(1000),
  north_star_alignment: z.string().min(1).max(1000),
  decision_type: GrowthOrchestratorDecisionTypeSchema,
  observed_signals: z.array(JsonRecordSchema).default([]),
  proposed_candidates: z.array(DecisionCandidateSchema).default([]),
  proposed_work_items: z.array(DecisionWorkItemSchema).default([]),
  delegated_tasks: z.array(DelegatedTaskSchema).default([]),
  blocked_decisions: z.array(BlockedDecisionSchema).default([]),
  memory_reads: z.array(JsonRecordSchema).default([]),
  skill_reads: z.array(JsonRecordSchema).default([]),
  outcome_references: z.array(JsonRecordSchema).default([]),
  policy_recommendations: z.array(JsonRecordSchema).default([]),
  risk_assessment: JsonRecordSchema,
  confidence: z.number().min(0).max(1),
  no_go_reasons: z.array(z.string().min(1).max(1000)).default([]),
  created_signal_fact_ids: z.array(z.string().uuid()).default([]),
  created_candidate_ids: z.array(z.string().uuid()).default([]),
  created_work_item_ids: z.array(z.string().uuid()).default([]),
  materialization_status: z
    .enum(['pending', 'materialized', 'blocked', 'failed'])
    .default('pending'),
  evidence: JsonRecordSchema,
  created_at: DateTimeSchema,
});

function refineOrchestratorDecision(
  row: Pick<
    z.infer<typeof OrchestratorDecisionBaseSchema>,
    | 'decision_type'
    | 'proposed_candidates'
    | 'proposed_work_items'
    | 'blocked_decisions'
  >,
  ctx: z.RefinementCtx,
) {
  if (
    row.decision_type === 'create_work' &&
    row.proposed_candidates.length === 0 &&
    row.proposed_work_items.length === 0
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['proposed_candidates'],
      message: 'create_work decisions require proposed candidates or work items.',
    });
  }

  if (row.decision_type === 'block' && row.blocked_decisions.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['blocked_decisions'],
      message: 'block decisions require blocked_decisions.',
    });
  }
}

export const GrowthOrchestratorDecisionSchema =
  OrchestratorDecisionBaseSchema.superRefine(refineOrchestratorDecision);
export type GrowthOrchestratorDecision = z.infer<
  typeof GrowthOrchestratorDecisionSchema
>;
export const GrowthOrchestratorDecisionInsertSchema =
  OrchestratorDecisionBaseSchema.omit({
    id: true,
    created_at: true,
  }).superRefine(refineOrchestratorDecision);
export type GrowthOrchestratorDecisionInsert = z.infer<
  typeof GrowthOrchestratorDecisionInsertSchema
>;

const WakeupBaseSchema = GrowthTenantScopeSchema.extend({
  id: z.string().uuid(),
  lane: AgentLaneSchema,
  source: GrowthAgentWakeupSourceSchema,
  status: GrowthAgentWakeupStatusSchema.default('queued'),
  priority: z.number().int().min(0).max(100).default(50),
  idempotency_key: z.string().min(8).max(240),
  coalesced_count: z.number().int().min(0).default(0),
  payload: JsonRecordSchema,
  claimed_at: DateTimeSchema.nullable().default(null),
  completed_at: DateTimeSchema.nullable().default(null),
  run_id: z.string().uuid().nullable().default(null),
  last_error: z.string().max(2000).nullable().default(null),
  created_at: DateTimeSchema,
  updated_at: DateTimeSchema,
});

export const GrowthAgentWakeupRequestSchema = WakeupBaseSchema;
export type GrowthAgentWakeupRequest = z.infer<
  typeof GrowthAgentWakeupRequestSchema
>;
export const GrowthAgentWakeupRequestInsertSchema = WakeupBaseSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});
export type GrowthAgentWakeupRequestInsert = z.infer<
  typeof GrowthAgentWakeupRequestInsertSchema
>;

const RuntimeStateBaseSchema = GrowthTenantScopeSchema.extend({
  id: z.string().uuid(),
  lane: AgentLaneSchema,
  agent_id: z.string().min(1).max(120),
  status: GrowthAgentRuntimeStatusSchema.default('idle'),
  heartbeat_at: DateTimeSchema.nullable().default(null),
  current_wakeup_id: z.string().uuid().nullable().default(null),
  current_work_item_id: z.string().uuid().nullable().default(null),
  active_task_session_id: z.string().uuid().nullable().default(null),
  total_wakeups: z.number().int().min(0).default(0),
  total_decisions: z.number().int().min(0).default(0),
  total_cost_usd: z.number().min(0).default(0),
  last_error: z.string().max(2000).nullable().default(null),
  runtime_state: JsonRecordSchema,
  created_at: DateTimeSchema,
  updated_at: DateTimeSchema,
});

export const GrowthAgentRuntimeStateSchema = RuntimeStateBaseSchema;
export type GrowthAgentRuntimeState = z.infer<
  typeof GrowthAgentRuntimeStateSchema
>;
export const GrowthAgentRuntimeStateInsertSchema = RuntimeStateBaseSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});
export type GrowthAgentRuntimeStateInsert = z.infer<
  typeof GrowthAgentRuntimeStateInsertSchema
>;

const TaskSessionBaseSchema = GrowthTenantScopeSchema.extend({
  id: z.string().uuid(),
  parent_work_item_id: z.string().uuid().nullable().default(null),
  child_work_item_id: z.string().uuid().nullable().default(null),
  delegated_by_agent_id: z.string().min(1).max(120),
  assigned_agent_lane: AgentLaneSchema,
  wakeup_request_id: z.string().uuid().nullable().default(null),
  decision_id: z.string().uuid().nullable().default(null),
  status: GrowthAgentTaskSessionStatusSchema.default('created'),
  handoff_summary: z.string().min(1).max(2000),
  required_context_refs: z.array(z.string().min(1).max(240)).default([]),
  dependencies: z.array(z.string().uuid()).default([]),
  completion_contract: NonEmptyJsonRecordSchema,
  session_state: JsonRecordSchema,
  started_at: DateTimeSchema.nullable().default(null),
  completed_at: DateTimeSchema.nullable().default(null),
  created_at: DateTimeSchema,
  updated_at: DateTimeSchema,
});

export const GrowthAgentTaskSessionSchema = TaskSessionBaseSchema;
export type GrowthAgentTaskSession = z.infer<
  typeof GrowthAgentTaskSessionSchema
>;
export const GrowthAgentTaskSessionInsertSchema = TaskSessionBaseSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});
export type GrowthAgentTaskSessionInsert = z.infer<
  typeof GrowthAgentTaskSessionInsertSchema
>;
