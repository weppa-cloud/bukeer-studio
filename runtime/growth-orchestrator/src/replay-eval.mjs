#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const LANES = [
  "orchestrator",
  "technical_remediation",
  "transcreation",
  "content_creator",
  "content_curator",
];

function parseArgs(argv) {
  const args = {
    accountId: process.env.GROWTH_ACCOUNT_ID ?? "",
    websiteId: process.env.GROWTH_WEBSITE_ID ?? "",
    outDir: process.env.GROWTH_AGREEMENT_OUT_DIR ?? "evidence/growth",
    policyVersion:
      process.env.GROWTH_POLICY_VERSION ?? "growth-runtime-score-8-5-v1",
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--accountId") args.accountId = argv[++i] ?? "";
    else if (arg === "--websiteId") args.websiteId = argv[++i] ?? "";
    else if (arg === "--outDir") args.outDir = argv[++i] ?? args.outDir;
    else if (arg === "--policyVersion")
      args.policyVersion = argv[++i] ?? args.policyVersion;
  }
  return args;
}

function requiredEnv(name, fallbackName = null) {
  const value =
    process.env[name] ?? (fallbackName ? process.env[fallbackName] : "");
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function evaluateCase(row) {
  const evidence = safeObject(row.evidence);
  const actualDecision = String(evidence.decision ?? "");
  const actualAllowedAction = String(evidence.allowed_action ?? "");
  const expectedDecision = String(row.expected_decision ?? "");
  const expectedAllowedAction = String(row.expected_allowed_action ?? "");
  const decisionMatch = actualDecision === expectedDecision;
  const actionMatch =
    !expectedAllowedAction || actualAllowedAction === expectedAllowedAction;
  return {
    run_id: row.run_id,
    lane: row.lane,
    passed: decisionMatch && actionMatch,
    expected_decision: expectedDecision,
    actual_decision: actualDecision,
    expected_allowed_action: expectedAllowedAction || null,
    actual_allowed_action: actualAllowedAction || null,
  };
}

export async function runReplayEval(opts) {
  const supabaseUrl = requiredEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase
    .from("growth_agent_replay_cases")
    .select(
      "id, account_id, website_id, lane, run_id, expected_decision, expected_allowed_action, evidence, status, created_at",
    )
    .eq("account_id", opts.accountId)
    .eq("website_id", opts.websiteId)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (error) throw new Error(`fetch replay cases failed: ${error.message}`);

  const now = new Date().toISOString();
  const rows = data ?? [];
  const evaluations = rows.map(evaluateCase);
  const lanes = LANES.map((lane) => {
    const laneRows = evaluations.filter((row) => row.lane === lane);
    const passed = laneRows.filter((row) => row.passed).length;
    return {
      account_id: opts.accountId,
      website_id: opts.websiteId,
      lane,
      agreement: laneRows.length === 0 ? 0 : passed / laneRows.length,
      policy_version: opts.policyVersion,
      computed_at: now,
      sample_size: laneRows.length,
      window_start: rows.find((row) => row.lane === lane)?.created_at ?? now,
      window_end: now,
      ai_human_disagreements: laneRows
        .filter((row) => !row.passed)
        .map((row) => ({
          run_id: row.run_id,
          reason: `expected ${row.expected_decision}/${row.expected_allowed_action ?? "any"} but got ${row.actual_decision}/${row.actual_allowed_action ?? "none"}`,
        })),
    };
  });

  await fs.mkdir(opts.outDir, { recursive: true });
  const artifact = {
    policy_version: opts.policyVersion,
    computed_at: now,
    account_id: opts.accountId,
    website_id: opts.websiteId,
    lanes,
    evaluations,
  };
  const outPath = path.join(opts.outDir, `agreement-lane-${todayIso()}.json`);
  await fs.writeFile(outPath, `${JSON.stringify(artifact, null, 2)}\n`);
  return { outPath, lanes };
}

export async function main(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv);
  if (!opts.accountId || !opts.websiteId) {
    throw new Error("Both --accountId and --websiteId are required.");
  }
  const result = await runReplayEval(opts);
  console.log(JSON.stringify(result, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
