import type { AgentLane } from "@bukeer/website-contract";
import type { ActionClass, RequiredApproval } from "./action-classes";
import { isAlwaysGated } from "./action-classes";

export type GrowthRiskLevel = "low" | "medium" | "high" | "blocked";

export type GrowthRiskInput = {
  lane: AgentLane;
  actionClass: ActionClass;
  confidence?: number | null;
  riskLevel?: string | null;
  evidenceRefs?: readonly string[];
  hasRollback?: boolean;
  laneAgreement?: number | null;
  smokePass?: boolean;
};

export type GrowthRiskDecision = {
  riskLevel: GrowthRiskLevel;
  riskScore: number;
  requiresHumanReview: boolean;
  requiredApproval: RequiredApproval;
  autonomyLabel: "sigue_solo" | "revision_humana" | "bloqueado";
  reasons: string[];
};

const LOW_RISK_AUTONOMOUS_ACTIONS = new Set<ActionClass>([
  "observe",
  "prepare",
  "route",
  "split",
  "follow_up_backlog_create",
  "research_packet",
]);

function normalizeRiskLevel(value: string | null | undefined): GrowthRiskLevel {
  const risk = String(value ?? "").toLowerCase();
  if (risk.includes("blocked") || risk.includes("block")) return "blocked";
  if (risk.includes("high") || risk.includes("alto")) return "high";
  if (risk.includes("low") || risk.includes("bajo")) return "low";
  return "medium";
}

function clampConfidence(value: number | null | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function evaluateGrowthRisk(input: GrowthRiskInput): GrowthRiskDecision {
  const reasons: string[] = [];
  const confidence = clampConfidence(input.confidence);
  const baseRisk = normalizeRiskLevel(input.riskLevel);
  let riskScore =
    baseRisk === "blocked"
      ? 100
      : baseRisk === "high"
        ? 82
        : baseRisk === "medium"
          ? 52
          : 20;

  if (isAlwaysGated(input.actionClass)) {
    riskScore = Math.max(riskScore, 90);
    reasons.push("accion_sensible_siempre_requiere_aprobacion");
  }
  if (input.actionClass === "safe_apply" && !input.hasRollback) {
    riskScore = Math.max(riskScore, 72);
    reasons.push("aplicacion_sin_rollback_confirmado");
  }
  if (confidence > 0 && confidence < 0.72) {
    riskScore = Math.max(riskScore, 68);
    reasons.push("confianza_baja");
  }
  if ((input.evidenceRefs?.length ?? 0) === 0) {
    riskScore = Math.max(riskScore, 60);
    reasons.push("evidencia_incompleta");
  }
  if (input.laneAgreement != null && input.laneAgreement < 0.9) {
    riskScore = Math.max(riskScore, 70);
    reasons.push("agreement_lane_bajo");
  }
  if (input.smokePass === false) {
    riskScore = Math.max(riskScore, 78);
    reasons.push("smoke_fallido");
  }

  const riskLevel: GrowthRiskLevel =
    riskScore >= 95
      ? "blocked"
      : riskScore >= 75
        ? "high"
        : riskScore >= 45
          ? "medium"
          : "low";

  const canAdvanceAutonomously =
    LOW_RISK_AUTONOMOUS_ACTIONS.has(input.actionClass) &&
    riskLevel !== "high" &&
    riskLevel !== "blocked";

  const requiresHumanReview = !canAdvanceAutonomously;
  const requiredApproval: RequiredApproval =
    input.actionClass === "paid_mutation" ||
    input.actionClass === "experiment_activation"
      ? "council"
      : requiresHumanReview
        ? "curator"
        : "none";

  return {
    riskLevel,
    riskScore,
    requiresHumanReview,
    requiredApproval,
    autonomyLabel:
      riskLevel === "blocked"
        ? "bloqueado"
        : requiresHumanReview
          ? "revision_humana"
          : "sigue_solo",
    reasons: reasons.length ? reasons : ["riesgo_operativo_controlado"],
  };
}
