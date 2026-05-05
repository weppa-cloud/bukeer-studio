import type { AgentLane } from "@bukeer/website-contract";

import {
  ACTION_CLASS_REQUIRED_APPROVAL,
  isAlwaysGated,
  type ActionClass,
} from "./action-classes";
import type { LaneAgreement } from "./lane-agreement";

/**
 * Lane-Level Autonomy Gate — SPEC_GROWTH_OS_SYMPHONY_ORCHESTRATOR (#408).
 *
 * Compound gate consulted by the orchestrator before any tool call. Logic
 * mirrors SPEC §"Lane-Level Autonomy Gate":
 *
 *   lane_agreement >= 0.90
 *   AND policy_version == current
 *   AND smoke_contract == PASS
 *   AND action_class IN { reversible, low-risk, observable }
 *   AND tenant.auto_apply_enabled == true
 *
 * Refs:
 *   - SPEC_GROWTH_OS_SYMPHONY_ORCHESTRATOR.md §"Lane-Level Autonomy Gate"
 *   - ADR-008 (agent runtime contracts)
 */

export const LANE_AUTONOMY_AGREEMENT_THRESHOLD = 0.9;

export type GateInput = {
  accountId: string;
  websiteId: string;
  lane: AgentLane;
  actionClass: ActionClass;
  laneAgreement: LaneAgreement | null;
  policyVersion: string;
  smokePass: boolean;
  tenantAutoApplyEnabled: boolean;
};

export type GateReason =
  | "lane_locked"
  | "agreement_below_threshold"
  | "policy_version_mismatch"
  | "smoke_failed"
  | "tenant_kill_switch_off"
  | "action_class_always_gated"
  | "allowed";

export type GateOutput = {
  allowed: boolean;
  reason: GateReason;
  requiredApproval: "none" | "curator" | "council";
};

/**
 * Evaluate the autonomy gate for a single (lane, action_class) combination.
 *
 * Decision order:
 *   1. observe / prepare / route / split / follow-up / research are always
 *      allowed because they only move internal work forward.
 *   2. Always-gated action classes return their baseline required role
 *      (curator/council) regardless of agreement score.
 *   3. safe_apply requires ALL of:
 *        - laneAgreement != null AND laneAgreement.agreement >= 0.90
 *        - laneAgreement.policy_version === input.policyVersion
 *        - smokePass === true
 *        - tenantAutoApplyEnabled === true
 *      When any condition fails, the action falls back to curator review.
 */
export function evaluateGate(input: GateInput): GateOutput {
  const {
    actionClass,
    laneAgreement,
    policyVersion,
    smokePass,
    tenantAutoApplyEnabled,
  } = input;

  // (1) Read-only / staging-only classes have no mutation surface — always allowed.
  if (
    actionClass === "observe" ||
    actionClass === "prepare" ||
    actionClass === "route" ||
    actionClass === "split" ||
    actionClass === "follow_up_backlog_create" ||
    actionClass === "research_packet"
  ) {
    return { allowed: true, reason: "allowed", requiredApproval: "none" };
  }

  // (2) Always-gated classes never auto-apply, regardless of agreement.
  if (isAlwaysGated(actionClass)) {
    return {
      allowed: false,
      reason: "action_class_always_gated",
      requiredApproval: ACTION_CLASS_REQUIRED_APPROVAL[actionClass],
    };
  }

  // (3) safe_apply — evaluate compound gate.
  if (actionClass === "safe_apply") {
    if (!tenantAutoApplyEnabled) {
      return {
        allowed: false,
        reason: "tenant_kill_switch_off",
        requiredApproval: "curator",
      };
    }
    if (laneAgreement === null) {
      return {
        allowed: false,
        reason: "agreement_below_threshold",
        requiredApproval: "curator",
      };
    }
    if (laneAgreement.agreement < LANE_AUTONOMY_AGREEMENT_THRESHOLD) {
      return {
        allowed: false,
        reason: "agreement_below_threshold",
        requiredApproval: "curator",
      };
    }
    if (laneAgreement.policy_version !== policyVersion) {
      return {
        allowed: false,
        reason: "policy_version_mismatch",
        requiredApproval: "curator",
      };
    }
    if (!smokePass) {
      return {
        allowed: false,
        reason: "smoke_failed",
        requiredApproval: "curator",
      };
    }
    return { allowed: true, reason: "allowed", requiredApproval: "none" };
  }

  // Defensive fallback — unknown class is treated as locked.
  return {
    allowed: false,
    reason: "lane_locked",
    requiredApproval: "curator",
  };
}
