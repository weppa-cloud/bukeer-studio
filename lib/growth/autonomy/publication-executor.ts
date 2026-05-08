import type {
  GrowthPublicationJobInsert,
  GrowthWorkItemOutcomeInsert,
} from "@bukeer/website-contract";

type JsonRecord = Record<string, unknown>;

interface SupabaseLike {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
}

export interface PublicationExecutionPlan {
  job: GrowthPublicationJobInsert;
  outcomes: Omit<GrowthWorkItemOutcomeInsert, "publication_job_id">[];
  smoke: {
    pass: boolean;
    checks: string[];
    failures: string[];
  };
}

export interface PublicationExecutionResult {
  publicationJobId: string | null;
  status: "dry_run_ready" | "blocked" | "smoke_passed" | "rolled_back";
  applied: boolean;
  rolledBack: boolean;
  targetId: string | null;
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function hasRecord(value: unknown): boolean {
  return Object.keys(asRecord(value)).length > 0;
}

function hasTarget(job: GrowthPublicationJobInsert): boolean {
  return Boolean(job.target_table && (job.target_id || job.target_path));
}

function validateLiveApplyPlan(plan: PublicationExecutionPlan): string[] {
  if (plan.job.job_mode !== "live") return [];
  const failures: string[] = [];
  if (!hasTarget(plan.job)) failures.push("missing_target");
  if (!hasRecord(asRecord(plan.job.evidence).rollback_expectation)) {
    failures.push("missing_rollback_expectation");
  }
  if (!hasRecord(plan.job.baseline)) failures.push("missing_baseline");
  if (!plan.job.success_metric?.trim()) failures.push("missing_success_metric");
  if (plan.outcomes.length === 0) failures.push("missing_outcome_plan");
  for (const outcome of plan.outcomes) {
    if (!outcome.success_metric?.trim()) failures.push("missing_outcome_success_metric");
    if (!hasRecord(outcome.baseline)) failures.push("missing_outcome_baseline");
    if (!outcome.evaluation_window) failures.push("missing_evaluation_window");
  }
  return Array.from(new Set(failures));
}

async function insertPublicationJob(
  supabase: SupabaseLike,
  job: GrowthPublicationJobInsert,
) {
  const { data, error } = await supabase
    .from("growth_publication_jobs")
    .upsert(job, { onConflict: "website_id,idempotency_key" })
    .select("id,target_id")
    .limit(1);
  if (error) throw new Error(`publication job insert failed: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  return {
    id: typeof row?.id === "string" ? row.id : null,
    targetId: typeof row?.target_id === "string" ? row.target_id : job.target_id,
  };
}

async function updatePublicationJob(
  supabase: SupabaseLike,
  publicationJobId: string | null,
  patch: JsonRecord,
) {
  if (!publicationJobId) return;
  const { error } = await supabase
    .from("growth_publication_jobs")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", publicationJobId);
  if (error) throw new Error(`publication job update failed: ${error.message}`);
}

async function updateWorkItem(
  supabase: SupabaseLike,
  workItemId: string,
  patch: JsonRecord,
) {
  const { error } = await supabase
    .from("growth_work_items")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", workItemId);
  if (error) throw new Error(`work item update failed: ${error.message}`);
}

async function updateChangeSet(
  supabase: SupabaseLike,
  changeSetId: string,
  patch: JsonRecord,
) {
  const { error } = await supabase
    .from("growth_agent_change_sets")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", changeSetId);
  if (error) throw new Error(`change set update failed: ${error.message}`);
}

async function applyTarget(
  supabase: SupabaseLike,
  job: GrowthPublicationJobInsert,
) {
  const after = asRecord(job.after_payload);
  const tableName = String(after.table ?? job.target_table);
  const targetId = job.target_id;
  const insertOrUpdate = asRecord(after.insert_or_update);
  const patch = asRecord(after.patch);
  const merge = asRecord(after.merge);

  if (Object.keys(insertOrUpdate).length > 0) {
    if (targetId) {
      const { error } = await supabase
        .from(tableName)
        .update(insertOrUpdate)
        .eq("id", targetId)
        .eq("website_id", job.website_id);
      if (error) throw new Error(error.message);
      return targetId;
    }
    const { data, error } = await supabase
      .from(tableName)
      .insert({
        website_id: job.website_id,
        locale: job.locale,
        ...insertOrUpdate,
      })
      .select("id")
      .limit(1);
    if (error) throw new Error(error.message);
    const row = Array.isArray(data) ? data[0] : data;
    return typeof row?.id === "string" ? row.id : null;
  }

  if (Object.keys(patch).length > 0) {
    if (!targetId) throw new Error("missing target id for patch");
    const { error } = await supabase
      .from(tableName)
      .update(patch)
      .eq("id", targetId)
      .eq("website_id", job.website_id);
    if (error) throw new Error(error.message);
    return targetId;
  }

  if (Object.keys(merge).length > 0) {
    if (!targetId) throw new Error("missing target id for merge");
    const { error } = await supabase
      .from(tableName)
      .update(merge)
      .eq("id", targetId)
      .eq("website_id", job.website_id);
    if (error) throw new Error(error.message);
    return targetId;
  }

  throw new Error("after_payload has no supported mutation payload");
}

async function rollbackTarget(
  supabase: SupabaseLike,
  job: GrowthPublicationJobInsert,
  targetId: string | null,
) {
  const rollback = asRecord(job.rollback_payload);
  const tableName = String(rollback.table ?? job.target_table);
  const restore = asRecord(rollback.restore);
  const deleteSlug = rollback.delete_created_slug;

  if (typeof deleteSlug === "string") {
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq("website_id", job.website_id)
      .eq("slug", deleteSlug);
    if (error) throw new Error(error.message);
    return;
  }

  const rollbackTargetId =
    typeof rollback.target_id === "string" ? rollback.target_id : targetId;
  if (!rollbackTargetId || Object.keys(restore).length === 0) return;

  const { error } = await supabase
    .from(tableName)
    .update(restore)
    .eq("id", rollbackTargetId)
    .eq("website_id", job.website_id);
  if (error) throw new Error(error.message);
}

export async function recordGrowthOutcomes({
  supabase,
  publicationJobId,
  outcomes,
}: {
  supabase: SupabaseLike;
  publicationJobId: string;
  outcomes: Omit<GrowthWorkItemOutcomeInsert, "publication_job_id">[];
}) {
  if (outcomes.length === 0) return [];
  const rows = outcomes.map((outcome) => ({
    ...outcome,
    publication_job_id: publicationJobId,
  }));
  const { data, error } = await supabase
    .from("growth_work_item_outcomes")
    .upsert(rows, {
      onConflict: "work_item_id,publication_job_id,success_metric,evaluation_date",
    })
    .select("id");
  if (error) throw new Error(`outcome insert failed: ${error.message}`);
  return data ?? [];
}

export async function executeGrowthPublicationJob({
  supabase,
  plan,
}: {
  supabase: SupabaseLike;
  plan: PublicationExecutionPlan;
}): Promise<PublicationExecutionResult> {
  const now = new Date().toISOString();
  const liveApplyFailures = validateLiveApplyPlan(plan);
  if (liveApplyFailures.length > 0) {
    const blockedJob: GrowthPublicationJobInsert = {
      ...plan.job,
      job_mode: "dry_run",
      status: "blocked",
      smoke_result: {
        ...plan.smoke,
        pass: false,
        failures: [...plan.smoke.failures, ...liveApplyFailures],
      },
    };
    const inserted = await insertPublicationJob(supabase, blockedJob);
    return {
      publicationJobId: inserted.id,
      status: "blocked",
      applied: false,
      rolledBack: false,
      targetId: plan.job.target_id,
    };
  }
  const dryRunOrBlocked =
    plan.job.job_mode === "dry_run" || plan.job.status === "blocked";

  if (dryRunOrBlocked) {
    const inserted = await insertPublicationJob(supabase, plan.job);
    return {
      publicationJobId: inserted.id,
      status: plan.job.status === "blocked" ? "blocked" : "dry_run_ready",
      applied: false,
      rolledBack: false,
      targetId: plan.job.target_id,
    };
  }

  const applyingJob = {
    ...plan.job,
    status: "applying" as const,
    applied_at: null,
    smoke_checked_at: null,
    rolled_back_at: null,
  };
  const inserted = await insertPublicationJob(supabase, applyingJob);
  let targetId = plan.job.target_id ?? inserted.targetId;

  try {
    targetId = await applyTarget(supabase, plan.job);
    if (!plan.smoke.pass) {
      await rollbackTarget(supabase, plan.job, targetId);
      await updatePublicationJob(supabase, inserted.id, {
        status: "rolled_back",
        target_id: targetId,
        applied_at: now,
        smoke_checked_at: now,
        rolled_back_at: now,
        smoke_result: plan.smoke,
      });
      await updateWorkItem(supabase, plan.job.work_item_id, {
        status: "blocked",
        progress_label: "Smoke failed; rollback applied",
      });
      return {
        publicationJobId: inserted.id,
        status: "rolled_back",
        applied: true,
        rolledBack: true,
        targetId,
      };
    }

    await updatePublicationJob(supabase, inserted.id, {
      status: "smoke_passed",
      target_id: targetId,
      applied_at: now,
      smoke_checked_at: now,
      smoke_result: plan.smoke,
    });
    if (!inserted.id) {
      throw new Error("publication job id missing after insert");
    }
    await recordGrowthOutcomes({
      supabase,
      publicationJobId: inserted.id,
      outcomes: plan.outcomes,
    });
    await updateWorkItem(supabase, plan.job.work_item_id, {
      status: "published_applied",
      change_set_id: plan.job.change_set_id,
      completed_at: now,
      progress_label: "Publicado/aplicado y en medicion",
    });
    const changeSetPatch: JsonRecord = {
      status: plan.job.action_class === "safe_apply" ? "applied" : "published",
      requires_human_review: false,
      applied_at: now,
    };
    if (plan.job.action_class !== "safe_apply") {
      changeSetPatch.published_at = now;
    }
    await updateChangeSet(supabase, plan.job.change_set_id, changeSetPatch);
    return {
      publicationJobId: inserted.id,
      status: "smoke_passed",
      applied: true,
      rolledBack: false,
      targetId,
    };
  } catch (error) {
    await rollbackTarget(supabase, plan.job, targetId).catch(() => undefined);
    await updatePublicationJob(supabase, inserted.id, {
      status: "rolled_back",
      target_id: targetId,
      applied_at: now,
      smoke_checked_at: now,
      rolled_back_at: now,
      smoke_result: {
        ...plan.smoke,
        pass: false,
        failures: [
          ...plan.smoke.failures,
          error instanceof Error ? error.message : String(error),
        ],
      },
    });
    await updateWorkItem(supabase, plan.job.work_item_id, {
      status: "blocked",
      progress_label: "Apply failed; rollback attempted",
    });
    return {
      publicationJobId: inserted.id,
      status: "rolled_back",
      applied: false,
      rolledBack: true,
      targetId,
    };
  }
}
