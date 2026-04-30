#!/usr/bin/env node

import path from "node:path";
import process from "node:process";
import {
  DEFAULT_ACCOUNT_ID,
  DEFAULT_WEBSITE_ID,
  candidateFromRow,
  fetchRows,
  getSupabase,
  parseArgs,
  renderTable,
  upsertRows,
  writeArtifacts,
} from "./growth-unified-backlog-lib.mjs";

const args = parseArgs(process.argv.slice(2));
const apply = args.apply === "true";
const accountId = args.accountId ?? DEFAULT_ACCOUNT_ID;
const websiteId = args.websiteId ?? DEFAULT_WEBSITE_ID;
const outDir =
  args.outDir ??
  path.join("artifacts/seo", `${today()}-growth-unified-backlog-generator`);
const limit = Number(args.limit ?? 1000);
const sb = getSupabase();

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const facts = await readFacts();
  const candidates = buildCandidates(facts);
  const grouped = groupBy(candidates, (row) => row.status);
  const apply_result = {};

  if (apply) {
    apply_result.growth_backlog_candidates = await upsertRows(
      sb,
      "growth_backlog_candidates",
      candidates,
      "website_id,candidate_key",
    );
  }

  const report = {
    generated_at: new Date().toISOString(),
    mode: apply ? "apply" : "dry-run",
    website_id: websiteId,
    account_id: accountId,
    counts: {
      facts: Object.fromEntries(
        Object.entries(facts).map(([key, value]) => [key, value.rows.length]),
      ),
      candidates: candidates.length,
      candidate: grouped.candidate?.length ?? 0,
      watch: grouped.watch?.length ?? 0,
      blocked: grouped.blocked?.length ?? 0,
      rejected: grouped.rejected?.length ?? 0,
    },
    errors: Object.fromEntries(
      Object.entries(facts)
        .filter(([, value]) => value.error)
        .map(([key, value]) => [key, value.error]),
    ),
    apply_result,
    samples: candidates.slice(0, 20),
  };

  await writeArtifacts(
    outDir,
    "growth-unified-backlog-generator",
    report,
    renderMarkdown(report),
  );
  console.log(
    JSON.stringify(
      { mode: report.mode, outDir, counts: report.counts },
      null,
      2,
    ),
  );
}

async function readFacts() {
  const tables = {
    seo_gsc_daily_facts: "*",
    seo_gsc_segment_facts: "*",
    seo_ga4_landing_facts: "*",
    seo_ga4_event_facts: "*",
    seo_ga4_geo_facts: "*",
    seo_keyword_opportunities: "*",
    seo_serp_snapshots: "*",
    seo_audit_findings: "*",
    seo_joint_growth_facts: "*",
    funnel_events: "*",
    meta_conversion_events: "*",
    growth_inventory: "*",
  };
  const entries = await Promise.all(
    Object.entries(tables).map(async ([table, columns]) => [
      table,
      await fetchRows(sb, table, columns, { websiteId, limit }),
    ]),
  );
  return Object.fromEntries(entries);
}

function buildCandidates(facts) {
  const out = [];
  for (const [table, source] of Object.entries(facts)) {
    for (const row of source.rows) {
      const profile = row.source_profile ?? table;
      out.push(
        candidateFromRow({
          row,
          table,
          accountId,
          websiteId,
          sourceProfile: profile,
          workType: inferWorkType(table, row),
          title: inferTitle(table, row),
          nextAction: inferNextAction(table, row),
          priorityScore:
            row.priority_score ??
            row.gsc_impressions_28d ??
            row.impressions ??
            row.sessions ??
            0,
          confidenceScore: inferConfidence(table, row),
          correlationStatus: inferCorrelation(table, row),
          qualityStatus: inferQuality(table, row),
        }),
      );
    }
  }
  return [...new Map(out.map((row) => [row.candidate_key, row])).values()];
}

function inferWorkType(table, row) {
  if (table === "seo_audit_findings") return "technical_remediation";
  if (table.startsWith("seo_gsc")) return "seo_demand";
  if (table.startsWith("seo_ga4")) return "cro_activation";
  if (table === "seo_keyword_opportunities") return "content_opportunity";
  if (table === "seo_serp_snapshots") return "serp_competitor_opportunity";
  if (table === "funnel_events" || table === "meta_conversion_events")
    return "tracking_attribution";
  if (table === "growth_inventory")
    return row.work_type ?? "legacy_growth_inventory";
  return row.work_type ?? row.fact_type ?? "growth_opportunity";
}

function inferTitle(table, row) {
  if (row.title) return row.title;
  if (row.keyword) return `${inferWorkType(table, row)}: ${row.keyword}`;
  if (row.query) return `${inferWorkType(table, row)}: ${row.query}`;
  if (row.canonical_url || row.source_url || row.page_url || row.landing_page) {
    return `${inferWorkType(table, row)}: ${row.canonical_url ?? row.source_url ?? row.page_url ?? row.landing_page}`;
  }
  return `${inferWorkType(table, row)} from ${table}`;
}

function inferNextAction(table, row) {
  if (row.next_action) return row.next_action;
  if (table === "seo_audit_findings")
    return "Triage technical issue and decide fix, redirect, remove, 404/410 or watch.";
  if (table.startsWith("seo_gsc"))
    return "Review CTR/demand opportunity and decide snippet, content or internal-link action.";
  if (table.startsWith("seo_ga4"))
    return "Review landing activation gap and decide CRO/tracking action.";
  if (table === "seo_keyword_opportunities")
    return "Review demand and create/update content brief only if baseline is strong.";
  if (table === "seo_serp_snapshots")
    return "Review SERP/competitor gap and define snippet/schema/content response.";
  return "Review candidate and promote only if baseline, owner and metric are complete.";
}

function inferConfidence(table, row) {
  if (row.confidence_score) return Number(row.confidence_score);
  if (table === "seo_joint_growth_facts") return 0.8;
  if (table === "growth_inventory" && row.owner_issue && row.success_metric)
    return 0.75;
  if (
    table.startsWith("seo_gsc") &&
    (row.impressions > 0 || row.gsc_impressions_28d > 0)
  )
    return 0.7;
  if (
    table.startsWith("seo_ga4") &&
    (row.sessions > 0 || row.ga4_sessions_28d > 0)
  )
    return 0.7;
  return 0.55;
}

function inferCorrelation(table, row) {
  return inferConfidence(table, row) >= 0.7 ? "PASS" : "WATCH";
}

function inferQuality(table, row) {
  if (row.status === "blocked" || row.technical_status === "blocked")
    return "BLOCKED";
  return "PASS";
}

function groupBy(rows, keyFn) {
  return rows.reduce((acc, row) => {
    const key = keyFn(row);
    acc[key] ??= [];
    acc[key].push(row);
    return acc;
  }, {});
}

function renderMarkdown(report) {
  return `# Growth Unified Backlog Generator

Mode: \`${report.mode}\`  
Generated: ${report.generated_at}

## Counts

${renderTable(
  Object.entries(report.counts).map(([name, count]) => ({ name, count })),
  [
    { label: "Metric", value: (row) => row.name },
    { label: "Count", value: (row) => row.count },
  ],
)}

## Rule

This script writes only \`growth_backlog_candidates\`. It never creates reviewed backlog or experiments.
`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
