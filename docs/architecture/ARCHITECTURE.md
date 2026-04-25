# Architecture — bukeer-studio

> Next.js 15 / React 19 / Cloudflare Workers / Supabase

Last updated: 2026-04-25

---

## Architectural Principles

These principles guide every technical decision in bukeer-studio. ADRs reference them by ID.

### P1 — Server-First, Client-Islands

All rendering is Server Components by default. `'use client'` is added only to the smallest interactive leaf (button, form, modal), never to entire page trees. RSC eliminates client JS for data-heavy views and enables instant navigation via prefetched RSC Payload.

**Rule:** If a component doesn't have `onClick`, `onChange`, `useState`, or `useEffect`, it is a Server Component.

### P2 — Validate at Boundaries, Trust Within

Parse and validate incoming data (API requests, Supabase results, user input, LLM output) at the system boundary using Zod. Once validated, data flows through the application with full type safety — no redundant checks, no defensive coding inside trusted functions.

**Rule:** Zod schemas from `@bukeer/website-contract` are the single source of truth. Never duplicate a TypeScript interface that mirrors a schema — use `z.infer<>`.

### P3 — Graceful Degradation Over Hard Failure

The public website must never show a white screen. Every route segment has error boundaries (`error.tsx`). Data-fetching failures return fallback content. Theme compilation failures fall back to the corporate preset. Missing images show placeholders.

**Rule:** `null`/fallback return is preferred over `throw` in data-fetching functions. `error.tsx` catches everything else.

### P4 — Edge-First Delivery

Static and ISR content is served from Cloudflare's edge network. Dynamic holes stream in via Suspense. The origin server (Supabase) is hit only for authenticated dashboard operations and cache misses.

**Rule:** Public site pages use ISR with on-demand revalidation. Dashboard/editor pages are `force-dynamic`.

### P5 — One-Directional Package Dependencies

```
@bukeer/theme-sdk
    ↓
@bukeer/website-contract
    ↓
Next.js app
```

Dependencies flow downward only. Packages never import from the app. `theme-sdk` never imports from `website-contract`. Circular dependencies are a hard violation.

### P6 — Collocated Data Fetching

Fetch data inside the Server Component that uses it, not at the page level. This avoids prop-drilling waterfalls and overfetching. Next.js request memoization deduplicates identical calls within a single render.

### P7 — URL as State

Filters, pagination, active tabs, and modal state belong in the URL via `searchParams`. This makes state shareable, bookmarkable, and SSR-compatible. `useState` is reserved for ephemeral UI state that should not survive a page refresh.

### P8 — Defense in Depth

Security is layered: (1) Middleware refreshes auth tokens and redirects, (2) Server Actions verify identity and permissions, (3) Supabase RLS enforces row-level access. Never rely on a single layer.

**Rule:** Use `supabase.auth.getUser()` in server contexts, never `getSession()` (which trusts the JWT without revalidation).

### P9 — Streaming-First for AI

LLM responses are never buffered. Server-Sent Events or ReadableStream deliver tokens to the client as they arrive. Zod validates structured LLM output before it enters the application layer.

### P10 — Minimal Client Bundle

The Cloudflare Workers 10 MiB limit and 128 MB memory cap demand aggressive bundle optimization. Use `optimizePackageImports`, dynamic imports, and tree-shaking. No unnecessary client-side state libraries.

---

## Layer Architecture

```
┌─────────────────────────────────────────────────┐
│                   App Router                     │
│  app/site/[subdomain]  app/dashboard  app/api   │
│  (ISR / PPR)           (dynamic)      (handlers)│
├─────────────────────────────────────────────────┤
│               Presentation Layer                 │
│  components/site   components/admin              │
│  components/editor components/ui (shadcn)        │
├─────────────────────────────────────────────────┤
│              Application Layer                   │
│  lib/hooks (useAutosave, useOptimisticMutation)  │
│  lib/admin (WebsiteProvider, RBAC, contexts)     │
│  lib/middleware (auth guards, routing)           │
├─────────────────────────────────────────────────┤
│                Domain Layer                      │
│  @bukeer/website-contract (Zod schemas, types)   │
│  @bukeer/theme-sdk (design tokens, compiler)     │
│  lib/sections (registry, normalizers)            │
├─────────────────────────────────────────────────┤
│             Infrastructure Layer                 │
│  lib/supabase (server, browser, middleware)       │
│  lib/ai (OpenRouter, rate limiting, prompts)     │
│  lib/seo (sitemap, robots, JSON-LD)             │
└─────────────────────────────────────────────────┘
```

