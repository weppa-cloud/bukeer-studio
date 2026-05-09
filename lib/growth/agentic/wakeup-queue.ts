import type {
  AgentLane,
  GrowthAgentWakeupRequest,
  GrowthAgentWakeupRequestInsert,
  GrowthAgentWakeupSource,
  GrowthMarket,
} from "@bukeer/website-contract";
import { GrowthAgentWakeupRequestInsertSchema } from "@bukeer/website-contract";
import { randomUUID } from "crypto";

import {
  asRecord,
  type JsonRecord,
  type SupabaseLike,
} from "@/lib/growth/autonomy/runtime-common";

export const DEFAULT_WAKEUP_LEASE_MS = 10 * 60 * 1000;
export const DEFAULT_WAKEUP_MAX_ATTEMPTS = 3;

export interface EnqueueGrowthAgentWakeupInput {
  supabase: SupabaseLike;
  accountId: string;
  websiteId: string;
  lane: AgentLane;
  source: GrowthAgentWakeupSource;
  locale?: string;
  market?: GrowthMarket;
  priority?: number;
  idempotencyKey: string;
  payload?: JsonRecord;
  now?: Date;
}

function normalizeWakeup(row: unknown): GrowthAgentWakeupRequest {
  return row as GrowthAgentWakeupRequest;
}

