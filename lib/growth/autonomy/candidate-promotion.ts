import type {
  AgentLane,
  GrowthAutonomyActionClass,
  GrowthOpportunityCandidate,
  GrowthProfile,
} from "@bukeer/website-contract";

import {
  evaluateCandidateDataQuality,
  evaluateProfileFreshnessGate,
  requirementsForAction,
} from "./profile-freshness-gate";

type JsonRecord = Record<string, unknown>;

export interface PromotedWorkItemInsert {
  account_id: string;
  website_id: string;
  source_table: string;
  source_id: string;
  lane: AgentLane;
  agent_profile: string;
  title: string;
  intent: string;
  status: "ready";
  language: string;
  capability_requirements: string[];
  skill_hints: string[];
  allowed_action_class: GrowthAutonomyActionClass;
  risk_level: "low" | "medium" | "high" | "blocked";
  risk_score: number;
  requires_human_review: boolean;
  required_approval_role: "growth_operator" | "curator" | "council_admin" | "technical_owner";
  operator_summary: string;
  handoff_summary: string;
  next_action: string;
  progress_label: string;
  evidence: JsonRecord;
  source_refs: string[];
  idempotency_key: string;
  created_by: string;
}

export interface CandidatePromotionDecision {
  promoted: boolean;
  workItem: PromotedWorkItemInsert | null;
  blockingReason: string | null;
  freshness: ReturnType<typeof evaluateProfileFreshnessGate>;
}

function riskLevel(score: number): PromotedWorkItemInsert["risk_level"] {
  if (score >= 85) return "high";
  if (score <= 30) return "low";
  return "medium";
}

function approvalRole(
  actionClass: GrowthAutonomyActionClass,
  lane: AgentLane,
): PromotedWorkItemInsert["required_approval_role"] {
  if (actionClass === "safe_apply") return "technical_owner";
  if (lane === "content_curator") return "curator";
  return "curator";
}

function agentProfile(lane: AgentLane): string {
  if (lane === "technical_remediation") return "Technical Agent";
  if (lane === "transcreation") return "Transcreation Agent";
  if (lane === "content_creator") return "Content Creator";
  if (lane === "content_curator") return "Curator";
  return "Orchestrator";
}

function sourceRefs(candidate: GrowthOpportunityCandidate): string[] {
  const evidence = candidate.evidence as JsonRecord;
  const refs = evidence.source_refs;
  if (Array.isArray(refs)) {
    return refs.filter((item): item is string => typeof item === "string");
  }
  return candidate.source_signal_fact_ids.map((id) => `growth_signal_facts:${id}`);
}

function dataQualityFailures(candidate: GrowthOpportunityCandidate): string[] {
  return evaluateCandidateDataQuality({
    evidence: candidate.evidence as JsonRecord,
    successMetric: candidate.success_metric,
    evaluationWindow: candidate.evaluation_window,
  });
}

