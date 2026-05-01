#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import dotenv from "dotenv";
import {
  DEFAULT_ACCOUNT_ID,
  DEFAULT_WEBSITE_ID,
  fingerprint,
  getSupabase,
  parseArgs,
  renderTable,
  writeArtifacts,
} from "../seo/growth-unified-backlog-lib.mjs";
import {
  DEFAULT_AUTOMATION_CONFIDENCE_THRESHOLD,
  automationPolicyFor,
  classifyAgentLane,
  contentQualityGate,
  isContentLike,
  laneLabel,
} from "./growth-agent-lanes-lib.mjs";

dotenv.config({ path: ".env.local" });

const PROMPT_VERSION = "growth-agent-evaluator-v2";
const CONFIG_VERSION = "agent-lanes-2026-content-standard-v2";
const args = parseArgs(process.argv.slice(2));
const apply = args.apply === "true";
const websiteId = args.websiteId ?? DEFAULT_WEBSITE_ID;
const accountId = args.accountId ?? DEFAULT_ACCOUNT_ID;
const limit = Number(args.limit ?? 20);
const useLlm = args.llm !== "false";
const inputArtifact = args.inputArtifact ?? null;
const automationThreshold = Number(
  args.automationConfidenceThreshold ?? DEFAULT_AUTOMATION_CONFIDENCE_THRESHOLD,
);
const outDir =
  args.outDir ?? path.join("artifacts/seo", `${today()}-growth-ai-reviews`);
const sb = getSupabase();

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const [defaultSourceRows, artifactSourceRows, tableStatus] =
    await Promise.all([
      inputArtifact ? Promise.resolve([]) : fetchDefaultSourceRows(),
      inputArtifact ? fetchSourceRowsFromArtifact(inputArtifact) : [],
      detectTable("growth_ai_reviews"),
    ]);

  const sourceRows = (inputArtifact ? artifactSourceRows : defaultSourceRows)
    .sort(
      (a, b) => Number(b.priority_score ?? 0) - Number(a.priority_score ?? 0),
    )
    .slice(0, limit);
  const reviews = [];
  for (const source of sourceRows) {
    reviews.push(await evaluateSource(source));
  }

  const applyResult = apply
    ? await applyReviews(reviews, tableStatus)
    : { mode: "dry-run", reviews: reviews.length };
  const report = {
    generated_at: new Date().toISOString(),
    mode: apply ? "apply" : "dry-run",
    website_id: websiteId,
    prompt_version: PROMPT_VERSION,
    config_version: CONFIG_VERSION,
    llm_enabled: useLlm,
    input_artifact: inputArtifact,
    automation_confidence_threshold: automationThreshold,
    table_status: tableStatus,
    counts: {
      reviewed: reviews.length,
      promote: reviews.filter((row) => row.decision === "promote").length,
      watch: reviews.filter((row) => row.decision === "watch").length,
      block: reviews.filter((row) => row.decision === "block").length,
      reject: reviews.filter((row) => row.decision === "reject").length,
      requires_human_review: reviews.filter((row) => row.required_human_review)
        .length,
      automation_eligible: reviews.filter((row) => row.automation_eligible)
        .length,
      auto_apply: reviews.filter((row) => row.allowed_action === "auto_apply")
        .length,
      prepare_for_human: reviews.filter(
        (row) => row.allowed_action === "prepare_for_human",
      ).length,
      llm: reviews.filter((row) => row.mode === "llm").length,
      heuristic: reviews.filter((row) => row.mode === "heuristic").length,
    },
    apply_result: applyResult,
    reviews,
  };

  await writeArtifacts(
    outDir,
    "growth-ai-reviews",
    report,
    renderMarkdown(report),
  );
  console.log(
    JSON.stringify(
      {
        mode: report.mode,
        outDir,
        counts: report.counts,
        apply_result: applyResult,
      },
      null,
      2,
    ),
  );
}

async function fetchSourceRows(table, statuses) {
  const { data, error } = await sb
    .from(table)
    .select("*")
    .eq("website_id", websiteId)
    .in("status", statuses)
    .limit(limit * 2);
  if (error) return [];
  return (data ?? []).map((row) => ({ ...row, source_table: table }));
}

async function fetchDefaultSourceRows() {
  const [candidates, items] = await Promise.all([
    fetchSourceRows("growth_backlog_candidates", [
      "candidate",
      "watch",
      "blocked",
    ]),
    fetchSourceRows("growth_backlog_items", [
      "ready_for_brief",
      "brief_in_progress",
      "ready_for_council",
      "blocked",
      "watch",
    ]),
  ]);
  return [...candidates, ...items];
}

