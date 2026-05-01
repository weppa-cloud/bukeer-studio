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
const apply = args.apply === "true";
const websiteId = args.websiteId ?? DEFAULT_WEBSITE_ID;
const outDir =
  args.outDir ?? path.join("artifacts/seo", `${today()}-growth-blocked-items`);
const sb = getSupabase();

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const { data, error } = await sb
    .from("growth_backlog_items")
    .select("*")
    .eq("website_id", websiteId)
    .eq("status", "blocked")
    .limit(100);
  if (error) throw new Error(error.message);

  const classifications = (data ?? []).map(classify);
  const applyResult = apply
    ? await applyClassifications(classifications)
    : { mode: "dry-run", rows: classifications.length };
  const report = {
    generated_at: new Date().toISOString(),
    mode: apply ? "apply" : "dry-run",
    website_id: websiteId,
    counts: {
      blocked_items: classifications.length,
      locale_gate_required: classifications.filter(
        (row) => row.blocker_type === "locale_gate_required",
      ).length,
      tracking_or_attribution: classifications.filter(
        (row) => row.blocker_type === "tracking_or_attribution",
      ).length,
      provider_or_access: classifications.filter(
        (row) => row.blocker_type === "provider_or_access",
      ).length,
      needs_manual_review: classifications.filter(
        (row) => row.blocker_type === "needs_manual_review",
      ).length,
    },
    apply_result: applyResult,
    classifications,
  };

  await writeArtifacts(
    outDir,
    "growth-blocked-items",
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

function classify(row) {
  const text = JSON.stringify({
    entity_key: row.entity_key,
    title: row.title,
    next_action: row.next_action,
    evidence: row.evidence,
    source_profiles: row.source_profiles,
  }).toLowerCase();
  let blockerType = "needs_manual_review";
  let reason =
    "Blocked row needs human review before promotion to Council or execution.";
  let nextAction =
    "Review source facts and either unblock with evidence, move to watch, or keep blocked with owner.";

  if (
    /en\.colombiatours|\/en\/|translation|locale|hreflang|quality/.test(text)
  ) {
    blockerType = "locale_gate_required";
    reason =
      "EN/localized page has demand but requires translation/locale quality gate before Council or publish action.";
    nextAction =
      "Route to #314/#315 EN quality backlog; keep hidden or watch until title/meta/H1/canonical/content quality pass.";
  } else if (/tracking|waflow|attribution|conversion|paid|utm/.test(text)) {
    blockerType = "tracking_or_attribution";
    reason =
      "Tracking or attribution evidence is insufficient for a measurable experiment.";
    nextAction =
      "Resolve first-party funnel/CRM attribution before Council promotion.";
  } else if (
    /backlink|llm|provider|access|subscription|dataforseo/.test(text)
  ) {
    blockerType = "provider_or_access";
    reason =
      "Provider access or paid data dependency is unavailable or incomplete.";
    nextAction =
      "Keep as WATCH/BLOCKED until provider access or fallback profile exists.";
  }

  return {
    id: row.id,
    item_key: row.item_key,
    title: row.title,
    entity_key: row.entity_key,
    work_type: row.work_type,
    owner_issue: row.owner_issue,
    blocker_type: blockerType,
    blocked_reason: reason,
    next_action: nextAction,
    evidence: row.evidence ?? {},
  };
}

async function applyClassifications(classifications) {
  const result = {
    mode: "apply",
    requested_updates: classifications.length,
    updated: 0,
    errors: [],
  };
  for (const row of classifications) {
    const { error } = await sb
      .from("growth_backlog_items")
      .update({
        blocked_reason: row.blocked_reason,
        evidence: {
          ...row.evidence,
          blocked_classification: {
            classified_at: new Date().toISOString(),
            blocker_type: row.blocker_type,
            blocked_reason: row.blocked_reason,
            next_action: row.next_action,
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
  return `# Growth Blocked Items Classification

Mode: \`${report.mode}\`  
Generated: ${report.generated_at}

## Counts

${renderTable(
  Object.entries(report.counts).map(([metric, count]) => ({ metric, count })),
  [
    { label: "Metric", value: (row) => row.metric },
    { label: "Count", value: (row) => row.count },
  ],
)}

## Classifications

${renderTable(report.classifications, [
  { label: "Type", value: (row) => row.blocker_type },
  { label: "Issue", value: (row) => row.owner_issue },
  { label: "URL", value: (row) => row.entity_key },
  { label: "Reason", value: (row) => row.blocked_reason },
])}
`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
