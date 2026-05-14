#!/usr/bin/env node
/**
 * Bukeer Studio Kanban Development Pipeline Creator
 *
 * Creates the validated T0→T6 DAG:
 * T0 specifier → T1 tech-validator PLAN gate → T2 developer-runner (Codex CLI)
 * → T3 tech-validator CODE gate → T4 qa-engineer gate → T5 ops handoff → T6 learning-curator.
 *
 * Default is --dry-run. Use --apply to create tasks.
 *
 * Usage:
 *   node scripts/ai/create-dev-pipeline.mjs --title "Fix Villa de Leyva destination" --scope "..."
 *   node scripts/ai/create-dev-pipeline.mjs --apply --title "..." --scope "..." --priority high
 */

import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import process from "node:process";

const REPO = "/opt/data/home/repos/bukeer-studio";
const DEFAULT_BRANCH = "dev";
const WORKSPACE = `dir:${REPO}`;
const args = process.argv.slice(2);

function arg(name, fallback = "") {
  const idx = args.indexOf(`--${name}`);
  if (idx >= 0) return args[idx + 1] || fallback;
  const pref = args.find((a) => a.startsWith(`--${name}=`));
  return pref ? pref.slice(name.length + 3) : fallback;
}
function has(name) { return args.includes(`--${name}`); }

const apply = has("apply");
const title = arg("title");
const scope = arg("scope");
const priorityRaw = arg("priority", "0");
const priorityMap = { low: "-10", normal: "0", medium: "0", high: "10", urgent: "20", p0: "30" };
const priority = priorityMap[String(priorityRaw).toLowerCase()] || String(priorityRaw);
const tenant = arg("tenant", "bukeer-studio-dev");
const baseBranch = arg("base-branch", DEFAULT_BRANCH);
const slug = arg("slug", title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48));
const pipelineId = arg("pipeline-id", `dev-${new Date().toISOString().slice(0,10)}-${crypto.randomBytes(3).toString("hex")}`);
const githubIssueRaw = arg("github-issue", "");
const githubIssue = githubIssueRaw ? Number(githubIssueRaw) : null;
const githubUrl = arg("github-url", githubIssue ? `https://github.com/weppa-cloud/bukeer-studio/issues/${githubIssue}` : "");
const sourceOfTruth = arg("source-of-truth", githubIssue || githubUrl ? "github" : "kanban");

if (!title || !scope) {
  console.error("Missing required --title and --scope");
  process.exit(2);
}

function sh(cmd, cmdArgs, opts = {}) {
  return execFileSync(cmd, cmdArgs, {
    cwd: opts.cwd || REPO,
    env: { ...process.env, PATH: `/opt/data/home/.nvm/versions/node/v22.22.2/bin:/opt/data/.npm-global/bin:${process.env.PATH || ""}` },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: opts.timeout || 60_000,
  }).trim();
}

function createTask({ key, taskTitle, assignee, body, parents = [], skills = [], maxRetries = 2, maxRuntime = "2h" }) {
  const cmd = [
    "kanban", "create", taskTitle,
    "--assignee", assignee,
    "--workspace", WORKSPACE,
    "--tenant", tenant,
    "--priority", priority,
    "--idempotency-key", `${pipelineId}:${key}`,
    "--max-retries", String(maxRetries),
    "--max-runtime", maxRuntime,
    "--body", body,
    "--json",
  ];
  for (const p of parents) cmd.splice(cmd.length - 1, 0, "--parent", p);
  for (const s of skills) cmd.splice(cmd.length - 1, 0, "--skill", s);

  if (!apply) {
    return { id: `DRY_${key}`, taskTitle, assignee, parents, skills };
  }
  const out = sh("hermes", cmd, { cwd: "/opt/data", timeout: 90_000 });
  const parsed = JSON.parse(out);
  return { id: parsed.task_id || parsed.id, taskTitle, assignee, parents, skills };
}

const common = {
  pipelineId,
  sourceOfTruth,
  githubIssue,
  githubUrl,
  repo: REPO,
  baseBranch,
  featureBranch: `feat/${slug}`,
  requestedTitle: title,
  requestedScope: scope,
  acceptanceContract: [
    "No secrets in logs/output; redact credentials as [REDACTED].",
    "Work from dev branch unless explicitly overridden.",
    githubIssue ? `GitHub Issue #${githubIssue} is source of truth.` : "GitHub issue is source of truth when provided; otherwise Kanban body is run scope.",
    "Every gate must return PASS/FAIL/WARN with evidence.",
    "Retries created to resolve a blocked gate MUST NOT use parents=[blocked_gate].",
    "Structured learning_candidates must be emitted by T1/T3/T4/T5 and by T2 when implementation discovers durable lessons.",
    "No secrets, credentials, tokens, cookie values, raw env values, raw PII, or raw logs in learning artifacts.",
    "Use session pool for E2E/dev server; never raw port 3000 from agents.",
  ],
};

