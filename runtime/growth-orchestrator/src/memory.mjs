export function normalizeMemoryCandidate(candidate, fallbackLane) {
  const lane = String(candidate?.lane ?? fallbackLane ?? "").trim();
  const memory = String(candidate?.memory ?? "").trim();
  const reason = String(candidate?.reason ?? "").trim();
  const confidence = Math.max(
    0,
    Math.min(1, Number(candidate?.confidence ?? 0)),
  );

  if (!lane || !memory || !reason) return null;
  return {
    lane,
    memory,
    reason,
    confidence,
    status: "candidate",
  };
}

export function normalizeMemoryCandidates(
  candidates = [],
  fallbackLane = null,
) {
  return candidates
    .slice(0, 10)
    .map((candidate) => normalizeMemoryCandidate(candidate, fallbackLane))
    .filter(Boolean);
}
