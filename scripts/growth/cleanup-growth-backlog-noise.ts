#!/usr/bin/env tsx

import {
  cleanupGrowthBacklogNoise,
  GROWTH_BACKLOG_CLEANUP_CONFIRM,
} from "@/lib/growth/autonomy/backlog-noise-cleanup";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function readArg(name: string, fallback = ""): string {
  const prefix = `${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

async function main() {
  const accountId = readArg("--account-id", process.env.GROWTH_ACCOUNT_ID ?? "");
  const websiteId = readArg("--website-id", process.env.GROWTH_WEBSITE_ID ?? "");
  if (!accountId || !websiteId) {
    throw new Error("Missing --account-id/--website-id or GROWTH_ACCOUNT_ID/GROWTH_WEBSITE_ID.");
  }
  const apply = hasFlag("--apply");
  const confirm = readArg("--confirm", "");
  if (apply && confirm !== GROWTH_BACKLOG_CLEANUP_CONFIRM) {
    throw new Error(`Apply requires --confirm=${GROWTH_BACKLOG_CLEANUP_CONFIRM}`);
  }

  const result = await cleanupGrowthBacklogNoise({
    supabase: createSupabaseServiceRoleClient(),
    accountId,
    websiteId,
    apply,
    confirm,
    reportPath: readArg("--report-path", ""),
  });

  console.log(JSON.stringify({ ts: new Date().toISOString(), ...result }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
