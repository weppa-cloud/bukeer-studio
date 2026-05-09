import type {
  GrowthWorkItemOutcome,
  GrowthWorkItemOutcomeStatus,
} from "@bukeer/website-contract";

import {
  asRecord,
  dateOnly,
  numberValue,
  type JsonRecord,
  type SupabaseLike,
} from "./runtime-common";

export interface OutcomeEvaluationInput {
  outcome: Pick<
    GrowthWorkItemOutcome,
    "success_metric" | "baseline" | "current_result" | "evaluation_date"
  >;
  signalFacts?: JsonRecord[];
  now?: Date;
  minRelativeLift?: number;
}

export interface OutcomeEvaluationDecision {
  status: Extract<GrowthWorkItemOutcomeStatus, "measuring" | "won" | "lost" | "inconclusive">;
  currentResult: JsonRecord;
  delta: number | null;
  relativeLift: number | null;
  reason: string;
}

export interface EvaluateDueGrowthOutcomesOptions {
  supabase: SupabaseLike;
  accountId: string;
  websiteId: string;
  limit?: number;
  dryRun?: boolean;
  now?: Date;
}

export interface EvaluateDueGrowthOutcomesResult {
  evaluated: Array<{ outcomeId: string; decision: OutcomeEvaluationDecision }>;
  updated: number;
  learningCandidates: number;
  dryRun: boolean;
}

function metricKeys(metric: string): string[] {
  const [base] = metric.split(":");
  return Array.from(new Set([metric, base, "value", "count", "clicks", "conversions"]));
}

function metricValue(record: JsonRecord, metric: string): number | null {
  for (const key of metricKeys(metric)) {
    const value = numberValue(record[key]);
    if (value !== null) return value;
  }
  return null;
}

function latestSignalMetric(signalFacts: JsonRecord[], metric: string): JsonRecord | null {
  for (const row of signalFacts) {
    const payload = asRecord(row.payload);
    const value = metricValue(payload, metric);
    if (value !== null) {
      return {
        value,
        signal_fact_id: row.id ?? null,
        observed_at: row.observed_at ?? null,
        source: row.source ?? null,
      };
    }
  }
  return null;
}

function terminalLearningStatus(status: OutcomeEvaluationDecision["status"]) {
  return status === "won" || status === "lost" || status === "inconclusive";
}

