export type Seo360GateStatus = "pass" | "hold";
export type Seo360JsonRecord = Record<string, unknown>;
export type Seo360ImageVerdict = "PASS" | "FAIL" | "UNKNOWN";

export type Seo360ScoreDimension =
  | "words"
  | "images"
  | "paragraph_header_structure"
  | "table_faq_toc"
  | "internal_links"
  | "semantic_entity_coverage"
  | "eeat_trust"
  | "freshness"
  | "ux"
  | "helpful_content_alignment";

export const SEO360_SCORE_DIMENSIONS: Seo360ScoreDimension[] = [
  "words",
  "images",
  "paragraph_header_structure",
  "table_faq_toc",
  "internal_links",
  "semantic_entity_coverage",
  "eeat_trust",
  "freshness",
  "ux",
  "helpful_content_alignment",
];

export interface Seo360Scorecard {
  total: number;
  dimensions: Partial<Record<Seo360ScoreDimension, number>>;
  evidence?: Seo360JsonRecord;
}

export interface Seo360PeerCompetitor {
  url: string;
  rank: number;
  source: "dataforseo_serp" | string;
  targetKeyword: string;
  targetMarket: string;
  editorial: boolean;
  scorecard: Seo360Scorecard;
}

export interface Seo360PeerBenchmark {
  targetKeyword?: string | null;
  targetMarket?: string | null;
  selectedFrom?: "dataforseo_serp" | string | null;
  selectionMethod?: "top4_editorial_exact_keyword_market" | string | null;
  competitors: Seo360PeerCompetitor[];
  scoringMode?: "peer_superiority" | "average_only" | string | null;
  preservesWriterStyle?: boolean | null;
}

export interface Seo360ImageSemanticEvidence {
  url: string;
  sourceRefs: string[];
  provenance?: string | null;
  sectionPlacement?: string | null;
  destination?: string | null;
  alt?: string | null;
  caption?: string | null;
  semanticVerdict: Seo360ImageVerdict;
  provenanceVerdict: Seo360ImageVerdict;
  sectionMatchVerdict: Seo360ImageVerdict;
  altCaptionVerdict: Seo360ImageVerdict;
  visualConsistencyVerdict?: Seo360ImageVerdict | null;
}

export interface Seo360BenchmarkGateInput {
  targetKeyword?: string | null;
  targetMarket?: string | null;
  colombiaTours: Seo360Scorecard;
  peerBenchmark?: Seo360PeerBenchmark | null;
  images?: Seo360ImageSemanticEvidence[];
  requiredImageCount?: number;
}

export interface Seo360BenchmarkGateDecision {
  status: Seo360GateStatus;
  passed: boolean;
  reasons: string[];
  peerMaxScore: number | null;
  colombiaToursScore: number;
}

function normalized(value: string | null | undefined): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function isSanAndresMarket(value: string): boolean {
  return value.includes("san andres");
}

function validUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function missingScoreDimensions(scorecard: Seo360Scorecard): Seo360ScoreDimension[] {
  const dimensions = scorecard.dimensions ?? {};
  return SEO360_SCORE_DIMENSIONS.filter(
    (dimension) => typeof dimensions[dimension] !== "number" || !Number.isFinite(dimensions[dimension]),
  );
}

function imagePasses(image: Seo360ImageSemanticEvidence): boolean {
  return (
    validUrl(image.url) &&
    image.sourceRefs.length > 0 &&
    Boolean(image.sectionPlacement?.trim()) &&
    Boolean(image.alt?.trim()) &&
    Boolean(image.caption?.trim()) &&
    image.semanticVerdict === "PASS" &&
    image.provenanceVerdict === "PASS" &&
    image.sectionMatchVerdict === "PASS" &&
    image.altCaptionVerdict === "PASS" &&
    (image.visualConsistencyVerdict == null || image.visualConsistencyVerdict === "PASS")
  );
}

