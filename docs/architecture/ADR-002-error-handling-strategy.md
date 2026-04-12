# ADR-002: Three-Tier Error Handling

**Status:** Accepted
**Date:** 2026-04-12
**Principles:** P3

## Context

The project currently has zero `error.tsx` files, no React Error Boundaries, and no error tracking service. Errors are logged to `console.error` with namespaced prefixes. Data-fetching functions return `null` on failure (graceful degradation), which is correct but incomplete.

An uncaught exception anywhere in the public site renders a white screen with no recovery path. For a tourism website that directly drives bookings, this is unacceptable.

## Decision

### Tier 1 — Expected errors handled inline

Expected failures (network timeout, missing data, invalid input) are handled at the call site. Functions return typed results, never throw.

```typescript
// Data fetching — return null, never throw
export async function getWebsiteBySubdomain(subdomain: string): Promise<WebsiteData | null> {
  try {
    const { data, error } = await supabase.rpc('get_website_by_subdomain', { p_subdomain: subdomain })
    if (error) {
      console.error('[getWebsiteBySubdomain]', error.message)
      return null
    }
    return data
  } catch (e) {
    console.error('[getWebsiteBySubdomain] unexpected', e)
    return null
  }
}

// Server Actions — return discriminated union
type ActionResult<T> = { success: true; data: T } | { success: false; error: string }

export async function publishWebsite(id: string): Promise<ActionResult<void>> {
  // ...
}
```

### Tier 2 — Route-level error boundaries

Each major route segment gets an `error.tsx`:

```
app/
  site/[subdomain]/error.tsx      ← public site errors
  dashboard/error.tsx             ← dashboard errors
  editor/error.tsx                ← editor errors
```

These render a user-friendly fallback with a retry button. They do NOT catch errors in `layout.tsx`.

```typescript
'use client'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    // Future: send to error tracking service
    console.error('[RouteError]', error)
  }, [error])

  return (
    <div>
      <h2>Something went wrong</h2>
      <button onClick={reset}>Try again</button>
    </div>
  )
}
```

### Tier 3 — Global error boundary

`app/global-error.tsx` catches root layout failures. Includes its own `<html>` and `<body>` tags.

### Loading states

Each route segment gets a `loading.tsx` with skeleton UI. This provides instant visual feedback while Server Components resolve.

```
app/
  site/[subdomain]/loading.tsx
  dashboard/loading.tsx
```

### Logging standard

All error logs use namespaced prefixes: `[moduleName]` or `[moduleName.functionName]`.

```typescript
console.error('[ai.studioChat]', error.message)
console.error('[supabase.getWebsite]', error.message)
```

### Future: Error tracking

When the project adds Sentry or equivalent, the `error.tsx` boundary is the integration point. The `console.error` calls are the migration path — replace with `Sentry.captureException()`.

## Consequences

- **No more white screens** on public pages
- **Retry capability** in dashboard and editor
- **Skeleton loading states** improve perceived performance
- **Trade-off:** More files to maintain (`error.tsx`, `loading.tsx` per route)
- **Trade-off:** Graceful degradation may mask real bugs — error tracking needed to surface them

## References

- [Next.js Error Handling](https://nextjs.org/docs/app/getting-started/error-handling)
- [Next.js Error Handling Best Practices](https://devanddeliver.com/blog/frontend/next-js-15-error-handling-best-practices-for-code-and-routes)
