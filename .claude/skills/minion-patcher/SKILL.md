---
name: minion-patcher
description: |
  Automated patch minion — fetches a GitHub issue, validates it, applies a surgical fix,
  and creates a PR. Replaces ops/ouqis/minions/patch_minion/run-local.sh with native
  Claude Code execution (full context: CLAUDE.md, skills, MCP tools, memory).
  USE WHEN: user invokes /minion-patcher <issue_number> or asks to patch an issue.
  NOT FOR: features, refactors, or issues without ouqis:patch label.

  <example>
  user: "/minion-patcher 408"
  assistant: "Fetching issue #408, validating gates, applying fix..."
  <commentary>Direct invocation with issue number.</commentary>
  </example>
  <example>
  user: "/minion-patcher 408 --dry-run"
  assistant: "Dry run: Gate 1 passed, showing contract without executing fix."
  <commentary>Validation only, no code changes.</commentary>
  </example>
---

# OUQIS Patch Minion (Native Claude Code)

Surgical bug fixer. Fetches a structured GitHub issue, validates constraints,
applies a minimal fix, and creates a PR — all within the current Claude Code session.

## Usage

```
/minion-patcher <issue_number> [--dry-run]
```

- `<issue_number>` — Required. GitHub issue number with `ouqis:patch` label.
- `--dry-run` — Optional. Run Gate 1 validation only, show contract, stop before fix.

## Pipeline (5 Gates)

### Phase 0: Fetch + Parse Issue

1. Run: `gh issue view <N> --json title,body,labels`
2. Extract structured sections from issue body (GitHub form template):
   - `Bug Description` (required)
   - `Actual Behavior` (required)
   - `Expected Behavior` (required)
   - `Affected Files` (required, 1 path per line, max 3)
   - `Expected Fix` (required)
   - `Risk Level` (required: `low` | `medium`)
   - `Max Files` (required: `1` | `2` | `3`)
   - `Done Criteria` (required, 1 criterion per line)
   - `Additional Context` (optional)
3. Parse sections using awk: match `### Label` headers, capture content until next `###`.

### Phase 1: Gate 1 — Issue Validation (deterministic, no code changes)

All checks must pass. If ANY fails, comment failure on issue and STOP.

| Check | Rule | On Fail |
|-------|------|---------|
| Bug Description | Non-empty | Stop |
| Affected Files | Non-empty, ≤ 3 files | Stop |
| Expected Fix | Non-empty | Stop |
| Risk Level | `low` or `medium` | Stop |
| Files exist | Each file exists on disk | Stop |
| No forbidden paths | See list below | Stop |
| Label | `ouqis:patch` present | Stop |

**Forbidden paths** (NEVER touch):
```
supabase/migrations/
lib/backend/
lib/services/authorization_service.dart
lib/services/authentication_service.dart
ai-system/
.github/workflows/
```

**On Gate 1 failure**: Comment on issue with structured failure report, then STOP.

```bash
gh issue comment <N> --body "## OUQIS Patch Minion — Gate 1 Failed
- ✗ <failure 1>
- ✗ <failure 2>
Run: <run_id>"
```

If `--dry-run`: Show the task contract (Phase 1.5) and STOP here.

### Phase 1.5: Task Contract (informational)

Generate and display the task contract (do NOT write to file):

```
Task Contract:
  Issue: #<N> — <title>
  Risk: <low|medium>
  Max files: <1|2|3>
  Affected files: <list>
  Fix approach: <expected_fix summary>
  Done criteria: <list>
  Max turns budget: low=10, medium=20
```

### Phase 2: Branch + Fix

1. **Create branch**: `codex/ouqis-patch-<N>` from `origin/dev`
   ```bash
   git fetch origin dev --depth 1
   git checkout -b codex/ouqis-patch-<N> origin/dev
   ```

2. **Read affected files** — ONLY the files listed in Affected Files section.

3. **Apply the fix** following these HARD CONSTRAINTS:
   - ONLY modify files listed in Affected Files
   - Change at most `Max Files` files
   - NEVER touch forbidden paths
   - Follow ALL patterns from CLAUDE.md (typed models, SafeMap, M3 colors, no deprecated getters)
   - Minimal changes — surgical fix, no refactoring, no improvements beyond the fix
   - Do NOT create new files

