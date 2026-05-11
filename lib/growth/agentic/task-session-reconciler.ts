import { randomUUID } from "crypto";

import type { AgentLane } from "@bukeer/website-contract";

import {
  asRecord,
  type JsonRecord,
  type SupabaseLike,
} from "@/lib/growth/autonomy/runtime-common";

export interface GrowthTaskSessionExecution {
  lane: AgentLane | string;
  workItemId: string;
  runId: string;
  quality?: {
    allowed?: boolean;
    reasons?: string[];
    executionMode?: string;
  } | null;
  publicationResult?: {
    applied?: boolean;
    publicationJobId?: string | null;
    status?: string | null;
  } | null;
}

export interface ReconcileGrowthTaskSessionsInput {
  supabase: SupabaseLike;
  accountId: string;
  websiteId: string;
  taskSessionIds?: string[];
  executions: GrowthTaskSessionExecution[];
  cycleId: string;
  now?: Date;
  assignedStaleMs?: number;
}

export interface ReconcileGrowthTaskSessionsResult {
  completed: number;
  blocked: number;
  expired: number;
  linkedSessionIds: string[];
}

async function findSessionForExecution({
  supabase,
  accountId,
  websiteId,
  lane,
  taskSessionIds,
}: {
  supabase: SupabaseLike;
  accountId: string;
  websiteId: string;
  lane: string;
  taskSessionIds: string[];
}): Promise<JsonRecord | null> {
  let query = supabase
    .from("growth_agent_task_sessions")
    .select("*")
    .eq("account_id", accountId)
    .eq("website_id", websiteId)
    .eq("assigned_agent_lane", lane)
    .in("status", ["assigned", "running"]);

  if (taskSessionIds.length > 0) {
    query = query.in("id", taskSessionIds);
  }

  query = query.order("created_at", { ascending: true }).limit(10);

  const { data, error } = await query;
  if (error) throw new Error(`task session lookup failed: ${error.message}`);
  return ((data ?? []) as JsonRecord[])[0] ?? null;
}

async function updateSession({
  supabase,
  sessionId,
  websiteId,
  payload,
}: {
  supabase: SupabaseLike;
  sessionId: string;
  websiteId: string;
  payload: JsonRecord;
}) {
  const { error } = await supabase
    .from("growth_agent_task_sessions")
    .update(payload)
    .eq("id", sessionId)
    .eq("website_id", websiteId);
  if (error) throw new Error(`task session update failed: ${error.message}`);
}

