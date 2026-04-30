#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const DEFAULT_CURRENT_RUN = "04291924-1574-0216-0000-e2085593ce67";
const DEFAULT_PREVIOUS_RUN = "04290125-1574-0216-0000-00a1195b1ba0";
const OUT_DIR = "artifacts/seo/2026-04-29-growth-weekly-intake";

const args = parseArgs(process.argv.slice(2));
const apply = args.apply === "true";
const forceGoogle = args.forceGoogle === "true";
const skipGoogleRefresh = args.skipGoogleRefresh === "true";
const runApprovedDataForSeoProfiles =
  args.runApprovedDataForSeoProfiles === "true";
const approvedDataForSeoProfiles =
  args.approvedDataForSeoProfiles ??
  "dfs_labs_demand_cluster_v1,dfs_labs_competitor_visibility_v1,dfs_labs_gap_intersections_v1,dfs_serp_priority_keywords_v1,dfs_serp_local_pack_v1";
const approvedDataForSeoSeedProfiles = parseList(
  args.approvedDataForSeoSeedProfiles,
  [],
);
const currentRun = args.current ?? DEFAULT_CURRENT_RUN;
const previousRun = args.previous ?? DEFAULT_PREVIOUS_RUN;
const outDir = args.outDir ?? OUT_DIR;

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  await fs.mkdir(outDir, { recursive: true });

  const steps = [
    googleRefreshStep(),
    ...approvedDataForSeoSteps(),
    nodeStep(
      "gsc_inventory_normalizer",
      "scripts/seo/normalize-growth-gsc-cache.mjs",
      apply ? ["--apply", "true", "--limit", "100"] : ["--limit", "100"],
    ),
    nodeStep(
      "ga4_inventory_normalizer",
      "scripts/seo/normalize-growth-ga4-cache.mjs",
      apply ? ["--apply", "true", "--limit", "100"] : ["--limit", "100"],
    ),
    nodeStep(
      "dataforseo_v2_triage",
      "scripts/seo/triage-dataforseo-findings.mjs",
      [
        "--current",
        currentRun,
        "--previous",
        previousRun,
        "--limit",
        "200",
        ...(apply ? ["--apply", "true"] : []),
      ],
    ),
    nodeStep("dataforseo_diff", "scripts/seo/diff-growth-audit-runs.mjs", [
      "--current",
      currentRun,
      "--previous",
      previousRun,
    ]),
    nodeStep("cache_health", "scripts/seo/growth-cache-health-report.mjs", []),
    nodeStep(
      "max_matrix_fact_normalizer",
      "scripts/seo/normalize-growth-max-matrix-facts.mjs",
      apply ? ["--apply=true", "--limit=1500"] : ["--limit=1500"],
    ),
    nodeStep(
      "joint_normalizers",
      "scripts/seo/run-growth-joint-normalizers.mjs",
      apply ? ["--apply", "true"] : [],
    ),
    nodeStep(
      "max_matrix_orchestrator",
      "scripts/seo/run-growth-max-matrix-orchestrator.mjs",
      ["--cadence", "weekly"],
    ),
    nodeStep(
      "max_matrix_coverage",
      "scripts/seo/audit-growth-max-matrix-coverage.mjs",
      [],
    ),
    nodeStep(
      "max_matrix_council_enforcement",
      "scripts/seo/generate-growth-max-matrix-council-artifact.mjs",
      [],
    ),
  ].filter(Boolean);

  const results = [];
  for (const step of steps) {
    const result = runStep(step);
    results.push(result);
    if (result.exit_code !== 0 && step.required) break;
  }

  const report = {
    generated_at: new Date().toISOString(),
    mode: apply ? "apply" : "dry-run",
    current_run: currentRun,
    previous_run: previousRun,
    status: results.every((step) => step.exit_code === 0 || !step.required)
      ? "PASS"
      : "FAIL",
    steps: results,
  };

  await fs.writeFile(
    path.join(outDir, "growth-weekly-intake.json"),
    JSON.stringify(report, null, 2),
  );
  await fs.writeFile(
    path.join(outDir, "growth-weekly-intake.md"),
    toMarkdown(report),
  );

  console.log(
    JSON.stringify(
      {
        status: report.status,
        mode: report.mode,
        outDir,
        steps: results.map(({ name, status, exit_code }) => ({
          name,
          status,
          exit_code,
        })),
      },
      null,
      2,
    ),
  );

  if (report.status !== "PASS") process.exitCode = 1;
}

