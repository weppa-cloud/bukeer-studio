#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const DEFAULT_WEBSITE_ID = "894545b7-73ca-4dae-b76a-da5b6a3f8441";
const ACTIVE_EXPERIMENT_STATUSES = new Set([
  "approved",
  "planned",
  "active",
  "measuring",
]);
const CLOSED_EXPERIMENT_STATUSES = new Set([
  "closed",
  "complete",
  "completed",
  "win",
  "loss",
  "inconclusive",
  "paused",
  "stopped",
  "scaled",
]);

const args = parseArgs(process.argv.slice(2));
const apply = args.apply === "true";
const dryRun = !apply;
const websiteId = args.websiteId ?? DEFAULT_WEBSITE_ID;
const limit = Number(args.limit ?? 1000);
const staleDays = Number(args.staleDays ?? 45);
const minPriority = Number(args.minPriority ?? 1);
const minConfidence = Number(args.minConfidence ?? 0.7);
const outDir =
  args.outDir ??
  path.join("artifacts/seo", `${todayIso()}-growth-unified-backlog-validation`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const sb = getSupabase();
  const [candidates, items, experiments] = await Promise.all([
    fetchRows(sb, "growth_backlog_candidates", { websiteId, limit }),
    fetchRows(sb, "growth_backlog_items", { websiteId, limit }),
    fetchRows(sb, "growth_experiments", { websiteId, limit }),
  ]);

  const activeExperiments = experiments.rows.filter((row) =>
    isActiveExperiment(row),
  );
  const activeKeys = new Set(
    activeExperiments
      .map((row) => normalizeKey(row.independence_key))
      .filter(Boolean),
  );
  const activeBacklogItemIds = new Set(
    activeExperiments.map((row) => row.backlog_item_id).filter(Boolean),
  );
  const readyItemKeyCounts = countKeys(
    items.rows
      .filter((row) =>
        ["ready_for_council", "approved_for_execution"].includes(
          normalizeStatus(row.status),
        ),
      )
      .map((row) => normalizeKey(row.independence_key))
      .filter(Boolean),
  );

  const candidateResults = candidates.rows.map((row) => classifyCandidate(row));
  const itemResults = items.rows.map((row) =>
    classifyItem(row, activeKeys, readyItemKeyCounts, activeBacklogItemIds),
  );
  const experimentResults = experiments.rows.map((row) =>
    classifyExperiment(row, activeExperiments),
  );
  const sourceHealth = sourceStatus({ candidates, items, experiments });
  const applyResult = apply
    ? await applyConservativeDemotions(
        sb,
        { candidateResults, itemResults },
        { candidates, items },
      )
    : {
        mode: "dry-run",
        updated: 0,
        skipped: "Pass --apply true to persist conservative demotions only.",
      };

  const report = {
    generated_at: new Date().toISOString(),
    mode: dryRun ? "dry-run" : "apply",
    website_id: websiteId,
    rules: {
      stale_days: staleDays,
      min_priority: minPriority,
      min_confidence: minConfidence,
      active_experiment_statuses: [...ACTIVE_EXPERIMENT_STATUSES],
      validation_policy:
        "Scripts may demote objectively invalid rows to watch/blocked/rejected. Promotion to reviewed item or experiment remains manual/Council-owned.",
    },
    source_health: sourceHealth,
    input_counts: {
      growth_backlog_candidates: candidates.rows.length,
      growth_backlog_items: items.rows.length,
      growth_experiments: experiments.rows.length,
    },
    counts: {
      candidates: countDecisions(candidateResults),
      items: countDecisions(itemResults),
      experiments: countDecisions(experimentResults),
      collisions: itemResults.filter((row) => row.decision === "collision")
        .length,
      stale: [...candidateResults, ...itemResults].filter(
        (row) => row.decision === "stale",
      ).length,
      missing_baseline: [
        ...candidateResults,
        ...itemResults,
        ...experimentResults,
      ].filter((row) => row.reasons.includes("missing_baseline")).length,
    },
    apply_result: applyResult,
    candidates: candidateResults,
    items: itemResults,
    experiments: experimentResults,
    source_errors: {
      growth_backlog_candidates: candidates.error,
      growth_backlog_items: items.error,
      growth_experiments: experiments.error,
    },
  };

  await writeArtifacts(
    outDir,
    "growth-unified-backlog-validation",
    report,
    renderMarkdown(report),
  );
  console.log(
    JSON.stringify(
      {
        mode: report.mode,
        outDir,
        source_health: sourceHealth.status,
        counts: report.counts,
        apply_result: applyResult,
      },
      null,
      2,
    ),
  );
}

