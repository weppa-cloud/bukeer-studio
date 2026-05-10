import type {
  GrowthOrchestratorDecision,
  GrowthOpportunityCandidateInsert,
} from "@bukeer/website-contract";
import { GrowthOpportunityCandidateInsertSchema } from "@bukeer/website-contract";

import {
  asRecord,
  type JsonRecord,
  type SupabaseLike,
} from "@/lib/growth/autonomy/runtime-common";
import { dataForSeoEvidenceGate } from "@/lib/growth/autonomy/dataforseo-provider-profile";

const SENSITIVE_ACTIONS = new Set([
  "paid_mutation",
  "experiment_activation",
  "outreach_send",
]);

const SENSITIVE_SURFACE_PATTERNS = [
  /paid/i,
  /pricing?/i,
  /payment/i,
  /reservation/i,
  /availability/i,
  /bulk[_\s-]?crm/i,
  /outreach/i,
];

export interface MaterializeBrainDecisionResult {
  decisionId: string;
  createdCandidateIds: string[];
  createdWorkItemIds: string[];
  createdTaskSessionIds: string[];
  blockedReasons: string[];
  status: "materialized" | "blocked" | "failed";
}

function isSensitive(value: unknown): boolean {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? {});
  return SENSITIVE_SURFACE_PATTERNS.some((pattern) => pattern.test(text));
}

function targetFromEvidence(evidence: JsonRecord): JsonRecord {
  const target = asRecord(evidence.target);
  if (Object.keys(target).length > 0) return target;
  return {
    target_table: "growth_work_items",
    target_key: evidence.target_key ?? evidence.topic ?? "agentic-brain",
  };
}

function providerEvidenceBlocked(candidate: JsonRecord): string | null {
  const actionClass = String(candidate.allowed_action_class ?? "");
  if (
    actionClass !== "content_publish" &&
    actionClass !== "transcreation_merge" &&
    actionClass !== "safe_apply"
  ) {
    return null;
  }
  const evidence = asRecord(candidate.evidence);
  const dataForSeoEvidence = asRecord(evidence.dataforseo_evidence);
  if (dataForSeoEvidence.required !== true) {
    return "dataforseo_evidence_missing";
  }
  const verdict = dataForSeoEvidenceGate(dataForSeoEvidence);
  return verdict.allowed ? null : (verdict.reason ?? "dataforseo_evidence_blocked");
}

async function insertCandidate({
  supabase,
  decision,
  candidate,
}: {
  supabase: SupabaseLike;
  decision: GrowthOrchestratorDecision;
  candidate: JsonRecord;
}) {
  const evidence = asRecord(candidate.evidence);
  const insert: GrowthOpportunityCandidateInsert =
    GrowthOpportunityCandidateInsertSchema.parse({
      account_id: decision.account_id,
      website_id: decision.website_id,
      locale: decision.locale,
      market: decision.market,
      candidate_type: candidate.candidate_type,
      lane: candidate.lane,
      allowed_action_class: candidate.allowed_action_class,
      title: candidate.title,
      summary: candidate.summary,
      impact_score: Number(candidate.impact_score ?? candidate.total_score ?? 60),
      confidence: Number(candidate.confidence ?? decision.confidence),
      urgency_score: Number(candidate.urgency_score ?? 50),
      cost_score: Number(candidate.cost_score ?? 50),
      risk_score: Number(candidate.risk_score ?? 45),
      total_score: Number(candidate.total_score ?? 60),
      status: "ready_for_backlog",
      blocking_reason: null,
      required_profile_types: candidate.required_profile_types ?? ["risk_policy"],
      profile_snapshot: asRecord(candidate.profile_snapshot),
      source_signal_fact_ids: candidate.source_signal_fact_ids ?? [],
      evidence: {
        ...evidence,
        target: targetFromEvidence(evidence),
        rollback_expectation:
          asRecord(evidence.rollback_expectation).strategy
            ? asRecord(evidence.rollback_expectation)
            : {
                strategy: "executor_requires_complete_rollback_before_apply",
              },
        baseline:
          Object.keys(asRecord(evidence.baseline)).length > 0
            ? asRecord(evidence.baseline)
            : { brain_baseline: "pending_runtime_measurement" },
        orchestrator_decision_id: decision.id,
        context_snapshot_id: decision.context_snapshot_id,
      },
      success_metric: candidate.success_metric,
      evaluation_window: candidate.evaluation_window,
      idempotency_key:
        typeof candidate.idempotency_key === "string"
          ? candidate.idempotency_key
          : `brain:${decision.id}:${candidate.lane}:${candidate.allowed_action_class}:${String(candidate.title).slice(0, 80)}`,
      promoted_work_item_id: null,
    });

  const { data, error } = await supabase
    .from("growth_opportunity_candidates")
    .upsert(insert, { onConflict: "website_id,idempotency_key" })
    .select("id")
    .limit(1);
  if (error) throw new Error(`brain candidate materialization failed: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.id) throw new Error("brain candidate materialization returned no id");
  return String(row.id);
}

async function insertTaskSession({
  supabase,
  decision,
  task,
}: {
  supabase: SupabaseLike;
  decision: GrowthOrchestratorDecision;
  task: JsonRecord;
}) {
  const { data, error } = await supabase
    .from("growth_agent_task_sessions")
    .insert({
      account_id: decision.account_id,
      website_id: decision.website_id,
      locale: decision.locale,
      market: decision.market,
      parent_work_item_id: task.parent_work_item_id ?? null,
      child_work_item_id: task.child_work_item_id ?? null,
      delegated_by_agent_id: task.delegated_by_agent_id ?? "growth_ceo_brain",
      assigned_agent_lane: task.assigned_agent_lane,
      wakeup_request_id: decision.wakeup_request_id,
      decision_id: decision.id,
      status: "assigned",
      handoff_summary: task.handoff_summary ?? task.title,
      required_context_refs: task.required_context_refs ?? [
        `growth_context_snapshots:${decision.context_snapshot_id}`,
      ],
      dependencies: task.dependencies ?? [],
      completion_contract:
        Object.keys(asRecord(task.completion_contract)).length > 0
          ? task.completion_contract
          : {
              produce_work_item_or_blocked_reason: true,
            },
      session_state: {
        source: "growth_ceo_brain",
        title: task.title,
      },
    })
    .select("id")
    .limit(1);
  if (error) throw new Error(`task session insert failed: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.id) throw new Error("task session insert returned no id");
  return String(row.id);
}

