#!/usr/bin/env node

import path from "node:path";
import process from "node:process";
import {
  DEFAULT_ACCOUNT_ID,
  DEFAULT_WEBSITE_ID,
  candidateFromRow,
  fetchRows,
  fingerprint,
  getSupabase,
  parseArgs,
  renderTable,
  runRef,
  upsertRows,
  writeArtifacts,
} from "./growth-unified-backlog-lib.mjs";

const args = parseArgs(process.argv.slice(2));
const apply = args.apply === "true";
const dryRun = args["dry-run"] === "true" || args.dryRun === "true";
if (apply && dryRun) {
  throw new Error("Use either --dry-run or --apply, not both.");
}
const accountId = args.accountId ?? DEFAULT_ACCOUNT_ID;
const websiteId = args.websiteId ?? DEFAULT_WEBSITE_ID;
const outDir =
  args.outDir ??
  path.join("artifacts/seo", `${today()}-growth-unified-backlog-backfill`);
const limit = Number(args.limit ?? 2000);
const writeArtifactsEnabled = true;

const sb = getSupabase();

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const sources = await readSources();
  const profileRuns = buildProfileRuns(sources);
  const candidates = buildCandidates(sources);
  const items = buildItems(candidates);
  const experiments = buildExperiments(items);

  const apply_result = {};
  if (apply) {
    apply_result.growth_profile_runs = await upsertRows(
      sb,
      "growth_profile_runs",
      profileRuns,
      "website_id,profile_id,run_id",
    );
    apply_result.growth_backlog_candidates = await upsertRows(
      sb,
      "growth_backlog_candidates",
      candidates,
      "website_id,candidate_key",
    );
    if (items.length) {
      const refreshedCandidates = await fetchRows(
        sb,
        "growth_backlog_candidates",
        "id,candidate_key",
        {
          websiteId,
          limit: candidates.length + 100,
        },
      );
      const idByKey = new Map(
        refreshedCandidates.rows.map((row) => [row.candidate_key, row.id]),
      );
      const itemRows = items.map((item) => ({
        ...item,
        candidate_id: idByKey.get(item.candidate_key) ?? null,
      }));
      apply_result.growth_backlog_items = await upsertRows(
        sb,
        "growth_backlog_items",
        itemRows.map(({ candidate_key, ...row }) => row),
        "website_id,item_key",
      );
    }
  }

  const report = {
    generated_at: new Date().toISOString(),
    mode: apply ? "apply" : "dry-run",
    website_id: websiteId,
    account_id: accountId,
    policy: {
      scripts_create: "growth_backlog_candidates",
      reviewer_promotes: "growth_backlog_items",
      council_promotes: "growth_experiments",
      legacy_inventory:
        "backfilled as candidates/items only when evidence is complete",
      experiment_backfill:
        "disabled; this script only reports proposed experiment rows for Council review",
    },
    source_counts: Object.fromEntries(
      Object.entries(sources).map(([key, value]) => [key, value.rows.length]),
    ),
    source_errors: Object.fromEntries(
      Object.entries(sources)
        .filter(([, value]) => value.error)
        .map(([key, value]) => [key, value.error]),
    ),
    prepared_counts: {
      growth_profile_runs: profileRuns.length,
      growth_backlog_candidates: candidates.length,
      growth_backlog_items: items.length,
      proposed_experiments_for_council_review: experiments.length,
    },
    apply_result,
    samples: {
      profile_runs: profileRuns.slice(0, 5),
      candidates: candidates.slice(0, 10),
      items: items.slice(0, 5),
      proposed_experiments: experiments.slice(0, 5),
    },
  };

  if (writeArtifactsEnabled) {
    await writeArtifacts(
      outDir,
      "growth-unified-backlog-backfill",
      report,
      renderMarkdown(report),
    );
  }
  console.log(
    JSON.stringify(
      {
        mode: report.mode,
        outDir: writeArtifactsEnabled ? outDir : null,
        artifacts_written: writeArtifactsEnabled,
        prepared_counts: report.prepared_counts,
      },
      null,
      2,
    ),
  );
}