export function evaluateSeo360BenchmarkGate(
  input: Seo360BenchmarkGateInput,
): Seo360BenchmarkGateDecision {
  const reasons: string[] = [];
  const targetKeyword = normalized(input.targetKeyword);
  const targetMarket = normalized(input.targetMarket);
  const benchmark = input.peerBenchmark;

  if (!targetKeyword) reasons.push("seo360_missing_target_keyword");
  if (!targetMarket) reasons.push("seo360_missing_target_market");

  const colombiaMissing = missingScoreDimensions(input.colombiaTours);
  if (!Number.isFinite(input.colombiaTours.total)) {
    reasons.push("seo360_missing_colombiatours_total_score");
  }
  if (colombiaMissing.length > 0) {
    reasons.push(`seo360_missing_colombiatours_dimensions:${colombiaMissing.join(",")}`);
  }

  if (!benchmark) {
    reasons.push("seo360_missing_peer_benchmark");
  }

  if (benchmark) {
    if (normalized(benchmark.targetKeyword) !== targetKeyword) {
      reasons.push("seo360_peer_benchmark_keyword_mismatch");
    }
    if (normalized(benchmark.targetMarket) !== targetMarket) {
      reasons.push("seo360_peer_benchmark_market_mismatch");
    }
    if (benchmark.selectedFrom !== "dataforseo_serp") {
      reasons.push("seo360_peer_benchmark_not_dataforseo_serp");
    }
    if (benchmark.selectionMethod !== "top4_editorial_exact_keyword_market") {
      reasons.push("seo360_peer_benchmark_not_top4_editorial_exact_keyword_market");
    }
    if (benchmark.scoringMode === "average_only") {
      reasons.push("seo360_peer_benchmark_average_only_hold");
    }
    if (benchmark.preservesWriterStyle !== true) {
      reasons.push("seo360_writer_style_preservation_missing");
    }

    const competitors = benchmark.competitors ?? [];
    if (competitors.length !== 4) {
      reasons.push(`seo360_peer_benchmark_requires_exactly_4_competitors:${competitors.length}`);
    }

    const seenUrls = new Set<string>();
    competitors.forEach((competitor, index) => {
      const prefix = `seo360_peer_${index + 1}`;
      if (!validUrl(competitor.url)) reasons.push(`${prefix}_invalid_url`);
      if (seenUrls.has(competitor.url)) reasons.push(`${prefix}_duplicate_url`);
      seenUrls.add(competitor.url);
      if (competitor.source !== "dataforseo_serp") reasons.push(`${prefix}_not_dataforseo_serp`);
      if (competitor.editorial !== true) reasons.push(`${prefix}_not_editorial`);
      if (!Number.isInteger(competitor.rank) || competitor.rank < 1) reasons.push(`${prefix}_invalid_rank`);
      if (normalized(competitor.targetKeyword) !== targetKeyword) reasons.push(`${prefix}_keyword_mismatch`);
      if (normalized(competitor.targetMarket) !== targetMarket) reasons.push(`${prefix}_market_mismatch`);
      if (!Number.isFinite(competitor.scorecard.total)) reasons.push(`${prefix}_missing_total_score`);
      const missing = missingScoreDimensions(competitor.scorecard);
      if (missing.length > 0) reasons.push(`${prefix}_missing_dimensions:${missing.join(",")}`);
    });
  }

  const peerScores = (benchmark?.competitors ?? [])
    .map((competitor) => competitor.scorecard.total)
    .filter((score) => Number.isFinite(score));
  const peerMaxScore = peerScores.length === 4 ? Math.max(...peerScores) : null;
  if (peerMaxScore !== null && input.colombiaTours.total <= peerMaxScore) {
    reasons.push("seo360_colombiatours_not_above_top4_peer_set");
  }

  const requiredImageCount = Math.max(
    input.requiredImageCount ?? 0,
    isSanAndresMarket(targetMarket) ? 4 : 0,
  );
  const images = input.images ?? [];
  if (images.length < requiredImageCount) {
    reasons.push(`seo360_image_semantic_validation_requires_${requiredImageCount}_images:${images.length}`);
  }
  images.forEach((image, index) => {
    if (!imagePasses(image)) {
      reasons.push(`seo360_image_${index + 1}_semantic_validation_hold`);
    }
  });

  return {
    status: reasons.length === 0 ? "pass" : "hold",
    passed: reasons.length === 0,
    reasons,
    peerMaxScore,
    colombiaToursScore: input.colombiaTours.total,
  };
}
