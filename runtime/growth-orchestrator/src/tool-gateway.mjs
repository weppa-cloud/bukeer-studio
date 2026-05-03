import { ACTION_CLASSES, ALWAYS_GATED_ACTION_CLASSES } from "./toolsets.mjs";

const POLICY_VERSION = "growth-runtime-score-8-5-v1";
const LANE_AUTONOMY_AGREEMENT_THRESHOLD = 0.9;

const LEGACY_ACTION_CLASS_MAP = {
  runtime_execution: ACTION_CLASSES.PREPARE,
  source_read: ACTION_CLASSES.OBSERVE,
  artifact_write: ACTION_CLASSES.PREPARE,
  review_write: ACTION_CLASSES.PREPARE,
  memory_proposal: ACTION_CLASSES.PREPARE,
  skill_proposal: ACTION_CLASSES.PREPARE,
  business_mutation: ACTION_CLASSES.SAFE_APPLY,
  auto_apply: ACTION_CLASSES.SAFE_APPLY,
};

export function normalizeActionClass(value) {
  const raw = String(value ?? ACTION_CLASSES.PREPARE).trim();
  return LEGACY_ACTION_CLASS_MAP[raw] ?? raw;
}

function requiredApproval(actionClass) {
  if (actionClass === ACTION_CLASSES.PAID_MUTATION) return "council";
  if (actionClass === ACTION_CLASSES.EXPERIMENT_ACTIVATION) return "council";
  if (ALWAYS_GATED_ACTION_CLASSES.has(actionClass)) return "curator";
  if (actionClass === ACTION_CLASSES.SAFE_APPLY) return "curator";
  return "none";
}

function evaluateGate(actionClass, context = {}) {
  if (
    actionClass === ACTION_CLASSES.OBSERVE ||
    actionClass === ACTION_CLASSES.PREPARE
  ) {
    return { allowed: true, reason: "allowed", required_approval: "none" };
  }

  if (ALWAYS_GATED_ACTION_CLASSES.has(actionClass)) {
    return {
      allowed: false,
      reason: "action_class_always_gated",
      required_approval: requiredApproval(actionClass),
    };
  }

  if (actionClass === ACTION_CLASSES.SAFE_APPLY) {
    const agreement = context.laneAgreement?.agreement ?? null;
    if (!context.tenantAutoApplyEnabled) {
      return {
        allowed: false,
        reason: "tenant_kill_switch_off",
        required_approval: "curator",
      };
    }
    if (agreement == null || agreement < LANE_AUTONOMY_AGREEMENT_THRESHOLD) {
      return {
        allowed: false,
        reason: "agreement_below_threshold",
        required_approval: "curator",
      };
    }
    if (
      context.laneAgreement?.policy_version &&
      context.laneAgreement.policy_version !==
        (context.policyVersion ?? POLICY_VERSION)
    ) {
      return {
        allowed: false,
        reason: "policy_version_mismatch",
        required_approval: "curator",
      };
    }
    if (!context.smokePass) {
      return {
        allowed: false,
        reason: "smoke_failed",
        required_approval: "curator",
      };
    }
    return { allowed: true, reason: "allowed", required_approval: "none" };
  }

  return {
    allowed: false,
    reason: "lane_locked",
    required_approval: "curator",
  };
}

export function evaluateToolPolicy(toolCall, context = {}) {
  const actionClass = normalizeActionClass(toolCall?.action_class);
  const gate = evaluateGate(actionClass, context);
  const allowed = gate.allowed && toolCall?.allowed !== false;
  const policyVerdict = allowed
    ? "allowed_prepare_only"
    : gate.reason === "action_class_always_gated"
      ? "blocked_always_gated"
      : `blocked_${gate.reason}`;

  return {
    ...toolCall,
    action_class: actionClass,
    allowed,
    policy_verdict: policyVerdict,
    reason:
      toolCall?.reason ??
      (allowed
        ? "Runtime may prepare evidence; business mutation remains review-gated."
        : "Bukeer Growth OS policy blocks this tool action until human/Council approval."),
    gate_reason: gate.reason,
    required_approval: gate.required_approval,
    policy_version: context.policyVersion ?? POLICY_VERSION,
    lane_agreement: context.laneAgreement ?? null,
    smoke_pass: Boolean(context.smokePass),
  };
}

export function evaluateToolCalls(toolCalls = [], context = {}) {
  return toolCalls.map((toolCall) => evaluateToolPolicy(toolCall, context));
}
