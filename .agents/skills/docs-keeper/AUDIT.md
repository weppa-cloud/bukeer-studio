# docs-keeper — AUDIT mode reference

Quality, freshness, and integrity audit. Produces a report with a fix plan.
Never auto-fixes — that is REORGANIZE / WIKI / GENERATE's job.

---

## Scopes

| Scope | Input | Covers |
|-------|-------|--------|
| `all` | — | `docs/**`, `.agents/rules/**`, `.agents/skills/**`, `AGENTS.md` |
| `path:<dir>` | path | subset of docs tree |
| `recent:<N>d` | days | files with mtime < N days |
| `wiki` | — | INDEX.md integrity + wikilink resolution only |
| `links` | — | all markdown links + wikilinks resolve check |
| `freshness` | — | Status/Date header staleness only |

---

## Checklist

### A. Structural

- [ ] Every `.md` in `docs/` (excluding `docs/archive/`) listed in `docs/INDEX.md`.
- [ ] Every `.md` in `.agents/skills/` is owned by a `SKILL.md` entry.
- [ ] Every `.agents/rules/*.md` referenced in `AGENTS.md` or a skill.
- [ ] No `.md` in repo root outside allow-list (`README, CLAUDE, CONTRIBUTING, LICENSE, AGENTS`).

### B. Link integrity

- [ ] Every `[text](path.md)` resolves (relative to source file).
- [ ] Every `[[Token]]` wikilink has a resolution entry in `docs/INDEX.md` or a matching filename stem in `docs/**`.
- [ ] External URLs (excluded by default) can be opt-in with `audit --check-urls`.

### C. Freshness thresholds

| Artifact | Threshold | Action |
|----------|-----------|--------|
| ADR `Status: Accepted` | 90 days | Flag (review + confirm still accurate) |
| ADR `Status: Proposed` | 30 days | Flag (decide or archive) |
| SPEC `Status: Draft` | 30 days | Flag (progress or close) |
| SPEC `Status: Ready for execution` | 14 days | Flag (either shipping or stalled) |
| Runbook | 180 days | Flag (verify still works) |
| Research / evidence | — | Never stale — historical record |

### D. Content quality

- [ ] File has `Status:` and `Date:` in first 10 lines.
- [ ] Date is absolute (`YYYY-MM-DD`), not relative.
- [ ] H1 → H2 → H3 hierarchy, no skips.
- [ ] No H1 after line 1 (one H1 per file).
- [ ] Fenced code blocks have a language tag.
- [ ] File < 500 lines OR has TOC.
- [ ] No orphan images (image file exists + has alt text).

### E. Consistency

- [ ] Section-type strings use `SECTION_TYPES` from `@bukeer/website-contract` (no hardcoded strings).
- [ ] Theme fields use `{ tokens, profile }` shape (not flat `{ seedColor }`).
- [ ] Package kit category strings use Spanish capitalized: `'Hoteles'`, `'Servicios'`, `'Transporte'`, `'Vuelos'`.
- [ ] ADR status vs linked GitHub Issue state (via `gh issue view <id>`).

### F. LLM effectiveness (Karpathy Wiki pattern)

- [ ] `docs/INDEX.md` exists and is reachable from `AGENTS.md`.
- [ ] Wikilinks used in prose refs to ADRs/specs (not bare tokens).
- [ ] Concept graph has at least one incoming wikilink per concept cluster.
- [ ] Resolution table covers every wikilink used in prose.

---

## Report template

`reports/docs-audit-YYYY-MM-DD.md`:

```markdown
# Docs Audit — YYYY-MM-DD

**Scope:** <scope>
**Run by:** docs-keeper MODE:AUDIT
**Baseline:** INDEX.md last updated YYYY-MM-DD — N wikilinks

## Summary

| Category | Count | Severity |
|----------|-------|----------|
| Orphan docs | N | medium |
| Stale (>90d) | N | low |
| Broken links | N | high |
| Missing Status/Date | N | medium |
| Unresolved wikilinks | N | high |
| Quality warnings | N | low |

## High-severity items

### Broken links
| Source | Target | Reason |
|--------|--------|--------|

### Unresolved wikilinks
| Wikilink | Used in | Suggested resolution |
|----------|---------|---------------------|

## Medium-severity

### Orphan docs
| File | Suggested section in INDEX.md |
|------|-------------------------------|

### Missing Status/Date
| File | Missing field |
|------|---------------|

## Low-severity

### Stale
| File | Last updated | Days stale |
|------|--------------|------------|

### Quality warnings
| File | Issue |
|------|-------|

## Fix plan

1. <MODE> — <files> — <reason>
2. ...

## Verification command

```bash
<one-liner to re-run the failing check>
```
```

---

## Automation hooks

Suggested CI integration (do not ship without human review):

```yaml
# .github/workflows/docs-audit.yml (template, not yet adopted)
name: docs audit
on:
  pull_request:
    paths: ['docs/**', '.agents/**', 'AGENTS.md']
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check orphan docs
        run: |
          # fails if a docs/*.md is not listed in docs/INDEX.md
          bash .github/scripts/check-orphan-docs.sh
      - name: Check broken wikilinks
        run: |
          bash .github/scripts/check-wikilinks.sh
```

Scripts referenced above do not yet exist — CORRELATION mode may propose them.

---

## Exit codes for the report (when run as a script)

- `0` — clean, no high-severity issues.
- `1` — high-severity issues present (broken links, unresolved wikilinks, missing INDEX entry).
- `2` — medium-severity only (stale drafts, orphan docs).

Low-severity does not fail the gate.
