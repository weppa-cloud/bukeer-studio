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
    }
  }

  return {
    evaluated,
    updated: input.dryRun ? 0 : evaluated.length,
    dryRun: input.dryRun ?? false,
  };
}
