import "server-only";

import type {
  AgentLane,
  GrowthEffectivenessExperiment,
  GrowthEffectivenessExperimentInsert,
  GrowthEffectivenessObservation,
  GrowthEffectivenessObservationInsert,
  GrowthEffectivenessSourceGroup,
} from "@bukeer/website-contract";
import {
  GrowthEffectivenessExperimentInsertSchema,
  GrowthEffectivenessObservationInsertSchema,
} from "@bukeer/website-contract";

import {
  scoreGrowthEffectivenessExperiment,
  type EffectivenessScorecard,
} from "./scorecard";

type QueryableSupabase = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
};

const MISSING_TABLE_CODES = new Set(["42P01", "PGRST205", "PGRST204"]);

function isMissingTable(error: { code?: string | null; message?: string | null } | null) {
  if (!error) return false;
  if (MISSING_TABLE_CODES.has(error.code ?? "")) return true;
  return (error.message ?? "").toLowerCase().includes("does not exist");
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

async function tableCount(
  supabase: QueryableSupabase,
  tableName: string,
  accountId: string,
  websiteId: string,
  filters: Record<string, string | string[]> = {},
): Promise<number> {
  let query = supabase
    .from(tableName)
    .select("id", { count: "exact", head: true })
    .eq("account_id", accountId)
    .eq("website_id", websiteId);

  for (const [key, value] of Object.entries(filters)) {
    if (Array.isArray(value)) {
      query = query.in(key, value);
    } else {
      query = query.eq(key, value);
    }
  }

  const { count, error } = await query;
  if (error) {
    if (isMissingTable(error)) return 0;
    throw new Error(`${tableName} count failed: ${error.message}`);
  }
  return count ?? 0;
}

export async function buildGrowthEffectivenessEvidenceSnapshot({
  supabase,
  accountId,
  websiteId,
}: {
  supabase: QueryableSupabase;
  accountId: string;
  websiteId: string;
}) {
  const [
    profileRuns,
    freshProfileRuns,
    candidatesReady,
    workItemsReady,
    publicationJobs,
    smokePassedJobs,
    outcomes,
    decisions,
    artifacts,
  ] = await Promise.all([
    tableCount(supabase, "growth_profile_runs", accountId, websiteId),
    tableCount(supabase, "growth_profile_runs", accountId, websiteId, {
      freshness_status: "fresh",
      run_status: "completed",
    }),
    tableCount(supabase, "growth_opportunity_candidates", accountId, websiteId, {
      status: "ready_for_backlog",
    }),
    tableCount(supabase, "growth_work_items", accountId, websiteId, {
      status: "ready",
    }),
    tableCount(supabase, "growth_publication_jobs", accountId, websiteId),
    tableCount(supabase, "growth_publication_jobs", accountId, websiteId, {
      status: "smoke_passed",
    }),
    tableCount(supabase, "growth_work_item_outcomes", accountId, websiteId),
    tableCount(supabase, "growth_orchestrator_decisions", accountId, websiteId),
    tableCount(supabase, "growth_agent_artifacts", accountId, websiteId),
  ]);

  return {
    captured_at: new Date().toISOString(),
    sources: {
      profile_runs: profileRuns,
      fresh_profile_runs: freshProfileRuns,
      ready_candidates: candidatesReady,
      ready_work_items: workItemsReady,
      publication_jobs: publicationJobs,
      smoke_passed_jobs: smokePassedJobs,
      outcomes,
      orchestrator_decisions: decisions,
      agent_artifacts: artifacts,
    },
  };
}

export function defaultGrowthEffectivenessSuccessCriteria() {
  return {
    speed_improvement_vs_human_min: 0.3,
    hermes_quality_improvement_vs_deterministic_min: 0.2,
    duplicate_noise_reduction_vs_deterministic_min: 0.25,
    safety_violations_max: 0,
    public_mutation_boundary: "growth_os_executor_only",
    final_seo_windows: ["day_21", "day_45"],
  };
}

export async function upsertGrowthEffectivenessExperiment({
  supabase,
  input,
}: {
  supabase: QueryableSupabase;
  input: GrowthEffectivenessExperimentInsert;
}): Promise<GrowthEffectivenessExperiment> {
  const parsed = GrowthEffectivenessExperimentInsertSchema.parse(input);
  const { data, error } = await supabase
    .from("growth_effectiveness_experiments")
    .upsert(parsed, { onConflict: "website_id,experiment_key" })
    .select("*")
    .limit(1);
  if (error) throw new Error(`effectiveness experiment upsert failed: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.id) throw new Error("effectiveness experiment upsert returned no row");
  return row as GrowthEffectivenessExperiment;
}

export async function upsertGrowthEffectivenessObservation({
  supabase,
  input,
}: {
  supabase: QueryableSupabase;
  input: GrowthEffectivenessObservationInsert;
}): Promise<GrowthEffectivenessObservation> {
  const parsed = GrowthEffectivenessObservationInsertSchema.parse(input);
  const { data, error } = await supabase
    .from("growth_effectiveness_observations")
    .upsert(parsed, { onConflict: "website_id,experiment_id,idempotency_key" })
    .select("*")
    .limit(1);
  if (error) throw new Error(`effectiveness observation upsert failed: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.id) throw new Error("effectiveness observation upsert returned no row");
  return row as GrowthEffectivenessObservation;
}

export interface GrowthEffectivenessBenchmark {
  experiments: GrowthEffectivenessExperiment[];
  observations: GrowthEffectivenessObservation[];
  scorecards: Record<string, EffectivenessScorecard>;
  missingTables: string[];
}

export async function getGrowthEffectivenessBenchmark({
  supabase,
  accountId,
  websiteId,
}: {
  supabase: QueryableSupabase;
  accountId: string;
  websiteId: string;
}): Promise<GrowthEffectivenessBenchmark> {
  const experimentsResult = await supabase
    .from("growth_effectiveness_experiments")
    .select("*")
    .eq("account_id", accountId)
    .eq("website_id", websiteId)
    .order("updated_at", { ascending: false })
    .limit(12);

  if (experimentsResult.error) {
    if (isMissingTable(experimentsResult.error)) {
      return { experiments: [], observations: [], scorecards: {}, missingTables: ["growth_effectiveness_experiments"] };
    }
    throw new Error(
      `effectiveness experiment query failed: ${experimentsResult.error.message}`,
    );
  }

  const experiments = (experimentsResult.data ?? []) as GrowthEffectivenessExperiment[];
  if (experiments.length === 0) {
    return { experiments: [], observations: [], scorecards: {}, missingTables: [] };
  }

  const observationsResult = await supabase
    .from("growth_effectiveness_observations")
    .select("*")
    .eq("account_id", accountId)
    .eq("website_id", websiteId)
    .in(
      "experiment_id",
      experiments.map((experiment) => experiment.id),
    )
    .order("updated_at", { ascending: false });

  if (observationsResult.error) {
    if (isMissingTable(observationsResult.error)) {
      return { experiments, observations: [], scorecards: {}, missingTables: ["growth_effectiveness_observations"] };
    }
    throw new Error(
      `effectiveness observation query failed: ${observationsResult.error.message}`,
    );
  }

  const observations = (observationsResult.data ?? []) as GrowthEffectivenessObservation[];
  const scorecards: Record<string, EffectivenessScorecard> = {};
  for (const experiment of experiments) {
    const experimentObservations = observations.filter(
      (row) => row.experiment_id === experiment.id,
    );
    scorecards[experiment.id] = scoreGrowthEffectivenessExperiment(
      experimentObservations.map((row) => ({
        sourceGroup: row.source_group as GrowthEffectivenessSourceGroup,
        lane: row.lane as AgentLane,
        status: row.status,
        metrics: asRecord(row.metrics),
        timing: asRecord(row.timing),
        cost: asRecord(row.cost),
        qualityVerdict: asRecord(row.quality_verdict),
        safetyVerdict: asRecord(row.safety_verdict),
      })),
    );
  }

  return {
    experiments,
    observations,
    scorecards,
    missingTables: [],
  };
}