async function readSources() {
  const tables = {
    growth_inventory:
      "id,account_id,website_id,locale,market,source_url,canonical_url,cluster,intent,funnel_stage,channel,gsc_clicks_28d,gsc_impressions_28d,gsc_ctr,gsc_avg_position,ga4_sessions_28d,qualified_leads,bookings_confirmed,hypothesis,experiment_id,success_metric,owner,owner_issue,evaluation_date,status,priority_score,next_action,technical_status,content_status,conversion_status,attribution_status,updated_at",
    seo_audit_findings: "*",
    seo_keyword_opportunities: "*",
    seo_serp_snapshots: "*",
    seo_joint_growth_facts: "*",
    growth_gsc_cache:
      "id,account_id,website_id,cache_key,cache_tag,fetched_at,expires_at",
    growth_ga4_cache:
      "id,account_id,website_id,cache_key,cache_tag,fetched_at,expires_at",
    growth_dataforseo_cache:
      "id,account_id,website_id,endpoint,cache_key,cache_tag,fetched_at,expires_at",
    seo_provider_usage: "*",
  };
  const entries = await Promise.all(
    Object.entries(tables).map(async ([table, columns]) => [
      table,
      await fetchRows(sb, table, columns, { websiteId, limit }),
    ]),
  );
  return Object.fromEntries(entries);
}

function buildProfileRuns(sources) {
  const runs = [];
  for (const row of sources.growth_gsc_cache.rows) {
    runs.push(
      runRef(
        "gsc",
        profileFromCache(row, "gsc_cache"),
        row.cache_key,
        accountId,
        websiteId,
        {
          observed_at: row.fetched_at,
          row_count: estimatePayloadRows(row),
          artifact_path: `supabase:growth_gsc_cache:${row.id}`,
          evidence: {
            cache_tag: row.cache_tag,
            source_table: "growth_gsc_cache",
          },
        },
      ),
    );
  }
  for (const row of sources.growth_ga4_cache.rows) {
    runs.push(
      runRef(
        "ga4",
        profileFromCache(row, "ga4_cache"),
        row.cache_key,
        accountId,
        websiteId,
        {
          observed_at: row.fetched_at,
          row_count: estimatePayloadRows(row),
          artifact_path: `supabase:growth_ga4_cache:${row.id}`,
          evidence: {
            cache_tag: row.cache_tag,
            source_table: "growth_ga4_cache",
          },
        },
      ),
    );
  }
  for (const row of sources.growth_dataforseo_cache.rows) {
    runs.push(
      runRef(
        "dataforseo",
        row.endpoint ?? profileFromCache(row, "dataforseo_cache"),
        row.cache_key,
        accountId,
        websiteId,
        {
          observed_at: row.fetched_at,
          row_count: estimatePayloadRows(row),
          artifact_path: `supabase:growth_dataforseo_cache:${row.id}`,
          evidence: {
            cache_tag: row.cache_tag,
            endpoint: row.endpoint,
            source_table: "growth_dataforseo_cache",
          },
        },
      ),
    );
  }
  for (const row of sources.seo_provider_usage.rows) {
    runs.push(
      runRef(
        row.provider ?? "dataforseo",
        row.profile ?? row.endpoint ?? "provider_usage",
        row.run_id ?? row.id ?? fingerprint(row),
        accountId,
        websiteId,
        {
          observed_at: row.created_at ?? row.observed_at,
          row_count: row.row_count ?? 0,
          cost: row.cost_usd ?? row.cost ?? null,
          currency: row.currency ?? "USD",
          artifact_path: `supabase:seo_provider_usage:${row.id}`,
          evidence: {
            source_table: "seo_provider_usage",
            provider_status: row.status ?? null,
          },
        },
      ),
    );
  }
  return dedupe(
    runs,
    (row) => `${row.website_id}|${row.profile_id}|${row.run_id}`,
  );
}