async function fetchSourceRowsFromArtifact(artifactPath) {
  const raw = await fs.readFile(artifactPath, "utf8");
  const artifact = JSON.parse(raw);
  const sample = Array.isArray(artifact.sample) ? artifact.sample : [];
  const rows = [];

  for (const sampleRow of sample) {
    if (!sampleRow.source_table || !sampleRow.id) continue;
    const { data, error } = await sb
      .from(sampleRow.source_table)
      .select("*")
      .eq("id", sampleRow.id)
      .maybeSingle();
    if (error || !data) {
      rows.push({
        ...sampleRow,
        source_table: sampleRow.source_table,
        evidence: {
          ...(sampleRow.evidence ?? {}),
          artifact_lookup_error: error?.message ?? "row_not_found",
        },
      });
      continue;
    }
    rows.push({ ...data, source_table: sampleRow.source_table });
  }

  return rows;
}

async function evaluateSource(source) {
  const routing = classifyAgentLane(source);
  const contentGate = isContentLike(source) ? contentQualityGate(source) : null;
  const base = {
    source_table: source.source_table,
    source_id: source.id,
    candidate_id:
      source.source_table === "growth_backlog_candidates" ? source.id : null,
    backlog_item_id:
      source.source_table === "growth_backlog_items" ? source.id : null,
    review_key: fingerprint(
      "ai-review",
      PROMPT_VERSION,
      source.source_table,
      source.id,
    ),
    title: source.title ?? source.item_key ?? source.candidate_key,
    entity_key: source.entity_key,
    priority_score: Number(source.priority_score ?? 0),
    confidence_score: Number(source.confidence_score ?? 0),
    agent_lane: routing.agent_lane,
    agent_lane_label: laneLabel(routing.agent_lane),
    blocker_type: routing.blocker_type,
    deterministic_routing_confidence: routing.routing_confidence,
    content_gate: contentGate,
  };

  if (!useLlm || !process.env.OPENROUTER_AUTH_TOKEN) {
    return withAutomationPolicy({
      ...base,
      ...heuristicReview(source, routing, contentGate),
    });
  }

  try {
    const llm = await callLlm(source, routing, contentGate);
    return withAutomationPolicy({
      ...base,
      mode: "llm",
      ...normalizeReview(llm, source),
    });
  } catch (error) {
    return withAutomationPolicy({
      ...base,
      ...heuristicReview(source, routing, contentGate),
      mode: "heuristic",
      risks: [
        ...heuristicReview(source, routing, contentGate).risks,
        `llm_error:${error.message}`,
      ],
    });
  }
}

function heuristicReview(source, routing, contentGate) {
  const risks = [];
  if (!source.baseline) risks.push("missing_baseline");
  if (!source.next_action) risks.push("missing_next_action");
  if (contentGate?.missing.length) risks.push(...contentGate.missing);
  if (routing.blocker_type === "needs_manual_review")
    risks.push("needs_manual_review");

  let decision = "watch";
  if (risks.includes("missing_baseline")) decision = "block";
  else if (contentGate?.missing.length) decision = "block";
  else if (routing.blocker_type === "provider_or_access") decision = "watch";
  else if (Number(source.confidence_score ?? 0) >= automationThreshold)
    decision = "promote";

  return {
    mode: "heuristic",
    decision,
    confidence:
      decision === "promote"
        ? Math.min(0.95, Number(source.confidence_score ?? automationThreshold))
        : 0.58,
    competitive_advantage:
      contentGate && !contentGate.missing.length
        ? "Content evidence passes deterministic competitive gate; Curator should still validate before Council."
        : "Competitive advantage not sufficiently proven for automatic promotion.",
    risks,
    next_action:
      decision === "promote"
        ? "Curator reviews evidence and decides promotion to Council or execution."
        : routing.next_action,
    missing_evidence: risks,
    specific_next_action:
      decision === "promote"
        ? "Curator validates baseline, source refs, owner, success metric, evaluation date and competitive evidence before promotion."
        : routing.next_action,
    why_not_promote:
      decision === "promote"
        ? ""
        : `Not promotable until these gaps are resolved: ${risks.join(", ") || routing.blocker_type}.`,
    human_review_focus:
      decision === "promote"
        ? "Confirm evidence quality and independence before Council."
        : "Resolve missing evidence and rerun evaluator.",
    would_auto_apply_if_allowed: false,
    required_human_review: true,
  };
}

