#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const DECISIONS = new Set([
  "promote",
  "watch",
  "block",
  "reject",
  "review_required",
]);
const ALLOWED_ACTIONS = new Set([
  "auto_apply",
  "prepare_for_human",
  "watch",
  "block",
  "reject",
]);
const ALWAYS_GATED_ACTION_CLASSES = new Set([
  "content_publish",
  "transcreation_merge",
  "paid_mutation",
  "experiment_activation",
]);

export const CODEX_ARTIFACT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "decision",
    "allowed_action",
    "confidence",
    "source_refs",
    "evidence_summary",
    "risks",
    "next_action",
    "memory_candidates",
    "skill_update_candidates",
    "tool_calls",
    "replay_seed",
    "requires_human_review",
  ],
  properties: {
    decision: {
      type: "string",
      enum: [...DECISIONS],
    },
    allowed_action: {
      type: "string",
      enum: [...ALLOWED_ACTIONS],
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1,
    },
    source_refs: {
      type: "array",
      items: { type: "string" },
    },
    evidence_summary: {
      type: "string",
    },
    risks: {
      type: "array",
      items: { type: "string" },
    },
    next_action: {
      type: "string",
    },
    memory_candidates: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["lane", "memory", "reason", "confidence"],
        properties: {
          lane: { type: "string" },
          memory: { type: "string" },
          reason: { type: "string" },
          confidence: { type: "number", minimum: 0, maximum: 1 },
        },
      },
    },
    skill_update_candidates: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["lane", "skill_name", "change", "reason"],
        properties: {
          lane: { type: "string" },
          skill_name: { type: "string" },
          change: { type: "string" },
          reason: { type: "string" },
        },
      },
    },
    tool_calls: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "tool",
          "action_class",
          "policy_verdict",
          "allowed",
          "reason",
        ],
        properties: {
          tool: { type: "string" },
          action_class: { type: "string" },
          policy_verdict: { type: "string" },
          allowed: { type: "boolean" },
          reason: { type: "string" },
        },
      },
    },
    replay_seed: {
      type: "object",
      additionalProperties: false,
      required: ["eligible", "expected_decision", "rationale"],
      properties: {
        eligible: { type: "boolean" },
        expected_decision: { type: "string" },
        rationale: { type: "string" },
      },
    },
    requires_human_review: {
      type: "boolean",
    },
  },
};

function parseArgs(argv) {
  const args = {
    dryRun: false,
    codexBin: process.env.CODEX_BIN ?? "codex",
    model: process.env.GROWTH_CODEX_MODEL ?? "",
    timeoutMs: Number(process.env.GROWTH_CODEX_TIMEOUT_MS ?? 900_000),
    repoRoot: process.cwd(),
    outDir: "",
    input: "",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dryRun") args.dryRun = true;
    else if (arg === "--codexBin") args.codexBin = argv[++i] ?? args.codexBin;
    else if (arg === "--model") args.model = argv[++i] ?? args.model;
    else if (arg === "--timeoutMs") args.timeoutMs = Number(argv[++i]);
    else if (arg === "--repoRoot") args.repoRoot = argv[++i] ?? args.repoRoot;
    else if (arg === "--outDir") args.outDir = argv[++i] ?? args.outDir;
    else if (arg === "--input") args.input = argv[++i] ?? args.input;
  }
  return args;
}

function nowIso() {
  return new Date().toISOString();
}

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function clampConfidence(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(1, number));
}

function compactString(value, maxLength = 6000) {
  if (value == null) return null;
  const text = String(value);
  return text.length > maxLength
    ? `${text.slice(0, maxLength)}...[truncated]`
    : text;
}

function sanitizeSourceRow(row) {
  const source = safeObject(row);
  const evidence = safeObject(source.evidence);
  return {
    id: source.id ?? null,
    title: source.title ?? source.name ?? null,
    status: source.status ?? null,
    work_type: source.work_type ?? source.task_type ?? null,
    entity_key: source.entity_key ?? source.item_key ?? source.slug ?? null,
    locale: source.locale ?? source.target_locale ?? null,
    market: source.market ?? null,
    priority_score: source.priority_score ?? null,
    confidence_score: source.confidence_score ?? null,
    baseline: compactString(source.baseline, 1200),
    hypothesis: compactString(source.hypothesis, 1200),
    next_action: compactString(source.next_action, 1200),
    source_profiles: source.source_profiles ?? evidence.source_profiles ?? [],
    source_fact_refs:
      source.source_fact_refs ?? evidence.source_fact_refs ?? [],
    evidence_summary: summarizeEvidence(evidence),
  };
}

