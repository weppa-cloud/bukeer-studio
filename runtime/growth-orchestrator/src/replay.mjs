export function buildReplaySeed(run, output) {
  const seed = output?.replay_seed ?? {};
  return {
    eligible: Boolean(seed.eligible),
    expected_decision: String(seed.expected_decision ?? "review_required"),
    rationale:
      String(seed.rationale ?? "").trim() ||
      "Replay case candidate requires Curator approval before becoming an eval baseline.",
    source_table: run?.source_table ?? null,
    source_id: run?.source_id ?? null,
    lane: run?.lane ?? null,
    decision: output?.decision ?? "review_required",
    allowed_action: output?.allowed_action ?? "prepare_for_human",
  };
}
