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
  args.outDir ?? path.join("artifacts/seo", `${today()}-growth-content-tasks`);
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
    .eq("status", "brief_in_progress")
    .limit(100);
  if (error) throw new Error(error.message);

  const tasks = (data ?? [])
    .filter((row) => row.evidence?.content_brief)
    .map(toContentTask);
  const applyResult = apply
    ? await applyTaskEvidence(tasks)
    : { mode: "dry-run", tasks: tasks.length };
  const report = {
    generated_at: new Date().toISOString(),
    mode: apply ? "apply" : "dry-run",
    website_id: websiteId,
    storage_policy:
      "growth_content_tasks table is not present yet; tasks are stored in growth_backlog_items.evidence.content_task and artifacts until Flutter/SSOT migration exists.",
    counts: {
      brief_in_progress_items: data?.length ?? 0,
      content_tasks_prepared: tasks.length,
      locale_gate_required: tasks.filter((row) => row.locale_gate_required)
        .length,
      seo_ready_without_locale_gate: tasks.filter(
        (row) => !row.locale_gate_required,
      ).length,
    },
    apply_result: applyResult,
    tasks,
  };

  await writeArtifacts(
    outDir,
    "growth-content-tasks",
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

function toContentTask(row) {
  const brief = row.evidence.content_brief;
  const localeGateRequired = Boolean(brief.locale_gate_required);
  return {
    backlog_item_id: row.id,
    item_key: row.item_key,
    title: row.title,
    entity_key: row.entity_key,
    work_type: row.work_type,
    owner_issue: row.owner_issue,
    baseline: row.baseline,
    priority_score: Number(row.priority_score ?? 0),
    success_metric: row.success_metric,
    evaluation_date: row.evaluation_date,
    brief_artifact: brief.artifact,
    brief_type: brief.brief_type,
    target_locale: brief.target_locale,
    locale_gate_required: localeGateRequired,
    task_status: localeGateRequired ? "locale_qa_required" : "ready_for_seo_qa",
    qa_checks: [
      ...(brief.required_checks ?? []),
      "Smoke final URL status/canonical before publishing.",
      "Verify CTA/WAFlow path after content update.",
      "Re-run Growth Council packet after apply.",
    ],
    next_action: localeGateRequired
      ? "Run EN/locale quality gate before any sitemap/hreflang or publish action."
      : "Prepare Studio content update draft, then run SEO/canonical/CTA smoke.",
  };
}

async function applyTaskEvidence(tasks) {
  const result = {
    mode: "apply",
    requested_updates: tasks.length,
    updated: 0,
    errors: [],
  };
  for (const task of tasks) {
    const { data: item, error: readError } = await sb
      .from("growth_backlog_items")
      .select("id,evidence")
      .eq("id", task.backlog_item_id)
      .maybeSingle();
    if (readError || !item) {
      result.errors.push({
        id: task.backlog_item_id,
        message: readError?.message ?? "item not found",
      });
      continue;
    }
    const { error } = await sb
      .from("growth_backlog_items")
      .update({
        evidence: {
          ...(item.evidence ?? {}),
          content_task: {
            generated_at: new Date().toISOString(),
            storage:
              "growth_backlog_items.evidence until growth_content_tasks migration",
            ...task,
          },
        },
      })
      .eq("id", task.backlog_item_id);
    if (error)
      result.errors.push({ id: task.backlog_item_id, message: error.message });
    else result.updated += 1;
  }
  return result;
}

function renderMarkdown(report) {
  return `# Growth Content Tasks

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

## Tasks

${renderTable(report.tasks, [
  { label: "Status", value: (row) => row.task_status },
  { label: "Locale gate", value: (row) => row.locale_gate_required },
  { label: "URL", value: (row) => row.entity_key },
  { label: "Artifact", value: (row) => row.brief_artifact },
])}
`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
