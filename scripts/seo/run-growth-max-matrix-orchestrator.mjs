#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  GROWTH_PROVIDER_PROFILES,
  DEFAULT_WEBSITE_ID,
  selectDueProfiles,
  requiresApproval,
  summarizeRegistry,
} from "./growth-provider-profile-registry.mjs";

const DEFAULT_OUT_DIR = `artifacts/seo/${todayIso()}-growth-max-matrix-orchestrator`;

const args = parseArgs(process.argv.slice(2));
const outDir = args.outDir ?? DEFAULT_OUT_DIR;
const cadence = args.cadence ?? "weekly";
const apply = args.apply === "true";
const includeApprovalRequired = args.includeApprovalRequired === "true";
const includeNoDefault = args.includeNoDefault === "true";
const includePlanned = args.includePlanned !== "false";
const websiteId = args.websiteId ?? DEFAULT_WEBSITE_ID;

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  const dueProfiles = selectDueProfiles({
    cadence,
    includeApprovalRequired,
    includeNoDefault,
    includePlanned,
  });

  const profiles = GROWTH_PROVIDER_PROFILES.map((profile) => ({
    ...profile,
    due_for_selected_cadence: dueProfiles.some(
      (candidate) => candidate.id === profile.id,
    ),
    run_decision: runDecision(profile, dueProfiles),
  }));

  const report = {
    generated_at: new Date().toISOString(),
    website_id: websiteId,
    mode: apply ? "apply" : "dry-run",
    cadence,
    include_approval_required: includeApprovalRequired,
    include_no_default: includeNoDefault,
    summary: summarizeRegistry(GROWTH_PROVIDER_PROFILES),
    selected_summary: summarizeRegistry(dueProfiles),
    status: statusFor(profiles),
    profiles,
    next_commands: buildNextCommands(dueProfiles),
    note: "This orchestrator does not call paid providers. It plans/schedules profiles and leaves provider execution to approved profile-specific scripts.",
  };

  await fs.writeFile(
    path.join(outDir, "growth-max-matrix-orchestrator.json"),
    JSON.stringify(report, null, 2),
  );
  await fs.writeFile(
    path.join(outDir, "growth-max-matrix-orchestrator.md"),
    toMarkdown(report),
  );

  console.log(
    JSON.stringify(
      {
        status: report.status,
        mode: report.mode,
        cadence: report.cadence,
        outDir,
        selected_profiles: dueProfiles.length,
        runnable_now: profiles.filter(
          (profile) => profile.run_decision.status === "RUNNABLE",
        ).length,
        blocked: profiles.filter(
          (profile) => profile.run_decision.status === "BLOCKED",
        ).length,
        watch: profiles.filter(
          (profile) => profile.run_decision.status === "WATCH",
        ).length,
      },
      null,
      2,
    ),
  );
}

function runDecision(profile, dueProfiles) {
  const isDue = dueProfiles.some((candidate) => candidate.id === profile.id);
  if (!isDue) {
    return {
      status: "SKIP",
      reason: "Not due for selected cadence or excluded by flags.",
    };
  }
  if (profile.status === "excluded") {
    return {
      status: "SKIP",
      reason: "Excluded by Growth OS scope.",
    };
  }
  if (requiresApproval(profile) && !includeApprovalRequired) {
    return {
      status: "BLOCKED",
      reason: `Approval required: ${profile.approval}.`,
    };
  }
  if (profile.status === "planned") {
    return {
      status: "WATCH",
      reason:
        "Profile is specified but extractor/normalizer is not implemented.",
    };
  }
  if (
    profile.costClass?.startsWith("paid") &&
    profile.status !== "implemented"
  ) {
    return {
      status: "WATCH",
      reason:
        "Paid profile is not fully wired; schedule only after owner issue approves scope and cost.",
    };
  }
  return {
    status: "RUNNABLE",
    reason: apply
      ? "Can be executed by its profile-specific script. This orchestrator records the plan only."
      : "Dry-run only; profile-specific execution is listed in next_commands.",
  };
}

function statusFor(profiles) {
  const selected = profiles.filter(
    (profile) => profile.due_for_selected_cadence,
  );
  if (selected.some((profile) => profile.run_decision.status === "BLOCKED"))
    return "WATCH";
  if (selected.some((profile) => profile.run_decision.status === "WATCH"))
    return "WATCH";
  return "PASS";
}

