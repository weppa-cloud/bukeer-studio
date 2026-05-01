#!/usr/bin/env node

import path from "node:path";
import process from "node:process";
import {
  DEFAULT_ACCOUNT_ID,
  DEFAULT_WEBSITE_ID,
  fingerprint,
  getSupabase,
  parseArgs,
  renderTable,
  writeArtifacts,
} from "../seo/growth-unified-backlog-lib.mjs";

const args = parseArgs(process.argv.slice(2));
const apply = args.apply === "true";
const websiteId = args.websiteId ?? DEFAULT_WEBSITE_ID;
const accountId = args.accountId ?? DEFAULT_ACCOUNT_ID;
const outDir =
  args.outDir ?? path.join("artifacts/seo", `${today()}-growth-human-reviews`);
const sb = getSupabase();

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const tableStatus = await detectTable("growth_human_reviews");
  const reviews = [
    ...(await councilApprovalReviews()),
    ...(await blockedLocaleGateReviews()),
  ];
  const applyResult = apply
    ? await applyReviews(reviews, tableStatus)
    : { mode: "dry-run", reviews: reviews.length };
  const report = {
    generated_at: new Date().toISOString(),
    mode: apply ? "apply" : "dry-run",
    website_id: websiteId,
    table_status: tableStatus,
    storage_policy: tableStatus.exists
      ? "Durable storage enabled: growth_human_reviews records Council approvals and manual blocks."
      : "Durable storage unavailable: migration must be applied before review ledger backfill.",
    counts: {
      reviews_prepared: reviews.length,
      council_approvals: reviews.filter((row) => row.decision === "approve")
        .length,
      locale_blocks: reviews.filter((row) => row.decision === "block").length,
    },
    apply_result: applyResult,
    reviews,
  };

  await writeArtifacts(
    outDir,
    "growth-human-reviews",
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

async function councilApprovalReviews() {
  const { data, error } = await sb
    .from("growth_experiments")
    .select(
      "id,backlog_item_id,experiment_key,name,status,owner_issue,decision_log",
    )
    .eq("website_id", websiteId)
    .in("status", ["approved", "planned", "active"])
    .limit(25);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    account_id: accountId,
    website_id: websiteId,
    backlog_item_id: row.backlog_item_id,
    experiment_id: row.id,
    review_key: fingerprint("human-review", "council-approval", row.id),
    reviewer_role: "Growth Council",
    reviewer_name: null,
    decision: "approve",
    rationale:
      "Approved as a Council experiment from PASS packet with source row, baseline, owner, metric and evaluation date.",
    status: "recorded",
    evidence: {
      source: "materialize-growth-human-reviews",
      experiment_key: row.experiment_key,
      experiment_status: row.status,
      owner_issue: row.owner_issue,
      source_packet: row.decision_log?.source_packet ?? null,
      approved_at: row.decision_log?.approved_at ?? null,
    },
  }));
}

async function blockedLocaleGateReviews() {
  const { data, error } = await sb
    .from("growth_backlog_items")
    .select("id,item_key,title,status,owner_issue,evidence")
    .eq("website_id", websiteId)
    .eq("status", "blocked")
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? [])
    .filter(
      (row) =>
        row.evidence?.blocked_classification?.blocker_type ===
        "locale_gate_required",
    )
    .map((row) => ({
      account_id: accountId,
      website_id: websiteId,
      backlog_item_id: row.id,
      experiment_id: null,
      review_key: fingerprint("human-review", "locale-gate-block", row.id),
      reviewer_role: "Growth Validator",
      reviewer_name: null,
      decision: "block",
      rationale:
        row.evidence.blocked_classification.blocked_reason ??
        "Blocked until locale quality gate passes.",
      status: "recorded",
      evidence: {
        source: "materialize-growth-human-reviews",
        item_key: row.item_key,
        title: row.title,
        owner_issue: row.owner_issue,
        next_action: row.evidence.blocked_classification.next_action,
        classified_at: row.evidence.blocked_classification.classified_at,
      },
    }));
}

async function detectTable(table) {
  const { error } = await sb.from(table).select("id").limit(1);
  return error
    ? { exists: false, error: error.message }
    : { exists: true, error: null };
}

async function applyReviews(reviews, tableStatus) {
  const result = {
    mode: "apply",
    durable_storage: tableStatus.exists,
    requested: reviews.length,
    upserted: 0,
    errors: [],
  };
  if (!tableStatus.exists) {
    result.errors.push({
      table: "growth_human_reviews",
      message: tableStatus.error,
    });
    return result;
  }
  for (const row of reviews) {
    const { error } = await sb
      .from("growth_human_reviews")
      .upsert(row, { onConflict: "website_id,review_key" });
    if (error)
      result.errors.push({
        review_key: row.review_key,
        message: error.message,
      });
    else result.upserted += 1;
  }
  return result;
}

function renderMarkdown(report) {
  return `# Growth Human Reviews

Mode: \`${report.mode}\`  
Generated: ${report.generated_at}

Storage policy: ${report.storage_policy}

## Counts

${renderTable(
  Object.entries(report.counts).map(([metric, count]) => ({ metric, count })),
  [
    { label: "Metric", value: (row) => row.metric },
    { label: "Count", value: (row) => row.count },
  ],
)}

## Reviews

${renderTable(report.reviews, [
  { label: "Decision", value: (row) => row.decision },
  { label: "Role", value: (row) => row.reviewer_role },
  { label: "Backlog item", value: (row) => row.backlog_item_id },
  { label: "Experiment", value: (row) => row.experiment_id ?? "" },
])}
`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
