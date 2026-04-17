# SPEC: Bookings in Studio

| Field | Value |
|---|---|
| **Spec ID** | SPEC-BOOKINGS-001 |
| **Status** | In Progress |
| **Date** | 2026-04-17 |
| **Owner** | Product |

## Scope

Studio manages leads → bookings pipeline. Public site has CTAs.

## Current State

| Component | Status | Source |
|---|---|---|
| `quote_requests` table | Exists | Supabase |
| `/api/quote/route.ts` | Exists | `app/api/quote/` |
| Schemas: bookings, cancellation, leads, wompi | Exists | `@bukeer/website-contract` |
| Lead → booking pipeline | Not implemented | Studio |
| Studio Leads tab | Deferred (Spec UX/IA) | SPEC_UX_IA_AUDIT |

## Requirements

### Data Model (from cross-repo)

```
quote_requests:
  - website_id FK
  - product_type (Hotel|Activity|Package|Transfer)
  - product_id FK
  - guest_name, guest_email, guest_phone
  - check_in, check_out (dates)
  - guest_count (adults, children)
  - notes (text)
  - status (pending|quoted|accepted|rejected)
  - created_at, updated_at
```

### Studio Features

| Feature | Priority |
|---|---|
| Lead list view | P1 |
| Lead detail with product info | P1 |
| Quote response (manual) | P2 |
| Quote → booking conversion | P2 |
| Wompi payment integration | P3 |

## Dependencies

- [[ADR-005]] — security (defense in depth)
- [[ADR-012]] — API response envelope
- [[SPEC_UX_IA_AUDIT_BUKEER_STUDIO]] — IA redesign (leads tab deferred)

---

> See `.claude/rules/cross-repo-flutter.md` for shared tables.