async function callLlm(source, routing, contentGate) {
  const baseUrl =
    process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
  const model = process.env.OPENROUTER_MODEL || "anthropic/claude-sonnet-4-5";
  const sourceContext = sourceContextFor(source, contentGate);
  const rubric = laneRubric(routing.agent_lane, routing.blocker_type);
  const response = await fetch(
    `${baseUrl.replace(/\/$/, "")}/chat/completions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_AUTH_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a Growth OS evaluator. Return strict JSON only. You do not publish content or approve experiments; you review evidence for a Curator/Council workflow.",
          },
          {
            role: "user",
            content: JSON.stringify({
              required_schema: {
                decision: "promote | watch | block | reject",
                agent_lane: "string",
                confidence: "number 0..1",
                automation_eligible: "boolean",
                allowed_action:
                  "auto_apply | prepare_for_human | watch | block | reject",
                competitive_advantage: "string",
                missing_evidence: ["string"],
                risks: ["string"],
                next_action: "string",
                specific_next_action: "string",
                why_not_promote: "string",
                human_review_focus: "string",
                would_auto_apply_if_allowed: "boolean",
                required_human_review: "boolean",
              },
              evaluator_goal:
                "Judge whether this row has enough evidence to move to the next Growth OS state. Prefer precise missing evidence over generic advice.",
              rules: [
                "Use the lane rubric. Do not promote rows that fail mandatory lane evidence.",
                "Avoid generic actions like 'review setup'. Name the exact table/profile/fact/baseline/URL/content evidence missing.",
                "Block content without project preference fit, SERP intent, competitor coverage, ColombiaTours added value, E-E-A-T, Who/How/Why, scaled-content risk review or Curator review.",
                `Only low-risk, reversible or smoke-verifiable technical optimizations may be auto_apply, and only when confidence >= ${automationThreshold}.`,
                "Content, transcreation, experiment activation and paid/campaign mutation must be prepare_for_human even if confidence is high.",
                "Never treat AI-generated content as approved without Curator review.",
                "If deterministic routing is wrong, return the corrected agent_lane and explain the evidence.",
                "If decision is watch or block, why_not_promote must be specific and actionable.",
              ],
              automation_policy: {
                threshold: automationThreshold,
                auto_apply_scope:
                  "Only low-risk, reversible or smoke-verifiable operational optimizations.",
                always_human:
                  "content, transcreation, experiment activation, paid/campaign mutation and provider access decisions",
              },
              source: sanitizeSource(source),
              source_context: sourceContext,
              deterministic_routing: routing,
              lane_rubric: rubric,
              content_gate: contentGate,
            }),
          },
        ],
      }),
    },
  );
  if (!response.ok) {
    throw new Error(`OpenRouter ${response.status}: ${await response.text()}`);
  }
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Missing LLM content");
  return JSON.parse(content);
}

function normalizeReview(review, source) {
  const decision = ["promote", "watch", "block", "reject"].includes(
    review?.decision,
  )
    ? review.decision
    : "watch";
  const confidence = Math.max(
    0,
    Math.min(1, Number(review?.confidence ?? source.confidence_score ?? 0.5)),
  );
  return {
    decision,
    confidence,
    competitive_advantage:
      review?.competitive_advantage ?? "No competitive advantage stated.",
    missing_evidence: Array.isArray(review?.missing_evidence)
      ? review.missing_evidence
      : [],
    risks: Array.isArray(review?.risks) ? review.risks : [],
    next_action: review?.next_action ?? source.next_action ?? "Human review.",
    specific_next_action:
      review?.specific_next_action ??
      review?.next_action ??
      source.next_action ??
      "Human review.",
    why_not_promote: review?.why_not_promote ?? "",
    human_review_focus:
      review?.human_review_focus ??
      "Validate source evidence, baseline, owner, metric and action quality.",
    would_auto_apply_if_allowed: Boolean(review?.would_auto_apply_if_allowed),
    required_human_review: review?.required_human_review !== false,
    automation_eligible: Boolean(review?.automation_eligible),
    allowed_action: review?.allowed_action ?? "prepare_for_human",
  };
}

function sourceContextFor(source, contentGate) {
  const evidence = source.evidence ?? {};
  return {
    source_table: source.source_table,
    source_id: source.id,
    status: source.status,
    work_type: source.work_type ?? source.task_type ?? null,
    entity_key: source.entity_key ?? null,
    baseline_present: Boolean(source.baseline),
    baseline: source.baseline ?? null,
    has_next_action: Boolean(source.next_action),
    next_action: source.next_action ?? null,
    source_profiles: source.source_profiles ?? [],
    source_fact_refs: source.source_fact_refs ?? [],
    owner_issue: source.owner_issue ?? evidence.owner_issue ?? null,
    success_metric: source.success_metric ?? evidence.success_metric ?? null,
    evaluation_date: source.evaluation_date ?? evidence.evaluation_date ?? null,
    independence_key:
      source.independence_key ?? evidence.independence_key ?? null,
    evidence_keys: Object.keys(evidence).sort(),
    content_gate_status: contentGate?.status ?? null,
    content_gate_missing: contentGate?.missing ?? [],
    has_competitive_content: Boolean(
      evidence.competitive_content ??
      evidence.content_brief?.competitive_content ??
      evidence.content_task?.competitive_content,
    ),
    has_content_standard: Boolean(
      evidence.content_standard ??
      evidence.content_brief?.content_standard ??
      evidence.content_task?.content_standard,
    ),
    has_curator_review: Boolean(
      evidence.curator_review ??
      evidence.content_curator_review ??
      evidence.content_brief?.curator_review ??
      evidence.content_task?.curator_review,
    ),
  };
}

function laneRubric(agentLane, blockerType) {
  const common = [
    "source facts are traceable",
    "baseline is present and measurable",
    "next action is specific",
    "owner/evaluation path is clear before execution",
  ];
  const rubrics = {
    growth_orchestrator_blocked_router: {
      lane: "Growth Orchestrator / Blocked Router",
      promote_requires: [
        ...common,
        "blocker type is explicit",
        "provider/access/tracking dependency has a clear owner or fallback",
        "row can move to another lane or Council without ambiguity",
      ],
      block_if_missing: [
        "unknown provider account/access",
        "no baseline",
        "no source refs",
        "no owner for external dependency",
      ],
    },
    technical_remediation_agent: {
      lane: "Technical Remediation Agent",
      promote_requires: [
        ...common,
        "URL or route is actionable",
        "smoke evidence can verify HTTP status/canonical/sitemap/hreflang/CTA",
        "fix is reversible or has recrawl validation path",
      ],
      block_if_missing: [
        "no affected URL",
        "no technical finding or fact",
        "no smoke plan",
        "content/locale dependency masquerading as technical fix",
      ],
    },
    transcreation_growth_agent: {
      lane: "Transcreation Growth Agent",
      promote_requires: [
        ...common,
        "target locale and market intent are explicit",
        "existing EN/locale quality is known",
        "SERP/GSC/GA4 evidence supports localization demand",
        "sitemap/hreflang/canonical policy is safe until quality passes",
      ],
      block_if_missing: [
        "no locale/market",
        "no transcreation brief",
        "no quality gate",
        "no Curator review",
      ],
    },
    content_creator_agent: {
      lane: "Content Creator Agent",
      promote_requires: [
        ...common,
        "SERP intent and competitor coverage are present",
        "ColombiaTours added value is explicit",
        "E-E-A-T and Who/How/Why are documented",
        "scaled-content risk is reviewed",
        "Creator output is ready for Curator, not publication",
      ],
      block_if_missing: [
        "missing project preference fit",
        "missing SERP intent",
        "missing competitor coverage",
        "missing ColombiaTours added value",
        "missing E-E-A-T / Who-How-Why",
        "missing Curator review for publish/readiness",
      ],
    },
    content_curator_council_operator_agent: {
      lane: "Content Curator + Council Operator Agent",
      promote_requires: [
        ...common,
        "baseline, source row, owner, success metric and evaluation date are present",
        "independence key proves experiment does not corrupt another active test",
        "content has Curator approval when applicable",
        "Council action is one of active/planned/watch/reject",
      ],
      block_if_missing: [
        "missing baseline",
        "missing owner",
        "missing success metric",
        "missing evaluation date",
        "missing independence key",
        "Creator approved own content",
      ],
    },
  };
  return {
    ...(rubrics[agentLane] ?? rubrics.growth_orchestrator_blocked_router),
    deterministic_blocker_type: blockerType,
  };
}

function withAutomationPolicy(review) {
  const policy = automationPolicyFor({
    decision: review.decision,
    confidence: review.confidence,
    agentLane: review.agent_lane,
    blockerType: review.blocker_type,
    requiredHumanReview: review.required_human_review,
    contentGate: review.content_gate,
    threshold: automationThreshold,
  });
  return {
    ...review,
    ...policy,
    required_human_review:
      policy.allowed_action === "auto_apply"
        ? false
        : review.required_human_review !== false,
  };
}

async function detectTable(table) {
  const { error } = await sb.from(table).select("id").limit(1);
  return error
    ? { exists: false, error: error.message }
    : { exists: true, error: null };
}

async function applyReviews(reviews, tableStatus) {
  const result = {
    mode: "apply",
    durable_storage: tableStatus.exists,
    requested: reviews.length,
    upserted: 0,
    errors: [],
  };
  if (!tableStatus.exists) {
    result.errors.push({
      table: "growth_ai_reviews",
      message: tableStatus.error,
    });
    return result;
  }
  for (const review of reviews) {
    const row = toAiReviewRow(review);
    const { error } = await sb
      .from("growth_ai_reviews")
      .upsert(row, { onConflict: "website_id,review_key" });
    if (error)
      result.errors.push({
        review_key: row.review_key,
        message: error.message,
      });
    else result.upserted += 1;
  }
  return result;
}

function toAiReviewRow(review) {
  return {
    account_id: accountId,
    website_id: websiteId,
    backlog_item_id: review.backlog_item_id,
    candidate_id: review.candidate_id,
    review_key: review.review_key,
    model:
      review.mode === "llm"
        ? (process.env.OPENROUTER_MODEL ?? "unknown")
        : "heuristic-fallback",
    prompt_version: PROMPT_VERSION,
    config_version: CONFIG_VERSION,
    confidence_score: review.confidence,
    recommendation: review.decision,
    risks: review.risks,
    status: statusForDecision(review.decision),
    evidence: {
      source: "evaluate-growth-candidates-llm",
      mode: review.mode,
      source_table: review.source_table,
      source_id: review.source_id,
      agent_lane: review.agent_lane,
      agent_lane_label: review.agent_lane_label,
      blocker_type: review.blocker_type,
      competitive_advantage: review.competitive_advantage,
      missing_evidence: review.missing_evidence,
      next_action: review.next_action,
      specific_next_action: review.specific_next_action,
      why_not_promote: review.why_not_promote,
      human_review_focus: review.human_review_focus,
      would_auto_apply_if_allowed: review.would_auto_apply_if_allowed,
      required_human_review: review.required_human_review,
      automation_eligible: review.automation_eligible,
      allowed_action: review.allowed_action,
      automation_reason: review.automation_reason,
      automation_confidence_threshold: automationThreshold,
      content_gate: review.content_gate,
    },
  };
}

function statusForDecision(decision) {
  if (decision === "promote") return "pass";
  if (decision === "block") return "blocked";
  if (decision === "reject") return "rejected";
  return "watch";
}

function sanitizeSource(source) {
  return {
    source_table: source.source_table,
    id: source.id,
    title: source.title,
    entity_key: source.entity_key,
    work_type: source.work_type,
    status: source.status,
    baseline: source.baseline,
    hypothesis: source.hypothesis,
    next_action: source.next_action,
    priority_score: source.priority_score,
    confidence_score: source.confidence_score,
    source_profiles: source.source_profiles,
    source_fact_refs: source.source_fact_refs,
    evidence: source.evidence,
  };
}

function renderMarkdown(report) {
  return `# Growth AI Reviews

Mode: \`${report.mode}\`  
Generated: ${report.generated_at}  
LLM enabled: \`${report.llm_enabled}\`
Automation threshold: \`${report.automation_confidence_threshold}\`

## Counts

${renderTable(
  Object.entries(report.counts).map(([metric, count]) => ({ metric, count })),
  [
    { label: "Metric", value: (row) => row.metric },
    { label: "Count", value: (row) => row.count },
  ],
)}

## Reviews

${renderTable(report.reviews, [
  { label: "Decision", value: (row) => row.decision },
  { label: "Allowed", value: (row) => row.allowed_action },
  { label: "Lane", value: (row) => row.agent_lane_label },
  { label: "Confidence", value: (row) => row.confidence },
  { label: "Source", value: (row) => row.source_table },
  { label: "Title", value: (row) => row.title },
  { label: "Risks", value: (row) => row.risks.join(", ") },
  {
    label: "Missing",
    value: (row) => (row.missing_evidence ?? []).join(", "),
  },
  { label: "Specific next action", value: (row) => row.specific_next_action },
])}
`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
