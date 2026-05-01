#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  DEFAULT_MAX_ACTIVE,
  DEFAULT_WEBSITE_ID,
  fetchRows,
  getSupabase,
  parseArgs,
  renderTable,
  writeArtifacts,
} from "../seo/growth-unified-backlog-lib.mjs";

const args = parseArgs(process.argv.slice(2));
const websiteId = args.websiteId ?? DEFAULT_WEBSITE_ID;
const limit = Number(args.limit ?? 1000);
const maxActive = Number(args.maxActive ?? DEFAULT_MAX_ACTIVE);
const packetDate = args.date ?? today();
const outDir =
  args.outDir ??
  path.join("artifacts/seo", `${packetDate}-growth-mass-execution-packet`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const sb = getSupabase();
  const [items, experiments] = await Promise.all([
    fetchRows(sb, "growth_backlog_items", "*", {
      websiteId,
      limit,
      orderBy: "priority_score",
    }),
    fetchRows(sb, "growth_experiments", "*", {
      websiteId,
      limit,
      orderBy: "created_at",
    }),
  ]);

  const activeExperiments = experiments.rows.filter((row) =>
    ["approved", "planned", "active", "measuring"].includes(
      normalizeStatus(row.status),
    ),
  );
  const evaluated = items.rows.map(evaluateItem);
  const blocked = evaluated.filter((row) => row.state_lane === "blocked");
  const queued = evaluated.filter((row) => row.state_lane === "queued");
  const ready = evaluated.filter(
    (row) => row.state_lane === "ready_for_council",
  );
  const proposedReadouts = selectReadouts(ready, maxActive);

  const report = {
    generated_at: new Date().toISOString(),
    packet_date: packetDate,
    website_id: websiteId,
    source_errors: {
      growth_backlog_items: items.error,
      growth_experiments: experiments.error,
    },
    baseline: {
      total_items: evaluated.length,
      active_experiments: activeExperiments.length,
      slots_available: Math.max(0, maxActive - activeExperiments.length),
      by_state: countBy(evaluated, (row) => row.state_lane),
      by_work_type: countBy(evaluated, (row) => row.work_type),
      by_state_and_type: countBy(
        evaluated,
        (row) => `${row.state_lane}/${row.work_type}`,
      ),
    },
    execution_lanes: {
      blocked_cleanup: blocked,
      operational_batches: queued,
      council_readouts: ready,
      proposed_readouts: proposedReadouts,
    },
    batch_plan: buildBatchPlan({ blocked, queued, ready, proposedReadouts }),
  };

  await writeArtifacts(
    outDir,
    "growth-mass-execution-packet",
    report,
    renderMarkdown(report),
  );
  await writeCsv(
    path.join(outDir, "blocked-cleanup.csv"),
    blocked,
    csvColumns(),
  );
  await writeCsv(
    path.join(outDir, "queued-operational-batches.csv"),
    queued,
    csvColumns(),
  );
  await writeCsv(
    path.join(outDir, "ready-for-council-readouts.csv"),
    ready,
    csvColumns(),
  );
  await writeCsv(
    path.join(outDir, "proposed-five-readouts.csv"),
    proposedReadouts,
    csvColumns(),
  );

  console.log(
    JSON.stringify(
      {
        outDir,
        counts: report.baseline,
        proposed_readouts: proposedReadouts.length,
        source_errors: report.source_errors,
      },
      null,
      2,
    ),
  );
}

function evaluateItem(row) {
  const status = normalizeStatus(row.status);
  const workType = row.work_type ?? "unknown";
  const stateLane = stateLaneFor(status);
  const executionLane = executionLaneFor(workType, stateLane);
  const missing = missingCouncilFields(row);
  const recommendedAction = recommendedActionFor(row, {
    stateLane,
    executionLane,
    missing,
  });

  return {
    id: row.id,
    item_key: row.item_key,
    status: row.status,
    state_lane: stateLane,
    work_type: workType,
    execution_lane: executionLane,
    title: row.title ?? row.hypothesis ?? row.entity_key ?? row.item_key,
    entity_type: row.entity_type,
    entity_key: row.entity_key,
    market: row.market,
    locale: row.locale,
    channel: row.channel,
    priority_score: Number(row.priority_score ?? 0),
    confidence_score: Number(row.confidence_score ?? 0),
    owner_issue: row.owner_issue,
    baseline: row.baseline,
    success_metric: row.success_metric,
    evaluation_date: row.evaluation_date,
    independence_key: row.independence_key,
    missing_council_fields: missing,
    recommended_action: recommendedAction,
  };
}

