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
const apply = args.apply === "true";
const websiteId = args.websiteId ?? DEFAULT_WEBSITE_ID;
const outDir =
  args.outDir ?? path.join("artifacts/seo", `${today()}-growth-blocked-items`);
const sb = getSupabase();

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const { data: backlogItems, error } = await sb
    .from("growth_backlog_items")
    .select("*")
    .eq("website_id", websiteId)
    .eq("status", "blocked")
    .limit(100);
  if (error) throw new Error(error.message);
  const contentTasks = await fetchBlockedContentTasks();

  const classifications = [
    ...(backlogItems ?? []).map((row) => classify(row, "growth_backlog_items")),
    ...contentTasks.map((row) => classify(row, "growth_content_tasks")),
  ];
  const applyResult = apply
    ? await applyClassifications(classifications)
    : { mode: "dry-run", rows: classifications.length };
  const report = {
    generated_at: new Date().toISOString(),
    mode: apply ? "apply" : "dry-run",
    website_id: websiteId,
    counts: {
      blocked_items: classifications.length,
      locale_gate_required: classifications.filter(
        (row) => row.blocker_type === "locale_gate_required",
      ).length,
      tracking_or_attribution: classifications.filter(
        (row) => row.blocker_type === "tracking_or_attribution",
      ).length,
      provider_or_access: classifications.filter(
        (row) => row.blocker_type === "provider_or_access",
      ).length,
      technical_or_route_mapping: classifications.filter(
        (row) => row.blocker_type === "technical_or_route_mapping",
      ).length,
      content_quality: classifications.filter(
        (row) => row.blocker_type === "content_quality",
      ).length,
      experiment_readiness: classifications.filter(
        (row) => row.blocker_type === "experiment_readiness",
      ).length,
      needs_manual_review: classifications.filter(
        (row) => row.blocker_type === "needs_manual_review",
      ).length,
    },
    apply_result: applyResult,
    classifications,
  };

  await writeArtifacts(
    outDir,
    "growth-blocked-items",
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

function classify(row, sourceTable) {
  const classification = classifyAgentLane(row);
  return {
    source_table: sourceTable,
    id: row.id,
    item_key: row.item_key ?? row.task_key,
    title: row.title,
    entity_key: row.entity_key,
    work_type: row.work_type ?? row.task_type,
    owner_issue: row.owner_issue,
    agent_lane: classification.agent_lane,
    agent_lane_label: laneLabel(classification.agent_lane),
    blocker_type: classification.blocker_type,
    routing_confidence: classification.routing_confidence,
    blocked_reason: classification.blocked_reason,
    next_action: classification.next_action,
    evidence: row.evidence ?? {},
  };
}

async function applyClassifications(classifications) {
  const result = {
    mode: "apply",
    requested_updates: classifications.length,
    updated: 0,
    errors: [],
  };
  for (const row of classifications) {
    const table = row.source_table;
    const patch =
      table === "growth_backlog_items"
        ? {
            blocked_reason: row.blocked_reason,
            evidence: {
              ...row.evidence,
              blocked_classification: blockedClassification(row),
            },
          }
        : {
            next_action: row.next_action,
            evidence: {
              ...row.evidence,
              blocked_classification: blockedClassification(row),
            },
          };
    const { error } = await sb.from(table).update(patch).eq("id", row.id);
    if (error)
      result.errors.push({ table, id: row.id, message: error.message });
    else result.updated += 1;
  }
  return result;
}

function blockedClassification(row) {
  return {
    classified_at: new Date().toISOString(),
    agent_lane: row.agent_lane,
    agent_lane_label: row.agent_lane_label,
    blocker_type: row.blocker_type,
    routing_confidence: row.routing_confidence,
    blocked_reason: row.blocked_reason,
    next_action: row.next_action,
  };
}

async function fetchBlockedContentTasks() {
  const { error, data } = await sb
    .from("growth_content_tasks")
    .select("*")
    .eq("website_id", websiteId)
    .eq("status", "blocked")
    .limit(100);
  if (error) {
    return [];
  }
  return data ?? [];
}

function renderMarkdown(report) {
  return `# Growth Blocked Items Classification

Mode: \`${report.mode}\`  
Generated: ${report.generated_at}

## Counts

${renderTable(
  Object.entries(report.counts).map(([metric, count]) => ({ metric, count })),
  [
    { label: "Metric", value: (row) => row.metric },
    { label: "Count", value: (row) => row.count },
  ],
)}

## Classifications

${renderTable(report.classifications, [
  { label: "Lane", value: (row) => row.agent_lane_label },
  { label: "Type", value: (row) => row.blocker_type },
  { label: "Source", value: (row) => row.source_table },
  { label: "Issue", value: (row) => row.owner_issue },
  { label: "URL", value: (row) => row.entity_key },
  { label: "Reason", value: (row) => row.blocked_reason },
])}
`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
