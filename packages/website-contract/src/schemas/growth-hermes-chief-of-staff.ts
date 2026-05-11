import { z } from 'zod';

import { AgentLaneSchema } from './growth-agent-definitions';
import { GrowthTenantScopeSchema } from './growth-attribution';

const DateTimeSchema = z.string().datetime();
const JsonRecordSchema = z.record(z.string(), z.unknown()).default({});
const JsonArraySchema = z.array(z.unknown()).default([]);
const UuidArraySchema = z.array(z.string().uuid()).default([]);

export const GrowthChiefOfStaffSessionModeSchema = z.enum([
  'chief_of_staff',
  'decision_support',
  'guided_action',
]);
export type GrowthChiefOfStaffSessionMode = z.infer<
  typeof GrowthChiefOfStaffSessionModeSchema
>;

export const GrowthChiefOfStaffSessionStatusSchema = z.enum([
  'active',
  'archived',
]);
export type GrowthChiefOfStaffSessionStatus = z.infer<
  typeof GrowthChiefOfStaffSessionStatusSchema
>;

export const GrowthChiefOfStaffMessageRoleSchema = z.enum([
  'user',
  'assistant',
  'tool',
  'system',
]);
export type GrowthChiefOfStaffMessageRole = z.infer<
  typeof GrowthChiefOfStaffMessageRoleSchema
>;

export const GrowthChiefOfStaffActionClassSchema = z.enum([
  'read_only',
  'enqueue_wakeup',
  'propose_policy',
  'request_cap_change',
  'request_runtime_cycle',
  'approve_learning',
  'forbidden',
]);
export type GrowthChiefOfStaffActionClass = z.infer<
  typeof GrowthChiefOfStaffActionClassSchema
>;

export const GrowthChiefOfStaffActionStatusSchema = z.enum([
  'proposed',
  'queued',
  'approved',
  'rejected',
  'completed',
  'failed',
  'blocked',
]);
export type GrowthChiefOfStaffActionStatus = z.infer<
  typeof GrowthChiefOfStaffActionStatusSchema
>;

export const GrowthHermesAgentTypeSchema = z.enum([
  'chief_of_staff',
  'growth_ceo_brain',
  'content_strategist',
  'content_writer',
  'content_editor',
  'technical_remediation',
  'transcreation',
  'provider_analyst',
  'outcome_analyst',
  'risk_guardian',
]);
export type GrowthHermesAgentType = z.infer<typeof GrowthHermesAgentTypeSchema>;

export const GrowthAgentInstanceStatusSchema = z.enum([
  'enabled',
  'paused',
  'disabled',
  'failed',
]);
export type GrowthAgentInstanceStatus = z.infer<
  typeof GrowthAgentInstanceStatusSchema
>;

export const GrowthAgentArtifactTypeSchema = z.enum([
  'content_article',
  'content_brief',
  'transcreation_payload',
  'safe_apply_patch',
  'quality_review',
  'outcome_analysis',
  'policy_recommendation',
  'provider_analysis',
]);
export type GrowthAgentArtifactType = z.infer<
  typeof GrowthAgentArtifactTypeSchema
>;

export const GrowthAgentArtifactStatusSchema = z.enum([
  'draft',
  'ready_for_validation',
  'validated',
  'rejected',
  'materialized',
  'superseded',
]);
export type GrowthAgentArtifactStatus = z.infer<
  typeof GrowthAgentArtifactStatusSchema
>;

export const GrowthAgentAutonomyLevelSchema = z.enum([
  'A0',
  'A1',
  'A2',
  'A3',
  'A4',
]);
export type GrowthAgentAutonomyLevel = z.infer<
  typeof GrowthAgentAutonomyLevelSchema
>;

export const GrowthAgentContextManifestStatusSchema = z.enum([
  'active',
  'superseded',
  'blocked',
  'failed',
]);
export type GrowthAgentContextManifestStatus = z.infer<
  typeof GrowthAgentContextManifestStatusSchema
>;

const ChiefSessionBaseSchema = GrowthTenantScopeSchema.omit({
  locale: true,
  market: true,
}).extend({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string().min(1).max(160),
  session_mode: GrowthChiefOfStaffSessionModeSchema.default('chief_of_staff'),
  status: GrowthChiefOfStaffSessionStatusSchema.default('active'),
  last_message_at: DateTimeSchema.nullable().default(null),
  metadata: JsonRecordSchema,
  created_at: DateTimeSchema,
  updated_at: DateTimeSchema,
});

export const GrowthChiefOfStaffSessionSchema = ChiefSessionBaseSchema;
export type GrowthChiefOfStaffSession = z.infer<
  typeof GrowthChiefOfStaffSessionSchema
>;
export const GrowthChiefOfStaffSessionInsertSchema = ChiefSessionBaseSchema.omit(
  {
    id: true,
    created_at: true,
    updated_at: true,
  },
);
export type GrowthChiefOfStaffSessionInsert = z.infer<
  typeof GrowthChiefOfStaffSessionInsertSchema
