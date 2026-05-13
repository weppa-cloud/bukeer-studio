import { z } from 'zod';

import { AgentLaneSchema } from './growth-agent-definitions';
import { GrowthTenantScopeSchema } from './growth-attribution';
import { GrowthOutcomeEvaluationWindowSchema } from './growth-paperclip-autonomy';
import { GrowthProviderFreshnessStatusSchema } from './growth-provider-intelligence';

/**
 * Growth OS Hermes Primary Runtime MVE v0
 *
 * Contract-first schemas for the Hermes-native runtime steel thread:
 * native Kanban state, profile skill bindings, MCP tool safety policies,
 * tenant/provider context profiles, North Star scoring, tool invocations,
 * production snapshots,
 * rollbacks and outcomes.
 */

const DateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const DateTimeSchema = z.string().datetime();
const JsonRecordSchema = z.record(z.string(), z.unknown()).default({});
const NonEmptyJsonRecordSchema = JsonRecordSchema.refine(
  (value) => Object.keys(value).length > 0,
  'Must contain at least one key.',
);
const UuidSchema = z.string().uuid();

export const HermesRuntimeEnvironmentSchema = z.enum([
  'local',
  'staging',
  'production',
]);
export type HermesRuntimeEnvironment = z.infer<
  typeof HermesRuntimeEnvironmentSchema
>;

export const HermesRuntimeModeSchema = z.enum([
  'primary',
  'monitor_only',
  'paused',
]);
export type HermesRuntimeMode = z.infer<typeof HermesRuntimeModeSchema>;

export const HermesRuntimeHealthSchema = z.enum([
  'healthy',
  'degraded',
  'stale',
  'paused',
  'failed',
]);
export type HermesRuntimeHealth = z.infer<typeof HermesRuntimeHealthSchema>;

export const HermesKanbanTaskStatusSchema = z.enum([
  'triage',
  'todo',
  'ready',
  'running',
  'blocked',
  'done',
  'archived',
]);
export type HermesKanbanTaskStatus = z.infer<
  typeof HermesKanbanTaskStatusSchema
>;

export const HermesProfileNameSchema = z.enum([
  'colombiatours-chief',
  'colombiatours-content',
  'colombiatours-editor',
  'colombiatours-transcreation',
  'colombiatours-technical-seo',
  'colombiatours-risk',
  'colombiatours-outcome',
]);
export type HermesProfileName = z.infer<typeof HermesProfileNameSchema>;

export const HermesProfileStatusSchema = z.enum([
  'enabled',
  'paused',
  'disabled',
  'failed',
]);
export type HermesProfileStatus = z.infer<typeof HermesProfileStatusSchema>;

export const HermesSkillNameSchema = z.enum([
  'bukeer-orchestrator',
  'bukeer-content-creator',
  'bukeer-content-curator',
  'transcreator-es-en',
  'bukeer-technical-remediation',
  'bukeer-risk-guardian',
  'bukeer-outcome-analyst',
]);
export type HermesSkillName = z.infer<typeof HermesSkillNameSchema>;

export const HermesExecutionLoopSchema = z.enum([
  'hermes_cron',
  'goal',
  'delegate_task',
]);
export type HermesExecutionLoop = z.infer<typeof HermesExecutionLoopSchema>;

export const HermesToolHostStatusSchema = z.enum([
  'healthy',
  'degraded',
  'stale',
  'paused',
  'failed',
]);
export type HermesToolHostStatus = z.infer<typeof HermesToolHostStatusSchema>;

export const HermesProviderProfileIdSchema = z.enum([
  'dataforseo_profile',
  'gsc_profile',
  'ga4_profile',
  'clarity_profile',
  'funnel_events_profile',
  'content_inventory_profile',
  'transcreation_profile',
  'crm_waflow_profile',
  'risk_profile',
]);
export type HermesProviderProfileId = z.infer<
  typeof HermesProviderProfileIdSchema
>;

export const HermesToolNameSchema = z.enum([
  'hermes_read_provider_profile',
  'hermes_refresh_provider_context',
  'hermes_publish_content',
  'hermes_merge_transcreation',
  'hermes_apply_safe_seo_patch',
  'hermes_record_outcome',
  'hermes_rollback_change',
  'hermes_create_follow_up_task',
]);
export type HermesToolName = z.infer<typeof HermesToolNameSchema>;

