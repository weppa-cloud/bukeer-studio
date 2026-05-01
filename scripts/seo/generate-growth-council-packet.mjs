#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import {
  classifyAgentLane,
  contentQualityGate,
  isContentLike,
  laneLabel,
} from "../growth/growth-agent-lanes-lib.mjs";

dotenv.config({ path: ".env.local" });

const DEFAULT_WEBSITE_ID = "894545b7-73ca-4dae-b76a-da5b6a3f8441";
const DEFAULT_MAX_ACTIVE = 5;
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
const COUNCIL_READY_STATUSES = new Set([
  "ready_for_council",
  "approved_for_execution",
]);
const WATCH_STATUSES = new Set([
  "queued",
  "ready_for_brief",
  "brief_in_progress",
  "watch",
]);
const SECRET_KEY_PATTERN =
  /(secret|token|password|authorization|auth|api[_-]?key|service[_-]?role)/i;

const args = parseArgs(process.argv.slice(2));
const websiteId = args.websiteId ?? DEFAULT_WEBSITE_ID;
const limit = Number(args.limit ?? 1000);
const maxActive = Number(args.maxActive ?? DEFAULT_MAX_ACTIVE);
const packetDate = args.date ?? todayIso();
const outDir =
  args.outDir ??
  path.join("artifacts/seo", `${packetDate}-growth-council-packet`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const sb = getSupabase();
  const [items, experiments] = await Promise.all([
    fetchRows(sb, "growth_backlog_items", { websiteId, limit }),
    fetchRows(sb, "growth_experiments", { websiteId, limit }),
  ]);

  const activeExperiments = experiments.rows.filter((row) =>
    ACTIVE_EXPERIMENT_STATUSES.has(normalizeStatus(row.status)),
  );
  const activeKeys = new Set(
    activeExperiments
      .map((row) => normalizeKey(row.independence_key))
      .filter(Boolean),
  );
  const activeBacklogItemIds = new Set(
    activeExperiments.map((row) => row.backlog_item_id).filter(Boolean),
  );
  const activeCollisions = collisionRows(activeExperiments);
  const itemEvaluations = items.rows.map((row) =>
    evaluateBacklogItem(row, activeKeys, activeBacklogItemIds),
  );
  const slotsAvailable = Math.max(0, maxActive - activeExperiments.length);
  const proposedExperiments = selectProposedExperiments(
    itemEvaluations,
    slotsAvailable,
  );
  const packetStatus = inferPacketStatus({
    sourceErrors: [items.error, experiments.error].filter(Boolean),
    activeExperimentCount: activeExperiments.length,
    activeCollisions,
    proposedExperiments,
    itemEvaluations,
  });

  const report = {
    generated_at: new Date().toISOString(),
    packet_date: packetDate,
    website_id: websiteId,
    status: packetStatus,
    rules: {
      max_active_independent_experiments: maxActive,
      slots_available: slotsAvailable,
      active_experiment_statuses: [...ACTIVE_EXPERIMENT_STATUSES],
      source_of_truth: "growth_backlog_items + growth_experiments",
      council_policy:
        "Council may approve at most the proposed independent items that fit remaining slots.",
    },
    counts: {
      active_experiments: activeExperiments.length,
      active_independence_collisions: activeCollisions.length,
      proposed_experiments: proposedExperiments.length,
      candidate_items: itemEvaluations.filter(
        (row) => row.decision === "candidate",
      ).length,
      watch_items: itemEvaluations.filter((row) => row.decision === "watch")
        .length,
      blocked_items: itemEvaluations.filter((row) => row.decision === "blocked")
        .length,
      rejected_items: itemEvaluations.filter(
        (row) => row.decision === "rejected",
      ).length,
      collision_items: itemEvaluations.filter(
        (row) => row.decision === "collision",
      ).length,
      closed_experiments: experiments.rows.filter((row) =>
        CLOSED_EXPERIMENT_STATUSES.has(normalizeStatus(row.status)),
      ).length,
    },
    lane_counts: countByLane(itemEvaluations),
    active_experiments: activeExperiments.map(packetExperiment),
    proposed_experiments: proposedExperiments,
    backlog_items: itemEvaluations,
    active_independence_collisions: activeCollisions.map(packetExperiment),
    source_errors: {
      growth_backlog_items: items.error,
      growth_experiments: experiments.error,
    },
  };

  await writeArtifacts(
    outDir,
    "growth-council-packet",
    report,
    renderMarkdown(report),
  );
  console.log(
    JSON.stringify(
      {
        status: report.status,
        outDir,
        maxActive,
        active_experiments: activeExperiments.length,
        proposed_experiments: proposedExperiments.length,
        source_errors: report.source_errors,
      },
      null,
      2,
    ),
  );
}