### Rendering Strategy per Route

| Route | Strategy | Rationale |
|---|---|---|
| `site/[subdomain]/**` | ISR + PPR | Content changes via Flutter admin; revalidate on-demand |
| `dashboard/**` | Client Components | Per-user auth via WebsiteProvider context |
| `editor/**` | Client Components | Interactive section editing, embedded iframe |
| `api/**` | Dynamic | Mutations, AI streaming, webhooks |
| `(auth)/**` | Dynamic | Login/signup flows |

---

## State Management Strategy

| State Type | Tool | Where |
|---|---|---|
| Server data (public site) | RSC direct fetch | Server Components |
| Server data (dashboard) | WebsiteProvider context | Client Components |
| Form state | React Hook Form + Zod | Client Components |
| Ephemeral UI (modals, toggles) | `useState` | Client Components |
| Persistent UI (filters, tabs) | URL `searchParams` | Server + Client |
| Optimistic mutations | `useOptimisticMutation` | Client Components |
| Draft recovery | `useLocalBackup` | Client Components |
| Theme | `M3ThemeProvider` context | Client Components |

**No global state library** (no Redux, Zustand, Jotai). Intentional simplicity.

---

## Error Handling Strategy

### Three Tiers

1. **Expected errors — inline handling**
   - Data fetch returns `null` → render fallback
   - Server Action returns `{ success: false, error }` → show in form
   - Theme compilation fails → corporate preset fallback

2. **Route-level boundaries — `error.tsx`**
   - Each major route segment (`site/`, `dashboard/`, `editor/`) has `error.tsx`
   - Renders fallback UI with retry mechanism
   - Does NOT catch `layout.tsx` errors

3. **Global boundary — `global-error.tsx`**
   - Catches root layout errors
   - Includes own `<html>` and `<body>` tags
   - Last resort — should rarely trigger

### Rules
- Never `throw` expected errors — return typed results
- Never expose internal error details to the client
- Call `redirect()` OUTSIDE of `try/catch` (it throws internally)
- Log server-side with namespaced prefixes: `[moduleName]`
- Destination maps use compatibility-first fallback rendering, and marker photos always degrade to a stable avatar fallback when media fails.

---

## Security Model

| Layer | Control | Implementation |
|---|---|---|
| Edge (Cloudflare) | DDoS, WAF, TLS termination | Cloudflare default |
| Middleware | Auth cookie check, redirects, subdomain routing | `middleware.ts` |
| Headers | CSP, HSTS, X-Frame-Options | `next.config.ts` |
| Server Actions | Auth verification, RBAC | `lib/admin/permissions.ts` |
| Database | Row-Level Security | Supabase RLS policies |
| AI endpoints | Rate limiting, auth tokens | `lib/ai/auth-helpers.ts` |