function keyPart(value: unknown): string {
  return String(value ?? "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

async function proposeLearningFromOutcome({
  supabase,
  accountId,
  websiteId,
  outcome,
  decision,
  now,
}: {
  supabase: SupabaseLike;
  accountId: string;
  websiteId: string;
  outcome: GrowthWorkItemOutcome;
  decision: OutcomeEvaluationDecision;
  now: Date;
}): Promise<number> {
  if (!terminalLearningStatus(decision.status)) return 0;

  const { data: workItemRows, error: workItemError } = await supabase
    .from("growth_work_items")
    .select("id,lane,title,allowed_action_class,evidence,run_id")
    .eq("account_id", accountId)
    .eq("website_id", websiteId)
    .eq("id", outcome.work_item_id)
    .limit(1);
  if (workItemError) {
    throw new Error(`outcome learning work item lookup failed: ${workItemError.message}`);
  }
  const workItem = Array.isArray(workItemRows) ? workItemRows[0] : workItemRows;
  const lane = typeof workItem?.lane === "string" ? workItem.lane : "orchestrator";
  const actionClass =
    typeof workItem?.allowed_action_class === "string"
      ? workItem.allowed_action_class
      : "observe";
  const memoryKey = `outcome_${decision.status}_${keyPart(lane)}_${keyPart(actionClass)}_${keyPart(outcome.success_metric)}`;
  const learningEvidence = {
    source: "growth_outcome_evaluator",
    outcome_id: outcome.id,
    work_item_id: outcome.work_item_id,
    publication_job_id: outcome.publication_job_id,
    status: decision.status,
    reason: decision.reason,
    delta: decision.delta,
    relative_lift: decision.relativeLift,
    action_class: actionClass,
    generated_at: now.toISOString(),
  };

  const memoryPayload = {
        account_id: accountId,
        website_id: websiteId,
        lane,
        memory_key: memoryKey,
        status: "draft",
        content: {
          fact:
            decision.status === "lost"
              ? `Avoid repeating ${actionClass} pattern for ${outcome.success_metric} without new evidence or a corrected skill.`
              : decision.status === "won"
                ? `Prioritize similar ${actionClass} patterns when freshness, caps, rollback and smoke remain valid.`
                : `Treat ${actionClass} pattern for ${outcome.success_metric} as inconclusive until better measurement exists.`,
          success_metric: outcome.success_metric,
          outcome_status: decision.status,
          influence:
            decision.status === "lost"
              ? "avoid_repeat_without_new_evidence"
              : decision.status === "won"
                ? "prioritize_similar_when_evidence_supports"
                : "require_better_measurement",
        },
        evidence: learningEvidence,
        source_run_id: typeof workItem?.run_id === "string" ? workItem.run_id : null,
        proposed_by: "growth_outcome_evaluator",
        updated_at: now.toISOString(),
      };
  const { data: existingMemory, error: existingMemoryError } = await supabase
    .from("growth_agent_memories")
    .select("id,status")
    .eq("account_id", accountId)
    .eq("website_id", websiteId)
    .eq("memory_key", memoryKey)
    .limit(1);
  if (existingMemoryError) {
    throw new Error(`outcome memory lookup failed: ${existingMemoryError.message}`);
  }
  const memoryRow = Array.isArray(existingMemory) ? existingMemory[0] : existingMemory;
  const memoryResult = memoryRow?.id
    ? await supabase
        .from("growth_agent_memories")
        .update(memoryPayload)
        .eq("id", memoryRow.id)
        .eq("website_id", websiteId)
        .select("id")
    : await supabase
        .from("growth_agent_memories")
        .insert(memoryPayload)
        .select("id");
  if (memoryResult.error) {
    throw new Error(`outcome memory proposal failed: ${memoryResult.error.message}`);
  }

  const expectedDecision =
    decision.status === "lost"
      ? "block"
      : decision.status === "won"
        ? "promote"
        : "watch";
  const replayPayload = {
        account_id: accountId,
        website_id: websiteId,
        lane,
        source_table: "growth_work_item_outcomes",
        source_id: outcome.id,
        run_id: null,
        expected_decision: expectedDecision,
        expected_allowed_action:
          decision.status === "lost" ? null : actionClass,
        rationale:
          decision.status === "lost"
            ? "Outcome regressed; next brain decision should avoid repeating this pattern unless new evidence exists."
            : `Outcome ${decision.status}; use as replay evidence for future ${actionClass} decisions.`,
        status: "candidate",
        evidence: learningEvidence,
        updated_at: now.toISOString(),
      };
  const { data: existingReplay, error: existingReplayError } = await supabase
    .from("growth_agent_replay_cases")
    .select("id,status")
    .eq("account_id", accountId)
    .eq("website_id", websiteId)
    .eq("lane", lane)
    .eq("source_table", "growth_work_item_outcomes")
    .eq("source_id", outcome.id)
    .eq("expected_decision", expectedDecision)
    .limit(1);
  if (existingReplayError) {
    throw new Error(`outcome replay lookup failed: ${existingReplayError.message}`);
  }
  const replayRow = Array.isArray(existingReplay) ? existingReplay[0] : existingReplay;
  const replayResult = replayRow?.id
    ? await supabase
        .from("growth_agent_replay_cases")
        .update(replayPayload)
        .eq("id", replayRow.id)
        .eq("website_id", websiteId)
        .select("id")
    : await supabase
        .from("growth_agent_replay_cases")
        .insert(replayPayload)
        .select("id");
  if (replayResult.error) {
    throw new Error(`outcome replay proposal failed: ${replayResult.error.message}`);
  }

  let created = 0;
  if ((Array.isArray(memoryResult.data) ? memoryResult.data[0] : memoryResult.data)?.id) {
    created += 1;
  }
  if ((Array.isArray(replayResult.data) ? replayResult.data[0] : replayResult.data)?.id) {
    created += 1;
  }
  if (decision.status === "won") {
    const skillKey = `scale_${keyPart(actionClass)}_${keyPart(outcome.success_metric)}`;
    const skillPayload = {
          account_id: accountId,
          website_id: websiteId,
          lane,
          skill_key: skillKey,
          version: 1,
          status: "draft",
          title: `Scale ${actionClass} when outcome is won`,
          instructions: {
            rule:
              "Use this pattern only when the same freshness, policy, caps, rollback and smoke evidence are present.",
            success_metric: outcome.success_metric,
            action_class: actionClass,
          },
          evidence: learningEvidence,
          source_run_id:
            typeof workItem?.run_id === "string" ? workItem.run_id : null,
          proposed_by: "growth_outcome_evaluator",
          updated_at: now.toISOString(),
        };
    const { data: existingSkill, error: existingSkillError } = await supabase
      .from("growth_agent_skills")
      .select("id,status")
      .eq("account_id", accountId)
      .eq("website_id", websiteId)
      .eq("skill_key", skillKey)
      .eq("version", 1)
      .limit(1);
    if (existingSkillError) {
      throw new Error(`outcome skill lookup failed: ${existingSkillError.message}`);
    }
    const skillRow = Array.isArray(existingSkill) ? existingSkill[0] : existingSkill;
    const skillResult = skillRow?.id
      ? await supabase
          .from("growth_agent_skills")
          .update(skillPayload)
          .eq("id", skillRow.id)
          .eq("website_id", websiteId)
          .select("id")
      : await supabase
          .from("growth_agent_skills")
          .insert(skillPayload)
          .select("id");
    if (skillResult.error) {
      throw new Error(`outcome skill proposal failed: ${skillResult.error.message}`);
    }
    if ((Array.isArray(skillResult.data) ? skillResult.data[0] : skillResult.data)?.id) {
      created += 1;
    }
  }
  return created;
}

export function evaluateGrowthOutcome(
  input: OutcomeEvaluationInput,
): OutcomeEvaluationDecision {
  const now = input.now ?? new Date();
  if (input.outcome.evaluation_date > dateOnly(now)) {
    return {
      status: "measuring",
      currentResult: asRecord(input.outcome.current_result),
      delta: null,
      relativeLift: null,
      reason: "evaluation_date_in_future",
    };
  }

  const baseline = asRecord(input.outcome.baseline);
  const current = asRecord(input.outcome.current_result);
  const signalCurrent = latestSignalMetric(
    input.signalFacts ?? [],
    input.outcome.success_metric,
  );
  const baselineValue = metricValue(baseline, input.outcome.success_metric);
  const currentValue =
    metricValue(current, input.outcome.success_metric) ??
    (typeof signalCurrent?.value === "number" ? signalCurrent.value : null);

  if (baselineValue === null || currentValue === null) {
    return {
      status: "inconclusive",
      currentResult: {
        ...current,
        signal: signalCurrent,
      },
      delta: null,
      relativeLift: null,
      reason: "missing_numeric_baseline_or_current",
    };
  }

  const delta = currentValue - baselineValue;
  const relativeLift =
    baselineValue === 0 ? (currentValue > 0 ? 1 : 0) : delta / Math.abs(baselineValue);
  const threshold = input.minRelativeLift ?? 0.05;
  const status = relativeLift >= threshold ? "won" : delta < 0 ? "lost" : "inconclusive";

  return {
    status,
    currentResult: {
      ...current,
      value: currentValue,
      baseline_value: baselineValue,
      signal: signalCurrent,
    },
    delta,
    relativeLift,
    reason:
      status === "won"
        ? "metric_lift_above_threshold"
        : status === "lost"
          ? "metric_regressed"
          : "metric_lift_below_threshold",
  };
}

export function classifyGrowthOutcome(input: {
  outcome: Pick<GrowthWorkItemOutcome, "success_metric" | "baseline">;
  snapshot: { value: number | null; baselineValue: number | null };
}) {
  const baselineValue = input.snapshot.baselineValue;
  const currentValue = input.snapshot.value;
  if (baselineValue === null || currentValue === null) {
    return {
      status: "inconclusive" as const,
      confidence: 0.35,
      currentResult: { baseline: baselineValue, current: currentValue },
    };
  }
  const delta = currentValue - baselineValue;
  const relativeLift =
    baselineValue === 0 ? (currentValue > 0 ? 1 : 0) : delta / Math.abs(baselineValue);
  return {
    status:
      relativeLift >= 0.35
        ? ("scale" as const)
        : relativeLift >= 0.1
          ? ("won" as const)
          : relativeLift <= -0.2
            ? ("stop" as const)
            : delta < 0
              ? ("lost" as const)
              : ("inconclusive" as const),
    confidence: Math.min(0.95, Math.max(0.5, Math.abs(relativeLift) + 0.55)),
    currentResult: { baseline: baselineValue, current: currentValue, delta, relativeLift },
  };
}

export async function evaluateDueGrowthOutcomes(
  input: EvaluateDueGrowthOutcomesOptions,
): Promise<EvaluateDueGrowthOutcomesResult> {
  const now = input.now ?? new Date();
  const { data: outcomes, error: outcomeError } = await input.supabase
    .from("growth_work_item_outcomes")
    .select("*")
    .eq("account_id", input.accountId)
    .eq("website_id", input.websiteId)
    .in("status", ["scheduled", "measuring"])
    .lte("evaluation_date", dateOnly(now))
    .order("evaluation_date", { ascending: true })
    .limit(input.limit ?? 50);
  if (outcomeError) throw new Error(`outcome lookup failed: ${outcomeError.message}`);

  const { data: signalRows, error: signalError } = await input.supabase
    .from("growth_signal_facts")
    .select("*")
    .eq("account_id", input.accountId)
    .eq("website_id", input.websiteId)
    .order("observed_at", { ascending: false })
    .limit(500);
  if (signalError) throw new Error(`outcome signal lookup failed: ${signalError.message}`);

  const evaluated = [];
  let learningCandidates = 0;
  for (const outcome of (outcomes ?? []) as GrowthWorkItemOutcome[]) {
    const decision = evaluateGrowthOutcome({
      outcome,
      signalFacts: signalRows ?? [],
      now,
    });
    evaluated.push({ outcomeId: outcome.id, decision });
    if (!input.dryRun) {
      const { error } = await input.supabase
        .from("growth_work_item_outcomes")
        .update({
          status: decision.status,
          current_result: decision.currentResult,
          evaluated_at: now.toISOString(),
          attribution_evidence: {
            evaluator: "growth_runtime_outcome_evaluator_v1",
            reason: decision.reason,
            delta: decision.delta,
            relative_lift: decision.relativeLift,
          },
          updated_at: now.toISOString(),
        })
        .eq("id", outcome.id)
        .eq("website_id", input.websiteId);
      if (error) throw new Error(`outcome update failed: ${error.message}`);
      learningCandidates += await proposeLearningFromOutcome({
        supabase: input.supabase,
        accountId: input.accountId,
        websiteId: input.websiteId,
        outcome,
        decision,
        now,
      });
    }
  }

  return {
    evaluated,
    updated: input.dryRun ? 0 : evaluated.length,
    learningCandidates,
    dryRun: input.dryRun ?? false,
  };
}
