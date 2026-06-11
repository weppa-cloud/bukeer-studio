# ADR-NF-005 — Stable data-testid Contract for Agent Verification

**Status:** Accepted  
**Date:** 2026-06-11  
**Scope:** Bukeer Next Evolucion, Fase 0 (#613)  
**Related:** [[ADR-023]], [[ADR-NF-009]], [[ADR-NF-010]]

## Context

The implementation is expected to run through long agent sessions with Playwright evidence. Selectors based on text or visual hierarchy break when copy is translated or layout evolves.

## Decision

All interactive Bukeer Next controls must expose stable `data-testid` values.

1. Use domain-oriented names, not visual names.
2. Dynamic lists include stable entity ids when possible.
3. `data-testid` is required on buttons, links and command controls in Admin Next.
4. Tests should prefer `data-testid` over visible copy.

## Consequences

- Agents can verify behavior after copy/i18n changes.
- Playwright evidence remains stable across visual refactors.
- The Evolucion guardrail fails if new Admin Next interactives omit test ids.

## Verification

- `npm run admin-next:validate:evolucion`.
- Playwright smokes using test ids for critical controls.

