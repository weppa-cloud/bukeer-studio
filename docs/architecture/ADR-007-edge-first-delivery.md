# ADR-007: Edge-First Delivery on Cloudflare Workers

**Status:** Accepted
**Date:** 2026-04-12
**Principles:** P4, P10

## Context

bukeer-studio deploys as a Cloudflare Worker via `@opennextjs/cloudflare`. This gives global edge distribution but imposes constraints:

- **10 MiB** Worker size limit (paid plan)
- **128 MB** memory limit
- **30 seconds** CPU time limit per request
- No persistent filesystem
- No `node:fs`, limited Node.js API compatibility (via `nodejs_compat`)

These constraints shape architectural decisions differently than a traditional Node.js server.

## Decision

### Bundle optimization

```typescript
// next.config.ts
experimental: {
  optimizePackageImports: [
    'lucide-react',
    '@radix-ui/react-icons',
    'framer-motion',
    // ... all large libraries
  ],
}
```

- Tree-shake aggressively — import specific functions, not entire libraries
- Use dynamic imports for heavy components (section editors, chart libraries)
- Monitor bundle size in CI — fail if Worker exceeds 8 MiB (2 MiB headroom)

### Caching strategy

```
Request → Cloudflare CDN cache
           ├── HIT → serve cached HTML (TTFB ~40ms)
           └── MISS → Worker renders
                       ├── ISR page → render, cache for revalidate seconds
                       └── Dynamic page → render, no cache
```

**Cache layers:**
1. **Cloudflare CDN** — caches ISR pages at the edge
2. **Next.js Data Cache** — caches Supabase RPC results
3. **Request Memoization** — deduplicates within a single render
4. **Router Cache** — client-side prefetch cache

### On-demand revalidation

```typescript
// app/api/revalidate/route.ts
export async function POST(request: Request) {
  const { secret, path } = await request.json()
  if (secret !== process.env.REVALIDATE_SECRET) {
    return new Response('Invalid secret', { status: 401 })
  }
  revalidatePath(path)
  return new Response('OK')
}
```

Called by Flutter admin when website content is published. Purges edge cache for the specific path.

### Memory-conscious patterns

```typescript
// Stream large responses — don't buffer
const stream = new TransformStream()
const writer = stream.writable.getWriter()

// Process items in chunks, not all at once
for (const chunk of chunks) {
  await writer.write(new TextEncoder().encode(chunk))
}

// Avoid loading all products into memory for sitemap
// Use pagination with cursor-based iteration
```

### Compatibility flags

```toml
# wrangler.toml
compatibility_date = "2026-04-01"
compatibility_flags = ["nodejs_compat"]
```

### No `runtime = 'edge'` declarations

`@opennextjs/cloudflare` handles the runtime. Do not add `export const runtime = 'edge'` to route files — it conflicts with the adapter.

### Static assets

Static files (images, fonts, generated CSS) are served from Cloudflare's asset storage, not the Worker. This avoids the 10 MiB limit for static content.

## Consequences

- **Global performance** — pages served from 300+ Cloudflare PoPs
- **Zero cold starts** — Workers have <1ms startup (vs Lambda's seconds)
- **Cost-effective** — pay per request, not per server hour
- **Trade-off:** Bundle size limit requires constant vigilance
- **Trade-off:** No persistent filesystem (use Supabase Storage or R2 for uploads)
- **Trade-off:** Limited Node.js API — some npm packages won't work

## References

- [OpenNext Cloudflare Adapter](https://opennext.js.org/cloudflare)
- [Cloudflare Workers Limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Cloudflare Workers Best Practices](https://developers.cloudflare.com/workers/best-practices/)
