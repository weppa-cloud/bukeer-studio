# ADR-009: Multi-Tenant Subdomain Routing

**Status:** Accepted
**Implementation Status:** Complete
**Date:** 2026-04-12
**Principles:** P4, P8

## Context

bukeer-studio is a multi-tenant website renderer — a single deployment serves all travel agency websites. Each agency gets a unique subdomain (`colombiatours.bukeer.com`) or custom domain (`www.colombiatours.travel`). The routing system must:

- Route requests to the correct agency's data
- Support both subdomains and custom domains
- Block reserved subdomains (www, app, api, admin)
- Handle product/destination slug routing
- Work in development (localhost has no subdomains)
- Be edge-compatible (runs in Cloudflare Workers)

## Decision

### Routing architecture

All tenant routing happens in `middleware.ts` (~365 lines). The middleware rewrites URLs internally — the browser sees `colombiatours.bukeer.com/destinos`, but Next.js processes `/site/colombiatours/destinos`.

```
Request: colombiatours.bukeer.com/destinos
    ↓ middleware.ts
Rewrite: /site/colombiatours/destinos
    ↓ App Router
Route: app/site/[subdomain]/[...slug]/page.tsx
    ↓ Data fetching
Supabase: WHERE subdomain = 'colombiatours'
```

### Subdomain extraction

```typescript
// Production: extract from host header
const host = request.headers.get('host') || '';
const subdomain = host.replace(`.${MAIN_DOMAIN}`, '').split('.')[0];

// Development: use ?subdomain= query param (localhost has no subdomains)
const devSubdomain = request.nextUrl.searchParams.get('subdomain');
```

### Reserved subdomains

Blocked at middleware level before any database lookup:

```typescript
const RESERVED_SUBDOMAINS = ['www', 'app', 'api', 'admin', 'canvas', 'staging', 'dev'];
```

### Custom domain routing

For agencies with their own domain (e.g., `www.colombiatours.travel`):

1. Middleware checks if host is not `*.bukeer.com`
2. Calls `getWebsiteByCustomDomain(host)` via Supabase RPC
3. Rewrites to `/domain/${encodeURIComponent(host)}${pathname}`
4. Page component verifies `custom_domain` matches request (security gate)

### Tenant isolation

- **Data isolation:** Each Supabase query filters by `subdomain` or `website_id`. RLS enforces `account_id` boundaries.
- **Cache isolation:** ISR pages are cached per path (`/site/colombiatours/...` vs `/site/agenciaviajes/...`). Different subdomains produce different paths, so caches are naturally isolated.
- **Theme isolation:** Each website loads its own theme via `compileTheme()`, producing different CSS variables per tenant.

### Product/destination routing

Middleware resolves product slugs to their types for SEO-friendly URLs:

```
/hoteles/hotel-caribe → checks product exists → rewrite to /site/{subdomain}/hoteles/hotel-caribe
/destinos/cartagena  → checks destination exists → rewrite to /site/{subdomain}/destinos/cartagena
```

### AI crawler handling

Middleware detects AI crawlers (GPTBot, ClaudeBot, PerplexityBot) and sets `X-Robots-Tag: index, follow` to control AI training access.

## Consequences

- **Single deployment** serves unlimited tenants — no per-agency infrastructure
- **SEO-friendly** — each agency has its own domain/subdomain with proper meta tags
- **Edge-compatible** — middleware runs on Cloudflare Workers with <1ms overhead
- **Trade-off:** Middleware complexity (~365 lines) — requires careful testing for routing edge cases
- **Trade-off:** Development requires `?subdomain=` param since localhost has no subdomains
- **Trade-off:** Custom domain setup requires DNS configuration and verification

## References

- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Multi-tenant Architecture Patterns](https://www.cloudflare.com/learning/cloud/what-is-multitenancy/)
