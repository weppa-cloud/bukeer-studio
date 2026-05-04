#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { runCodexAgentTask } from "./codex-executor.mjs";
import { memoryContent } from "./memory.mjs";
import { buildReplaySeed } from "./replay.mjs";
import { skillInstructions } from "./skills.mjs";
import { evaluateToolPolicy } from "./tool-gateway.mjs";

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
    executorMode: process.env.GROWTH_EXECUTOR_MODE ?? "codex",
    codexBin: process.env.CODEX_BIN ?? "codex",
    codexModel: process.env.GROWTH_CODEX_MODEL ?? "gpt-5.2",
    codexSandboxMode: process.env.GROWTH_CODEX_SANDBOX_MODE ?? "bypass",
    codexDisableMcp: process.env.GROWTH_CODEX_DISABLE_MCP !== "0",
    codexTimeoutMs: Number(process.env.GROWTH_CODEX_TIMEOUT_MS ?? 900_000),
    codexDryRun: process.env.GROWTH_CODEX_DRY_RUN === "1",
    stallTtlSeconds: Number(process.env.GROWTH_STALL_TTL_SECONDS ?? 900),
    tenantAutoApplyEnabled:
      process.env.GROWTH_TENANT_AUTO_APPLY_ENABLED === "1",
    smokePass: process.env.GROWTH_SMOKE_PASS === "1",
    policyVersion:
      process.env.GROWTH_POLICY_VERSION ?? "growth-runtime-score-8-5-v1",
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
    else if (arg === "--executorMode") args.executorMode = argv[++i] ?? "";
    else if (arg === "--codexBin") args.codexBin = argv[++i] ?? args.codexBin;
    else if (arg === "--codexModel")
      args.codexModel = argv[++i] ?? args.codexModel;
    else if (arg === "--codexSandboxMode")
      args.codexSandboxMode = argv[++i] ?? args.codexSandboxMode;
    else if (arg === "--codexDisableMcp") args.codexDisableMcp = true;
    else if (arg === "--codexEnableMcp") args.codexDisableMcp = false;
    else if (arg === "--codexTimeoutMs")
      args.codexTimeoutMs = Number(argv[++i]);
    else if (arg === "--codexDryRun") args.codexDryRun = true;
    else if (arg === "--stallTtlSeconds")
      args.stallTtlSeconds = Number(argv[++i]);
    else if (arg === "--tenantAutoApplyEnabled")
      args.tenantAutoApplyEnabled = true;
    else if (arg === "--smokePass") args.smokePass = true;
    else if (arg === "--policyVersion")
      args.policyVersion = argv[++i] ?? args.policyVersion;
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

async function loadWorkflowText(workflow) {
  if (!workflow?.loaded || !workflow.path) return "";
  try {
    return await fs.readFile(workflow.path, "utf8");
  } catch {
    return "";
  }
}

