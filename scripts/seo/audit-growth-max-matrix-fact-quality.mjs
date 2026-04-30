#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const DEFAULT_WEBSITE_ID = "894545b7-73ca-4dae-b76a-da5b6a3f8441";
const DEFAULT_OUT_DIR =
  "artifacts/seo/2026-04-30-growth-max-matrix-fact-quality";
const FACT_TABLES = [
  "seo_gsc_daily_facts",
  "seo_gsc_segment_facts",
  "seo_ga4_landing_facts",
  "seo_ga4_event_facts",
  "seo_ga4_geo_facts",
  "seo_keyword_opportunities",
  "seo_serp_snapshots",
  "seo_content_sentiment_facts",
  "seo_domain_competitive_facts",
  "seo_joint_growth_facts",
];

const args = parseArgs(process.argv.slice(2));
const websiteId = args.websiteId ?? DEFAULT_WEBSITE_ID;
const outDir = args.outDir ?? DEFAULT_OUT_DIR;
const sampleLimit = positiveInt(args.sampleLimit, 5);

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

  const tables = {};
  for (const table of FACT_TABLES) {
    const { count, rows } = await fetchFacts(table);
    tables[table] = summarizeTable(table, rows, count);
  }

  const report = {
    generated_at: new Date().toISOString(),
    website_id: websiteId,
    status: rollupStatus(tables),
    rules: {
      required:
        "Every fact should have source_profile, fact_fingerprint, priority_score and evidence. Joint facts additionally need baseline, source_rows, recommendation and council_ready decision.",
      action:
        "Profiles with usable_rows > 0 are safe for backlog generation; profiles with only blocked or missing evidence stay WATCH.",
    },
    tables,
  };

  await fs.writeFile(
    path.join(outDir, "growth-max-matrix-fact-quality.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  await fs.writeFile(
    path.join(outDir, "growth-max-matrix-fact-quality.md"),
    renderMarkdown(report),
  );

  console.log(
    JSON.stringify(
      {
        status: report.status,
        outDir,
        tables: Object.fromEntries(
          Object.entries(tables).map(([table, item]) => [
            table,
            {
              rows: item.row_count,
              usable_rows: item.usable_rows,
              profiles: Object.keys(item.by_source_profile).length,
            },
          ]),
        ),
      },
      null,
      2,
    ),
  );
}

async function fetchFacts(table) {
  const { count, error: countError } = await sb
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("website_id", websiteId);
  if (countError)
    throw new Error(`${table} count failed: ${countError.message}`);

  const { data, error } = await sb
    .from(table)
    .select("*")
    .eq("website_id", websiteId)
    .order("priority_score", { ascending: false })
    .limit(5000);
  if (error) throw new Error(`${table} read failed: ${error.message}`);
  return { count: count ?? 0, rows: data ?? [] };
}

function summarizeTable(table, rows, totalCount) {
  const bySourceProfile = {};
  const sample = [];
  let usableRows = 0;
  let missingEvidence = 0;
  let missingPriority = 0;
  let missingFingerprint = 0;

  for (const row of rows) {
    const profile = row.source_profile ?? "unknown";
    const item = bySourceProfile[profile] ?? {
      rows: 0,
      usable_rows: 0,
      max_priority_score: 0,
      council_ready: 0,
    };
    const usable = isUsableFact(table, row);
    item.rows += 1;
    item.usable_rows += usable ? 1 : 0;
    item.max_priority_score = Math.max(
      item.max_priority_score,
      Number(row.priority_score ?? 0),
    );
    item.council_ready += row.council_ready === true ? 1 : 0;
    bySourceProfile[profile] = item;

    usableRows += usable ? 1 : 0;
    missingEvidence += hasEvidence(row) ? 0 : 1;
    missingPriority += row.priority_score == null ? 1 : 0;
    missingFingerprint += row.fact_fingerprint ? 0 : 1;
    if (sample.length < sampleLimit) sample.push(toSample(table, row));
  }

  return {
    row_count: totalCount,
    sampled_rows: rows.length,
    usable_rows: usableRows,
    missing_evidence: missingEvidence,
    missing_priority_score: missingPriority,
    missing_fact_fingerprint: missingFingerprint,
    by_source_profile: bySourceProfile,
    samples: sample,
    status: rows.length === 0 ? "WATCH" : usableRows > 0 ? "PASS" : "WATCH",
  };
}

function isUsableFact(table, row) {
  if (!row.source_profile || !row.fact_fingerprint || !hasEvidence(row)) {
    return false;
  }
  if (row.priority_score == null) return false;
  if (table === "seo_joint_growth_facts") {
    return Boolean(row.baseline) && Boolean(row.recommendation);
  }
  if (table.includes("gsc")) return Boolean(row.page_url || row.segment_value);
  if (table.includes("ga4_landing")) return Boolean(row.landing_page);
  if (table.includes("ga4_event")) return Boolean(row.event_name);
  if (table.includes("keyword")) return Boolean(row.keyword);
  if (table.includes("serp")) return Boolean(row.keyword);
  if (table.includes("content")) return Boolean(row.topic);
  if (table.includes("domain")) return Boolean(row.target_domain);
  return true;
}

function hasEvidence(row) {
  return row.evidence && Object.keys(row.evidence).length > 0;
}

function toSample(table, row) {
  return {
    table,
    source_profile: row.source_profile,
    priority_score: row.priority_score,
    fact_fingerprint: row.fact_fingerprint,
    source_url: row.source_url ?? row.page_url ?? row.landing_page ?? null,
    keyword: row.keyword ?? null,
    joint_profile: row.joint_profile ?? null,
    council_ready: row.council_ready ?? null,
  };
}

function rollupStatus(tables) {
  const values = Object.values(tables);
  if (values.some((table) => table.row_count === 0)) return "PASS-WITH-WATCH";
  if (values.some((table) => table.usable_rows === 0)) return "PASS-WITH-WATCH";
  return "PASS";
}

function renderMarkdown(report) {
  const tableRows = Object.entries(report.tables)
    .map(
      ([table, item]) =>
        `| ${table} | ${item.status} | ${item.row_count} | ${item.sampled_rows} | ${item.usable_rows} | ${Object.keys(item.by_source_profile).length} | ${item.missing_evidence} | ${item.missing_priority_score} |`,
    )
    .join("\n");

  const profileRows = Object.entries(report.tables)
    .flatMap(([table, item]) =>
      Object.entries(item.by_source_profile).map(
        ([profile, profileItem]) =>
          `| ${table} | ${profile} | ${profileItem.rows} | ${profileItem.usable_rows} | ${profileItem.max_priority_score} | ${profileItem.council_ready} |`,
      ),
    )
    .join("\n");

  return `# Growth Max Matrix Fact Quality

Generated: ${report.generated_at}
Website: ${report.website_id}
Status: ${report.status}

## Rules

- Required: ${report.rules.required}
- Action: ${report.rules.action}

## Table Quality

| Table | Status | Total rows | Sampled rows | Usable sampled rows | Profiles | Missing evidence | Missing priority |
|---|---|---:|---:|---:|---:|---:|---:|
${tableRows}

## Source Profiles

| Table | Source profile | Rows | Usable rows | Max priority | Council ready |
|---|---|---:|---:|---:|---:|
${profileRows}
`;
}

function parseArgs(argv) {
  const parsed = {};
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const [key, value = "true"] = arg.slice(2).split("=");
    parsed[key] = value;
  }
  return parsed;
}

function positiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
