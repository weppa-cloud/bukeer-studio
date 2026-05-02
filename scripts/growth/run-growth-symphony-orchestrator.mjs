#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import { createHash, randomUUID } from "node:crypto";
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
    once: false,
    configSmoke: false,
    intervalMs: 30_000,
    accountId: process.env.GROWTH_ACCOUNT_ID ?? "",
    websiteId: process.env.GROWTH_WEBSITE_ID ?? "",
    locale: process.env.GROWTH_LOCALE ?? "es-CO",
    market: process.env.GROWTH_MARKET ?? "CO",
    workspaceRoot: process.env.GROWTH_WORKSPACE_ROOT ?? "/workspaces",
    artifactsRoot: process.env.GROWTH_ARTIFACTS_ROOT ?? "/artifacts",
    workflowRoot:
      process.env.GROWTH_WORKFLOW_ROOT ??
      path.join(process.cwd(), "docs/growth-orchestrator/workflows"),
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--once") args.once = true;
    else if (arg === "--configSmoke") args.configSmoke = true;
    else if (arg === "--intervalMs") args.intervalMs = Number(argv[++i]);
    else if (arg === "--accountId") args.accountId = argv[++i] ?? "";
    else if (arg === "--websiteId") args.websiteId = argv[++i] ?? "";
    else if (arg === "--locale") args.locale = argv[++i] ?? args.locale;
    else if (arg === "--market") args.market = argv[++i] ?? args.market;
    else if (arg === "--workspaceRoot") args.workspaceRoot = argv[++i] ?? "";
    else if (arg === "--artifactsRoot") args.artifactsRoot = argv[++i] ?? "";
    else if (arg === "--workflowRoot") args.workflowRoot = argv[++i] ?? "";
  }
  return args;
}

