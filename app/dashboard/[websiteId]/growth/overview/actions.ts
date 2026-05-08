"use server";

import { revalidatePath } from "next/cache";

import { requireGrowthRole } from "@/lib/growth/console/auth";
import {
  extractRollbackRestore,
  type TechnicalRemediationTargetTable,
} from "@/lib/growth/autonomy/technical-remediation-adapter";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

type ActionResult = {
  ok: boolean;
  message: string;
};

type DynamicTableClient = ReturnType<
  typeof createSupabaseServiceRoleClient
>["from"];

function table(
  admin: ReturnType<typeof createSupabaseServiceRoleClient>,
  tableName: string,
): ReturnType<DynamicTableClient> {
  return (
    admin.from as unknown as (name: string) => ReturnType<DynamicTableClient>
  )(tableName);
}

function revalidateGrowthOverview(websiteId: string) {
  revalidatePath(`/dashboard/${websiteId}/growth/overview`);
  revalidatePath(`/dashboard/${websiteId}/growth/workboard`);
  revalidatePath(`/dashboard/${websiteId}/growth/runs`);
  revalidatePath(`/dashboard/${websiteId}/growth/data-health`);
}

export async function toggleGrowthKillSwitch(
  formData: FormData,
): Promise<ActionResult> {
  const websiteId = String(formData.get("websiteId") ?? "");
  const nextEnabled = String(formData.get("nextEnabled") ?? "") === "true";
  if (!websiteId) return { ok: false, message: "Missing websiteId." };

  const ctx = await requireGrowthRole(websiteId, "council_admin");
  const admin = createSupabaseServiceRoleClient();
  const now = new Date().toISOString();

  const { error } = await table(admin, "growth_autonomy_policies")
    .update({
      kill_switch_enabled: nextEnabled,
      paused_reason: nextEnabled
        ? "Manual CEO cockpit kill switch."
        : null,
      updated_by: ctx.userId,
      updated_at: now,
    })
    .eq("account_id", ctx.accountId)
    .eq("website_id", ctx.websiteId);

  if (error) {
    return {
      ok: false,
      message: `Could not update kill switch: ${error.message}`,
    };
  }

  revalidateGrowthOverview(websiteId);
  return {
    ok: true,
    message: nextEnabled ? "Kill switch enabled." : "Kill switch disabled.",
  };
}

export async function rollbackGrowthPublicationJob(
  formData: FormData,
): Promise<ActionResult> {
  const websiteId = String(formData.get("websiteId") ?? "");
  const publicationJobId = String(formData.get("publicationJobId") ?? "");
  if (!websiteId || !publicationJobId) {
    return { ok: false, message: "Missing publication job." };
  }

  const ctx = await requireGrowthRole(websiteId, "council_admin");
  const admin = createSupabaseServiceRoleClient();
  const { data: jobRow, error: loadError } = await table(
    admin,
    "growth_publication_jobs",
  )
    .select(
      "id,account_id,website_id,locale,market,work_item_id,change_set_id,lane,action_class,status,target_table,target_id,rollback_payload",
    )
    .eq("account_id", ctx.accountId)
    .eq("website_id", ctx.websiteId)
    .eq("id", publicationJobId)
    .maybeSingle();

  if (loadError || !jobRow) {
    return { ok: false, message: "Publication job not found." };
  }

  const job = jobRow as {
    id: string;
    account_id: string;
    website_id: string;
    locale: string;
    market: string;
    work_item_id: string;
    change_set_id: string;
    lane: string;
    action_class: string;
    status: string;
    target_table: string;
    target_id: string | null;
    rollback_payload: unknown;
  };

  if (job.status === "rolled_back") {
    return { ok: true, message: "Publication job already rolled back." };
  }
  if (!["applied", "smoke_passed", "smoke_failed"].includes(job.status)) {
    return {
      ok: false,
      message: "Only applied or smoke-checked jobs can be rolled back.",
    };
  }

  const rollback = extractRollbackRestore(job.rollback_payload);
  if (rollback.targetId !== job.target_id) {
    return { ok: false, message: "Rollback target mismatch." };
  }
  const targetTable = rollback.table as TechnicalRemediationTargetTable;
  const now = new Date().toISOString();

  const { error: restoreError } = await table(admin, targetTable)
    .update({
      ...rollback.restore,
      updated_at: now,
    })
    .eq("id", rollback.targetId)
    .eq("website_id", ctx.websiteId);

  if (restoreError) {
    return {
      ok: false,
      message: `Rollback restore failed: ${restoreError.message}`,
    };
  }

  const { error: jobError } = await table(admin, "growth_publication_jobs")
    .update({
      status: "rolled_back",
      rolled_back_at: now,
      evidence: {
        rollback_source: "ceo_cockpit",
        rolled_back_by: ctx.userId,
        restored_fields: Object.keys(rollback.restore),
      },
      updated_at: now,
    })
    .eq("account_id", ctx.accountId)
    .eq("website_id", ctx.websiteId)
    .eq("id", publicationJobId);

  if (jobError) {
    return {
      ok: false,
      message: `Target restored, but job status update failed: ${jobError.message}`,
    };
  }

  revalidateGrowthOverview(websiteId);
  return { ok: true, message: "Publication job rolled back." };
}
