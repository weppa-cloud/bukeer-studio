import { evaluateSkillReplayThreshold } from "@/lib/growth/autonomy/learning-summary";

describe("evaluateSkillReplayThreshold", () => {
  it("promotes replay cases and proposes skill updates at threshold", () => {
    const decision = evaluateSkillReplayThreshold({
      lane: "technical_remediation",
      replayCandidates: 3,
      recentRuns: 4,
      successRate: 0.5,
      blockedToolCalls: 1,
    });

    expect(decision.shouldPromoteReplay).toBe(true);
    expect(decision.shouldProposeSkillUpdate).toBe(true);
    expect(decision.reasons).toEqual(
      expect.arrayContaining([
        "replay_volume_ready",
        "success_rate_below_threshold",
        "blocked_tool_calls_present",
      ]),
    );
  });

  it("does not trigger below replay and quality thresholds", () => {
    const decision = evaluateSkillReplayThreshold({
      lane: "content_creator",
      replayCandidates: 1,
      recentRuns: 5,
      successRate: 0.9,
      blockedToolCalls: 0,
    });

    expect(decision.shouldPromoteReplay).toBe(false);
    expect(decision.shouldProposeSkillUpdate).toBe(false);
  });
});