const learningCandidateContract = {
  requiredFor: ["T1_PLAN_GATE", "T3_CODE_GATE", "T4_QA_GATE", "T5_OPS_HANDOFF"],
  optionalFor: ["T0_SPECIFIER", "T2_DEVELOPER_RUNNER"],
  fields: ["kind", "audience", "summary", "evidence", "recommended_action", "risk", "redaction_checked"],
  allowedKinds: ["skill_patch", "profile_fact", "pattern_doc", "adr_update", "github_issue", "prompt_update", "rejected_noise"],
  allowedActions: ["apply", "propose", "follow_up", "reject"],
  redactionRule: "Do not include secrets, raw logs, credentials, tokens, cookie values, raw env values, or raw PII.",
};

const commonMetadataContract = {
  fields: ["pipeline_id", "github_issue", "github_url", "task_id", "role", "status", "branch", "commit_sha", "pr_url", "adr_refs", "changed_files", "commands", "gate_evidence", "failures", "learning_candidates", "follow_up_issues"],
  statusValues: ["PASS", "FAIL", "WARN", "BLOCKED", "NOT_APPLICABLE"],
  evidenceRule: "Every gate returns PASS/FAIL/WARN with summarized evidence.",
};

const t0Body = JSON.stringify({
  ...common,
  role: "T0_SPECIFIER",
  metadataContract: commonMetadataContract,
  learningCandidateContract,
  instructions: [
    "Read docs/INDEX.md, relevant ADRs/SPECs, AGENTS.md, and code areas implied by scope.",
    "Produce an executable SPEC at docs/specs/generated/<pipelineId>-SPEC.md or in task output if file write is not appropriate.",
    "Include problem statement, non-goals, touched files, DB impact, acceptance criteria, validation plan, rollout/rollback.",
    "Do not implement code.",
  ],
}, null, 2);

const t0 = createTask({
  key: "T0-spec",
  taskTitle: `[${pipelineId}] T0 SPEC — ${title}`,
  assignee: "specifier",
  body: t0Body,
  skills: [],
  maxRuntime: "90m",
});

const t1Body = JSON.stringify({
  ...common,
  role: "T1_TECH_VALIDATOR_PLAN_GATE",
  metadataContract: commonMetadataContract,
  learningCandidateContract,
  input: "Read parent T0 output/SPEC.",
  gate: {
    pass: "SPEC is executable, scoped, aligned with ADRs, testable, and safe for Bukeer Studio.",
    fail: "Block with exact issues; if fixable, create a T0R spec retry WITHOUT parent link to this blocked gate.",
  },
  checks: ["architecture", "ADR alignment", "scope creep", "data/security", "test plan", "rollback", "learning_candidates"],
}, null, 2);

const t1 = createTask({
  key: "T1-plan-gate",
  taskTitle: `[${pipelineId}] T1 PLAN GATE — ${title}`,
  assignee: "tech-validator",
  body: t1Body,
  parents: [t0.id],
  skills: [],
  maxRuntime: "60m",
});

const t2Body = JSON.stringify({
  ...common,
  role: "T2_DEVELOPER_RUNNER_CODEX_CLI",
  metadataContract: commonMetadataContract,
  learningCandidateContract,
  criticalPattern: "This worker is a terminal/git runner. It invokes Codex CLI for implementation; it does not rely on Hermes openai-codex provider tools.",
  preflight: [
    "Run node scripts/ai/dev-pipeline-preflight.mjs --allow-main before implementation.",
    "Ensure codex is callable via PATH or /opt/data/.npm-global/bin/codex.",
    "If repo is on main, checkout/create branch from dev before edits unless this is dry-run.",
  ],
  codexCommandTemplate: "PATH=/opt/data/.npm-global/bin:$PATH codex exec --full-auto --ephemeral '<implementation prompt>'",
  implementationPromptMustInclude: [
    "SPEC from T0 and gate comments from T1",
    "Create/switch branch feat/<slug> from dev",
    "Implement minimal focused changes",
    "Run npm run typecheck, npm run lint, and targeted tests; for E2E use npm run session:run -- --grep <area>",
    "Commit changes with conventional commit message",
    "Return branch, commit SHA, changed files, commands/results, risks",
  ],
  failBehavior: "If Codex or validation fails, block with logs or create T2R retry WITHOUT parent link to blocked gate.",
}, null, 2);

const t2 = createTask({
  key: "T2-dev-codex-runner",
  taskTitle: `[${pipelineId}] T2 DEV RUNNER/CODEX — ${title}`,
  assignee: "developer",
  body: t2Body,
  parents: [t1.id],
  skills: ["codex"],
  maxRetries: 1,
  maxRuntime: "4h",
});