function buildCandidates(sources) {
  const candidates = [];
  for (const row of sources.growth_inventory.rows) {
    candidates.push(
      candidateFromRow({
        row,
        table: "growth_inventory",
        accountId,
        websiteId,
        sourceProfile: "legacy_growth_inventory",
        workType: inferInventoryWorkType(row),
        title:
          row.hypothesis ??
          `Legacy inventory: ${row.canonical_url ?? row.source_url}`,
        nextAction:
          row.next_action ??
          "Review legacy growth_inventory row and promote only if baseline is complete.",
        baseline: null,
        priorityScore: row.priority_score,
        confidenceScore: hasCouncilFields(row) ? 0.8 : 0.55,
        correlationStatus: hasCouncilFields(row) ? "PASS" : "WATCH",
      }),
    );
  }
  for (const row of sources.seo_audit_findings.rows) {
    candidates.push(
      candidateFromRow({
        row,
        table: "seo_audit_findings",
        accountId,
        websiteId,
        sourceProfile: "dataforseo_onpage_finding",
        workType: "technical_remediation",
        title: `Technical SEO finding: ${row.finding_type ?? row.type ?? row.operational_severity ?? "finding"}`,
        nextAction:
          "Triage technical finding and decide fix, redirect, remove, watch or content-blocked.",
        priorityScore: severityScore(row),
        confidenceScore: 0.7,
        correlationStatus: "WATCH",
      }),
    );
  }
  for (const row of sources.seo_keyword_opportunities.rows) {
    candidates.push(
      candidateFromRow({
        row,
        table: "seo_keyword_opportunities",
        accountId,
        websiteId,
        sourceProfile: row.source_profile ?? "dataforseo_labs_demand",
        workType: "content_opportunity",
        title: `Keyword opportunity: ${row.keyword}`,
        nextAction:
          "Review keyword opportunity for content brief or page update.",
        priorityScore: row.priority_score ?? row.search_volume ?? 0,
        confidenceScore: row.relevant_page ? 0.75 : 0.6,
        correlationStatus: row.relevant_page ? "PASS" : "WATCH",
      }),
    );
  }
  for (const row of sources.seo_serp_snapshots.rows) {
    candidates.push(
      candidateFromRow({
        row,
        table: "seo_serp_snapshots",
        accountId,
        websiteId,
        sourceProfile: row.source_profile ?? "dataforseo_serp",
        workType: "serp_competitor_opportunity",
        title: `SERP opportunity: ${row.keyword}`,
        nextAction:
          "Review SERP features, competitors and snippet/schema opportunity.",
        priorityScore: row.priority_score ?? 0,
        confidenceScore: row.own_rank ? 0.75 : 0.55,
        correlationStatus: "WATCH",
      }),
    );
  }
  for (const row of sources.seo_joint_growth_facts.rows) {
    candidates.push(
      candidateFromRow({
        row,
        table: "seo_joint_growth_facts",
        accountId,
        websiteId,
        sourceProfile: row.source_profile ?? "joint_growth_fact",
        workType: row.work_type ?? row.fact_type ?? "joint_growth_opportunity",
        title: row.title ?? `Joint growth fact: ${row.entity_key ?? row.id}`,
        nextAction:
          row.next_action ??
          "Review joint fact and promote to backlog if hypothesis is clear.",
        priorityScore: row.priority_score ?? 0,
        confidenceScore: row.confidence_score ?? 0.75,
        correlationStatus: row.confidence_score >= 0.7 ? "PASS" : "WATCH",
      }),
    );
  }
  return dedupe(candidates, (row) => row.candidate_key);
}

function buildItems(candidates) {
  return candidates
    .filter(
      (row) =>
        row.status === "candidate" &&
        row.baseline &&
        row.priority_score > 0 &&
        row.confidence_score >= 0.7,
    )
    .slice(0, 100)
    .map((row) => ({
      candidate_key: row.candidate_key,
      account_id: row.account_id,
      website_id: row.website_id,
      candidate_id: null,
      item_key: fingerprint("item", row.candidate_key),
      entity_type: row.entity_type,
      entity_key: row.entity_key,
      work_type: row.work_type,
      title: row.title,
      market: row.market,
      locale: row.locale,
      channel: row.channel,
      source_profiles: row.source_profiles,
      source_fact_refs: row.source_fact_refs,
      baseline: row.baseline,
      hypothesis:
        row.hypothesis ??
        `If we address ${row.work_type} for ${row.entity_key}, Growth OS metrics should improve.`,
      priority_score: row.priority_score,
      confidence_score: row.confidence_score,
      independence_key: `${row.entity_type}:${row.entity_key}`,
      owner_role: inferOwnerRole(row.work_type),
      owner_issue: inferOwnerIssue(row.work_type),
      next_action: row.next_action,
      success_metric: inferSuccessMetric(row),
      evaluation_date: inferEvaluationDate(row),
      status: "ready_for_council",
      blocked_reason: null,
      evidence: row.evidence,
    }));
}

