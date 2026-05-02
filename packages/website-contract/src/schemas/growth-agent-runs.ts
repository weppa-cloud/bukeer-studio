import { z } from 'zod';

import { GrowthTenantScopeSchema } from './growth-attribution';
import { AgentLaneSchema } from './growth-agent-definitions';

/**
 * Growth Agent Runs Contract — SPEC_GROWTH_OS_SYMPHONY_ORCHESTRATOR (issue #403, EPIC #310)
 *
 * Durable run ledger for the Symphony Orchestrator runtime. Each row records a
 * single agent execution with claim, workspace, status, heartbeat, attempts,
 * artifact path, error class and free-form evidence. Consumed by the
 * orchestrator (#404), Studio Reviews & Runs UI (#407), and E2E (#409).
 *
 * SSOT linkage (per SPEC "SSOT Relationship"): `profile_run_id` is a nullable
 * FK to `growth_profile_runs.id` (see SPEC_GROWTH_OS_UNIFIED_BACKLOG_AND_PROFILE_RUN_LEDGER).
 * Standalone agent runs (not triggered by a backlog/profile refresh) keep
 * `profile_run_id = NULL`.
 *
 * Refs:
 * - ADR-003 — Multi-tenant scope (account_id + website_id)
 * - ADR-008 — Lane-Level Autonomy Gate (status `review_required` flow)
 * - ADR-009 — Tenant guard / RLS scoping
 * - ADR-018 — Idempotency (claim_id is the orchestrator restart key)
 */

export const AgentRunStatusSchema = z.enum([
  'claimed',
  'running',
  'review_required',
  'failed',
  'completed',
  'stalled',
]);
export type AgentRunStatus = z.infer<typeof AgentRunStatusSchema>;

export const GrowthAgentRunSchema = GrowthTenantScopeSchema.extend({
  run_id: z.string().uuid(),
  agent_id: z.string().uuid(),
  lane: AgentLaneSchema,
  source_table: z.string().min(1).max(60),
  source_id: z.string().uuid(),
  profile_run_id: z.string().uuid().nullable().default(null),
  claim_id: z.string().uuid(),
  workspace_path: z.string().min(1).max(500),
  status: AgentRunStatusSchema,
  heartbeat_at: z.string().datetime().nullable().default(null),
  attempts: z.number().int().min(0).max(100).default(0),
  artifact_path: z.string().max(500).nullable().default(null),
  error_class: z.string().max(200).nullable().default(null),
  error_message: z.string().max(2000).nullable().default(null),
  evidence: z.record(z.string(), z.unknown()).nullable().default(null),
  started_at: z.string().datetime().nullable().default(null),
  finished_at: z.string().datetime().nullable().default(null),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type GrowthAgentRun = z.infer<typeof GrowthAgentRunSchema>;

/**
 * Input shape for creating/claiming an agent run. Auto-generated columns
 * (`run_id`, `created_at`, `updated_at`) are omitted; runtime-derived columns
 * (`attempts`, `heartbeat_at`, `started_at`, `finished_at`) are optional and
 * fall back to schema defaults. The orchestrator supplies `claim_id` itself
 * (idempotency key — ADR-018).
 */
export const GrowthAgentRunInputSchema = GrowthAgentRunSchema.omit({
  run_id: true,
  created_at: true,
  updated_at: true,
}).extend({
  attempts: z.number().int().min(0).max(100).optional(),
  heartbeat_at: z.string().datetime().nullable().optional(),
  started_at: z.string().datetime().nullable().optional(),
  finished_at: z.string().datetime().nullable().optional(),
});
export type GrowthAgentRunInput = z.infer<typeof GrowthAgentRunInputSchema>;