function resolveLlmTransport(agentDefinition) {
  const requestedModel =
    process.env.GROWTH_CODEX_MODEL ??
    agentDefinition?.model ??
    process.env.OPENAI_DEFAULT_MODEL ??
    process.env.OPENROUTER_MODEL ??
    null;

  if ((process.env.GROWTH_EXECUTOR_MODE ?? "codex") === "codex") {
    return {
      provider: "codex_cli_chatgpt",
      ready: true,
      base_url: null,
      model: process.env.GROWTH_CODEX_MODEL || null,
      registry_model: agentDefinition?.model ?? null,
      warning:
        "Codex CLI uses the mounted ChatGPT subscription session. Runtime defaults to gpt-5.2 because this CLI build rejects newer registry model names unless upgraded.",
    };
  }

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

async function detectTable(supabase, table) {
  const { error } = await supabase.from(table).select("*").limit(1);
  return !error;
}

async function bestEffortInsert(supabase, table, row) {
  const exists = await detectTable(supabase, table);
  if (!exists) return { skipped: true, reason: "table_unavailable" };
  const { error } = await supabase.from(table).insert(row);
  if (error) return { skipped: false, error: error.message };
  return { skipped: false, inserted: true };
}

async function bestEffortUpsert(supabase, table, row, options) {
  const exists = await detectTable(supabase, table);
  if (!exists) return { skipped: true, reason: "table_unavailable" };
  const { error } = await supabase.from(table).upsert(row, options);
  if (error) return { skipped: false, error: error.message };
  return { skipped: false, upserted: true };
}

function stableKey(...parts) {
  return createHash("sha256")
    .update(parts.map((part) => String(part ?? "")).join("\n"))
    .digest("hex")
    .slice(0, 20);
}

function normalizeKeySegment(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

async function loadLaneAgreement(opts, lane) {
  const dir = path.join(process.cwd(), "evidence", "growth");
  let entries = [];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return null;
  }
  const files = entries
    .filter(
      (file) => file.startsWith("agreement-lane-") && file.endsWith(".json"),
    )
    .sort()
    .reverse();
  for (const file of files) {
    try {
      const raw = await fs.readFile(path.join(dir, file), "utf8");
      const parsed = JSON.parse(raw);
      const row = Array.isArray(parsed?.lanes)
        ? parsed.lanes.find(
            (item) =>
              item?.lane === lane &&
              (!item?.account_id || item.account_id === opts.accountId) &&
              (!item?.website_id || item.website_id === opts.websiteId),
          )
        : null;
      if (row) return row;
    } catch {
      continue;
    }
  }
  return null;
}

async function detectStalledRuns(supabase, opts) {
  if (!Number.isFinite(opts.stallTtlSeconds) || opts.stallTtlSeconds <= 0) {
    return { stalled: 0, run_ids: [] };
  }

  const cutoff = new Date(
    Date.now() - opts.stallTtlSeconds * 1000,
  ).toISOString();
  const { data, error } = await supabase
    .from("growth_agent_runs")
    .select("*")
    .eq("account_id", opts.accountId)
    .eq("website_id", opts.websiteId)
    .in("status", ["claimed", "running"])
    .lt("heartbeat_at", cutoff);

  if (error) {
    log("warn", "stall detection skipped", { error: error.message });
    return { stalled: 0, run_ids: [] };
  }

  const stalled = [];
  for (const run of data ?? []) {
    const finishedAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("growth_agent_runs")
      .update({
        status: "stalled",
        finished_at: finishedAt,
        error_class: "heartbeat_stalled",
        error_message: `No heartbeat for ${opts.stallTtlSeconds}s.`,
      })
      .eq("account_id", opts.accountId)
      .eq("website_id", opts.websiteId)
      .eq("run_id", run.run_id)
      .in("status", ["claimed", "running"]);
    if (updateError) {
      log("warn", "stalled run update failed", {
        run_id: run.run_id,
        error: updateError.message,
      });
      continue;
    }
    await writeRunEvent(supabase, run, "stalled", {
      severity: "warn",
      message: `No heartbeat for ${opts.stallTtlSeconds}s; marked stalled.`,
      payload: {
        ttl_seconds: opts.stallTtlSeconds,
        last_heartbeat_at: run.heartbeat_at,
      },
    });
    stalled.push(run.run_id);
  }
  return { stalled: stalled.length, run_ids: stalled };
}

async function fetchSourceRow(supabase, run) {
  if (!run.source_table || !run.source_id) return null;
  const { data, error } = await supabase
    .from(run.source_table)
    .select("*")
    .eq("id", run.source_id)
    .limit(1)
    .maybeSingle();
  if (error) {
    return {
      id: run.source_id,
      source_lookup_error: error.message,
    };
  }
  return data ?? { id: run.source_id, source_lookup_error: "not_found" };
}

function summarizeContextPack(contextPack) {
  if (!contextPack) return null;
  return {
    id: contextPack.id,
    pack_id: contextPack.pack_id,
    version: contextPack.version,
    locale: contextPack.locale,
    market: contextPack.market,
    tone: contextPack.tone,
    markets: contextPack.markets,
    content_rules_count: Array.isArray(contextPack.content_rules)
      ? contextPack.content_rules.length
      : 0,
    learned_decisions_keys: Object.keys(
      safeObject(contextPack.learned_decisions),
    ),
  };
}

function buildAgentSummary(agentDefinition) {
  if (!agentDefinition) return null;
  return {
    agent_id: agentDefinition.agent_id,
    name: agentDefinition.name,
    lane: agentDefinition.lane,
    mode: agentDefinition.mode,
    model: agentDefinition.model,
    prompt_version: agentDefinition.prompt_version,
    workflow_version: agentDefinition.workflow_version,
    agreement_threshold: agentDefinition.agreement_threshold,
  };
}

function sourceRef(run) {
  return `${run.source_table}:${run.source_id}`;
}

function statusForDecision(decision) {
  if (decision === "promote") return "pass";
  if (decision === "block") return "blocked";
  if (decision === "reject") return "rejected";
  return "watch";
}

function aiReviewForeignKeys(run) {
  return {
    backlog_item_id:
      run.source_table === "growth_backlog_items" ? run.source_id : null,
    candidate_id:
      run.source_table === "growth_backlog_candidates" ? run.source_id : null,
    task_id: run.source_table === "growth_content_tasks" ? run.source_id : null,
    brief_id:
      run.source_table === "growth_content_briefs" ? run.source_id : null,
  };
}

async function updateRun(supabase, runId, patch) {
  const { error } = await supabase
    .from("growth_agent_runs")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("run_id", runId);
  if (error) throw new Error(`updateRun(${runId}) failed: ${error.message}`);
}

async function claimSeededRun(supabase, opts, lane, claimId, workspacePath) {
  const { data, error } = await supabase
    .from("growth_agent_runs")
    .select("*")
    .eq("account_id", opts.accountId)
    .eq("website_id", opts.websiteId)
    .eq("lane", lane)
    .eq("status", "claimed")
    .eq("attempts", 0)
    .is("started_at", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`claimSeededRun(${lane}) failed: ${error.message}`);
  }
  if (!data?.run_id) return null;

  await updateRun(supabase, data.run_id, {
    claim_id: claimId,
    workspace_path: workspacePath,
    heartbeat_at: new Date().toISOString(),
    evidence: {
      ...safeObject(data.evidence),
      claim_source: "preseeded_growth_agent_run",
    },
  });

  const run = {
    ...data,
    claim_id: claimId,
    workspace_path: workspacePath,
    evidence: {
      ...safeObject(data.evidence),
      claim_source: "preseeded_growth_agent_run",
    },
  };

  await writeRunEvent(supabase, run, "claimed", {
    message: `Claimed preseeded growth_agent_runs row for lane=${lane}`,
    payload: {
      claim_id: claimId,
      workspace_path: workspacePath,
      source_table: run.source_table,
      source_id: run.source_id,
    },
  });

  return run;
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

async function createCodexArtifact(supabase, opts, run, runtimeContext) {
  const dir = path.join(
    opts.artifactsRoot,
    run.account_id,
    run.website_id,
    run.run_id,
  );
  await fs.mkdir(dir, { recursive: true });

  const workflowText = await loadWorkflowText(runtimeContext.workflow);
  const sourceRow = await fetchSourceRow(supabase, run);
  const agent = buildAgentSummary(runtimeContext.agentDefinition);
  const contextPackSummary = summarizeContextPack(runtimeContext.contextPack);
  const input = {
    tenant: {
      account_id: run.account_id,
      website_id: run.website_id,
      locale: run.locale,
      market: run.market,
    },
    run: {
      run_id: run.run_id,
      lane: run.lane,
      source_table: run.source_table,
      source_id: run.source_id,
      source_ref: sourceRef(run),
      status: run.status,
      attempts: run.attempts,
    },
    agent,
    workflow: runtimeContext.workflow,
    workflow_text: workflowText,
    context_pack: runtimeContext.contextPack,
    context_pack_summary: contextPackSummary,
    source_row: sourceRow,
  };

  const inputPath = path.join(dir, "codex-runtime-input.json");
  await fs.writeFile(inputPath, `${JSON.stringify(input, null, 2)}\n`);

  await writeRunEvent(supabase, run, "tool_called", {
    message: "Codex executor adapter starting.",
    payload: {
      tool: "codex_exec",
      action_class: "runtime_execution",
      policy_verdict: "allowed_prepare_only",
      allowed: true,
      input_path: inputPath,
      dry_run: opts.codexDryRun,
      model: opts.codexModel || null,
      sandbox: opts.codexSandboxMode,
      mcp_servers_disabled: opts.codexDisableMcp,
    },
  });

  const result = await runCodexAgentTask(input, {
    outDir: dir,
    repoRoot: process.cwd(),
    codexBin: opts.codexBin,
    model: opts.codexModel || null,
    sandboxMode: opts.codexSandboxMode,
    timeoutMs: opts.codexTimeoutMs,
    disableMcp: opts.codexDisableMcp,
    dryRun: opts.codexDryRun,
  });

  const output = result.output;
  const laneAgreement = await loadLaneAgreement(opts, run.lane);
  output.tool_calls = output.tool_calls.map((toolCall) =>
    evaluateToolPolicy(toolCall, {
      laneAgreement,
      policyVersion: opts.policyVersion,
      tenantAutoApplyEnabled: opts.tenantAutoApplyEnabled,
      smokePass: opts.smokePass,
    }),
  );
  result.artifact.tool_calls = output.tool_calls;
  result.artifact.replay_seed = buildReplaySeed(run, output);
  const evidence = {
    runtime: "vps",
    runtime_mode: "codex_exec",
    handoff: "human_review_required",
    artifact_path: result.artifactPath,
    agent_id: runtimeContext.agentDefinition?.agent_id ?? null,
    model: opts.codexModel || null,
    registry_model: runtimeContext.agentDefinition?.model ?? null,
    prompt_version: runtimeContext.agentDefinition?.prompt_version ?? null,
    workflow_version: runtimeContext.agentDefinition?.workflow_version ?? null,
    workflow_loaded: runtimeContext.workflow.loaded,
    workflow_path: runtimeContext.workflow.path,
    context_pack_version: runtimeContext.contextPack?.version ?? null,
    executor: {
      tool: "codex_exec",
      dry_run: opts.codexDryRun,
      artifact_complete: result.metrics.artifact_complete,
      exit_code: result.metrics.exit_code,
      parse_error: result.metrics.parse_error,
      usage: result.metrics.usage ?? null,
      usage_note: result.metrics.usage
        ? "usage_available"
        : "usage_unavailable_from_current_codex_cli",
    },
    decision: output.decision,
    allowed_action: output.allowed_action,
    confidence: output.confidence,
    source_refs: output.source_refs,
    evidence_summary: output.evidence_summary,
    risks: output.risks,
    next_action: output.next_action,
    memory_candidates_count: output.memory_candidates.length,
    skill_update_candidates_count: output.skill_update_candidates.length,
    change_sets_count: output.change_sets.length,
    tool_calls_count: output.tool_calls.length,
    replay_seed_eligible: output.replay_seed.eligible,
    requires_human_review: true,
    completed_at: new Date().toISOString(),
  };

  const storageResults = {
    ai_review: await bestEffortUpsert(
      supabase,
      "growth_ai_reviews",
      {
        account_id: run.account_id,
        website_id: run.website_id,
        ...aiReviewForeignKeys(run),
        review_key: `codex-runtime-score-8-5:${run.run_id}`,
        model: opts.codexModel || "codex-cli-default",
        prompt_version:
          runtimeContext.agentDefinition?.prompt_version ??
          "runtime-maturity-score-8.5",
        config_version: "growth-runtime-score-8-5-codex-v1",
        confidence_score: output.confidence,
        recommendation: output.decision,
        risks: output.risks,
        status: statusForDecision(output.decision),
        evidence,
      },
      { onConflict: "website_id,review_key" },
    ),
    metrics: await bestEffortInsert(supabase, "growth_agent_run_metrics", {
      account_id: run.account_id,
      website_id: run.website_id,
      run_id: run.run_id,
      lane: run.lane,
      duration_ms: result.metrics.duration_ms,
      codex_duration_ms: result.metrics.codex_duration_ms,
      exit_code: result.metrics.exit_code,
      retries: run.attempts ?? 0,
      artifact_complete: result.metrics.artifact_complete,
      cost_usd: result.metrics.cost_usd ?? null,
      tokens_input: result.metrics.tokens_input ?? null,
      tokens_output: result.metrics.tokens_output ?? null,
      error_class: result.metrics.parse_error
        ? "artifact_parse_error"
        : result.metrics.exit_code === 0
          ? null
          : "codex_exec_failed",
      evidence: {
        ...result.metrics,
        usage_note: result.metrics.usage
          ? "usage_available"
          : "usage_unavailable_from_current_codex_cli",
      },
      created_at: new Date().toISOString(),
    }),
    replay_case: output.replay_seed.eligible
      ? await bestEffortInsert(supabase, "growth_agent_replay_cases", {
          account_id: run.account_id,
          website_id: run.website_id,
          lane: run.lane,
          source_table: run.source_table,
          source_id: run.source_id,
          run_id: run.run_id,
          expected_decision: output.replay_seed.expected_decision,
          expected_allowed_action: output.allowed_action,
          rationale: output.replay_seed.rationale,
          status: "candidate",
          evidence: result.artifact.replay_seed,
          created_at: new Date().toISOString(),
        })
      : { skipped: true, reason: "replay_seed_not_eligible" },
  };

  const memoryResults = [];
  for (const candidate of output.memory_candidates) {
    const memoryKey = `${candidate.lane}:${stableKey(
      run.website_id,
      candidate.lane,
      candidate.memory,
    )}`;
    memoryResults.push(
      await bestEffortUpsert(
        supabase,
        "growth_agent_memories",
        {
          account_id: run.account_id,
          website_id: run.website_id,
          lane: candidate.lane,
          memory_key: memoryKey,
          status: "draft",
          content: memoryContent(candidate),
          evidence: {
            source: "codex_runtime_artifact",
            run_id: run.run_id,
            reason: candidate.reason,
          },
          source_run_id: run.run_id,
          proposed_by: "codex_runtime",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "account_id,website_id,lane,memory_key" },
      ),
    );
  }
  storageResults.memories = memoryResults;

  const skillResults = [];
  for (const candidate of output.skill_update_candidates) {
    const skillSlug = normalizeKeySegment(candidate.skill_name) || "skill";
    const skillKey = `${candidate.lane}:${skillSlug}:${stableKey(
      run.website_id,
      candidate.lane,
      candidate.skill_name,
      candidate.change,
    )}`;
    skillResults.push(
      await bestEffortUpsert(
        supabase,
        "growth_agent_skills",
        {
          account_id: run.account_id,
          website_id: run.website_id,
          lane: candidate.lane,
          skill_key: skillKey,
          version: 1,
          status: "draft",
          title: candidate.skill_name,
          instructions: skillInstructions(candidate),
          evidence: {
            source: "codex_runtime_artifact",
            run_id: run.run_id,
            reason: candidate.reason,
          },
          source_run_id: run.run_id,
          proposed_by: "codex_runtime",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "account_id,website_id,lane,skill_key,version" },
      ),
    );
  }
  storageResults.skills = skillResults;

  const changeSetResults = [];
  for (const changeSet of output.change_sets) {
    const dedupeKey = stableKey(
      run.account_id,
      run.website_id,
      run.run_id,
      changeSet.change_type,
      JSON.stringify(changeSet.evidence?.source_refs ?? []),
      JSON.stringify(changeSet.after_snapshot ?? {}),
      changeSet.title,
    );
    changeSetResults.push(
      await bestEffortUpsert(
        supabase,
        "growth_agent_change_sets",
        {
          account_id: run.account_id,
          website_id: run.website_id,
          locale: run.locale ?? opts.locale,
          market: run.market ?? opts.market,
          run_id: run.run_id,
          source_table: run.source_table ?? null,
          source_id: run.source_id ?? null,
          agent_lane: run.lane,
          change_type: changeSet.change_type,
          status: changeSet.status,
          title: changeSet.title,
          summary: changeSet.summary,
          dedupe_key: dedupeKey,
          before_snapshot: changeSet.before_snapshot ?? {},
          after_snapshot: changeSet.after_snapshot ?? {},
          preview_payload: {
            ...(changeSet.preview_payload ?? {}),
            follow_up_tasks: changeSet.follow_up_tasks ?? [],
          },
          evidence: {
            ...(changeSet.evidence ?? {}),
            source: "codex_runtime_artifact",
            run_id: run.run_id,
            forced_human_review: true,
          },
          risk_level: changeSet.risk_level,
          requires_human_review: true,
          required_approval_role: changeSet.required_approval_role,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "account_id,website_id,run_id,change_type,dedupe_key",
        },
      ),
    );
  }
  storageResults.change_sets = changeSetResults;

  let toolCallIndex = 0;
  const toolLedgerResults = [];
  for (const toolCall of output.tool_calls) {
    toolCallIndex += 1;
    await writeRunEvent(supabase, run, "tool_called", {
      severity: toolCall.allowed ? "info" : "warn",
      message: `Tool policy ${toolCall.policy_verdict}: ${toolCall.tool}`,
      payload: toolCall,
    });
    toolLedgerResults.push(
      await bestEffortInsert(supabase, "growth_agent_tool_calls", {
        account_id: run.account_id,
        website_id: run.website_id,
        run_id: run.run_id,
        lane: run.lane,
        call_key: `${run.run_id}:${toolCallIndex}`,
        tool: toolCall.tool,
        action_class: toolCall.action_class,
        policy_verdict: toolCall.policy_verdict,
        allowed: toolCall.allowed,
        reason: toolCall.reason,
        cost_usd: null,
        result_status: toolCall.allowed ? "recorded" : "blocked",
        evidence: {
          ...toolCall,
          gate_reason: toolCall.gate_reason ?? null,
          required_approval: toolCall.required_approval ?? null,
          policy_version: toolCall.policy_version ?? opts.policyVersion,
          lane_agreement: toolCall.lane_agreement ?? laneAgreement,
          smoke_pass: Boolean(toolCall.smoke_pass),
        },
        created_at: new Date().toISOString(),
      }),
    );
  }
  storageResults.tool_calls = toolLedgerResults;

  return {
    artifactPath: result.artifactPath,
    evidence: {
      ...evidence,
      storage_results: storageResults,
    },
    output,
  };
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
  let run = Array.isArray(data) ? data[0] : data;
  if (!run?.run_id) {
    run = await claimSeededRun(supabase, opts, lane, claimId, workspacePath);
    if (!run?.run_id) {
      log("info", "no eligible row", { lane });
      return { claimed: false };
    }
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

  await writeRunEvent(supabase, run, "heartbeat", {
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

  const codexResult =
    opts.executorMode === "codex"
      ? await createCodexArtifact(supabase, opts, run, runtimeContext)
      : null;
  const artifactPath =
    codexResult?.artifactPath ??
    (await createArtifact(opts.artifactsRoot, run, runtimeContext));
  const finalArtifactPath = codexResult?.artifactPath ?? artifactPath;
  const finalEvidence = codexResult?.evidence ?? {
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
  };
  await updateRun(supabase, run.run_id, {
    status: "review_required",
    heartbeat_at: new Date().toISOString(),
    finished_at: new Date().toISOString(),
    artifact_path: finalArtifactPath,
    evidence: {
      ...safeObject(run.evidence),
      ...finalEvidence,
    },
  });
  await writeRunEvent(supabase, run, "artifact_written", {
    message:
      opts.executorMode === "codex"
        ? "Codex runtime artifact written."
        : "Observe-only handoff artifact written.",
    payload: {
      artifact_path: finalArtifactPath,
      executor_mode: opts.executorMode,
    },
  });
  await writeRunEvent(supabase, run, "review_required", {
    severity: "warn",
    message: "Human review required before business mutation.",
    payload: { required_role: "curator", runtime_mode: "observe_only" },
  });

  return { claimed: true, run_id: run.run_id };
}

async function tick(supabase, opts) {
  const stalled = await detectStalledRuns(supabase, opts);
  if (stalled.stalled > 0) {
    log("warn", "stalled runs detected", stalled);
  }
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