export const HermesToolInvocationStatusSchema = z.enum([
  'requested',
  'accepted',
  'rejected',
  'applying',
  'completed',
  'blocked',
  'failed',
  'smoke_passed',
  'smoke_failed',
  'rollback_required',
  'rolled_back',
]);
export type HermesToolInvocationStatus = z.infer<
  typeof HermesToolInvocationStatusSchema
>;

export const HermesProductionTargetTableSchema = z.enum([
  'website_blog_posts',
  'website_pages',
  'seo_transcreation_jobs',
]);
export type HermesProductionTargetTable = z.infer<
  typeof HermesProductionTargetTableSchema
>;

export const HermesContentPublishFieldSchema = z.enum([
  'title',
  'slug',
  'excerpt',
  'content',
  'seo_title',
  'seo_description',
  'seo_keywords',
  'status',
  'published_at',
  'featured_image',
]);
export type HermesContentPublishField = z.infer<
  typeof HermesContentPublishFieldSchema
>;

export const HermesSafeSeoPatchFieldSchema = z.enum([
  'seo_title',
  'seo_description',
  'seo_keywords',
  'canonical_url',
  'robots',
  'og_title',
  'og_description',
  'structured_data',
  'hreflang_overrides',
]);
export type HermesSafeSeoPatchField = z.infer<
  typeof HermesSafeSeoPatchFieldSchema
>;

export const HermesMutationSnapshotStatusSchema = z.enum([
  'snapshot_created',
  'applied',
  'smoke_passed',
  'smoke_failed',
  'rollback_required',
  'rolled_back',
  'failed',
]);
export type HermesMutationSnapshotStatus = z.infer<
  typeof HermesMutationSnapshotStatusSchema
>;

export const HermesOutcomeStatusSchema = z.enum([
  'pending',
  'measuring',
  'won',
  'lost',
  'inconclusive',
  'cancelled',
]);
export type HermesOutcomeStatus = z.infer<typeof HermesOutcomeStatusSchema>;

const HermesBoardScopeSchema = GrowthTenantScopeSchema.extend({
  hermes_board_id: z.string().min(1).max(160),
  board_name: z.string().min(1).max(160),
});
export type HermesBoardScope = z.infer<typeof HermesBoardScopeSchema>;

export const HermesTargetReferenceSchema = z
  .object({
    target_table: HermesProductionTargetTableSchema,
    target_type: z.string().min(1).max(120),
    target_id: UuidSchema.nullable().optional(),
    target_path: z.string().min(1).max(2048).nullable().optional(),
    target_key: z.string().min(1).max(240).nullable().optional(),
  })
  .refine(
    (value) => Boolean(value.target_id || value.target_path || value.target_key),
    'Target reference must include target_id, target_path, or target_key.',
  );
export type HermesTargetReference = z.infer<
  typeof HermesTargetReferenceSchema
>;

export const HermesGrowthTaskScoringSchema = z.object({
  north_star_metric: z
    .literal('qualified_trip_requests_per_month')
    .default('qualified_trip_requests_per_month'),
  baseline: NonEmptyJsonRecordSchema,
  expected_impact_summary: z.string().min(1).max(1000),
  expected_impact_score: z.number().int().min(0).max(100),
  confidence_score: z.number().int().min(0).max(100),
  risk_score: z.number().int().min(0).max(100),
  effort_score: z.number().int().min(0).max(100),
  provider_freshness_score: z.number().int().min(0).max(100),
  rollback_confidence_score: z.number().int().min(0).max(100),
  total_score: z.number().int().min(0).max(100),
  success_metric: z.string().min(1).max(240),
  evaluation_window: GrowthOutcomeEvaluationWindowSchema,
  evaluation_date: DateOnlySchema,
  formula_version: z.string().min(1).max(80).default('hermes-growth-score-v0'),
  evidence_refs: z.array(z.string().min(1).max(240)).min(1),
});
export type HermesGrowthTaskScoring = z.infer<
  typeof HermesGrowthTaskScoringSchema
>;

