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
const websiteId = args.websiteId ?? DEFAULT_WEBSITE_ID;
const outDir =
  args.outDir ??
  path.join("artifacts/seo", `${today()}-growth-operational-ssot-health`);
const candidateLimit = Number(args.candidateLimit ?? 20000);
const itemLimit = Number(args.itemLimit ?? 5000);
const sb = getSupabase();

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const [candidates, items, experiments] = await Promise.all([
    fetchAll("growth_backlog_candidates", candidateLimit),
    fetchAll("growth_backlog_items", itemLimit),
    fetchAll("growth_experiments", itemLimit),
  ]);

  const itemByPrimaryCandidate = new Map(
    items.rows
      .filter((row) => row.candidate_id)
      .map((row) => [row.candidate_id, row]),
  );
  const itemBySourceCandidate = new Map();
  for (const item of items.rows) {
    for (const candidateId of sourceCandidateIds(item)) {
      if (!itemBySourceCandidate.has(candidateId)) {
        itemBySourceCandidate.set(candidateId, []);
      }
      itemBySourceCandidate.get(candidateId).push(item);
    }
  }

  const promotedCandidates = candidates.rows.filter(
    (row) => normalizeStatus(row.status) === "promoted",
  );
  const promotedWithoutItem = promotedCandidates.filter(
    (row) =>
      !itemByPrimaryCandidate.has(row.id) && !itemBySourceCandidate.has(row.id),
  );
  const itemsMissingCandidateTrace = items.rows.filter(
    (row) => !row.candidate_id && !sourceCandidateIds(row).length,
  );
  const itemsMissingSourceFacts = items.rows.filter(
    (row) =>
      !Array.isArray(row.source_fact_refs) || !row.source_fact_refs.length,
  );
  const briefItems = items.rows.filter((row) => row.evidence?.content_brief);
  const briefItemsMissingArtifact = briefItems.filter(
    (row) => !row.evidence?.content_brief?.artifact,
  );
  const councilReady = items.rows.filter((row) =>
    ["ready_for_council", "approved_for_execution"].includes(
      normalizeStatus(row.status),
    ),
  );
  const councilReadyBlocked = councilReady.filter(
    (row) =>
      !row.baseline ||
      !row.hypothesis ||
      !row.owner_issue ||
      !row.success_metric ||
      !row.evaluation_date ||
      !row.independence_key,
  );
  const activeExperiments = experiments.rows.filter((row) =>
    ["approved", "planned", "active", "measuring"].includes(
      normalizeStatus(row.status),
    ),
  );

  const blockers = [];
  if (promotedWithoutItem.length)
    blockers.push("promoted_candidate_without_item");
  if (itemsMissingCandidateTrace.length)
    blockers.push("item_missing_candidate_trace");
  if (itemsMissingSourceFacts.length)
    blockers.push("item_missing_source_fact_refs");
  if (briefItemsMissingArtifact.length) blockers.push("brief_missing_artifact");
  if (councilReadyBlocked.length)
    blockers.push("council_ready_missing_required_fields");

  const report = {
    generated_at: new Date().toISOString(),
    website_id: websiteId,
    status: blockers.length ? "WATCH" : "PASS",
    blockers,
    rules: {
      github: "implementation SSOT",
      supabase: "operational Growth SSOT",
      scripts: "generate candidates and artifacts only",
      reviewer: "promotes reviewed backlog items",
      council: "approves active experiments",
    },
    counts: {
      candidates: candidates.rows.length,
      items: items.rows.length,
      experiments: experiments.rows.length,
      promoted_candidates: promotedCandidates.length,
      promoted_candidates_without_item: promotedWithoutItem.length,
      items_missing_candidate_trace: itemsMissingCandidateTrace.length,
      items_missing_source_fact_refs: itemsMissingSourceFacts.length,
      content_briefs: briefItems.length,
      content_briefs_missing_artifact: briefItemsMissingArtifact.length,
      council_ready_items: councilReady.length,
      council_ready_missing_required_fields: councilReadyBlocked.length,
      active_experiments: activeExperiments.length,
    },
    distributions: {
      candidates_by_status: countBy(candidates.rows, (row) =>
        normalizeStatus(row.status),
      ),
      items_by_status: countBy(items.rows, (row) =>
        normalizeStatus(row.status),
      ),
      items_by_work_type: countBy(
        items.rows,
        (row) => row.work_type ?? "unknown",
      ),
      experiments_by_status: countBy(experiments.rows, (row) =>
        normalizeStatus(row.status),
      ),
    },
    samples: {
      promoted_candidates_without_item: promotedWithoutItem.slice(0, 20),
      items_missing_candidate_trace: itemsMissingCandidateTrace.slice(0, 20),
      items_missing_source_fact_refs: itemsMissingSourceFacts.slice(0, 20),
      council_ready_missing_required_fields: councilReadyBlocked.slice(0, 20),
    },
    source_errors: {
      growth_backlog_candidates: candidates.error,
      growth_backlog_items: items.error,
      growth_experiments: experiments.error,
    },
  };

  await writeArtifacts(
    outDir,
    "growth-operational-ssot-health",
    report,
    renderMarkdown(report),
  );
  console.log(
    JSON.stringify(
      {
        status: report.status,
        outDir,
        counts: report.counts,
        blockers,
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

function sourceCandidateIds(row) {
  return Array.isArray(row.evidence?.source_candidate_ids)
    ? row.evidence.source_candidate_ids.filter(Boolean)
    : [];
}

function normalizeStatus(status) {
  return String(status ?? "unknown").toLowerCase();
}

function countBy(rows, keyFn) {
  return Object.fromEntries(
    [
      ...rows.reduce((map, row) => {
        const key = keyFn(row);
        map.set(key, (map.get(key) ?? 0) + 1);
        return map;
      }, new Map()),
    ].sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
  );
}

function renderMarkdown(report) {
  return `# Growth Operational SSOT Health

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

## Blockers

${report.blockers.length ? report.blockers.map((row) => `- ${row}`).join("\n") : "- none"}

## Candidate Status

${renderTable(
  Object.entries(report.distributions.candidates_by_status).map(
    ([status, count]) => ({ status, count }),
  ),
  [
    { label: "Status", value: (row) => row.status },
    { label: "Count", value: (row) => row.count },
  ],
)}

## Item Status

${renderTable(
  Object.entries(report.distributions.items_by_status).map(
    ([status, count]) => ({
      status,
      count,
    }),
  ),
  [
    { label: "Status", value: (row) => row.status },
    { label: "Count", value: (row) => row.count },
  ],
)}
`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
