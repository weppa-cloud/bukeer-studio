#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const LANES = [
  "technical_remediation",
  "transcreation",
  "content_creator",
  "content_curator",
];

function parseArgs(argv) {
  const args = {
    once: false,
    intervalMs: 30_000,
    accountId: process.env.GROWTH_ACCOUNT_ID ?? "",
    websiteId: process.env.GROWTH_WEBSITE_ID ?? "",
    workspaceRoot: process.env.GROWTH_WORKSPACE_ROOT ?? "/workspaces",
    artifactsRoot: process.env.GROWTH_ARTIFACTS_ROOT ?? "/artifacts",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--once") args.once = true;
    else if (arg === "--intervalMs") args.intervalMs = Number(argv[++i]);
    else if (arg === "--accountId") args.accountId = argv[++i] ?? "";
    else if (arg === "--websiteId") args.websiteId = argv[++i] ?? "";
    else if (arg === "--workspaceRoot") args.workspaceRoot = argv[++i] ?? "";
    else if (arg === "--artifactsRoot") args.artifactsRoot = argv[++i] ?? "";
  }
  return args;
}

function requiredEnv(name, fallbackName = null) {
  const value = process.env[name] ?? (fallbackName ? process.env[fallbackName] : "");
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function log(level, message, meta = {}) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    message,
    ...meta,
  };
  // Structured logs are consumed by Docker json-file and future log shipping.
  console.log(JSON.stringify(entry));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function writeRunEvent(supabase, run, eventType, opts = {}) {
  const { error } = await supabase.from("growth_agent_run_events").insert({
    account_id: run.account_id,
    website_id: run.website_id,
    locale: run.locale,
    market: run.market,
    run_id: run.run_id,
    event_type: eventType,
    severity: opts.severity ?? "info",
    message: opts.message ?? null,
    payload: opts.payload ?? null,
    occurred_at: new Date().toISOString(),
  });
  if (error) {
    throw new Error(`writeRunEvent(${eventType}) failed: ${error.message}`);
  }
}

async function updateRun(supabase, runId, patch) {
  const { error } = await supabase
    .from("growth_agent_runs")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("run_id", runId);
  if (error) throw new Error(`updateRun(${runId}) failed: ${error.message}`);
}

async function createArtifact(artifactsRoot, run) {
  const dir = path.join(
    artifactsRoot,
    run.account_id,
    run.website_id,
    run.run_id,
  );
  await fs.mkdir(dir, { recursive: true });
  const artifactPath = path.join(dir, "orchestrator-observe-only.json");
  const payload = {
    generated_at: new Date().toISOString(),
    mode: "observe_only_runtime",
    run_id: run.run_id,
    lane: run.lane,
    source_table: run.source_table,
    source_id: run.source_id,
    decision: "review_required",
    reason:
      "Runtime worker claimed a real backlog item and prepared handoff evidence. Business mutation is intentionally gated for human review.",
  };
  await fs.writeFile(artifactPath, `${JSON.stringify(payload, null, 2)}\n`);
  return artifactPath;
}

async function claimLane(supabase, opts, lane) {
  const claimId = randomUUID();
  const workspacePath = path.join(
    opts.workspaceRoot,
    opts.accountId,
    opts.websiteId,
    claimId,
  );
  await fs.mkdir(workspacePath, { recursive: true });

  const { data, error } = await supabase.rpc("claim_growth_agent_run", {
    p_account_id: opts.accountId,
    p_website_id: opts.websiteId,
    p_lane: lane,
    p_claim_id: claimId,
    p_workspace_path: workspacePath,
  });

  if (error) throw new Error(`claim RPC failed lane=${lane}: ${error.message}`);
  const run = Array.isArray(data) ? data[0] : data;
  if (!run) {
    log("info", "no eligible row", { lane });
    return { claimed: false };
  }

  log("info", "claimed run", {
    lane,
    run_id: run.run_id,
    source_table: run.source_table,
    source_id: run.source_id,
  });

  await updateRun(supabase, run.run_id, {
    status: "running",
    started_at: new Date().toISOString(),
    heartbeat_at: new Date().toISOString(),
    attempts: (run.attempts ?? 0) + 1,
  });
  await writeRunEvent(supabase, run, "started", {
    message: `Runtime started lane=${lane}`,
    payload: { claim_id: claimId, runtime_mode: "observe_only" },
  });

  const artifactPath = await createArtifact(opts.artifactsRoot, run);
  await updateRun(supabase, run.run_id, {
    status: "review_required",
    heartbeat_at: new Date().toISOString(),
    artifact_path: artifactPath,
    evidence: {
      ...(run.evidence ?? {}),
      runtime: "vps",
      runtime_mode: "observe_only",
      handoff: "human_review_required",
      artifact_path: artifactPath,
      completed_at: new Date().toISOString(),
    },
  });
  await writeRunEvent(supabase, run, "artifact_written", {
    message: "Observe-only handoff artifact written.",
    payload: { artifact_path: artifactPath },
  });
  await writeRunEvent(supabase, run, "review_required", {
    severity: "warn",
    message: "Human review required before business mutation.",
    payload: { required_role: "curator", runtime_mode: "observe_only" },
  });

  return { claimed: true, run_id: run.run_id };
}

async function tick(supabase, opts) {
  let claimed = 0;
  for (const lane of LANES) {
    const result = await claimLane(supabase, opts, lane);
    if (result.claimed) claimed += 1;
  }
  return claimed;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.accountId || !opts.websiteId) {
    throw new Error("Both --accountId/GROWTH_ACCOUNT_ID and --websiteId/GROWTH_WEBSITE_ID are required.");
  }
  if (!Number.isFinite(opts.intervalMs) || opts.intervalMs < 5_000) {
    throw new Error("--intervalMs must be >= 5000");
  }

  const supabaseUrl = requiredEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  log("info", "growth orchestrator started", {
    once: opts.once,
    account_id: opts.accountId,
    website_id: opts.websiteId,
    interval_ms: opts.intervalMs,
  });

  do {
    try {
      const claimed = await tick(supabase, opts);
      log("info", "orchestrator tick completed", { claimed });
    } catch (error) {
      log("error", "orchestrator tick failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      if (opts.once) process.exitCode = 1;
    }
    if (opts.once) break;
    await sleep(opts.intervalMs);
  } while (true);
}

main().catch((error) => {
  log("error", "orchestrator crashed", {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
