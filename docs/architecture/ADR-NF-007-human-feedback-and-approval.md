# ADR-NF-007 — Human Feedback and Approval Boundary

**Status:** Accepted  
**Date:** 2026-06-11  
**Scope:** Bukeer Next Evolucion, Fase 0 (#613)  
**Related:** [[ADR-NF-004]], [[ADR-NF-011]], [[ADR-NF-012]]

## Context

Evolucion introduces AI-assisted workbench surfaces. Suggestions, draft actions and public sends must not blur into production execution without human review.

## Decision

AI and automation surfaces use an explicit human feedback/approval boundary.

1. Suggestions are non-authoritative until a permitted user approves them.
2. Draft actions must show required human action, trace id and production-write status.
3. Public sends, payments, reservations and confirmations require explicit approval.
4. Rejection and feedback are first-class outcomes, not errors.

## Consequences

- The UI can be AI-first without becoming uncontrolled automation.
- Audit and support can see why an action was blocked or approved.
- Future mutations need approval state and trace evidence.

## Verification

- Component tests for blocked/approved/rejected UI states.
- Route tests for approval-required server paths before writes.