function stateLaneFor(status) {
  if (status === "blocked") return "blocked";
  if (status === "ready_for_council" || status === "approved_for_execution")
    return "ready_for_council";
  if (status === "rejected") return "rejected";
  if (status === "watch") return "watch";
  return "queued";
}

function executionLaneFor(workType, stateLane) {
  if (stateLane === "blocked") return "blocked_cleanup";
  if (stateLane === "ready_for_council") return "council_readout";
  if (workType === "technical_remediation") return "technical_fix_batch";
  if (
    [
      "seo_demand",
      "content_opportunity",
      "serp_competitor_opportunity",
    ].includes(workType)
  )
    return "seo_content_batch";
  if (["cro_activation", "tracking_attribution"].includes(workType))
    return "cro_tracking_batch";
  return "growth_refinement_batch";
}

function recommendedActionFor(row, { stateLane, executionLane, missing }) {
  if (stateLane === "blocked") {
    return missing.length
      ? `Unblock missing fields: ${missing.join(", ")}; otherwise move to WATCH/rejected with reason.`
      : "Review blocked reason and decide unblock, WATCH or rejected.";
  }
  if (stateLane === "ready_for_council") {
    return "Council reviews for one of the max five independent active readouts.";
  }
  if (executionLane === "technical_fix_batch") {
    return "Execute technical remediation directly; validate with smoke and next DataForSEO recrawl/diff.";
  }
  if (executionLane === "seo_content_batch") {
    return "Create/update brief or content; require quality/locale gate before publishing or measuring.";
  }
  if (executionLane === "cro_tracking_batch") {
    return "Execute only with tracking guard; validate CTA/WAFlow/funnel smoke before measurement.";
  }
  return "Refine into a concrete work type, owner and action before execution.";
}

function missingCouncilFields(row) {
  const missing = [];
  if (!hasValue(row.baseline)) missing.push("baseline");
  if (!hasValue(row.hypothesis)) missing.push("hypothesis");
  if (!hasValue(row.owner_issue) && !hasValue(row.owner)) missing.push("owner");
  if (!hasValue(row.success_metric)) missing.push("success_metric");
  if (!hasValue(row.evaluation_date)) missing.push("evaluation_date");
  if (!hasValue(row.independence_key)) missing.push("independence_key");
  return missing;
}

function selectReadouts(rows, maxActive) {
  const selected = [];
  const keys = new Set();
  for (const row of rows
    .filter((item) => item.missing_council_fields.length === 0)
    .toSorted((a, b) => {
      const priorityDelta = b.priority_score - a.priority_score;
      if (priorityDelta) return priorityDelta;
      return b.confidence_score - a.confidence_score;
    })) {
    if (!row.independence_key || keys.has(row.independence_key)) continue;
    selected.push(row);
    keys.add(row.independence_key);
    if (selected.length >= maxActive) break;
  }
  return selected;
}

