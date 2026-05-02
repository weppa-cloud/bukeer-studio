/**
 * Symphony Orchestrator — public barrel.
 *
 * Refs: SPEC_GROWTH_OS_SYMPHONY_ORCHESTRATOR.md (#403, #404)
 */

export { claimNextEligibleRow } from './claim';
export type {
  ClaimNextEligibleRowOptions,
  ClaimNextEligibleRowResult,
} from './claim';

export { writeRunEvent } from './event-writer';
export type { WriteRunEventOptions } from './event-writer';

export {
  assertTenantScope,
  TenantScopeViolationError,
} from './tenant-guard';

export { checkConcurrency } from './concurrency';
export type {
  ConcurrencyCheckRequest,
  ConcurrencyCheckResult,
  ConcurrencyLevel,
} from './concurrency';

export { markHeartbeat, detectStalled } from './heartbeat';
export type { DetectStalledResult } from './heartbeat';

export type {
  ClaimRequest,
  ClaimResult,
  OrchestratorConfig,
  OrchestratorLaneConfig,
  ConcurrencyCaps,
  TenantScope,
} from './types';
