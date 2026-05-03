import { ALWAYS_GATED_ACTION_CLASSES } from "./toolsets.mjs";

export function evaluateToolPolicy(toolCall) {
  const actionClass = String(toolCall?.action_class ?? "runtime_execution");
  if (ALWAYS_GATED_ACTION_CLASSES.has(actionClass)) {
    return {
      ...toolCall,
      action_class: actionClass,
      allowed: false,
      policy_verdict: "blocked_always_gated",
      reason:
        toolCall?.reason ??
        "Bukeer Growth OS always gates this action class for human/Council review.",
    };
  }

  return {
    ...toolCall,
    action_class: actionClass,
    allowed: toolCall?.allowed ?? true,
    policy_verdict: toolCall?.policy_verdict ?? "allowed_prepare_only",
    reason:
      toolCall?.reason ??
      "Runtime may prepare evidence; business mutation remains review-gated.",
  };
}

export function evaluateToolCalls(toolCalls = []) {
  return toolCalls.map((toolCall) => evaluateToolPolicy(toolCall));
}
