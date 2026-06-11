# ADR-NF-004 — RBAC Is Enforced Server-Side

**Status:** Accepted  
**Date:** 2026-06-11  
**Scope:** Bukeer Next Evolucion, Fase 0 (#613)  
**Related:** [[ADR-005]], [[ADR-NF-002]], [[ADR-NF-007]]

## Context

Bukeer roles and permissions control operational actions: approvals, itinerary changes, supplier edits, payments, media and public sends. Hiding buttons in the UI is not enough.

## Decision

RBAC checks must run at the server boundary before data access or mutation.

1. Page loaders verify module access before rendering protected views.
2. Route handlers verify permission before reading privileged data or accepting requests.
3. UI affordances may hide unavailable actions, but that is secondary.
4. Denied actions return explicit blocked/denied outcomes with audit-ready evidence.

## Consequences

- Bypassing the UI cannot bypass permissions.
- Future write APIs can be audited consistently.
- Tests must cover denied and allowed server paths.

## Verification

- Page and route tests for denied roles.
- Playwright smoke only marks a flow complete after server-denied cases are covered.