export const HermesRuntimeConfigSchema = HermesBoardScopeSchema.extend({
  environment: HermesRuntimeEnvironmentSchema.default('production'),
  runtime_mode: HermesRuntimeModeSchema.default('primary'),
  runtime_health: HermesRuntimeHealthSchema.default('paused'),
  hermes_version: z.string().min(1).max(80),
  runtime_version: z.string().min(1).max(80).default('hermes-primary-mve-v0'),
  tool_host_url: z.string().url().nullable().default(null),
  cron_schedule: z.string().min(1).max(120).default('*/30 * * * *'),
  enabled_execution_loops: z
    .array(HermesExecutionLoopSchema)
    .default(['hermes_cron', 'goal', 'delegate_task']),
  kill_switch_enabled: z.boolean().default(false),
  growth_executor_mode: z.enum(['disabled', 'monitor_only']).default('monitor_only'),
  profile_names: z.array(HermesProfileNameSchema).min(1),
  skill_names: z.array(HermesSkillNameSchema).min(1),
  hermes_skills_dir: z.string().min(1).max(1024).default('~/.hermes/skills'),
  mcp_config_path: z.string().min(1).max(1024).nullable().default(null),
  last_heartbeat_at: DateTimeSchema.nullable().default(null),
  metadata: JsonRecordSchema,
});
export type HermesRuntimeConfig = z.infer<typeof HermesRuntimeConfigSchema>;

export const HermesSkillBindingSchema = HermesBoardScopeSchema.extend({
  profile_name: HermesProfileNameSchema,
  skill_name: HermesSkillNameSchema,
  skill_version: z.string().min(1).max(80).default('v0'),
  skill_path: z.string().min(1).max(1024),
  enabled: z.boolean().default(true),
  tool_allowlist: z.array(HermesToolNameSchema).default([]),
  provider_profile_allowlist: z.array(HermesProviderProfileIdSchema).default([]),
  guardrails: JsonRecordSchema,
  updated_at: DateTimeSchema,
});
export type HermesSkillBinding = z.infer<typeof HermesSkillBindingSchema>;

export const HermesProfileConfigSchema = HermesBoardScopeSchema.extend({
  profile_name: HermesProfileNameSchema,
  status: HermesProfileStatusSchema.default('enabled'),
  lane: AgentLaneSchema,
  model_provider: z.string().min(1).max(80).default('openrouter'),
  model_name: z.string().min(1).max(160),
  workspace_cwd: z.string().min(1).max(1024),
  max_concurrency: z.number().int().min(1).max(16).default(1),
  max_cost_daily_usd: z.number().min(0).default(10),
  max_cost_weekly_usd: z.number().min(0).default(60),
  skill_bindings: z.array(HermesSkillNameSchema).min(1),
  tool_allowlist: z.array(HermesToolNameSchema).min(1),
  provider_profile_allowlist: z.array(HermesProviderProfileIdSchema).default([]),
  active_memory_refs: z.array(z.string().min(1).max(160)).default([]),
  immutable_safety_bounds: JsonRecordSchema,
  updated_at: DateTimeSchema,
});
export type HermesProfileConfig = z.infer<typeof HermesProfileConfigSchema>;

export const HermesFieldAllowlistSchema = HermesBoardScopeSchema.extend({
  tool_name: HermesToolNameSchema,
  target_table: HermesProductionTargetTableSchema,
  allowed_fields: z
    .array(z.union([HermesContentPublishFieldSchema, HermesSafeSeoPatchFieldSchema]))
    .min(1),
  denied_fields: z.array(z.string().min(1).max(120)).default([]),
  policy_version: z.string().min(1).max(80).default('hermes-field-allowlist-v0'),
  updated_at: DateTimeSchema,
});
export type HermesFieldAllowlist = z.infer<typeof HermesFieldAllowlistSchema>;

export const HermesIdempotencyConstraintSchema = HermesBoardScopeSchema.extend({
  tool_name: HermesToolNameSchema,
  target_table: HermesProductionTargetTableSchema.nullable().default(null),
  unique_dimensions: z
    .array(
      z.enum([
        'account_id',
        'website_id',
        'hermes_task_id',
        'skill_name',
        'tool_name',
        'target_table',
        'target_id',
        'target_path',
        'payload_hash',
        'context_hash',
        'evaluation_date',
      ]),
    )
    .min(3),
  ttl_hours: z.number().int().min(1).max(8760).default(168),
  conflict_behavior: z.enum(['dedupe_success', 'reject', 'return_existing']).default('return_existing'),
});
export type HermesIdempotencyConstraint = z.infer<
  typeof HermesIdempotencyConstraintSchema
>;

