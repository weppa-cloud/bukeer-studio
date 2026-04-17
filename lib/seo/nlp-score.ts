import type { SerpSnapshotResult } from '@/lib/seo/serp-snapshot';

export type NlpScoreResult = {
  entityCoverage: {
    matched: number;
    total: number;
    pct: number;
    missing: string[];
  };
  wordCountVs: {
    current: number;
    top10Avg: number;
    delta: number;
  };
  keywordDensity: {
    keyword: string;
    occurrences: number;
    pct: number;
  };
  readabilityScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
};

function tokenize(content: string): string[] {
  return content
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .map((token) => token.trim())
    .filter(Boolean);
}

function countPhraseOccurrences(content: string, phrase: string): number {
  const needle = phrase.trim().toLowerCase();
  if (!needle) return 0;

  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escaped}\\b`, 'giu');
  const matches = content.toLowerCase().match(regex);
  return matches?.length ?? 0;
}

function countSyllables(word: string): number {
  const cleaned = word.toLowerCase().replace(/[^a-záéíóúüñ]/g, '');
  if (!cleaned) return 0;

  const vowelGroups = cleaned.match(/[aeiouáéíóúü]+/g);
  const count = vowelGroups?.length ?? 1;
  return Math.max(1, count);
}

function computeReadability(content: string): number {
  const sentences = content.split(/[.!?]+/).map((segment) => segment.trim()).filter(Boolean);
  const words = tokenize(content);
  const syllables = words.reduce((acc, word) => acc + countSyllables(word), 0);

  if (words.length === 0 || sentences.length === 0) return 0;

  // Flesch Reading Ease approximation (multilingual-friendly baseline)
  const score = 206.835 - 1.015 * (words.length / sentences.length) - 84.6 * (syllables / words.length);
  const clamped = Math.max(0, Math.min(100, score));
  return Number(clamped.toFixed(2));
}

function gradeFromNumeric(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

function computeDensityScore(densityPct: number): number {
  if (densityPct >= 0.8 && densityPct <= 2.5) return 100;
  if (densityPct >= 0.5 && densityPct <= 3.5) return 80;
  if (densityPct >= 0.2 && densityPct <= 5) return 60;
  return 35;
}

function computeWordCountScore(current: number, top10Avg: number): number {
  if (top10Avg <= 0) return 65;
  const ratio = current / top10Avg;
  if (ratio >= 0.85 && ratio <= 1.2) return 100;
  if (ratio >= 0.65 && ratio <= 1.45) return 80;
  if (ratio >= 0.45 && ratio <= 1.8) return 60;
  return 35;
}

export function buildNlpScore(input: {
  keyword: string;
  content: string;
  snapshot: SerpSnapshotResult;
}): NlpScoreResult {
  const normalizedContent = input.content.trim();
  const words = tokenize(normalizedContent);
  const currentWordCount = words.length;

  const top10WordCounts = input.snapshot.top10
    .map((row) => Number(row.wordCount ?? 0))
    .filter((value) => Number.isFinite(value) && value > 0);
  const top10Avg = top10WordCounts.length
    ? Math.round(top10WordCounts.reduce((sum, value) => sum + value, 0) / top10WordCounts.length)
    : 0;

  const keywordOccurrences = countPhraseOccurrences(normalizedContent, input.keyword);
  const keywordDensityPct = currentWordCount > 0
    ? Number(((keywordOccurrences / currentWordCount) * 100).toFixed(2))
    : 0;

  const normalizedEntities = Array.from(
    new Set(
      input.snapshot.entities
        .map((entity) => entity.trim())
        .filter(Boolean)
        .map((entity) => entity.toLowerCase()),
    ),
  );

  const matchedEntities = normalizedEntities.filter((entity) => normalizedContent.toLowerCase().includes(entity));
  const missingEntities = normalizedEntities.filter((entity) => !matchedEntities.includes(entity));

  const entityPct = normalizedEntities.length > 0
    ? Number(((matchedEntities.length / normalizedEntities.length) * 100).toFixed(2))
    : 0;

  const readability = computeReadability(normalizedContent);
  const densityScore = computeDensityScore(keywordDensityPct);
  const wordCountScore = computeWordCountScore(currentWordCount, top10Avg);

  const weightedScore =
    entityPct * 0.4 +
    wordCountScore * 0.25 +
    densityScore * 0.2 +
    readability * 0.15;

  return {
    entityCoverage: {
      matched: matchedEntities.length,
      total: normalizedEntities.length || 1,
      pct: entityPct,
      missing: missingEntities.slice(0, 30),
    },
    wordCountVs: {
      current: currentWordCount,
      top10Avg,
      delta: currentWordCount - top10Avg,
    },
    keywordDensity: {
      keyword: input.keyword,
      occurrences: keywordOccurrences,
      pct: keywordDensityPct,
    },
    readabilityScore: readability,
    grade: gradeFromNumeric(Number(weightedScore.toFixed(2))),
  };
}
