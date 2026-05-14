#!/usr/bin/env node
/**
 * Bukeer Studio Development Pipeline Preflight
 *
 * Fails fast before creating a Kanban development workflow.
 * Checks the exact things that have historically caused silent hangs:
 * - Hermes gateway/dispatcher running
 * - required T0→T6 profiles exist
 * - Kanban DB reachable
 * - repo branch / Node version
 * - Codex CLI installed and authenticated
 * - existing watchdog script available
 *
 * Usage:
 *   node scripts/ai/dev-pipeline-preflight.mjs
 *   node scripts/ai/dev-pipeline-preflight.mjs --json
 *   node scripts/ai/dev-pipeline-preflight.mjs --allow-main
 */

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import process from "node:process";

const REQUIRED_PROFILES = ["specifier", "tech-validator", "developer", "qa-engineer", "ops", "learning-curator"];
const DEFAULT_REPO = "/opt/data/home/repos/bukeer-studio";
const REPO = process.env.DEV_PIPELINE_REPO || process.cwd() || DEFAULT_REPO;
const WATCHDOG = "/opt/data/scripts/kanban-watchdog.py";
const CODEX_CANDIDATES = [
  process.env.CODEX_BIN,
  "codex",
  "/opt/data/.npm-global/bin/codex",
  "/usr/local/bin/codex",
].filter(Boolean);

const args = new Set(process.argv.slice(2));
const json = args.has("--json");
const allowMain = args.has("--allow-main");

function buildEnv() {
  const nvmNodeBin = "/opt/data/home/.nvm/versions/node/v22.22.2/bin";
  const pathEntries = [
    nvmNodeBin,
    "/opt/hermes/.venv/bin",
    "/opt/data/.local/bin",
    "/opt/data/.npm-global/bin",
    process.env.PATH || "",
  ];

  return {
    ...process.env,
    HERMES_HOME: process.env.HERMES_HOME || "/opt/data",
    NVM_DIR: process.env.NVM_DIR || "/opt/data/home/.nvm",
    PATH: pathEntries.join(":"),
  };
}

function run(cmd, cmdArgs = [], opts = {}) {
  try {
    return {
      ok: true,
      stdout: execFileSync(cmd, cmdArgs, {
        cwd: opts.cwd || REPO,
        env: buildEnv(),
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: opts.timeout || 30_000,
      }).trim(),
    };
  } catch (error) {
    return {
      ok: false,
      stdout: error.stdout?.toString()?.trim() || "",
      stderr: error.stderr?.toString()?.trim() || error.message,
      status: error.status,
    };
  }
}

function check(name, fn) {
  try {
    const result = fn();
    return { name, ...result };
  } catch (error) {
    return { name, ok: false, detail: error.message };
  }
}

function findCodex() {
  for (const candidate of CODEX_CANDIDATES) {
    const res = spawnSync(candidate, ["--version"], {
      cwd: REPO,
      env: buildEnv(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (res.status === 0) {
      return { bin: candidate, version: (res.stdout || res.stderr).trim() };
    }
  }
  return null;
}

const checks = [];

checks.push(check("repo_exists", () => ({
  ok: existsSync(REPO),
  detail: REPO,
})));

checks.push(check("git_branch", () => {
  const res = run("git", ["branch", "--show-current"]);
  const branch = res.stdout || "unknown";
  const ok = allowMain ? branch !== "main" : branch === "dev";
  return {
    ok,
    detail: ok ? branch : `current=${branch}; expected=dev (or pass --allow-main for setup-only runs)`,
  };
}));

checks.push(check("working_tree", () => {
  const res = run("git", ["status", "--short"]);
  const lines = res.stdout.split("\n").filter(Boolean);
  const unrelated = lines.filter((line) => !line.includes("scripts/ai/dev-pipeline") && !line.includes("scripts/growth/"));
  return {
    ok: true,
    detail: lines.length ? `${lines.length} changed/untracked files (${unrelated.length} unrelated)` : "clean",
  };
}));

checks.push(check("node_version", () => {
  const res = run("node", ["--version"]);
  const major = Number((res.stdout.match(/^v(\d+)/) || [])[1] || 0);
  return {
    ok: major >= 22,
    detail: `${res.stdout}; expected >=22`,
  };
}));

checks.push(check("hermes_gateway", () => {
  const res = run("hermes", ["gateway", "status"], { cwd: "/opt/data" });
  return {
    ok: res.ok && /running/i.test(res.stdout),
    detail: res.ok ? res.stdout.split("\n")[0] : res.stderr,
  };
}));

checks.push(check("kanban_db", () => {
  const res = run("hermes", ["kanban", "stats"], { cwd: "/opt/data" });
  return {
    ok: res.ok,
    detail: res.ok ? "kanban stats reachable" : res.stderr,
  };
}));

checks.push(check("profiles", () => {
  const res = run("hermes", ["profile", "list"], { cwd: "/opt/data" });
  const missing = REQUIRED_PROFILES.filter((p) => !res.stdout.includes(p));
  return {
    ok: res.ok && missing.length === 0,
    detail: missing.length ? `missing: ${missing.join(", ")}` : `present: ${REQUIRED_PROFILES.join(", ")}`,
  };
}));

checks.push(check("codex_cli", () => {
  const found = findCodex();
  return {
    ok: Boolean(found),
    detail: found ? `${found.bin} → ${found.version}` : "codex not found in PATH nor /opt/data/.npm-global/bin",
  };
}));

checks.push(check("codex_auth", () => {
  const found = findCodex();
  if (!found) return { ok: false, detail: "skip: codex missing" };
  const res = run(found.bin, ["login", "status"], { cwd: REPO, timeout: 20_000 });
  return {
    ok: res.ok,
    detail: res.ok ? (res.stdout || "Logged in") : res.stderr,
  };
}));

checks.push(check("watchdog", () => ({
  ok: existsSync(WATCHDOG),
  detail: WATCHDOG,
})));

const ok = checks.every((c) => c.ok);

if (json) {
  console.log(JSON.stringify({ ok, checks }, null, 2));
} else {
  console.log(`Bukeer Studio dev-pipeline preflight: ${ok ? "PASS" : "FAIL"}`);
  for (const c of checks) {
    console.log(`${c.ok ? "✅" : "❌"} ${c.name}: ${c.detail}`);
  }
  if (!ok) {
    console.log("\nFix failing checks before creating/running a real development pipeline.");
  }
}

process.exit(ok ? 0 : 1);
