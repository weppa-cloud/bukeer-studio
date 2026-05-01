#!/usr/bin/env node

import path from "node:path";
import process from "node:process";
import {
  DEFAULT_WEBSITE_ID,
  fetchRows,
  getSupabase,
  parseArgs,
  renderTable,
  writeArtifacts,
} from "../seo/growth-unified-backlog-lib.mjs";

const args = parseArgs(process.argv.slice(2));
const apply = args.apply === "true";
const websiteId = args.websiteId ?? DEFAULT_WEBSITE_ID;
const limit = Number(args.limit ?? 1000);
const evaluationDate = args.evaluationDate ?? daysFromNow(14);
const outDir =
  args.outDir ??
  path.join("artifacts/seo", `${today()}-growth-blocked-cleanup`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const sb = getSupabase();
  const items = await fetchRows(sb, "growth_backlog_items", "*", {
    websiteId,
    limit,
    orderBy: "priority_score",
  });
  if (items.error) throw new Error(items.error);

  const blocked = items.rows.filter(
    (row) => normalize(row.status) === "blocked",
  );
  const decisions = blocked.map((row) => decide(row, evaluationDate));
  const updates = decisions.map((row) => row.update).filter(Boolean);
  const applyResult = apply
    ? await applyUpdates(sb, updates)
    : {
        mode: "dry-run",
        updates: updates.length,
      };
  const report = {
    generated_at: new Date().toISOString(),
    mode: apply ? "apply" : "dry-run",
    website_id: websiteId,
    evaluation_date: evaluationDate,
    counts: {
      blocked_read: blocked.length,
      updates: updates.length,
      no_change: decisions.filter((row) => !row.update).length,
      by_decision: countBy(decisions, (row) => row.decision),
    },
    apply_result: applyResult,
    decisions,
  };

  await writeArtifacts(
    outDir,
    "growth-blocked-cleanup",
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

function decide(row, fallbackEvaluationDate) {
  const missing = missingCouncilFields(row);
  const hasOnlyMissingEvaluation =
    missing.length === 1 && missing[0] === "evaluation_date";
  const hasNoMissing = missing.length === 0;
  const decision = hasNoMissing
    ? "unblock_ready_for_council"
    : hasOnlyMissingEvaluation
      ? "unblock_queued_with_evaluation_date"
      : "keep_blocked";
  const update =
    decision === "unblock_ready_for_council"
      ? {
          id: row.id,
          status: "ready_for_council",
          blocked_reason: null,
        }
      : decision === "unblock_queued_with_evaluation_date"
        ? {
            id: row.id,
            status: "queued",
            evaluation_date: fallbackEvaluationDate,
            blocked_reason: null,
          }
        : null;

  return {
    id: row.id,
    status: row.status,
    work_type: row.work_type,
    title: row.title,
    entity_key: row.entity_key,
    priority_score: Number(row.priority_score ?? 0),
    confidence_score: Number(row.confidence_score ?? 0),
    owner_issue: row.owner_issue,
    missing,
    decision,
    update,
  };
}

async function applyUpdates(sb, updates) {
  const result = {
    mode: "apply",
    requested_updates: updates.length,
    updated: 0,
    errors: [],
  };
  for (const update of updates) {
    const { id, ...patch } = update;
    const { error } = await sb
      .from("growth_backlog_items")
      .update(patch)
      .eq("id", id);
    if (error) result.errors.push({ id, message: error.message });
    else result.updated += 1;
  }
  return result;
}

function missingCouncilFields(row) {
  const missing = [];
  if (!hasValue(row.baseline)) missing.push("baseline");
  if (!hasValue(row.hypothesis)) missing.push("hypothesis");
  if (!hasValue(row.owner_issue) && !hasValue(row.owner)) missing.push("owner");
  if (!hasValue(row.success_metric)) missing.push("success_metric");
  if (!hasValue(row.evaluation_date)) missing.push("evaluation_date");
  if (!hasValue(row.independence_key)) missing.push("independence_key");
  if (!hasSource(row)) missing.push("source_reference");
  return missing;
}

function hasSource(row) {
  return (
    hasValue(row.candidate_id) ||
    (Array.isArray(row.source_fact_refs) && row.source_fact_refs.length > 0)
  );
}

function renderMarkdown(report) {
  return `# Growth Blocked Cleanup

Mode: \`${report.mode}\`  
Generated: ${report.generated_at}  
Evaluation date fallback: \`${report.evaluation_date}\`

## Counts

${renderTable(
  Object.entries(report.counts.by_decision).map(([decision, count]) => ({
    decision,
    count,
  })),
  [
    { label: "Decision", value: (row) => row.decision },
    { label: "Count", value: (row) => row.count },
  ],
)}

## Decisions

${renderTable(report.decisions, [
  { label: "Decision", value: (row) => row.decision },
  { label: "Type", value: (row) => row.work_type },
  { label: "Score", value: (row) => row.priority_score },
  { label: "Missing", value: (row) => row.missing.join(", ") },
  { label: "Title", value: (row) => row.title },
])}
`;
}

function countBy(rows, fn) {
  return rows.reduce((acc, row) => {
    const key = fn(row);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function hasValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function normalize(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function daysFromNow(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
