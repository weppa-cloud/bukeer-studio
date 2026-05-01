#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  DEFAULT_WEBSITE_ID,
  fetchRows,
  getSupabase,
  parseArgs,
  renderTable,
  writeArtifacts,
} from "../seo/growth-unified-backlog-lib.mjs";

const args = parseArgs(process.argv.slice(2));
const apply = args.apply === "true";
const websiteId = args.websiteId ?? DEFAULT_WEBSITE_ID;
const limit = Number(args.limit ?? 1000);
const outDir =
  args.outDir ??
  path.join("artifacts/seo", `${today()}-technical-remediation-closeout`);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const sb = getSupabase();
  const items = await fetchRows(sb, "growth_backlog_items", "*", {
    websiteId,
    limit,
    orderBy: "priority_score",
  });
  if (items.error) throw new Error(items.error);

  const technical = items.rows.filter(
    (row) => row.work_type === "technical_remediation",
  );
  const results = [];
  for (const row of technical) {
    results.push(await smoke(row));
  }
  const closeable = results.filter((row) =>
    ["done_pending_recrawl", "intentional_404_done_pending_recrawl"].includes(
      row.decision,
    ),
  );
  const applyResult = apply
    ? await applyCloseout(sb, closeable)
    : { mode: "dry-run", closeable: closeable.length };
  const report = {
    generated_at: new Date().toISOString(),
    mode: apply ? "apply" : "dry-run",
    website_id: websiteId,
    counts: {
      technical_items: technical.length,
      closeable: closeable.length,
      needs_manual_review: results.filter(
        (row) => row.decision === "needs_manual_review",
      ).length,
      by_decision: countBy(results, (row) => row.decision),
    },
    apply_result: applyResult,
    results,
  };

  await writeArtifacts(
    outDir,
    "technical-remediation-closeout",
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

async function smoke(row) {
  const started = Date.now();
  try {
    const response = await fetch(row.entity_key, {
      redirect: "manual",
      headers: { "user-agent": "BukeerGrowthOS/1.0 technical-closeout" },
    });
    const html = await response.text().catch(() => "");
    const title = match(html, /<title[^>]*>([^<]*)<\/title>/i);
    const h1 = match(html, /<h1[^>]*>(.*?)<\/h1>/is)
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const canonical = match(
      html,
      /<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i,
    );
    const xRobots = response.headers.get("x-robots-tag") ?? "";
    const bodyNotFound =
      /post no encontrado|post not found/i.test(html) &&
      response.status === 200;
    const validIndexable =
      response.status === 200 &&
      Boolean(title) &&
      Boolean(h1) &&
      Boolean(canonical) &&
      !xRobots &&
      !bodyNotFound;
    const validHidden =
      response.status === 404 && /noindex/i.test(xRobots ?? "");
    const decision = validIndexable
      ? "done_pending_recrawl"
      : validHidden
        ? "intentional_404_done_pending_recrawl"
        : "needs_manual_review";
    return {
      id: row.id,
      item_key: row.item_key,
      status: row.status,
      url: row.entity_key,
      priority_score: Number(row.priority_score ?? 0),
      decision,
      http_status: response.status,
      x_robots_tag: xRobots,
      title,
      h1,
      canonical,
      body_not_found: bodyNotFound,
      ms: Date.now() - started,
    };
  } catch (error) {
    return {
      id: row.id,
      item_key: row.item_key,
      status: row.status,
      url: row.entity_key,
      priority_score: Number(row.priority_score ?? 0),
      decision: "needs_manual_review",
      error: error.message,
      ms: Date.now() - started,
    };
  }
}

async function applyCloseout(sb, rows) {
  const result = {
    mode: "apply",
    requested_updates: rows.length,
    updated: 0,
    errors: [],
  };
  for (const row of rows) {
    const { error } = await sb
      .from("growth_backlog_items")
      .update({
        status: "done",
        blocked_reason: null,
        evidence: {
          technical_closeout: {
            decision: row.decision,
            observed_at: new Date().toISOString(),
            http_status: row.http_status,
            x_robots_tag: row.x_robots_tag,
            title: row.title,
            h1: row.h1,
            canonical: row.canonical,
            validation:
              "production smoke passed; DataForSEO recrawl still required",
          },
        },
      })
      .eq("id", row.id);
    if (error) result.errors.push({ id: row.id, message: error.message });
    else result.updated += 1;
  }
  return result;
}

function renderMarkdown(report) {
  return `# Technical Remediation Closeout

Mode: \`${report.mode}\`  
Generated: ${report.generated_at}

## Counts

${renderTable(
  Object.entries(report.counts.by_decision).map(([decision, count]) => ({
    decision,
    count,
  })),
  [
    { label: "Decision", value: (row) => row.decision },
    { label: "Count", value: (row) => row.count },
  ],
)}

## Results

${renderTable(report.results, [
  { label: "Decision", value: (row) => row.decision },
  { label: "HTTP", value: (row) => row.http_status ?? row.error },
  { label: "URL", value: (row) => row.url },
  { label: "Title", value: (row) => row.title },
  { label: "H1", value: (row) => row.h1 },
  { label: "Canonical", value: (row) => row.canonical },
])}
`;
}

function match(text, regex) {
  return text.match(regex)?.[1]?.trim() ?? "";
}

function countBy(rows, fn) {
  return rows.reduce((acc, row) => {
    const key = fn(row);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
