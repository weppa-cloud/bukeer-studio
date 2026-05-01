#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  DEFAULT_ACCOUNT_ID,
  DEFAULT_WEBSITE_ID,
  fingerprint,
  getSupabase,
  parseArgs,
  renderTable,
  writeArtifacts,
} from "../seo/growth-unified-backlog-lib.mjs";

const args = parseArgs(process.argv.slice(2));
const apply = args.apply === "true";
const websiteId = args.websiteId ?? DEFAULT_WEBSITE_ID;
const accountId = args.accountId ?? DEFAULT_ACCOUNT_ID;
const packetPath =
  args.packet ??
  "artifacts/seo/2026-05-01-growth-council-packet-ssot/growth-council-packet.json";
const outDir =
  args.outDir ??
  path.join("artifacts/seo", `${today()}-growth-council-approval`);
const status = args.status ?? "approved";
const sb = getSupabase();

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const packet = JSON.parse(await fs.readFile(packetPath, "utf8"));
  const selected = (packet.proposed_experiments ?? []).slice(0, 5);
  const rows = selected.map(toExperimentRow);
  const applyResult = apply
    ? await applyExperiments(rows, selected)
    : {
        mode: "dry-run",
        experiments: rows.length,
        item_updates: selected.length,
      };
  const report = {
    generated_at: new Date().toISOString(),
    mode: apply ? "apply" : "dry-run",
    website_id: websiteId,
    packet_path: packetPath,
    status,
    counts: {
      selected_experiments: selected.length,
      rows_prepared: rows.length,
    },
    apply_result: applyResult,
    selected_experiments: selected,
    rows,
  };

  await writeArtifacts(
    outDir,
    "growth-council-approval",
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

function toExperimentRow(item) {
  const experimentKey = fingerprint("growth-experiment", websiteId, item.id);
  return {
    account_id: accountId,
    website_id: websiteId,
    backlog_item_id: item.id,
    experiment_key: experimentKey,
    name: item.title,
    hypothesis: item.hypothesis,
    baseline: item.baseline,
    owner_role: "Growth Council",
    owner_issue: item.owner_issue,
    success_metric: item.success_metric,
    guardrail_metric:
      "No regression in qualified lead rate, technical SEO health or localized content quality.",
    start_date: today(),
    evaluation_date: dateOnly(item.evaluation_date),
    status,
    independence_key: item.independence_key,
    source_fact_refs: item.source_fact_refs ?? [],
    decision_log: {
      approved_at: new Date().toISOString(),
      approved_by: "Growth Council",
      source_packet: packetPath,
      source_backlog_item_id: item.id,
      source_backlog_item_key: item.item_key,
      policy:
        "Approved from Council PASS packet; max five active/planned independent experiments.",
    },
  };
}

async function applyExperiments(rows, selected) {
  const result = {
    mode: "apply",
    experiments_requested: rows.length,
    experiments_upserted: 0,
    item_updates_requested: selected.length,
    item_updates: 0,
    dropped_columns: [],
    errors: [],
  };

  for (const row of rows) {
    const { ok, droppedColumns, error } = await insertOrUpdateExperiment(row);
    result.dropped_columns.push(...droppedColumns);
    if (!ok) result.errors.push(error);
    else result.experiments_upserted += 1;
  }

  for (const item of selected) {
    const existing = await readItem(item.id);
    if (!existing) {
      result.errors.push({
        table: "growth_backlog_items",
        id: item.id,
        message: "item not found",
      });
      continue;
    }
    const { error } = await sb
      .from("growth_backlog_items")
      .update({
        status: "approved_for_execution",
        evidence: {
          ...(existing.evidence ?? {}),
          council_approval: {
            approved_at: new Date().toISOString(),
            status,
            packet: packetPath,
            experiment_key: fingerprint(
              "growth-experiment",
              websiteId,
              item.id,
            ),
            note: "Council approved as one of the five independent planned experiments.",
          },
        },
      })
      .eq("id", item.id);
    if (error)
      result.errors.push({
        table: "growth_backlog_items",
        id: item.id,
        message: error.message,
      });
    else result.item_updates += 1;
  }
  result.dropped_columns = [...new Set(result.dropped_columns)];
  return result;
}

async function insertOrUpdateExperiment(row) {
  let mutable = { ...row };
  const droppedColumns = [];
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const existing = await findExperiment(mutable);
    const response = existing
      ? await sb
          .from("growth_experiments")
          .update(mutable)
          .eq("id", existing.id)
      : await sb.from("growth_experiments").insert(mutable);
    if (!response.error) return { ok: true, droppedColumns, error: null };
    const missingColumn =
      response.error.message.match(/'([^']+)' column/u)?.[1];
    if (!missingColumn || !(missingColumn in mutable)) {
      return {
        ok: false,
        droppedColumns,
        error: {
          experiment_key: row.experiment_key,
          message: response.error.message,
        },
      };
    }
    delete mutable[missingColumn];
    droppedColumns.push(missingColumn);
  }
  return {
    ok: false,
    droppedColumns,
    error: {
      experiment_key: row.experiment_key,
      message: "schema fallback attempts exhausted",
    },
  };
}

async function findExperiment(row) {
  const { data, error } = await sb
    .from("growth_experiments")
    .select("id")
    .eq("website_id", websiteId)
    .eq("experiment_key", row.experiment_key)
    .maybeSingle();
  if (error) return null;
  return data;
}

async function readItem(id) {
  const { data } = await sb
    .from("growth_backlog_items")
    .select("id,evidence")
    .eq("id", id)
    .maybeSingle();
  return data;
}

function renderMarkdown(report) {
  return `# Growth Council Approval

Mode: \`${report.mode}\`  
Status: \`${report.status}\`  
Generated: ${report.generated_at}

## Counts

${renderTable(
  Object.entries(report.counts).map(([metric, count]) => ({ metric, count })),
  [
    { label: "Metric", value: (row) => row.metric },
    { label: "Count", value: (row) => row.count },
  ],
)}

## Selected

${renderTable(report.selected_experiments, [
  { label: "Item", value: (row) => row.title },
  { label: "Metric", value: (row) => row.success_metric },
  { label: "Evaluation", value: (row) => row.evaluation_date },
])}
`;
}

function dateOnly(value) {
  return String(value ?? today()).slice(0, 10);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