4. **Validate**: Run `mcp__dart__analyze_files` on changed files. Fix ONLY issues you introduced.

5. **Commit**:
   ```
   fix: concise description (#<N>)

   Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
   ```

### Phase 3: Gate 2 — Post-fix Validation (deterministic)

All checks must pass. If ANY fails, report and STOP (do NOT push).

| Check | Rule |
|-------|------|
| Commits | ≥ 1 commit produced on branch |
| File count | Changed files ≤ Max Files |
| Forbidden paths | No forbidden paths in `git diff --name-only origin/dev` |
| dart analyze | `dart analyze --fatal-warnings` on changed files = clean |

**On Gate 2 failure**:
- Reset branch: `git reset --hard origin/dev`
- Comment failure on issue
- STOP

### Phase 4: Push + PR

1. Push branch:
   ```bash
   git push origin codex/ouqis-patch-<N> --force-with-lease
   ```

2. Create PR:
   ```bash
   gh pr create --base dev --head codex/ouqis-patch-<N> \
     --title "fix: <issue_title> (#<N>)" \
     --body "<structured body>"
   ```

   PR body template:
   ```markdown
   ## OUQIS Patch Minion

   Automated fix for #<N>.

   - **Risk:** <level>
   - **Files Changed:** <count>
   - **Gate 1:** Passed
   - **Gate 2:** Passed

   ### Done Criteria
   <from issue>

   ### Changed Files
   <list>

   ---
   Generated by OUQIS Patch Minion (Claude Code native)
   ```

3. Comment success on issue:
   ```bash
   gh issue comment <N> --body "## OUQIS Patch Minion — Success ✓
   - PR: <url>
   - Files changed: <count>
   - Gate 1: ✓ | Gate 2: ✓
   Run: <run_id>"
   ```

### Phase 5: Log Run

Log the run to the pilot JSONL file:

```bash
bash ops/ouqis/pilots/bin/log_run.sh \
  --file ops/ouqis/pilots/data/pilot_runs_2026Q1.jsonl \
  --run-id "<run_id>" \
  --date "$(date -u +%Y-%m-%d)" \
  --minion "patch_minion" \
  --task-class "bugfix_small" \
  --status "<passed|gate1_failed|gate2_failed>" \
  --ci-green "<true|false|na>" \
  --retries "0" \
  --notes "claude-code-native, issue #<N>"
```

Then recompute metrics:
```bash
bash ops/ouqis/pilots/bin/compute_metrics.sh \
  --input ops/ouqis/pilots/data/pilot_runs_2026Q1.jsonl \
  --from "2026-03-15" --to "2026-12-31" \
  --out ops/ouqis/pilots/data/pilot_summary_latest.json
```

## Risk Budgets

| Risk | Max turns (effective) | Max tool calls | Behavior |
|------|----------------------|----------------|----------|
| `low` | 10 | ~20 | Cosmetic fix, 1-3 line change |
| `medium` | 20 | ~40 | Logic fix in 1-2 files |

## Critical Rules

- **NEVER** skip Gate 1 or Gate 2 — they are mandatory safety checks
- **NEVER** modify files outside the Affected Files list
- **NEVER** touch forbidden paths (migrations, auth, ai-system, workflows)
- **NEVER** push directly to `dev` — always use `codex/ouqis-patch-<N>` branch
- **ALWAYS** create a PR for human review
- **ALWAYS** comment on the issue with the result (success or failure)
- **ALWAYS** log the run via `log_run.sh`
- If Gate 2 fails, reset the branch and do NOT retry automatically
- The fix should be **surgical** — if it requires > 3 files, reject at Gate 1

## MCP Tools

- `mcp__dart__analyze_files` — Post-fix static analysis

## Delegate To

- If the issue requires > 3 files or is `high` risk → reject, suggest manual fix with `flutter-developer`
- If the issue needs database changes → reject, suggest `backend-dev`
- If the issue needs new tests → note in PR, suggest `testing-agent` follow-up