export const HermesMcpToolSafetyPolicySchema = HermesBoardScopeSchema.extend({
  tool_name: HermesToolNameSchema,
  handler_path: z.string().min(1).max(1024),
  allowed_profiles: z.array(HermesProfileNameSchema).min(1),
  allowed_skills: z.array(HermesSkillNameSchema).min(1),
  requires_service_role: z.boolean().default(false),
  requires_snapshot: z.boolean().default(false),
  requires_smoke: z.boolean().default(false),
  requires_rollback_payload: z.boolean().default(false),
  requires_tenant_context: z.boolean().default(true),
  field_allowlist_policy_version: z.string().min(1).max(80).nullable().default(null),
  idempotency_policy_version: z.string().min(1).max(80).nullable().default(null),
  policy_version: z.string().min(1).max(80).default('hermes-mcp-safety-v0'),
  updated_at: DateTimeSchema,
});
export type HermesMcpToolSafetyPolicy = z.infer<
  typeof HermesMcpToolSafetyPolicySchema
>;

export const HermesKanbanMirrorSchema = HermesBoardScopeSchema.extend({
  hermes_task_id: z.string().min(1).max(160),
  hermes_run_id: z.string().min(1).max(160).nullable().default(null),
  title: z.string().min(1).max(240),
  status: HermesKanbanTaskStatusSchema,
  assigned_profile: HermesProfileNameSchema.nullable().default(null),
  skill_name: HermesSkillNameSchema.nullable().default(null),
  target: HermesTargetReferenceSchema.nullable().default(null),
  allowed_tool: HermesToolNameSchema.nullable().default(null),
  provider_profile_refs: z.array(HermesProviderProfileIdSchema).default([]),
  scoring: HermesGrowthTaskScoringSchema.nullable().default(null),
  risk_level: z.enum(['low', 'medium', 'high']).default('medium'),
  idempotency_key: z.string().min(8).max(240).nullable().default(null),
  metadata: JsonRecordSchema,
  last_event_at: DateTimeSchema.nullable().default(null),
  created_at: DateTimeSchema,
  updated_at: DateTimeSchema,
});
export type HermesKanbanMirror = z.infer<typeof HermesKanbanMirrorSchema>;

export const HermesProviderProfileSchema = GrowthTenantScopeSchema.extend({
  provider_profile_id: HermesProviderProfileIdSchema,
  freshness_status: GrowthProviderFreshnessStatusSchema,
  freshness_at: DateTimeSchema.nullable().default(null),
  expires_at: DateTimeSchema.nullable().default(null),
  confidence: z.number().min(0).max(1),
  source_refs: z.array(z.string().min(1).max(240)).min(1),
  observations: z.array(JsonRecordSchema).default([]),
  opportunities: z.array(JsonRecordSchema).default([]),
  risks: z.array(JsonRecordSchema).default([]),
  suggested_tasks: z.array(JsonRecordSchema).default([]),
  payload: JsonRecordSchema,
}).superRefine((row, ctx) => {
  if (
    row.expires_at &&
    row.freshness_at &&
    Date.parse(row.expires_at) <= Date.parse(row.freshness_at)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['expires_at'],
      message: 'expires_at must be after freshness_at.',
    });
  }
});
export type HermesProviderProfile = z.infer<typeof HermesProviderProfileSchema>;

export const HermesProviderProfileSnapshotSchema =
  HermesProviderProfileSchema.extend({
    id: UuidSchema,
    hermes_board_id: z.string().min(1).max(160),
    profile_hash: z.string().min(8).max(160),
    served_to_profile: HermesProfileNameSchema.nullable().default(null),
    created_at: DateTimeSchema,
  });
export type HermesProviderProfileSnapshot = z.infer<
  typeof HermesProviderProfileSnapshotSchema
>;

