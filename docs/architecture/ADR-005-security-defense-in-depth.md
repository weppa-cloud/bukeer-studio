# ADR-005: Defense-in-Depth Security

**Status:** Accepted
**Implementation Status:** Complete — see Known Gaps section for deferred items
**Date:** 2026-04-12
**Principles:** P8

## Context

bukeer-studio handles multi-tenant website data, user authentication, AI-powered content generation, and payment-adjacent flows (quote requests). The attack surface includes:

- Multi-tenant subdomain routing (tenant isolation)
- Supabase auth with SSR cookies
- AI endpoints calling external LLM providers
- Embedded editor via iframe
- User-submitted content (contact forms, quotes)

## Decision

### Three-layer auth model

```
Layer 1: Middleware (edge)
├── Refresh Supabase auth tokens via getUser() (dashboard routes)
├── Check auth cookie existence, redirect to /login if missing
├── One-time JWT handoff from Flutter (editor/dashboard bridge)
├── Subdomain → website ID resolution
└── Reserved subdomain blocking (www, app, api, admin, staging, dev)

Layer 2: Server Actions / Route Handlers (origin)
├── Verify user identity with supabase.auth.getUser()
├── Check RBAC permissions (viewer/editor/publisher/owner)
├── Rate limit AI endpoints per account
└── Validate request bodies with Zod

Layer 3: Database (Supabase RLS)
├── Row-level security on all tables
├── Users can only read/write their own account's data
└── Service role key used only for admin operations
```

### Auth rules

1. **Always `getUser()`, never `getSession()`** in server contexts. `getSession()` trusts the JWT without revalidation — vulnerable to token replay.

2. **Rate limiting** on AI and mutation endpoints. Keyed by `accountId`, stored in Supabase (no Redis dependency).

3. **RBAC matrix** with 4 roles and 8 permissions:
   - `viewer`: read-only access
   - `editor`: create/edit content
   - `publisher`: publish/unpublish pages
   - `owner`: manage users, settings, domains

### Security headers

All responses include these headers (configured in `next.config.ts`):

```typescript
// All routes (except /editor/*)
{
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
}

// Editor route — CSP allows iframe embedding from Flutter admin
// /editor/** gets: Content-Security-Policy: frame-ancestors 'self' https://app.bukeer.com
// (replaces X-Frame-Options for this route)
```

### External API calls

Server-side fetch calls target hardcoded, trusted endpoints only:

- `openrouter.ai` — LLM provider (via `lib/ai/llm-provider.ts`)
- `serpapi.com` — Google Reviews and destination enrichment

No user-supplied URLs are fetched server-side. If this changes (e.g., user-configurable webhooks), implement a domain allowlist and block link-local/metadata addresses before accepting dynamic URLs.

### Input sanitization

- Quote form: Zod validation + email format check
- AI prompts: System prompt injection prevention (user content wrapped in delimiters)
- Subdomain routing: Reserved names blocklist, alphanumeric validation

### Secrets management

| Secret | Storage | Access |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | CI/CD env vars only | Server-side Route Handlers |
| `OPENROUTER_AUTH_TOKEN` | CI/CD env vars only | AI Route Handlers |
| `REVALIDATE_SECRET` | CI/CD env vars only | Revalidation endpoint |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` + CI | Client + Server (public) |

**Rule:** `SUPABASE_SERVICE_ROLE_KEY` is never imported in Client Components or exposed via `NEXT_PUBLIC_` prefix.

### Known gaps (deferred)

- **Nonce-based CSP** — Not implemented. Inline scripts are minimal. When inline script usage grows, add nonce-based CSP via middleware.
- **SSRF domain allowlist** — Not needed while all external URLs are hardcoded. Implement if user-supplied URLs are accepted.

## Consequences

- **Multi-layer protection** — compromise of one layer doesn't grant full access
- **Tenant isolation** — RLS ensures accounts can't read each other's data
- **Rate limiting** prevents AI cost abuse
- **Trade-off:** Three auth checks per request add latency (~5-15ms)
- **Trade-off:** RBAC logic is duplicated between middleware and server actions (acceptable for security)

## References

- [Supabase SSR Auth for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Next.js Security Best Practices 2026](https://www.authgear.com/post/nextjs-security-best-practices)
- [OWASP Top 10 — 2025](https://owasp.org/www-project-top-ten/)
