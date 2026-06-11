# ADR-NF-009 — Admin Next Copy Lives in an i18n Contract

**Status:** Accepted  
**Date:** 2026-06-11  
**Scope:** Bukeer Next Evolucion, Fase 0 (#613)  
**Related:** [[ADR-019]], [[ADR-021]], [[ADR-NF-005]]

## Context

Bukeer serves multilingual agencies and the Evolucion UI will ship copy-heavy operational surfaces. Hardcoded JSX copy makes translation, testing and agent selectors brittle.

## Decision

Admin Next user-facing copy is centralized in a typed copy contract.

1. Component JSX cannot introduce new hardcoded user-facing strings.
2. Copy formatters live in the contract for derived labels.
3. Tests cover critical keys and formatters.
4. Future locale resolution can swap the contract without rewriting components.

## Consequences

- Translation work has a concrete source.
- Test ids remain stable while visible copy changes.
- The guardrail can enforce zero hardcoded copy in Admin Next.

## Verification

- `npm run admin-next:validate:evolucion` returns `hardcodedCopyCounts={}`.
- Unit tests for `adminNextCopy` keys and formatters.

