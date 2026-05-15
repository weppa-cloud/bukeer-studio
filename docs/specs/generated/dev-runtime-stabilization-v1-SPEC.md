# SPEC: Dev Runtime Stabilization v1 — Hermes Kanban for Bukeer Studio

## Status

- Author: Specifier profile
- Date: 2026-05-15
- Status: Draft for PLAN validation
- Scope owner: Neo (orchestrator)
- Implementation model: workers implement; Neo plans, routes, validates, and optimizes
- Repo: `weppa-cloud/bukeer-studio`
- Base branch: `origin/dev`

## Related architecture and operating decisions

This SPEC preserves and operationalizes the existing architecture instead of replacing it.

- [[ADR-003]] Contract-First Validation with Zod: runtime checks that accept structured config must validate at boundaries.
- [[ADR-005]] Defense-in-Depth Security: no secrets in prompts, logs, specs, Git commits, Kanban handoffs, or worker metadata.
- [[ADR-010]] Observability Strategy: runtime smokes must produce machine-readable evidence and actionable failure reasons.
- [[ADR-013]] Automated Tech Validator Quality Gate: this SPEC must pass PLAN review before implementation tasks begin; implementation diffs must pass CODE review.
- [[ADR-014]] Delta TypeScript Quality Gate: repo changes must keep `tsc` clean and use delta validation for touched files.
- [[ADR-023]] QA Tooling: Playwright and visual/runtime QA must use the session pool; agents never run direct `npm run dev`, direct `npm run test:e2e`, or direct `playwright test` outside the pool.
- [[SPEC_GROWTH_OS_HERMES_PRIMARY_RUNTIME_MVE_V0]]: Hermes-native Kanban is the runtime queue; profiles and skills are explicit; Supabase is not the runtime queue.
- [[SPEC_GROWTH_OS_PROVIDER_PROFILE_ARCHITECTURE_V2]]: Neo/Hermes is architect-orchestrator; workers consume scoped context and do implementation; Neo does not become a production worker.

## Problem

Recent mass Kanban execution exposed runtime fragility before larger Bukeer Studio work is delegated:

1. Workers can start without a reliable preflight proving repo, profile, tool, auth, and workspace readiness.
2. Profile/tooling failures are discovered inside implementation tasks instead of being blocked by a smoke gate.
3. Default runtime limits are too short for developer and QA work that legitimately needs builds, Playwright, and code review.
4. Codex/developer auth failures, GitHub auth gaps, and unknown skills can waste worker cycles or cause unsafe fallbacks.
5. Worktree hygiene and branch state are not consistently checked before agents edit docs/code.
6. Learning materializer/resume behavior must be safe and idempotent so workers do not duplicate stale materialization or resume a wrong task.
7. Neo must remain the orchestrator. A stabilization patch must not turn Neo into a long-running implementer or bypass worker profiles.

## Goal

Add a small, explicit dev-runtime stabilization layer for Bukeer Studio Kanban work so every future task can prove readiness before implementation and recover safely when profiles, skills, auth, worktrees, or QA runtime are unavailable.

## Non-goals

- No production deploys.
- No production data writes.
- No secrets or credential values in docs, commits, tool output, or Kanban metadata.
- No Docker socket exposure in gateway or profile runtime.
- No replacement of Hermes native Kanban.
- No new Supabase runtime queue.
- No direct GitHub mutation if GitHub auth is unavailable.
- No mass implementation by Neo; workers remain implementation executors.

## Operating principles

| ID | Principle | Requirement |
| --- | --- | --- |
| P1 | Neo orchestrates | Neo/specifier creates specs and task graph, assigns workers, validates gates, and does not become an implementation worker. |
| P2 | Workers implement | Developer, QA, reviewer, docs, and learning tasks run in worker profiles with explicit skills/toolsets. |
| P3 | Preflight before work | Every implementation task has a preflight that can fail fast before file changes. |
| P4 | Bounded concurrency | Dev-runtime default caps active implementation workers at 3 unless a human explicitly raises it. |
| P5 | Long enough runtime | Developer and QA worker tasks default to at least 3600 seconds max runtime. |
| P6 | Session-pool only QA | E2E and dev-server work must use `npm run session:list`, `npm run session:run`, or `scripts/session-acquire.sh`; direct port 3000 is forbidden. |
| P7 | Auth is smoke-tested | Codex/developer and GitHub auth are checked before dependent tasks; unavailable auth produces fallback handoff, not hallucinated success. |
| P8 | Unknown skills fail closed | Tasks referencing unknown skills block before dispatch or at preflight with an exact missing-skill list. |
| P9 | Worktree hygiene | Workers check branch, status, remote base, and stale artifacts before edits. |
| P10 | Learning is idempotent | Learning materializer resumes only from explicit task/run context and never rematerializes completed candidates without a changed evidence hash. |

