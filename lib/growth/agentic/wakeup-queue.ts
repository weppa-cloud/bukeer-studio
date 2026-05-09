import type {
  AgentLane,
  GrowthAgentWakeupRequest,
  GrowthAgentWakeupRequestInsert,
  GrowthAgentWakeupSource,
  GrowthMarket,
} from "@bukeer/website-contract";
import { GrowthAgentWakeupRequestInsertSchema } from "@bukeer/website-contract";

import type { JsonRecord, SupabaseLike } from "@/lib/growth/autonomy/runtime-common";

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
    });

  const { data, error } = await input.supabase
    .from("growth_agent_wakeup_requests")
    .upsert(insert, { onConflict: "website_id,lane,idempotency_key" })
    .select("*")
    .limit(1);
  if (error) throw new Error(`wakeup enqueue failed: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.id) throw new Error("wakeup enqueue returned no row");

  if (row.status !== "queued") {
    await input.supabase
      .from("growth_agent_wakeup_requests")
      .update({
        status: "queued",
        coalesced_count: Number(row.coalesced_count ?? 0) + 1,
        updated_at: now.toISOString(),
      })
      .eq("id", row.id)
      .eq("website_id", input.websiteId);
  }

  return normalizeWakeup(row);
}

export async function claimGrowthAgentWakeup({
  supabase,
  accountId,
  websiteId,
  lane,
  wakeupId = null,
  now = new Date(),
}: {
  supabase: SupabaseLike;
  accountId: string;
  websiteId: string;
  lane: AgentLane;
  wakeupId?: string | null;
  now?: Date;
}): Promise<GrowthAgentWakeupRequest | null> {
  let query = supabase
    .from("growth_agent_wakeup_requests")
    .select("*")
    .eq("account_id", accountId)
    .eq("website_id", websiteId)
    .eq("lane", lane)
    .eq("status", "queued");

  if (wakeupId) {
    query = query.eq("id", wakeupId);
  }

  const { data, error } = await query
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1);
  if (error) throw new Error(`wakeup claim lookup failed: ${error.message}`);
  const wakeup = Array.isArray(data) ? data[0] : data;
  if (!wakeup?.id) return null;

  const { data: updated, error: updateError } = await supabase
    .from("growth_agent_wakeup_requests")
    .update({
      status: "claimed",
      claimed_at: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("id", wakeup.id)
    .eq("website_id", websiteId)
    .eq("status", "queued")
    .select("*");
  if (updateError) throw new Error(`wakeup claim failed: ${updateError.message}`);
  const row = Array.isArray(updated) ? updated[0] : updated;
  return row?.id ? normalizeWakeup(row) : null;
}

export async function finishGrowthAgentWakeup({
  supabase,
  wakeupId,
  websiteId,
  status,
  runId = null,
  error = null,
  now = new Date(),
}: {
  supabase: SupabaseLike;
  wakeupId: string;
  websiteId: string;
  status: "completed" | "failed" | "cancelled";
  runId?: string | null;
  error?: string | null;
  now?: Date;
}) {
  await supabase
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
}