function summarizeEvidence(evidence) {
  const keys = Object.keys(evidence).sort().slice(0, 25);
  const summary = {};
  for (const key of keys) {
    const value = evidence[key];
    if (value == null) summary[key] = null;
    else if (Array.isArray(value))
      summary[key] = { type: "array", count: value.length };
    else if (typeof value === "object")
      summary[key] = { type: "object", keys: Object.keys(value).slice(0, 12) };
    else summary[key] = compactString(value, 600);
  }
  return summary;
}

function buildPrompt(input) {
  const sourceRow = sanitizeSourceRow(input.source_row);
  return `You are executing one Bukeer Growth OS lane run.

Return only the JSON object required by the provided output schema.

Hard policy:
- Do not publish content.
- Do not merge transcreation.
- Do not mutate paid media.
- Do not activate experiments.
- Do not write memories or skills as active state.
- Every v1 run requires human review, even if the recommendation is strong.
- Use source facts and workflow only. If evidence is weak, choose watch, block, reject or review_required.

Hermes-inspired learning loop:
- Propose memory_candidates only for durable, reusable lane learnings.
- Propose skill_update_candidates only for repeated workflow improvements.
- Include a tool_calls policy ledger for tools you used or wanted to use. Always include codex_exec.
- Include replay_seed so this run can become an eval case.

Tenant scope:
${JSON.stringify(input.tenant, null, 2)}

Run:
${JSON.stringify(input.run, null, 2)}

Agent definition:
${JSON.stringify(input.agent, null, 2)}

Workflow:
${input.workflow_text || "Workflow file unavailable. Fail closed into review_required."}

Context pack:
${JSON.stringify(input.context_pack, null, 2)}

Source row summary:
${JSON.stringify(sourceRow, null, 2)}
`;
}

function normalizeArtifact(candidate, fallback = {}) {
  const value = safeObject(candidate);
  const normalized = {
    decision: DECISIONS.has(value.decision)
      ? value.decision
      : "review_required",
    allowed_action: ALLOWED_ACTIONS.has(value.allowed_action)
      ? value.allowed_action
      : "prepare_for_human",
    confidence: clampConfidence(value.confidence),
    source_refs: normalizeStringArray(value.source_refs).length
      ? normalizeStringArray(value.source_refs)
      : normalizeStringArray(fallback.source_refs),
    evidence_summary:
      typeof value.evidence_summary === "string"
        ? value.evidence_summary
        : (fallback.evidence_summary ??
          "Codex did not return a usable evidence summary."),
    risks: normalizeStringArray(value.risks),
    next_action:
      typeof value.next_action === "string"
        ? value.next_action
        : "Curator must inspect the artifact before any business mutation.",
    memory_candidates: normalizeMemoryCandidates(value.memory_candidates),
    skill_update_candidates: normalizeSkillCandidates(
      value.skill_update_candidates,
    ),
    tool_calls: normalizeToolCalls(value.tool_calls),
    replay_seed: normalizeReplaySeed(value.replay_seed),
    requires_human_review: true,
  };

  if (normalized.allowed_action === "auto_apply") {
    normalized.allowed_action = "prepare_for_human";
    normalized.risks.push(
      "auto_apply_requested_but_runtime_8_5_v1_forces_human_review",
    );
  }
  normalized.decision =
    normalized.decision === "promote" ? "review_required" : normalized.decision;
  normalized.tool_calls = withCodexExecToolCall(normalized.tool_calls);
  return normalized;
}

function normalizeStringArray(value) {
  return Array.isArray(value)
    ? value
        .map((item) => String(item ?? "").trim())
        .filter(Boolean)
        .slice(0, 50)
    : [];
}

function normalizeMemoryCandidates(value) {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, 10)
    .map((item) => {
      const object = safeObject(item);
      return {
        lane: String(object.lane ?? "").trim(),
        memory: String(object.memory ?? "").trim(),
        reason: String(object.reason ?? "").trim(),
        confidence: clampConfidence(object.confidence),
      };
    })
    .filter((item) => item.lane && item.memory && item.reason);
}

function normalizeSkillCandidates(value) {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, 10)
    .map((item) => {
      const object = safeObject(item);
      return {
        lane: String(object.lane ?? "").trim(),
        skill_name: String(object.skill_name ?? "").trim(),
        change: String(object.change ?? "").trim(),
        reason: String(object.reason ?? "").trim(),
      };
    })
    .filter((item) => item.lane && item.skill_name && item.change);
}

function normalizeToolCalls(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 100).map((item) => {
    const object = safeObject(item);
    const actionClass = String(object.action_class ?? "runtime_execution");
    const alwaysGated = ALWAYS_GATED_ACTION_CLASSES.has(actionClass);
    return {
      tool: String(object.tool ?? "unknown").trim() || "unknown",
      action_class: actionClass,
      policy_verdict: alwaysGated
        ? "blocked_always_gated"
        : String(object.policy_verdict ?? "allowed_prepare_only"),
      allowed: alwaysGated ? false : Boolean(object.allowed),
      reason:
        String(object.reason ?? "").trim() ||
        "Runtime v1 records tool intent for human review.",
    };
  });
}

