#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

const DEFAULT_ARTIFACT_ROOT = "artifacts/seo";
const DEFAULT_MAX_ACTIVE = 5;
const DEFAULT_WEBSITE_ID = "894545b7-73ca-4dae-b76a-da5b6a3f8441";
const INPUT_KINDS = ["coverage", "orchestrator", "health"];
const REQUIRED_FIELDS = [
  {
    key: "source_row",
    label: "source row",
    aliases: [
      "source_row",
      "sourceRow",
      "source",
      "source_artifact",
      "sourceArtifact",
      "source_url",
      "sourceUrl",
      "row_id",
      "rowId",
      "inventory_id",
      "inventoryId",
      "url",
    ],
  },
  {
    key: "baseline",
    label: "baseline",
    aliases: [
      "baseline",
      "baseline_value",
      "baselineValue",
      "current_value",
      "currentValue",
    ],
  },
  {
    key: "owner",
    label: "owner",
    aliases: [
      "owner",
      "owners",
      "assignee",
      "assigned_to",
      "assignedTo",
      "role",
    ],
  },
  {
    key: "success_metric",
    label: "success metric",
    aliases: [
      "success_metric",
      "successMetric",
      "metric",
      "kpi",
      "success_metric_threshold",
      "successMetricThreshold",
      "success_criteria",
      "successCriteria",
    ],
  },
  {
    key: "evaluation_date",
    label: "evaluation date",
    aliases: [
      "evaluation_date",
      "evaluationDate",
      "eval_date",
      "evalDate",
      "readout_date",
      "readoutDate",
      "review_date",
      "reviewDate",
      "due_date",
      "dueDate",
    ],
  },
];
const ACTIVE_STATUSES = new Set([
  "active",
  "approved",
  "queued",
  "ready",
  "ready-with-tracking-gap",
  "running",
  "in_progress",
  "in-progress",
  "launched",
  "launch",
]);
const INACTIVE_STATUSES = new Set([
  "blocked",
  "deferred",
  "done",
  "excluded",
  "failed",
  "loss",
  "idea",
  "candidate",
  "rejected",
  "stop",
  "watch",
  "win",
]);

const args = parseArgs(process.argv.slice(2));
dotenv.config({ path: ".env.local" });

const artifactRoot = args.artifactRoot ?? DEFAULT_ARTIFACT_ROOT;
const runDate = args.date ?? today();
const outDir =
  args.outDir ??
  path.join(artifactRoot, `${runDate}-growth-max-matrix-council`);
const maxActive = Number(args.maxActive ?? DEFAULT_MAX_ACTIVE);
const websiteId = args.websiteId ?? DEFAULT_WEBSITE_ID;

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  if (!Number.isInteger(maxActive) || maxActive < 1) {
    throw new Error("--max-active must be a positive integer");
  }

  await fs.mkdir(outDir, { recursive: true });

  const inputs = await discoverLatestInputs(artifactRoot);
  const inventoryInput = await fetchGrowthInventoryCandidates();
  const candidates = [
    ...inputs.flatMap((input) => extractCandidates(input)),
    ...inventoryInput.candidates,
  ];
  const rows =
    candidates.length > 0
      ? evaluateCandidates(candidates, maxActive)
      : [missingInputRow(inputs)];

  const report = {
    generated_at: new Date().toISOString(),
    run_date: runDate,
    status: rollupStatus(rows),
    rules: {
      max_active_experiments: maxActive,
      required_fields: REQUIRED_FIELDS.map((field) => field.label),
      decision_order: [
        "Reject rows that would exceed the active experiment cap.",
        "Block rows missing source row, baseline, owner, success metric, or evaluation date.",
        "Approve active rows that satisfy all required fields.",
      ],
      side_effects:
        "local artifact only; no DB mutations and no paid/provider calls",
    },
    inputs: inputs.map(stripDataForReport),
    inventory_input: inventoryInput.summary,
    counts: {
      inputs_found: inputs.filter((input) => input.status === "found").length,
      candidates: candidates.length,
      approved_active: rows.filter((row) => row.decision === "approved").length,
      blocked: rows.filter((row) => row.decision === "blocked").length,
      rejected: rows.filter((row) => row.decision === "rejected").length,
    },
    rows,
  };

  await fs.writeFile(
    path.join(outDir, "growth-max-matrix-council.json"),
    JSON.stringify(report, null, 2),
  );
  await fs.writeFile(
    path.join(outDir, "growth-max-matrix-council.md"),
    toMarkdown(report),
  );

  console.log(
    JSON.stringify(
      {
        status: report.status,
        outDir,
        counts: report.counts,
      },
      null,
      2,
    ),
  );
}

