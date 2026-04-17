---
name: specifying
description: |
  Converts feature requests into executable specifications published as GitHub Issues
  (single source of truth). Uses `gh issue create` with label `spec`. Optionally
  leaves a thin stub in `docs/specs/` linking to the issue.
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
- **`AGENTS.md` + ADRs** = project standards (not feature specs).

Rationale: aligns with Anthropic's recommended Codex + GitHub flow
(`@claude` mentions on issues, `anthropics/claude-code-action`, PRs that close
issues). See `docs/architecture/ARCHITECTURE.md` if a workflow file is installed.

## Workflow

### Phase 1: Understand
1. Read feature request / conversation context
2. Identify affected systems (frontend, backend, both)
3. Map to existing architecture patterns

### Phase 2: Research
1. Find related existing code (`Glob`, `Grep`)
2. Check relevant ADRs in `docs/02-architecture/decisions/`
3. Identify models, services, components affected
4. Search existing issues with `gh issue list --label spec --search "<keyword>"`
   to avoid duplicates

### Phase 3: Structure
1. Define user flows (happy path + edge cases)
2. List acceptance criteria (testable assertions)
3. Identify data model changes
4. Map permission requirements (RBAC)

### Phase 4: Publish as GitHub Issue (primary artifact)

1. Render body from `TEMPLATE.md`
2. Write body to a temp file (do NOT commit it)
3. Create issue:

   ```bash
   gh issue create \
     --title "[SPEC] <Feature Name>" \
     --label "spec,needs-tech-validation" \
     --body-file /tmp/spec-body.md
   ```

4. Capture returned issue number `#N` and URL
5. Report both to user

### Phase 5 (optional): Thin stub in repo

If the feature warrants discoverability from the repo tree, create
`docs/specs/SPEC_[FEATURE_NAME].md` with ONLY:

```markdown
# Spec: [Feature Name]

Source of truth: [#N](https://github.com/weppa-cloud/bukeer-studio/issues/N)

Status, acceptance criteria, flows and edits live in the issue. Do not duplicate here.
```

Skip this step for small/medium specs — the issue alone is enough.

### Phase 6: Validate
1. Cross-reference with ADRs for compliance
2. Verify no architectural violations
3. Link related issues via `Relates to #X` in body
4. Present issue URL to user for approval

## Update flow (spec edits after creation)

Edits happen on the issue. Two paths:

- **GitHub UI** — for small edits, comments, discussion
- **`gh issue edit N --body-file updated.md`** — for structural rewrites

Never re-run `specifying` to "recreate" a spec that already has an issue.
Use `gh issue edit` or comment instead.

## Boundary with tech-validator

- **specifying** produces a GitHub Issue (source of truth, persistent)
- **tech-validator MODE:PLAN** validates the spec — post TVB as a comment on the
  same issue (`gh issue comment N --body-file tvb.md`) + add label `tvb`
- **tech-validator MODE:TASK** produces ephemeral brief in conversation
- Order: `specifying` → issue `#N` → `tech-validator PLAN` comments on `#N`
  → implementation PR with `Closes #N`

## Label conventions

| Label | When |
|-------|------|
| `spec` | Always on spec issues |
| `needs-tech-validation` | After creation, until `tech-validator PLAN` runs |
| `tvb` | After TVB comment posted |
| `area:<domain>` | Optional scoping (e.g. `area:editor`, `area:theme`) |

## ADRs Relevantes

Cross-reference ADRs relevant to the feature domain. Check
`docs/02-architecture/decisions/` for the full list. Common spec-relevant ADRs:

| ADR | Topic |
|-----|-------|
| ADR-012 | Modal feedback semantics |
| ADR-015 | AppServices pattern |
| ADR-022 | Auth token boundary |
| ADR-035 | Pagination |
| ADR-036 | Dual-layer testing surface |

## L10N Rule

All user-visible text in specs must note localization requirements. Reference
`lib/l10n/app_es.arb` for existing keys (cross-repo with bukeer-flutter).
