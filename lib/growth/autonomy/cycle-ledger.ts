import type {
  GrowthRuntimeCycle,
  GrowthRuntimeCycleInsert,
  GrowthRuntimeCycleStatus,
  GrowthRuntimeCycleTrigger,
  GrowthRuntimeCycleUpdate,
  GrowthSchedulerHeartbeatInsert,
} from "@bukeer/website-contract";
import {
  GrowthRuntimeCycleInsertSchema,
  GrowthSchedulerHeartbeatInsertSchema,
} from "@bukeer/website-contract";

import {
  GROWTH_RUNTIME_VERSION,
  type GrowthRuntimeStageResult,
  type JsonRecord,
  type SupabaseLike,
} from "./runtime-common";

export interface StartGrowthRuntimeCycleInput {
  supabase: SupabaseLike;
  accountId: string;
  websiteId: string;
  locale?: string;
  market?: GrowthRuntimeCycle["market"];
  cycleKey: string;
  cycleWindow?: string | null;
  environment?: GrowthRuntimeCycle["environment"];
  gitSha?: string | null;
  triggerSource?: GrowthRuntimeCycleTrigger;
  dryRun?: boolean;
  options?: JsonRecord;
  now?: Date;
}

export interface RecordGrowthSchedulerHeartbeatInput {
  supabase: SupabaseLike;
  accountId: string;
  websiteId: string;
  locale?: string;
  market?: GrowthRuntimeCycle["market"];
  schedulerName?: string;
  status?: "healthy" | "stale" | "degraded" | "failed" | "paused";
  lastCycleId?: string | null;
  lastCycleStatus?: string | null;
  lastMessage?: string | null;
  gitSha?: string | null;
  intervalMs?: number | null;
  metadata?: JsonRecord;
  now?: Date;
}

function normalizeCycleRow(row: unknown): GrowthRuntimeCycle {
  return row as GrowthRuntimeCycle;
}

export async function recordGrowthSchedulerHeartbeat(
  input: RecordGrowthSchedulerHeartbeatInput,
) {
  const now = input.now ?? new Date();
  const row: GrowthSchedulerHeartbeatInsert =
    GrowthSchedulerHeartbeatInsertSchema.parse({
      account_id: input.accountId,
      website_id: input.websiteId,
      locale: input.locale ?? "es-CO",
      market: input.market ?? "CO",
      scheduler_name: input.schedulerName ?? "growth-os-production-cycle",
      status: input.status ?? "healthy",
      health_status: input.status ?? "healthy",
      heartbeat_at: now.toISOString(),
      last_cycle_id: input.lastCycleId ?? null,
      last_cycle_status: input.lastCycleStatus ?? null,
      last_message: input.lastMessage ?? null,
      git_sha: input.gitSha ?? null,
      interval_ms: input.intervalMs ?? null,
      metadata: input.metadata ?? {},
    });

  const { error } = await input.supabase
    .from("growth_scheduler_heartbeats")
    .upsert(
      {
        ...row,
        updated_at: now.toISOString(),
      },
      { onConflict: "website_id,scheduler_name" },
    );

  if (error) {
    throw new Error(`scheduler heartbeat failed: ${error.message}`);
  }
}

export async function startGrowthRuntimeCycle(
  input: StartGrowthRuntimeCycleInput,
): Promise<GrowthRuntimeCycle> {
  const now = input.now ?? new Date();
  const row: GrowthRuntimeCycleInsert = GrowthRuntimeCycleInsertSchema.parse({
    account_id: input.accountId,
    website_id: input.websiteId,
    locale: input.locale ?? "es-CO",
    market: input.market ?? "CO",
    cycle_key: input.cycleKey,
    cycle_window: input.cycleWindow ?? null,
    environment: input.environment ?? "production",
    git_sha: input.gitSha ?? null,
    status: "started",
    trigger_source: input.triggerSource ?? "manual",
    runtime_version: GROWTH_RUNTIME_VERSION,
    dry_run: input.dryRun ?? true,
    options: input.options ?? {},
    stage_results: {},
    summary: {},
    error_class: null,
    error_message: null,
    started_at: now.toISOString(),
    finished_at: null,
  });

  const { data, error } = await input.supabase
    .from("growth_runtime_cycles")
    .upsert(row, { onConflict: "website_id,cycle_key" })
    .select("*")
    .limit(1);

  if (error) throw new Error(`cycle start failed: ${error.message}`);
  const cycle = Array.isArray(data) ? data[0] : data;
  if (!cycle?.id) throw new Error("cycle start returned no row");
  return normalizeCycleRow(cycle);
}

export async function updateGrowthRuntimeCycle({
  supabase,
  cycleId,
  patch,
}: {
  supabase: SupabaseLike;
  cycleId: string;
  patch: GrowthRuntimeCycleUpdate;
}): Promise<GrowthRuntimeCycle> {
  const parsed = Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined),
  ) as GrowthRuntimeCycleUpdate;
  const { data, error } = await supabase
    .from("growth_runtime_cycles")
    .update(parsed)
    .eq("id", cycleId)
    .select("*")
    .order("id", { ascending: true })
    .limit(1);

  if (error) throw new Error(`cycle update failed: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.id) throw new Error("cycle update returned no row");
  return normalizeCycleRow(row);
}

export async function markGrowthRuntimeCycleRunning({
  supabase,
  cycle,
}: {
  supabase: SupabaseLike;
  cycle: GrowthRuntimeCycle;
}) {
  return updateGrowthRuntimeCycle({
    supabase,
    cycleId: cycle.id,
    patch: { status: "running" },
  });
}

export async function recordGrowthRuntimeCycleStage({
  supabase,
  cycle,
  result,
}: {
  supabase: SupabaseLike;
  cycle: GrowthRuntimeCycle;
  result: GrowthRuntimeStageResult;
}) {
  const stageResults = {
    ...(cycle.stage_results ?? {}),
    [result.stage]: result,
  };
  return updateGrowthRuntimeCycle({
    supabase,
    cycleId: cycle.id,
    patch: {
      status: "running",
      stage_results: stageResults,
    },
  });
}

export async function finishGrowthRuntimeCycle({
  supabase,
  cycle,
  status,
  summary,
  error,
  now = new Date(),
}: {
  supabase: SupabaseLike;
  cycle: GrowthRuntimeCycle;
  status: Extract<
    GrowthRuntimeCycleStatus,
    "completed" | "completed_with_blocks" | "failed" | "cancelled"
  >;
  summary: JsonRecord;
  error?: unknown;
  now?: Date;
}) {
  const message = error instanceof Error ? error.message : error ? String(error) : null;
  return updateGrowthRuntimeCycle({
    supabase,
    cycleId: cycle.id,
    patch: {
      status,
      summary,
      error_class: error ? error instanceof Error ? error.name : "Error" : null,
      error_message: message,
      finished_at: now.toISOString(),
    },
  });
}
