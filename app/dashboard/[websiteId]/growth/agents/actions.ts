"use server";

import { revalidatePath } from "next/cache";

import { requireGrowthRole } from "@/lib/growth/console/auth";
import { getLaneAgreement } from "@/lib/growth/console/queries";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

type ActionResult = {
  ok: boolean;
  message: string;
};

type LearningKind = "skill" | "memory" | "replay";
type LearningStatus = "active" | "rejected" | "deprecated";

const LEARNING_TABLE: Record<LearningKind, string> = {
  skill: "growth_agent_skills",
  memory: "growth_agent_memories",
  replay: "growth_agent_replay_cases",
};

function table(
  admin: ReturnType<typeof createSupabaseServiceRoleClient>,
  tableName: string,
) {
  return (
    admin.from as unknown as (
      name: string,
    ) => ReturnType<typeof admin.from>
  )(tableName);
}

function revalidateAgents(websiteId: string) {
  revalidatePath(`/dashboard/${websiteId}/growth/agents`);
  revalidatePath(`/dashboard/${websiteId}/growth/overview`);
  revalidatePath(`/dashboard/${websiteId}/growth/data-health`);
}

function parseKind(value: FormDataEntryValue | null): LearningKind | null {
  return value === "skill" || value === "memory" || value === "replay"
    ? value
    : null;
}

function parseStatus(value: FormDataEntryValue | null): LearningStatus | null {
  return value === "active" || value === "rejected" || value === "deprecated"
    ? value
    : null;
}

export async function updateGrowthLearningArtifact(
  formData: FormData,
): Promise<ActionResult> {
  const websiteId = String(formData.get("websiteId") ?? "");
  const artifactId = String(formData.get("artifactId") ?? "");
  const kind = parseKind(formData.get("kind"));
  const status = parseStatus(formData.get("status"));
  if (!websiteId || !artifactId || !kind || !status) {
    return { ok: false, message: "Missing learning artifact." };
  }

  const ctx = await requireGrowthRole(websiteId, "curator");
  const admin = createSupabaseServiceRoleClient();
  const sourceTable = LEARNING_TABLE[kind];
  const now = new Date().toISOString();

  const { data: artifactRow, error: loadError } = await table(admin, sourceTable)
    .select("id,lane,status")
    .eq("account_id", ctx.accountId)
    .eq("website_id", ctx.websiteId)
    .eq("id", artifactId)
    .maybeSingle();

  if (loadError || !artifactRow) {
    return { ok: false, message: "Learning artifact not found." };
  }

  if (kind === "skill" && status === "active") {
    const lane =
      typeof artifactRow.lane === "string" ? artifactRow.lane : null;
    const agreement = await getLaneAgreement(ctx.websiteId);
    const laneAgreement =
      agreement?.lanes.find((entry) => entry.lane === lane)?.agreement ?? null;
    if (laneAgreement == null || laneAgreement < 0.9) {
      return {
        ok: false,
        message: "Skill activation blocked: replay agreement is below 0.90.",
      };
    }
  }

  const payload: Record<string, unknown> = {
    status,
    updated_at: now,
  };
  if (status === "active" && kind !== "replay") {
    payload.approved_by = ctx.userId;
    payload.approved_at = now;
  }
  if (status !== "active") {
    payload.evidence = {
      reviewed_by: ctx.userId,
      reviewed_at: now,
      review_status: status,
      previous_status:
        typeof artifactRow.status === "string" ? artifactRow.status : null,
    };
  }

  const { error } = await table(admin, sourceTable)
    .update(payload)
    .eq("account_id", ctx.accountId)
    .eq("website_id", ctx.websiteId)
    .eq("id", artifactId);

  if (error) {
    return {
      ok: false,
      message: `Could not update ${kind}: ${error.message}`,
    };
  }

  revalidateAgents(websiteId);
  return { ok: true, message: `${kind} marked ${status}.` };
}
