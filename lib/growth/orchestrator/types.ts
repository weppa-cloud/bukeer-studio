/**
 * Symphony Orchestrator — Internal Types
 *
 * Internal type aliases for the orchestrator runtime (issue #404).
 * Public schema types live in `@bukeer/website-contract` (sealed); this
 * file only defines runtime-facing shapes that don't belong in the
 * cross-package contract.
 *
 * Refs:
 *   - SPEC_GROWTH_OS_SYMPHONY_ORCHESTRATOR.md §"Orchestration Flow"
 *   - SPEC_GROWTH_OS_SYMPHONY_ORCHESTRATOR.md §"Lane-Level Autonomy Gate"
 *   - ADR-003 (multi-tenant)
 *   - ADR-008 (lane autonomy gate)
 *   - ADR-009 (tenant guard / RLS scoping)
 *   - ADR-018 (claim_id idempotency)
 */

import type {
  AgentLane,
  AgentMode,
  GrowthAgentRun,
} from '@bukeer/website-contract';

/**
 * Concrete request to claim the next eligible row for a given lane within a
 * single tenant. The orchestrator generates `claim_id` (uuid) per attempt to
 * make claim+insert idempotent on retry (see ADR-018).
 */
export interface ClaimRequest {
  /** Tenant — see ADR-009. */
  account_id: string;
  /** Tenant — see ADR-009. */
  website_id: string;
  /** Lane that wants to pick up work (one of the 5 canonical lanes). */
  lane: AgentLane;
  /** Idempotency key — same value across retries of the same logical claim. */
  claim_id: string;
  /** Workspace path the orchestrator has prepared on the worker volume. */
  workspace_path: string;
}

/**
 * Result of a claim attempt. Either we got a row to work on, or we report
 * back why we did not (so the orchestrator can sleep, switch lane, etc.).
 */
export type ClaimResult =
  | { kind: 'claimed'; run: GrowthAgentRun }
  | {
      kind: 'skipped';
      reason: 'no_eligible_rows' | 'concurrency_full';
      detail?: string;
    };

/**
 * Orchestrator configuration parsed from `docs/growth-orchestrator/WORKFLOW.md`
 * on startup. Each lane carries the runtime knobs (mode, model,
 * prompt_version) that the runtime hands to the agent. Concurrency caps and
 * heartbeat TTL are global defaults — per-tenant overrides come from
 * `growth_agent_definitions`.
 */
export interface OrchestratorConfig {
  version: string;
  lanes: Record<AgentLane, OrchestratorLaneConfig>;
  concurrency: ConcurrencyCaps;
  heartbeat_ttl_seconds: number;
}

export interface OrchestratorLaneConfig {
  /** Default mode for this lane (overridable per-tenant via `growth_agent_definitions.mode`). */
  mode: AgentMode;
  /** Model id to call (e.g. `anthropic/claude-sonnet-4-7`). */
  model: string;
  /** Prompt version string — pinned per release for reproducibility. */
  prompt_version: string;
}

export interface ConcurrencyCaps {
  /** Cluster-wide cap across all tenants and lanes. */
  global: number;
  /** Cap for a single (account_id, website_id) pair across all lanes. */
  per_tenant: number;
  /** Cap for a single lane within one tenant. */
  per_lane: number;
}

/**
 * Tenant scope ergonomic alias used by the runtime guard. We deliberately
 * keep this local — the contract `GrowthTenantScope` has `locale + market`
 * which the guard does not need.
 */
export interface TenantScope {
  account_id: string;
  website_id: string;
}