function withCodexExecToolCall(toolCalls) {
  if (toolCalls.some((call) => call.tool === "codex_exec")) return toolCalls;
  return [
    {
      tool: "codex_exec",
      action_class: "runtime_execution",
      policy_verdict: "allowed_prepare_only",
      allowed: true,
      reason:
        "Executor may analyze source facts and produce a structured artifact; business mutation remains blocked.",
    },
    ...toolCalls,
  ];
}

function normalizeReplaySeed(value) {
  const object = safeObject(value);
  return {
    eligible: Boolean(object.eligible),
    expected_decision: String(object.expected_decision ?? "review_required"),
    rationale:
      String(object.rationale ?? "").trim() ||
      "Replay case candidate requires Curator approval before becoming an eval baseline.",
  };
}

function extractJson(text) {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) return JSON.parse(fenced[1].trim());
    const first = trimmed.indexOf("{");
    const last = trimmed.lastIndexOf("}");
    if (first >= 0 && last > first)
      return JSON.parse(trimmed.slice(first, last + 1));
    throw new Error("No JSON object found in Codex output.");
  }
}

async function runProcess(command, args, opts) {
  return await new Promise((resolve) => {
    const startedAt = Date.now();
    const child = spawn(command, args, {
      cwd: opts.cwd,
      env: opts.env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 5_000).unref();
    }, opts.timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({
        exitCode: 1,
        stdout,
        stderr: stderr || error.message,
        durationMs: Date.now() - startedAt,
        timedOut,
      });
    });
    child.on("close", (exitCode) => {
      clearTimeout(timer);
      resolve({
        exitCode: exitCode ?? 1,
        stdout,
        stderr,
        durationMs: Date.now() - startedAt,
        timedOut,
      });
    });
    child.stdin.end(opts.input);
  });
}