>;

const ChiefMessageBaseSchema = GrowthTenantScopeSchema.omit({
  locale: true,
  market: true,
}).extend({
  id: z.string().uuid(),
  session_id: z.string().uuid(),
  role: GrowthChiefOfStaffMessageRoleSchema,
  content: z.string().min(1).max(16000),
  cited_refs: JsonArraySchema,
  action_id: z.string().uuid().nullable().default(null),
  token_estimate: z.number().int().min(0).default(0),
  redaction: JsonRecordSchema,
  metadata: JsonRecordSchema,
  created_at: DateTimeSchema,
});

export const GrowthChiefOfStaffMessageSchema = ChiefMessageBaseSchema;
export type GrowthChiefOfStaffMessage = z.infer<
  typeof GrowthChiefOfStaffMessageSchema
>;
export const GrowthChiefOfStaffMessageInsertSchema =
  ChiefMessageBaseSchema.omit({
    id: true,
    created_at: true,
  });
export type GrowthChiefOfStaffMessageInsert = z.infer<
  typeof GrowthChiefOfStaffMessageInsertSchema
>;

const ChiefActionBaseSchema = GrowthTenantScopeSchema.omit({
  locale: true,
  market: true,
}).extend({
  id: z.string().uuid(),
  session_id: z.string().uuid().nullable().default(null),
  requested_by: z.string().uuid(),
  intent: z.string().min(1).max(2000),
  action_class: GrowthChiefOfStaffActionClassSchema,
  status: GrowthChiefOfStaffActionStatusSchema.default('proposed'),
  requires_approval: z.boolean().default(false),
  approval: JsonRecordSchema,
  policy_verdict: JsonRecordSchema,
  request_payload: JsonRecordSchema,
  result_payload: JsonRecordSchema,
  created_refs: JsonArraySchema,
  last_error: z.string().max(2000).nullable().default(null),
  completed_at: DateTimeSchema.nullable().default(null),
  created_at: DateTimeSchema,
  updated_at: DateTimeSchema,
});

export const GrowthChiefOfStaffActionSchema = ChiefActionBaseSchema;
export type GrowthChiefOfStaffAction = z.infer<
  typeof GrowthChiefOfStaffActionSchema
>;
export const GrowthChiefOfStaffActionInsertSchema = ChiefActionBaseSchema.omit(
  {
    id: true,
    created_at: true,
    updated_at: true,
  },
);
export type GrowthChiefOfStaffActionInsert = z.infer<
  typeof GrowthChiefOfStaffActionInsertSchema
>;

const AgentTypeBaseSchema = z.object({
  agent_type: GrowthHermesAgentTypeSchema,
  display_name: z.string().min(1).max(120),
  purpose: z.string().min(1).max(1000),
  default_lane: AgentLaneSchema,
  can_generate_artifacts: z.boolean().default(true),
  can_request_live_execution: z.boolean().default(false),
  immutable_safety_bounds: JsonRecordSchema,
  default_toolset: z.array(z.string().min(1).max(120)).default([]),
  default_config: JsonRecordSchema,
  created_at: DateTimeSchema,
  updated_at: DateTimeSchema,
});

export const GrowthAgentTypeSchema = AgentTypeBaseSchema;
export type GrowthAgentType = z.infer<typeof GrowthAgentTypeSchema>;
export const GrowthAgentTypeInsertSchema = AgentTypeBaseSchema.omit({
  created_at: true,
  updated_at: true,
});
export type GrowthAgentTypeInsert = z.infer<
  typeof GrowthAgentTypeInsertSchema
>;

const AgentInstanceBaseSchema = GrowthTenantScopeSchema.omit({
  locale: true,
  market: true,
}).extend({
  id: z.string().uuid(),
  agent_type: GrowthHermesAgentTypeSchema,
  lane: AgentLaneSchema,
  display_name: z.string().min(1).max(120),
  status: GrowthAgentInstanceStatusSchema.default('enabled'),
  model_provider: z.string().min(1).max(80),
  model_name: z.string().min(1).max(200),
  max_cost_daily_usd: z.number().min(0).default(10),
  max_cost_weekly_usd: z.number().min(0).default(50),
  concurrency_limit: z.number().int().min(1).max(20).default(1),
  wakeup_policy: JsonRecordSchema,
  active_skill_ids: UuidArraySchema,
  active_memory_ids: UuidArraySchema,
  toolset_allowlist: z.array(z.string().min(1).max(120)).default([]),
  confidence_threshold: z.number().min(0).max(1).default(0.7),
  quality_threshold: z.number().min(0).max(1).default(0.8),
  routing_priority: z.number().int().min(0).max(100).default(50),
  notification_preferences: JsonRecordSchema,
  editable_config: JsonRecordSchema,
  immutable_safety_bounds: JsonRecordSchema,
  updated_by: z.string().uuid().nullable().default(null),
  created_at: DateTimeSchema,
  updated_at: DateTimeSchema,
});

