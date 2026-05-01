#!/usr/bin/env node

import path from "node:path";
import process from "node:process";
import {
  DEFAULT_WEBSITE_ID,
  getSupabase,
  parseArgs,
  renderTable,
  writeArtifacts,
} from "../seo/growth-unified-backlog-lib.mjs";
import {
  AGENT_LANES,
  classifyAgentLane,
  contentQualityGate,
  isContentLike,
  laneLabel,
} from "./growth-agent-lanes-lib.mjs";

const args = parseArgs(process.argv.slice(2));
const websiteId = args.websiteId ?? DEFAULT_WEBSITE_ID;
const limit = Number(args.limit ?? 50);
const evalSetVersion =
  args.evalSetVersion ?? `growth-agent-human-eval-${today()}-v1`;
const outDir =
  args.outDir ?? path.join("artifacts/seo", `${today()}-growth-agent-eval-set`);
const sb = getSupabase();

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const [items, candidates, tasks, experiments, humanReviews] =
    await Promise.all([
      fetchAll("growth_backlog_items", 5000),
      fetchAll("growth_backlog_candidates", 12000),
      fetchAll("growth_content_tasks", 1000),
      fetchAll("growth_experiments", 1000),
      fetchAll("growth_human_reviews", 2000),
    ]);

  const humanReviewIndex = indexHumanReviews(humanReviews.rows);
  const pools = [
    ...items.rows.map((row) =>
      expectedFromSource("growth_backlog_items", row, humanReviewIndex),
    ),
    ...candidates.rows.map((row) =>
      expectedFromSource("growth_backlog_candidates", row, humanReviewIndex),
    ),
    ...tasks.rows.map((row) =>
      expectedFromSource("growth_content_tasks", row, humanReviewIndex),
    ),
    ...experiments.rows.map((row) =>
      expectedFromSource("growth_experiments", row, humanReviewIndex),
    ),
  ].filter(Boolean);

  const sample = balancedSample(pools, limit);
  const report = {
    generated_at: new Date().toISOString(),
    mode: "dry-run",
    website_id: websiteId,
    eval_set_version: evalSetVersion,
    policy:
      "Human baseline for LLM evaluator agreement. This artifact does not publish, activate or mutate operational work.",
    source_errors: {
      growth_backlog_items: items.error,
      growth_backlog_candidates: candidates.error,
      growth_content_tasks: tasks.error,
      growth_experiments: experiments.error,
      growth_human_reviews: humanReviews.error,
    },
    counts: {
      rows_considered: pools.length,
      sample_size: sample.length,
      lanes_covered: Object.keys(countBy(sample, (row) => row.agent_lane_label))
        .length,
      expected_promote: sample.filter(
        (row) => row.expected_decision === "promote",
      ).length,
      expected_watch: sample.filter((row) => row.expected_decision === "watch")
        .length,
      expected_block: sample.filter((row) => row.expected_decision === "block")
        .length,
      expected_reject: sample.filter(
        (row) => row.expected_decision === "reject",
      ).length,
    },
    distributions: {
      by_lane: countBy(sample, (row) => row.agent_lane_label),
      by_expected_decision: countBy(sample, (row) => row.expected_decision),
      by_source_table: countBy(sample, (row) => row.source_table),
    },
    sample,
  };

  await writeArtifacts(
    outDir,
    "growth-agent-eval-set",
    report,
    renderMarkdown(report),
  );
  console.log(
    JSON.stringify(
      {
        outDir,
        eval_set_version: evalSetVersion,
        counts: report.counts,
        distributions: report.distributions,
      },
      null,
      2,
    ),
  );
}

