# ADR-010: Observability Strategy

**Status:** Accepted
**Implementation Status:** In Progress — structured logging implemented, error tracking pending
**Date:** 2026-04-12
**Principles:** P3

## Context

bukeer-studio runs as a Cloudflare Worker serving multiple tenants. Production errors, performance issues, and tenant-specific problems need to be detected and diagnosed. Cloudflare Workers have limited observability compared to traditional servers — no persistent filesystem, limited stdout access, no APM agents.

## Decision

### Current state: Structured console logging

All logging uses `console.error`/`console.log` with namespaced prefixes. This is intentional — it works on Cloudflare Workers and provides a migration path to structured logging services.

```typescript
console.error('[site.error]', error)
console.error('[AI] studio-chat error:', err)
console.error('[Revalidate] Invalid or missing authorization')
console.error('[Quote API] Supabase error:', error)
```

**Convention:** `[moduleName]` or `[moduleName.functionName]` prefix on every log call. Currently at 94% compliance across the codebase.

### Cloudflare observability binding

```toml
# wrangler.toml
[observability]
enabled = true
```

Cloudflare captures Worker logs and makes them available via the Cloudflare dashboard and Workers Logs API. This provides basic production visibility without additional infrastructure.

### Error boundaries as observation points

Every major route segment has an `error.tsx` boundary that logs errors:

```
app/global-error.tsx         → console.error('[global-error]', error)
app/site/[subdomain]/error.tsx → console.error('[site.error]', error)
app/dashboard/error.tsx       → console.error('[dashboard.error]', error)
app/editor/error.tsx          → console.error('[editor.error]', error)
```

These are the integration points for a future error tracking service (Sentry).

### Revalidation audit logging

ISR revalidation events are logged to a `revalidation_logs` Supabase table (fire-and-forget), providing an audit trail of content updates per tenant.

### Planned: Sentry integration

When error volume warrants it, integrate `@sentry/cloudflare` (Cloudflare Workers-compatible):

1. Replace `console.error` in error boundaries with `Sentry.captureException(error)`
2. Upload source maps for readable stack traces
3. Configure per-tenant context tags for tenant-aware alerting

### Planned: Structured logger utility

Create `lib/logger.ts` with `createLogger(module)` that outputs:
- JSON in production (parseable by Cloudflare log analytics)
- Human-readable format in development

## Consequences

- **Zero additional dependencies** — console logging works everywhere
- **Cloudflare-native** — uses Workers observability binding
- **Migration path** — namespaced prefixes map 1:1 to structured logger modules
- **Audit trail** — revalidation events tracked per tenant
- **Trade-off:** No alerting — errors are only visible if someone checks logs
- **Trade-off:** No APM — no request tracing, latency percentiles, or error rate dashboards
- **Trade-off:** Console logs are ephemeral — lost if not captured by Cloudflare observability

## References

- [Cloudflare Workers Observability](https://developers.cloudflare.com/workers/observability/)
- [Sentry for Cloudflare Workers](https://docs.sentry.io/platforms/javascript/guides/cloudflare/)
