#!/usr/bin/env tsx

import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { runGrowthOsProductionCycle } from "@/lib/growth/autonomy/production-cycle";

type GrowthMarket = "CO" | "MX" | "US" | "CA" | "EU" | "OTHER";
type GrowthEnvironment = "local" | "qa" | "staging" | "production";

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

async function main() {
  const accountId = readArg("--account-id", process.env.GROWTH_ACCOUNT_ID ?? "");
  const websiteId = readArg("--website-id", process.env.GROWTH_WEBSITE_ID ?? "");
  if (!accountId || !websiteId) {
    throw new Error("Missing --account-id/--website-id or GROWTH_ACCOUNT_ID/GROWTH_WEBSITE_ID.");
  }
  const dryRun = hasFlag("--dry-run");
  const once = hasFlag("--once");
  const intervalMs = Number(readArg("--interval-ms", "1800000"));
  const supabase = createSupabaseServiceRoleClient();

  do {
    const result = await runGrowthOsProductionCycle(accountId, websiteId, {
      supabase,
      locale: readArg("--locale", process.env.GROWTH_LOCALE ?? "es-CO"),
      market: readMarket(),
      triggerSource: hasFlag("--scheduled") ? "scheduled" : "manual",
      dryRun,
      allowLiveMutation: !dryRun,
      enableAgenticBrain: !hasFlag("--disable-agentic-brain"),
      environment: readEnvironment(),
      gitSha: readArg("--git-sha", process.env.GITHUB_SHA ?? "local-dev"),
      cycleWindow: readArg("--cycle-window", "30m"),
      claimLimitPerLane: Number(readArg("--max-claims-per-lane", "1")),
      candidateLimit: Number(readArg("--candidate-limit", "25")),
      promotionLimit: Number(readArg("--promotion-limit", "10")),
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