export const HermesTenantContextProfileSchema = GrowthTenantScopeSchema.extend({
  tenant_name: z.string().min(1).max(180),
  tenant_slug: z.string().min(1).max(120),
  website_url: z.string().url(),
  default_locale: z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/),
  active_locales: z.array(z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/)).min(1),
  specialty: z.array(z.string().min(1).max(160)).default([]),
  description: z.string().max(2000).nullable().default(null),
  brand_voice: z.string().max(2000).nullable().default(null),
  target_audience: z.string().max(2000).nullable().default(null),
  known_pains: z.array(z.string().min(1).max(240)).default([]),
  unique_selling_points: z.array(z.string().min(1).max(240)).default([]),
  competitors: z.array(z.string().min(1).max(240)).default([]),
  team_info: JsonRecordSchema,
  planner_refs: z.array(z.string().min(1).max(240)).default([]),
  north_star_metric: z
    .literal('qualified_trip_requests_per_month')
    .default('qualified_trip_requests_per_month'),
  freshness_status: GrowthProviderFreshnessStatusSchema,
  freshness_at: DateTimeSchema.nullable().default(null),
  source_refs: z.array(z.string().min(1).max(240)).min(1),
  payload: JsonRecordSchema,
});
export type HermesTenantContextProfile = z.infer<
  typeof HermesTenantContextProfileSchema
>;

export const HermesTenantContextSnapshotSchema =
  HermesTenantContextProfileSchema.extend({
    id: UuidSchema,
    hermes_board_id: z.string().min(1).max(160),
    hermes_task_id: z.string().min(1).max(160).nullable().default(null),
    profile_name: HermesProfileNameSchema.nullable().default(null),
    skill_name: HermesSkillNameSchema.nullable().default(null),
    context_hash: z.string().min(8).max(160),
    created_at: DateTimeSchema,
  });
export type HermesTenantContextSnapshot = z.infer<
  typeof HermesTenantContextSnapshotSchema
>;

const ToolScopeSchema = HermesBoardScopeSchema.extend({
  actor_profile: HermesProfileNameSchema,
  actor_role: z.string().min(1).max(120),
  skill_name: HermesSkillNameSchema,
  tool_name: HermesToolNameSchema,
  hermes_task_id: z.string().min(1).max(160),
  hermes_run_id: z.string().min(1).max(160).nullable().default(null),
  idempotency_key: z.string().min(8).max(240),
});

const ProductionToolScopeSchema = ToolScopeSchema.extend({
  target: HermesTargetReferenceSchema,
  scoring: HermesGrowthTaskScoringSchema,
  rollback_strategy: NonEmptyJsonRecordSchema,
});

export const HermesPublishContentPayloadSchema =
  ProductionToolScopeSchema.extend({
    tool_name: z.literal('hermes_publish_content'),
    changed_fields: z.array(HermesContentPublishFieldSchema).min(1),
    content_payload: NonEmptyJsonRecordSchema,
    supported_facts: z.array(z.string().min(1).max(240)).min(1),
  });
export type HermesPublishContentPayload = z.infer<
  typeof HermesPublishContentPayloadSchema
>;

export const HermesSafeSeoPatchPayloadSchema =
  ProductionToolScopeSchema.extend({
    tool_name: z.literal('hermes_apply_safe_seo_patch'),
    changed_fields: z.array(HermesSafeSeoPatchFieldSchema).min(1),
    patch: NonEmptyJsonRecordSchema,
    smoke_plan: NonEmptyJsonRecordSchema,
  });
export type HermesSafeSeoPatchPayload = z.infer<
  typeof HermesSafeSeoPatchPayloadSchema
>;

export const HermesTranscreationMergePayloadSchema =
  ProductionToolScopeSchema.extend({
    tool_name: z.literal('hermes_merge_transcreation'),
    target: HermesTargetReferenceSchema.safeExtend({
      target_table: z.literal('seo_transcreation_jobs'),
    }),
    source_locale: z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/),
    target_locale: z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/),
    source_entity_id: UuidSchema,
    page_type: z.enum(['blog', 'page', 'destination', 'package', 'activity']),
    transcreation_payload: NonEmptyJsonRecordSchema,
    quality_score: z.number().min(0).max(1),
  }).refine(
    (value) => value.source_locale !== value.target_locale,
    'source_locale and target_locale must be different.',
  );
export type HermesTranscreationMergePayload = z.infer<
  typeof HermesTranscreationMergePayloadSchema
>;

export const HermesRollbackPayloadSchema = ToolScopeSchema.extend({
  tool_name: z.literal('hermes_rollback_change'),
  mutation_snapshot_id: UuidSchema,
  rollback_reason: z.string().min(1).max(1000),
  rollback_payload: NonEmptyJsonRecordSchema,
});
export type HermesRollbackPayload = z.infer<typeof HermesRollbackPayloadSchema>;

