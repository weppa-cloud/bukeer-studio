#!/usr/bin/env tsx

import { randomUUID } from "crypto";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { runGrowthOsProductionCycle } from "@/lib/growth/autonomy/production-cycle";

type AgentLane =
  | "technical_remediation"
  | "transcreation"
  | "content_creator"
  | "content_curator"
  | "orchestrator";
type GrowthMarket = "CO" | "MX" | "US" | "CA" | "EU" | "OTHER";
type GrowthEnvironment = "local" | "qa" | "staging" | "production";

const LANES = new Set<AgentLane>([
  "technical_remediation",
  "transcreation",
  "content_creator",
  "content_curator",
  "orchestrator",
]);
const MARKETS = new Set<GrowthMarket>(["CO", "MX", "US", "CA", "EU", "OTHER"]);
const ENVIRONMENTS = new Set<GrowthEnvironment>([
  "local",
  "qa",
  "staging",
  "production",
]);

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function readArg(name: string, fallback = ""): string {
  const prefix = `${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

function readMarket(): GrowthMarket {
  const value = readArg("--market", process.env.GROWTH_MARKET ?? "CO");
  if (MARKETS.has(value as GrowthMarket)) return value as GrowthMarket;
  throw new Error(`Invalid --market value: ${value}`);
}

function readEnvironment(): GrowthEnvironment {
  const value = readArg("--environment", process.env.GROWTH_ENVIRONMENT ?? "production");
  if (ENVIRONMENTS.has(value as GrowthEnvironment)) {
    return value as GrowthEnvironment;
  }
  throw new Error(`Invalid --environment value: ${value}`);
}

function readRuntimeMode(): "executor" | "monitor" {
  if (hasFlag("--monitor-only")) return "monitor";
  const value = readArg("--runtime-mode", process.env.GROWTH_RUNTIME_MODE ?? "executor");
  if (value === "executor" || value === "monitor") return value;
  throw new Error(`Invalid --runtime-mode value: ${value}`);
}

function readLanes(): AgentLane[] | undefined {
  const value = readArg("--lanes", process.env.GROWTH_RUNTIME_LANES ?? "");
  if (!value.trim()) return undefined;
  const lanes = value
    .split(",")
    .map((lane) => lane.trim())
    .filter(Boolean);
  for (const lane of lanes) {
    if (!LANES.has(lane as AgentLane)) {
      throw new Error(`Invalid --lanes value: ${lane}`);
    }
  }
  return [...new Set(lanes)] as AgentLane[];
}

async function shouldExitForFreshSchedulerLease({
  supabase,
  websiteId,
  schedulerName,
  leaseToken,
  now,
}: {
  supabase: ReturnType<typeof createSupabaseServiceRoleClient>;
  websiteId: string;
  schedulerName: string;
  leaseToken: string;
  now: Date;
}): Promise<boolean> {
  const { data, error } = await supabase
    .from("growth_scheduler_heartbeats")
    .select("metadata,heartbeat_at,status")
    .eq("website_id", websiteId)
    .eq("scheduler_name", schedulerName)
    .limit(1);
  if (error) {
    console.warn(`[growth-runtime] scheduler lease lookup skipped: ${error.message}`);
    return false;
  }
  const row = Array.isArray(data) ? data[0] : data;
  const metadata = row?.metadata && typeof row.metadata === "object"
    ? (row.metadata as Record<string, unknown>)
    : {};
  const activeLease = typeof metadata.lease_token === "string"
    ? metadata.lease_token
    : null;
  const leaseExpiresAt = typeof metadata.lease_expires_at === "string"
    ? Date.parse(metadata.lease_expires_at)
    : NaN;
  return Boolean(
    activeLease &&
      activeLease !== leaseToken &&
      Number.isFinite(leaseExpiresAt) &&
      leaseExpiresAt > now.getTime() &&
      row?.status !== "failed",
  );
}

async function main() {
  const accountId = readArg("--account-id", process.env.GROWTH_ACCOUNT_ID ?? "");
  const websiteId = readArg("--website-id", process.env.GROWTH_WEBSITE_ID ?? "");
  if (!accountId || !websiteId) {
    throw new Error("Missing --account-id/--website-id or GROWTH_ACCOUNT_ID/GROWTH_WEBSITE_ID.");
  }
  const dryRun = hasFlag("--dry-run");
  const once = hasFlag("--once");
  const intervalMs = Number(readArg("--interval-ms", "1800000"));
  const runtimeMode = readRuntimeMode();
  const schedulerName = readArg("--scheduler-name", "growth-os-production-cycle");
  const leaseToken = randomUUID();
  const supabase = createSupabaseServiceRoleClient();

  if (
    hasFlag("--scheduled") &&
    !once &&
    !hasFlag("--no-single-daemon-guard") &&
    await shouldExitForFreshSchedulerLease({
      supabase,
      websiteId,
      schedulerName,
      leaseToken,
      now: new Date(),
    })
  ) {
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      status: "skipped",
      reason: "fresh_scheduler_lease_exists",
      schedulerName,
      websiteId,
    }));
    return;
  }

  do {
    const cycleStartedAt = new Date();
    const leaseExpiresAt = new Date(
      cycleStartedAt.getTime() + Math.max(intervalMs * 2, 5 * 60 * 1000),
    ).toISOString();
    const result = await runGrowthOsProductionCycle(accountId, websiteId, {
      supabase,
      locale: readArg("--locale", process.env.GROWTH_LOCALE ?? "es-CO"),
      market: readMarket(),
      triggerSource: hasFlag("--scheduled") ? "scheduled" : "manual",
      dryRun,
      allowLiveMutation: !dryRun,
      runtimeMode,
      enableAgenticBrain: !hasFlag("--disable-agentic-brain"),
      intervalMs,
      environment: readEnvironment(),
      gitSha: readArg("--git-sha", process.env.GITHUB_SHA ?? "local-dev"),
      cycleWindow: readArg("--cycle-window", "30m"),
      claimLimitPerLane: Number(readArg("--max-claims-per-lane", "1")),
      candidateLimit: Number(readArg("--candidate-limit", "25")),
      promotionLimit: Number(readArg("--promotion-limit", "10")),
      lanes: readLanes(),
      schedulerMetadata: {
        scheduler_name: schedulerName,
        lease_token: leaseToken,
        lease_expires_at: leaseExpiresAt,
        process_pid: process.pid,
        runtime_mode: runtimeMode,
      },
    });
    console.log(JSON.stringify({ ts: new Date().toISOString(), ...result }));
    if (once) break;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  } while (true);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