function buildBatchPlan({ blocked, queued, ready, proposedReadouts }) {
  const queuedByLane = groupBy(queued, (row) => row.execution_lane);
  return [
    {
      order: 1,
      lane: "blocked_cleanup",
      count: blocked.length,
      objective: "Unblock, WATCH or reject before execution.",
      owner_issue: "#311",
    },
    {
      order: 2,
      lane: "technical_fix_batch",
      count: queuedByLane.technical_fix_batch?.length ?? 0,
      objective:
        "Resolve valid technical remediation without waiting for Council.",
      owner_issue: "#313",
    },
    {
      order: 3,
      lane: "seo_content_batch",
      count: queuedByLane.seo_content_batch?.length ?? 0,
      objective:
        "Prepare briefs/content updates with quality and locale gates.",
      owner_issue: "#314-#320",
    },
    {
      order: 4,
      lane: "cro_tracking_batch",
      count: queuedByLane.cro_tracking_batch?.length ?? 0,
      objective:
        "Execute activation/tracking-safe improvements with funnel smoke.",
      owner_issue: "#322",
    },
    {
      order: 5,
      lane: "growth_refinement_batch",
      count: queuedByLane.growth_refinement_batch?.length ?? 0,
      objective: "Refine generic opportunities into concrete executable work.",
      owner_issue: "#311/#321",
    },
    {
      order: 6,
      lane: "council_readouts",
      count: ready.length,
      proposed: proposedReadouts.length,
      objective: "Select at most five independent measurable readouts.",
      owner_issue: "#321",
    },
  ];
}

function renderMarkdown(report) {
  return `# Growth Mass Execution Packet

Generated: ${report.generated_at}  
Website: \`${report.website_id}\`

## Baseline

${renderTable(
  Object.entries(report.baseline.by_state).map(([state, count]) => ({
    state,
    count,
  })),
  [
    { label: "State", value: (row) => row.state },
    { label: "Count", value: (row) => row.count },
  ],
)}

## Batch Plan

${renderTable(report.batch_plan, [
  { label: "Order", value: (row) => row.order },
  { label: "Lane", value: (row) => row.lane },
  { label: "Count", value: (row) => row.count },
  { label: "Owner issue", value: (row) => row.owner_issue },
  { label: "Objective", value: (row) => row.objective },
])}

## Proposed Five Readouts

${renderTable(report.execution_lanes.proposed_readouts, [
  { label: "Score", value: (row) => row.priority_score },
  { label: "Type", value: (row) => row.work_type },
  { label: "Owner", value: (row) => row.owner_issue },
  { label: "Title", value: (row) => row.title },
  { label: "Evaluation", value: (row) => row.evaluation_date },
])}

## Blocked Cleanup Sample

${renderTable(report.execution_lanes.blocked_cleanup.slice(0, 20), [
  { label: "Type", value: (row) => row.work_type },
  { label: "Missing", value: (row) => row.missing_council_fields.join(", ") },
  { label: "Title", value: (row) => row.title },
  { label: "Action", value: (row) => row.recommended_action },
])}

## Operational Batch Sample

${renderTable(report.execution_lanes.operational_batches.slice(0, 30), [
  { label: "Lane", value: (row) => row.execution_lane },
  { label: "Score", value: (row) => row.priority_score },
  { label: "Owner", value: (row) => row.owner_issue },
  { label: "Title", value: (row) => row.title },
  { label: "Action", value: (row) => row.recommended_action },
])}
`;
}

function csvColumns() {
  return [
    "id",
    "status",
    "state_lane",
    "work_type",
    "execution_lane",
    "priority_score",
    "confidence_score",
    "owner_issue",
    "market",
    "locale",
    "channel",
    "entity_type",
    "entity_key",
    "title",
    "baseline",
    "success_metric",
    "evaluation_date",
    "independence_key",
    "missing_council_fields",
    "recommended_action",
  ];
}

async function writeCsv(filePath, rows, columns) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const header = columns.join(",");
  const body = rows
    .map((row) =>
      columns
        .map((column) => {
          const value = Array.isArray(row[column])
            ? row[column].join("; ")
            : row[column];
          return csvCell(value);
        })
        .join(","),
    )
    .join("\n");
  await fs.writeFile(filePath, `${header}\n${body}\n`);
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function countBy(rows, fn) {
  return rows.reduce((acc, row) => {
    const key = fn(row) ?? "unknown";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function groupBy(rows, fn) {
  return rows.reduce((acc, row) => {
    const key = fn(row) ?? "unknown";
    acc[key] = [...(acc[key] ?? []), row];
    return acc;
  }, {});
}

function hasValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function normalizeStatus(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
