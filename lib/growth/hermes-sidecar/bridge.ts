import type {
  AgentLane,
  GrowthAgentArtifact,
  GrowthAgentArtifactType,
  GrowthAgentTaskSession,
  GrowthMarket,
} from "@bukeer/website-contract";

import { promoteGrowthOpportunityCandidates } from "@/lib/growth/autonomy/candidate-promotion";
import {
  asRecord,
  type JsonRecord,
  type SupabaseLike,
} from "@/lib/growth/autonomy/runtime-common";
import { buildGrowthAgentContext } from "@/lib/growth/agentic/context-builder";
import { assertTenantScope } from "@/lib/growth/orchestrator/tenant-guard";
import {
  createGrowthAgentArtifact,
  type CreateGrowthAgentArtifactInput,
} from "@/lib/growth/chief-of-staff/artifacts";
import {
  materializeGrowthAgentArtifactToCandidate,
  type MaterializeGrowthAgentArtifactResult,
} from "@/lib/growth/chief-of-staff/artifact-materializer";
import { routeChiefOfStaffAction } from "@/lib/growth/chief-of-staff/action-router";

export type HermesBridgeWriteAction =
  | "create_chief_action"
  | "create_agent_artifact"
  | "complete_task_session"
  | "request_materialization";

export const HERMES_BRIDGE_ALLOWED_WRITE_TABLES = [
  "growth_chief_of_staff_actions",
  "growth_agent_wakeup_requests",
  "growth_agent_task_sessions",
  "growth_agent_artifacts",
  "growth_opportunity_candidates",
  "growth_work_items",
] as const;

const WRITE_ROLES = new Set([
  "super_admin",
  "admin",
  "owner",
  "account_admin",
  "growth_operator",
  "council_admin",
  "curator",
  "technical_owner",
]);

const MUTATION_ACTION_CLASSES = new Set([
  "paid_mutation",
  "experiment_activation",
  "outreach_send",
  "pricing_mutation",
  "availability_mutation",
  "reservation_mutation",
  "payment_mutation",
  "crm_bulk_mutation",
]);

export interface HermesBridgeScope {
  supabase: SupabaseLike;
  accountId: string;
  websiteId: string;
  userId: string;
  agentInstanceId?: string | null;
  lane?: AgentLane | "all";
  locale?: string;
  market?: GrowthMarket;
}

export interface HermesTenantScopeResult {
  allowed: boolean;
  roleName: string | null;
  websiteAccountId: string | null;
}

export class HermesBridgeScopeError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "HermesBridgeScopeError";
    this.code = code;
  }
}

function rows<T = JsonRecord>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : value ? [value as T] : [];
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function roleNameFromJoin(value: unknown): string | null {
  if (Array.isArray(value)) return roleNameFromJoin(value[0]);
  const record = asRecord(value);
  return text(record.role_name) ?? text(record.name) ?? null;
}

function rejectSensitiveActionClass(actionClass: unknown) {
  const raw = text(actionClass);
  if (raw && MUTATION_ACTION_CLASSES.has(raw)) {
    throw new HermesBridgeScopeError(
      "hermes_sensitive_action_blocked",
      `Hermes bridge cannot request sensitive action_class=${raw}.`,
    );
  }
}