function buildExperiments(items) {
  return items
    .filter(
      (row) =>
        row.status === "ready_for_council" &&
        row.success_metric &&
        row.evaluation_date,
    )
    .slice(0, 5)
    .map((row) => ({
      account_id: row.account_id,
      website_id: row.website_id,
      experiment_key: fingerprint("experiment", row.item_key),
      item_id: row.item_id ?? null,
      item_key: row.item_key,
      name: row.title,
      independence_key: row.independence_key,
      hypothesis: row.hypothesis,
      baseline: row.baseline,
      owner_role: row.owner_role,
      owner_issue: row.owner_issue,
      success_metric: row.success_metric,
      evaluation_date: row.evaluation_date,
      priority_score: row.priority_score,
      confidence_score: row.confidence_score,
      status: "proposed",
      evidence: {
        source_profiles: row.source_profiles,
        source_fact_refs: row.source_fact_refs,
      },
    }));
}

function inferInventoryWorkType(row) {
  if (
    row.technical_status &&
    !["pass", "unknown"].includes(String(row.technical_status).toLowerCase())
  )
    return "technical_remediation";
  if (
    row.conversion_status &&
    !["pass", "unknown"].includes(String(row.conversion_status).toLowerCase())
  )
    return "cro_activation";
  if (row.channel === "seo") return "seo_demand";
  return "growth_opportunity";
}

function inferOwnerRole(workType) {
  if (workType.includes("technical")) return "A4";
  if (workType.includes("content") || workType.includes("seo")) return "A5";
  if (workType.includes("cro") || workType.includes("tracking")) return "A3";
  return "A5";
}

function inferOwnerIssue(workType) {
  if (workType.includes("technical")) return "#313";
  if (workType.includes("content")) return "#314";
  if (workType.includes("serp") || workType.includes("seo")) return "#321";
  return "#311";
}

function inferSuccessMetric(row) {
  const source = row.evidence?.source_row ?? {};
  if (source.success_metric) return source.success_metric;
  if (row.work_type.includes("technical"))
    return "Finding remains resolved on the next comparable crawl";
  if (row.work_type.includes("content"))
    return "Organic impressions/clicks improve on the next comparable GSC window";
  if (row.work_type.includes("serp") || row.work_type.includes("seo"))
    return "CTR, rank or organic clicks improve on the next comparable readout";
  if (row.work_type.includes("cro"))
    return "Activation rate improves on the next comparable GA4/funnel window";
  return "Council-selected Growth OS metric improves on the next comparable readout";
}

function inferEvaluationDate(row) {
  const source = row.evidence?.source_row ?? {};
  if (source.evaluation_date) return source.evaluation_date;
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 28);
  return date.toISOString();
}

function hasCouncilFields(row) {
  return Boolean(
    row.owner_issue &&
    row.success_metric &&
    row.evaluation_date &&
    (row.baseline_start || row.gsc_impressions_28d || row.ga4_sessions_28d),
  );
}

function severityScore(row) {
  const severity = String(
    row.operational_severity ?? row.severity ?? "",
  ).toUpperCase();
  if (severity === "P0") return 100;
  if (severity === "P1") return 70;
  if (severity === "WATCH") return 30;
  return 10;
}

function profileFromCache(row, fallback) {
  const tag = row.cache_tag ?? row.cache_key ?? fallback;
  return String(tag).split(":").at(-1) || fallback;
}

function estimatePayloadRows(row) {
  const payload = row.payload;
  if (Array.isArray(payload)) return payload.length;
  if (Array.isArray(payload?.rows)) return payload.rows.length;
  if (Array.isArray(payload?.tasks)) return payload.tasks.length;
  return 1;
}

function dedupe(rows, keyFn) {
  return [...new Map(rows.map((row) => [keyFn(row), row])).values()];
}

function renderMarkdown(report) {
  return `# Growth Unified Backlog Backfill

Mode: \`${report.mode}\`  
Generated: ${report.generated_at}

## Counts

${renderTable(
  Object.entries(report.prepared_counts).map(([name, count]) => ({
    name,
    count,
  })),
  [
    { label: "Target", value: (row) => row.name },
    { label: "Prepared", value: (row) => row.count },
  ],
)}

## Source Counts

${renderTable(
  Object.entries(report.source_counts).map(([name, count]) => ({
    name,
    count,
  })),
  [
    { label: "Source", value: (row) => row.name },
    { label: "Rows", value: (row) => row.count },
  ],
)}

## Policy

- Scripts create candidates only.
- Reviewed backlog items require evidence and baseline.
- Council creates experiments.
- Legacy \`growth_inventory\` is compatibility input, not automatic truth.
`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
