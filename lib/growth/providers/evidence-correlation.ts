import { createHash } from "crypto";

import type {
  GrowthEvidenceCorrelationResult,
  GrowthEvidenceDedupeVerdict,
} from "@bukeer/website-contract";
import { GrowthEvidenceCorrelationResultSchema } from "@bukeer/website-contract";

type JsonRecord = Record<string, unknown>;

export interface ExistingGrowthEvidenceWork {
  id: string;
  status: string;
  evidence?: JsonRecord | null;
  outcome_status?: string | null;
}

export interface EvaluateGrowthEvidenceCorrelationInput {
  websiteId: string;
  decisionFamily: string;
  entityKey: string;
  actionKey: string;
  evidence: unknown;
  existingWork?: ExistingGrowthEvidenceWork[];
  existingCandidates?: ExistingGrowthEvidenceWork[];
  now?: Date;
}

const VOLATILE_KEYS = new Set([
  "id",
  "created_at",
  "updated_at",
  "cycle_id",
  "run_id",
  "fetched_at",
  "generated_at",
  "observed_at",
  "provider_run_id",
  "profile_run_id",
]);

function stableNormalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableNormalize);
  if (!value || typeof value !== "object") return value;
  const record = value as JsonRecord;
  return Object.fromEntries(
    Object.entries(record)
      .filter(([key]) => !VOLATILE_KEYS.has(key))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, child]) => [key, stableNormalize(child)]),
  );
}

export function computeGrowthEvidenceFingerprint(evidence: unknown): string {
  const normalized = stableNormalize(evidence);
  const digest = createHash("sha256")
    .update(JSON.stringify(normalized))
    .digest("hex");
  return `sha256:${digest}`;
}

function readCorrelation(record: ExistingGrowthEvidenceWork) {
  const evidence = (record.evidence ?? {}) as JsonRecord;
  return (evidence.correlation ?? {}) as JsonRecord;
}

function outcomeVerdict(status: string | null | undefined): GrowthEvidenceDedupeVerdict | null {
  if (!status) return null;
  if (["won", "scale"].includes(status)) return "scale";
  if (["lost", "stop"].includes(status)) return "block";
  return null;
}

export function evaluateGrowthEvidenceCorrelation(
  input: EvaluateGrowthEvidenceCorrelationInput,
): GrowthEvidenceCorrelationResult {
  const evidenceFingerprint = computeGrowthEvidenceFingerprint(input.evidence);
  const correlationKey = `${input.websiteId}:${input.decisionFamily}:${input.actionKey}`;
  const existingWork = input.existingWork ?? [];
  const existingCandidates = input.existingCandidates ?? [];
  const previousWorkItemIds = existingWork.map((row) => row.id);
  const previousCandidateIds = existingCandidates.map((row) => row.id);
  const noGoReasons: string[] = [];
  let dedupeVerdict: GrowthEvidenceDedupeVerdict = "create";
  let coalescedWithWorkItemId: string | null = null;
  let reopenedFromWorkItemId: string | null = null;
  let materialEvidenceChange = false;

  const activeWork = existingWork.find((row) =>
    ["ready", "running", "claimed", "review_required"].includes(row.status),
  );
  if (activeWork) {
    dedupeVerdict = "coalesce";
    coalescedWithWorkItemId = activeWork.id;
    noGoReasons.push(`active_work:${activeWork.status}`);
  }

  const measuringWork = existingWork.find((row) =>
    ["published_applied", "measuring"].includes(row.status),
  );
  if (!activeWork && measuringWork) {
    dedupeVerdict = "skip";
    coalescedWithWorkItemId = measuringWork.id;
    noGoReasons.push(`measurement_window_open:${measuringWork.status}`);
  }

  const failedWork = existingWork.find((row) =>
    ["rolled_back", "smoke_failed", "blocked"].includes(row.status),
  );
  if (!activeWork && !measuringWork && failedWork) {
    const priorFingerprint = String(readCorrelation(failedWork).evidence_fingerprint ?? "");
    if (priorFingerprint && priorFingerprint !== evidenceFingerprint) {
      dedupeVerdict = "reopen";
      reopenedFromWorkItemId = failedWork.id;
      materialEvidenceChange = true;
    } else {
      dedupeVerdict = "block";
      coalescedWithWorkItemId = failedWork.id;
      noGoReasons.push(`prior_failure:${failedWork.status}`);
    }
  }

  for (const row of existingWork) {
    const outcomeBased = outcomeVerdict(row.outcome_status);
    if (!outcomeBased) continue;
    if (outcomeBased === "scale" && dedupeVerdict === "create") {
      dedupeVerdict = "scale";
      coalescedWithWorkItemId = row.id;
      noGoReasons.push("prior_outcome_won_requires_scale_scope");
    }
    if (outcomeBased === "block") {
      const priorFingerprint = String(readCorrelation(row).evidence_fingerprint ?? "");
      if (priorFingerprint && priorFingerprint !== evidenceFingerprint) {
        dedupeVerdict = "reopen";
        reopenedFromWorkItemId = row.id;
        materialEvidenceChange = true;
      } else {
        dedupeVerdict = "block";
        coalescedWithWorkItemId = row.id;
        noGoReasons.push(`prior_outcome_${row.outcome_status}`);
      }
    }
  }

  const duplicateCandidate = existingCandidates.find((row) => {
    const correlation = readCorrelation(row);
    return (
      correlation.correlation_key === correlationKey &&
      correlation.evidence_fingerprint === evidenceFingerprint
    );
  });
  if (dedupeVerdict === "create" && duplicateCandidate) {
    dedupeVerdict = "coalesce";
    noGoReasons.push("duplicate_candidate");
  }

  return GrowthEvidenceCorrelationResultSchema.parse({
    entity_key: input.entityKey,
    action_key: input.actionKey,
    correlation_key: correlationKey,
    evidence_fingerprint: evidenceFingerprint,
    decision_family: input.decisionFamily,
    dedupe_verdict: dedupeVerdict,
    confidence: noGoReasons.length > 0 ? 0.85 : 0.7,
    previous_work_item_ids: previousWorkItemIds,
    previous_candidate_ids: previousCandidateIds,
    previous_outcome_ids: [],
    coalesced_with_work_item_id: coalescedWithWorkItemId,
    reopened_from_work_item_id: reopenedFromWorkItemId,
    cooldown_until: null,
    no_go_reasons: noGoReasons,
    material_evidence_change: materialEvidenceChange,
  });
}
