# ADR-NF-012 — Media Uses the Canonical Registry Boundary

**Status:** Accepted  
**Date:** 2026-06-11  
**Scope:** Bukeer Next Evolucion, Fase 0 (#613)  
**Related:** [[ADR-028]], [[ADR-NF-001]], weppa-cloud/bukeer-flutter#851

## Context

Flutter and Studio share media across products, websites, avatars, blogs, galleries and package kits. Next must not create a second media truth while Evolucion modules are rebuilt.

## Decision

Bukeer Next uses `public.media_assets` as the canonical media registry boundary.

1. Upload and selection flows register or reference media assets.
2. Legacy public URL fields remain compatibility projections, not source of truth.
3. Registry failures are telemetry/retry events and must not silently fork media state.
4. Media components carry account, website, entity and usage context when known.

## Consequences

- Flutter, Studio and Next share reusable media assets.
- Future media library features can be cross-repo.
- Migration work must respect ADR-028 instead of adding route-specific image fields.

## Verification

- Media changes cite [[ADR-028]] and include registry-aware tests.
- No Next media write flow is complete without registry registration evidence.

