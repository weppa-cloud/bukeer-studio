---
name: specifying
description: |
  Converts feature requests into executable specifications with user flows,
  acceptance criteria, and edge cases. Produces docs/specs/SPEC_<name>.md +
  GitHub Epic Issue + child issues (GitHub = SSOT for execution state).
  USE WHEN: requirements need formalization before implementation, feature
  touches 2+ files. NOT FOR: trivial changes or well-defined bug fixes.
---
# Specifying

Transforms feature requests into structured, executable specifications published
as GitHub Issues. Issue is the **single source of truth**. Local MD files are
optional thin stubs for repo-side navigation only.

## Source-of-truth policy

- **GitHub Issue** = canonical spec. Edits happen there. Labels drive workflow.
- **`docs/specs/SPEC_*.md`** = optional stub with 1-line pointer to issue (`See #N`).
  Never duplicate the spec body in the repo — forks desync fast.
- **`CLAUDE.md` + ADRs** = project standards (not feature specs).

Rationale: aligns with Anthropic's recommended Claude Code + GitHub flow
(`@claude` mentions on issues, `anthropics/claude-code-action`, PRs that close
issues). See `docs/architecture/ARCHITECTURE.md` if a workflow file is installed.

**GitHub = SSOT for execution state** (epic + child issues track what ships when).
**Repo = SSOT for spec content** (versioned alongside code in `docs/specs/`).

## Artifact split

| Artifact | Lives in | Role |
|----------|----------|------|
| Spec doc | `docs/specs/SPEC_<name>.md` | What / why / AC / data model (durable) |
| ADR | `docs/architecture/ADR-NNN-<slug>.md` | Arch decision (only if new) |
| Epic Issue | GitHub (label `epic`) | Execution tracker + child task-list |
| Child Issue | GitHub | 1 deliverable → 1 PR |
| PR | GitHub | `Closes #<child-issue>` |

**Rule:** never duplicate content. Spec = _what is_. Epic = _what ships when_.

## Workflow

### Phase 1 — Understand
1. Read feature request + conversation context
2. Identify affected systems (frontend, backend, theme-sdk, contract)
3. Map to existing patterns

### Phase 2 — Research
1. Find related code (`Glob`, `Grep`)
2. Check relevant ADRs in `docs/architecture/`
3. Identify models, services, components touched
4. Search `docs/specs/` — avoid duplicate specs

### Phase 3 — Structure
1. User flows (happy path + edge cases)
2. Acceptance criteria (testable)
3. Data model changes
4. RBAC / permissions
5. Cross-repo impact (bukeer-flutter shared tables)

### Phase 4 — Write spec file
1. Create `docs/specs/SPEC_<FEATURE_NAME>.md` from TEMPLATE.md
2. Leave `GitHub Tracking` fields as `TBD` until Phase 6–7
3. Include `ADRs referenced` list

### Phase 5 — Validate
1. Cross-reference ADRs → no violations
2. If changes arch: run `tech-validator MODE:PLAN`
3. Present spec to user for approval **before** opening GitHub artifacts

### Phase 6 — Open GitHub Epic Issue
1. Template: `ISSUE_TEMPLATES.md` → Epic
2. Body links: spec path + ADRs
3. Labels: `epic`, `type:feat`, `area:<pkg>`, `priority:<pN>`, `size:<s|m|l>`, `needs-tvb`
4. Milestone: current quarter/release
5. Update spec file `Epic Issue` field with `#N` + URL
6. Commit spec update: `docs(spec): link epic #N to SPEC_<name>`

### Phase 7 — Break into child issues
1. For each deliverable in spec → child issue (ISSUE_TEMPLATES.md → Child)
2. Body: `Part of #<epic>`, spec section ref, acceptance, affected files
3. Add child numbers to epic task-list (edit epic body)
4. Labels: same `area:` + `type:feat/fix/chore` + `size:` + `rol:1|rol:2`
5. Mark child `needs-tvb` if non-trivial → tech-validator MODE:TASK will comment TVB

### Phase 8 — Handoff
Output to user (literal format):
```
Spec:    docs/specs/SPEC_<name>.md
Epic:    <url> (#N)
Issues:  #N1, #N2, #N3
Next:    tech-validator MODE:TASK for #N1
```

## Skip GitHub phases when

- User says "just draft the spec, no issues yet"
- Status still `Draft` (discovery)
- Repo missing `epic` label → halt, ask user to bootstrap labels

## Boundary with tech-validator

- **specifying** → writes spec + opens epic/issues (this skill)
- **tech-validator MODE:PLAN** → validates spec vs ADRs (Phase 5)
- **tech-validator MODE:TASK** → per-issue TVB posted as issue comment
- **tech-validator MODE:CODE** → PR review

Bugs / single-file chores → skip specifying, go straight to tech-validator MODE:TASK.

## ADR references (common)

| ADR | Topic |
|-----|-------|
| ADR-001 | Server-first rendering |
| ADR-003 | Contract-first validation |
| ADR-005 | Security defense-in-depth |
| ADR-008 | Monorepo packages |
| ADR-009 | Multi-tenant subdomain routing |
| ADR-012 | API response envelope |
| ADR-013 | tech-validator quality gate |
| ADR-016 | SEO intelligence caching |

Cross-reference relevant ADRs in spec `Dependencies` + epic body.

## L10N
User-visible text in specs must note localization. Reference `lib/l10n/` keys (flutter repo) or Next.js i18n.
