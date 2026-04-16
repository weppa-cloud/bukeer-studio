# ADR-015 — Resilient Map Rendering and Marker Media Fallback

**Status:** Accepted  
**Implementation Status:** Complete (Destinations v1)  
**Date:** 2026-04-16  
**Principles:** P1, P3, P4, P10

## Context

Destination map views introduced multiple runtime paths (MapLibre vs compatibility fallback), and the first client paint could diverge from SSR when browser capabilities or style loading differed at hydration time.

In addition, destination marker photos depend on external image URLs that may intermittently fail (network/hotlink/storage errors), causing broken marker media if not handled defensively.

The platform requires graceful degradation for public pages: no white screens, no broken marker UI, and stable behavior across SSR/client transitions.

## Decision

### 1) Hydration-safe first paint

Map components must render a deterministic compatibility-safe first paint during hydration. Interactive map takeover (MapLibre) happens only after client hydration state is established and runtime checks are resolved.

### 2) Map resilience

If WebGL is unavailable or map style loading fails, render the compatibility/croquis fallback path instead of leaving a blank map container.

### 3) Marker media resilience

Destination marker photos are optional. Failed or unavailable image URLs must degrade to a stable avatar fallback (initial/icon), preserving marker visibility and interaction.

### 4) Style contract

Map visual tokens are sourced from theme variables (`--accent`, `--chart-*`) with explicit fallback hex values to guarantee rendering when tokens are missing.

### 5) Environment contract

`NEXT_PUBLIC_MAP_STYLE_URL` remains the authoritative base-style input (with optional token substitution via `NEXT_PUBLIC_MAP_STYLE_TOKEN`).

### Out of scope

- Image proxying for marker assets
- Multi-retry network pipelines for marker images
- Package route animation in map views

## Consequences

### Positive

- Stable SSR/client behavior for destination map render paths
- Predictable fallback when style/WebGL fails
- No broken marker thumbnails on image load failure
- Better user-perceived reliability for destination pages

### Trade-offs

- Slightly higher state/branch complexity in map presentation components
- Compatibility-first paint can briefly show fallback before interactive map takeover in auto mode

## Verification Requirements

Map behavior must be covered by `maps-destinations` E2E scenarios:

- destinations listing map render
- destination detail markers + popup
- WebGL degradation behavior
- map style failure degradation behavior

Marker-image fallback behavior is required in tests (current or follow-up case) to ensure failed image URLs still render a stable marker avatar.

## References

- [ADR-001 — Server-First Rendering with ISR and PPR](./ADR-001-server-first-rendering.md)
- [ADR-002 — Three-Tier Error Handling](./ADR-002-error-handling-strategy.md)
- [Architecture — bukeer-studio](./ARCHITECTURE.md)
