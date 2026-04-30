#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const DEFAULT_WEBSITE_ID = "894545b7-73ca-4dae-b76a-da5b6a3f8441";
const DEFAULT_CURRENT_TASK_ID = "04300334-1574-0216-0000-c57a3723c41d";
const DEFAULT_OLD_TASK_IDS = [
  "04290125-1574-0216-0000-00a1195b1ba0",
  "04291924-1574-0216-0000-e2085593ce67",
  "04300144-1574-0216-0000-a822a2744350",
];
const DEFAULT_OUT_DIR = "artifacts/seo/2026-04-30-growth-inventory-cleanup";
const CONFIRM_TOKEN = "archive-stale-growth-inventory-313";

const args = parseArgs(process.argv.slice(2));
const apply = args.apply === "true";
const websiteId = args.websiteId ?? DEFAULT_WEBSITE_ID;
const currentTaskId = args.currentTaskId ?? DEFAULT_CURRENT_TASK_ID;
const oldTaskIds = (args.oldTaskIds ?? DEFAULT_OLD_TASK_IDS.join(","))
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);
const expectedCount =
  args.expectedCount == null ? null : Number(args.expectedCount);
const outDir = args.outDir ?? DEFAULT_OUT_DIR;
const maxApplyRows = Number(args.maxApplyRows ?? 100);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRole) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
  );
  process.exit(1);
}

const sb = createClient(supabaseUrl, serviceRole, {
  auth: { persistSession: false, autoRefreshToken: false },
});

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  await fs.mkdir(outDir, { recursive: true });

  const [inventory, currentFindings] = await Promise.all([
    fetchIssue313Inventory(),
    fetchCurrentFindings(),
  ]);

  if (currentFindings.length === 0) {
    throw new Error(
      `Refusing to continue: no seo_audit_findings found for current task ${currentTaskId}`,
    );
  }

  const currentFindingUrls = new Set(
    currentFindings.map((finding) => normalizeUrl(finding.public_url)),
  );
  const oldTaskSet = new Set(oldTaskIds);
  const candidates = inventory
    .filter(isActiveBacklogRow)
    .map((row) => ({ ...row, stale_run_id: extractRunId(row.next_action) }))
    .filter((row) => oldTaskSet.has(row.stale_run_id))
    .filter((row) => row.stale_run_id !== currentTaskId)
    .filter((row) => !currentFindingUrls.has(normalizeUrl(row.source_url)))
    .sort((a, b) => {
      const priorityDelta =
        Number(b.priority_score ?? 0) - Number(a.priority_score ?? 0);
      if (priorityDelta !== 0) return priorityDelta;
      return String(a.source_url).localeCompare(String(b.source_url));
    });

  const report = {
    generated_at: new Date().toISOString(),
    mode: apply ? "apply" : "dry-run",
    website_id: websiteId,
    owner_issue: "#313",
    current_task_id: currentTaskId,
    old_task_ids: oldTaskIds,
    criteria: [
      "owner_issue = '#313'",
      "status = 'queued' OR any sub-status is 'blocked'",
      "next_action references a known old crawl task id",
      "source_url is absent from current crawl seo_audit_findings",
      "no deletes; archive only",
    ],
    counts: {
      issue_313_rows: inventory.length,
      current_findings: currentFindings.length,
      candidates: candidates.length,
      by_stale_run_id: countBy(candidates, (row) => row.stale_run_id),
      by_status: countBy(candidates, (row) => row.status),
      by_technical_status: countBy(candidates, (row) => row.technical_status),
    },
    candidates: candidates.map(toReportRow),
  };

  await fs.writeFile(
    path.join(outDir, "stale-growth-inventory-candidates.json"),
    JSON.stringify(report, null, 2),
  );
  await fs.writeFile(
    path.join(outDir, "stale-growth-inventory-candidates.csv"),
    toCsv(report.candidates),
  );

  if (apply) {
    validateApply(candidates);
    await archiveRows(candidates, report.generated_at);
    report.applied = true;
    await fs.writeFile(
      path.join(outDir, "stale-growth-inventory-candidates.json"),
      JSON.stringify(report, null, 2),
    );
  }

  console.log(
    JSON.stringify(
      {
        mode: report.mode,
        applied: Boolean(report.applied),
        counts: report.counts,
        outDir,
      },
      null,
      2,
    ),
  );
}

async function fetchIssue313Inventory() {
  const out = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await sb
      .from("growth_inventory")
      .select(
        [
          "id",
          "source_url",
          "status",
          "technical_status",
          "content_status",
          "conversion_status",
          "attribution_status",
          "owner_issue",
          "result",
          "learning",
          "next_action",
          "priority_score",
          "updated_at",
        ].join(","),
      )
      .eq("website_id", websiteId)
      .eq("owner_issue", "#313")
      .range(from, from + pageSize - 1);
    if (error)
      throw new Error(`growth_inventory read failed: ${error.message}`);
    out.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return out;
}

