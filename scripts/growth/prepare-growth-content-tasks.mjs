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
  const durableTables = await detectDurableTables();
  const applyResult = apply
    ? await applyTaskEvidence(tasks, durableTables)
    : { mode: "dry-run", tasks: tasks.length };
  const report = {
    generated_at: new Date().toISOString(),
    mode: apply ? "apply" : "dry-run",
    website_id: websiteId,
    durable_tables: durableTables,
    storage_policy: durableTables.ready
      ? "Durable storage enabled: growth_content_briefs and growth_content_tasks are the operational SSOT. growth_backlog_items.evidence.content_task remains a compatibility trace."
      : "Durable storage unavailable: tasks are stored in growth_backlog_items.evidence.content_task and artifacts until the Flutter/SSOT migration is applied.",
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
  const targetLocale = brief.target_locale ?? row.locale ?? null;
  const briefKey = fingerprint(
    "growth-content-brief",
    websiteId,
    row.id,
    brief.artifact ?? row.item_key,
  );
  const taskKey = fingerprint("growth-content-task", websiteId, row.id);
  return {
    account_id: row.account_id ?? accountId,
    website_id: row.website_id ?? websiteId,
    backlog_item_id: row.id,
    item_key: row.item_key,
    brief_key: briefKey,
    task_key: taskKey,
    title: row.title,
    entity_key: row.entity_key,
    work_type: row.work_type,
    locale: row.locale,
    owner_issue: row.owner_issue,
    baseline: row.baseline,
    priority_score: Number(row.priority_score ?? 0),
    success_metric: row.success_metric,
    evaluation_date: row.evaluation_date,
    brief_artifact: brief.artifact,
    brief_type: brief.brief_type,
    target_locale: targetLocale,
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

async function detectDurableTables() {
  const tables = {};
  for (const table of ["growth_content_briefs", "growth_content_tasks"]) {
    const { error } = await sb.from(table).select("id").limit(1);
    tables[table] = error
      ? { exists: false, error: error.message }
      : { exists: true, error: null };
  }
  return {
    ready:
      tables.growth_content_briefs.exists && tables.growth_content_tasks.exists,
    tables,
  };
}

async function applyTaskEvidence(tasks, durableTables) {
  const result = {
    mode: "apply",
    requested_updates: tasks.length,
    durable_storage: durableTables.ready,
    briefs_upserted: 0,
    tasks_upserted: 0,
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
    let contentTaskTrace = {
      generated_at: new Date().toISOString(),
      storage: durableTables.ready
        ? "growth_content_tasks"
        : "growth_backlog_items.evidence until growth_content_tasks migration",
      ...task,
    };

    if (durableTables.ready) {
      const durableResult = await upsertDurableContentTask(task);
      if (durableResult.error) {
        result.errors.push({
          id: task.backlog_item_id,
          message: durableResult.error,
        });
      } else {
        result.briefs_upserted += 1;
        result.tasks_upserted += 1;
        contentTaskTrace = {
          ...contentTaskTrace,
          brief_id: durableResult.brief_id,
          task_id: durableResult.task_id,
        };
      }
    }

    const { error } = await sb
      .from("growth_backlog_items")
      .update({
        evidence: {
          ...(item.evidence ?? {}),
          content_task: contentTaskTrace,
        },
      })
      .eq("id", task.backlog_item_id);
    if (error)
      result.errors.push({ id: task.backlog_item_id, message: error.message });
    else result.updated += 1;
  }
  return result;
}

async function upsertDurableContentTask(task) {
  const briefRow = toBriefRow(task);
  const { data: brief, error: briefError } = await sb
    .from("growth_content_briefs")
    .upsert(briefRow, { onConflict: "website_id,brief_key" })
    .select("id")
    .single();
  if (briefError) return { error: briefError.message };

  const taskRow = toTaskRow(task, brief.id);
  const { data: contentTask, error: taskError } = await sb
    .from("growth_content_tasks")
    .upsert(taskRow, { onConflict: "website_id,task_key" })
    .select("id")
    .single();
  if (taskError) return { error: taskError.message };

  return { brief_id: brief.id, task_id: contentTask.id, error: null };
}

function toBriefRow(task) {
  return {
    account_id: task.account_id,
    website_id: task.website_id,
    backlog_item_id: task.backlog_item_id,
    brief_key: task.brief_key,
    version: 1,
    title: task.title,
    brief_type: task.brief_type,
    source_locale: task.locale ?? null,
    target_locale: task.target_locale ?? null,
    locale_gate_required: task.locale_gate_required,
    status: "generated",
    artifact_path: task.brief_artifact,
    objective: task.next_action,
    hypothesis: null,
    baseline: task.baseline,
    success_metric: task.success_metric,
    evaluation_date: dateOnly(task.evaluation_date),
    required_checks: task.qa_checks,
    outline: [],
    evidence: {
      source: "prepare-growth-content-tasks",
      item_key: task.item_key,
      priority_score: task.priority_score,
      owner_issue: task.owner_issue,
    },
  };
}

function toTaskRow(task, briefId) {
  return {
    account_id: task.account_id,
    website_id: task.website_id,
    backlog_item_id: task.backlog_item_id,
    brief_id: briefId,
    task_key: task.task_key,
    task_type: task.brief_type,
    title: task.title,
    entity_key: task.entity_key,
    target_locale: task.target_locale ?? null,
    locale_gate_required: task.locale_gate_required,
    status: task.task_status,
    owner_role: "SEO/Growth Content",
    owner_issue: task.owner_issue,
    next_action: task.next_action,
    qa_checks: task.qa_checks,
    artifact_path: task.brief_artifact,
    due_date: dateOnly(task.evaluation_date),
    evidence: {
      source: "prepare-growth-content-tasks",
      item_key: task.item_key,
      baseline: task.baseline,
      priority_score: task.priority_score,
      success_metric: task.success_metric,
    },
  };
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

function dateOnly(value) {
  if (!value) return null;
  return String(value).slice(0, 10);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
