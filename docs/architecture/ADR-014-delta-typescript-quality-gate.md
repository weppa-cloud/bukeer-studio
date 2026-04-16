# ADR-014 — Delta TypeScript Quality Gate for Tech Validator

**Status:** Accepted  
**Date:** 2026-04-15  
**Principles:** P2 (Validate at Boundaries), P10 (Minimal Client Bundle)

## Context

`tech-validator` already enforces architectural checks and a TypeScript quality gate, but the repository contains known legacy debt outside the current EPIC scope. A global `npx tsc --noEmit` gate is useful for full hardening, yet it is too strict for day-to-day EPIC closure work when the change set is intentionally scoped.

The validation workflow needs two distinct behaviors:

1. A default gate that blocks only on new TypeScript diagnostics attributable to the changed-file scope.
2. An explicit strict mode that restores the full-repo TypeScript check for hardening or cleanup campaigns.

## Decision

Keep ADR-013 intact and extend the validator with a scope-aware TypeScript policy:

- **Default mode:** analyze the repository with `npx tsc --noEmit`, classify diagnostics into `legacy_errors` and `new_errors`, and fail only when `new_errors > 0`.
- **Strict mode (TypeScript-only):** `--strict-global` (or `npm run tech-validator:code:strict`) runs global `npx tsc --noEmit` and fails on any TypeScript diagnostic, while skipping lint/build to avoid unrelated legacy blockers.
- **Strict full mode:** `--strict-global-full` (or `npm run tech-validator:code:strict:full`) keeps the full CODE gate (`tsc + lint + build`) for broad hardening campaigns.
- **Fallback mode:** `--legacy-global-only` preserves the older full-repo failure behavior for compatibility.

### Report contract

The validator report must expose:

- `legacy_errors`
- `new_errors`
- `total_errors`
- the selected typecheck mode

This allows audits and CI logs to distinguish true regressions from pre-existing repository debt.

## Consequences

### Positive

- EPIC closures are no longer blocked by unrelated legacy TypeScript debt.
- Full-repo hardening remains available on demand.
- The validator output becomes more actionable because it separates new regressions from pre-existing errors.

### Negative

- The default gate is less strict than a global `tsc` run.
- Classification depends on changed-file scope, so some transitive issues may still require manual review.

### Mitigations

- Keep `--strict-global` for TypeScript hardening and `--strict-global-full` for full-repo campaigns.
- Preserve `--legacy-global-only` as an escape hatch while the repo is being normalized.
- Use the validator report counts to track debt burn-down over time.

## Alternatives Considered

1. **Keep only global `tsc --noEmit`:** rejected because it blocks scoped EPIC work on unrelated debt.
2. **Skip TypeScript validation entirely:** rejected because it removes an important correctness gate.
3. **Use a separate allowlist of legacy files:** rejected because it is harder to maintain than a scope-aware classification model.