async function fetchAll(table, limit) {
  const pageSize = 1000;
  const rows = [];
  for (let from = 0; from < limit; from += pageSize) {
    const to = Math.min(from + pageSize - 1, limit - 1);
    const { data, error } = await sb
      .from(table)
      .select("*")
      .eq("website_id", websiteId)
      .range(from, to);
    if (error) return { rows, error: error.message };
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return { rows, error: null };
}

function indexHumanReviews(rows) {
  const index = new Map();
  for (const review of rows ?? []) {
    for (const key of reviewKeysForReview(review)) {
      if (!index.has(key)) index.set(key, []);
      index.get(key).push(review);
    }
  }
  return index;
}

function reviewKeysForReview(review) {
  return [
    review.backlog_item_id
      ? `growth_backlog_items:${review.backlog_item_id}`
      : null,
    review.candidate_id
      ? `growth_backlog_candidates:${review.candidate_id}`
      : null,
    review.experiment_id ? `growth_experiments:${review.experiment_id}` : null,
  ].filter(Boolean);
}

function expectedFromSource(sourceTable, row, humanReviewIndex) {
  if (!row?.id) return null;
  const routing = classifyAgentLane({ ...row, source_table: sourceTable });
  const contentGate = isContentLike(row) ? contentQualityGate(row) : null;
  const reviews = humanReviewIndex.get(`${sourceTable}:${row.id}`) ?? [];
  const human = reviews[0] ?? null;
  const expected = inferExpectedDecision(
    sourceTable,
    row,
    routing,
    contentGate,
    human,
  );
  if (!expected) return null;

  return {
    id: row.id,
    source_id: row.id,
    source_table: sourceTable,
    title: row.title ?? row.name ?? row.item_key ?? row.candidate_key,
    entity_key: row.entity_key ?? row.source_url ?? null,
    status: row.status,
    work_type: row.work_type ?? row.task_type ?? null,
    priority_score: Number(row.priority_score ?? 0),
    confidence_score: Number(row.confidence_score ?? 0),
    agent_lane: routing.agent_lane,
    agent_lane_label: laneLabel(routing.agent_lane),
    blocker_type: routing.blocker_type,
    expected_decision: expected.decision,
    expected_allowed_action: expected.allowed_action,
    reviewer_role: expected.reviewer_role,
    rationale: expected.rationale,
    expected_source: expected.source,
    expected_confidence: expected.confidence,
    content_gate_missing: contentGate?.missing ?? [],
    source_fact_refs: row.source_fact_refs ?? [],
    baseline: row.baseline ?? null,
    next_action: row.next_action ?? null,
  };
}

function inferExpectedDecision(sourceTable, row, routing, contentGate, human) {
  if (human) {
    return fromHumanReview(human);
  }

  const status = normalize(row.status);
  if (sourceTable === "growth_experiments") {
    if (["approved", "planned", "active", "measuring"].includes(status)) {
      return expected(
        "promote",
        "prepare_for_human",
        "Growth Council",
        "Council-approved experiment has already passed human governance; evaluator should recognize readiness but not auto-activate.",
        "council_experiment",
        0.95,
      );
    }
    if (["paused", "closed", "done"].includes(status)) {
      return expected(
        "watch",
        "watch",
        "Growth Council",
        "Experiment is historical or not active; keep as learning context.",
        "experiment_status",
        0.82,
      );
    }
  }

  if (sourceTable === "growth_content_tasks") {
    const taskStatus = normalize(row.task_status ?? row.status);
    if (taskStatus === "ready_for_seo_qa") {
      return expected(
        "promote",
        "prepare_for_human",
        "Content Curator",
        "Task is ready for human SEO QA; content is not auto-published.",
        "content_task_status",
        0.9,
      );
    }
    if (taskStatus === "locale_qa_required") {
      return expected(
        "watch",
        "watch",
        "Transcreation Growth Agent",
        "Locale quality gate is pending; keep out of publish/sitemap flow.",
        "content_task_status",
        0.86,
      );
    }
    if (taskStatus === "blocked") {
      return expected(
        "block",
        "block",
        "Content Curator",
        "Content task is blocked by missing quality or competitive evidence.",
        "content_task_status",
        0.9,
      );
    }
  }

  if (status === "blocked") {
    return expected(
      "block",
      "block",
      laneLabel(routing.agent_lane),
      row.blocked_reason ??
        routing.blocked_reason ??
        "Blocked operational row should remain blocked until owner resolves evidence/dependency.",
      "status_blocked",
      0.88,
    );
  }

  if (contentGate?.missing?.length) {
    return expected(
      "block",
      "block",
      "Content Curator",
      `Content quality gate missing: ${contentGate.missing.join(", ")}.`,
      "content_gate",
      0.88,
    );
  }

  if (status === "watch") {
    return expected(
      "watch",
      "watch",
      laneLabel(routing.agent_lane),
      "WATCH rows are useful signals but lack enough evidence for execution.",
      "status_watch",
      0.8,
    );
  }

  if (["ready_for_council", "approved_for_execution"].includes(status)) {
    const missing = missingCouncilFields(row);
    if (missing.length) {
      return expected(
        "block",
        "block",
        "Content Curator + Council Operator",
        `Council row is missing required fields: ${missing.join(", ")}.`,
        "council_fields",
        0.9,
      );
    }
    if (
      routing.blocker_type === "tracking_or_attribution" &&
      !hasHumanApproval(row)
    ) {
      return expected(
        "watch",
        "watch",
        "Growth Orchestrator",
        "Council fields are present, but first-party funnel/CRM attribution must be confirmed before promotion.",
        "tracking_gate",
        0.84,
      );
    }
    if (
      routing.blocker_type === "technical_or_route_mapping" &&
      !hasTechnicalSmoke(row)
    ) {
      return expected(
        "watch",
        "watch",
        "Technical Remediation Agent",
        "Council fields are present, but technical smoke or recrawl evidence is still required before promotion.",
        "technical_smoke_gate",
        0.84,
      );
    }
    if (
      [AGENT_LANES.CREATOR, AGENT_LANES.TRANSCREATION].includes(
        routing.agent_lane,
      ) &&
      !hasHumanApproval(row)
    ) {
      return expected(
        routing.blocker_type === "locale_gate_required" ? "watch" : "block",
        routing.blocker_type === "locale_gate_required" ? "watch" : "block",
        laneLabel(routing.agent_lane),
        "Content/transcreation rows require Curator approval and competitive/locale quality evidence before promotion.",
        "content_curator_gate",
        0.88,
      );
    }
    return expected(
      "promote",
      "prepare_for_human",
      "Content Curator + Council Operator",
      "Council-ready row has source row, baseline, owner, success metric and evaluation date; human Council still approves.",
      "council_ready",
      0.9,
    );
  }

  if (
    ["candidate", "queued", "ready_for_brief", "brief_in_progress"].includes(
      status,
    )
  ) {
    return expected(
      "watch",
      "watch",
      laneLabel(routing.agent_lane),
      "Candidate or brief row should remain in preparation until evidence/review is complete.",
      "preparation_status",
      0.76,
    );
  }

  return null;
}

function hasHumanApproval(row) {
  const evidence = row.evidence ?? {};
  return Boolean(
    evidence.council_approval ??
    evidence.human_review?.decision === "approve" ??
    evidence.curator_review?.approved,
  );
}

function hasTechnicalSmoke(row) {
  const evidence = row.evidence ?? {};
  return Boolean(
    evidence.technical_smoke ??
    evidence.smoke ??
    evidence.recrawl_diff ??
    evidence.remediation_smoke,
  );
}

function fromHumanReview(review) {
  const decisionMap = {
    approve: "promote",
    block: "block",
    reject: "reject",
    watch: "watch",
  };
  const decision = decisionMap[normalize(review.decision)] ?? "watch";
  return expected(
    decision,
    actionForDecision(decision),
    review.reviewer_role ?? "Human Reviewer",
    review.rationale ?? "Human review decision.",
    "growth_human_reviews",
    0.95,
  );
}

function expected(
  decision,
  allowedAction,
  reviewerRole,
  rationale,
  source,
  confidence,
) {
  return {
    decision,
    allowed_action: allowedAction,
    reviewer_role: reviewerRole,
    rationale,
    source,
    confidence,
  };
}

function actionForDecision(decision) {
  if (decision === "promote") return "prepare_for_human";
  return decision;
}

function balancedSample(rows, maxRows) {
  const laneOrder = [
    AGENT_LANES.ORCHESTRATOR,
    AGENT_LANES.TECHNICAL,
    AGENT_LANES.TRANSCREATION,
    AGENT_LANES.CREATOR,
    AGENT_LANES.CURATOR,
  ];
  const perLane = Math.max(1, Math.ceil(maxRows / laneOrder.length));
  const selected = [];
  const seen = new Set();
  for (const lane of laneOrder) {
    const laneRows = rows
      .filter((row) => row.agent_lane === lane)
      .sort(scoreForSampling)
      .slice(0, perLane);
    for (const row of laneRows) {
      const key = `${row.source_table}:${row.source_id}`;
      if (!seen.has(key) && selected.length < maxRows) {
        selected.push(row);
        seen.add(key);
      }
    }
  }
  for (const row of rows.sort(scoreForSampling)) {
    const key = `${row.source_table}:${row.source_id}`;
    if (!seen.has(key) && selected.length < maxRows) {
      selected.push(row);
      seen.add(key);
    }
  }
  return selected;
}

function scoreForSampling(a, b) {
  return (
    expectedRank(a.expected_decision) - expectedRank(b.expected_decision) ||
    Number(b.priority_score ?? 0) - Number(a.priority_score ?? 0)
  );
}

function expectedRank(value) {
  return { promote: 0, block: 1, watch: 2, reject: 3 }[value] ?? 4;
}

function missingCouncilFields(row) {
  return [
    ["baseline", row.baseline],
    ["hypothesis", row.hypothesis],
    ["owner_issue", row.owner_issue],
    ["success_metric", row.success_metric],
    ["evaluation_date", row.evaluation_date],
    ["independence_key", row.independence_key],
  ]
    .filter(([, value]) => !value)
    .map(([field]) => field);
}

function countBy(rows, keyFn) {
  return Object.fromEntries(
    [
      ...rows.reduce((map, row) => {
        const key = keyFn(row) ?? "unknown";
        map.set(key, (map.get(key) ?? 0) + 1);
        return map;
      }, new Map()),
    ].sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
  );
}

function renderMarkdown(report) {
  return `# Growth Agent Human Eval Set

Version: \`${report.eval_set_version}\`  
Generated: ${report.generated_at}

## Counts

${renderTable(
  Object.entries(report.counts).map(([metric, count]) => ({ metric, count })),
  [
    { label: "Metric", value: (row) => row.metric },
    { label: "Count", value: (row) => row.count },
  ],
)}

## By Lane

${renderTable(
  Object.entries(report.distributions.by_lane).map(([lane, count]) => ({
    lane,
    count,
  })),
  [
    { label: "Lane", value: (row) => row.lane },
    { label: "Count", value: (row) => row.count },
  ],
)}

## Sample

${renderTable(report.sample, [
  { label: "Expected", value: (row) => row.expected_decision },
  { label: "Allowed", value: (row) => row.expected_allowed_action },
  { label: "Lane", value: (row) => row.agent_lane_label },
  { label: "Source", value: (row) => row.source_table },
  { label: "Title", value: (row) => row.title },
  { label: "Rationale", value: (row) => row.rationale },
])}
`;
}

function normalize(value) {
  return String(value ?? "").toLowerCase();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
