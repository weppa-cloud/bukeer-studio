# ADR-NF-010 — Feature Flags and Kill Switches Guard Next Adoption

**Status:** Accepted  
**Date:** 2026-06-11  
**Scope:** Bukeer Next Evolucion, Fase 0 (#613)  
**Related:** [[ADR-005]], [[ADR-NF-002]], [[ADR-NF-008]]

## Context

Next will run in parallel with Flutter while modules graduate from prototype to readonly to operational mode. A bad preview or beta path must be disabled without redeploying Flutter.

## Decision

Every Bukeer Next module ships behind explicit flags and kill switches.

1. Prototype routes require an Admin Next beta flag.
2. Smoke-only routes are disabled in production unless explicitly enabled.
3. Data source mode is configurable (`fixture`, `readonly`, future write modes).
4. Rollback means disabling flags before reverting code.

## Consequences

- Fase rollout can be incremental and reversible.
- Production safety is not tied only to branch deployment.
- Tests must cover flag-off behavior.

## Verification

- Page tests for `notFound()`/redirect when flags are off.
- Smoke commands set only the flags needed for the smoke route.