export async function assertHermesBridgeScope({
  supabase,
  accountId,
  websiteId,
  userId,
  agentInstanceId = null,
  write = false,
}: HermesBridgeScope & {
  write?: boolean;
}): Promise<HermesTenantScopeResult> {
  const { data: websiteRows, error: websiteError } = await supabase
    .from("websites")
    .select("id,account_id")
    .eq("id", websiteId)
    .limit(1);
  if (websiteError) {
    throw new HermesBridgeScopeError(
      "hermes_website_lookup_failed",
      websiteError.message,
    );
  }
  const website = rows(websiteRows)[0];
  assertTenantScope(
    { account_id: accountId, website_id: websiteId },
    {
      account_id: text(asRecord(website).account_id) ?? undefined,
      website_id: text(asRecord(website).id) ?? undefined,
    },
  );

  const { data: roleRows, error: roleError } = await supabase
    .from("user_roles")
    .select("account_id,is_active,roles(role_name)")
    .eq("user_id", userId)
    .eq("account_id", accountId)
    .eq("is_active", true)
    .limit(5);
  if (roleError) {
    throw new HermesBridgeScopeError(
      "hermes_role_lookup_failed",
      roleError.message,
    );
  }
  const roleRow = rows(roleRows)[0];
  const roleName = roleNameFromJoin(asRecord(roleRow).roles);
  if (!roleRow) {
    throw new HermesBridgeScopeError(
      "hermes_tenant_scope_denied",
      "User has no active role for this account.",
    );
  }
  if (write && roleName && !WRITE_ROLES.has(roleName)) {
    throw new HermesBridgeScopeError(
      "hermes_write_scope_denied",
      `Role ${roleName} cannot write through Hermes bridge.`,
    );
  }

  if (agentInstanceId) {
    const { data: agentRows, error: agentError } = await supabase
      .from("growth_agent_instances")
      .select("id,account_id,website_id,status")
      .eq("id", agentInstanceId)
      .eq("website_id", websiteId)
      .limit(1);
    if (agentError) {
      throw new HermesBridgeScopeError(
        "hermes_agent_lookup_failed",
        agentError.message,
      );
    }
    const agent = rows(agentRows)[0];
    assertTenantScope(
      { account_id: accountId, website_id: websiteId },
      {
        account_id: text(asRecord(agent).account_id) ?? undefined,
        website_id: text(asRecord(agent).website_id) ?? undefined,
      },
    );
  }

  return {
    allowed: true,
    roleName,
    websiteAccountId: text(asRecord(website).account_id),
  };
}

export async function readGrowthContextForHermes(
  scope: HermesBridgeScope & {
    persistSnapshot?: boolean;
  },
) {
  await assertHermesBridgeScope(scope);
  return buildGrowthAgentContext({
    supabase: scope.supabase,
    accountId: scope.accountId,
    websiteId: scope.websiteId,
    lane: scope.lane ?? "all",
    locale: scope.locale ?? "es-CO",
    market: scope.market ?? "CO",
    persist: scope.persistSnapshot ?? false,
  });
}

export async function createChiefActionFromHermes(
  scope: HermesBridgeScope & {
    intent: string;
    payload?: JsonRecord;
    now?: Date;
  },
) {
  await assertHermesBridgeScope({ ...scope, write: true });
  return routeChiefOfStaffAction({
    supabase: scope.supabase,
    accountId: scope.accountId,
    websiteId: scope.websiteId,
    userId: scope.userId,
    intent: scope.intent,
    payload: {
      source: "hermes_sidecar",
      agent_instance_id: scope.agentInstanceId ?? null,
      ...(scope.payload ?? {}),
    },
    now: scope.now,
  });
}

export async function createHermesTaskSession(
  scope: HermesBridgeScope & {
    delegatedByAgentId: string;
    assignedAgentLane: AgentLane;
    handoffSummary: string;
    requiredContextRefs?: string[];
    dependencies?: string[];
    completionContract: JsonRecord;
    wakeupRequestId?: string | null;
    decisionId?: string | null;
    status?: "assigned" | "running";
    now?: Date;
  },
): Promise<GrowthAgentTaskSession> {
  await assertHermesBridgeScope({ ...scope, write: true });
  const now = scope.now ?? new Date();
  const { data, error } = await scope.supabase
    .from("growth_agent_task_sessions")
    .insert({
      account_id: scope.accountId,
      website_id: scope.websiteId,
      locale: scope.locale ?? "es-CO",
      market: scope.market ?? "CO",
      parent_work_item_id: null,
      child_work_item_id: null,
      delegated_by_agent_id: scope.delegatedByAgentId,
      assigned_agent_lane: scope.assignedAgentLane,
      wakeup_request_id: scope.wakeupRequestId ?? null,
      decision_id: scope.decisionId ?? null,
      status: scope.status ?? "assigned",
      handoff_summary: scope.handoffSummary,
      required_context_refs: scope.requiredContextRefs ?? [],
      dependencies: scope.dependencies ?? [],
      completion_contract: scope.completionContract,
      session_state: {
        source: "hermes_sidecar",
        agent_instance_id: scope.agentInstanceId ?? null,
        created_by: "hermes_bridge",
      },
      started_at: scope.status === "running" ? now.toISOString() : null,
    })
    .select("*")
    .limit(1);
  if (error) throw new Error(`Hermes task session insert failed: ${error.message}`);
  const row = rows<GrowthAgentTaskSession>(data)[0];
  if (!row?.id) throw new Error("Hermes task session insert returned no row");
  return row;
}

