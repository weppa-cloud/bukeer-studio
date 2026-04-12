# ADR-003: Contract-First Validation with Zod

**Status:** Accepted
**Date:** 2026-04-12
**Principles:** P2, P5

## Context

The project has `@bukeer/website-contract` as a shared package with Zod schemas and TypeScript types. However, API route handlers currently validate request bodies manually (regex checks, field existence) instead of using Zod. This creates drift between the contract and runtime validation, and is more verbose and error-prone.

## Decision

### Zod as single source of truth

Every data shape is defined once as a Zod schema in `@bukeer/website-contract`. TypeScript types are always inferred via `z.infer<>`, never manually declared.

```typescript
// packages/website-contract/src/schemas/quote.ts
import { z } from 'zod'

export const QuoteRequestSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  message: z.string().min(10),
  websiteId: z.string().uuid(),
  productId: z.string().uuid().optional(),
})

export type QuoteRequest = z.infer<typeof QuoteRequestSchema>
```

### Validate at boundaries

Validation happens at three boundaries:

1. **API request bodies** — Parse with Zod in Route Handlers before processing
2. **Supabase query results** — Parse when the DB shape might not match the app's expected type (e.g., after migrations)
3. **LLM structured output** — Always parse before passing to application logic

```typescript
// app/api/quote/route.ts
import { QuoteRequestSchema } from '@bukeer/website-contract'

export async function POST(request: Request) {
  const body = await request.json()
  const result = QuoteRequestSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error.flatten() },
      { status: 400 }
    )
  }

  // result.data is fully typed — no further validation needed
  const { name, email, message } = result.data
  // ...
}
```

### Trust within

Once data passes the boundary validation, it flows through the application without further checks. Internal functions receive typed arguments and trust them.

```typescript
// No Zod here — already validated at the API boundary
async function insertQuote(data: QuoteRequest): Promise<void> {
  await supabase.from('quote_requests').insert(data)
}
```

### Coerce, don't reject

Use Zod's `.coerce`, `.default()`, and `.transform()` to normalize data at boundaries:

```typescript
const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})
```

### No type duplication

**Forbidden:**
```typescript
// DON'T — manual interface that mirrors a schema
interface QuoteRequest {
  name: string
  email: string
  // ... duplicates the Zod schema
}
```

**Required:**
```typescript
// DO — infer from schema
export type QuoteRequest = z.infer<typeof QuoteRequestSchema>
```

## Consequences

- **Consistent validation** across all API endpoints
- **Type safety** from schema to handler to database
- **Better error messages** — Zod's `.flatten()` gives structured field-level errors
- **Reduced code** — replace manual regex/field checks with schema declarations
- **Trade-off:** Zod adds ~13KB to the bundle (acceptable)
- **Trade-off:** Requires discipline to keep schemas in the contract package, not scattered across the app

## References

- [Zod v3 Documentation](https://v3.zod.dev/)
- [Type-Safe APIs with Next.js and Zod](https://thegdsks.com/blog/building-type-safe-apis)