## Required implementation surfaces

Implementation workers may choose exact filenames after audit, but the stabilization layer must cover these surfaces:

- Hermes profile/dispatcher config for Bukeer Studio Kanban work.
- Preflight script or command under `scripts/ai/` or `scripts/kanban/`.
- Profile/tool smoke command for specifier, tech-validator, nextjs-developer, debugger, website-quality-gate/QA, docs-keeper, and learning-curator style profiles where configured.
- Session-pool docs or runbook update if needed under `docs/development/` or `docs/ops/`.
- Learning materializer safety/resume rules in the relevant script/docs if present.
- GitHub auth fallback docs and task handoff template.

No application feature code should be changed for this stabilization unless a worker proves the runtime gate cannot be implemented without it.

## Preflight contract

A single preflight must be runnable locally by an agent before implementation:

```bash
npm run kanban:preflight
```

If npm script names are adjusted during implementation, the final command must remain documented in the implementation PR and this SPEC must be updated.

Minimum checks:

1. Node runtime:
   ```bash
   node --version
   ```
   Pass: major version >= 22.

2. Package install state:
   ```bash
   npm --version
   test -d node_modules
   ```
   Pass: `node_modules` exists or command returns a clear install-required failure.

3. Branch and worktree:
   ```bash
   git status --short --branch
   git rev-parse --abbrev-ref HEAD
   git merge-base --is-ancestor origin/dev HEAD || true
   ```
   Pass: branch is not `main`, base is traceable to `origin/dev`, and dirty files are either none or explicitly allowed docs/spec outputs for the current task.

4. Session pool availability:
   ```bash
   npm run session:list
   ```
   Pass: command exists and reports slots or a controlled "all busy" state. It must not start a fifth server.

5. Tech-validator availability:
   ```bash
   npm run tech-validator:code:quick
   ```
   Pass for implementation branches before CODE review. For docs-only SPEC tasks, this may be deferred to the validation worker but command availability must be checked.

6. Skill/profile manifest:
   ```bash
   hermes skills list
   hermes profile list
   ```
   Pass: all skills/profiles referenced by the task graph exist. If Hermes CLI is unavailable in the worker container, the preflight must return `BLOCKED_HERMES_CLI_UNAVAILABLE` with setup instructions, not skip silently.

7. Codex/developer auth smoke:
   ```bash
   codex --version || true
   hermes login --provider openai-codex --help >/dev/null 2>&1 || true
   ```
   Pass: configured developer profile can start its intended coding runtime, or the task graph routes coding work to an available approved developer profile. Do not print tokens.

8. GitHub auth smoke:
   ```bash
   gh auth status
   ```
   Pass: authenticated with repo scope for PR creation. If unavailable, fallback path is commit+push branch if possible, then leave a PR URL fallback/handoff with exact command for a human.

## Profile and tooling smoke gate

A dedicated worker task must run profile/tool smokes before mass work.

Required matrix:

| Profile lane | Smoke | Pass condition |
| --- | --- | --- |
| specifier | Create/read docs-only temp artifact in workspace, then remove it. | File tool works and no production write occurs. |
| tech-validator | Read SPEC + ADRs and run PLAN validation command/checklist. | Can return PASS/WATCH/BLOCKED with exact reasons. |
| nextjs-developer | Run preflight + `npm run typecheck` or repo-equivalent type gate if defined. | Can execute code gates without auth failure. |
| debugger | Run a no-op diagnostic against a known command such as `npm run session:list`. | Can inspect failure output and report root cause. |
| QA/website-quality-gate | Acquire a session-pool slot or report all busy. | Never uses port 3000 or direct Playwright. |
| docs-keeper | Update docs/INDEX.md in a temp branch/workspace check. | Can locate correct index sections. |
| learning-curator/materializer | Run dry-run/resume check with fake candidate id. | Idempotent; no duplicate materialization. |

The smoke task must fail closed if any referenced profile, skill, or command is unknown.

## Runtime defaults

Default task/runtime configuration for Bukeer Studio Kanban work:

| Task type | Default `max_runtime_seconds` | Reason |
| --- | ---: | --- |
| SPEC / planning | 1800 | Docs-only and ADR lookup. |
| PLAN validation | 1800 | ADR/spec review and task graph approval. |
| Developer implementation | 3600 | Allows install/typecheck/build/targeted tests. |
| Debugger/root-cause | 3600 | Allows reproduction and iterative diagnostics. |
| QA/E2E/visual | 5400 | Allows session-pool dev server, Playwright, screenshots, retry with evidence. |
| Code review | 2400 | Diff, ADR review, and command verification. |
| Docs keeper | 1800 | Index/runbook updates. |
| Learning materializer | 2400 | Resume/dedup/evidence hashing without rushing. |

