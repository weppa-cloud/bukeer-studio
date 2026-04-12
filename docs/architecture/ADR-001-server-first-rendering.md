# ADR-001: Server-First Rendering with ISR and PPR

**Status:** Accepted
**Implementation Status:** Complete
**Date:** 2026-04-12
**Principles:** P1, P4, P6, P10

## Context

bukeer-studio renders public tourism websites for multiple agencies via `site/[subdomain]`. These pages are content-heavy, SEO-critical, and change only when an admin updates content in the Flutter app. The dashboard and editor are interactive, per-user experiences.

Next.js 15 offers four rendering strategies: Static, ISR, Dynamic, and PPR (Partial Prerendering). Choosing incorrectly wastes server resources or hurts Core Web Vitals.

Cloudflare Workers impose a 10 MiB bundle limit and 128 MB memory cap, making client-heavy approaches (SPA-style) impractical.

## Decision

### Server Components by default

All components are Server Components unless they require interactivity (`onClick`, `onChange`, `useState`, `useEffect`). The `'use client'` directive is applied to the smallest interactive leaf, never to page-level components.

### ISR for public site pages

```typescript
// app/site/[subdomain]/page.tsx
export const revalidate = 300 // fallback: 5 minutes

// On-demand revalidation when admin publishes
// POST /api/revalidate (Bearer token auth, subdomain in body)
```

Content is served from edge cache. On-demand revalidation fires when the Flutter admin publishes changes. Time-based revalidation (5 minutes) acts as a safety net.

### PPR for mixed pages (future)

When Next.js PPR stabilizes on Cloudflare Workers, enable it for public pages:
- **Static shell:** Header, footer, navigation, above-the-fold hero
- **Dynamic holes:** Pricing, availability, user-specific content (wrapped in `<Suspense>`)

### Client Components for authenticated routes

Dashboard and editor pages use `'use client'` — they are Client Components that render in the browser. This is intentional: the dashboard relies on `WebsiteProvider` context for real-time editing state, and the editor is inherently interactive.

```typescript
// app/dashboard/[websiteId]/page.tsx
'use client'

// Dashboard pages use WebsiteProvider context for state management.
// No `force-dynamic` needed — Client Components are inherently dynamic.
```

### Collocated data fetching

Each Server Component fetches its own data. No page-level "mega fetch" that props-drills to children. Next.js request memoization deduplicates identical Supabase calls within a render.

```typescript
// Each section component fetches independently
async function HeroSection({ websiteId }: { websiteId: string }) {
  const data = await getHeroData(websiteId) // memoized if called elsewhere too
  return <Hero {...data} />
}
```

## Consequences

- **TTFB drops** from 350-550ms (origin) to 40-90ms (edge cache hit)
- **Client JS reduced** — Server Components ship zero JavaScript
- **SEO improved** — full HTML available on first response
- **Trade-off:** Content updates are not instant (up to 5 minutes delay without on-demand revalidation)
- **Trade-off:** PPR requires Suspense boundaries, adding complexity to section components

## References

- [Next.js App Router Rendering](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [PPR Deep Dive](https://nextjs.org/docs/app/building-your-application/rendering/partial-prerendering)
- [OpenNext Cloudflare](https://opennext.js.org/cloudflare)
