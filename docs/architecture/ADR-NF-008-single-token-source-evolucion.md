# ADR-NF-008 — Evolucion Theme Tokens Are the Single Visual Source

**Status:** Accepted  
**Date:** 2026-06-11  
**Scope:** Bukeer Next Evolucion, Fase 0 (#613)  
**Related:** [[ADR-027]], [[ADR-NF-010]], weppa-cloud/bukeer-flutter#851

## Context

The Evolucion line comes from a high-fidelity handoff and `EVOLUCION_PRESET` in `theme-sdk`. Hardcoded colors or parallel token maps would quickly diverge from Flutter and the handoff.

## Decision

Bukeer Next consumes Evolucion through `compileTheme()` and CSS variables only.

1. `EVOLUCION_PRESET` access is isolated to the server bridge.
2. Client components receive compiled CSS variables, not theme SDK internals.
3. No hardcoded hex is allowed in Admin Next implementation files.
4. Dark mode is supported from the first shell iteration.

## Consequences

- Flutter, Studio and handoff stay visually aligned.
- Theme changes can be validated through the bridge.
- Guardrails can detect token drift mechanically.

## Verification

- `npm run admin-next:validate:evolucion`.
- Theme bridge tests for slug, hash and CSS variable aliases.
- Playwright smoke verifies light/dark render and contrast.