function classifyCandidate(row) {
  const reasons = [];
  const status = normalizeStatus(row.status);
  const sourceRefs = asArray(row.source_fact_refs);
  const sourceProfiles = asArray(row.source_profiles);

  if (!sourceRefs.length) reasons.push("missing_source_fact_refs");
  if (!sourceProfiles.length) reasons.push("missing_source_profiles");
  if (!hasValue(row.baseline)) reasons.push("missing_baseline");
  if (!hasValue(row.next_action)) reasons.push("missing_next_action");
  if (Number(row.priority_score ?? 0) < minPriority)
    reasons.push("low_priority");
  if (Number(row.confidence_score ?? 0) < minConfidence)
    reasons.push("low_confidence");
  if (["BLOCKED", "blocked"].includes(row.freshness_status))
    reasons.push("freshness_blocked");
  if (["WATCH", "watch"].includes(row.freshness_status))
    reasons.push("freshness_watch");
  if (["BLOCKED", "blocked"].includes(row.quality_status))
    reasons.push("quality_blocked");
  if (["BLOCKED", "blocked"].includes(row.correlation_status))
    reasons.push("correlation_blocked");
  if (isStale(row)) reasons.push("stale_evidence");
  if (status === "rejected") reasons.push("already_rejected");
  if (status === "blocked") reasons.push("already_blocked");

  const decision = decide({
    status,
    reasons,
    readyLabel: "promotable",
    blockedReasons: [
      "missing_source_fact_refs",
      "missing_source_profiles",
      "missing_next_action",
      "freshness_blocked",
      "quality_blocked",
      "correlation_blocked",
    ],
  });

  return compactResult(row, {
    type: "candidate",
    key: row.candidate_key,
    decision,
    reasons,
  });
}

function classifyItem(
  row,
  activeKeys,
  readyItemKeyCounts,
  activeBacklogItemIds,
) {
  const reasons = [];
  const status = normalizeStatus(row.status);
  const independenceKey = normalizeKey(row.independence_key);
  const councilEligible = [
    "ready_for_council",
    "approved_for_execution",
  ].includes(status);

  if (!hasValue(row.baseline)) reasons.push("missing_baseline");
  if (!hasValue(row.hypothesis)) reasons.push("missing_hypothesis");
  if (!hasValue(row.owner_issue) && !hasValue(row.owner))
    reasons.push("missing_owner_issue");
  if (!hasValue(row.success_metric)) reasons.push("missing_success_metric");
  if (!hasValue(row.evaluation_date)) reasons.push("missing_evaluation_date");
  if (!independenceKey) reasons.push("missing_independence_key");
  if (
    councilEligible &&
    independenceKey &&
    activeKeys.has(independenceKey) &&
    !activeBacklogItemIds.has(row.id)
  )
    reasons.push("active_experiment_collision");
  if (independenceKey && (readyItemKeyCounts.get(independenceKey) ?? 0) > 1) {
    reasons.push("backlog_item_collision");
  }
  if (!asArray(row.source_fact_refs).length && !hasValue(row.candidate_id))
    reasons.push("missing_source_reference");
  if (isStale(row)) reasons.push("stale_evidence");
  if (status === "rejected") reasons.push("already_rejected");
  if (status === "blocked") reasons.push("already_blocked");

  const decision = decide({
    status,
    reasons,
    readyLabel: "promotable",
    collisionReasons: ["active_experiment_collision", "backlog_item_collision"],
    blockedReasons: [
      "missing_hypothesis",
      "missing_owner_issue",
      "missing_success_metric",
      "missing_evaluation_date",
      "missing_independence_key",
      "missing_source_reference",
    ],
  });

  return compactResult(row, {
    type: "item",
    key: row.item_key,
    decision,
    reasons,
  });
}

