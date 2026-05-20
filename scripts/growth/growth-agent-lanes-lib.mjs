export const AGENT_LANES = {
  ORCHESTRATOR: "growth_orchestrator_blocked_router",
  TECHNICAL: "technical_remediation_agent",
  TRANSCREATION: "transcreation_growth_agent",
  CREATOR: "content_creator_agent",
  CURATOR: "content_curator_council_operator_agent",
};

export const CONTENT_WORK_TYPES = new Set([
  "seo_demand",
  "content_opportunity",
  "serp_competitor_opportunity",
  "content_update",
  "seo_content",
  "locale_content",
]);

export const DEFAULT_AUTOMATION_CONFIDENCE_THRESHOLD = 0.9;

export function classifyAgentLane(row, options = {}) {
  const text = searchableText(row);
  const workType = String(row.work_type ?? row.task_type ?? "").toLowerCase();

  if (
    hasAny(text, [
      /en\.colombiatours/,
      /\/en\//,
      /translation/,
      /transcreation/,
      /locale/,
      /hreflang/,
      /target_locale/,
      /quality gate/,
    ])
  ) {
    return route({
      blocker_type: "locale_gate_required",
      agent_lane: AGENT_LANES.TRANSCREATION,
      routing_confidence: 0.9,
      blocked_reason:
        "Localized content requires transcreation, locale quality and sitemap/hreflang gate before execution or Council promotion.",
      next_action:
        "Route to Transcreation Growth Agent; validate target-market intent, content quality, canonical and hreflang before publish/apply.",
    });
  }

  if (
    hasAny(text, [
      /soft.?404/,
      /canonical/,
      /sitemap/,
      /redirect/,
      /\b404\b/,
      /\b410\b/,
      /metadata/,
      /\bh1\b/,
      /internal.?link/,
      /orphan/,
      /media/,
      /image/,
      /performance/,
      /route mapping/,
      /slug/,
      /crawl finding/,
    ])
  ) {
    return route({
      blocker_type: "technical_or_route_mapping",
      agent_lane: AGENT_LANES.TECHNICAL,
      routing_confidence: 0.85,
      blocked_reason:
        "Technical SEO or public route mapping issue requires deterministic remediation and smoke evidence.",
      next_action:
        "Route to Technical Remediation Agent; validate HTTP status, canonical, sitemap/hreflang, metadata and recrawl/smoke evidence.",
    });
  }

  if (
    hasAny(text, [
      /tracking/,
      /waflow/,
      /attribution/,
      /conversion/,
      /crm/,
      /quote/,
      /booking/,
      /utm/,
      /meta capi/,
    ])
  ) {
    return route({
      blocker_type: "tracking_or_attribution",
      agent_lane: AGENT_LANES.ORCHESTRATOR,
      routing_confidence: 0.78,
      blocked_reason:
        "Tracking or attribution evidence is incomplete for a measurable Growth readout.",
      next_action:
        "Resolve first-party funnel/CRM attribution or keep as WATCH until measurement is decision-grade.",
    });
  }

  if (
    hasAny(text, [
      /backlink/,
      /llm mentions/,
      /provider/,
      /access/,
      /subscription/,
      /cid/,
      /place id/,
      /dataforseo access/,
      /api access/,
    ])
  ) {
    return route({
      blocker_type: "provider_or_access",
      agent_lane: AGENT_LANES.ORCHESTRATOR,
      routing_confidence: 0.8,
      blocked_reason:
        "Provider access, subscription, account selection or external identifier dependency is missing.",
      next_action:
        "Route to Growth Orchestrator; decide fallback, WATCH, rejection or access request.",
    });
  }

  if (
    CONTENT_WORK_TYPES.has(workType) ||
    hasAny(text, [
      /content/,
      /brief/,
      /keyword/,
      /serp/,
      /competitor/,
      /e-e-a-t/,
      /eeat/,
      /people-first/,
      /scaled content/,
      /thin content/,
      /copy/,
      /title\/meta/,
    ])
  ) {
    return route({
      blocker_type: "content_quality",
      agent_lane: AGENT_LANES.CREATOR,
      routing_confidence: 0.76,
      blocked_reason:
        "Content row requires Creator evidence and Curator review before SEO QA, Council or publishing.",
      next_action:
        "Route to Content Creator for competitive brief, then Content Curator for people-first, E-E-A-T and competitive superiority validation.",
    });
  }

  if (
    hasAny(text, [
      /experiment/,
      /council/,
      /success metric/,
      /evaluation date/,
      /independence/,
      /baseline/,
    ])
  ) {
    return route({
      blocker_type: "experiment_readiness",
      agent_lane: AGENT_LANES.CURATOR,
      routing_confidence: 0.72,
      blocked_reason:
        "Row needs Council readiness validation before experiment activation.",
      next_action:
        "Route to Curator/Council Operator; verify source row, baseline, owner, metric, evaluation date and independence key.",
    });
  }

  return route({
    blocker_type: "needs_manual_review",
    agent_lane: AGENT_LANES.ORCHESTRATOR,
    routing_confidence: options.defaultConfidence ?? 0.5,
    blocked_reason:
      "Blocked row needs manual routing before promotion, execution or rejection.",
    next_action:
      "Growth Orchestrator reviews source facts and assigns lane, WATCH, rejection or owner escalation.",
  });
}