function googleRefreshStep() {
  if (skipGoogleRefresh) return null;
  const stepArgs = [
    "tsx",
    "scripts/seo/populate-growth-google-cache.ts",
    "--expanded",
    "--locale",
  ];
  if (apply) stepArgs.push("--apply");
  if (forceGoogle) stepArgs.push("--force");
  if (args.from) stepArgs.push(`--from=${args.from}`);
  if (args.to) stepArgs.push(`--to=${args.to}`);
  return {
    name: "google_cache_refresh",
    command: "npx",
    args: stepArgs,
    required: false,
    note: "GSC/GA4 refresh is non-blocking; normalizers can use existing cache if refresh fails.",
  };
}

function approvedDataForSeoSteps() {
  if (!runApprovedDataForSeoProfiles) return [];
  const seedProfiles =
    approvedDataForSeoSeedProfiles.length > 0
      ? approvedDataForSeoSeedProfiles
      : ["co-es"];
  return seedProfiles.map((seedProfile) =>
    nodeStep(
      `approved_dataforseo_${seedProfile}`,
      "scripts/seo/run-dataforseo-max-performance-profiles.mjs",
      [
        "--apply",
        String(apply),
        "--profiles",
        approvedDataForSeoProfiles,
        "--seedProfile",
        seedProfile,
        "--keywordLimit",
        "10",
        "--competitorLimit",
        "5",
        "--runTag",
        `weekly-intake-${seedProfile}-${todayCompact()}`,
        "--outDir",
        path.join(outDir, `dataforseo-${seedProfile}`),
      ],
    ),
  );
}

function nodeStep(name, script, stepArgs) {
  return {
    name,
    command: "node",
    args: [script, ...stepArgs],
    required: true,
  };
}

function runStep(step) {
  const started = Date.now();
  const child = spawnSync(step.command, step.args, {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 20,
  });
  const exitCode = child.status ?? 1;
  return {
    name: step.name,
    command: [step.command, ...step.args].join(" "),
    required: step.required,
    status: exitCode === 0 ? "PASS" : step.required ? "FAIL" : "WARN",
    exit_code: exitCode,
    duration_ms: Date.now() - started,
    stdout_tail: tail(child.stdout),
    stderr_tail: tail(child.stderr),
    note: step.note,
  };
}

function tail(value, max = 4000) {
  const text = String(value ?? "").trim();
  return text.length <= max ? text : text.slice(text.length - max);
}

function toMarkdown(report) {
  const rows = report.steps
    .map(
      (step) =>
        `| ${step.status} | ${step.name} | ${step.exit_code} | ${step.duration_ms} | \`${step.command}\` |`,
    )
    .join("\n");
  const details = report.steps
    .map(
      (step) =>
        `### ${step.name}\n\nStatus: ${step.status}\n\n\`\`\`text\n${step.stdout_tail || step.stderr_tail || "no output"}\n\`\`\``,
    )
    .join("\n\n");

  return `# Growth Weekly Intake

Generated: ${report.generated_at}
Mode: ${report.mode}
Status: ${report.status}
Current run: ${report.current_run}
Previous run: ${report.previous_run}

## Steps

| Status | Step | Exit | Duration ms | Command |
|---|---|---:|---:|---|
${rows}

## Output

${details}
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

function parseList(value, fallback) {
  if (!value) return fallback;
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function todayCompact() {
  return new Date().toISOString().slice(0, 10).replaceAll("-", "");
}
