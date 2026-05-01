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

  const missing = [];
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

  return {
    status: missing.length ? "blocked" : "pass",
    missing,
    content_standard: standard,
    competitive_content: competitive,
    curator_review: curator,
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
