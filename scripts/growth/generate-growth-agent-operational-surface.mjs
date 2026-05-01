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
import { classifyAgentLane, laneLabel } from "./growth-agent-lanes-lib.mjs";

const args = parseArgs(process.argv.slice(2));
const websiteId = args.websiteId ?? DEFAULT_WEBSITE_ID;
const limit = Number(args.limit ?? 500);
const outDir =
  args.outDir ??
  path.join("artifacts/seo", `${today()}-growth-agent-operational-surface`);
const sb = getSupabase();

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const [items, tasks, experiments, aiReviews, humanReviews] =
    await Promise.all([
      fetchRows("growth_backlog_items", limit),
      fetchRows("growth_content_tasks", limit),
      fetchRows("growth_experiments", limit),
      fetchRows("growth_ai_reviews", limit),
      fetchRows("growth_human_reviews", limit),
    ]);

  const latestAiReview = latestReviewIndex(aiReviews.rows);
  const latestHumanReview = latestReviewIndex(humanReviews.rows);
  const rows = [
    ...items.rows.map((row) =>
      surfaceRow(
        "growth_backlog_items",
        row,
        latestAiReview,
        latestHumanReview,
      ),
    ),
    ...tasks.rows.map((row) =>
      surfaceRow(
        "growth_content_tasks",
        row,
        latestAiReview,
        latestHumanReview,
      ),
    ),
    ...experiments.rows.map((row) =>
      surfaceRow("growth_experiments", row, latestAiReview, latestHumanReview),
    ),
  ].sort(
    (a, b) =>
      statusRank(a.operational_status) - statusRank(b.operational_status) ||
      Number(b.priority_score ?? 0) - Number(a.priority_score ?? 0),
  );

  const report = {
    generated_at: new Date().toISOString(),
    website_id: websiteId,
    schema_version: "growth-agent-operational-surface-v1",
    purpose:
      "Shape for future Bukeer Studio operational Growth UI. This artifact is read-only and contains no raw provider payloads.",
    source_errors: {
      growth_backlog_items: items.error,
      growth_content_tasks: tasks.error,
      growth_experiments: experiments.error,
      growth_ai_reviews: aiReviews.error,
      growth_human_reviews: humanReviews.error,
    },
    counts: {
      rows: rows.length,
      blocked: rows.filter((row) => row.operational_status === "blocked")
        .length,
      ready: rows.filter((row) => row.operational_status === "ready").length,
      watch: rows.filter((row) => row.operational_status === "watch").length,
      active: rows.filter((row) => row.operational_status === "active").length,
      done: rows.filter((row) => row.operational_status === "done").length,
    },
    distributions: {
      by_lane: countBy(rows, (row) => row.agent_lane_label),
      by_status: countBy(rows, (row) => row.operational_status),
      by_source_table: countBy(rows, (row) => row.source_table),
    },
    ui_contract: {
      primary_grouping: "agent_lane",
      secondary_grouping: "operational_status",
      required_columns: [
        "title",
        "entity_key",
        "source_table",
        "agent_lane",
        "operational_status",
        "blocked_reason",
        "next_action",
        "ai_review",
        "human_review",
        "council_readiness",
        "content_task_state",
      ],
    },
    rows,
  };

  await writeArtifacts(
    outDir,
    "growth-agent-operational-surface",
    report,
    renderMarkdown(report),
  );
  console.log(
    JSON.stringify(
      {
        outDir,
        counts: report.counts,
        distributions: report.distributions,
      },
      null,
      2,
    ),
  );
}

async function fetchRows(table, maxRows) {
  const { data, error } = await sb
    .from(table)
    .select("*")
    .eq("website_id", websiteId)
    .limit(maxRows);
  return { rows: data ?? [], error: error?.message ?? null };
}

function latestReviewIndex(rows) {
  const map = new Map();
  for (const row of rows ?? []) {
    for (const key of reviewKeys(row)) {
      const current = map.get(key);
      if (
        !current ||
        dateValue(row.created_at) > dateValue(current.created_at)
      ) {
        map.set(key, row);
      }
    }
  }
  return map;
}

function reviewKeys(row) {
  return [
    row.backlog_item_id ? `growth_backlog_items:${row.backlog_item_id}` : null,
    row.candidate_id ? `growth_backlog_candidates:${row.candidate_id}` : null,
    row.experiment_id ? `growth_experiments:${row.experiment_id}` : null,
  ].filter(Boolean);
}