export async function enqueueGrowthAgentWakeup(
  input: EnqueueGrowthAgentWakeupInput,
): Promise<GrowthAgentWakeupRequest> {
  const now = input.now ?? new Date();
  const { data: existingRows, error: existingError } = await input.supabase
    .from("growth_agent_wakeup_requests")
    .select("*")
    .eq("website_id", input.websiteId)
    .eq("lane", input.lane)
    .eq("idempotency_key", input.idempotencyKey)
    .limit(1);
  if (existingError) {
    throw new Error(`wakeup lookup failed: ${existingError.message}`);
  }
  const existing = Array.isArray(existingRows) ? existingRows[0] : existingRows;
  if (existing?.id) {
    const { data: updatedRows, error: updateError } = await input.supabase
      .from("growth_agent_wakeup_requests")
      .update({
        status: "queued",
        priority: input.priority ?? Number(existing.priority ?? 50),
        payload: input.payload ?? asRecord(existing.payload),
        coalesced_count: Number(existing.coalesced_count ?? 0) + 1,
        lease_token: null,
        lease_expires_at: null,
        last_error: null,
        updated_at: now.toISOString(),
      })
      .eq("id", existing.id)
      .eq("website_id", input.websiteId)
      .select("*")
      .limit(1);
    if (updateError) {
      throw new Error(`wakeup coalesce failed: ${updateError.message}`);
    }
    const updated = Array.isArray(updatedRows) ? updatedRows[0] : updatedRows;
    if (!updated?.id) throw new Error("wakeup coalesce returned no row");
    return normalizeWakeup(updated);
  }

  const insert: GrowthAgentWakeupRequestInsert =
    GrowthAgentWakeupRequestInsertSchema.parse({
      account_id: input.accountId,
      website_id: input.websiteId,
      locale: input.locale ?? "es-CO",
      market: input.market ?? "CO",
      lane: input.lane,
      source: input.source,
      status: "queued",
      priority: input.priority ?? 50,
      idempotency_key: input.idempotencyKey,
      coalesced_count: 0,
      payload: input.payload ?? {},
      claimed_at: null,
      completed_at: null,
      run_id: null,
      last_error: null,
      lease_token: null,
      lease_expires_at: null,
      last_claimed_at: null,
      attempt_count: 0,
      max_attempts: DEFAULT_WAKEUP_MAX_ATTEMPTS,
    });

  const { data, error } = await input.supabase
    .from("growth_agent_wakeup_requests")
    .upsert(insert, { onConflict: "website_id,lane,idempotency_key" })
    .select("*")
    .limit(1);
  if (error) throw new Error(`wakeup enqueue failed: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.id) throw new Error("wakeup enqueue returned no row");

  return normalizeWakeup(row);
}

export async function claimGrowthAgentWakeup({
  supabase,
  accountId,
  websiteId,
  lane,
  wakeupId = null,
  leaseToken = randomUUID(),
  leaseDurationMs = DEFAULT_WAKEUP_LEASE_MS,
  maxAttempts = DEFAULT_WAKEUP_MAX_ATTEMPTS,
  now = new Date(),
}: {
  supabase: SupabaseLike;
  accountId: string;
  websiteId: string;
  lane: AgentLane;
  wakeupId?: string | null;
  leaseToken?: string;
  leaseDurationMs?: number;
  maxAttempts?: number;
  now?: Date;
}): Promise<GrowthAgentWakeupRequest | null> {
  const nowIso = now.toISOString();
  const leaseExpiresAt = new Date(now.getTime() + leaseDurationMs).toISOString();
  let query = supabase
    .from("growth_agent_wakeup_requests")
    .select("*")
    .eq("account_id", accountId)
    .eq("website_id", websiteId)
    .eq("lane", lane)
    .in("status", ["queued", "claimed"]);

  if (wakeupId) {
    query = query.eq("id", wakeupId);
  }

  const { data, error } = await query
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(wakeupId ? 1 : 20);
  if (error) throw new Error(`wakeup claim lookup failed: ${error.message}`);
  const rows = (Array.isArray(data) ? data : data ? [data] : []) as JsonRecord[];
  const wakeup = rows.find((row) => {
    const status = String(row.status ?? "");
    if (status === "queued") return true;
    if (status !== "claimed") return false;
    const attempts = Number(row.attempt_count ?? 0);
    const rowMaxAttempts = Number(row.max_attempts ?? maxAttempts);
    if (attempts >= rowMaxAttempts) return false;
    const expiresAt = typeof row.lease_expires_at === "string"
      ? Date.parse(row.lease_expires_at)
      : Number.NaN;
    return Number.isFinite(expiresAt) && expiresAt <= now.getTime();
  });
  if (!wakeup?.id) return null;
  const previousStatus = String(wakeup.status ?? "queued");
  const attemptCount = Number(wakeup.attempt_count ?? 0);

  let updateQuery = supabase
    .from("growth_agent_wakeup_requests")
    .update({
      status: "claimed",
      claimed_at: wakeup.claimed_at ?? nowIso,
      last_claimed_at: nowIso,
      lease_token: leaseToken,
      lease_expires_at: leaseExpiresAt,
      attempt_count: attemptCount + 1,
      max_attempts: Number(wakeup.max_attempts ?? maxAttempts),
      last_error:
        previousStatus === "claimed" ? "recovered_expired_lease" : null,
      updated_at: nowIso,
    })
    .eq("id", wakeup.id)
    .eq("website_id", websiteId)
    .eq("status", previousStatus);
  if (previousStatus === "claimed") {
    updateQuery = updateQuery.lt("lease_expires_at", nowIso);
  }
  const { data: updated, error: updateError } = await updateQuery.select("*");
  if (updateError) throw new Error(`wakeup claim failed: ${updateError.message}`);
  const row = Array.isArray(updated) ? updated[0] : updated;
  return row?.id ? normalizeWakeup(row) : null;
}

export async function renewGrowthAgentWakeupLease({
  supabase,
  wakeupId,
  websiteId,
  leaseToken,
  leaseDurationMs = DEFAULT_WAKEUP_LEASE_MS,
  now = new Date(),
}: {
  supabase: SupabaseLike;
  wakeupId: string;
  websiteId: string;
  leaseToken: string;
  leaseDurationMs?: number;
  now?: Date;
}): Promise<boolean> {
  const { data, error } = await supabase
    .from("growth_agent_wakeup_requests")
    .update({
      lease_expires_at: new Date(now.getTime() + leaseDurationMs).toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("id", wakeupId)
    .eq("website_id", websiteId)
    .eq("status", "claimed")
    .eq("lease_token", leaseToken)
    .select("id");
  if (error) throw new Error(`wakeup lease renew failed: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  return Boolean(row?.id);
}

export async function expireStaleGrowthAgentWakeups({
  supabase,
  accountId,
  websiteId,
  lane,
  now = new Date(),
}: {
  supabase: SupabaseLike;
  accountId: string;
  websiteId: string;
  lane?: AgentLane;
  now?: Date;
}): Promise<number> {
  let lookup = supabase
    .from("growth_agent_wakeup_requests")
    .select("id,attempt_count,max_attempts")
    .eq("account_id", accountId)
    .eq("website_id", websiteId)
    .eq("status", "claimed")
    .lte("lease_expires_at", now.toISOString());
  if (lane) lookup = lookup.eq("lane", lane);
  const { data, error } = await lookup.limit(50);
  if (error) throw new Error(`stale wakeup expiry lookup failed: ${error.message}`);
  const rows = (data ?? []) as JsonRecord[];
  const expiredIds = rows
    .filter(
      (row) =>
        Number(row.attempt_count ?? 0) >=
        Number(row.max_attempts ?? DEFAULT_WAKEUP_MAX_ATTEMPTS),
    )
    .map((row) => String(row.id))
    .filter(Boolean);
  if (expiredIds.length === 0) return 0;
  const { data: updated, error: updateError } = await supabase
    .from("growth_agent_wakeup_requests")
    .update({
      status: "expired",
      completed_at: now.toISOString(),
      last_error: "lease_expired_max_attempts",
      updated_at: now.toISOString(),
    })
    .in("id", expiredIds)
    .eq("website_id", websiteId)
    .select("id");
  if (updateError) throw new Error(`stale wakeup expiry failed: ${updateError.message}`);
  return Array.isArray(updated) ? updated.length : updated ? 1 : 0;
}

export async function finishGrowthAgentWakeup({
  supabase,
  wakeupId,
  websiteId,
  status,
  runId = null,
  error = null,
  leaseToken = null,
  now = new Date(),
}: {
  supabase: SupabaseLike;
  wakeupId: string;
  websiteId: string;
  status: "completed" | "failed" | "cancelled";
  runId?: string | null;
  error?: string | null;
  leaseToken?: string | null;
  now?: Date;
}) {
  let query = supabase
    .from("growth_agent_wakeup_requests")
    .update({
      status,
      run_id: runId,
      last_error: error,
      completed_at: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("id", wakeupId)
    .eq("website_id", websiteId);
  if (leaseToken) query = query.eq("lease_token", leaseToken);
  await query;
}