export function isContentLike(row) {
  const workType = String(row.work_type ?? row.task_type ?? "").toLowerCase();
  if (CONTENT_WORK_TYPES.has(workType)) return true;
  const evidence = row.evidence ?? {};
  return Boolean(
    evidence.content_brief ||
    evidence.content_task ||
    evidence.content_standard ||
    evidence.competitive_content ||
    evidence.curator_review,
  );
}

export function contentQualityGate(row) {
  const evidence = row.evidence ?? {};
  const brief = evidence.content_brief ?? {};
  const task = evidence.content_task ?? {};
  const standard =
    evidence.content_standard ??
    brief.content_standard ??
    task.content_standard ??
    {};
  const competitive =
    evidence.competitive_content ??
    brief.competitive_content ??
    task.competitive_content ??
    {};
  const curator =
    evidence.curator_review ??
    evidence.content_curator_review ??
    brief.curator_review ??
    task.curator_review ??
    {};
  const metrics = content360Metrics(row, evidence, brief, task, standard, competitive);
  const competitorBenchmark = competitorBenchmarkEvidence(
    evidence,
    brief,
    task,
    competitive,
  );
  const visualQualityStatus = visualQualityStatusFor(metrics);
  const competitiveBenchmarkStatus = competitiveBenchmarkStatusFor(
    competitorBenchmark,
  );

  const missing = [];
  if (!truthy(metrics.target_keyword)) missing.push("missing_target_keyword");
  if (!truthy(metrics.locale)) missing.push("missing_locale");
  if (!truthy(metrics.market)) missing.push("missing_market");
  if (!truthy(standard.project_preference_fit))
    missing.push("missing_project_preference_fit");
  if (!truthy(competitive.serp_intent)) missing.push("missing_serp_intent");
  if (!truthy(competitive.competitor_coverage))
    missing.push("missing_competitor_coverage");
  if (!truthy(competitive.colombiatours_added_value))
    missing.push("missing_colombiatours_added_value");
  if (!truthy(standard.eeat_evidence)) missing.push("missing_eeat_evidence");
  if (!truthy(standard.who_how_why)) missing.push("missing_who_how_why");
  if (!truthy(standard.scaled_content_risk_review))
    missing.push("missing_scaled_content_risk_review");
  if (!truthy(curator.approved) && !truthy(curator.reviewed_at))
    missing.push("missing_curator_review");
  if (visualQualityStatus === "FAIL") missing.push("fail_visual_quality");
  if (visualQualityStatus === "WARN") missing.push("warn_visual_quality");
  if (competitiveBenchmarkStatus !== "PASS") {
    missing.push("hold_competitive_evidence");
  }

  const readiness_statuses = {
    technical_live: statusFromEvidence(evidence.technical_live, "UNKNOWN"),
    canary_live: statusFromEvidence(evidence.canary_live, "UNKNOWN"),
    visual_ready: visualQualityStatus,
    seo_360_ready:
      missing.length || visualQualityStatus !== "PASS" || competitiveBenchmarkStatus !== "PASS"
        ? "FAIL"
        : "PASS",
    traffic_ready:
      missing.length || visualQualityStatus !== "PASS" || competitiveBenchmarkStatus !== "PASS"
        ? "HOLD"
        : "PASS",
  };

  return {
    status: missing.length ? "blocked" : "pass",
    missing,
    content_standard: standard,
    competitive_content: competitive,
    curator_review: curator,
    target_keyword: metrics.target_keyword,
    locale: metrics.locale,
    market: metrics.market,
    metrics_360: metrics,
    competitor_benchmark: competitorBenchmark,
    visual_quality_status: visualQualityStatus,
    competitive_benchmark_status: competitiveBenchmarkStatus,
    readiness_statuses,
  };
}

