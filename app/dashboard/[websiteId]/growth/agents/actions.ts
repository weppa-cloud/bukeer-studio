"use server";

import { revalidatePath } from "next/cache";

import { requireGrowthRole } from "@/lib/growth/console/auth";
import { getLaneAgreement } from "@/lib/growth/console/queries";
import { materializeGrowthAgentArtifactToCandidate } from "@/lib/growth/chief-of-staff/artifact-materializer";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

type ActionResult = {
  ok: boolean;
  message: string;
};

type LearningKind = "skill" | "memory" | "replay";
type LearningStatus = "active" | "rejected" | "deprecated";
type AgentInstanceStatus = "enabled" | "paused" | "disabled";

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

function parseAgentStatus(
  value: FormDataEntryValue | null,
): AgentInstanceStatus | null {
  return value === "enabled" || value === "paused" || value === "disabled"
    ? value
    : null;
}

function boundedNumber(
  value: FormDataEntryValue | null,
  fallback: number,
  min: number,
  max: number,
) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => String(entry ?? "")).filter(Boolean);
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

export async function seedGrowthHermesAgentInstances(
  formData: FormData,
): Promise<ActionResult> {
  const websiteId = String(formData.get("websiteId") ?? "");
  if (!websiteId) return { ok: false, message: "Missing websiteId." };

  const ctx = await requireGrowthRole(websiteId, "council_admin");
  const admin = createSupabaseServiceRoleClient();
  const { data: types, error: typesError } = await table(admin, "growth_agent_types")
    .select(
      "agent_type, display_name, default_lane, default_toolset, default_config, immutable_safety_bounds",
    )
    .order("agent_type", { ascending: true });
  if (typesError) {
    return {
      ok: false,
      message: `Could not load agent types: ${typesError.message}`,
    };
  }

  const now = new Date().toISOString();
  const rows = ((types ?? []) as Array<Record<string, unknown>>).map((type) => {
    const config =
      type.default_config &&
      typeof type.default_config === "object" &&
      !Array.isArray(type.default_config)
        ? (type.default_config as Record<string, unknown>)
        : {};
    return {
      account_id: ctx.accountId,
      website_id: ctx.websiteId,
      agent_type: String(type.agent_type),
      lane: String(type.default_lane),
      display_name: String(type.display_name),
      status: "enabled",
      model_provider: String(config.model_provider ?? "openrouter"),
      model_name: String(config.model_name ?? "openai/gpt-5"),
      max_cost_daily_usd: 10,
      max_cost_weekly_usd: 50,
      concurrency_limit: 1,
      wakeup_policy: {},
      active_skill_ids: [],
      active_memory_ids: [],
      toolset_allowlist: stringArray(type.default_toolset),
      confidence_threshold: 0.7,
      quality_threshold: 0.8,
      routing_priority: 50,
      notification_preferences: {},
      editable_config: {},
      immutable_safety_bounds: type.immutable_safety_bounds ?? {},
      updated_by: ctx.userId,
      updated_at: now,
    };
  });

  if (rows.length === 0) {
    return { ok: false, message: "No agent types configured." };
  }

  const { error } = await table(admin, "growth_agent_instances")
    .upsert(rows, { onConflict: "website_id,agent_type" });
  if (error) {
    return {
      ok: false,
      message: `Could not seed agent instances: ${error.message}`,
    };
  }

  revalidateAgents(websiteId);
  return { ok: true, message: `Seeded ${rows.length} Hermes agent instances.` };
}

export async function updateGrowthHermesAgentInstance(
  formData: FormData,
): Promise<ActionResult> {
  const websiteId = String(formData.get("websiteId") ?? "");
  const instanceId = String(formData.get("instanceId") ?? "");
  const status = parseAgentStatus(formData.get("status"));
  const modelProvider = String(formData.get("modelProvider") ?? "openrouter")
    .trim()
    .slice(0, 80);
  const modelName = String(formData.get("modelName") ?? "openai/gpt-5")
    .trim()
    .slice(0, 200);
  if (!websiteId || !instanceId || !status || !modelProvider || !modelName) {
    return { ok: false, message: "Missing agent instance fields." };
  }

  const ctx = await requireGrowthRole(websiteId, "council_admin");
  const dailyBudget = boundedNumber(formData.get("dailyBudgetUsd"), 10, 0, 500);
  const weeklyBudget = Math.max(
    dailyBudget,
    boundedNumber(formData.get("weeklyBudgetUsd"), 50, 0, 5000),
  );
  const concurrencyLimit = Math.floor(
    boundedNumber(formData.get("concurrencyLimit"), 1, 1, 20),
  );
  const confidenceThreshold = boundedNumber(
    formData.get("confidenceThreshold"),
    0.7,
    0,
    1,
  );
  const qualityThreshold = boundedNumber(
    formData.get("qualityThreshold"),
    0.8,
    0,
    1,
  );
  const routingPriority = Math.floor(
    boundedNumber(formData.get("routingPriority"), 50, 0, 100),
  );

  const admin = createSupabaseServiceRoleClient();
  const { error } = await table(admin, "growth_agent_instances")
    .update({
      status,
      model_provider: modelProvider,
      model_name: modelName,
      max_cost_daily_usd: dailyBudget,
      max_cost_weekly_usd: weeklyBudget,
      concurrency_limit: concurrencyLimit,
      confidence_threshold: confidenceThreshold,
      quality_threshold: qualityThreshold,
      routing_priority: routingPriority,
      updated_by: ctx.userId,
      updated_at: new Date().toISOString(),
    })
    .eq("account_id", ctx.accountId)
    .eq("website_id", ctx.websiteId)
    .eq("id", instanceId);

  if (error) {
    return {
      ok: false,
      message: `Could not update agent instance: ${error.message}`,
    };
  }

  revalidateAgents(websiteId);
  return { ok: true, message: "Agent instance updated." };
}

export async function materializeGrowthHermesArtifact(
  formData: FormData,
): Promise<ActionResult> {
  const websiteId = String(formData.get("websiteId") ?? "");
  const artifactId = String(formData.get("artifactId") ?? "");
  if (!websiteId || !artifactId) {
    return { ok: false, message: "Missing Hermes artifact." };
  }

  const ctx = await requireGrowthRole(websiteId, "curator");
  const admin = createSupabaseServiceRoleClient();
  const result = await materializeGrowthAgentArtifactToCandidate({
    supabase: admin,
    accountId: ctx.accountId,
    websiteId: ctx.websiteId,
    artifactId,
  });

  revalidateAgents(websiteId);
  revalidatePath(`/dashboard/${websiteId}/growth/workboard`);
  return {
    ok: result.status === "materialized",
    message:
      result.status === "materialized"
        ? `Artifact materialized as candidate ${result.candidateId}.`
        : `Artifact ${result.status}: ${result.blockingReasons.join(", ")}`,
  };
}
