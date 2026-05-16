# Development Kanban Pipeline

Operational runbook for Bukeer Studio implementation workers using Hermes Kanban.

Related spec: [[SPEC_DEV_RUNTIME_STABILIZATION_V1]].

## Preflight command

Run this before implementation work and again before handoff when practical:

```bash
npm run kanban:preflight
```

Run the script self-test after edits to validate redaction and manifest defaults without invoking expensive runtime gates:

```bash
npm run kanban:preflight:self-test
```

The command runs `scripts/ai/dev-pipeline-preflight.mjs` and emits redacted JSON with these states:

- `PASS`: gate succeeded.
- `WARN`: work may continue, but the warning must be recorded in the handoff. Typical example: GitHub CLI is unavailable, so the worker must use the pushed-branch compare URL fallback.
- `FAIL`: local runtime or repo state must be fixed before implementation should proceed.
- `BLOCKED`: a required external runtime/profile/skill is unavailable. Block the Kanban task with the exact state code and next step.

The script never prints credential values; token-like output is redacted before JSON is emitted.

## Minimum gates

`npm run kanban:preflight` checks:

1. Node/npm runtime: Node major version must be at least 22.
2. Install state: `node_modules` must exist or the command returns `INSTALL_REQUIRED`.
3. Branch/worktree hygiene: branch must not be `main`, the worktree must match the repo root, and `origin/dev` must be an ancestor of `HEAD`.
4. Session pool: `npm run session:list` must report controlled slot state and must not start a dev server.
5. Tech validator quick command: `npm run tech-validator:code:quick` must be available and pass for implementation branches.
6. Hermes profiles and skills: required Hermes profiles plus repo-local `.agents/skills` are verified. Missing entries return `UNKNOWN_PROFILE_OR_SKILL_BLOCKED`.
7. Developer runtime auth smoke: verifies a visible Codex runtime or Hermes OpenAI Codex login help path without printing secrets.
8. GitHub auth smoke: verifies `gh auth status` when available. If unavailable, emits a compare URL fallback for human PR creation.

## Configurable profile/skill guard

The default profile set is:

```text
specifier, tech-validator, developer, qa-engineer, learning-curator
```

The default repo skill set is:

```text
specifying, tech-validator, nextjs-developer, debugger, website-quality-gate, docs-keeper
```

Override only for explicit task graphs:

```bash
KANBAN_PREFLIGHT_REQUIRED_PROFILES="specifier,tech-validator,developer" \
KANBAN_PREFLIGHT_REQUIRED_REPO_SKILLS="specifying,tech-validator,nextjs-developer" \
npm run kanban:preflight
```

Set `KANBAN_PREFLIGHT_STRICT_DIRTY=1` when a gate must fail on any dirty worktree line. The default reports dirty state as `WARN` because implementation workers commonly run the final preflight before committing their current task changes.

## GitHub auth fallback

When `gh auth status` is unavailable but git push works, push the branch and include this in the handoff:

```text
GitHub auth unavailable for PR creation.
Branch pushed: <branch-name>
Human PR URL: https://github.com/weppa-cloud/bukeer-studio/compare/dev...<branch-name>?expand=1
Validation run: <commands and result>
```

Do not claim PR creation succeeded unless a real PR URL exists.

## Session-pool rule

Agents must not use port 3000 or direct Playwright/dev-server commands. Allowed commands are:

```bash
npm run session:list
npm run session:run
npm run session:run -- --grep "<target>"
eval "$(bash scripts/session-acquire.sh)"
PORT=$PORT NEXT_DIST_DIR=.next-$SESSION_NAME npm run dev:session
bash scripts/session-release.sh "$_ACQUIRED_SESSION"
```

Forbidden for agents:

```bash
npm run dev
npm run test:e2e
npx playwright test
PORT=3000 npm run dev:session
```

If all four slots are busy, wait within the task runtime or block with a clear reason. Never start a fifth server.

## Learning materializer resume safety

This repository currently has no `learning:materialize` npm script. Until one exists, learning-curator tasks must treat materialization as a documented handoff rather than an implicit write.

Any future materializer must be idempotent and require:

- candidate id;
- evidence hash;
- target artifact path/name;
- owning Kanban task id;
- last run id;
- status;
- verification result.

Required dry-run shape when implemented:

```bash
npm run learning:materialize -- --dry-run --resume <candidate-id>
```

Completed candidates must not be rematerialized unless the evidence hash or target artifact version changes.

## Runtime defaults for orchestrators

For Bukeer Studio Kanban task creation, use these defaults unless a human explicitly changes them:

| Task type | Default max runtime |
| --- | ---: |
| SPEC / planning | 1800 seconds |
| PLAN validation | 1800 seconds |
| Developer implementation | 3600 seconds |
| Debugger/root-cause | 3600 seconds |
| QA/E2E/visual | 5400 seconds |
| Code review | 2400 seconds |
| Docs keeper | 1800 seconds |
| Learning materializer | 2400 seconds |

Concurrency defaults:

- Maximum active implementation workers: 3.
- Maximum active QA workers: 1 unless the session pool shows capacity and Neo explicitly expands it.
- Neo remains orchestrator; implementation work stays assigned to worker profiles.
