# ADR-NF-002 — Server-Side Shared Supabase Session Boundary

**Status:** Accepted  
**Date:** 2026-06-11  
**Scope:** Bukeer Next Evolucion, Fase 0 (#613)  
**Related:** [[ADR-005]], [[ADR-NF-004]], weppa-cloud/bukeer-flutter#851

## Context

The Evolucion frontend must coexist with Flutter and use the same Supabase identity. A client-only auth check would create a visible UI gate but not a secure boundary for readonly data, handoff APIs, approvals or future writes.

## Decision

Bukeer Next auth is server-first.

1. Pages and route handlers use `@supabase/ssr` server clients and server session context.
2. Protected routes redirect unauthenticated users before rendering operational UI.
3. Missing role or feature flags return `notFound()` or a denied response server-side.
4. Client components receive an authenticated session view model, never raw Supabase credentials.

## Consequences

- Flutter and Next share identity without duplicating auth stores.
- Protected data paths remain closed if JavaScript is bypassed.
- Local fixture smoke routes must be explicitly gated and disabled in production unless enabled for smoke.

## Verification

- Page tests for unauthenticated redirect, role denial and allowlisted readonly mode.
- Live validation with a real shared Supabase session before Fase 0 closure.