function evaluateBacklogItem(row, activeKeys, activeBacklogItemIds) {
  const status = normalizeStatus(row.status);
  const reasons = [];
  const independenceKey = normalizeKey(row.independence_key);
  const routing = classifyAgentLane(row);
  const contentGate = isContentLike(row) ? contentQualityGate(row) : null;
  const councilEligible = COUNCIL_READY_STATUSES.has(status);

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
  if (!asArray(row.source_fact_refs).length && !hasValue(row.candidate_id))
    reasons.push("missing_source_reference");
  if (contentGate?.missing.length && councilEligible)
    reasons.push(...contentGate.missing);

  let decision = "watch";
  if (status === "rejected") decision = "rejected";
  else if (reasons.includes("active_experiment_collision"))
    decision = "collision";
  else if (reasons.length) decision = "blocked";
  else if (COUNCIL_READY_STATUSES.has(status)) decision = "candidate";
  else if (WATCH_STATUSES.has(status)) decision = "watch";

  return {
    id: row.id,
    item_key: row.item_key,
    title: row.title ?? row.hypothesis ?? row.item_key,
    status: row.status,
    decision,
    reasons,
    priority_score: Number(row.priority_score ?? 0),
    confidence_score: Number(row.confidence_score ?? 0),
    baseline: row.baseline,
    hypothesis: row.hypothesis,
    owner_issue: row.owner_issue ?? row.owner,
    success_metric: row.success_metric,
    evaluation_date: row.evaluation_date,
    independence_key: row.independence_key,
    agent_lane: routing.agent_lane,
    agent_lane_label: laneLabel(routing.agent_lane),
    blocker_type: routing.blocker_type,
    routing_confidence: routing.routing_confidence,
    source_fact_refs: redact(row.source_fact_refs ?? []),
    evidence: redact(row.evidence ?? {}),
  };
}

function selectProposedExperiments(itemEvaluations, slotsAvailable) {
  if (slotsAvailable <= 0) return [];
  const selected = [];
  const selectedKeys = new Set();
  const candidates = itemEvaluations
    .filter((row) => row.decision === "candidate")
    .sort((a, b) => {
      const priorityDelta = b.priority_score - a.priority_score;
      if (priorityDelta) return priorityDelta;
      const confidenceDelta = b.confidence_score - a.confidence_score;
      if (confidenceDelta) return confidenceDelta;
      return String(a.evaluation_date ?? "").localeCompare(
        String(b.evaluation_date ?? ""),
      );
    });

  for (const row of candidates) {
    const key = normalizeKey(row.independence_key);
    if (!key || selectedKeys.has(key)) continue;
    selected.push(row);
    selectedKeys.add(key);
    if (selected.length >= slotsAvailable) break;
  }
  return selected;
}

function inferPacketStatus({
  sourceErrors,
  activeExperimentCount,
  activeCollisions,
  proposedExperiments,
  itemEvaluations,
}) {
  if (sourceErrors.length) return "BLOCKED";
  if (activeExperimentCount > maxActive) return "BLOCKED";
  if (activeCollisions.length) return "BLOCKED";
  if (itemEvaluations.some((row) => row.decision === "collision"))
    return "WATCH";
  if (activeExperimentCount > 0) return "PASS";
  if (proposedExperiments.length) return "PASS";
  return "WATCH";
}

