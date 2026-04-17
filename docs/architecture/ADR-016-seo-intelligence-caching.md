# ADR-016 — SEO Content Intelligence Caching and Revalidation

**Status:** Accepted  
**Date:** 2026-04-16  
**Principles:** P4 (Edge-First Delivery), P2 (Validate at Boundaries), P10 (Minimal Client Bundle)

## Context

The SEO Content Intelligence surface combines read-heavy request paths with mixed write/read orchestration:

- `audit` reads rendered snapshots and findings, but the POST variant also persists new snapshots/findings.
- `research` writes run/candidate rows, but the returned dataset is read-heavy and frequently revisited by the UI.
- `clusters` is read-heavy for board views and assignments.
- `track` is read-heavy for charting and comparison filters.

These routes run in the Cloudflare Workers deployment path via OpenNext. The cache design must therefore:

1. avoid Node-only APIs,
2. keep response envelopes unchanged,
3. preserve boundary validation with Zod and `@bukeer/website-contract`,
4. make invalidation explicit and deterministic.

## Decision

Use response-level cache headers plus deterministic cache tags for SEO intelligence routes.

### Cache modes

| Route | Method | Default mode | TTL | Cache tags | Why |
|---|---|---:|---:|---|---|
| `/api/seo/content-intelligence/audit` | `GET` | shared cache | 300s | `seo-content-intelligence:audit`, `website`, `locale`, `content-type`, `mode` | Read-heavy dashboard data |
| `/api/seo/content-intelligence/audit` | `POST` | no-store | 0s | tags emitted on success | Mutation writes snapshots/findings; response must not be cached |
| `/api/seo/content-intelligence/research` | `POST` | no-store | 0s | tags emitted on success | Mutation writes research runs/candidates; response is still tag-addressable |
| `/api/seo/content-intelligence/clusters` | `GET` | shared cache | 60s | `seo-content-intelligence:clusters`, `website`, `locale`, `content-type` | Board/listing data changes less frequently |
| `/api/seo/content-intelligence/clusters` | `POST` | no-store | 0s | tags emitted on success | Assignment/update mutates cluster state |
| `/api/seo/content-intelligence/track` | `GET` | shared cache | 300s | `seo-content-intelligence:track`, `website`, `locale`, `content-type`, `cluster`, `mode` | Time-series surfaces are read-heavy |

### Tag format

Tags are emitted in the `Cache-Tag` response header using deterministic, lowercased tokens:

- `seo-content-intelligence`
- `seo-content-intelligence:route:<route>`
- `seo-content-intelligence:website:<website_id>`
- `seo-content-intelligence:locale:<locale>`
- `seo-content-intelligence:content-type:<content_type>`
- `seo-content-intelligence:cluster:<cluster_id>`
- `seo-content-intelligence:market:<country>:<language>[:<locale>]`
- `seo-content-intelligence:mode:decision-grade|exploratory`

The header is additive. It does not change the [[ADR-012]] envelope and does not require any response body shape changes.

### Invalidation model

Current invalidation is tag-oriented and edge-friendly:

1. A read response is cached with a stable tag set.
2. A later publisher or sync process can purge by tag.
3. The route itself remains compatible with Cloudflare Workers because it only uses plain response headers.

## Edge Compatibility Notes

1. No Node-only modules are used in the cache path.
2. No `revalidateTag()` call is required inside the route handlers. That keeps the implementation compatible with the Worker runtime used by OpenNext.
3. `Cache-Tag` is header-only metadata and works with CDN-level purge workflows.
4. `Cache-Control` remains explicit on every route so the edge behavior is deterministic.
5. Read routes continue to return `{ success: true, data: ... }` and errors continue to return `{ success: false, error: { code, message, details? } }`.

## Consequences

### Positive

- Predictable cache invalidation scope per website, locale, and content type.
- Safe for Cloudflare Workers and OpenNext.
- No product contract changes.
- Future purge integration can target tags without changing route semantics.

### Negative

- Tag purge is only as good as the publisher or sync workflow that invokes it.
- POST mutation responses remain no-store, so cache reuse depends on their subsequent GET views.

### Mitigations

- Keep the read views cached with low TTLs.
- Purge by website/locale/content-type tags when publish or sync completes.
- Leave mutation routes no-store to avoid caching write responses.

## Alternatives Considered

1. **`revalidateTag()` inside route handlers**  
   Rejected for now. It increases coupling to the App Router runtime and is less explicit in the Worker deployment path.

2. **Global no-store for every SEO route**  
   Rejected. It would make the dashboard slower and increase origin pressure unnecessarily.

3. **Cloudflare KV/Redis cache layer**  
   Rejected. Too much infrastructure for the current scope and unnecessary for deterministic dashboard reads.

## Operational Rule

When a SEO intelligence dataset changes, purge by tag in this order:

1. `seo-content-intelligence:website:<website_id>`
2. `seo-content-intelligence:website:<website_id>:locale:<locale>`
3. `seo-content-intelligence:route:<route>`
4. Optional narrower tags: `content-type`, `cluster`, `market`

This keeps invalidation broad enough to be safe and narrow enough to avoid cross-tenant cache bleed.
