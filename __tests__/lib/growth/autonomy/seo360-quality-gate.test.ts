import {
  evaluateSeo360BenchmarkGate,
  SEO360_SCORE_DIMENSIONS,
  type Seo360BenchmarkGateInput,
  type Seo360ImageSemanticEvidence,
  type Seo360Scorecard,
} from "@/lib/growth/autonomy/seo360-quality-gate";
import { Seo360BenchmarkContractSchema } from "@bukeer/website-contract";

function score(total: number): Seo360Scorecard {
  return {
    total,
    dimensions: Object.fromEntries(
      SEO360_SCORE_DIMENSIONS.map((dimension) => [dimension, 30]),
    ) as Seo360Scorecard["dimensions"],
  };
}

function image(index: number): Seo360ImageSemanticEvidence {
  return {
    url: `https://cdn.example.com/san-andres-${index}.jpg`,
    sourceRefs: [`public.media_assets:san-andres-${index}`],
    provenance: "ColombiaTours owned/canonical San Andrés asset",
    sectionPlacement: index === 1 ? "hero" : `section-${index}`,
    destination: "San Andrés",
    alt: `San Andrés beach, cays and raizal culture image ${index}`,
    caption: `San Andrés semantic visual evidence ${index}`,
    semanticVerdict: "PASS",
    provenanceVerdict: "PASS",
    sectionMatchVerdict: "PASS",
    altCaptionVerdict: "PASS",
    visualConsistencyVerdict: "PASS",
  };
}

function validInput(): Seo360BenchmarkGateInput {
  const targetKeyword = "San Andrés travel guide";
  const targetMarket = "San Andrés";
  return {
    targetKeyword,
    targetMarket,
    colombiaTours: score(330),
    requiredImageCount: 4,
    images: [1, 2, 3, 4].map(image),
    peerBenchmark: {
      targetKeyword,
      targetMarket,
      selectedFrom: "dataforseo_serp",
      selectionMethod: "top4_editorial_exact_keyword_market",
      scoringMode: "peer_superiority",
      preservesWriterStyle: true,
      competitors: [
        "https://competitor.example.com/san-andres-guide",
        "https://travel.example.org/colombia/san-andres",
        "https://magazine.example.net/san-andres-islands",
        "https://blog.example.co/san-andres-cays",
      ].map((url, index) => ({
        url,
        rank: index + 1,
        source: "dataforseo_serp",
        targetKeyword,
        targetMarket,
        editorial: true,
        scorecard: score(280 + index * 10),
      })),
    },
  };
}

describe("evaluateSeo360BenchmarkGate", () => {
  it("passes San Andrés only with top-4 DataForSEO peers, peer-superiority scoring, style preservation and four semantic image passes", () => {
    const decision = evaluateSeo360BenchmarkGate(validInput());

    expect(decision.passed).toBe(true);
    expect(decision.status).toBe("pass");
    expect(decision.peerMaxScore).toBe(310);
  });

  it("holds when target keyword or target market is missing before benchmark validation", () => {
    const input = validInput();
    input.targetKeyword = "";
    input.targetMarket = null;

    const decision = evaluateSeo360BenchmarkGate(input);

    expect(decision.passed).toBe(false);
    expect(decision.reasons).toEqual(
      expect.arrayContaining([
        "seo360_missing_target_keyword",
        "seo360_missing_target_market",
        "seo360_peer_benchmark_keyword_mismatch",
        "seo360_peer_benchmark_market_mismatch",
      ]),
    );
  });

  it("holds when benchmark is missing or average-only instead of top-4 peer superiority", () => {
    expect(
      evaluateSeo360BenchmarkGate({ ...validInput(), peerBenchmark: null }).reasons,
    ).toContain("seo360_missing_peer_benchmark");

    const input = validInput();
    input.peerBenchmark!.scoringMode = "average_only";
    input.colombiaTours.total = 300;

    const decision = evaluateSeo360BenchmarkGate(input);

    expect(decision.passed).toBe(false);
    expect(decision.reasons).toEqual(
      expect.arrayContaining([
        "seo360_peer_benchmark_average_only_hold",
        "seo360_colombiatours_not_above_top4_peer_set",
      ]),
    );
  });

  it("holds San Andrés images unless all four section-match, provenance, alt/caption and semantic checks pass", () => {
    const input = validInput();
    delete input.requiredImageCount;
    input.images![2] = {
      ...input.images![2],
      provenanceVerdict: "FAIL",
      caption: "",
    };

    const decision = evaluateSeo360BenchmarkGate(input);

    expect(decision.passed).toBe(false);
    expect(decision.reasons).toContain("seo360_image_3_semantic_validation_hold");
  });

  it("implicitly requires four semantic image passes for San Andres market even without an explicit requiredImageCount", () => {
    const input = validInput();
    delete input.requiredImageCount;
    input.images = [image(1), image(2), image(3)];

    const decision = evaluateSeo360BenchmarkGate(input);

    expect(decision.passed).toBe(false);
    expect(decision.reasons).toContain("seo360_image_semantic_validation_requires_4_images:3");
  });

  it("exposes a contract schema that rejects non-DataForSEO/non-top4/non-style-preserving packets", () => {
    const input = validInput();
    const parsed = Seo360BenchmarkContractSchema.safeParse({
      ...input.peerBenchmark,
      colombiaTours: input.colombiaTours,
      images: input.images,
    });
    expect(parsed.success).toBe(true);

    const invalid = Seo360BenchmarkContractSchema.safeParse({
      ...input.peerBenchmark,
      selectedFrom: "manual_average",
      selectionMethod: "average_ranked_pages",
      scoringMode: "average_only",
      preservesWriterStyle: false,
      colombiaTours: input.colombiaTours,
      images: input.images,
    });
    expect(invalid.success).toBe(false);

    const insufficientImages = Seo360BenchmarkContractSchema.safeParse({
      ...input.peerBenchmark,
      colombiaTours: input.colombiaTours,
      images: input.images!.slice(0, 3),
    });
    expect(insufficientImages.success).toBe(false);

    const notAbovePeers = Seo360BenchmarkContractSchema.safeParse({
      ...input.peerBenchmark,
      colombiaTours: score(300),
      images: input.images,
    });
    expect(notAbovePeers.success).toBe(false);
  });
});
