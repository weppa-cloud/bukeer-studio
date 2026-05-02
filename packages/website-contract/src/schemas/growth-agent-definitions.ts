import { z } from 'zod';

import { GrowthTenantScopeSchema } from './growth-attribution';

/**
 * Growth Agent Definitions Contract — SPEC #403, EPIC #310
 *
 * Tenant-scoped registry for Symphony Orchestrator agents.
 *
 * Each row pins one agent (by lane) for an (account_id, website_id, locale,
 * market) tuple. Rows carry the runtime knobs the orchestrator needs to
 * decide whether the agent runs in `observe_only`, `prepare_only` or
 * `auto_apply_safe` mode, plus the model + prompt/workflow versions and
 * the lane-level autonomy gates (agreement threshold, concurrency caps).
 *
 * References:
 *   - SPEC_GROWTH_OS_SYMPHONY_ORCHESTRATOR.md §"Control Plane Tables"
 *   - SPEC_GROWTH_OS_SYMPHONY_ORCHESTRATOR.md §"Agent Modes"
 *   - SPEC_GROWTH_OS_SYMPHONY_ORCHESTRATOR.md §"Lane-Level Autonomy Gate"
 *   - SPEC_GROWTH_OS_AGENT_LANES.md §"Agent Lanes V1"
 *   - ADR-003 (multi-tenant boundaries)
 *   - ADR-008 (agent runtime contracts)
 *   - ADR-009 (account_id + website_id scoping)
 */

/**
 * Canonical agent lanes per SPEC_GROWTH_OS_AGENT_LANES.md §"Agent Lanes V1".
 * Five lanes only. Gating action classes (paid mutation, experiment activation,
 * publish, transcreation merge) are NOT lanes — they are action policies
 * applied across lanes by the lane-level autonomy gate (#408).
 */
export const AgentLaneSchema = z.enum([
  'orchestrator',
  'technical_remediation',
  'transcreation',
  'content_creator',
  'content_curator',
]);
export type AgentLane = z.infer<typeof AgentLaneSchema>;

export const AgentModeSchema = z.enum([
  'observe_only',
  'prepare_only',
  'auto_apply_safe',
]);
export type AgentMode = z.infer<typeof AgentModeSchema>;

export const GrowthAgentDefinitionSchema = GrowthTenantScopeSchema.extend({
  agent_id: z.string().uuid(),
  lane: AgentLaneSchema,
  name: z.string().min(1).max(120),
  enabled: z.boolean().default(false),
  mode: AgentModeSchema.default('observe_only'),
  model: z.string().min(1).max(200),
  prompt_version: z.string().min(1).max(80),
  workflow_version: z.string().min(1).max(80),
  agreement_threshold: z.number().min(0).max(1).default(0.9),
  max_concurrent_runs: z.number().int().min(1).max(100).default(1),
  max_active_experiments: z.number().int().min(0).max(1000).default(5),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type GrowthAgentDefinition = z.infer<typeof GrowthAgentDefinitionSchema>;

export const GrowthAgentDefinitionInputSchema = GrowthAgentDefinitionSchema.omit({
  agent_id: true,
  created_at: true,
  updated_at: true,
});
export type GrowthAgentDefinitionInput = z.infer<
  typeof GrowthAgentDefinitionInputSchema
>;
