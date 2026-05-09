"use server";

import { revalidatePath } from "next/cache";

import { requireGrowthRole } from "@/lib/growth/console/auth";
import {
  extractRollbackRestore,
  type TechnicalRemediationTargetTable,
} from "@/lib/growth/autonomy/technical-remediation-adapter";
import { promoteGrowthOpportunityCandidates } from "@/lib/growth/autonomy/candidate-promotion";
import { revalidateGrowthPublicationSurface } from "@/lib/growth/autonomy/publication-revalidation";
import { enqueueGrowthAgentWakeup } from "@/lib/growth/agentic/wakeup-queue";
import { getLaneAgreement } from "@/lib/growth/console/queries";
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
  revalidatePath(`/dashboard/${websiteId}/growth/agents`);
  revalidatePath(`/dashboard/${websiteId}/growth/workboard`);
  revalidatePath(`/dashboard/${websiteId}/growth/runs`);
  revalidatePath(`/dashboard/${websiteId}/growth/data-health`);
}

function boundedInt(value: FormDataEntryValue | null, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.floor(parsed));
}

export async function toggleGrowthKillSwitch(
  formData: FormData,
): Promise<ActionResult> {
  const websiteId = String(formData.get("websiteId") ?? "");
  const nextEnabled = String(formData.get("nextEnabled") ?? "") === "true";
  if (!websiteId) return { ok: false, message: "Missing websiteId." };

  const ctx = await requireGrowthRole(websiteId, "growth_operator");
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

export async function pauseAutonomyLane(
  formData: FormData,
): Promise<ActionResult> {
  const websiteId = String(formData.get("websiteId") ?? "");
  const lane = String(formData.get("lane") ?? "");
  const reason = String(formData.get("reason") ?? "Manual lane pause.");
  if (!websiteId || !lane) return { ok: false, message: "Missing lane." };

  const ctx = await requireGrowthRole(websiteId, "council_admin");
  const admin = createSupabaseServiceRoleClient();
  const { error } = await table(admin, "growth_autonomy_policies")
    .update({
      kill_switch_enabled: true,
      paused_reason: reason,
      updated_by: ctx.userId,
      updated_at: new Date().toISOString(),
    })
    .eq("account_id", ctx.accountId)
    .eq("website_id", ctx.websiteId)
    .eq("lane", lane);

  if (error) return { ok: false, message: `Could not pause lane: ${error.message}` };
  revalidateGrowthOverview(websiteId);
  return { ok: true, message: "Lane paused." };
}

export async function togglePolicyDryRunOnly(
  formData: FormData,
): Promise<ActionResult> {
  const websiteId = String(formData.get("websiteId") ?? "");
  const policyId = String(formData.get("policyId") ?? "");
  const dryRunOnly = String(formData.get("dryRunOnly") ?? "") === "true";
  if (!websiteId || !policyId) return { ok: false, message: "Missing policy." };

  const ctx = await requireGrowthRole(websiteId, "council_admin");
  const admin = createSupabaseServiceRoleClient();
  const { error } = await table(admin, "growth_autonomy_policies")
    .update({
      dry_run_only: dryRunOnly,
      updated_by: ctx.userId,
      updated_at: new Date().toISOString(),
    })
    .eq("account_id", ctx.accountId)
    .eq("website_id", ctx.websiteId)
    .eq("id", policyId);

  if (error) {
    return { ok: false, message: `Could not update policy: ${error.message}` };
  }
  revalidateGrowthOverview(websiteId);
  return {
    ok: true,
    message: dryRunOnly ? "Policy set to dry-run only." : "Policy enabled for live gated execution.",
  };
}

export async function toggleGrowthAutonomyPolicy(
  formData: FormData,
): Promise<ActionResult> {
  const websiteId = String(formData.get("websiteId") ?? "");
  const policyId = String(formData.get("policyId") ?? "");
  const enabled = String(formData.get("enabled") ?? "") === "true";
  if (!websiteId || !policyId) return { ok: false, message: "Missing policy." };

  const ctx = await requireGrowthRole(websiteId, "council_admin");
  const admin = createSupabaseServiceRoleClient();
  const payload: Record<string, unknown> = {
    enabled,
    paused_reason: enabled ? null : "Policy disabled from CEO cockpit.",
    updated_by: ctx.userId,
    updated_at: new Date().toISOString(),
  };
  if (enabled) payload.kill_switch_enabled = false;
  const { error } = await table(admin, "growth_autonomy_policies")
    .update(payload)
    .eq("account_id", ctx.accountId)
    .eq("website_id", ctx.websiteId)
    .eq("id", policyId);

  if (error) {
    return { ok: false, message: `Could not toggle policy: ${error.message}` };
  }
  revalidateGrowthOverview(websiteId);
  return { ok: true, message: enabled ? "Policy enabled." : "Policy disabled." };
}

export async function updateAutonomyPolicyCaps(
  formData: FormData,
): Promise<ActionResult> {
  const websiteId = String(formData.get("websiteId") ?? "");
  const policyId = String(formData.get("policyId") ?? "");
  const dailyCap = boundedInt(formData.get("dailyCap"), 0);
  const weeklyCap = Math.max(dailyCap, boundedInt(formData.get("weeklyCap"), dailyCap));
  const maxRiskScore = Math.min(
    100,
    boundedInt(formData.get("maxRiskScore"), 60),
  );
  if (!websiteId || !policyId) return { ok: false, message: "Missing policy." };

  const ctx = await requireGrowthRole(websiteId, "council_admin");
  const admin = createSupabaseServiceRoleClient();
  const { error } = await table(admin, "growth_autonomy_policies")
    .update({
      daily_cap: dailyCap,
      weekly_cap: weeklyCap,
      max_risk_score: maxRiskScore,
      updated_by: ctx.userId,
      updated_at: new Date().toISOString(),
    })
    .eq("account_id", ctx.accountId)
    .eq("website_id", ctx.websiteId)
    .eq("id", policyId);

  if (error) {
    return { ok: false, message: `Could not update caps: ${error.message}` };
  }
  revalidateGrowthOverview(websiteId);
  return { ok: true, message: "Policy caps updated." };
}

export async function promoteCandidateToWorkItem(
  formData: FormData,
): Promise<ActionResult> {
  const websiteId = String(formData.get("websiteId") ?? "");
  if (!websiteId) return { ok: false, message: "Missing websiteId." };

  const ctx = await requireGrowthRole(websiteId, "growth_operator");
  const admin = createSupabaseServiceRoleClient();
  const results = await promoteGrowthOpportunityCandidates({
    supabase: admin,
    accountId: ctx.accountId,
    websiteId: ctx.websiteId,
    limit: 10,
  });
  const promoted = results.filter((result) => result.promoted).length;
  revalidateGrowthOverview(websiteId);
  return {
    ok: true,
    message: `Promoted ${promoted} candidate(s) to work items.`,
  };
}

export async function invokeGrowthBrainNow(
  formData: FormData,
): Promise<ActionResult> {
  const websiteId = String(formData.get("websiteId") ?? "");
  if (!websiteId) return { ok: false, message: "Missing websiteId." };

  const ctx = await requireGrowthRole(websiteId, "growth_operator");
  const admin = createSupabaseServiceRoleClient();
  const now = new Date();
  const minuteBucket = now.toISOString().slice(0, 16);
  const wakeup = await enqueueGrowthAgentWakeup({
    supabase: admin,
    accountId: ctx.accountId,
    websiteId: ctx.websiteId,
    lane: "orchestrator",
    source: "user_on_demand",
    priority: 90,
    idempotencyKey: `ui:on_demand:${ctx.websiteId}:${minuteBucket}`,
    payload: {
      requested_by: ctx.userId,
      reason: "Manual CEO cockpit brain invocation.",
      requested_at: now.toISOString(),
    },
    now,
  });

  revalidateGrowthOverview(websiteId);
  return {
    ok: true,
    message: `Brain wakeup queued: ${wakeup.id}. The production daemon will claim it on the next cycle.`,
  };
}

export async function activateGrowthAgentSkill(
  formData: FormData,
): Promise<ActionResult> {
  const websiteId = String(formData.get("websiteId") ?? "");
  const skillId = String(formData.get("skillId") ?? "");
  if (!websiteId || !skillId) return { ok: false, message: "Missing skill." };

  const ctx = await requireGrowthRole(websiteId, "curator");
  const admin = createSupabaseServiceRoleClient();
  const { data: skillRow, error: skillLoadError } = await table(
    admin,
    "growth_agent_skills",
  )
    .select("lane")
    .eq("account_id", ctx.accountId)
    .eq("website_id", ctx.websiteId)
    .eq("id", skillId)
    .maybeSingle();

  if (skillLoadError || !skillRow) {
    return { ok: false, message: "Skill not found." };
  }
  const lane = typeof skillRow.lane === "string" ? skillRow.lane : null;
  const agreement = await getLaneAgreement(ctx.websiteId);
  const laneAgreement =
    agreement?.lanes.find((entry) => entry.lane === lane)?.agreement ?? null;
  if (laneAgreement == null || laneAgreement < 0.9) {
    return {
      ok: false,
      message: "Skill activation blocked: replay agreement is below 0.90.",
    };
  }

  const { error } = await table(admin, "growth_agent_skills")
    .update({
      status: "active",
      approved_by: ctx.userId,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("account_id", ctx.accountId)
    .eq("website_id", ctx.websiteId)
    .eq("id", skillId);

  if (error) return { ok: false, message: `Could not activate skill: ${error.message}` };
  revalidateGrowthOverview(websiteId);
  return { ok: true, message: "Skill activated." };
}

export async function dryVerifyGrowthPublicationJobRollback(
  formData: FormData,
): Promise<ActionResult> {
  const websiteId = String(formData.get("websiteId") ?? "");
  const publicationJobId = String(formData.get("publicationJobId") ?? "");
  if (!websiteId || !publicationJobId) {
    return { ok: false, message: "Missing publication job." };
  }

  const ctx = await requireGrowthRole(websiteId, "curator");
  const admin = createSupabaseServiceRoleClient();
  const { data: jobRow, error } = await table(admin, "growth_publication_jobs")
    .select("id,status,target_id,rollback_payload")
    .eq("account_id", ctx.accountId)
    .eq("website_id", ctx.websiteId)
    .eq("id", publicationJobId)
    .maybeSingle();

  if (error || !jobRow) return { ok: false, message: "Publication job not found." };
  if (!["applied", "smoke_passed", "smoke_failed"].includes(String(jobRow.status))) {
    return { ok: false, message: "Rollback is not available for this job state." };
  }

  const rollback = extractRollbackRestore(jobRow.rollback_payload);
  if (rollback.targetId !== jobRow.target_id) {
    return { ok: false, message: "Rollback target mismatch." };
  }
  if (Object.keys(rollback.restore).length === 0) {
    return { ok: false, message: "Rollback payload has no restore fields." };
  }

  revalidateGrowthOverview(websiteId);
  return { ok: true, message: "Rollback dry-verify passed." };
}

export async function deprecateGrowthAgentSkill(
  formData: FormData,
): Promise<ActionResult> {
  const websiteId = String(formData.get("websiteId") ?? "");
  const skillId = String(formData.get("skillId") ?? "");
  if (!websiteId || !skillId) return { ok: false, message: "Missing skill." };

  const ctx = await requireGrowthRole(websiteId, "curator");
  const admin = createSupabaseServiceRoleClient();
  const { error } = await table(admin, "growth_agent_skills")
    .update({
      status: "deprecated",
      evidence: {
        deprecated_by: ctx.userId,
        deprecated_at: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    })
    .eq("account_id", ctx.accountId)
    .eq("website_id", ctx.websiteId)
    .eq("id", skillId);

  if (error) return { ok: false, message: `Could not deprecate skill: ${error.message}` };
  revalidateGrowthOverview(websiteId);
  return { ok: true, message: "Skill deprecated." };
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
  const { data: websiteRow } = await admin
    .from("websites")
    .select("subdomain")
    .eq("id", ctx.websiteId)
    .maybeSingle();
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

  const subdomain =
    typeof websiteRow?.subdomain === "string" ? websiteRow.subdomain : null;
  if (subdomain) {
    revalidateGrowthPublicationSurface({
      subdomain,
      targetTable,
      targetPath: typeof job.target_id === "string" ? null : undefined,
      slug:
        typeof rollback.restore.slug === "string"
          ? rollback.restore.slug
          : null,
    });
  }

  revalidateGrowthOverview(websiteId);
  return { ok: true, message: "Publication job rolled back." };
}