function buildNextCommands(profiles) {
  const commands = [];
  if (
    profiles.some(
      (profile) => profile.provider === "gsc" || profile.provider === "ga4",
    )
  ) {
    commands.push({
      purpose: "Refresh free first-party caches",
      command:
        "npx tsx scripts/seo/populate-growth-google-cache.ts --apply --force",
      approval: "automatic",
    });
    commands.push({
      purpose: "Normalize first-party caches into growth_inventory",
      command:
        "node scripts/seo/run-growth-weekly-intake.mjs --apply true --skipGoogleRefresh true",
      approval: "automatic",
    });
  }
  if (
    profiles.some((profile) => profile.id === "dfs_onpage_full_comparable_v3")
  ) {
    commands.push({
      purpose: "Follow up approved DataForSEO OnPage task",
      command:
        "node scripts/seo/dataforseo-onpage-crawl.mjs --taskId <approved-task-id> && node scripts/seo/normalize-dataforseo-onpage.mjs --apply true",
      approval:
        "required to start a new crawl; automatic to follow up existing approved task",
    });
  }
  if (profiles.some((profile) => profile.id === "dfs_ai_geo_visibility_v1")) {
    commands.push({
      purpose: "Run approved AI/GEO visibility pilot",
      command: "node scripts/seo/run-dataforseo-ai-visibility.mjs --apply true",
      approval: "required every run",
    });
  }
  commands.push({
    purpose: "Generate health and Council enforcement artifacts",
    command:
      "node scripts/seo/growth-cache-health-report.mjs && node scripts/seo/audit-growth-max-matrix-coverage.mjs && node scripts/seo/generate-growth-max-matrix-council-artifact.mjs",
    approval: "automatic",
  });
  return commands;
}

function toMarkdown(report) {
  const rows = report.profiles
    .filter((profile) => profile.due_for_selected_cadence)
    .map(
      (profile) =>
        `| ${profile.run_decision.status} | ${profile.priority} | ${profile.provider} | ${profile.id} | ${profile.cadence} | ${profile.status} | ${profile.approval} | ${profile.rawCache ?? "n/a"} | ${profile.factTargets.join(", ") || "n/a"} | ${profile.ownerIssues.join(", ")} | ${profile.run_decision.reason} |`,
    )
    .join("\n");
  const commandRows = report.next_commands
    .map(
      (command) =>
        `| ${command.purpose} | \`${command.command}\` | ${command.approval} |`,
    )
    .join("\n");

  return `# Growth OS Max Performance Orchestrator

Generated: ${report.generated_at}
Website: ${report.website_id}
Mode: ${report.mode}
Cadence: ${report.cadence}
Status: ${report.status}

## Summary

| Metric | Value |
|---|---:|
| Total profiles | ${report.summary.profile_count} |
| Selected profiles | ${report.selected_summary.profile_count} |
| Implemented selected | ${report.selected_summary.by_status.implemented ?? 0} |
| Partial selected | ${report.selected_summary.by_status.partial ?? 0} |
| Planned selected | ${report.selected_summary.by_status.planned ?? 0} |

## Selected Profiles

| Decision | Priority | Provider | Profile | Cadence | Implementation | Approval | Raw/cache | Facts | Owner issues | Reason |
|---|---|---|---|---|---|---|---|---|---|---|
${rows || "| n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | No profiles selected |"}

## Next Commands

| Purpose | Command | Approval |
|---|---|---|
${commandRows}

## Guardrails

- This command does not call paid providers.
- Paid/heavy DataForSEO profiles stay approval-gated even when listed.
- Council can only promote rows with source row, baseline, owner, success metric and evaluation date.
- Raw provider payloads remain in cache/fact tables; \`growth_inventory\` receives only decision-grade summaries.
`;
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
    const raw = arg.slice(2);
    if (raw.includes("=")) {
      const [key, ...rest] = raw.split("=");
      parsed[key] = rest.join("=");
      continue;
    }
    const next = argv[index + 1];
    parsed[raw] = next && !next.startsWith("--") ? next : "true";
    if (next && !next.startsWith("--")) index += 1;
  }
  return parsed;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
