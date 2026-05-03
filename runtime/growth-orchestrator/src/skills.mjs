export const CANONICAL_SKILL_LANES = [
  "orchestrator",
  "technical_remediation",
  "transcreation",
  "content_creator",
  "content_curator",
];

export function normalizeSkillUpdateCandidate(candidate, fallbackLane) {
  const lane = String(candidate?.lane ?? fallbackLane ?? "").trim();
  const skillName = String(candidate?.skill_name ?? "").trim();
  const change = String(candidate?.change ?? "").trim();
  const reason = String(candidate?.reason ?? "").trim();

  if (!lane || !skillName || !change) return null;
  return {
    lane,
    skill_name: skillName,
    change,
    reason,
    status: "candidate",
  };
}

export function normalizeSkillUpdateCandidates(
  candidates = [],
  fallbackLane = null,
) {
  return candidates
    .slice(0, 10)
    .map((candidate) => normalizeSkillUpdateCandidate(candidate, fallbackLane))
    .filter(Boolean);
}

export function skillInstructions(candidate) {
  return {
    change: candidate.change,
    reason: candidate.reason,
  };
}
