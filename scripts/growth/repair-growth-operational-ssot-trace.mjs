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

const args = parseArgs(process.argv.slice(2));
const apply = args.apply === "true";
const websiteId = args.websiteId ?? DEFAULT_WEBSITE_ID;
const outDir =
  args.outDir ??
  path.join("artifacts/seo", `${today()}-growth-operational-ssot-trace-repair`);
const sb = getSupabase();

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const [items, candidates] = await Promise.all([
    fetchAll("growth_backlog_items", 5000),
    fetchAll("growth_backlog_candidates", 20000),
  ]);
  const candidatesById = new Map(candidates.rows.map((row) => [row.id, row]));
  const candidateIdsWithItems = new Set(
    items.rows.map((row) => row.candidate_id).filter(Boolean),
  );

  const itemUpdates = items.rows
    .filter((row) => row.candidate_id)
    .filter(
      (row) =>
        !Array.isArray(row.evidence?.source_candidate_ids) ||
        !row.evidence.source_candidate_ids.includes(row.candidate_id),
    )
    .map((row) => ({
      id: row.id,
      evidence: {
        ...(row.evidence ?? {}),
        source_candidate_ids: [
          ...new Set([
            ...(Array.isArray(row.evidence?.source_candidate_ids)
              ? row.evidence.source_candidate_ids
              : []),
            row.candidate_id,
          ]),
        ],
        source_trace: {
          ...(row.evidence?.source_trace ?? {}),
          repaired_at: new Date().toISOString(),
          mode: "repair-growth-operational-ssot-trace",
          note: "Backfilled source_candidate_ids from candidate_id without changing operational status.",
        },
      },
    }));

  const candidateUpdates = [...candidateIdsWithItems]
    .map((candidateId) => {
      const item = items.rows.find((row) => row.candidate_id === candidateId);
      const candidate = candidatesById.get(candidateId);
      if (!candidate || !item) return null;
      const trace = candidate.evidence?.promotion_trace;
      if (
        normalizeStatus(candidate.status) === "promoted" &&
        trace?.backlog_item_id === item.id
      ) {
        return null;
      }
      return {
        id: candidate.id,
        status: "promoted",
        evidence: {
          ...(candidate.evidence ?? {}),
          promotion_trace: {
            ...(trace ?? {}),
            repaired_at: new Date().toISOString(),
            mode: "repair-growth-operational-ssot-trace",
            backlog_item_id: item.id,
            backlog_item_key: item.item_key,
            backlog_item_status: item.status,
            note: "Existing backlog item owns this candidate; no item status was changed.",
          },
        },
      };
    })
    .filter(Boolean);

  const applyResult = apply
    ? await applyUpdates({ itemUpdates, candidateUpdates })
    : {
        mode: "dry-run",
        item_updates: itemUpdates.length,
        candidate_updates: candidateUpdates.length,
      };

  const report = {
    generated_at: new Date().toISOString(),
    mode: apply ? "apply" : "dry-run",
    website_id: websiteId,
    counts: {
      items_read: items.rows.length,
      candidates_read: candidates.rows.length,
      item_trace_updates: itemUpdates.length,
      candidate_promotion_updates: candidateUpdates.length,
    },
    apply_result: applyResult,
    samples: {
      item_updates: itemUpdates.slice(0, 20),
      candidate_updates: candidateUpdates.slice(0, 20),
    },
    source_errors: {
      growth_backlog_items: items.error,
      growth_backlog_candidates: candidates.error,
    },
  };

  await writeArtifacts(
    outDir,
    "growth-operational-ssot-trace-repair",
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

async function applyUpdates({ itemUpdates, candidateUpdates }) {
  const result = {
    mode: "apply",
    item_updates_requested: itemUpdates.length,
    candidate_updates_requested: candidateUpdates.length,
    updated: 0,
    errors: [],
  };
  for (const update of itemUpdates) {
    const { error } = await sb
      .from("growth_backlog_items")
      .update({ evidence: update.evidence })
      .eq("id", update.id);
    if (error)
      result.errors.push({
        table: "growth_backlog_items",
        id: update.id,
        message: error.message,
      });
    else result.updated += 1;
  }
  for (const update of candidateUpdates) {
    const { error } = await sb
      .from("growth_backlog_candidates")
      .update({ status: update.status, evidence: update.evidence })
      .eq("id", update.id);
    if (error)
      result.errors.push({
        table: "growth_backlog_candidates",
        id: update.id,
        message: error.message,
      });
    else result.updated += 1;
  }
  return result;
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

function normalizeStatus(status) {
  return String(status ?? "unknown").toLowerCase();
}

function renderMarkdown(report) {
  return `# Growth Operational SSOT Trace Repair

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

## Policy

- Existing backlog item statuses are preserved.
- Existing item evidence is merged, not replaced.
- Candidates linked to accepted items are marked \`promoted\`.
- Promotion trace points from candidate to item.
`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
