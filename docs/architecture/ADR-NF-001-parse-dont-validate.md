# ADR-NF-001 — Parse, Don't Validate for Bukeer Next Boundaries

**Status:** Accepted  
**Date:** 2026-06-11  
**Scope:** Bukeer Next Evolucion, Fase 0 (#613)  
**Related:** [[ADR-003]], [[ADR-012]], [[ADR-NF-002]]

## Context

Bukeer Next will run beside the existing Flutter app while sharing Supabase data and auth. Runtime data can come from fixtures, readonly Supabase adapters, route handlers, agent ledgers, and future mutation APIs. If components merely "check" shapes inline, each module can drift and agents lose a stable contract.

## Decision

All data entering Bukeer Next module boundaries must be parsed into typed contracts before use.

1. Use existing package contracts such as `@bukeer/admin-contract` where available.
2. Route handlers and adapters must parse request, response and database payloads at the boundary.
3. UI components receive already-shaped view models; they do not defend against raw Supabase rows.
4. Parse failures are explicit errors or safe not-found/redirect outcomes, not partial rendering.

## Consequences

- Agents can reason from contracts instead of hunting defensive UI checks.
- Supabase shape drift is detected near the adapter.
- Tests should target parsers/adapters as well as rendered surfaces.

## Verification

- Unit tests for adapter parse paths.
- TypeScript `tsc --noEmit`.
- Route/page tests for failed auth/data preconditions.