const t3Body = JSON.stringify({
  ...common,
  role: "T3_TECH_VALIDATOR_CODE_GATE",
  metadataContract: commonMetadataContract,
  learningCandidateContract,
  input: "Review branch/commit/diff from T2.",
  gate: {
    pass: "Diff is correct, minimal, typed, safe, and validation evidence is credible.",
    warn: "Non-blocking debt documented; can proceed to QA.",
    fail: "Block with concrete findings and create T2R retry WITHOUT parent link to this blocked gate.",
  },
  checks: ["security", "types", "architecture", "test coverage", "performance", "regressions", "secret leaks", "learning_candidates"],
}, null, 2);

const t3 = createTask({
  key: "T3-code-gate",
  taskTitle: `[${pipelineId}] T3 CODE GATE — ${title}`,
  assignee: "tech-validator",
  body: t3Body,
  parents: [t2.id],
  skills: [],
  maxRuntime: "90m",
});

const t4Body = JSON.stringify({
  ...common,
  role: "T4_QA_GATE",
  metadataContract: commonMetadataContract,
  learningCandidateContract,
  input: "Validate implementation from T2 after T3 pass/warn.",
  requiredPattern: "Use session pool only: npm run session:list / npm run session:run; never raw port 3000.",
  gate: {
    pass: "Acceptance criteria verified with E2E/visual/accessibility evidence.",
    flaky: "One auto-retry allowed for infra/timeouts; classify as QA_FLAKY with evidence.",
    fail: "Block with reproducible steps and create T2R retry WITHOUT parent link to this blocked gate.",
  },
  checks: ["acceptance criteria", "responsive UI", "WCAG AA basics", "SEO/public rendering if applicable", "no console/runtime errors", "learning_candidates"],
}, null, 2);

const t4 = createTask({
  key: "T4-qa-gate",
  taskTitle: `[${pipelineId}] T4 QA GATE — ${title}`,
  assignee: "qa-engineer",
  body: t4Body,
  parents: [t3.id],
  skills: [],
  maxRuntime: "2h",
});

const t5Body = JSON.stringify({
  ...common,
  role: "T5_OPS_HANDOFF",
  metadataContract: commonMetadataContract,
  learningCandidateContract,
  input: "Prepare merge/deploy handoff after T4 pass.",
  instructions: [
    "Do not deploy blindly. Confirm branch, CI status, rollback plan, and target branch.",
    "If PR missing, create PR or output exact command for PR creation.",
    "For production: main push triggers GH Actions deploy; include monitoring/rollback notes.",
    "Emit learning_candidates for T6 with redaction_checked=true.",
  ],
}, null, 2);

const t5 = createTask({
  key: "T5-ops-handoff",
  taskTitle: `[${pipelineId}] T5 OPS HANDOFF — ${title}`,
  assignee: "ops",
  body: t5Body,
  parents: [t4.id],
  skills: [],
  maxRuntime: "60m",
});

const t6Body = JSON.stringify({
  ...common,
  role: "T6_LEARNING_CURATOR",
  metadataContract: commonMetadataContract,
  learningCandidateContract,
  input: "Curate learning after T5 ops handoff. Read all parent task handoffs and Kanban trace.",
  instructions: [
    "Create or update docs/ai/learning-runs/<date>-<pipelineId>.md using docs/ai/templates/learning-run-template.md.",
    "Classify learning_candidates into skill_patch, profile_fact, pattern_doc, adr_update, github_issue, prompt_update, or rejected_noise.",
    "Do not persist secrets, raw logs, credentials, tokens, cookie values, raw env values, or raw PII.",
    "Prefer GitHub/repo docs for shared institutional knowledge; keep profile-private facts scoped.",
    "If Villa de Leyva backfill applies and no example exists, create it or open/document a follow-up.",
    "Return PASS/FAIL/WARN with learning_run_path, applied/proposed learning, rejected candidates, and follow_up_issues.",
  ],
}, null, 2);

const t6 = createTask({
  key: "T6-learning-curator",
  taskTitle: `[${pipelineId}] T6 LEARNING CURATOR — ${title}`,
  assignee: "learning-curator",
  body: t6Body,
  parents: [t5.id],
  skills: [],
  maxRuntime: "90m",
});

const tasks = [t0, t1, t2, t3, t4, t5, t6];

console.log(JSON.stringify({
  mode: apply ? "APPLY" : "DRY_RUN",
  pipelineId,
  tenant,
  title,
  sourceOfTruth,
  githubIssue,
  githubUrl,
  graph: tasks.map((t) => ({ id: t.id, title: t.taskTitle, assignee: t.assignee, parents: t.parents, skills: t.skills })),
  next: apply
    ? "Run: hermes kanban dispatch --max 3"
    : "Dry-run only. Re-run with --apply to create tasks.",
}, null, 2));
