# docs-keeper — CORRELATION mode reference

Finds gaps between code/commit activity and documentation. Runs git signals
against the docs graph and emits a prioritized gap report with suggested
stubs so the team (or owning skill) can close the gap.

---

## Inputs

| Input | Example | Meaning |
|-------|---------|---------|
| `--since=<range>` | `2w`, `1m`, `2026-04-01` | git log since this point |
| `--until=<range>` | `HEAD`, `main` | optional upper bound |
| `--prs=<ids>` | `122,128,135` | specific PRs (uses `gh pr view`) |
| `--paths=<globs>` | `app/api/**,supabase/functions/**` | narrow scope |
| default | `--since=2w` | 2-week rolling window |

---

## Signal → expected-doc map

| Signal (touched path / commit shape) | Expected doc artifact | Template |
|--------------------------------------|------------------------|----------|
| New `app/api/**/route.ts` | ADR or SPEC section covering the route + API doc | [TEMPLATES.md#api](./TEMPLATES.md) |
| New `app/site/**/page.tsx` | SEO/runbook entry if public | [TEMPLATES.md#runbook](./TEMPLATES.md) |
| New Edge Function `supabase/functions/**` | Runbook + env vars | TEMPLATES.md#runbook |
| New migration `supabase/migrations/**` | ADR if schema change touches RLS / multi-tenant; else note in `docs/ops/` | ADR template if structural |
| New `components/sections/**` + `SECTION_TYPES` entry | Section registry note + website-section-generator skill entry | — |
| New `packages/*/src/**` export | Update `packages/*/README.md` + `@bukeer/*` reference in INDEX | — |
| New ADR file `docs/architecture/ADR-*.md` | Must appear in `docs/INDEX.md` (use MODE:WIKI) | — |
| New SPEC file `docs/specs/SPEC_*.md` | Must reference a GitHub Issue (source of truth) | [TEMPLATES.md#spec-stub](./TEMPLATES.md) |
| Commit subject matches `feat(scope)` with no doc change | Confirm scope has a doc; if not, propose stub | scope-specific |
| Commit subject matches `fix(scope)` with behavior change | Update runbook/ADR §Known gaps if semantics changed | — |
| Commit touches `lib/ai/prompts/**` | Update AI section of the relevant spec | — |
| Commit touches `middleware.ts` | Must cite `[[ADR-009]]` + `[[ADR-011]]` in commit or doc | — |
| Commit touches `lib/supabase/**` | Verify `[[ADR-005]]` coverage if auth/RLS is involved | — |
| New `.github/workflows/**` | `docs/ops/` entry describing the gate + failure modes | — |
| New env var in `lib/env.ts` | Update env-vars table in `AGENTS.md` + relevant ADR/SPEC | — |

---

## Workflow

### 1. Collect

```bash
SINCE="${SINCE:-2 weeks ago}"

git log --since="$SINCE" \
  --pretty=format:'%H%x09%s%x09%an%x09%ad' \
  --date=short > /tmp/git-commits.tsv

git log --since="$SINCE" --name-only --pretty=format:'%H' \
  | awk '/^[0-9a-f]{40}$/{sha=$0} /\.(ts|tsx|md|sql|json)$/{print sha"\t"$0}' \
  > /tmp/git-files.tsv
```

### 2. Classify

For each unique (sha, path) pair, apply the Signal map above to produce a list of `(change, expected-doc)` tuples.

### 3. Check docs

For each expected-doc tuple:

- Grep `docs/` and `.agents/` for references to the new symbol, path, route name, or env var.
- If found → **covered**, note the doc path.
- If not found → **gap**, record with severity:
  - **high** — security / auth / RLS / multi-tenant / migration / new public route.
  - **medium** — new feature, new API route, new section type, new skill.
  - **low** — internal refactor, helper fn, typing-only change.

### 4. Emit report

`reports/docs-correlation-YYYY-MM-DD.md`:

```markdown
# Correlation Report — YYYY-MM-DD

**Range:** --since=<SINCE> ..<UNTIL>
**Commits scanned:** N
**Files scanned:** N
**Gaps:** high=N medium=N low=N

## High-severity gaps

### <change title>
- **Commit:** <sha> — <subject>
- **Path(s):** <files>
- **Expected doc:** <target path / section>
- **Why it matters:** <one-line rationale>
- **Suggested stub:**
  ```markdown
  # <Title>
  **Status:** Draft
  **Date:** YYYY-MM-DD
  **Linked PR:** #NNN

  ## Context
  ...
  ```
- **Owning skill:** <nextjs-developer / backend-dev / specifying>
- **Next action:** `docs-keeper MODE:WIKI` after stub written.

## Medium-severity gaps
...

## Low-severity gaps (summary only)
- `<sha>` — <subject> — no doc expected.

## Covered (for confidence)
- <sha> — <subject> — doc at <path>.

## Fix plan
1. Assign high-severity stubs to owning skills.
2. Create draft stubs in the suggested locations.
3. Run `docs-keeper MODE:WIKI` to index.
4. Run `docs-keeper MODE:AUDIT:wiki` to verify.
```

### 5. Propose stubs (optional)

With `--propose-stubs`, write minimal skeleton files to `docs/**/DRAFT-<title>.md` and add an `# UNINDEXED` header comment. Caller reviews, edits, then MODE:WIKI integrates them.

---

## Heuristics that reduce noise

- Ignore commits with subjects starting with `chore(deps)`, `ci(`, `docs(`, `style(` unless `--include-chore`.
- Group multiple commits touching the same feature file into one gap entry.
- Skip files under `node_modules/`, `.next/`, `.open-next/`, `playwright-report/`, `test-results/`, `dist/`, `build/`.
- Files in `docs/archive/` never trigger gaps.

---

## Integration with tech-validator

The tech-validator skill emits `reports/tech-validator/latest.json`. When that file exists and has non-empty `violations`, CORRELATION mode pulls those violations and treats each as a signal:

```
violation.rule=ADR-003-missing-zod → gap: SPEC/ADR should mention Zod contract
violation.rule=ADR-007-edge-incompatible → gap: runbook should note runtime
violation.rule=ADR-011-missing-cache-strategy → gap: view-specific runbook entry
```

---

## Memory sync

If CORRELATION finds that the repo introduces a new cross-cutting concept
(new package, new domain, new infrastructure dep), propose a memory update:

```markdown
# suggested memory update (project_knowledge_graph.md)
- New concept: <name>
- First seen: <sha> <date>
- Docs gap: <expected-doc-path>
```

Human approves before writing memory.

---

## Output contract

Always emit: report path + high-severity count + next recommended mode
(`WIKI` if new artifacts exist; `REORGANIZE` if misplaced; else no-op).
