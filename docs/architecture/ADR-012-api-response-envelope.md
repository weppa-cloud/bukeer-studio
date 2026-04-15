# ADR-012 — Standard API Response Envelope

**Status:** Accepted  
**Date:** 2026-04-15  
**Principles:** P2 (Validate at Boundaries)

## Context

Audit (2026-04-15) found 3+ different response formats across 33 API routes:

1. `{ success: boolean, error?: string, ... }` — quote, revalidate routes
2. `{ plan, usage, sessionId, templates }` — AI copilot (no envelope)
3. Raw data objects with no wrapper — various routes

Inconsistent responses force frontend consumers to handle multiple shapes. Error handling varies (some return `{ error: "..." }`, others `{ message: "..." }`).

## Decision

Adopt a standard envelope for all API routes:

### Success response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description",
    "details": [...]  // Optional, e.g. Zod issues
  }
}
```

### Implementation
- Helper functions in `lib/api/response.ts`: `apiSuccess()`, `apiError()`, `apiValidationError()`, `apiUnauthorized()`, `apiNotFound()`, `apiRateLimited()`, `apiInternalError()`
- Type exports: `ApiSuccessResponse<T>`, `ApiErrorResponse`, `ApiResponse<T>`

### Error codes
Standard codes: `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `RATE_LIMITED`, `INTERNAL_ERROR`. Domain-specific codes use `DOMAIN_ACTION` pattern (e.g., `SEO_GENERATION_FAILED`).

### Migration
- New routes: MUST use envelope from day one
- Existing routes: Migrate incrementally (non-breaking — wrapping data in `{ success: true, data: ... }` is additive)
- Streaming routes (SSE/ReadableStream): Exempt — streaming responses don't use JSON envelope

## Consequences

### Positive
- Frontend consumers check `response.success` consistently
- Error shape is predictable (`error.code` for programmatic, `error.message` for display)
- TypeScript generics provide type-safe responses
- Zod errors automatically formatted with field paths

### Negative
- Slight payload overhead (extra `success` and `data` keys)
- Existing consumers need updates when routes migrate

### Mitigations
- Payload overhead negligible for JSON responses
- Migration is non-breaking (additive envelope)
- Streaming routes explicitly exempt

## Alternatives Considered

1. **No envelope:** Continue ad-hoc — rejected because inconsistency already causes frontend bugs
2. **HTTP status codes only:** Insufficient — 400 means many things, `error.code` disambiguates
3. **JSON:API spec:** Too heavy for this use case (jsonapi.org requires `type`, `id`, `relationships`)
