# ADR-011 — Middleware In-Memory Cache

**Status:** Accepted  
**Date:** 2026-04-15  
**Principles:** P4 (Edge-First Delivery), P10 (Minimal Client Bundle)

## Context

The Next.js middleware (`middleware.ts`) makes 2-4 Supabase REST API calls per request for subdomain resolution, custom domain lookup, product slug validation, and slug redirects. All calls use `cache: 'no-store'`, causing unnecessary database load and latency for every page request.

On Cloudflare Workers, middleware runs on every request before the page handler. For a public site with ISR (revalidate=300s), the page itself is cached at the edge, but the middleware still hits the database on every request.

## Decision

Add a module-level in-memory TTL cache to middleware DB lookup functions:

- **Cache scope:** Module-level `Map` (persists across requests within same Worker isolate)
- **TTL:** 5 minutes (matches ISR revalidation window)
- **Max entries:** 200 (bounded memory, FIFO eviction)
- **Cache keys:** Prefixed by function (`sub:`, `domain:`, `prod:`, `redir:`)
- **Cache layer:** At caller level (getWebsiteBySubdomain, getWebsiteByCustomDomain, productExists, getRedirectedSlug), not at supabaseFetch level

## Consequences

### Positive
- Eliminates 2-4 DB calls per request for repeat visitors
- Zero external dependencies (no Cloudflare KV, no Redis)
- TTL matches ISR window — cache staleness aligned with page staleness
- Bounded memory prevents unbounded growth

### Negative
- Cache is per-Worker-isolate (not shared across Cloudflare edge nodes)
- Stale data possible for up to 5 minutes after DB changes
- No manual cache invalidation mechanism

### Mitigations
- 5-minute TTL acceptable because ISR pages are also 5-minute stale
- Per-isolate cache is fine — each Worker handles enough requests to benefit
- Future: Add `POST /api/revalidate` integration to flush middleware cache on content publish

## Alternatives Considered

1. **Cloudflare KV:** Shared across edge nodes but adds API dependency and cost. Overkill for current traffic.
2. **Next.js fetch cache:** Middleware uses raw fetch, not Next.js fetch — no automatic caching.
3. **Cache at supabaseFetch level:** Too broad — some callers may need fresh data.
