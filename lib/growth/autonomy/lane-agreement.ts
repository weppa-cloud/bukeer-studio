import { z } from 'zod';

import { AgentLaneSchema } from '@bukeer/website-contract';

/**
 * Lane Agreement Artifact — SPEC_GROWTH_OS_SYMPHONY_ORCHESTRATOR §"Lane-Level
 * Autonomy Gate" (#408) and §"Agreement Baseline".
 *
 * The evaluator (#404 / #406) emits one record per lane summarizing AI vs.
 * human agreement over a fixed evaluation window. The Lane-Level Autonomy
 * Gate consults the most recent matching record (by account + website + lane
 * + policy_version) before allowing `auto_apply_safe` actions.
 *
 * The artifact is persisted both in DB and as a file at
 * `evidence/growth/agreement-lane-<date>.json` so any agreement number cited
 * in #310 / sprint planning can be grounded to a specific source.
 *
 * Refs:
 *   - SPEC_GROWTH_OS_SYMPHONY_ORCHESTRATOR.md §"Lane-Level Autonomy Gate"
 *   - SPEC_GROWTH_OS_SYMPHONY_ORCHESTRATOR.md §"Agreement Baseline"
 *   - ADR-008 (agent runtime contracts)
 *   - ADR-009 (account_id + website_id scoping)
 */

export const LaneAgreementDisagreementSchema = z.object({
  run_id: z.string(),
  reason: z.string(),
});
export type LaneAgreementDisagreement = z.infer<
  typeof LaneAgreementDisagreementSchema
>;

export const LaneAgreementSchema = z.object({
  account_id: z.string(),
  website_id: z.string(),
  lane: AgentLaneSchema,
  agreement: z.number().min(0).max(1),
  policy_version: z.string().min(1),
  computed_at: z.string().datetime(),
  sample_size: z.number().int().min(0),
  window_start: z.string().datetime(),
  window_end: z.string().datetime(),
  ai_human_disagreements: z.array(LaneAgreementDisagreementSchema),
});
export type LaneAgreement = z.infer<typeof LaneAgreementSchema>;

/**
 * Bundle shape — what the evaluator writes to disk: one entry per canonical
 * lane covered by the run. The orchestrator looks up by lane.
 */
export const LaneAgreementBundleSchema = z.array(LaneAgreementSchema);
export type LaneAgreementBundle = z.infer<typeof LaneAgreementBundleSchema>;