async function fetchGrowthInventoryCandidates() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole || args.includeInventory === "false") {
    return {
      summary: {
        status: "skipped",
        reason:
          args.includeInventory === "false"
            ? "Disabled by --include-inventory false."
            : "Missing Supabase env.",
        row_count: 0,
      },
      candidates: [],
    };
  }

  try {
    const sb = createClient(url, serviceRole, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await sb
      .from("growth_inventory")
      .select("*")
      .eq("website_id", websiteId)
      .in("status", ["active", "queued", "idea", "watch", "blocked"])
      .order("priority_score", { ascending: false })
      .limit(Number(args.inventoryLimit ?? 50));
    if (error) throw error;
    const rows = (data ?? []).map((row, index) =>
      normalizeInventoryCandidate(row, index),
    );
    return {
      summary: {
        status: "found",
        website_id: websiteId,
        row_count: rows.length,
        source: "growth_inventory",
      },
      candidates: rows,
    };
  } catch (error) {
    return {
      summary: {
        status: "error",
        website_id: websiteId,
        row_count: 0,
        error: error.message,
      },
      candidates: [],
    };
  }
}

function normalizeInventoryCandidate(row, index) {
  const baseline = inventoryBaseline(row);
  return {
    id: row.experiment_id ?? row.id ?? `growth_inventory-${index + 1}`,
    title:
      row.hypothesis ??
      row.next_action ??
      row.source_url ??
      `growth_inventory row ${index + 1}`,
    source_row: row.id ?? row.source_url,
    baseline,
    owner: row.owner ?? row.owner_issue,
    success_metric: row.success_metric,
    evaluation_date: row.evaluation_date,
    status: normalizeStatus(row.status),
    priority: numericValue(
      row.ICE_score ?? row.RICE_score ?? row.priority_score,
    ),
    is_active: isActiveExperiment(row, normalizeStatus(row.status)),
    input_kind: "growth_inventory",
    input_path: "supabase:growth_inventory",
    missing_fields: REQUIRED_FIELDS.filter((field) => {
      const value = {
        source_row: row.id ?? row.source_url,
        baseline,
        owner: row.owner ?? row.owner_issue,
        success_metric: row.success_metric,
        evaluation_date: row.evaluation_date,
      }[field.key];
      return isBlank(value);
    }).map((field) => field.label),
    raw: {
      id: row.id,
      source_url: row.source_url,
      cluster: row.cluster,
      channel: row.channel,
      status: row.status,
      owner_issue: row.owner_issue,
      priority_score: row.priority_score,
    },
  };
}

function inventoryBaseline(row) {
  const parts = [
    row.baseline_start && row.baseline_end
      ? `${row.baseline_start}..${row.baseline_end}`
      : null,
    Number(row.gsc_impressions_28d ?? 0) > 0
      ? `GSC ${row.gsc_impressions_28d} impressions / ${row.gsc_clicks_28d ?? 0} clicks`
      : null,
    Number(row.ga4_sessions_28d ?? 0) > 0
      ? `GA4 ${row.ga4_sessions_28d} sessions / engagement ${row.ga4_engagement ?? "n/a"}`
      : null,
    Number(row.whatsapp_clicks ?? 0) +
      Number(row.waflow_submits ?? 0) +
      Number(row.qualified_leads ?? 0) >
    0
      ? `Funnel WA ${row.whatsapp_clicks ?? 0}, submit ${row.waflow_submits ?? 0}, leads ${row.qualified_leads ?? 0}`
      : null,
  ].filter(Boolean);
  return parts.join("; ") || null;
}

