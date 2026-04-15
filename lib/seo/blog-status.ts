export type BlogEditorialStatus = 'keeper' | 'optimize' | 'prune';

export function resolveBlogStatus(score: number): BlogEditorialStatus {
  const safeScore = Math.max(0, Math.min(100, score));
  if (safeScore >= 70) return 'keeper';
  if (safeScore >= 40) return 'optimize';
  return 'prune';
}

