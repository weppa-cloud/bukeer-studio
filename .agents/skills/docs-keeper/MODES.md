# docs-keeper — Modes

Detailed workflow per mode. SKILL.md dispatches here.

---

## MODE: REORGANIZE

**Input:** list of files, directory, or "scan-root".
**Goal:** move misplaced files; keep root clean; update `docs/INDEX.md`.

### Workflow

1. **Scan**
   - `ls` root + `docs/` to detect files outside the allow-list.
   - Flag any `.md` in repo root not in `{README, CLAUDE, CONTRIBUTING, LICENSE, AGENTS}`.
   - Flag any `docs/` file missing from `docs/INDEX.md`.
2. **Classify** each offender using [STRUCTURE.md](./STRUCTURE.md) placement rules.
3. **Propose moves** in a single batch. Show: `current → target` list. Get human approval if >3 moves.
4. **Execute** with `git mv` (preserves history). Never `rm`.
5. **Patch references**
   - Update internal links `[txt](old/path.md)` → `[txt](new/path.md)` across `docs/`, `.agents/`, `AGENTS.md`.
   - Update wikilinks targets in `docs/INDEX.md` resolution table.
6. **Update INDEX.md**
   - Add moved files to correct section table.
   - Remove stale entries.
7. **Emit summary + verification command.**

### Guardrails

- Never move `AGENTS.md`, `AGENTS.md`, `.agents/**`, `packages/**/README.md`.
- Never move across repos (bukeer-studio vs bukeer-flutter).
- If a moved file is referenced in a GitHub Issue body, flag but do not edit the issue.

---

## MODE: AUDIT

**Input:** scope = `all` | `path:docs/specs` | `recent:30d` | `wiki`.
**Goal:** surface quality / freshness / integrity issues. Produce a fix plan.

### Checks (in order)

1. **Structural**
   - Every file in `docs/` listed in `docs/INDEX.md`? (orphan check)
   - Every wikilink `[[X]]` resolves? (cross-ref `docs/INDEX.md` resolution table)
   - Every markdown link `[txt](path)` points to an existing path?
2. **Freshness**
   - Files with `Status: Accepted/Shipped` + `Last updated` > 90 days → flag.
   - Files with `Status: Draft` > 30 days → flag (decision rotted).
   - Relative dates in prose ("last week", "soon") → flag.
3. **Quality (LLM-first)**
   - Missing `Status:` / `Date:` header.
   - H-level skips (H1 → H3).
   - Files > 500 lines without TOC.
   - Fenced code blocks without language.
   - Duplicated titles across files.
4. **Consistency**
   - ADR status vs GitHub Issue state (if linked).
   - SPEC status vs linked GitHub Issue state.
   - Section-type refs use `SECTION_TYPES` not hardcoded strings (see AGENTS.md rule).

### Output

Markdown report `reports/docs-audit-YYYY-MM-DD.md`:

```markdown
# Docs Audit — 2026-04-17

## Summary
- Orphans: N
- Stale (>90d): N
- Broken links: N
- Quality warnings: N

## Orphans
| File | Suggestion |
|------|------------|
...

## Broken links
| Source | Target | Status |
...

## Fix plan
1. ...
```

Never auto-fix in AUDIT. Propose, then caller triggers REORGANIZE / WIKI.

See [AUDIT.md](./AUDIT.md) for full checklist + thresholds.

---

## MODE: CORRELATION

**Input:** git range (`--since=2w`, `--since=<sha>`, or PR list).
**Goal:** find features/changes merged without matching docs.

### Workflow

1. **Collect signals**
   ```bash
   git log --since="$SINCE" --pretty=format:'%H %s' --name-only
   ```
2. **Classify commits** (using subject prefix + touched paths):
   - `feat(...)` / new `app/` route / new `components/site/*` → candidate for runbook or spec trace.
   - `fix(...)` with behavior change → update existing doc or skip.
   - New API route `app/api/**/route.ts` → must have entry in an ADR/SPEC or new `docs/api/*`.
   - New Edge Function `supabase/functions/**` → must have runbook.
   - New ADR `docs/architecture/ADR-*` → must appear in `docs/INDEX.md` (check WIKI state).
   - New SPEC `docs/specs/SPEC_*` → must reference GitHub Issue.
   - New package section type → must have `SECTION_TYPES` entry + example.
3. **Match vs docs** — grep repo docs for the new symbol / path / feature name.
4. **Emit gap report**
   ```markdown
   # Correlation report — 2026-04-17 (range: --since=2w)

   ## Undocumented
   | Change | Commit | Expected doc | Suggested template |
   |--------|--------|--------------|--------------------|
   | New POST /api/seo/suggest | abc1234 | API or SPEC section | TEMPLATES.md#api |
   | ADR-017 added | def5678 | INDEX.md missing row | MODE:WIKI |
   ...
   ```
5. **For each gap, propose minimal stub** (title + 5-line skeleton) and ask the caller or the owning skill to fill.

### Signals beyond git

- `npm run build` output errors citing missing types → hint for missing contract doc.
- `reports/tech-validator/latest.json` violations → hint for missing ADR coverage.
- `TODO(docs):` inline comments → direct doc debt.

See [CORRELATION.md](./CORRELATION.md) for full mapping table.

---

## MODE: WIKI

**Input:** new artifact path, or "full-refresh".
**Goal:** keep `docs/INDEX.md` accurate; wikilink prose refs; update concept graph.

### Workflow (new artifact)

1. **Identify artifact class** (ADR / SPEC / runbook / ops / seo / theming / growth / qa).
2. **Update `docs/INDEX.md`**
   - Append row to the class table.
   - Append or extend matching concept-graph section (which concepts this artifact touches).
   - Append resolution-table row mapping `[[ArtifactName]]` → full path.
3. **Wikilink pass**
   - Grep repo for prose references to the artifact.
   - Where text says "ADR-017" in prose (not inside a markdown link), replace with `[[ADR-017]]`.
   - Do NOT touch existing `[ADR-017](...)` markdown links.
   - Do NOT touch self-title H1 of the artifact itself.
4. **Backlink check** — every concept mentioned must appear in concept graph section; add if missing.
5. **Memory sync** — if a new cross-cutting concept is introduced, update `memory/project_knowledge_graph.md`.

### Workflow (full-refresh)

1. Rebuild `docs/INDEX.md` from scratch by scanning `docs/` + `.agents/rules/`.
2. Diff old vs new; require human approval before overwrite.
3. Run wikilink pass repo-wide.
4. Archive the previous INDEX as `docs/archive/INDEX-YYYY-MM-DD.md`.

See [WIKI.md](./WIKI.md) for INDEX.md section templates + wikilink conventions.

---

## Mode composition

Common sequences:

- **Post-merge hygiene:** `CORRELATION` → `WIKI` → `AUDIT`.
- **New ADR:** `WIKI` (always).
- **Release prep:** `AUDIT:all` → fix → `WIKI:full-refresh` (if major).
- **Onboarding cleanup:** `REORGANIZE` → `AUDIT:all` → `WIKI:full-refresh`.

Always end with an `AUDIT:wiki` quick scan to confirm graph integrity.
