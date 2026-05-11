import { randomUUID, createHash } from "node:crypto";
import fs from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

const SUPPORTED_LANES = new Set([
  "content",
  "content_creator",
  "content_curator",
  "content_writer",
  "technical",
  "technical_remediation",
  "transcreation",
]);

const LANE_ALIAS = {
  content: "content_writer",
  content_creator: "content_writer",
  content_curator: "content_writer",
  content_writer: "content_writer",
  technical: "technical_remediation",
  technical_remediation: "technical_remediation",
  transcreation: "transcreation",
};

const ARTIFACT_TYPE_BY_LANE = {
  content_writer: "content_article",
  technical_remediation: "safe_apply_patch",
  transcreation: "transcreation_payload",
};

function parseArgs(argv) {
  const args = {
    requestPath: "",
    outputPath: "",
    mode: process.env.GROWTH_HERMES_MODE ?? "auto",
    hermesBin: process.env.HERMES_BIN ?? "hermes",
    hermesArgsTemplate: process.env.HERMES_ARGS_TEMPLATE ?? "",
    hermesTimeoutMs: Number(process.env.HERMES_TIMEOUT_MS ?? 180_000),
    profile: process.env.HERMES_PROFILE ?? "growth-os-colombiatours",
    workspaceRoot: process.env.GROWTH_WORKSPACE_ROOT ?? process.cwd(),
    requireHermes: process.env.GROWTH_HERMES_REQUIRE_REAL === "true",
    hermesProvider: process.env.HERMES_INFERENCE_PROVIDER ?? "openrouter",
    hermesModel:
      process.env.HERMES_INFERENCE_MODEL ??
      process.env.OPENROUTER_MODEL ??
      "openai/gpt-5.4-mini",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--request") args.requestPath = argv[++i] ?? "";
    else if (arg === "--output") args.outputPath = argv[++i] ?? "";
    else if (arg === "--mode") args.mode = argv[++i] ?? args.mode;
    else if (arg === "--hermes-bin") args.hermesBin = argv[++i] ?? args.hermesBin;
    else if (arg === "--hermes-args-template")
      args.hermesArgsTemplate = argv[++i] ?? args.hermesArgsTemplate;
    else if (arg === "--hermes-timeout-ms")
      args.hermesTimeoutMs = Number(argv[++i]);
    else if (arg === "--profile") args.profile = argv[++i] ?? args.profile;
    else if (arg === "--workspace-root")
      args.workspaceRoot = argv[++i] ?? args.workspaceRoot;
    else if (arg === "--require-hermes") args.requireHermes = true;
    else if (arg === "--hermes-provider")
      args.hermesProvider = argv[++i] ?? args.hermesProvider;
    else if (arg === "--hermes-model")
      args.hermesModel = argv[++i] ?? args.hermesModel;
  }

  return args;
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function readTaskRequest(requestPath) {
  const raw = requestPath
    ? await fs.readFile(requestPath, "utf8")
    : await readStdin();

  if (!raw.trim()) {
    throw new Error("Missing task request JSON. Pass --request <file> or pipe JSON on stdin.");
  }

  const request = JSON.parse(raw);
  validateTaskRequest(request);
  return request;
}

function validateTaskRequest(request) {
  const required = ["account_id", "website_id", "user_id"];
  for (const field of required) {
    if (!request[field] || typeof request[field] !== "string") {
      throw new Error(`Task request missing required string field: ${field}`);
    }
  }

  const lanes = Array.isArray(request.lanes) ? request.lanes : [];
  if (lanes.length === 0) {
    throw new Error("Task request must include at least one lane.");
  }

  for (const lane of lanes) {
    if (!SUPPORTED_LANES.has(lane)) {
      throw new Error(`Unsupported lane: ${lane}`);
    }
  }
}

async function commandExists(command) {
  if (command.includes("/") || command.startsWith(".")) {
    try {
      await fs.access(command, fsConstants.X_OK);
      return true;
    } catch {
      return false;
    }
  }

  const paths = (process.env.PATH ?? "").split(path.delimiter);
  for (const dir of paths) {
    const candidate = path.join(dir, command);
    try {
      await fs.access(candidate, fsConstants.X_OK);
      return true;
    } catch {
      // keep searching PATH
    }
  }
  return false;
}

function canonicalLanes(lanes) {
  return [...new Set(lanes.map((lane) => LANE_ALIAS[lane]))];
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function stableHash(value) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function buildLanePrompt(request, lane) {
  const objective =
    request.objective ??
    "Prepare Growth OS artifacts for live-gated review and execution.";
  const context = request.context ?? {};
  const constraints = [
    "Do not mutate public production surfaces.",
    "Produce artifacts only; Growth OS executor handles publish/apply/merge.",
    "Include evidence, rollback expectation, smoke expectation, success metric, and evaluation window.",
    "Hard-block paid, pricing, availability, reservations, payments, CRM bulk, and outreach.",
  ];

  return [
    `Role: ${lane}`,
    `Objective: ${objective}`,
    `Tenant account_id: ${request.account_id}`,
    `Website website_id: ${request.website_id}`,
    `Requested by user_id: ${request.user_id}`,
    `Context JSON: ${JSON.stringify(context)}`,
    "Constraints:",
    ...constraints.map((item) => `- ${item}`),
    "Return strict JSON for one Growth OS agent artifact.",
  ].join("\n");
}

function deterministicArtifact(request, lane, taskSessionId) {
  const artifactId = randomUUID();
  const now = new Date().toISOString();
  const type = ARTIFACT_TYPE_BY_LANE[lane];
  const targetSlug = request.context?.target_slug ?? "nosotros";
  const locale = request.locale ?? "es-CO";
  const baseEvidence = {
    source: "growth-hermes-deterministic-sidecar",
    request_id: request.request_id ?? null,
    task_session_id: taskSessionId,
    lane,
  };

  const common = {
    artifact_id: artifactId,
    task_session_id: taskSessionId,
    lane,
    artifact_type: type,
    status: "prepared",
    created_at: now,
    account_id: request.account_id,
    website_id: request.website_id,
    agent_instance_id: request.agent_instance_id ?? null,
    evidence: [baseEvidence],
    contract: {
      executor_boundary: "growth_os_live_gated_executor",
      requires_snapshot: true,
      requires_smoke: true,
      requires_rollback: true,
      requires_outcome: true,
      sensitive_actions_blocked: true,
    },
  };

  if (lane === "content_writer") {
    return {
      ...common,
      title:
        request.context?.content_title ??
        "Guia de viaje a Colombia basada en evidencia de Growth OS",
      slug:
        request.context?.content_slug ??
        `growth-os-${targetSlug}-${now.slice(0, 10)}`,
      locale,
      target: {
        table: "website_blog_posts",
        slug: request.context?.content_slug ?? null,
      },
      payload: {
        title:
          request.context?.content_title ??
          "Guia de viaje a Colombia basada en evidencia de Growth OS",
        body_outline: [
          "Introduccion basada en intencion organica",
          "Rutas recomendadas",
          "Consejos de planeacion",
          "CTA hacia asesor experto",
        ],
        ai_generated: true,
      },
      success_metric: "organic_clicks",
      evaluation_window: "seo_day_21_day_45",
      rollback_expectation: "unpublish_or_restore_previous_blog_post_snapshot",
      smoke_expectation: "public_route_returns_200_and_no_duplicate_slug",
    };
  }

  if (lane === "transcreation") {
    return {
      ...common,
      source_locale: request.context?.source_locale ?? "es-CO",
      target_locale: request.context?.target_locale ?? "en-US",
      target: {
        table: "website_pages",
        slug: targetSlug,
      },
      payload: {
        title:
          request.context?.transcreated_title ??
          "Colombia travel planning with local experts",
        glossary_context: request.context?.glossary_context ?? "ColombiaTours brand tone",
        quality_gate: {
          locale_mismatch: false,
          terminology_supported: true,
          human_review_required: false,
        },
      },
      success_metric: "localized_organic_clicks",
      evaluation_window: "seo_day_21_day_45",
      rollback_expectation: "restore_previous_locale_payload_snapshot",
      smoke_expectation: "localized_route_returns_200_and_expected_locale",
    };
  }

  return {
    ...common,
    target: {
      table: "website_pages",
      slug: targetSlug,
      field_allowlist: ["seo_title", "seo_description", "canonical_url"],
    },
    patch: {
      op: "replace",
      field: request.context?.technical_field ?? "seo_title",
      value:
        request.context?.technical_value ??
        "ColombiaTours - viajes a Colombia disenados por expertos locales",
    },
    success_metric: "technical_smoke_pass",
    evaluation_window: "technical_immediate_day_7_day_28",
    rollback_expectation: "restore_before_snapshot_field_value",
    smoke_expectation: "route_returns_200_metadata_present_no_console_error",
  };
}

async function runHermesCli({ args, request, lane, prompt, taskSessionId }) {
  const promptFile = path.join(
    process.cwd(),
    ".runtime",
    "growth-hermes",
    `${taskSessionId}-${lane}.prompt.md`,
  );
  await fs.mkdir(path.dirname(promptFile), { recursive: true });
  await fs.writeFile(promptFile, prompt, "utf8");

  const hermesArgs = args.hermesArgsTemplate
    ? args.hermesArgsTemplate
        .replaceAll("{profile}", args.profile)
        .replaceAll("{promptFile}", promptFile)
        .replaceAll("{lane}", lane)
        .replaceAll("{accountId}", request.account_id)
        .replaceAll("{websiteId}", request.website_id)
        .split(" ")
        .filter(Boolean)
    : [
        "--profile",
        args.profile,
        "-z",
        prompt,
        "--provider",
        args.hermesProvider,
        "--model",
        args.hermesModel,
      ];

  const startedAt = Date.now();
  const output = await spawnWithTimeout(args.hermesBin, hermesArgs, {
    timeoutMs: args.hermesTimeoutMs,
  });

  return {
    provider: "hermes_cli",
    lane,
    prompt_file: promptFile,
    command: [args.hermesBin, ...hermesArgs].join(" "),
    duration_ms: Date.now() - startedAt,
    exit_code: output.exitCode,
    stdout: output.stdout.slice(0, 20_000),
    stderr: output.stderr.slice(0, 20_000),
  };
}

function spawnWithTimeout(command, args, { timeoutMs }) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`Hermes CLI timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (exitCode) => {
      clearTimeout(timeout);
      resolve({ exitCode, stdout, stderr });
    });
  });
}

async function buildDelegation(request, args) {
  const lanes = canonicalLanes(request.lanes);
  const hermesAvailable = await commandExists(args.hermesBin);
  const mode =
    args.mode === "auto"
      ? hermesAvailable
        ? "hermes"
        : "deterministic"
      : args.mode;

  if (!["auto", "deterministic", "hermes"].includes(args.mode)) {
    throw new Error(`Unsupported mode: ${args.mode}`);
  }
  if (mode === "hermes" && !hermesAvailable) {
    throw new Error(`Hermes binary not found or not executable: ${args.hermesBin}`);
  }
  if (args.requireHermes && mode !== "hermes") {
    throw new Error(
      `Real Hermes execution required, but resolved mode is ${mode}. Install Hermes or pass --mode=hermes with a valid --hermes-bin.`,
    );
  }

  const runId = randomUUID();
  const taskSessions = [];
  const artifacts = [];
  const hermesRuns = [];

  for (const lane of lanes) {
    const taskSessionId = randomUUID();
    const prompt = buildLanePrompt(request, lane);
    taskSessions.push({
      task_session_id: taskSessionId,
      parent_request_id: request.request_id ?? null,
      lane,
      status: "completed",
      mode,
      prompt_sha256: createHash("sha256").update(prompt).digest("hex"),
      timeout_ms: args.hermesTimeoutMs,
      budget: request.budget_by_lane?.[lane] ?? null,
    });

    if (mode === "hermes") {
      const hermesRun = await runHermesCli({
        args,
        request,
        lane,
        prompt,
        taskSessionId,
      });
      hermesRuns.push(hermesRun);
      if (hermesRun.exit_code !== 0) {
        taskSessions[taskSessions.length - 1].status = "failed";
        throw new Error(
          `Hermes CLI failed for lane ${lane} with exit code ${hermesRun.exit_code}`,
        );
      }
    }

    artifacts.push(deterministicArtifact(request, lane, taskSessionId));
  }

  return {
    ok: true,
    status: "completed",
    runtime: "growth-hermes-sidecar",
    runtime_version: "epic482-sidecar-v1",
    run_id: runId,
    mode,
    hermes_available: hermesAvailable,
    profile: args.profile,
    account_id: request.account_id,
    website_id: request.website_id,
    user_id: request.user_id,
    agent_instance_id: request.agent_instance_id ?? null,
    objective: request.objective ?? null,
    lanes,
    task_sessions: taskSessions,
    artifacts,
    hermes_runs: hermesRuns,
    summary: {
      artifacts_prepared: artifacts.length,
      mutation_performed: false,
      executor_boundary: "growth_os_live_gated_executor",
    },
    evidence_fingerprint: stableHash({
      account_id: request.account_id,
      website_id: request.website_id,
      objective: request.objective ?? null,
      lanes,
      context: request.context ?? {},
    }),
    completed_at: new Date().toISOString(),
  };
}

async function writeOutput(result, outputPath) {
  const json = `${JSON.stringify(result, null, 2)}\n`;
  if (outputPath) {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, json, "utf8");
  }
  process.stdout.write(json);
}

export async function runGrowthHermesSidecar(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const request = await readTaskRequest(args.requestPath);
  const result = await buildDelegation(request, args);
  await writeOutput(result, args.outputPath);
  return result;
}
