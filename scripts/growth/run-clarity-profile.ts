#!/usr/bin/env tsx

import { runClarityUxFrictionProfile } from "@/lib/growth/providers/clarity-profile-runner";

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

  const result = await runClarityUxFrictionProfile({
    accountId,
    websiteId,
    locale: readArg("--locale", process.env.GROWTH_LOCALE ?? "es-CO"),
    market: readArg("--market", process.env.GROWTH_MARKET ?? "CO"),
    numOfDays: Number(readArg("--num-of-days", "1")),
    dimensions: readArg("--dimensions", "url,device,source")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    dryRun: !hasFlag("--apply"),
  });

  console.log(JSON.stringify({ ts: new Date().toISOString(), ...result }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