export async function createAgentArtifactFromHermes(
  scope: HermesBridgeScope & {
    artifactType: GrowthAgentArtifactType;
    payload: JsonRecord;
    providerEvidenceReads: JsonRecord[];
    qualityReview: JsonRecord;
    memoryReads?: JsonRecord[];
    skillReads?: JsonRecord[];
    riskAssessment: JsonRecord;
    idempotencyKey: string;
    taskSessionId?: string | null;
    decisionId?: string | null;
    status?: GrowthAgentArtifact["status"];
  },
): Promise<GrowthAgentArtifact> {
  await assertHermesBridgeScope({ ...scope, write: true });
  rejectSensitiveActionClass(scope.payload.action_class);
  const input: CreateGrowthAgentArtifactInput = {
    supabase: scope.supabase,
    accountId: scope.accountId,
    websiteId: scope.websiteId,
    agentInstanceId: scope.agentInstanceId ?? null,
    taskSessionId: scope.taskSessionId ?? null,
    decisionId: scope.decisionId ?? null,
    artifactType: scope.artifactType,
    payload: {
      ...scope.payload,
      generated_by: "hermes_sidecar",
    },
    providerEvidenceReads: scope.providerEvidenceReads,
    qualityReview: scope.qualityReview,
    memoryReads: scope.memoryReads ?? [],
    skillReads: scope.skillReads ?? [],
    riskAssessment: {
      ...scope.riskAssessment,
      hermes_can_mutate_public_surfaces: false,
      executor_only_mutation_boundary: true,
    },
    idempotencyKey: scope.idempotencyKey,
    status: scope.status,
  };
  return createGrowthAgentArtifact(input);
}

export async function requestHermesArtifactMaterialization(
  scope: HermesBridgeScope & {
    artifactId: string;
    promote?: boolean;
    promotionLimit?: number;
    now?: Date;
  },
): Promise<
  MaterializeGrowthAgentArtifactResult & {
    workItemId: string | null;
    promoted: boolean;
  }
> {
  await assertHermesBridgeScope({ ...scope, write: true });
  const materialized = await materializeGrowthAgentArtifactToCandidate({
    supabase: scope.supabase,
    accountId: scope.accountId,
    websiteId: scope.websiteId,
    artifactId: scope.artifactId,
    locale: scope.locale,
    market: scope.market,
    now: scope.now,
  });
  let workItemId: string | null = null;
  let promoted = false;

  if (scope.promote !== false && materialized.candidateId) {
    const results = await promoteGrowthOpportunityCandidates({
      supabase: scope.supabase,
      accountId: scope.accountId,
      websiteId: scope.websiteId,
      limit: scope.promotionLimit ?? 5,
      now: scope.now,
    });
    const match = results.find(
      (result) => result.candidateId === materialized.candidateId,
    );
    promoted = Boolean(match?.promoted);
    workItemId = typeof match?.workItemId === "string" ? match.workItemId : null;
    if (workItemId) {
      await scope.supabase
        .from("growth_agent_artifacts")
        .update({
          created_work_item_id: workItemId,
          updated_at: (scope.now ?? new Date()).toISOString(),
        })
        .eq("id", scope.artifactId)
        .eq("website_id", scope.websiteId);
    }
  }

  return {
    ...materialized,
    workItemId,
    promoted,
  };
}

export async function completeHermesTaskSession(
  scope: HermesBridgeScope & {
    taskSessionId: string;
    status: "completed" | "blocked" | "failed" | "cancelled";
    artifactIds?: string[];
    workItemIds?: string[];
    lastError?: string | null;
    now?: Date;
  },
) {
  await assertHermesBridgeScope({ ...scope, write: true });
  const now = scope.now ?? new Date();
  const { data, error } = await scope.supabase
    .from("growth_agent_task_sessions")
    .update({
      status: scope.status,
      completed_at: now.toISOString(),
      session_state: {
        source: "hermes_sidecar",
        artifact_ids: scope.artifactIds ?? [],
        work_item_ids: scope.workItemIds ?? [],
        last_error: scope.lastError ?? null,
        completed_by: "hermes_bridge",
      },
      updated_at: now.toISOString(),
    })
    .eq("id", scope.taskSessionId)
    .eq("website_id", scope.websiteId)
    .select("*")
    .limit(1);
  if (error) throw new Error(`Hermes task session update failed: ${error.message}`);
  const row = rows<GrowthAgentTaskSession>(data)[0];
  if (!row?.id) throw new Error("Hermes task session update returned no row");
  return row;
}