export const HermesOutcomeRecordSchema = ToolScopeSchema.extend({
  tool_name: z.literal('hermes_record_outcome'),
  tool_invocation_id: UuidSchema.nullable().default(null),
  metric_name: z.string().min(1).max(160),
  baseline: NonEmptyJsonRecordSchema,
  success_metric: z.string().min(1).max(240),
  evaluation_at: DateTimeSchema,
  status: HermesOutcomeStatusSchema.default('pending'),
  result_payload: JsonRecordSchema,
});
export type HermesOutcomeRecord = z.infer<typeof HermesOutcomeRecordSchema>;

export const HermesToolPayloadSchema = z.discriminatedUnion('tool_name', [
  HermesPublishContentPayloadSchema,
  HermesSafeSeoPatchPayloadSchema,
  HermesTranscreationMergePayloadSchema,
  HermesRollbackPayloadSchema,
  HermesOutcomeRecordSchema,
]);
export type HermesToolPayload = z.infer<typeof HermesToolPayloadSchema>;

export const HermesToolResultSchema = z.object({
  tool_name: HermesToolNameSchema,
  status: HermesToolInvocationStatusSchema,
  success: z.boolean(),
  data: JsonRecordSchema,
  error_code: z.string().min(1).max(120).nullable().default(null),
  error_message: z.string().max(2000).nullable().default(null),
  audit_event_id: UuidSchema.nullable().default(null),
  mutation_snapshot_id: UuidSchema.nullable().default(null),
  outcome_record_id: UuidSchema.nullable().default(null),
});
export type HermesToolResult = z.infer<typeof HermesToolResultSchema>;

export const HermesToolInvocationSchema = ToolScopeSchema.extend({
  id: UuidSchema,
  target: HermesTargetReferenceSchema.nullable().default(null),
  status: HermesToolInvocationStatusSchema.default('requested'),
  input_hash: z.string().min(8).max(160),
  request_payload: JsonRecordSchema,
  result_payload: JsonRecordSchema,
  error_code: z.string().min(1).max(120).nullable().default(null),
  error_message: z.string().max(2000).nullable().default(null),
  created_at: DateTimeSchema,
  updated_at: DateTimeSchema,
});
export type HermesToolInvocation = z.infer<
  typeof HermesToolInvocationSchema
>;

export const HermesToolInvocationInsertSchema =
  HermesToolInvocationSchema.omit({
    id: true,
    created_at: true,
    updated_at: true,
  });
export type HermesToolInvocationInsert = z.infer<
  typeof HermesToolInvocationInsertSchema
>;

export const HermesMutationSnapshotSchema = GrowthTenantScopeSchema.extend({
  id: UuidSchema,
  tool_invocation_id: UuidSchema,
  hermes_task_id: z.string().min(1).max(160),
  hermes_run_id: z.string().min(1).max(160).nullable().default(null),
  target: HermesTargetReferenceSchema,
  before_snapshot: NonEmptyJsonRecordSchema,
  after_payload: JsonRecordSchema,
  rollback_payload: NonEmptyJsonRecordSchema,
  smoke_result: JsonRecordSchema,
  status: HermesMutationSnapshotStatusSchema.default('snapshot_created'),
  created_at: DateTimeSchema,
  updated_at: DateTimeSchema,
});
export type HermesMutationSnapshot = z.infer<
  typeof HermesMutationSnapshotSchema
>;

export const HermesMutationSnapshotInsertSchema =
  HermesMutationSnapshotSchema.omit({
    id: true,
    created_at: true,
    updated_at: true,
  });
export type HermesMutationSnapshotInsert = z.infer<
  typeof HermesMutationSnapshotInsertSchema
>;

export const HermesRuntimeHealthSnapshotSchema = HermesBoardScopeSchema.extend({
  id: UuidSchema,
  hermes_version: z.string().min(1).max(80),
  runtime_mode: HermesRuntimeModeSchema,
  runtime_health: HermesRuntimeHealthSchema,
  active_profiles: z.array(HermesProfileNameSchema).default([]),
  active_skills: z.array(HermesSkillNameSchema).default([]),
  enabled_execution_loops: z.array(HermesExecutionLoopSchema).default([]),
  tool_host_status: HermesToolHostStatusSchema,
  kill_switch_enabled: z.boolean(),
  last_heartbeat_at: DateTimeSchema,
  created_at: DateTimeSchema,
});
export type HermesRuntimeHealthSnapshot = z.infer<
  typeof HermesRuntimeHealthSnapshotSchema
>;