export async function reconcileGrowthTaskSessions({
  supabase,
  accountId,
  websiteId,
  taskSessionIds = [],
  executions,
  cycleId,
  now = new Date(),
  assignedStaleMs = 30 * 60 * 1000,
}: ReconcileGrowthTaskSessionsInput): Promise<ReconcileGrowthTaskSessionsResult> {
  const nowIso = now.toISOString();
  const assignedStaleBeforeIso = new Date(now.getTime() - assignedStaleMs).toISOString();
  const linkedSessionIds: string[] = [];
  let completed = 0;
  let blocked = 0;

  for (const execution of executions) {
    const session = await findSessionForExecution({
      supabase,
      accountId,
      websiteId,
      lane: String(execution.lane),
      taskSessionIds,
    });
    if (!session?.id || typeof session.id !== "string") continue;

    const quality = execution.quality ?? {};
    const publicationResult = execution.publicationResult ?? null;
    const executionBlocked = quality.allowed === false || !publicationResult?.applied;
    const status = executionBlocked ? "completed" : "completed";
    const leaseToken = randomUUID();
    const previousState = asRecord(session.session_state);

    await updateSession({
      supabase,
      sessionId: session.id,
      websiteId,
      payload: {
        status,
        child_work_item_id: execution.workItemId,
        started_at: session.started_at ?? nowIso,
        completed_at: nowIso,
        lease_token: leaseToken,
        lease_expires_at: null,
        attempt_count: Number(session.attempt_count ?? 0) + 1,
        session_state: {
          ...previousState,
          cycle_id: cycleId,
          run_id: execution.runId,
          work_item_id: execution.workItemId,
          publication_job_id: publicationResult?.publicationJobId ?? null,
          publication_status: publicationResult?.status ?? null,
          quality_allowed: quality.allowed ?? null,
          quality_reasons: quality.reasons ?? [],
          completed_at: nowIso,
          outcome: executionBlocked ? "blocked_or_reviewed_by_executor" : "applied",
        },
      },
    });

    linkedSessionIds.push(session.id);
    if (executionBlocked) blocked += 1;
    else completed += 1;
  }

  const unmatchedIds = taskSessionIds.filter((id) => !linkedSessionIds.includes(id));
  let expired = 0;
  if (unmatchedIds.length > 0) {
    const { error } = await supabase
      .from("growth_agent_task_sessions")
      .update({
        status: "blocked",
        completed_at: nowIso,
        lease_expires_at: null,
        session_state: {
          cycle_id: cycleId,
          blocked_reason: "no_executable_work_item_claimed_in_cycle",
          completed_at: nowIso,
        },
      })
      .eq("account_id", accountId)
      .eq("website_id", websiteId)
      .in("id", unmatchedIds)
      .in("status", ["assigned", "running"]);
    if (error) throw new Error(`unmatched task session block failed: ${error.message}`);
    blocked += unmatchedIds.length;
  }

  const { data: staleRows, error: staleError } = await supabase
    .from("growth_agent_task_sessions")
    .select("id")
    .eq("account_id", accountId)
    .eq("website_id", websiteId)
    .in("status", ["running"])
    .lt("lease_expires_at", nowIso)
    .limit(50);
  if (staleError) throw new Error(`stale task session lookup failed: ${staleError.message}`);

  const staleIds = ((staleRows ?? []) as JsonRecord[])
    .map((row) => row.id)
    .filter((id): id is string => typeof id === "string");
  if (staleIds.length > 0) {
    const { error } = await supabase
      .from("growth_agent_task_sessions")
      .update({
        status: "failed",
        completed_at: nowIso,
        lease_expires_at: null,
        session_state: {
          cycle_id: cycleId,
          failed_reason: "lease_expired",
          completed_at: nowIso,
        },
      })
      .eq("account_id", accountId)
      .eq("website_id", websiteId)
      .in("id", staleIds);
    if (error) throw new Error(`stale task session expiry failed: ${error.message}`);
    expired = staleIds.length;
  }

  const { data: staleAssignedRows, error: staleAssignedError } = await supabase
    .from("growth_agent_task_sessions")
    .select("id")
    .eq("account_id", accountId)
    .eq("website_id", websiteId)
    .eq("status", "assigned")
    .lt("created_at", assignedStaleBeforeIso)
    .limit(200);
  if (staleAssignedError) {
    throw new Error(`stale assigned task session lookup failed: ${staleAssignedError.message}`);
  }

  const staleAssignedIds = ((staleAssignedRows ?? []) as JsonRecord[])
    .map((row) => row.id)
    .filter((id): id is string => typeof id === "string")
    .filter((id) => !linkedSessionIds.includes(id));
  if (staleAssignedIds.length > 0) {
    const { error } = await supabase
      .from("growth_agent_task_sessions")
      .update({
        status: "blocked",
        completed_at: nowIso,
        lease_expires_at: null,
        session_state: {
          cycle_id: cycleId,
          blocked_reason: "assigned_session_expired_without_claim",
          completed_at: nowIso,
        },
      })
      .eq("account_id", accountId)
      .eq("website_id", websiteId)
      .in("id", staleAssignedIds);
    if (error) throw new Error(`stale assigned task session block failed: ${error.message}`);
    blocked += staleAssignedIds.length;
    expired += staleAssignedIds.length;
  }

  return {
    completed,
    blocked,
    expired,
    linkedSessionIds,
  };
}
