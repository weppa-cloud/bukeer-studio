# ADR-030 — Multitenant Redirect Policy Source of Truth

- Status: **Accepted — 2026-05-20**
- Date: 2026-05-20
- Deciders: Growth lead, Tech lead, Studio web
- Related: [[ADR-009]] (multi-tenant subdomain routing), [[ADR-019]] (multi-locale URL routing), [[ADR-029]] (SOT pattern)

## Context

ColombiaTours paid campaigns were sending traffic to legacy entry paths that were being 301-redirected by middleware fallback logic. This introduced avoidable latency and tracking risk on high-intent sessions.

The previous behavior depended on `website_legacy_redirects` as a broad fallback, without a first-class policy model to explicitly mark paths as "bypass redirect" per tenant.

For a multi-tenant platform, redirect behavior needs a single policy source of truth that:

1. Is website-scoped.
2. Can represent both redirect and bypass actions.
3. Is queryable from middleware with deterministic precedence.

## Decision

Adopt `public.website_redirect_policies` as the canonical redirect policy table for website path decisions.

Policy contract:

1. `action='redirect'` requires `new_path`.
2. `action='bypass'` requires `new_path IS NULL`.
3. Policies are keyed by `(website_id, old_path)` and evaluated before legacy redirect fallback.
4. Middleware reads active policy rows and applies:
   - `bypass`: do not redirect; continue normal render flow.
   - `redirect`: apply status code + query preservation contract.
5. If no policy exists for a path, middleware may fall back to `website_legacy_redirects`.

## Consequences

### Positive

- Paid landing aliases can render with 200 directly, preserving query parameters and reducing first-hop redirect overhead.
- Redirect semantics become explicit and auditable per tenant/path.
- Legacy redirects remain available as a compatibility layer while migrations continue.

### Costs / tradeoffs

- Adds a new policy table and middleware lookup path.
- Requires governance so paid-media critical paths are codified in policy rows.

## Production application note

Applied in production on 2026-05-20 via Supabase MCP migration `20260521023000_website_redirect_policies_sot` (recorded by platform as migration version `20260521030335`).