export function contentStandardDraft(row, brief = {}) {
  return {
    project_preference_fit:
      "ColombiaTours audience, offer fit, CTA model, trust proof and canonical locale policy must be verified by Curator.",
    eeat_evidence:
      "Draft must add real travel expertise, operational proof, itinerary insight or reviewer accountability before publish.",
    who_how_why:
      "Creator prepared AI-assisted brief from Growth OS facts; Curator must record how sources were used and why the page exists.",
    scaled_content_risk_review:
      "Curator must reject thin, duplicated or templated content before SEO QA.",
    ai_assisted: true,
    curator_review_required: true,
    source_item_key: row.item_key ?? null,
    source_work_type: row.work_type ?? null,
    target_locale: brief.target_locale ?? row.locale ?? null,
  };
}


function content360Metrics(row, evidence, brief, task, standard, competitive) {
  const metricSources = [
    evidence.content_metrics,
    evidence.metrics_360,
    evidence.seo_360_metrics,
    evidence.article_metrics,
    brief.content_metrics,
    brief.metrics_360,
    task.content_metrics,
    task.metrics_360,
    standard.content_metrics,
    competitive.content_metrics,
    evidence,
    brief,
    task,
    row.metrics_360,
    row.content_metrics,
    row,
  ].filter(Boolean);
  const content = String(
    row.content ??
      evidence.content ??
      evidence.article_content ??
      brief.content ??
      task.content ??
      "",
  );
  const inlineCount = firstNumber(metricSources, [
    "inline_image_count",
    "body_image_count",
    "content_image_count",
  ]);
  const imageCount = firstNumber(metricSources, ["image_count", "images_count"]);
  const featuredImage = firstTruthy(metricSources, [
    "featured_image",
    "featuredImage",
    "hero_image",
    "cover_image",
  ]);
  const ogImage = firstTruthy(metricSources, ["og_image", "ogImage", "social_image"]);
  const inferredInlineImageCount =
    inlineCount ?? countMatches(content, /<img|!\[[^\]]*\]\([^)]*\)/gi);
  const inferredImageCount =
    imageCount ?? inferredInlineImageCount + (featuredImage || ogImage ? 1 : 0);

  return {
    target_keyword: firstTruthy(metricSources, [
      "target_keyword",
      "keyword",
      "primary_keyword",
      "query",
    ]),
    locale: firstTruthy(metricSources, ["locale", "target_locale", "language"]),
    market: firstTruthy(metricSources, ["market", "target_market", "country"]),
    word_count: firstNumber(metricSources, ["word_count", "words"]) ?? wordCount(content),
    image_count: inferredImageCount,
    inline_image_count: inferredInlineImageCount,
    featured_image: featuredImage ?? null,
    has_featured_image: Boolean(featuredImage),
    og_image: ogImage ?? null,
    has_og_image: Boolean(ogImage),
    alt_coverage: firstNumber(metricSources, ["alt_coverage", "image_alt_coverage"]),
    h2_count:
      firstNumber(metricSources, ["h2_count", "heading2_count"]) ??
      countMatches(content, /^##\s+|<h2/gim),
    paragraph_count:
      firstNumber(metricSources, ["paragraph_count", "p_count"]) ??
      countParagraphs(content),
    internal_link_count:
      firstNumber(metricSources, ["internal_link_count", "internal_links"]) ??
      countMatches(content, /href=["']\/(?!\/)|\]\(\/(?!\/)/gi),
    has_table: truthy(firstTruthy(metricSources, ["has_table"])) || /<table|^\|.+\|/im.test(content),
    has_faq: truthy(firstTruthy(metricSources, ["has_faq"])) || /faq|preguntas frecuentes/i.test(content),
    has_toc: truthy(firstTruthy(metricSources, ["has_toc", "has_table_of_contents"])) || /table of contents|tabla de contenido/i.test(content),
  };
}

function competitorBenchmarkEvidence(evidence, brief, task, competitive) {
  const benchmark =
    evidence.competitor_benchmark ??
    evidence.competitive_benchmark ??
    evidence.serp_benchmark ??
    evidence.dataforseo_serp ??
    brief.competitor_benchmark ??
    task.competitor_benchmark ??
    competitive.competitor_benchmark ??
    competitive.benchmark ??
    {};
  const competitors = firstTruthy([benchmark, competitive, evidence], [
    "competitors",
    "top_competitors",
    "serp_competitors",
    "top_results",
    "dataforseo_top_results",
  ]);
  const competitorCount = Array.isArray(competitors)
    ? competitors.length
    : Number(benchmark.top_count ?? benchmark.competitor_count ?? 0);
  return {
    provider: benchmark.provider ?? evidence.provider ?? null,
    source: benchmark.source ?? benchmark.run_id ?? benchmark.task_id ?? null,
    has_dataforseo: /dataforseo/i.test(
      JSON.stringify({ benchmark, provider: benchmark.provider ?? evidence.provider ?? "" }),
    ),
    competitor_count: Number.isFinite(competitorCount) ? competitorCount : 0,
    competitors: Array.isArray(competitors) ? competitors.slice(0, 10) : [],
    our_vs_competitor_metrics:
      benchmark.our_vs_competitor_metrics ??
      benchmark.metrics_comparison ??
      competitive.our_vs_competitor_metrics ??
      null,
    semantic_density: benchmark.semantic_density ?? competitive.semantic_density ?? null,
    entity_coverage: benchmark.entity_coverage ?? competitive.entity_coverage ?? null,
  };
}

function visualQualityStatusFor(metrics) {
  if (Number(metrics.inline_image_count ?? 0) <= 0) return "FAIL";
  if (Number(metrics.image_count ?? 0) <= 0) return "FAIL";
  if (!metrics.has_featured_image && !metrics.has_og_image) return "WARN";
  if (metrics.alt_coverage != null && Number(metrics.alt_coverage) < 0.8)
    return "WARN";
  return "PASS";
}

function competitiveBenchmarkStatusFor(benchmark) {
  if (!benchmark.source && !benchmark.competitor_count && !benchmark.our_vs_competitor_metrics)
    return "WARN";
  if (Number(benchmark.competitor_count ?? 0) < 5 && !benchmark.our_vs_competitor_metrics)
    return "WARN";
  return "PASS";
}

function statusFromEvidence(value, fallback) {
  if (typeof value === "string" && value.trim()) return value.trim().toUpperCase();
  if (value === true) return "PASS";
  if (value === false) return "FAIL";
  return fallback;
}

function firstTruthy(sources, keys) {
  for (const source of sources) {
    if (!source || typeof source !== "object") continue;
    for (const key of keys) {
      const value = source[key];
      if (truthy(value)) return value;
    }
  }
  return null;
}

function firstNumber(sources, keys) {
  const value = firstTruthy(sources, keys);
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function countMatches(value, regex) {
  return (String(value).match(regex) ?? []).length;
}

function wordCount(value) {
  return String(value)
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function countParagraphs(value) {
  return String(value)
    .split(/\n\s*\n|<\/p>/i)
    .map((part) => part.trim())
    .filter(Boolean).length;
}

export function competitiveContentDraft(row, brief = {}) {
  return {
    serp_intent:
      brief.intent ??
      "Use DataForSEO SERP plus GSC query/page evidence to confirm dominant intent.",
    competitor_coverage:
      "Creator must list top competitor patterns and missed sub-intents before Curator approval.",
    colombiatours_added_value:
      "Add ColombiaTours-specific local expertise, itinerary detail, trust proof, CTA fit or planning detail beyond SERP summaries.",
    snippet_opportunity:
      "Curator should validate title/meta/H1/FAQ/schema opportunity against the SERP.",
    conversion_fit:
      "CTA must align with WAFlow/CRM/itinerary-confirmed measurement path.",
    competitive_advantage_status: "draft_requires_curator_review",
    source_profiles: row.source_profiles ?? [],
  };
}

export function laneLabel(value) {
  return (
    {
      [AGENT_LANES.ORCHESTRATOR]: "Orchestrator",
      [AGENT_LANES.TECHNICAL]: "Technical",
      [AGENT_LANES.TRANSCREATION]: "Transcreation",
      [AGENT_LANES.CREATOR]: "Creator",
      [AGENT_LANES.CURATOR]: "Curator/Council",
    }[value] ??
    value ??
    "Unrouted"
  );
}

export function automationPolicyFor({
  decision,
  confidence,
  agentLane,
  blockerType,
  requiredHumanReview,
  contentGate,
  threshold = DEFAULT_AUTOMATION_CONFIDENCE_THRESHOLD,
}) {
  if (decision === "reject") {
    return {
      automation_eligible: false,
      allowed_action: "reject",
      automation_reason: "Reviewer rejected the row.",
    };
  }
  if (decision === "block") {
    return {
      automation_eligible: false,
      allowed_action: "block",
      automation_reason: "Row is blocked by missing evidence or risk.",
    };
  }
  if (decision === "watch") {
    return {
      automation_eligible: false,
      allowed_action: "watch",
      automation_reason: "Row is useful for monitoring but not automation.",
    };
  }

  const protectedWork =
    agentLane === AGENT_LANES.TRANSCREATION ||
    agentLane === AGENT_LANES.CREATOR ||
    agentLane === AGENT_LANES.CURATOR ||
    blockerType === "content_quality" ||
    blockerType === "locale_gate_required" ||
    blockerType === "experiment_readiness" ||
    blockerType === "provider_or_access" ||
    blockerType === "tracking_or_attribution" ||
    Boolean(contentGate?.missing?.length);

  if (protectedWork || requiredHumanReview) {
    return {
      automation_eligible: false,
      allowed_action: "prepare_for_human",
      automation_reason:
        "Protected work can be prepared by agents, but requires human or Council approval before publish, activation or mutation.",
    };
  }

  if (
    agentLane === AGENT_LANES.TECHNICAL &&
    confidence >= threshold &&
    decision === "promote"
  ) {
    return {
      automation_eligible: true,
      allowed_action: "auto_apply",
      automation_reason:
        "Low-risk technical remediation is smoke-verifiable and meets confidence threshold.",
    };
  }

  return {
    automation_eligible: false,
    allowed_action: "prepare_for_human",
    automation_reason:
      "Confidence threshold or safe-action criteria were not met.",
  };
}

function route(value) {
  return value;
}

function searchableText(row) {
  return JSON.stringify({
    entity_key: row.entity_key,
    title: row.title,
    work_type: row.work_type,
    task_type: row.task_type,
    next_action: row.next_action,
    blocked_reason: row.blocked_reason,
    evidence: row.evidence,
    source_profiles: row.source_profiles,
    owner_issue: row.owner_issue,
  }).toLowerCase();
}

function hasAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function truthy(value) {
  if (value === true) return true;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === "object") return Object.keys(value).length > 0;
  return Boolean(value);
}