function requiredEnv(name, fallbackName = null) {
  const value =
    process.env[name] ?? (fallbackName ? process.env[fallbackName] : "");
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

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

async function fetchAgentDefinition(supabase, run) {
  const baseSelect =
    "agent_id,lane,name,enabled,mode,model,prompt_version,workflow_version,agreement_threshold,max_concurrent_runs,max_active_experiments,locale,market,notes";

  const exact = await supabase
    .from("growth_agent_definitions")
    .select(baseSelect)
    .eq("account_id", run.account_id)
    .eq("website_id", run.website_id)
    .eq("lane", run.lane)
    .eq("locale", run.locale)
    .eq("market", run.market)
    .eq("enabled", true)
    .limit(1)
    .maybeSingle();

  if (exact.error) {
    throw new Error(
      `fetchAgentDefinition exact failed: ${exact.error.message}`,
    );
  }
  if (exact.data) return exact.data;

  const fallback = await supabase
    .from("growth_agent_definitions")
    .select(baseSelect)
    .eq("account_id", run.account_id)
    .eq("website_id", run.website_id)
    .eq("lane", run.lane)
    .eq("enabled", true)
    .order("market", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (fallback.error) {
    throw new Error(
      `fetchAgentDefinition fallback failed: ${fallback.error.message}`,
    );
  }
  return fallback.data ?? null;
}

async function fetchContextPack(supabase, run) {
  const baseSelect =
    "id,pack_id,version,locale,market,preferences,markets,tone,content_rules,rejected_patterns,examples,learned_decisions,notes";

  const exact = await supabase
    .from("growth_agent_context_packs")
    .select(baseSelect)
    .eq("account_id", run.account_id)
    .eq("website_id", run.website_id)
    .eq("locale", run.locale)
    .eq("market", run.market)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (exact.error) {
    throw new Error(`fetchContextPack exact failed: ${exact.error.message}`);
  }
  if (exact.data) return exact.data;

  const fallback = await supabase
    .from("growth_agent_context_packs")
    .select(baseSelect)
    .eq("account_id", run.account_id)
    .eq("website_id", run.website_id)
    .eq("is_active", true)
    .order("market", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (fallback.error) {
    throw new Error(
      `fetchContextPack fallback failed: ${fallback.error.message}`,
    );
  }
  return fallback.data ?? null;
}

async function loadWorkflow(workflowRoot, workflowVersion) {
  if (!workflowVersion) {
    return { loaded: false, path: null, sha256: null, bytes: 0 };
  }

  const workflowPath = path.join(workflowRoot, `${workflowVersion}.md`);
  try {
    const text = await fs.readFile(workflowPath, "utf8");
    return {
      loaded: true,
      path: workflowPath,
      sha256: createHash("sha256").update(text).digest("hex"),
      bytes: Buffer.byteLength(text, "utf8"),
    };
  } catch (error) {
    if (error?.code === "ENOENT") {
      return {
        loaded: false,
        path: workflowPath,
        sha256: null,
        bytes: 0,
        error: "workflow_file_missing",
      };
    }
    throw error;
  }
}

function resolveLlmTransport(agentDefinition) {
  const requestedModel =
    agentDefinition?.model ??
    process.env.OPENAI_DEFAULT_MODEL ??
    process.env.OPENROUTER_MODEL ??
    null;

  if (process.env.OPENAI_API_KEY) {
    return {
      provider: "openai",
      ready: true,
      base_url: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
      model: requestedModel,
    };
  }

  if (process.env.OPENROUTER_AUTH_TOKEN) {
    return {
      provider: "openai_compatible_fallback",
      ready: true,
      base_url:
        process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
      model: requestedModel,
      warning:
        "OPENAI_API_KEY missing; runtime can only use compatible fallback transport if it supports the selected model.",
    };
  }

  return {
    provider: "none",
    ready: false,
    base_url: null,
    model: requestedModel,
    warning:
      "No OpenAI or compatible LLM transport configured. Runtime remains observe-only.",
  };
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

async function createArtifact(artifactsRoot, run, runtimeContext) {
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
    agent: runtimeContext.agentDefinition
      ? {
          agent_id: runtimeContext.agentDefinition.agent_id,
          name: runtimeContext.agentDefinition.name,
          lane: runtimeContext.agentDefinition.lane,
          mode: runtimeContext.agentDefinition.mode,
          model: runtimeContext.agentDefinition.model,
          prompt_version: runtimeContext.agentDefinition.prompt_version,
          workflow_version: runtimeContext.agentDefinition.workflow_version,
          agreement_threshold:
            runtimeContext.agentDefinition.agreement_threshold,
        }
      : null,
    workflow: runtimeContext.workflow,
    context_pack: runtimeContext.contextPack
      ? {
          id: runtimeContext.contextPack.id,
          pack_id: runtimeContext.contextPack.pack_id,
          version: runtimeContext.contextPack.version,
          locale: runtimeContext.contextPack.locale,
          market: runtimeContext.contextPack.market,
          tone: runtimeContext.contextPack.tone,
          markets: runtimeContext.contextPack.markets,
          content_rules_count: Array.isArray(
            runtimeContext.contextPack.content_rules,
          )
            ? runtimeContext.contextPack.content_rules.length
            : 0,
        }
      : null,
    llm_transport: runtimeContext.llmTransport,
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
  if (!run?.run_id) {
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

  const agentDefinition = await fetchAgentDefinition(supabase, run);
  const contextPack = await fetchContextPack(supabase, run);
  const workflow = await loadWorkflow(
    opts.workflowRoot,
    agentDefinition?.workflow_version,
  );
  const llmTransport = resolveLlmTransport(agentDefinition);
  const runtimeContext = {
    agentDefinition,
    contextPack,
    workflow,
    llmTransport,
  };

  await writeRunEvent(supabase, run, "runtime_config_loaded", {
    severity: agentDefinition && workflow.loaded ? "info" : "warn",
    message: agentDefinition
      ? "Runtime loaded agent registry, workflow and context pack."
      : "Runtime did not find an enabled agent definition for the claimed lane.",
    payload: {
      agent_id: agentDefinition?.agent_id ?? null,
      lane,
      model: agentDefinition?.model ?? null,
      prompt_version: agentDefinition?.prompt_version ?? null,
      workflow_version: agentDefinition?.workflow_version ?? null,
      workflow_loaded: workflow.loaded,
      context_pack_version: contextPack?.version ?? null,
      llm_provider: llmTransport.provider,
      llm_ready: llmTransport.ready,
    },
  });

  const artifactPath = await createArtifact(
    opts.artifactsRoot,
    run,
    runtimeContext,
  );
  await updateRun(supabase, run.run_id, {
    status: "review_required",
    heartbeat_at: new Date().toISOString(),
    artifact_path: artifactPath,
    evidence: {
      ...safeObject(run.evidence),
      runtime: "vps",
      runtime_mode: "observe_only",
      handoff: "human_review_required",
      artifact_path: artifactPath,
      agent_id: agentDefinition?.agent_id ?? null,
      model: agentDefinition?.model ?? null,
      prompt_version: agentDefinition?.prompt_version ?? null,
      workflow_version: agentDefinition?.workflow_version ?? null,
      workflow_loaded: workflow.loaded,
      workflow_path: workflow.path,
      context_pack_version: contextPack?.version ?? null,
      llm_provider: llmTransport.provider,
      llm_ready: llmTransport.ready,
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

async function configSmoke(supabase, opts) {
  const results = [];

  for (const lane of LANES) {
    const run = {
      account_id: opts.accountId,
      website_id: opts.websiteId,
      locale: opts.locale,
      market: opts.market,
      lane,
    };
    const agentDefinition = await fetchAgentDefinition(supabase, run);
    const contextPack = await fetchContextPack(supabase, run);
    const workflow = await loadWorkflow(
      opts.workflowRoot,
      agentDefinition?.workflow_version,
    );
    const llmTransport = resolveLlmTransport(agentDefinition);
    results.push({
      lane,
      agent_configured: Boolean(agentDefinition),
      model: agentDefinition?.model ?? null,
      mode: agentDefinition?.mode ?? null,
      prompt_version: agentDefinition?.prompt_version ?? null,
      workflow_version: agentDefinition?.workflow_version ?? null,
      workflow_loaded: workflow.loaded,
      context_pack_version: contextPack?.version ?? null,
      llm_provider: llmTransport.provider,
      llm_ready: llmTransport.ready,
    });
  }

  const pass = results.every(
    (result) =>
      result.agent_configured &&
      result.workflow_loaded &&
      result.context_pack_version,
  );
  log(pass ? "info" : "warn", "runtime config smoke completed", {
    pass,
    account_id: opts.accountId,
    website_id: opts.websiteId,
    locale: opts.locale,
    market: opts.market,
    results,
  });
  return pass;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.accountId || !opts.websiteId) {
    throw new Error(
      "Both --accountId/GROWTH_ACCOUNT_ID and --websiteId/GROWTH_WEBSITE_ID are required.",
    );
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
    config_smoke: opts.configSmoke,
    account_id: opts.accountId,
    website_id: opts.websiteId,
    locale: opts.locale,
    market: opts.market,
    interval_ms: opts.intervalMs,
  });

  if (opts.configSmoke) {
    const pass = await configSmoke(supabase, opts);
    if (!pass) process.exitCode = 1;
    return;
  }

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