Concurrency defaults:

- Maximum active implementation workers: 3.
- Maximum active QA workers: 1 unless session pool shows capacity and Neo explicitly expands.
- Specifier/tech-validator may run ahead only for planning/validation tasks and must not consume session-pool slots unless validating QA commands.

## Unknown skill guard

Before dispatching or starting a worker task with forced skills, the runtime must verify:

```bash
hermes skills list
```

and compare against task-declared skills.

Failure behavior:

```text
UNKNOWN_SKILL_BLOCKED
missing_skills=[...]
task_id=<kanban task id>
profile=<assignee>
next_step="Install or rename skill, then unblock task. Do not run without it."
```

The guard must not silently drop missing skills and continue.

## Codex/developer auth smoke

Developer lanes using Codex, OpenAI Codex OAuth, GitHub Copilot, Claude Code, Opencode, or another ACP/CLI runtime must prove the configured runtime can start before implementation tasks are unblocked.

Minimum smoke requirements:

- CLI binary exists or profile explicitly uses native Hermes model execution.
- Auth status command returns success or known actionable unauthenticated state.
- The smoke does not send secrets to stdout.
- Failure routes to a blocked task with remediation instructions, for example:
  ```bash
  hermes login --provider openai-codex
  hermes model
  gh auth login
  ```

A developer task may proceed without Codex only if the assigned worker profile is explicitly configured to implement via another approved model/runtime and the handoff records that decision.

## GitHub auth fallback

GitHub PR creation is preferred but not required for runtime stabilization tasks.

Required flow:

1. Check:
   ```bash
   gh auth status
   git remote -v
   git status --short --branch
   ```
2. If `gh` is authenticated, create PR normally after validation.
3. If `gh` is unavailable but git push works:
   ```bash
   git push -u origin <branch-name>
   ```
   Then leave a handoff containing:
   ```text
   GitHub auth unavailable for PR creation.
   Branch pushed: <branch-name>
   Human PR URL: https://github.com/weppa-cloud/bukeer-studio/compare/dev...<branch-name>?expand=1
   Validation run: <commands and result>
   ```
4. If push is also unavailable, commit locally only if requested by task; otherwise leave a patch/diff handoff and block with exact auth failure.

No worker may claim PR creation succeeded without a PR URL or a pushed-branch compare URL.

## Worktree hygiene

Every editing worker must run:

```bash
git status --short --branch
git rev-parse --show-toplevel
git rev-parse --abbrev-ref HEAD
git diff --stat
```

Pass rules:

- Worktree path equals `$HERMES_KANBAN_WORKSPACE` for Kanban workers.
- Branch is a task branch based on `origin/dev`, not `main`.
- Existing dirty files are either from the current task, explicitly documented in parent handoff, or cause a block before editing.
- Generated artifacts such as `.next-*`, Playwright reports, coverage, and temp files are not committed unless explicitly intended evidence docs.
- Workers do not modify files outside the workspace.

## QA runtime and session-pool gate

All E2E/dev-server checks must use the session pool from `CLAUDE.md` / `docs/development/local-sessions.md`.

Allowed commands:

```bash
npm run session:list
npm run session:run
npm run session:run -- --grep "<target>"
eval "$(bash scripts/session-acquire.sh)"
PORT=$PORT NEXT_DIST_DIR=.next-$SESSION_NAME npm run dev:session
bash scripts/session-release.sh "$_ACQUIRED_SESSION"
```

Forbidden commands for agents:

```bash
npm run dev
npm run test:e2e
npx playwright test
PORT=3000 npm run dev:session
```

If all four slots are busy, QA blocks or waits according to task runtime. It must not start a fifth server.

## Learning materializer resume rules

The learning materializer must be safe to resume and safe to rerun.

Required state model:

| State | Meaning | Resume behavior |
| --- | --- | --- |
| `candidate` | Learning candidate discovered but not classified. | Can classify if evidence hash is unchanged. |
| `materializing` | Worker is writing memory/skill/doc output. | Resume only if same task id/run id owns the lock or lock is stale and recoverable. |
| `materialized` | Output written and verified. | Do not rewrite unless evidence hash or target version changed. |
| `skipped` | Explicit no-op. | Do not reopen unless new evidence hash appears. |
| `blocked` | Needs human/runtime fix. | Resume only after unblock comment/context. |

Resume must require:

- candidate id;
- evidence hash;
- target artifact path/name;
- owning Kanban task id;
- last run id;
- status;
- verification result.

Dry-run command requirement:

```bash
npm run learning:materialize -- --dry-run --resume <candidate-id>
```