function classifyExperiment(row, activeExperiments) {
  const reasons = [];
  const status = normalizeStatus(row.status);
  const independenceKey = normalizeKey(row.independence_key);
  const collisionCount = activeExperiments.filter(
    (experiment) =>
      normalizeKey(experiment.independence_key) === independenceKey,
  ).length;

  if (!hasValue(row.baseline)) reasons.push("missing_baseline");
  if (!hasValue(row.hypothesis)) reasons.push("missing_hypothesis");
  if (!hasValue(row.owner_issue) && !hasValue(row.owner))
    reasons.push("missing_owner_issue");
  if (!hasValue(row.success_metric)) reasons.push("missing_success_metric");
  if (!hasValue(row.evaluation_date)) reasons.push("missing_evaluation_date");
  if (!independenceKey) reasons.push("missing_independence_key");
  if (independenceKey && isActiveExperiment(row) && collisionCount > 1)
    reasons.push("active_experiment_collision");

  let decision = "watch";
  if (CLOSED_EXPERIMENT_STATUSES.has(status)) decision = "closed";
  else if (reasons.includes("active_experiment_collision"))
    decision = "collision";
  else if (reasons.includes("missing_baseline")) decision = "missing_baseline";
  else if (reasons.length) decision = "blocked";
  else if (isActiveExperiment(row)) decision = "active";

  return compactResult(row, {
    type: "experiment",
    key: row.experiment_key ?? row.experiment_id,
    decision,
    reasons,
  });
}

function decide({
  status,
  reasons,
  readyLabel,
  blockedReasons,
  collisionReasons = [],
}) {
  if (status === "rejected" || reasons.includes("already_rejected"))
    return "rejected";
  if (collisionReasons.some((reason) => reasons.includes(reason)))
    return "collision";
  if (reasons.includes("missing_baseline")) return "missing_baseline";
  if (reasons.includes("stale_evidence")) return "stale";
  if (
    status === "blocked" ||
    blockedReasons.some((reason) => reasons.includes(reason))
  )
    return "blocked";
  if (reasons.length) return "watch";
  return readyLabel;
}

async function applyConservativeDemotions(sb, resultsByTable, sourcesByTable) {
  const updates = [];
  for (const result of resultsByTable.candidateResults) {
    const source = sourcesByTable.candidates.rows.find(
      (row) => row.id === result.id,
    );
    const nextStatus = conservativeStatus(result);
    if (
      source?.id &&
      nextStatus &&
      normalizeStatus(source.status) !== nextStatus
    ) {
      updates.push({
        table: "growth_backlog_candidates",
        id: source.id,
        status: nextStatus,
      });
    }
  }
  for (const result of resultsByTable.itemResults) {
    const source = sourcesByTable.items.rows.find(
      (row) => row.id === result.id,
    );
    const nextStatus = conservativeStatus(result);
    if (
      source?.id &&
      nextStatus &&
      normalizeStatus(source.status) !== nextStatus
    ) {
      updates.push({
        table: "growth_backlog_items",
        id: source.id,
        status: nextStatus,
      });
    }
  }

  const out = {
    mode: "apply",
    requested_updates: updates.length,
    updated: 0,
    errors: [],
  };
  for (const update of updates) {
    const { error } = await sb
      .from(update.table)
      .update({ status: update.status })
      .eq("id", update.id);
    if (error)
      out.errors.push({
        table: update.table,
        id: update.id,
        message: error.message,
      });
    else out.updated += 1;
  }
  return out;
}

function conservativeStatus(result) {
  if (result.decision === "rejected") return "rejected";
  if (["blocked", "collision", "missing_baseline"].includes(result.decision))
    return "blocked";
  if (["stale", "watch"].includes(result.decision)) return "watch";
  return null;
}

async function fetchRows(
  sb,
  table,
  { websiteId: targetWebsiteId, limit: maxRows },
) {
  let query = sb.from(table).select("*");
  if (targetWebsiteId) query = query.eq("website_id", targetWebsiteId);
  const { data, error } = await query.limit(maxRows);
  if (error) return { rows: [], error: error.message };
  return { rows: data ?? [], error: null };
}

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRole) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  return createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function writeArtifacts(targetDir, basename, json, markdown) {
  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(
    path.join(targetDir, `${basename}.json`),
    `${JSON.stringify(json, null, 2)}\n`,
  );
  await fs.writeFile(path.join(targetDir, `${basename}.md`), markdown);
}

