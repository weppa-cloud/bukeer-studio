#!/usr/bin/env tsx

import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function readArg(name: string, fallback = ""): string {
  const prefix = `${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

async function countRows({
  supabase,
  table,
  accountId,
  websiteId,
  filters = {},
}: {
  supabase: ReturnType<typeof createSupabaseServiceRoleClient>;
  table: string;
  accountId: string;
  websiteId: string;
  filters?: Record<string, string | string[]>;
}): Promise<number> {
  let query = supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("account_id", accountId)
    .eq("website_id", websiteId);

  for (const [key, value] of Object.entries(filters)) {
    query = Array.isArray(value) ? query.in(key, value) : query.eq(key, value);
  }

  const { count, error } = await query;
  if (error) {
    console.warn(`[effectiveness] ${table} count skipped: ${error.message}`);
    return 0;
  }
  return count ?? 0;
}

async function buildSnapshot({
  supabase,
  accountId,
  websiteId,
}: {
  supabase: ReturnType<typeof createSupabaseServiceRoleClient>;
  accountId: string;
  websiteId: string;
}) {
  const [
    profileRuns,
    freshProfileRuns,
    readyCandidates,
    readyWorkItems,
    jobs,
    smokePassedJobs,
    outcomes,
    decisions,
    artifacts,
  ] = await Promise.all([
    countRows({ supabase, table: "growth_profile_runs", accountId, websiteId }),
    countRows({
      supabase,
      table: "growth_profile_runs",
      accountId,
      websiteId,
      filters: { freshness_status: "fresh", run_status: "completed" },
    }),
    countRows({
      supabase,
      table: "growth_opportunity_candidates",
      accountId,
      websiteId,
      filters: { status: "ready_for_backlog" },
    }),
    countRows({
      supabase,
      table: "growth_work_items",
      accountId,
      websiteId,
      filters: { status: "ready" },
    }),
    countRows({ supabase, table: "growth_publication_jobs", accountId, websiteId }),
    countRows({
      supabase,
      table: "growth_publication_jobs",
      accountId,
      websiteId,
      filters: { status: "smoke_passed" },
    }),
    countRows({ supabase, table: "growth_work_item_outcomes", accountId, websiteId }),
    countRows({ supabase, table: "growth_orchestrator_decisions", accountId, websiteId }),
    countRows({ supabase, table: "growth_agent_artifacts", accountId, websiteId }),
  ]);

  return {
    captured_at: new Date().toISOString(),
    sources: {
      profile_runs: profileRuns,
      fresh_profile_runs: freshProfileRuns,
      ready_candidates: readyCandidates,
      ready_work_items: readyWorkItems,
      publication_jobs: jobs,
      smoke_passed_jobs: smokePassedJobs,
      outcomes,
      orchestrator_decisions: decisions,
      agent_artifacts: artifacts,
    },
  };
}

async function main() {
  const accountId = readArg("--account-id", process.env.GROWTH_ACCOUNT_ID ?? "");
  const websiteId = readArg("--website-id", process.env.GROWTH_WEBSITE_ID ?? "");
  if (!accountId || !websiteId) {
    throw new Error("Missing --account-id/--website-id or GROWTH_ACCOUNT_ID/GROWTH_WEBSITE_ID.");
  }

  const supabase = createSupabaseServiceRoleClient();
  const dateKey = new Date().toISOString().slice(0, 10);
  const experimentKey = readArg(
    "--experiment-key",
    `effectiveness:${websiteId}:${dateKey}`,
  );
  const apply = hasFlag("--apply");
  const snapshot = await buildSnapshot({ supabase, accountId, websiteId });

  const row = {
    account_id: accountId,
    website_id: websiteId,
    experiment_key: experimentKey,
    title: readArg(
      "--title",
      "Growth OS + Hermes vs human Codex baseline",
    ),
    objective: readArg(
      "--objective",
      "Compare human/Codex baseline, deterministic Growth OS and Hermes-isolated Growth OS through the same live-gated executor.",
    ),
    status: apply ? "running" : "planned",
    baseline_actor: "baseline_human_codex",
    lane_targets: {
      technical_remediation: Number(readArg("--technical-target", "10")),
      content_creator: Number(readArg("--content-target", "5")),
      transcreation: Number(readArg("--transcreation-target", "5")),
    },
    success_criteria: {
      speed_improvement_vs_human_min: 0.3,
      hermes_quality_improvement_vs_deterministic_min: 0.2,
      duplicate_noise_reduction_vs_deterministic_min: 0.25,
      safety_violations_max: 0,
      mutation_boundary: "growth_os_executor_only",
      final_seo_windows: ["day_21", "day_45"],
    },
    evidence_snapshot: snapshot,
    started_at: apply ? new Date().toISOString() : null,
  };

  if (!apply) {
    console.log(JSON.stringify({ dryRun: true, row }, null, 2));
    return;
  }

  const { data, error } = await supabase
    .from("growth_effectiveness_experiments")
    .upsert(row, { onConflict: "website_id,experiment_key" })
    .select("id,experiment_key,status,evidence_snapshot")
    .limit(1);
  if (error) throw new Error(`effectiveness experiment upsert failed: ${error.message}`);

  console.log(JSON.stringify({ dryRun: false, experiment: data?.[0] ?? null }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