If the implementation uses a different command, it must provide an equivalent documented dry-run/resume path.

## Implementation task graph

Neo should create/keep this graph after PLAN validation. Neo remains orchestrator; assigned workers execute.

| Task | Assignee | Depends on | Scope | Required gate |
| --- | --- | --- | --- | --- |
| T0 SPEC | specifier | none | This document + docs/INDEX.md | Complete when SPEC exists and index is updated. |
| T1 PLAN GATE | tech-validator | T0 | Validate SPEC against ADRs/Hermes principles. | PASS/WATCH/BLOCKED with approved task graph. |
| T2 PRE-FLIGHT IMPLEMENTATION | nextjs-developer | T1 PASS | Add preflight script/config/docs; no prod writes. | `npm run kanban:preflight` passes or returns controlled block states. |
| T3 PROFILE/TOOL SMOKE | debugger or nextjs-developer | T2 | Implement or run profile/tool smoke matrix. | Smoke report covers required profiles and unknown-skill guard. |
| T4 RUNTIME DEFAULTS | nextjs-developer | T1 PASS | Set max_runtime/concurrency defaults in dispatcher/profile config or documented operator config. | Developer/QA defaults >=3600s; max active implementation workers <=3. |
| T5 QA SESSION-POOL VALIDATION | website-quality-gate | T2 | Validate session-pool commands and forbidden-command guard. | Evidence from `npm run session:list` and controlled session acquire/release. |
| T6 LEARNING RESUME SAFETY | learning-curator or nextjs-developer | T1 PASS | Implement/document idempotent learning materializer resume rules. | Dry-run resume command proves no duplicate materialization. |
| T7 CODE REVIEW | tech-validator | T2-T6 | Review diff against SPEC/ADRs. | CODE PASS or exact remediation. |
| T8 DOCS/HANDOFF | docs-keeper | T7 PASS | Final runbook/index update if implementation changed commands. | docs/INDEX.md and command docs are current. |

## Acceptance criteria

- [ ] `docs/specs/generated/dev-runtime-stabilization-v1-SPEC.md` exists.
- [ ] `docs/INDEX.md` links `[[SPEC_DEV_RUNTIME_STABILIZATION_V1]]` in the Specs table, concept graph, and resolution table.
- [ ] PLAN validation task reviews this SPEC before implementation begins.
- [ ] SPEC explicitly preserves Neo as orchestrator and workers as implementers.
- [ ] SPEC includes exact gates and test commands for preflight, profile/tool smoke, GitHub auth, Codex/developer auth, worktree hygiene, QA session pool, unknown skills, and learning materializer resume.
- [ ] SPEC forbids production writes, deploys, secrets, Docker socket exposure, and direct port-3000/manual dev-server use by agents.
- [ ] Runtime defaults require developer/QA work to have at least 3600s max runtime.
- [ ] Runtime default concurrency caps implementation workers at 3.
- [ ] GitHub auth fallback provides pushed-branch compare URL handoff when PR creation is unavailable.
- [ ] Learning materializer resume is idempotent and evidence-hash based.
- [ ] No code changes are made by T0 beyond SPEC/docs.

## PLAN validation checklist for tech-validator

The T1 tech-validator worker must answer:

1. Does the SPEC comply with [[ADR-003]], [[ADR-005]], [[ADR-010]], [[ADR-013]], [[ADR-014]], and [[ADR-023]]?
2. Does it preserve Hermes native Kanban and Neo/Hermes orchestration principles from [[SPEC_GROWTH_OS_HERMES_PRIMARY_RUNTIME_MVE_V0]] and [[SPEC_GROWTH_OS_PROVIDER_PROFILE_ARCHITECTURE_V2]]?
3. Does it prevent unsafe fallbacks: missing skills, missing auth, dirty worktree, direct prod deploy, direct port 3000, direct provider/API mutation?
4. Are all gates measurable by explicit commands or machine-readable block states?
5. Is the task graph sequenced so implementation cannot start until PLAN validation passes?
6. Are any implementation surfaces too broad or likely to cause production writes?
7. PASS only if the answer to 1-6 is acceptable; otherwise block with exact SPEC edits required.

## Verification commands for this T0 docs-only task

Run after writing the SPEC and index update:

```bash
test -f docs/specs/generated/dev-runtime-stabilization-v1-SPEC.md
grep -n "SPEC_DEV_RUNTIME_STABILIZATION_V1" docs/INDEX.md
grep -n "dev-runtime-stabilization-v1-SPEC" docs/INDEX.md
git diff -- docs/specs/generated/dev-runtime-stabilization-v1-SPEC.md docs/INDEX.md
```

Expected: file exists, index has wikilink/path entries, and git diff contains docs-only changes.
