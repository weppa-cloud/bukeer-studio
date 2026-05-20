#!/usr/bin/env node
import assert from "node:assert/strict";
import { contentQualityGate } from "./growth-agent-lanes-lib.mjs";

const sanAndresNoImages = {
  title: "San Andrés Colombia: guía completa",
  work_type: "seo_content",
  locale: "es-CO",
  market: "CO",
  evidence: {
    target_keyword: "San Andrés Colombia",
    content: `# San Andrés Colombia\n\n## Qué hacer\n\nSan Andrés combina playas, cultura raizal y experiencias de mar.\n\n## Consejos\n\nReserva con anticipación y valida clima antes de viajar.`,
    content_standard: {
      project_preference_fit: "ColombiaTours audience and CTA fit documented.",
      eeat_evidence: "Local itinerary expertise and operational proof documented.",
      who_how_why: "Created to satisfy San Andrés trip-planning demand.",
      scaled_content_risk_review: "Reviewed for thin/templated risk.",
    },
    competitive_content: {
      serp_intent: "Trip-planning guide intent.",
      competitor_coverage: "Manual note without top competitor rows.",
      colombiatours_added_value: "Local planning support and WAFlow CTA.",
    },
    curator_review: { approved: true, reviewed_at: "2026-05-20T00:00:00Z" },
    content_metrics: {
      word_count: 31,
      inline_image_count: 0,
      image_count: 0,
      h2_count: 2,
      paragraph_count: 2,
      internal_link_count: 0,
      has_table: false,
      has_faq: false,
      has_toc: false,
    },
  },
};

const blocked = contentQualityGate(sanAndresNoImages);
assert.equal(blocked.visual_quality_status, "FAIL");
assert.equal(blocked.competitive_benchmark_status, "WARN");
assert.equal(blocked.readiness_statuses.visual_ready, "FAIL");
assert.equal(blocked.readiness_statuses.traffic_ready, "HOLD");
assert.ok(blocked.missing.includes("fail_visual_quality"));
assert.ok(blocked.missing.includes("hold_competitive_evidence"));

const sanAndresWith360Evidence = {
  ...sanAndresNoImages,
  evidence: {
    ...sanAndresNoImages.evidence,
    content: `${sanAndresNoImages.evidence.content}\n\n![Playa de San Andrés](/images/san-andres-playa.webp)`,
    content_metrics: {
      ...sanAndresNoImages.evidence.content_metrics,
      inline_image_count: 1,
      image_count: 2,
      featured_image: "/images/san-andres-hero.webp",
      og_image: "/images/san-andres-og.webp",
      alt_coverage: 1,
    },
    competitor_benchmark: {
      provider: "DataForSEO",
      task_id: "regression-serp-top5",
      competitors: [
        { url: "https://example.com/a", word_count: 1800, image_count: 6 },
        { url: "https://example.com/b", word_count: 1500, image_count: 5 },
        { url: "https://example.com/c", word_count: 1600, image_count: 4 },
        { url: "https://example.com/d", word_count: 1400, image_count: 7 },
        { url: "https://example.com/e", word_count: 1700, image_count: 5 },
      ],
      our_vs_competitor_metrics: {
        word_count: { ours: 31, competitor_median: 1600 },
        inline_image_count: { ours: 1, competitor_median: 5 },
      },
    },
  },
};

const pass = contentQualityGate(sanAndresWith360Evidence);
assert.equal(pass.visual_quality_status, "PASS");
assert.equal(pass.competitive_benchmark_status, "PASS");
assert.equal(pass.readiness_statuses.traffic_ready, "PASS");
assert.equal(pass.status, "pass");

console.log(
  JSON.stringify(
    {
      status: "PASS",
      san_andres_no_images: {
        visual_quality_status: blocked.visual_quality_status,
        competitive_benchmark_status: blocked.competitive_benchmark_status,
        traffic_ready: blocked.readiness_statuses.traffic_ready,
        missing: blocked.missing,
      },
      san_andres_with_360_evidence: {
        visual_quality_status: pass.visual_quality_status,
        competitive_benchmark_status: pass.competitive_benchmark_status,
        traffic_ready: pass.readiness_statuses.traffic_ready,
      },
    },
    null,
    2,
  ),
);