function surfaceRow(sourceTable, row, aiReviews, humanReviews) {
  const routing = classifyAgentLane({ ...row, source_table: sourceTable });
  const key = `${sourceTable}:${row.id}`;
  const aiReview = aiReviews.get(key);
  const humanReview = humanReviews.get(key);
  return {
    id: row.id,
    source_table: sourceTable,
    title: row.title ?? row.name ?? row.item_key ?? row.task_key,
    entity_key: row.entity_key ?? row.source_url ?? null,
    work_type: row.work_type ?? row.task_type ?? null,
    priority_score: Number(row.priority_score ?? 0),
    status: row.status ?? row.task_status,
    operational_status: operationalStatus(sourceTable, row),
    agent_lane: routing.agent_lane,
    agent_lane_label: laneLabel(routing.agent_lane),
    blocker_type: routing.blocker_type,
    blocked_reason:
      row.blocked_reason ??
      row.evidence?.blocked_classification?.blocked_reason ??
      row.evidence?.content_task?.content_gate?.missing?.join(", ") ??
      null,
    next_action:
      row.next_action ??
      row.evidence?.blocked_classification?.next_action ??
      row.evidence?.content_task?.next_action ??
      routing.next_action,
    council_readiness: councilReadiness(row),
    content_task_state: contentTaskState(sourceTable, row),
    ai_review: aiReview
      ? {
          recommendation: aiReview.recommendation,
          status: aiReview.status,
          confidence_score: aiReview.confidence_score,
          allowed_action: aiReview.evidence?.allowed_action,
          reason: aiReview.evidence?.automation_reason,
        }
      : null,
    human_review: humanReview
      ? {
          decision: humanReview.decision,
          reviewer_role: humanReview.reviewer_role,
          status: humanReview.status,
          rationale: humanReview.rationale,
        }
      : null,
  };
}

function operationalStatus(sourceTable, row) {
  const status = normalize(row.task_status ?? row.status);
  if (["active", "planned", "approved", "measuring"].includes(status)) {
    return "active";
  }
  if (["done", "closed", "resolved"].includes(status)) return "done";
  if (["blocked", "locale_qa_required"].includes(status)) return "blocked";
  if (["watch", "paused"].includes(status)) return "watch";
  if (
    [
      "ready_for_council",
      "approved_for_execution",
      "ready_for_seo_qa",
      "queued",
    ].includes(status)
  ) {
    return "ready";
  }
  if (sourceTable === "growth_content_tasks" && status === "drafting") {
    return "watch";
  }
  return "watch";
}

function councilReadiness(row) {
  const missing = [
    ["baseline", row.baseline],
    ["hypothesis", row.hypothesis],
    ["owner_issue", row.owner_issue],
    ["success_metric", row.success_metric],
    ["evaluation_date", row.evaluation_date],
    ["independence_key", row.independence_key],
  ]
    .filter(([, value]) => !value)
    .map(([field]) => field);
  return {
    status: missing.length ? "blocked" : "ready",
    missing,
  };
}

function contentTaskState(sourceTable, row) {
  if (sourceTable === "growth_content_tasks") {
    return {
      task_status: row.task_status ?? row.status,
      locale_gate_required: Boolean(row.locale_gate_required),
      target_locale: row.target_locale ?? row.locale ?? null,
    };
  }
  const task = row.evidence?.content_task;
  if (!task) return null;
  return {
    task_status: task.task_status,
    locale_gate_required: Boolean(task.locale_gate_required),
    target_locale: task.target_locale ?? null,
  };
}

function statusRank(status) {
  return { blocked: 0, ready: 1, active: 2, watch: 3, done: 4 }[status] ?? 5;
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
  return `# Growth Agent Operational Surface

Generated: ${report.generated_at}  
Schema: \`${report.schema_version}\`

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

## Rows

${renderTable(report.rows.slice(0, 100), [
  { label: "Status", value: (row) => row.operational_status },
  { label: "Lane", value: (row) => row.agent_lane_label },
  { label: "Source", value: (row) => row.source_table },
  { label: "Title", value: (row) => row.title },
  { label: "Next", value: (row) => row.next_action },
])}
`;
}

function dateValue(value) {
  const date = new Date(value ?? 0).getTime();
  return Number.isFinite(date) ? date : 0;
}

function normalize(value) {
  return String(value ?? "").toLowerCase();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
