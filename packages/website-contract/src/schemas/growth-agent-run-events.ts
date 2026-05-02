import { z } from 'zod';

import { GrowthTenantScopeSchema } from './growth-attribution';

/**
 * Growth Agent Run Events Contract — SPEC_GROWTH_OS_SYMPHONY_ORCHESTRATOR (#403)
 *
 * Append-only event log for `growth_agent_runs`. Many rows per run.
 * Captures lifecycle (claimed → started → completed/error) plus granular
 * observability (tool calls, artifact writes, review gates, heartbeats,
 * stalls, cancellations).
 *
 * Multi-tenant scoped via account_id + website_id (ADR-009).
 *
 * Related ADRs:
 *   - ADR-003 (orchestration model)
 *   - ADR-008 (review/approval gates)
 *   - ADR-009 (multi-tenant scoping)
 *   - ADR-010 (observability & event logging)
 *
 * Consumed by:
 *   - Symphony Orchestrator runtime (#404)
 *   - Studio Reviews & Runs UI (#407)
 *   - E2E orchestration tests (#409)
 *
 * Note: Do NOT import from `growth-agent-runs.ts` here (concurrent creation —
 * circular import risk). The `run_id` FK is enforced at the DB layer.
 */

export const AgentRunEventTypeSchema = z.enum([
  'claimed',
  'started',
  'tool_called',
  'artifact_written',
  'review_required',
  'error',
  'completed',
  'stalled',
  'heartbeat',
  'cancelled',
]);
export type AgentRunEventType = z.infer<typeof AgentRunEventTypeSchema>;

export const AgentRunEventSeveritySchema = z.enum(['info', 'warn', 'error']);
export type AgentRunEventSeverity = z.infer<typeof AgentRunEventSeveritySchema>;

/**
 * This table is append-only. UPDATE/DELETE are blocked at the DB layer
 * (RLS policy + trigger). Consumers MUST treat events as immutable; do not
 * attempt to mutate fields.
 */
export const GrowthAgentRunEventSchema = GrowthTenantScopeSchema.extend({
  event_id: z.string().uuid(),
  run_id: z.string().uuid(),
  event_type: AgentRunEventTypeSchema,
  severity: AgentRunEventSeveritySchema.default('info'),
  payload: z.record(z.string(), z.unknown()).nullable().default(null),
  message: z.string().min(1).max(2000).nullable().default(null),
  occurred_at: z.string().datetime(),
  created_at: z.string().datetime(),
});
export type GrowthAgentRunEvent = z.infer<typeof GrowthAgentRunEventSchema>;

export const GrowthAgentRunEventInputSchema = GrowthAgentRunEventSchema.omit({
  event_id: true,
  created_at: true,
}).extend({
  occurred_at: z
    .string()
    .datetime()
    .optional()
    .default(() => new Date().toISOString()),
});
export type GrowthAgentRunEventInput = z.infer<typeof GrowthAgentRunEventInputSchema>;
