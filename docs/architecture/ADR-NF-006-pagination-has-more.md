# ADR-NF-006 — Pagination Uses has_more Over Count-Only Inference

**Status:** Accepted  
**Date:** 2026-06-11  
**Scope:** Bukeer Next Evolucion, Fase 0 (#613)  
**Related:** [[ADR-007]], [[ADR-011]], [[ADR-NF-001]]

## Context

Bukeer operational modules can list contacts, products, itineraries, payments, reports and agent evidence. Full counts are expensive and can be stale at edge/runtime boundaries.

## Decision

Paginated APIs and adapters expose `items`, `cursor` or `page`, and `has_more`.

1. Do not infer availability only from total count.
2. Use limit-plus-one or provider-native pagination to determine `has_more`.
3. UI copy and disabled states must reflect `has_more`.
4. Exact totals are optional metadata, not the source of navigation truth.

## Consequences

- Lists remain fast and edge-friendly.
- Realtime or changing datasets avoid misleading total-count behavior.
- Tests should cover last page and empty page behavior.

## Verification

- Adapter tests for `has_more`.
- Playwright list smokes when Fase 1/Fase 2 modules ship.