async function fetchCurrentFindings() {
  const out = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await sb
      .from("seo_audit_findings")
      .select("public_url,finding_type,severity,status,crawl_task_id")
      .eq("website_id", websiteId)
      .eq("source", "dataforseo:on_page")
      .eq("crawl_task_id", currentTaskId)
      .range(from, from + pageSize - 1);
    if (error)
      throw new Error(`seo_audit_findings read failed: ${error.message}`);
    out.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return out;
}

function validateApply(candidates) {
  if (args.confirm !== CONFIRM_TOKEN) {
    throw new Error(
      `Refusing apply: pass --confirm "${CONFIRM_TOKEN}" after reviewing dry-run artifacts`,
    );
  }
  if (expectedCount == null || !Number.isFinite(expectedCount)) {
    throw new Error("Refusing apply: --expected-count is required");
  }
  if (candidates.length !== expectedCount) {
    throw new Error(
      `Refusing apply: expected ${expectedCount} candidates, found ${candidates.length}`,
    );
  }
  if (candidates.length > maxApplyRows) {
    throw new Error(
      `Refusing apply: ${candidates.length} candidates exceeds --max-apply-rows ${maxApplyRows}`,
    );
  }
}

async function archiveRows(candidates, archivedAt) {
  for (const row of candidates) {
    const oldAction = truncate(row.next_action ?? "", 1200);
    const learning = [
      row.learning,
      `Archived stale #313 crawl row ${archivedAt}. Old crawl ${row.stale_run_id}; current accepted crawl ${currentTaskId} has no finding for this URL.`,
    ]
      .filter(Boolean)
      .join("\n");

    const { error } = await sb
      .from("growth_inventory")
      .update({
        status: "archived",
        result: "stop",
        learning,
        next_action: truncate(
          `Archived stale #313 DataForSEO row after current crawl ${currentTaskId}. Old run ${row.stale_run_id}. Previous action: ${oldAction}`,
          1800,
        ),
        updated_at: archivedAt,
      })
      .eq("id", row.id)
      .eq("website_id", websiteId)
      .eq("owner_issue", "#313")
      .eq("status", row.status);

    if (error) {
      throw new Error(
        `growth_inventory archive failed for ${row.id}: ${error.message}`,
      );
    }
  }
}

function isActiveBacklogRow(row) {
  if (["archived", "done", "closed"].includes(row.status)) {
    return false;
  }
  return (
    row.status === "queued" ||
    row.technical_status === "blocked" ||
    row.content_status === "blocked" ||
    row.conversion_status === "blocked" ||
    row.attribution_status === "blocked"
  );
}

function extractRunId(value) {
  return (
    String(value ?? "").match(/(?:Run|DataForSEO)\s+([0-9a-f-]{36})/i)?.[1] ??
    null
  );
}

function normalizeUrl(value) {
  try {
    const url = new URL(String(value));
    url.hash = "";
    return url.toString().replace(/\/$/, url.pathname === "/" ? "/" : "");
  } catch {
    return String(value ?? "");
  }
}

function toReportRow(row) {
  return {
    id: row.id,
    source_url: row.source_url,
    stale_run_id: row.stale_run_id,
    status: row.status,
    technical_status: row.technical_status,
    content_status: row.content_status,
    conversion_status: row.conversion_status,
    attribution_status: row.attribution_status,
    priority_score: row.priority_score,
    updated_at: row.updated_at,
    next_action: row.next_action,
  };
}

function countBy(rows, fn) {
  const out = {};
  for (const row of rows) {
    const key = fn(row) ?? "null";
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

function toCsv(rows) {
  const headers = [
    "id",
    "source_url",
    "stale_run_id",
    "status",
    "technical_status",
    "content_status",
    "conversion_status",
    "attribution_status",
    "priority_score",
    "updated_at",
    "next_action",
  ];
  return (
    [
      headers.join(","),
      ...rows.map((row) =>
        headers.map((header) => csvEscape(row[header])).join(","),
      ),
    ].join("\n") + "\n"
  );
}

function csvEscape(value) {
  const text = value == null ? "" : String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function truncate(value, max) {
  const text = String(value ?? "");
  return text.length > max ? text.slice(0, max - 1) : text;
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
    const raw = arg.slice(2);
    if (raw.includes("=")) {
      const [key, ...rest] = raw.split("=");
      parsed[normalizeArgKey(key)] = rest.join("=");
      continue;
    }
    const next = argv[index + 1];
    parsed[normalizeArgKey(raw)] =
      next && !next.startsWith("--") ? next : "true";
    if (next && !next.startsWith("--")) index += 1;
  }
  return parsed;
}

function normalizeArgKey(value) {
  return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}
