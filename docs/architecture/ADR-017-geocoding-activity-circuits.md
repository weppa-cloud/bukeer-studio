# ADR-017 — Geocoding for Activity Circuit Maps

**Status:** Accepted
**Implementation Status:** Complete (SPEC #164 phase 1 + 2)
**Date:** 2026-04-17
**Principles:** P1, P3, P10

## Context

SPEC #164 introduced activity circuit maps for package detail pages. Activity stops are stored as place names (strings) in Supabase, not as coordinates. MapLibre / MapTiler requires `[lng, lat]` to render markers.

A geocoding layer is needed to resolve place names → coordinates at render time, with caching to avoid redundant API calls on every SSR pass.

## Decision

### 1) MapTiler as geocoding provider

Use MapTiler Geocoding API (`lib/geocoding/maptiler.ts`) as the single geocoding provider. Chosen because MapTiler is already the map tile provider (ADR-015 uses MapLibre + MapTiler styles), avoiding a second vendor dependency.

### 2) Geocoding pipeline

```
activity stop names (strings)
  → lib/geocoding/normalize.ts   (clean + deduplicate)
  → lib/geocoding/geocode.ts     (batch geocode via MapTiler)
  → lib/products/place-coords.ts (coords cache + lookup)
  → lib/products/activity-circuit.ts (assemble GeoJSON for <CircuitMap>)
```

### 3) Places cache (Supabase)

Resolved coordinates are persisted in `places_cache` table (migration `20260417000000_places_cache.sql`). Cache lookup happens before calling MapTiler. This prevents repeated geocoding charges and latency on hot pages.

Schema: `packages/website-contract/src/schemas/places-cache.ts`.

### 4) Shared `<CircuitMap>` primitive

`components/site/circuit-map.tsx` is the shared rendering primitive used by both `<PackageCircuitMap>` and `<ActivityCircuitMap>`. Follows ADR-015 hydration-safe pattern (no SSR map, client-only render behind `dynamic(..., { ssr: false })`).

## Consequences

- New env var required: `MAPTILER_API_KEY` (server-only).
- `places_cache` table must be seeded or warmed before production traffic to avoid geocoding latency on first SSR.
- `lib/geocoding/` module is the single geocoding boundary — no direct MapTiler calls from components.

## Relations

- Extends [[ADR-015]] (map rendering) — geocoding is the data layer; ADR-015 covers the render layer.
- Uses [[ADR-016]] cache pattern (Supabase-backed cache, not in-memory).
- SPEC: [[SPEC_PACKAGE_DETAIL_CONVERSION_V2]] (phase 1 = CircuitMap refactor, phase 2 = geocoder).