function parseCodexJsonl(stdout) {
  const events = [];
  for (const line of String(stdout ?? "").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{")) continue;
    try {
      events.push(JSON.parse(trimmed));
    } catch {
      // Ignore non-event output. The final artifact is read from output file.
    }
  }
  return events;
}

function summarizeCodexEvents(events) {
  const toolCalls = [];
  for (const event of events) {
    const text = JSON.stringify(event).toLowerCase();
    if (
      !text.includes("tool") &&
      !text.includes("exec") &&
      !text.includes("command")
    ) {
      continue;
    }
    const tool =
      event.tool_name ??
      event.tool ??
      event.name ??
      event.item?.tool_name ??
      event.item?.name ??
      event.type ??
      "codex_event";
    toolCalls.push({
      tool: String(tool),
      action_class: "runtime_execution",
      policy_verdict: "observed_from_codex_jsonl",
      allowed: true,
      reason: "Observed in codex exec JSONL event stream.",
    });
  }
  return toolCalls.slice(0, 50);
}

export async function runCodexAgentTask(input, options = {}) {
  const startedAt = Date.now();
  const outDir = options.outDir;
  if (!outDir) throw new Error("runCodexAgentTask requires outDir");
  await fs.mkdir(outDir, { recursive: true });

  const schemaPath = path.join(outDir, "codex-output.schema.json");
  const promptPath = path.join(outDir, "prompt.md");
  const lastMessagePath = path.join(outDir, "codex-last-message.json");
  const eventsPath = path.join(outDir, "codex-events.jsonl");
  const artifactPath = path.join(outDir, "codex-runtime-artifact.json");
  const prompt = buildPrompt(input);

  await fs.writeFile(
    schemaPath,
    `${JSON.stringify(CODEX_ARTIFACT_SCHEMA, null, 2)}\n`,
  );
  await fs.writeFile(promptPath, prompt);

  const execution = options.dryRun
    ? {
        exitCode: 0,
        stdout: "",
        stderr: "",
        durationMs: 0,
        timedOut: false,
        skipped: true,
      }
    : await runProcess(
        options.codexBin ?? "codex",
        [
          "exec",
          "--json",
          "--sandbox",
          "read-only",
          "--skip-git-repo-check",
          "--cd",
          options.repoRoot ?? process.cwd(),
          "--output-schema",
          schemaPath,
          "--output-last-message",
          lastMessagePath,
          ...(options.model ? ["--model", options.model] : []),
          "-",
        ],
        {
          cwd: options.repoRoot ?? process.cwd(),
          env: process.env,
          input: prompt,
          timeoutMs: options.timeoutMs ?? 900_000,
        },
      );

  if (execution.stdout) await fs.writeFile(eventsPath, execution.stdout);

  let parsed = null;
  let parseError = null;
  if (options.dryRun) {
    parsed = {
      decision: "review_required",
      allowed_action: "prepare_for_human",
      confidence: 0,
      source_refs: [input.run?.source_ref].filter(Boolean),
      evidence_summary:
        "Dry run validated the executor prompt, schema and artifact envelope without calling Codex.",
      risks: ["dry_run_no_model_judgment"],
      next_action: "Run without --dryRun on the VPS Codex executor.",
      memory_candidates: [],
      skill_update_candidates: [],
      tool_calls: [],
      replay_seed: {
        eligible: false,
        expected_decision: "review_required",
        rationale: "Dry run is not a replay baseline.",
      },
      requires_human_review: true,
    };
  } else {
    try {
      parsed = extractJson(await fs.readFile(lastMessagePath, "utf8"));
      if (!parsed) parseError = "empty_codex_output";
    } catch (error) {
      parseError = error instanceof Error ? error.message : String(error);
    }
  }

  const codexEvents = parseCodexJsonl(execution.stdout);
  const observedToolCalls = summarizeCodexEvents(codexEvents);
  const artifact = normalizeArtifact(parsed, {
    source_refs: [input.run?.source_ref].filter(Boolean),
    evidence_summary:
      parseError ??
      execution.stderr ??
      "Codex execution finished without a parseable artifact.",
  });
  artifact.tool_calls = withCodexExecToolCall([
    ...artifact.tool_calls,
    ...observedToolCalls,
  ]);

  const metrics = {
    duration_ms: Date.now() - startedAt,
    codex_duration_ms: execution.durationMs,
    exit_code: execution.exitCode,
    timed_out: execution.timedOut,
    dry_run: Boolean(options.dryRun),
    artifact_complete: Boolean(
      parsed && !parseError && execution.exitCode === 0,
    ),
    parse_error: parseError,
    stdout_sha256: createHash("sha256")
      .update(execution.stdout ?? "")
      .digest("hex"),
    stderr_tail: compactString(execution.stderr, 2000),
    jsonl_events: codexEvents.length,
  };

  const envelope = {
    generated_at: nowIso(),
    artifact_version: "growth-runtime-8.5-codex-v1",
    run_id: input.run?.run_id ?? null,
    lane: input.run?.lane ?? null,
    source_table: input.run?.source_table ?? null,
    source_id: input.run?.source_id ?? null,
    tenant: input.tenant,
    agent: input.agent,
    workflow: input.workflow,
    context_pack: input.context_pack_summary,
    executor: {
      name: "codex_exec",
      model: options.model || input.agent?.model || null,
      codex_bin: options.codexBin ?? "codex",
      prompt_path: promptPath,
      schema_path: schemaPath,
      events_path: execution.stdout ? eventsPath : null,
      output_path: lastMessagePath,
      policy: {
        sandbox: "read-only",
        forced_human_review: true,
        always_gated_action_classes: [...ALWAYS_GATED_ACTION_CLASSES],
      },
    },
    output: artifact,
    memory_candidates: artifact.memory_candidates,
    skill_update_candidates: artifact.skill_update_candidates,
    tool_calls: artifact.tool_calls,
    replay_seed: {
      ...artifact.replay_seed,
      source_table: input.run?.source_table ?? null,
      source_id: input.run?.source_id ?? null,
      lane: input.run?.lane ?? null,
      decision: artifact.decision,
      allowed_action: artifact.allowed_action,
    },
    metrics,
  };

  await fs.writeFile(artifactPath, `${JSON.stringify(envelope, null, 2)}\n`);
  return {
    artifactPath,
    artifact: envelope,
    output: artifact,
    metrics,
  };
}

export async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.outDir) throw new Error("--outDir is required");
  if (!Number.isFinite(args.timeoutMs) || args.timeoutMs < 1_000) {
    throw new Error("--timeoutMs must be >= 1000");
  }

  const input = args.input
    ? JSON.parse(await fs.readFile(args.input, "utf8"))
    : JSON.parse(
        await new Promise((resolve, reject) => {
          let data = "";
          process.stdin.setEncoding("utf8");
          process.stdin.on("data", (chunk) => {
            data += chunk;
          });
          process.stdin.on("end", () => resolve(data));
          process.stdin.on("error", reject);
        }),
      );

  const result = await runCodexAgentTask(input, args);
  console.log(
    JSON.stringify(
      {
        artifact_path: result.artifactPath,
        decision: result.output.decision,
        allowed_action: result.output.allowed_action,
        requires_human_review: result.output.requires_human_review,
        artifact_complete: result.metrics.artifact_complete,
      },
      null,
      2,
    ),
  );
}

const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === thisFile) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