async function discoverLatestInputs(root) {
  const files = await listJsonFiles(root);
  return INPUT_KINDS.map((kind) => {
    const matches = files
      .filter((file) => matchesInputKind(file.path, kind))
      .sort(compareArtifacts);
    const latest = matches[0];
    if (!latest) {
      return {
        kind,
        status: "missing",
        path: null,
        generated_at: null,
        candidate_count: 0,
        note: `No latest ${kind} artifact matched under ${root}.`,
      };
    }

    return {
      kind,
      status: "found",
      path: latest.path,
      generated_at: latest.generated_at,
      mtime: latest.mtime.toISOString(),
      candidate_count: latest.candidate_count,
      note: latest.error ?? undefined,
      data: latest.data,
    };
  });
}

async function listJsonFiles(root) {
  const out = [];
  await walk(root, out);
  const hydrated = [];
  for (const file of out) {
    const loaded = await readJsonArtifact(file);
    if (loaded) hydrated.push(loaded);
  }
  return hydrated;
}

async function walk(dir, out) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.includes("growth-max-matrix-council")) continue;
      await walk(fullPath, out);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".json")) {
      out.push(fullPath);
    }
  }
}

async function readJsonArtifact(filePath) {
  let stat;
  let data;
  let error;
  try {
    stat = await fs.stat(filePath);
    data = JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (parseError) {
    error = parseError.message;
    stat = stat ?? (await fs.stat(filePath));
    data = null;
  }

  return {
    path: filePath,
    mtime: stat.mtime,
    generated_at: stringValue(data?.generated_at ?? data?.generatedAt) ?? null,
    candidate_count: data ? collectCandidateObjects(data).length : 0,
    data,
    error,
  };
}

function matchesInputKind(filePath, kind) {
  const normalized = filePath.toLowerCase();
  if (!normalized.includes(kind)) return false;
  if (normalized.includes("growth-max-matrix")) return true;
  if (
    normalized.includes("growth") &&
    normalized.includes("max") &&
    normalized.includes("matrix")
  ) {
    return true;
  }
  return normalized.includes("growth") && normalized.includes("matrix");
}

function compareArtifacts(left, right) {
  const leftGenerated = Date.parse(left.generated_at ?? "");
  const rightGenerated = Date.parse(right.generated_at ?? "");
  if (
    Number.isFinite(leftGenerated) &&
    Number.isFinite(rightGenerated) &&
    leftGenerated !== rightGenerated
  ) {
    return rightGenerated - leftGenerated;
  }
  return right.mtime.getTime() - left.mtime.getTime();
}

function stripDataForReport(input) {
  const { data, ...rest } = input;
  return rest;
}

function extractCandidates(input) {
  if (input.status !== "found") return [];
  const artifact = input.data ?? {};
  return collectCandidateObjects(artifact).map((raw, index) => {
    const normalized = normalizeExperimentRow(raw);
    return {
      ...normalized,
      id: normalized.id ?? `${input.kind}-${index + 1}`,
      input_kind: input.kind,
      input_path: input.path,
      raw,
    };
  });
}

function collectCandidateObjects(value, seen = new Set()) {
  if (!value || typeof value !== "object") return [];
  if (seen.has(value)) return [];
  seen.add(value);

  if (Array.isArray(value)) {
    if (
      value.every(
        (item) => item && typeof item === "object" && !Array.isArray(item),
      )
    ) {
      const candidateRows = value.filter(isCandidateLike);
      if (candidateRows.length > 0) return candidateRows;
    }
    return value.flatMap((item) => collectCandidateObjects(item, seen));
  }

  return Object.entries(value).flatMap(([key, child]) => {
    const lowerKey = key.toLowerCase();
    if (
      Array.isArray(child) &&
      /^(active_)?(experiments|candidates|rows|approved|blocked|rejected|planned|ready)$/u.test(
        lowerKey,
      )
    ) {
      return child.filter(
        (item) => item && typeof item === "object" && !Array.isArray(item),
      );
    }
    return collectCandidateObjects(child, seen);
  });
}

function isCandidateLike(row) {
  const keys = new Set(Object.keys(row));
  const hasRequiredAlias = REQUIRED_FIELDS.some((field) =>
    field.aliases.some((alias) => keys.has(alias)),
  );
  return (
    hasRequiredAlias ||
    keys.has("hypothesis") ||
    keys.has("experiment") ||
    keys.has("decision_status")
  );
}

function normalizeExperimentRow(raw) {
  const row = {};
  for (const field of REQUIRED_FIELDS) {
    row[field.key] = firstValue(raw, field.aliases);
  }

  row.id = firstValue(raw, [
    "id",
    "experiment_id",
    "experimentId",
    "key",
    "name",
    "title",
  ]);
  row.title = firstValue(raw, [
    "title",
    "name",
    "experiment",
    "hypothesis",
    "summary",
  ]);
  row.status = normalizeStatus(
    firstValue(raw, ["decision_status", "decisionStatus", "status", "state"]),
  );
  row.priority = numericValue(
    firstValue(raw, [
      "ice",
      "ICE",
      "priority",
      "priority_score",
      "priorityScore",
      "score",
    ]),
  );
  row.is_active = isActiveExperiment(raw, row.status);
  row.missing_fields = REQUIRED_FIELDS.filter((field) =>
    isBlank(row[field.key]),
  ).map((field) => field.label);
  return row;
}

function firstValue(source, aliases) {
  for (const alias of aliases) {
    if (source[alias] != null && !isBlank(source[alias])) return source[alias];
  }
  return null;
}

function evaluateCandidates(candidates, activeLimit) {
  const activeCandidates = candidates.filter(
    (row) => row.is_active && row.missing_fields.length === 0,
  );
  const activeOrder = new Map(
    [...activeCandidates]
      .sort((left, right) => {
        const priorityDelta =
          (right.priority ?? -Infinity) - (left.priority ?? -Infinity);
        if (priorityDelta !== 0) return priorityDelta;
        return String(left.id).localeCompare(String(right.id));
      })
      .map((row, index) => [row, index + 1]),
  );

  return candidates.map((candidate) => {
    const activeRank = activeOrder.get(candidate) ?? null;
    const capExceeded = activeRank != null && activeRank > activeLimit;
    const missingFields = candidate.missing_fields;
    const decision = capExceeded
      ? "rejected"
      : missingFields.length > 0 || !candidate.is_active
        ? "blocked"
        : "approved";
    const reasons = [
      ...(capExceeded
        ? [
            `active experiment cap exceeded: rank ${activeRank} > ${activeLimit}`,
          ]
        : []),
      ...missingFields.map((field) => `missing ${field}`),
      ...(candidate.is_active
        ? []
        : [`not active status: ${candidate.status ?? "unknown"}`]),
    ];

    return {
      id: stringValue(candidate.id),
      title: stringValue(candidate.title),
      input_kind: candidate.input_kind,
      input_path: candidate.input_path,
      source_row: stringValue(candidate.source_row),
      baseline: stringValue(candidate.baseline),
      owner: stringValue(candidate.owner),
      success_metric: stringValue(candidate.success_metric),
      evaluation_date: stringValue(candidate.evaluation_date),
      status: candidate.status,
      active_rank: activeRank,
      decision,
      reasons,
    };
  });
}

function missingInputRow(inputs) {
  const missingKinds = inputs
    .filter((input) => input.status === "missing")
    .map((input) => input.kind)
    .join(", ");
  return {
    id: "NO_INPUT_ARTIFACTS",
    title: "No growth max matrix inputs available",
    input_kind: "council",
    input_path: null,
    source_row: null,
    baseline: null,
    owner: null,
    success_metric: null,
    evaluation_date: null,
    status: "blocked",
    active_rank: null,
    decision: "blocked",
    reasons: [
      `missing latest input artifacts: ${missingKinds || INPUT_KINDS.join(", ")}`,
      ...REQUIRED_FIELDS.map((field) => `missing ${field.label}`),
    ],
  };
}

function rollupStatus(rows) {
  if (rows.some((row) => row.decision === "rejected")) return "REJECTED";
  if (
    rows.some((row) => row.decision === "approved") &&
    rows.some((row) => row.decision === "blocked")
  ) {
    return "PASS-WITH-WATCH";
  }
  if (rows.some((row) => row.decision === "blocked")) return "BLOCKED";
  return "PASS";
}

function toMarkdown(report) {
  const inputRows = report.inputs
    .map(
      (input) =>
        `| ${input.kind} | ${input.status} | ${input.path ?? ""} | ${input.generated_at ?? ""} | ${input.candidate_count} | ${input.note ?? ""} |`,
    )
    .join("\n");
  const councilRows = report.rows
    .map(
      (row) =>
        `| ${row.decision} | ${row.id ?? ""} | ${row.title ?? ""} | ${row.status ?? ""} | ${row.active_rank ?? ""} | ${row.owner ?? ""} | ${row.evaluation_date ?? ""} | ${row.reasons.join("; ")} |`,
    )
    .join("\n");

  return `# Growth Max Matrix Council

Generated: ${report.generated_at}
Run date: ${report.run_date}
Status: ${report.status}

## Rules

- Max active experiments: ${report.rules.max_active_experiments}
- Required fields: ${report.rules.required_fields.join(", ")}
- Side effects: ${report.rules.side_effects}

## Inputs

Growth inventory input: ${report.inventory_input.status} (${report.inventory_input.row_count} rows)${report.inventory_input.error ? ` — ${report.inventory_input.error}` : ""}

| Kind | Status | Path | Generated | Candidate rows | Note |
|---|---|---|---|---:|---|
${inputRows}

## Council Decisions

| Decision | ID | Title | Status | Active rank | Owner | Evaluation date | Reasons |
|---|---|---|---|---:|---|---|---|
${councilRows}
`;
}

function isActiveExperiment(raw, normalizedStatus) {
  if (raw.active === true || raw.is_active === true || raw.isActive === true)
    return true;
  if (raw.active === false || raw.is_active === false || raw.isActive === false)
    return false;
  if (normalizedStatus && ACTIVE_STATUSES.has(normalizedStatus)) return true;
  if (normalizedStatus && INACTIVE_STATUSES.has(normalizedStatus)) return false;
  return true;
}

function normalizeStatus(value) {
  const normalized = stringValue(value)
    ?.toLowerCase()
    .trim()
    .replace(/\s+/gu, "-");
  return normalized || "active";
}

function numericValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function stringValue(value) {
  if (value == null) return null;
  if (Array.isArray(value))
    return value.map(stringValue).filter(Boolean).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  const string = String(value).trim();
  return string.length > 0 ? string : null;
}

function isBlank(value) {
  if (value == null) return true;
  if (Array.isArray(value)) return value.length === 0 || value.every(isBlank);
  if (typeof value === "object") return Object.keys(value).length === 0;
  return String(value).trim() === "";
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
    const raw = arg.slice(2);
    if (raw.includes("=")) {
      const [key, ...rest] = raw.split("=");
      parsed[toCamelCase(key)] = rest.join("=");
      continue;
    }
    const next = argv[index + 1];
    parsed[toCamelCase(raw)] = next && !next.startsWith("--") ? next : "true";
    if (next && !next.startsWith("--")) index += 1;
  }
  return parsed;
}

function toCamelCase(value) {
  return value.replace(/-([a-z])/gu, (_, char) => char.toUpperCase());
}
