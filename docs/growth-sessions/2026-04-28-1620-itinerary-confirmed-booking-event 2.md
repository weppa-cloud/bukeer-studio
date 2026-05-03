---
session_id: "2026-04-28-1620-itinerary-confirmed-booking-event"
started_at: "2026-04-28T16:10:00-05:00"
ended_at: "2026-04-28T16:20:00-05:00"
agent: "codex-orchestrator"
scope: "epic310-itinerary-confirmed-event"
website_id: "894545b7-73ca-4dae-b76a-da5b6a3f8441"
website_slug: "colombiatours-travel"
initiator: "espera no implentes wompy por ahora pongamos el evento de de itneario es esnta confirmado"
outcome: "completed"
linked_weekly: "docs/growth-weekly/2026-04-27-experiments.md"
related_issues: [310, 322, 337]
---

# Session itinerary-confirmed-booking-event — colombiatours-travel — 2026-04-28 16:20

## Intent

No implementar Wompi todavía. Emitir `booking_confirmed` desde la fuente operativa actual: itinerarios con `itineraries.status = 'Confirmado'`.

## Plan

1. Mantener Wompi fuera del scope.
2. Crear función Supabase reusable para emitir `funnel_events.booking_confirmed` desde un itinerario confirmado.
3. Crear trigger para futuras transiciones de status a `Confirmado`.
4. Validar con un itinerario ColombiaTours ya confirmado.
5. Copiar migración a `bukeer-flutter` para governance.

## Executed actions

### 1. Schema inspection

- **Tool:** Supabase SQL read-only.
- **Input:** `itineraries`, `websites`, `funnel_events`.
- **Output:** ColombiaTours tiene `account_id = 9fc24733-b127-4184-aa22-12f03b98927a`; `itineraries.status` usa valores legacy como `Presupuesto` y `Confirmado`.
- **Reasoning:** confirmar la fuente real de booking antes de diseñar el evento.

### 2. Migration applied

- **Tool:** Supabase MCP `apply_migration`.
- **Input:** `20260428161000_itinerary_confirmed_funnel_event.sql`.
- **Output:** `success: true`.
- **Reasoning:** activar evento forward-only sin depender de Wompi.

### 3. Smoke emit

- **Tool:** Supabase SQL.
- **Input:** `select public.emit_itinerary_booking_confirmed('6ccd27e9-b228-46ca-be97-e0268b08d7d5')`.
- **Output:** `funnel_events.booking_confirmed` insertado con `event_id = 4e64afaf905b67340f558aa0ba62335378f7b47044253afce89af84edc9cfebd`.
- **Reasoning:** validar que un itinerario ColombiaTours ya confirmado produce el evento esperado.

## Mutations

| Entity | Action | Before | After | Source |
|--------|--------|--------|-------|--------|
| Supabase schema | Add `emit_itinerary_booking_confirmed(uuid)` | No source for `booking_confirmed` without Wompi | Function emits idempotent `funnel_events.booking_confirmed` | `20260428161000_itinerary_confirmed_funnel_event.sql` |
| Supabase schema | Add trigger `trg_itinerary_booking_confirmed_funnel_event` | Future itinerary confirmations did not emit Growth event | Future `status -> Confirmado` transitions emit event | same migration |
| Supabase data | Emit one controlled event | No `booking_confirmed` for itinerary `6ccd27e9...` | 1 row in `funnel_events` | manual function call |

## Evidence

Event row:

| Field | Value |
|---|---|
| `event_name` | `booking_confirmed` |
| `stage` | `booking` |
| `channel` | `unknown` |
| `reference_code` | `ITN-6ccd27e9b22846cabe97e0268b08` |
| `account_id` | `9fc24733-b127-4184-aa22-12f03b98927a` |
| `website_id` | `894545b7-73ca-4dae-b76a-da5b6a3f8441` |
| `locale` | `es-CO` |
| `market` | `US` |
| `occurred_at` | `2026-04-23T17:04:35.509801Z` |
| `payload.source` | `itinerary_status_confirmed` |
| `payload.id_fm` | `1-12317` |
| `payload.currency` | `USD` |

Idempotency check:

| Query | Result |
|---|---:|
| Re-run `emit_itinerary_booking_confirmed(...)` | 1 total row |

## External costs

| Provider | Operation | Cost USD | Notes |
|----------|-----------|----------|-------|
| none | none | 0 | No paid provider call. |

## Decisions / trade-offs

- Wompi remains deferred. The event now follows the operational status that Flutter already manages.
- Reference code uses `custom_fields.growth_reference_code` / `custom_fields.reference_code` when present, otherwise a deterministic synthetic `ITN-{itinerary_id}` code.
- Attribution is best-effort: if a matching `funnel_events.reference_code` exists, the latest attribution is reused; otherwise the booking event is still emitted without attribution.

## Outputs delivered

- Migration: `supabase/migrations/20260428161000_itinerary_confirmed_funnel_event.sql`
- Mirrored migration in `bukeer-flutter`.
- Validation:
  - Studio `npm run typecheck` PASS.
  - Flutter `./scripts/validate_supabase_migrations.sh` PASS.

## Next steps / handoff

- Update Flutter confirmation flow later to populate `custom_fields.growth_reference_code` when the itinerary originates from WAFlow/Chatwoot.
- Meta Purchase can be added later using the same `event_id` contract, but remains out of scope until Meta credentials and Wompi/payment source are ready.

## Self-review

This keeps #322 moving without overbuilding Wompi. The key remaining accuracy gap is attribution provenance from WAFlow to itinerary; the event exists now, but many legacy itineraries will use synthetic references.
