export const ACTION_CLASSES = {
  RUNTIME_EXECUTION: "runtime_execution",
  SOURCE_READ: "source_read",
  ARTIFACT_WRITE: "artifact_write",
  REVIEW_WRITE: "review_write",
  MEMORY_PROPOSAL: "memory_proposal",
  SKILL_PROPOSAL: "skill_proposal",
  CONTENT_PUBLISH: "content_publish",
  TRANSCREATION_MERGE: "transcreation_merge",
  PAID_MUTATION: "paid_mutation",
  EXPERIMENT_ACTIVATION: "experiment_activation",
};

export const ALWAYS_GATED_ACTION_CLASSES = new Set([
  ACTION_CLASSES.CONTENT_PUBLISH,
  ACTION_CLASSES.TRANSCREATION_MERGE,
  ACTION_CLASSES.PAID_MUTATION,
  ACTION_CLASSES.EXPERIMENT_ACTIVATION,
]);

export const LANE_TOOLSETS = {
  orchestrator: {
    allowed: [
      "codex_exec",
      "supabase_read",
      "artifact_write",
      "ai_review_write",
    ],
    blocked: [...ALWAYS_GATED_ACTION_CLASSES],
    mode: "observe_only",
  },
  technical_remediation: {
    allowed: ["codex_exec", "supabase_read", "artifact_write", "smoke_plan"],
    blocked: [...ALWAYS_GATED_ACTION_CLASSES],
    mode: "prepare_only",
  },
  transcreation: {
    allowed: ["codex_exec", "supabase_read", "artifact_write"],
    blocked: [...ALWAYS_GATED_ACTION_CLASSES],
    mode: "prepare_only",
  },
  content_creator: {
    allowed: ["codex_exec", "supabase_read", "artifact_write"],
    blocked: [...ALWAYS_GATED_ACTION_CLASSES],
    mode: "prepare_only",
  },
  content_curator: {
    allowed: [
      "codex_exec",
      "supabase_read",
      "artifact_write",
      "ai_review_write",
    ],
    blocked: [...ALWAYS_GATED_ACTION_CLASSES],
    mode: "prepare_only",
  },
};

export function toolsetForLane(lane) {
  return (
    LANE_TOOLSETS[lane] ?? {
      allowed: ["codex_exec", "artifact_write"],
      blocked: [...ALWAYS_GATED_ACTION_CLASSES],
      mode: "prepare_only",
    }
  );
}
