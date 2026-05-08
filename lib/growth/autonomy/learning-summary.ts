import type { AgentLane } from "@bukeer/website-contract";

import {
  summarizeGrowthAgentOptimization,
  summarizeGrowthAgentOptimizationFromRows,
  type AgentOptimizationLaneSummary,
} from "./agent-optimization";
import type { JsonRecord, SupabaseLike } from "./runtime-common";

export interface SkillReplayThresholdInput {
  lane: AgentLane;
  replayCandidates: number;
  recentRuns: number;
  successRate: number;
  blockedToolCalls?: number;
  minReplayCases?: number;
  minRecentRuns?: number;
  minSuccessRate?: number;
}

export interface SkillReplayThresholdDecision {
  lane: AgentLane;
  shouldPromoteReplay: boolean;
  shouldProposeSkillUpdate: boolean;
  reasons: string[];
}

export function evaluateSkillReplayThreshold(
  input: SkillReplayThresholdInput,
): SkillReplayThresholdDecision {
  const minReplayCases = input.minReplayCases ?? 3;
  const minRecentRuns = input.minRecentRuns ?? 3;
  const minSuccessRate = input.minSuccessRate ?? 0.7;
  const reasons: string[] = [];

  if (input.replayCandidates >= minReplayCases) reasons.push("replay_volume_ready");
  if (input.recentRuns >= minRecentRuns && input.successRate < minSuccessRate) {
    reasons.push("success_rate_below_threshold");
  }
  if ((input.blockedToolCalls ?? 0) > 0) reasons.push("blocked_tool_calls_present");

  return {
    lane: input.lane,
    shouldPromoteReplay: reasons.includes("replay_volume_ready"),
    shouldProposeSkillUpdate:
      reasons.includes("success_rate_below_threshold") ||
      reasons.includes("blocked_tool_calls_present"),
    reasons,
  };
}

export function buildGrowthRuntimeLearningSummaryFromRows(rows: {
  runs: JsonRecord[];
  metrics: JsonRecord[];
  toolCalls: JsonRecord[];
  skills: JsonRecord[];
  replayCases: JsonRecord[];
}) {
  const lanes = summarizeGrowthAgentOptimizationFromRows(rows);
  return enrichLaneSummaries(lanes);
}

function enrichLaneSummaries(lanes: AgentOptimizationLaneSummary[]) {
  const replayDecisions = lanes.map((lane) =>
    evaluateSkillReplayThreshold({
      lane: lane.lane,
      replayCandidates: lane.replayCandidates,
      recentRuns: lane.runs,
      successRate: lane.successRate,
      blockedToolCalls: lane.blockedToolCalls,
    }),
  );

  return {
    lanes,
    replayDecisions,
    recommendations: Array.from(
      new Set(lanes.flatMap((lane) => lane.recommendations)),
    ),
  };
}

export async function buildGrowthRuntimeLearningSummary({
  supabase,
  accountId,
  websiteId,
}: {
  supabase: SupabaseLike;
  accountId: string;
  websiteId: string;
}) {
  const lanes = await summarizeGrowthAgentOptimization({
    supabase,
    accountId,
    websiteId,
  });
  return enrichLaneSummaries(lanes);
}
