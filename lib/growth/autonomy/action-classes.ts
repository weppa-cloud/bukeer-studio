import { z } from "zod";

/**
 * Action classes — SPEC_GROWTH_OS_SYMPHONY_ORCHESTRATOR §"Cross-cutting action
 * classes (always Council/Curator gated)" and §"Lane-Level Autonomy Gate".
 *
 * Action classes are *policies*, not lanes. The autonomy gate consults the
 * action_class on every tool call. Some classes are always Council/Curator
 * gated regardless of lane agreement; the rest may auto-apply when the
 * compound gate passes.
 *
 * Mapping to SPEC §169-177:
 *   - paid_mutation         → Council required
 *   - experiment_activation → Council required
 *   - content_publish       → Curator required
 *   - transcreation_merge   → Curator required
 *   - outreach_send         → Curator required
 *   - safe_apply            → none (when gate passes; otherwise curator)
 *   - prepare               → none (no mutation surface)
 *   - observe               → none (read-only)
 */

export const ActionClassSchema = z.enum([
  "observe",
  "prepare",
  "route",
  "split",
  "follow_up_backlog_create",
  "research_packet",
  "safe_apply",
  "content_publish",
  "transcreation_merge",
  "paid_mutation",
  "experiment_activation",
  "outreach_send",
]);
export type ActionClass = z.infer<typeof ActionClassSchema>;

export type RequiredApproval = "none" | "curator" | "council";

/**
 * Required-role map. `safe_apply` resolves to `'none'` only when the
 * compound gate passes — see `evaluateGate`. The map below is the *baseline*
 * required role assuming the action is attempted; the gate may upgrade
 * `safe_apply` to `curator` when conditions fail.
 */
export const ACTION_CLASS_REQUIRED_APPROVAL: Record<
  ActionClass,
  RequiredApproval
> = {
  observe: "none",
  prepare: "none",
  route: "none",
  split: "none",
  follow_up_backlog_create: "none",
  research_packet: "none",
  safe_apply: "none",
  content_publish: "curator",
  transcreation_merge: "curator",
  outreach_send: "curator",
  paid_mutation: "council",
  experiment_activation: "council",
};

/**
 * Action classes that are ALWAYS gated regardless of lane agreement /
 * policy version / smoke pass. These never become eligible for
 * `auto_apply_safe`.
 */
export const ALWAYS_GATED_ACTION_CLASSES = new Set<ActionClass>([
  "content_publish",
  "transcreation_merge",
  "paid_mutation",
  "experiment_activation",
  "outreach_send",
]);

export function isAlwaysGated(actionClass: ActionClass): boolean {
  return ALWAYS_GATED_ACTION_CLASSES.has(actionClass);
}
