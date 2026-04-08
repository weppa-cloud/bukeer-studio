---
name: specifying
description: |
  Converts feature requests into executable specifications with user flows,
  acceptance criteria, and edge cases. Produces docs/specs/SPEC_[name].md.
  USE WHEN: requirements need formalization before implementation, feature
  touches 2+ files. NOT FOR: trivial changes or well-defined bug fixes.
---
# Specifying

Transforms feature requests into structured, executable specifications.

## Workflow

### Phase 1: Understand
1. Read the feature request / conversation context
2. Identify affected systems (frontend, backend, both)
3. Map to existing architecture patterns

### Phase 2: Research
1. Find related existing code (`Glob`, `Grep`)
2. Check relevant ADRs in `docs/02-architecture/decisions/`
3. Identify existing models, services, and components that will be affected

### Phase 3: Structure
1. Define user flows (happy path + edge cases)
2. List acceptance criteria (testable assertions)
3. Identify data model changes
4. Map permission requirements (RBAC)

### Phase 4: Write Spec
1. Create `docs/specs/SPEC_[FEATURE_NAME].md` using template
2. Include: scope, user flows, acceptance criteria, edge cases, data model, permissions

### Phase 5: Validate
1. Cross-reference with ADRs for compliance
2. Verify no architectural violations
3. Present to user for approval

## Output Format

File: `docs/specs/SPEC_[FEATURE_NAME].md`

## Boundary with tech-validator

- **specifying** produces a DOCUMENT in `docs/specs/` (persistent artifact)
- **tech-validator TASK** produces an ephemeral TVB in conversation context
- Use specifying FIRST for complex features, THEN tech-validator TASK for implementation brief

## ADRs Relevantes

Note: When generating specs, cross-reference all ADRs relevant to the feature domain. Check `docs/02-architecture/decisions/` for the full list. Common spec-relevant ADRs:

| ADR | Topic |
|-----|-------|
| ADR-012 | Modal feedback semantics |
| ADR-015 | AppServices pattern |
| ADR-022 | Auth token boundary |
| ADR-035 | Pagination |
| ADR-036 | Dual-layer testing surface |

## L10N Rule
All user-visible text in specs must note localization requirements. Reference `lib/l10n/app_es.arb` for existing keys.