export function buildPromotedWorkItem(
  candidate: GrowthOpportunityCandidate,
  profiles: GrowthProfile[],
  now = new Date(),
): CandidatePromotionDecision {
  const freshness = evaluateProfileFreshnessGate({
    profiles,
    requirements: requirementsForAction(candidate.allowed_action_class),
    now,
  });
  const missingMetric = !candidate.success_metric || !candidate.evaluation_window;
  const missingEvidence = Object.keys(candidate.evidence ?? {}).length === 0;
  const blockingReasons = [
    ...freshness.missing.map((profile) => `missing:${profile}`),
    ...freshness.stale.map((profile) => `stale:${profile}`),
    ...freshness.lowConfidence.map((profile) => `low_confidence:${profile}`),
    ...dataQualityFailures(candidate),
  ];
  if (missingMetric) blockingReasons.push("missing_metric_or_evaluation_window");
  if (missingEvidence) blockingReasons.push("missing_evidence");
  if (candidate.status !== "ready_for_backlog") {
    blockingReasons.push(`candidate_status:${candidate.status}`);
  }

  if (blockingReasons.length > 0) {
    return {
      promoted: false,
      workItem: null,
      blockingReason: blockingReasons.join(","),
      freshness,
    };
  }

  const actionClass = candidate.allowed_action_class;
  const risk = riskLevel(candidate.risk_score);
  return {
    promoted: true,
    freshness,
    blockingReason: null,
    workItem: {
      account_id: candidate.account_id,
      website_id: candidate.website_id,
      source_table: "growth_opportunity_candidates",
      source_id: candidate.id,
      lane: candidate.lane,
      agent_profile: agentProfile(candidate.lane),
      title: candidate.title,
      intent: candidate.candidate_type,
      status: "ready",
      language: candidate.locale.split("-")[0] || "es",
      capability_requirements: [
        candidate.candidate_type,
        actionClass,
        ...candidate.required_profile_types,
      ],
      skill_hints: [],
      allowed_action_class: actionClass,
      risk_level: risk,
      risk_score: candidate.risk_score,
      requires_human_review: false,
      required_approval_role: approvalRole(actionClass, candidate.lane),
      operator_summary: candidate.summary,
      handoff_summary: `Autonomous candidate score ${candidate.total_score}; metric ${candidate.success_metric}.`,
      next_action: "Runtime can claim this work item when policy gates pass.",
      progress_label: "Listo para runtime",
      evidence: {
        source: "growth_opportunity_candidate",
        ...(candidate.evidence as JsonRecord),
        candidate_id: candidate.id,
        profile_snapshot: freshness.snapshot,
        candidate_profile_snapshot: candidate.profile_snapshot,
        success_metric: candidate.success_metric,
        evaluation_window: candidate.evaluation_window,
        total_score: candidate.total_score,
        blocking_reason: null,
      },
      source_refs: sourceRefs(candidate),
      idempotency_key: `candidate:${candidate.id}`,
      created_by: "growth_candidate_promotion",
    },
  };
}

interface SupabaseLike {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
}

export async function promoteGrowthOpportunityCandidates({
  supabase,
  accountId,
  websiteId,
  limit = 10,
  now = new Date(),
}: {
  supabase: SupabaseLike;
  accountId: string;
  websiteId: string;
  limit?: number;
  now?: Date;
}) {
  const { data: candidates, error: candidateError } = await supabase
    .from("growth_opportunity_candidates")
    .select("*")
    .eq("account_id", accountId)
    .eq("website_id", websiteId)
    .eq("status", "ready_for_backlog")
    .order("total_score", { ascending: false })
    .limit(limit);

  if (candidateError) throw new Error(candidateError.message);

  const results = [];
  for (const candidate of (candidates ?? []) as GrowthOpportunityCandidate[]) {
    const { data: profiles, error: profileError } = await supabase
      .from("growth_profiles")
      .select("*")
      .eq("account_id", accountId)
      .eq("website_id", websiteId)
      .eq("locale", candidate.locale)
      .eq("market", candidate.market);
    if (profileError) throw new Error(profileError.message);

    const decision = buildPromotedWorkItem(candidate, profiles ?? [], now);
    if (!decision.promoted || !decision.workItem) {
      await supabase
        .from("growth_opportunity_candidates")
        .update({
          status: "blocked",
          blocking_reason: decision.blockingReason,
          updated_at: now.toISOString(),
        })
        .eq("id", candidate.id)
        .eq("website_id", websiteId);
      results.push({ candidateId: candidate.id, promoted: false, reason: decision.blockingReason });
      continue;
    }

    const { data: workItemRows, error: workItemError } = await supabase
      .from("growth_work_items")
      .upsert(decision.workItem, { onConflict: "website_id,idempotency_key" })
      .select("id")
      .limit(1);
    if (workItemError) throw new Error(workItemError.message);
    const workItemId = Array.isArray(workItemRows) ? workItemRows[0]?.id : workItemRows?.id;

    await supabase
      .from("growth_opportunity_candidates")
      .update({
        status: "promoted",
        promoted_work_item_id: workItemId ?? null,
        updated_at: now.toISOString(),
      })
      .eq("id", candidate.id)
      .eq("website_id", websiteId);
    results.push({ candidateId: candidate.id, promoted: true, workItemId });
  }

  return results;
}