export const GrowthAgentInstanceSchema = AgentInstanceBaseSchema.refine(
  (value) => value.max_cost_weekly_usd >= value.max_cost_daily_usd,
  {
    path: ['max_cost_weekly_usd'],
    message: 'Weekly budget must be greater than or equal to daily budget.',
  },
);
export type GrowthAgentInstance = z.infer<typeof GrowthAgentInstanceSchema>;
export const GrowthAgentInstanceInsertSchema = AgentInstanceBaseSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
}).refine((value) => value.max_cost_weekly_usd >= value.max_cost_daily_usd, {
  path: ['max_cost_weekly_usd'],
  message: 'Weekly budget must be greater than or equal to daily budget.',
});
export type GrowthAgentInstanceInsert = z.infer<
  typeof GrowthAgentInstanceInsertSchema
>;

const AgentArtifactBaseSchema = GrowthTenantScopeSchema.omit({
  locale: true,
  market: true,
}).extend({
  id: z.string().uuid(),
  agent_instance_id: z.string().uuid().nullable().default(null),
  task_session_id: z.string().uuid().nullable().default(null),
  context_manifest_id: z.string().uuid().nullable().default(null),
  decision_id: z.string().uuid().nullable().default(null),
  artifact_type: GrowthAgentArtifactTypeSchema,
  artifact_version: z.string().min(1).max(80).default('v1'),
  status: GrowthAgentArtifactStatusSchema.default('draft'),
  payload: JsonRecordSchema,
  quality_review: JsonRecordSchema,
  provider_evidence_reads: z.array(JsonRecordSchema).default([]),
  memory_reads: z.array(JsonRecordSchema).default([]),
  skill_reads: z.array(JsonRecordSchema).default([]),
  risk_assessment: JsonRecordSchema,
  manifest_citation_verdict: JsonRecordSchema,
  validation_errors: z.array(JsonRecordSchema).default([]),
  idempotency_key: z.string().min(8).max(300),
  created_work_item_id: z.string().uuid().nullable().default(null),
  created_change_set_id: z.string().uuid().nullable().default(null),
  created_at: DateTimeSchema,
  updated_at: DateTimeSchema,
});

export const GrowthAgentArtifactSchema = AgentArtifactBaseSchema;
export type GrowthAgentArtifact = z.infer<typeof GrowthAgentArtifactSchema>;
export const GrowthAgentArtifactInsertSchema = AgentArtifactBaseSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});
export type GrowthAgentArtifactInsert = z.infer<
  typeof GrowthAgentArtifactInsertSchema
>;

const AgentContextManifestBaseSchema = GrowthTenantScopeSchema.omit({
  locale: true,
  market: true,
}).extend({
  id: z.string().uuid(),
  agent_instance_id: z.string().uuid(),
  task_session_id: z.string().uuid().nullable().default(null),
  context_snapshot_id: z.string().uuid(),
  lane: AgentLaneSchema,
  status: GrowthAgentContextManifestStatusSchema.default('active'),
  autonomy_level: GrowthAgentAutonomyLevelSchema.default('A2'),
  context_hash: z.string().min(8).max(120),
  model_provider: z.string().min(1).max(80),
  model_name: z.string().min(1).max(200),
  toolset_allowed: z.array(z.string().min(1).max(120)).default([]),
  skill_ids_injected: UuidArraySchema,
  memory_ids_injected: UuidArraySchema,
  global_memory_ids_injected: UuidArraySchema,
  excluded_skill_ids: UuidArraySchema,
  excluded_memory_ids: UuidArraySchema,
  provider_source_refs: z.array(z.string().min(1).max(240)).default([]),
  outcome_refs: z.array(z.string().min(1).max(240)).default([]),
  policy_refs: z.array(z.string().min(1).max(240)).default([]),
  budget_snapshot: JsonRecordSchema,
  injection_scan: JsonRecordSchema,
  isolation_verdict: JsonRecordSchema,
  manifest_payload: JsonRecordSchema,
  created_at: DateTimeSchema,
  updated_at: DateTimeSchema,
});

export const GrowthAgentContextManifestSchema =
  AgentContextManifestBaseSchema.superRefine((row, ctx) => {
    if (row.isolation_verdict.allowed === false && row.status === 'active') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['status'],
        message: 'Blocked isolation verdict cannot be active.',
      });
    }
  });
export type GrowthAgentContextManifest = z.infer<
  typeof GrowthAgentContextManifestSchema
>;
export const GrowthAgentContextManifestInsertSchema =
  AgentContextManifestBaseSchema.omit({
    id: true,
    created_at: true,
    updated_at: true,
  });
export type GrowthAgentContextManifestInsert = z.infer<
  typeof GrowthAgentContextManifestInsertSchema
>;