### Required Headers

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN (non-editor routes)
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Content-Security-Policy: frame-ancestors 'self' https://app.bukeer.com (/editor/* only)
```

---

## ADR Index

| ADR | Title | Status |
|---|---|---|
| [ADR-001](./ADR-001-server-first-rendering.md) | Server-First Rendering with ISR and PPR | Accepted |
| [ADR-002](./ADR-002-error-handling-strategy.md) | Three-Tier Error Handling | Accepted |
| [ADR-003](./ADR-003-contract-first-validation.md) | Contract-First Validation with Zod | Accepted |
| [ADR-004](./ADR-004-state-management.md) | State Management without Global Store | Accepted |
| [ADR-005](./ADR-005-security-defense-in-depth.md) | Defense-in-Depth Security | Accepted |
| [ADR-006](./ADR-006-ai-streaming-architecture.md) | Streaming-First AI Integration | Accepted |
| [ADR-007](./ADR-007-edge-first-delivery.md) | Edge-First Delivery on Cloudflare Workers | Accepted |
| [ADR-008](./ADR-008-monorepo-packages.md) | Internal Package Architecture | Accepted |
| [ADR-009](./ADR-009-multi-tenant-subdomain-routing.md) | Multi-Tenant Subdomain Routing | Accepted |
| [ADR-010](./ADR-010-observability-strategy.md) | Observability Strategy | Accepted |
| [ADR-011](./ADR-011-middleware-cache.md) | Middleware In-Memory Cache | Accepted |
| [ADR-012](./ADR-012-api-response-envelope.md) | Standard API Response Envelope | Accepted |
| [ADR-013](./ADR-013-tech-validator-quality-gate.md) | Automated Tech Validator Quality Gate | Accepted |
| [ADR-014](./ADR-014-delta-typescript-quality-gate.md) | Delta TypeScript Quality Gate for Tech Validator | Accepted |
| [ADR-015](./ADR-015-resilient-map-rendering-and-marker-media-fallback.md) | Resilient Map Rendering and Marker Media Fallback | Accepted |
| [ADR-016](./ADR-016-seo-intelligence-caching.md) | SEO Content Intelligence Caching and Revalidation | Accepted |
| [ADR-017](./ADR-017-geocoding-activity-circuits.md) | Geocoding for Activity Circuit Maps | Accepted |
| [ADR-018](./ADR-018-webhook-idempotency.md) | Webhook Idempotency and Replay Protection | Accepted |
| [ADR-019](./ADR-019-multi-locale-url-routing.md) | Multi-locale URL Routing | Accepted |
| [ADR-020](./ADR-020-hreflang-emission-policy.md) | hreflang Emission Policy and x-default Strategy | Accepted |
| [ADR-021](./ADR-021-translation-memory-transcreation-pipeline.md) | Translation Memory and AI Transcreation Pipeline | Accepted |
| [ADR-023](./ADR-023-qa-tooling-studio-editor.md) | QA Tooling: Playwright Component Testing and Visual Regression | Accepted |
| [ADR-024](./ADR-024-booking-v1-pilot-scope.md) | Booking V1 Pilot Scope | Accepted |
| [ADR-025](./ADR-025-studio-flutter-field-ownership.md) | Studio / Flutter Field Ownership Boundary | Accepted |
| [ADR-027](./ADR-027-designer-reference-theme-adoption.md) | Designer Reference Theme Adoption for Pilot | Accepted |
| [ADR-028](./ADR-028-media-assets-canonical-registry.md) | Media Assets Canonical Registry | Accepted |

---

## Onboarding

New to the project? Start with the [Architecture Onboarding Guide](./ONBOARDING-ARCHITECTURE.md) — a mentor-style walkthrough of every concept above with real code examples.

---

## Architecture Health

> Last audit: 2026-04-15

| Area | Score | Key Findings |
|------|-------|-------------|
| Tokenization & Theme System | 8.5/10 | M3 compliant, 29 semantic roles, 8 presets. Gap: compile not memoized (fixed), DTCG alignment TBD |
| Layer Architecture | 8.5/10 | Server-first, ISR, contract-first. Gap: no error tracking in prod (Sentry planned), middleware now cached |
| Section Rendering Pipeline | 8/10 | 38 section types, registry pattern, lazy loading. Gap: hydration logic extracted to utility |
| Testing Infrastructure | 6.5/10 | Playwright + theme-sdk tests + contract tests. Gap: limited unit coverage, no POM |
| Error Handling | 7.5/10 | Three-tier (ADR-002), structured logger exists. Gap: logger adoption at 6%, no Sentry yet |
| Security | 8/10 | XSS prevention, security headers, auth boundary. Gap: no per-IP rate limiting, RLS audit TBD |

### Known Gaps (prioritized)

1. 🔴 **No production error tracking** — Sentry integration planned
2. 🟠 **API response envelope inconsistent** — standardized via ADR-012, migration in progress
3. 🟠 **Structured logger underutilized** — createLogger() used in 2/37+ routes
4. 🟡 **WCAG guardrails not in compile pipeline** — validateTheme() exists separately
5. 🟡 **W3C DTCG alignment** — documented for future migration
