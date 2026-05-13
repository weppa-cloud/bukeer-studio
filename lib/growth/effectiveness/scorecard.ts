import type {
  AgentLane,
  GrowthEffectivenessObservationStatus,
  GrowthEffectivenessSourceGroup,
} from "@bukeer/website-contract";

export const EFFECTIVENESS_SOURCE_GROUPS: GrowthEffectivenessSourceGroup[] = [
  "baseline_human_codex",
  "growth_os_deterministic",
  "growth_os_hermes_isolated",
];

export interface EffectivenessObservationInput {
  sourceGroup: GrowthEffectivenessSourceGroup;
  lane: AgentLane;
  status: GrowthEffectivenessObservationStatus;
  metrics?: Record<string, unknown>;
  timing?: Record<string, unknown>;
  cost?: Record<string, unknown>;
  qualityVerdict?: Record<string, unknown>;
  safetyVerdict?: Record<string, unknown>;
}

export interface EffectivenessGroupScore {
  sourceGroup: GrowthEffectivenessSourceGroup;
  total: number;
  accepted: number;
  rejectedOrBlocked: number;
  evaluated: number;
  gatePassRate: number | null;
  smokePassRate: number | null;
  rollbackRate: number | null;
  duplicateNoiseRate: number | null;
  missingEvidenceRate: number | null;
  safetyViolations: number;
  avgMinutesToAccepted: number | null;
  costUsd: number;
  costPerAccepted: number | null;
  wonOrInconclusiveRate: number | null;
  learningCitationCount: number;
}

export interface EffectivenessScorecard {
  groups: EffectivenessGroupScore[];
  winner: GrowthEffectivenessSourceGroup | "insufficient_data";
  hermesJustified: boolean;
  summary: string;
}

const ACCEPTED_STATUSES = new Set<GrowthEffectivenessObservationStatus>([
  "executed",
  "measuring",
  "evaluated",
]);

const TERMINAL_NEGATIVE_STATUSES = new Set<GrowthEffectivenessObservationStatus>([
  "rejected",
  "blocked",
]);

function boolValue(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.toLowerCase();
    if (["true", "pass", "passed", "yes", "won"].includes(normalized)) {
      return true;
    }
    if (["false", "fail", "failed", "no", "lost"].includes(normalized)) {
      return false;
    }
  }
  return null;
}