export async function materializeBrainDecision({
  supabase,
  decision,
}: {
  supabase: SupabaseLike;
  decision: GrowthOrchestratorDecision;
}): Promise<MaterializeBrainDecisionResult> {
  const blockedReasons: string[] = [];

  for (const candidate of decision.proposed_candidates) {
    if (
      SENSITIVE_ACTIONS.has(String(candidate.allowed_action_class)) ||
      isSensitive(candidate)
    ) {
      blockedReasons.push(`sensitive_candidate:${candidate.allowed_action_class}`);
    }
    const providerBlock = providerEvidenceBlocked(candidate);
    if (providerBlock) {
      blockedReasons.push(
        `provider_candidate:${candidate.allowed_action_class}:${providerBlock}`,
      );
    }
  }
  for (const workItem of decision.proposed_work_items) {
    if (
      SENSITIVE_ACTIONS.has(String(workItem.allowed_action_class)) ||
      isSensitive(workItem)
    ) {
      blockedReasons.push(`sensitive_work_item:${workItem.allowed_action_class}`);
    }
  }

  if (blockedReasons.length > 0) {
    await supabase
      .from("growth_orchestrator_decisions")
      .update({
        materialization_status: "blocked",
        no_go_reasons: [...decision.no_go_reasons, ...blockedReasons],
      })
      .eq("id", decision.id)
      .eq("website_id", decision.website_id);
    return {
      decisionId: decision.id,
      createdCandidateIds: [],
      createdWorkItemIds: [],
      createdTaskSessionIds: [],
      blockedReasons,
      status: "blocked",
    };
  }

  const createdCandidateIds: string[] = [];
  const createdTaskSessionIds: string[] = [];
  try {
    for (const candidate of decision.proposed_candidates) {
      createdCandidateIds.push(
        await insertCandidate({
          supabase,
          decision,
          candidate,
        }),
      );
    }
    for (const task of decision.delegated_tasks) {
      createdTaskSessionIds.push(
        await insertTaskSession({
          supabase,
          decision,
          task,
        }),
      );
    }

    await supabase
      .from("growth_orchestrator_decisions")
      .update({
        materialization_status: "materialized",
        created_candidate_ids: createdCandidateIds,
      })
      .eq("id", decision.id)
      .eq("website_id", decision.website_id);

    return {
      decisionId: decision.id,
      createdCandidateIds,
      createdWorkItemIds: [],
      createdTaskSessionIds,
      blockedReasons: [],
      status: "materialized",
    };
  } catch (error) {
    await supabase
      .from("growth_orchestrator_decisions")
      .update({
        materialization_status: "failed",
        evidence: {
          ...(decision.evidence ?? {}),
          materialization_error:
            error instanceof Error ? error.message : String(error),
        },
      })
      .eq("id", decision.id)
      .eq("website_id", decision.website_id);
    throw error;
  }
}
