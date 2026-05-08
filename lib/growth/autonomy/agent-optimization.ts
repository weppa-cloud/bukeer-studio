import type { AgentLane } from "@bukeer/website-contract";

type JsonRecord = Record<string, unknown>;

export interface AgentOptimizationLaneSummary {
  lane: AgentLane;
  runs: number;
  completedRuns: number;
  failedRuns: number;
  successRate: number;
  toolCalls: number;
  blockedToolCalls: number;
  activeSkills: number;
  draftSkills: number;
  replayCandidates: number;
  costUsd: number;
  recommendations: string[];
}

const LANES: AgentLane[] = [
  "orchestrator",
  "technical_remediation",
  "transcreation",
  "content_creator",
  "content_curator",
];

function laneRows(rows: JsonRecord[], lane: AgentLane): JsonRecord[] {
  return rows.filter((row) => row.lane === lane || row.agent_lane === lane);
}

function numberValue(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function summarizeGrowthAgentOptimizationFromRows({
  runs,
  metrics,
  toolCalls,
  skills,
  replayCases,
}: {
  runs: JsonRecord[];
  metrics: JsonRecord[];
  toolCalls: JsonRecord[];
  skills: JsonRecord[];
  replayCases: JsonRecord[];
}): AgentOptimizationLaneSummary[] {
  return LANES.map((lane) => {
    const laneRunRows = laneRows(runs, lane);
    const laneMetricRows = laneRows(metrics, lane);
    const laneToolRows = laneRows(toolCalls, lane);
    const laneSkills = laneRows(skills, lane);
    const laneReplay = laneRows(replayCases, lane);
    const completedRuns = laneRunRows.filter((row) =>
      ["completed", "review_required"].includes(String(row.status)),
    ).length;
    const failedRuns = laneRunRows.filter((row) =>
      ["failed", "stalled"].includes(String(row.status)),
    ).length;
    const blockedToolCalls = laneToolRows.filter(
      (row) => row.allowed === false || row.result_status === "blocked",
    ).length;
    const activeSkills = laneSkills.filter((row) => row.status === "active").length;
    const draftSkills = laneSkills.filter((row) => row.status === "draft").length;
    const costUsd = laneMetricRows.reduce(
      (sum, row) => sum + numberValue(row.cost_usd),
      0,
    );
    const successRate =
      laneRunRows.length === 0 ? 0 : completedRuns / laneRunRows.length;
    const recommendations: string[] = [];
    if (blockedToolCalls > 0) recommendations.push("review_blocked_tools");
    if (draftSkills >= 3) recommendations.push("review_draft_skills");
    if (laneReplay.length >= 3) recommendations.push("promote_replay_cases");
    if (laneRunRows.length >= 3 && successRate < 0.7) {
      recommendations.push("lower_autonomy_or_update_skill");
    }
    if (costUsd > 10) recommendations.push("review_cost_cap");

    return {
      lane,
      runs: laneRunRows.length,
      completedRuns,
      failedRuns,
      successRate,
      toolCalls: laneToolRows.length,
      blockedToolCalls,
      activeSkills,
      draftSkills,
      replayCandidates: laneReplay.filter((row) => row.status === "candidate")
        .length,
      costUsd,
      recommendations,
    };
  });
}

interface SupabaseLike {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
}

async function selectRows(
  supabase: SupabaseLike,
  table: string,
  accountId: string,
  websiteId: string,
) {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("account_id", accountId)
    .eq("website_id", websiteId)
    .limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []) as JsonRecord[];
}

export async function summarizeGrowthAgentOptimization({
  supabase,
  accountId,
  websiteId,
}: {
  supabase: SupabaseLike;
  accountId: string;
  websiteId: string;
}) {
  const [runs, metrics, toolCalls, skills, replayCases] = await Promise.all([
    selectRows(supabase, "growth_agent_runs", accountId, websiteId),
    selectRows(supabase, "growth_agent_run_metrics", accountId, websiteId),
    selectRows(supabase, "growth_agent_tool_calls", accountId, websiteId),
    selectRows(supabase, "growth_agent_skills", accountId, websiteId),
    selectRows(supabase, "growth_agent_replay_cases", accountId, websiteId),
  ]);

  return summarizeGrowthAgentOptimizationFromRows({
    runs,
    metrics,
    toolCalls,
    skills,
    replayCases,
  });
}