function renderMarkdown(report) {
  return `# Growth Unified Backlog Validation

Mode: \`${report.mode}\`  
Generated: ${report.generated_at}  
Website: \`${report.website_id}\`  
Source health: \`${report.source_health.status}\`

## Counts

### Candidates

${renderTable(decisionRows(report.counts.candidates), [
  { label: "Decision", value: (row) => row.decision },
  { label: "Count", value: (row) => row.count },
])}

### Items

${renderTable(decisionRows(report.counts.items), [
  { label: "Decision", value: (row) => row.decision },
  { label: "Count", value: (row) => row.count },
])}

### Experiments

${renderTable(decisionRows(report.counts.experiments), [
  { label: "Decision", value: (row) => row.decision },
  { label: "Count", value: (row) => row.count },
])}

## Gate

Rows missing baseline, source refs, owner, success metric, evaluation date, or independence key are not Council-ready. Independence collisions block promotion. Stale evidence is WATCH until refreshed.

## Top Issues

${renderTable(
  [...report.candidates, ...report.items, ...report.experiments]
    .filter((row) => row.reasons.length)
    .slice(0, 50),
  [
    { label: "Type", value: (row) => row.type },
    { label: "Decision", value: (row) => row.decision },
    { label: "Title", value: (row) => row.title },
    { label: "Reasons", value: (row) => row.reasons.join(", ") },
  ],
)}
`;
}

function compactResult(row, overrides) {
  return {
    type: overrides.type,
    id: row.id,
    key: overrides.key,
    title:
      row.title ??
      row.name ??
      row.hypothesis ??
      row.item_key ??
      row.candidate_key ??
      row.experiment_key,
    status: row.status,
    priority_score: row.priority_score,
    confidence_score: row.confidence_score,
    independence_key: row.independence_key,
    decision: overrides.decision,
    reasons: overrides.reasons,
    updated_at: row.updated_at,
    window_end: row.window_end,
  };
}

function sourceStatus(sources) {
  const errors = Object.entries(sources)
    .filter(([, source]) => source.error)
    .map(([table, source]) => ({ table, error: source.error }));
  return {
    status: errors.length ? "BLOCKED" : "PASS",
    errors,
  };
}

function countDecisions(rows) {
  return rows.reduce((acc, row) => {
    acc[row.decision] = (acc[row.decision] ?? 0) + 1;
    return acc;
  }, {});
}

function countKeys(keys) {
  return keys.reduce(
    (acc, key) => acc.set(key, (acc.get(key) ?? 0) + 1),
    new Map(),
  );
}

function decisionRows(counts) {
  return Object.entries(counts).map(([decision, count]) => ({
    decision,
    count,
  }));
}

function renderTable(rows, columns) {
  if (!rows.length) return "_No rows._\n";
  const header = `| ${columns.map((column) => column.label).join(" | ")} |`;
  const separator = `| ${columns.map(() => "---").join(" | ")} |`;
  const body = rows
    .map(
      (row) =>
        `| ${columns.map((column) => escapeCell(column.value(row))).join(" | ")} |`,
    )
    .join("\n");
  return `${header}\n${separator}\n${body}\n`;
}

function parseArgs(argv) {
  const parsed = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) parsed[key] = "true";
    else {
      parsed[key] = next;
      i += 1;
    }
  }
  return parsed;
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
}

function isActiveExperiment(row) {
  return ACTIVE_EXPERIMENT_STATUSES.has(normalizeStatus(row.status));
}

function isStale(row) {
  const value =
    row.window_end ?? row.updated_at ?? row.observed_at ?? row.created_at;
  if (!value) return true;
  const ts = new Date(value).getTime();
  if (!Number.isFinite(ts)) return true;
  return (Date.now() - ts) / 86_400_000 > staleDays;
}

function hasValue(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function normalizeStatus(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function normalizeKey(value) {
  const text = String(value ?? "")
    .trim()
    .toLowerCase();
  return text || null;
}

function escapeCell(value) {
  return String(value ?? "")
    .replaceAll("|", "\\|")
    .replaceAll("\n", " ");
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