function collisionRows(activeExperiments) {
  const byKey = new Map();
  for (const row of activeExperiments) {
    const key = normalizeKey(row.independence_key);
    if (!key) continue;
    byKey.set(key, [...(byKey.get(key) ?? []), row]);
  }
  return [...byKey.values()].filter((rows) => rows.length > 1).flat();
}

function packetExperiment(row) {
  return {
    id: row.id,
    experiment_key: row.experiment_key ?? row.experiment_id,
    name: row.name ?? row.title ?? row.hypothesis,
    status: row.status,
    baseline: row.baseline,
    hypothesis: row.hypothesis,
    owner_issue: row.owner_issue ?? row.owner,
    success_metric: row.success_metric,
    evaluation_date: row.evaluation_date,
    independence_key: row.independence_key,
    evidence: redact(row.evidence ?? {}),
  };
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
  return `# Growth Council Packet

Status: \`${report.status}\`  
Generated: ${report.generated_at}  
Website: \`${report.website_id}\`

## Gate

Active independent experiments: ${report.counts.active_experiments}/${report.rules.max_active_independent_experiments}  
Available slots: ${report.rules.slots_available}

## Counts

${renderTable(
  Object.entries(report.counts).map(([metric, count]) => ({ metric, count })),
  [
    { label: "Metric", value: (row) => row.metric },
    { label: "Count", value: (row) => row.count },
  ],
)}

## Agent Lanes

${renderTable(report.lane_counts, [
  { label: "Lane", value: (row) => row.lane },
  { label: "Candidate", value: (row) => row.candidate },
  { label: "Watch", value: (row) => row.watch },
  { label: "Blocked", value: (row) => row.blocked },
  { label: "Rejected", value: (row) => row.rejected },
  { label: "Collision", value: (row) => row.collision },
])}

## Proposed Experiments

${renderTable(report.proposed_experiments, [
  { label: "Lane", value: (row) => row.agent_lane_label },
  { label: "Item", value: (row) => row.title },
  { label: "Owner", value: (row) => row.owner_issue },
  { label: "Metric", value: (row) => row.success_metric },
  { label: "Evaluation", value: (row) => row.evaluation_date },
  { label: "Independence", value: (row) => row.independence_key },
])}

## Active Experiments

${renderTable(report.active_experiments, [
  { label: "Experiment", value: (row) => row.name },
  { label: "Status", value: (row) => row.status },
  { label: "Metric", value: (row) => row.success_metric },
  { label: "Evaluation", value: (row) => row.evaluation_date },
  { label: "Independence", value: (row) => row.independence_key },
])}

## Watch And Blocked

${renderTable(
  report.backlog_items
    .filter((row) => row.decision !== "candidate")
    .slice(0, 50),
  [
    { label: "Lane", value: (row) => row.agent_lane_label },
    { label: "Decision", value: (row) => row.decision },
    { label: "Item", value: (row) => row.title },
    { label: "Reasons", value: (row) => row.reasons.join(", ") },
  ],
)}
`;
}

function redact(value) {
  if (Array.isArray(value)) return value.map((item) => redact(item));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      SECRET_KEY_PATTERN.test(key) ? "[redacted]" : redact(entry),
    ]),
  );
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

function countByLane(rows) {
  const byLane = new Map();
  for (const row of rows) {
    const label = row.agent_lane_label ?? "Unrouted";
    const current = byLane.get(label) ?? {
      lane: label,
      candidate: 0,
      watch: 0,
      blocked: 0,
      rejected: 0,
      collision: 0,
    };
    if (current[row.decision] !== undefined) current[row.decision] += 1;
    byLane.set(label, current);
  }
  return [...byLane.values()];
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
