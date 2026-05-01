#!/usr/bin/env node

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

const PROMPT_VERSION = "growth-agent-evaluator-v1";
const CONFIG_VERSION = "agent-lanes-2026-content-standard-v1";
const args = parseArgs(process.argv.slice(2));
const apply = args.apply === "true";
const websiteId = args.websiteId ?? DEFAULT_WEBSITE_ID;
const accountId = args.accountId ?? DEFAULT_ACCOUNT_ID;
const limit = Number(args.limit ?? 20);
const useLlm = args.llm !== "false";
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
  const [candidates, items, tableStatus] = await Promise.all([
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
    detectTable("growth_ai_reviews"),
  ]);

  const sourceRows = [...candidates, ...items]
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
    required_human_review: true,
  };
}

async function callLlm(source, routing, contentGate) {
  const baseUrl =
    process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
  const model = process.env.OPENROUTER_MODEL || "anthropic/claude-sonnet-4-5";
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
                risks: ["string"],
                next_action: "string",
                required_human_review: "boolean",
              },
              rules: [
                "Block content without project preference fit, SERP intent, competitor coverage, ColombiaTours added value, E-E-A-T, Who/How/Why, scaled-content risk review or Curator review.",
                `Only low-risk, reversible or smoke-verifiable technical optimizations may be auto_apply, and only when confidence >= ${automationThreshold}.`,
                "Content, transcreation, experiment activation and paid/campaign mutation must be prepare_for_human even if confidence is high.",
                "Never treat AI-generated content as approved without Curator review.",
              ],
              source: sanitizeSource(source),
              deterministic_routing: routing,
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
    risks: Array.isArray(review?.risks) ? review.risks : [],
    next_action: review?.next_action ?? source.next_action ?? "Human review.",
    required_human_review: review?.required_human_review !== false,
    automation_eligible: Boolean(review?.automation_eligible),
    allowed_action: review?.allowed_action ?? "prepare_for_human",
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
      next_action: review.next_action,
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
])}
`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