function numberValue(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function rate(passed: number, total: number): number | null {
  if (total === 0) return null;
  return passed / total;
}

function groupScore(
  sourceGroup: GrowthEffectivenessSourceGroup,
  observations: EffectivenessObservationInput[],
): EffectivenessGroupScore {
  const acceptedRows = observations.filter((row) =>
    ACCEPTED_STATUSES.has(row.status),
  );
  const rejectedOrBlocked = observations.filter((row) =>
    TERMINAL_NEGATIVE_STATUSES.has(row.status),
  ).length;

  let gateKnown = 0;
  let gatePassed = 0;
  let smokeKnown = 0;
  let smokePassed = 0;
  let rollbackKnown = 0;
  let rollbackCount = 0;
  let duplicateKnown = 0;
  let duplicateCount = 0;
  let missingEvidenceKnown = 0;
  let missingEvidenceCount = 0;
  let safetyViolations = 0;
  let evaluated = 0;
  let wonOrInconclusive = 0;
  let learningCitationCount = 0;
  let costUsd = 0;
  const acceptedMinutes: number[] = [];

  for (const row of observations) {
    const metrics = row.metrics ?? {};
    const timing = row.timing ?? {};
    const cost = row.cost ?? {};
    const quality = row.qualityVerdict ?? {};
    const safety = row.safetyVerdict ?? {};

    const gatePass = boolValue(quality.gate_pass ?? metrics.gate_pass);
    if (gatePass !== null) {
      gateKnown += 1;
      if (gatePass) gatePassed += 1;
    }

    const smokePass = boolValue(quality.smoke_pass ?? metrics.smoke_pass);
    if (smokePass !== null) {
      smokeKnown += 1;
      if (smokePass) smokePassed += 1;
    }

    const rollback = boolValue(quality.rollback_required ?? metrics.rollback);
    if (rollback !== null) {
      rollbackKnown += 1;
      if (rollback) rollbackCount += 1;
    }

    const duplicate = boolValue(
      quality.duplicate_noise ?? metrics.duplicate_noise,
    );
    if (duplicate !== null) {
      duplicateKnown += 1;
      if (duplicate) duplicateCount += 1;
    }

    const missingEvidence = boolValue(
      quality.missing_evidence ?? metrics.missing_evidence,
    );
    if (missingEvidence !== null) {
      missingEvidenceKnown += 1;
      if (missingEvidence) missingEvidenceCount += 1;
    }

    const sensitive = boolValue(safety.sensitive_mutation_attempt);
    const crossTenant = boolValue(safety.cross_tenant_violation);
    const directMutation = boolValue(safety.direct_mutation_outside_executor);
    const smokeWithoutRollback = boolValue(safety.smoke_failure_without_rollback);
    if (sensitive || crossTenant || directMutation || smokeWithoutRollback) {
      safetyViolations += 1;
    }

    const minutes = numberValue(
      timing.minutes_to_accepted ??
        timing.human_minutes ??
        metrics.minutes_to_accepted,
    );
    if (minutes !== null && ACCEPTED_STATUSES.has(row.status)) {
      acceptedMinutes.push(minutes);
    }

    costUsd +=
      numberValue(cost.total_usd ?? metrics.cost_usd ?? cost.api_usd) ?? 0;

    const outcomeStatus = String(metrics.outcome_status ?? "").toLowerCase();
    if (["won", "lost", "inconclusive"].includes(outcomeStatus)) {
      evaluated += 1;
      if (outcomeStatus === "won" || outcomeStatus === "inconclusive") {
        wonOrInconclusive += 1;
      }
    }

    const learningCitations = numberValue(
      metrics.learning_citation_count ?? metrics.memory_skill_citations,
    );
    if (learningCitations !== null) {
      learningCitationCount += learningCitations;
    } else if (boolValue(metrics.learning_cited) === true) {
      learningCitationCount += 1;
    }
  }

  return {
    sourceGroup,
    total: observations.length,
    accepted: acceptedRows.length,
    rejectedOrBlocked,
    evaluated,
    gatePassRate: rate(gatePassed, gateKnown),
    smokePassRate: rate(smokePassed, smokeKnown),
    rollbackRate: rate(rollbackCount, rollbackKnown),
    duplicateNoiseRate: rate(duplicateCount, duplicateKnown),
    missingEvidenceRate: rate(missingEvidenceCount, missingEvidenceKnown),
    safetyViolations,
    avgMinutesToAccepted: average(acceptedMinutes),
    costUsd,
    costPerAccepted: acceptedRows.length > 0 ? costUsd / acceptedRows.length : null,
    wonOrInconclusiveRate: rate(wonOrInconclusive, evaluated),
    learningCitationCount,
  };
}

function passRate(value: number | null): number {
  return value ?? 0;
}

function lowerIsBetter(value: number | null): number {
  return value ?? Number.POSITIVE_INFINITY;
}

export function scoreGrowthEffectivenessExperiment(
  observations: EffectivenessObservationInput[],
): EffectivenessScorecard {
  const groups = EFFECTIVENESS_SOURCE_GROUPS.map((sourceGroup) =>
    groupScore(
      sourceGroup,
      observations.filter((row) => row.sourceGroup === sourceGroup),
    ),
  );
  const human = groups.find((row) => row.sourceGroup === "baseline_human_codex");
  const deterministic = groups.find(
    (row) => row.sourceGroup === "growth_os_deterministic",
  );
  const hermes = groups.find(
    (row) => row.sourceGroup === "growth_os_hermes_isolated",
  );

  if (!human || !hermes || human.accepted === 0 || hermes.accepted === 0) {
    return {
      groups,
      winner: "insufficient_data",
      hermesJustified: false,
      summary: "Insufficient accepted observations to compare Hermes to the human baseline.",
    };
  }

  const speedHuman = lowerIsBetter(human.avgMinutesToAccepted);
  const speedHermes = lowerIsBetter(hermes.avgMinutesToAccepted);
  const speedImprovement =
    Number.isFinite(speedHuman) && Number.isFinite(speedHermes) && speedHuman > 0
      ? (speedHuman - speedHermes) / speedHuman
      : 0;
  const gateOk = passRate(hermes.gatePassRate) >= passRate(human.gatePassRate);
  const smokeOk = passRate(hermes.smokePassRate) >= passRate(human.smokePassRate);
  const duplicateOk =
    lowerIsBetter(hermes.duplicateNoiseRate) <= lowerIsBetter(human.duplicateNoiseRate);
  const costOk =
    lowerIsBetter(hermes.costPerAccepted) <= lowerIsBetter(human.costPerAccepted);
  const impactOk =
    hermes.evaluated === 0 ||
    human.evaluated === 0 ||
    passRate(hermes.wonOrInconclusiveRate) >=
      passRate(human.wonOrInconclusiveRate);
  const safetyOk = hermes.safetyViolations === 0;
  const hermesWinsHuman =
    speedImprovement >= 0.3 &&
    gateOk &&
    smokeOk &&
    duplicateOk &&
    costOk &&
    impactOk &&
    safetyOk;

  const deterministicQuality =
    deterministic && deterministic.total > 0
      ? passRate(hermes.gatePassRate) - passRate(deterministic.gatePassRate)
      : 0;
  const deterministicNoise =
    deterministic && deterministic.total > 0
      ? lowerIsBetter(deterministic.duplicateNoiseRate) -
        lowerIsBetter(hermes.duplicateNoiseRate)
      : 0;
  const hermesJustified =
    deterministicQuality >= 0.2 ||
    deterministicNoise >= 0.25 ||
    hermes.learningCitationCount > 0;

  return {
    groups,
    winner: hermesWinsHuman ? "growth_os_hermes_isolated" : "baseline_human_codex",
    hermesJustified,
    summary: hermesWinsHuman
      ? "Hermes beats the human baseline under the operational scorecard."
      : "Hermes has not yet beaten the human baseline under the operational scorecard.",
  };
}
