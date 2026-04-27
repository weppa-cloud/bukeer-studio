# `booking_confirmed` Funnel Event — Wiring Plan

**Owner:** Growth OS A3 (SPEC #337) follow-up.
**Status:** Pending Wompi webhook handler. The Studio code path that confirms a booking does **not yet exist**. This doc captures the integration point so the emit lands the moment the handler is wired.

> **Why this exists:** Sprint A3 wired four of the five funnel events from SPEC #337 (`waflow_submit`, `whatsapp_cta_click`, `qualified_lead`, `quote_sent`). `booking_confirmed` was deferred because Chatwoot does not emit a payment-confirmation lifecycle event — it has to come from the payment provider. Bukeer Studio uses **Wompi** (see `bookings.wompi_payment_id` in `supabase/migrations/20260422000400_bookings_fsm_phase_b.sql`).

---

## 1. Where the booking transitions to `confirmed`

The booking FSM is defined in `supabase/migrations/20260422000400_bookings_fsm_phase_b.sql`:

```sql
status text not null default 'pending',
constraint bookings_status_check
  check (status in ('pending', 'holding', 'confirmed', 'expired', 'cancelled')),
```

The `pending → holding` transition is handled atomically by the `create_booking_hold(...)` RPC. The `holding → confirmed` transition is the **target of this wiring**: it MUST happen exactly once per Wompi `transaction.updated` webhook with `status = APPROVED`.

There is currently **no `confirm_booking` RPC** in the repo and **no `app/api/webhooks/wompi/route.ts` handler**. Both will land together when payments work resumes.

---

## 2. Integration point — `app/api/webhooks/wompi/route.ts`

Mirror the Chatwoot handler (`app/api/webhooks/chatwoot/route.ts`):

1. HMAC verification using `WOMPI_EVENTS_SECRET` (Wompi signs via `events.signature.checksum`).
2. Replay window check.
3. Insert into `webhook_events` (provider = `'wompi'`) for ADR-018 idempotency.
4. Look up the booking row by `wompi_payment_id` (set when the customer started checkout).
5. Atomically transition `holding → confirmed`, write to `booking_events`, and **emit `booking_confirmed`** via `insertFunnelEvent`.

### Code stub — `booking_confirmed` emit

Drop the following helper next to the rest of the handler (it should run **after** the FSM update and **inside** the same DB transaction guard so duplicate Wompi retries dedupe via `event_id` PK):

```ts
import { buildEventId } from '@/lib/growth/event-id';
import { insertFunnelEvent } from '@/lib/growth/funnel-events';
import type { FunnelEventIngest, GrowthMarket } from '@bukeer/website-contract';

interface ConfirmedBookingRow {
  id: string;
  reference_code: string | null;          // see ¬ Open question #1
  product_id: string;
  tenant_id: string;                      // == account_id
  total_amount: number;
  deposit_amount: number;
  deposit_currency: string;
  confirmed_at: string;
  // Joined fields (LEFT JOIN websites on bookings.tenant_id = websites.account_id)
  website_id: string | null;
  locale: string | null;
  market: GrowthMarket | null;
  // Optional (joined later when margin reporting lands)
  gross_margin?: number | null;
}

async function emitBookingConfirmedFunnelEvent(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  booking: ConfirmedBookingRow,
  wompiPaymentId: string,
): Promise<void> {
  if (!booking.website_id || !booking.reference_code) {
    log.warn('booking_confirmed_skipped_missing_scope', {
      booking_id: booking.id,
      has_website: Boolean(booking.website_id),
      has_reference: Boolean(booking.reference_code),
    });
    return;
  }

  const occurredAt = booking.confirmed_at
    ? new Date(booking.confirmed_at)
    : new Date();

  const eventId = await buildEventId({
    reference_code: booking.reference_code,
    event_name: 'booking_confirmed',
    occurred_at: occurredAt,
  });

  // Best-effort: lookup the latest captured attribution for this reference_code.
  // Reuses funnel_events as the source of truth (last-touch within session).
  const { data: lastAttribution } = await supabase
    .from('funnel_events')
    .select('attribution')
    .eq('reference_code', booking.reference_code)
    .eq('account_id', booking.tenant_id)
    .eq('website_id', booking.website_id)
    .not('attribution', 'is', null)
    .order('occurred_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ attribution: FunnelEventIngest['attribution'] }>();

  const ingest: FunnelEventIngest = {
    event_id: eventId,
    event_name: 'booking_confirmed',
    stage: 'booking',
    channel: 'unknown',
    reference_code: booking.reference_code,
    account_id: booking.tenant_id,
    website_id: booking.website_id,
    locale: booking.locale ?? 'es-CO',
    market: booking.market ?? 'CO',
    occurred_at: occurredAt.toISOString(),
    source_url: null,
    page_path: null,
    attribution: lastAttribution?.attribution ?? null,
    payload: {
      booking_id: booking.id,
      product_id: booking.product_id,
      amount: booking.total_amount,
      currency: booking.deposit_currency,
      gross_margin: booking.gross_margin ?? null,
      wompi_payment_id: wompiPaymentId,
    },
  };

  // Idempotent: ON CONFLICT DO NOTHING via funnel_events.event_id PK.
  // Wompi retries will hit the same event_id and dedupe.
  await insertFunnelEvent(supabase, ingest);
}
```

### Where to call it

Inside the Wompi webhook handler, after the FSM transition succeeds and `webhook_events` is marked processed:

```ts
// Pseudo-code — adapt to the final handler shape.
if (transactionStatus === 'APPROVED') {
  const updated = await confirmBookingByWompiPaymentId(supabase, paymentId);
  if (updated) {
    try {
      await emitBookingConfirmedFunnelEvent(supabase, updated, paymentId);
    } catch (error) {
      log.warn('funnel_event_emit_failed', {
        booking_id: updated.id,
        error: error instanceof Error ? error.message : String(error),
      });
      // Do NOT fail the webhook — funnel emission is best-effort.
    }
  }
}
```

The Meta CAPI `Purchase` event should be sent in the same block reusing the same `event_id` (sha256 contract) so the browser pixel + server-side event dedupe correctly. See `lib/meta/conversions-api.ts` and the Chatwoot handler for the dedupe pattern (`sendMetaConversionEvent` with `eventId: sha256(...)`).

---

## 3. Schema gaps to fix when the handler lands

The migration in `supabase/migrations/20260422000400_bookings_fsm_phase_b.sql` does **not** carry `reference_code`, `website_id`, `locale`, or `market` on the `bookings` table. Two reasonable strategies:

1. **Carry on `bookings`** — add columns and require checkout to copy them in.
2. **Lookup-time JOIN** — derive `reference_code` from the last `waflow_lead` matching `(tenant_id, user_phone)` and `website_id`/`locale`/`market` from `websites`. Slower; OK for a sub-1% conversion rate.

Recommendation: option 1 — add a migration that extends `bookings` with `reference_code text`, `website_id uuid references websites(id)`, `locale text`, `market text`, and have the checkout handler populate them when the hold is created (the customer already has a `reference_code` from WAFlow at that point). Index on `reference_code` for the lookup in step 2 above.

---

## 4. Open questions (block before merging the handler)

1. **`reference_code` provenance.** Today the WAFlow lead pipeline mints `WEB-XXXXXXXXXX` and stores it on `waflow_leads.reference_code`. The booking flow currently has no field for it. Decide: column on `bookings` (preferred) vs runtime join through `waflow_leads`.
2. **`gross_margin`.** The `payload.gross_margin` field is optional. Source TBD — likely `(total_amount - cost_basis)` where `cost_basis` is computed from product/option pricing. If the data isn't ready, ship with `gross_margin: null` and backfill later.
3. **Currency normalisation.** The funnel dashboard expects a single reporting currency. Decide whether to convert at emit time (using `currency_config`) or at query time.
4. **Refund handling.** When Wompi sends `transaction.updated` with `VOIDED` after a confirmed payment, do we emit a compensating `booking_refunded` event? Out of scope for SPEC #337, but capture the requirement.

---

## 5. Acceptance criteria for the wired event

- [ ] Wompi webhook handler exists and verifies signature.
- [ ] `holding → confirmed` transition is atomic, audited via `booking_events`.
- [ ] `funnel_events` row is inserted with `event_name='booking_confirmed'`, correct `account_id`/`website_id`, and `event_id = sha256(reference_code:booking_confirmed:occurred_at_s)`.
- [ ] Re-delivered Wompi webhooks dedupe (same `event_id`, ON CONFLICT DO NOTHING).
- [ ] Meta CAPI `Purchase` is sent with the same `event_id` for browser/server dedupe.
- [ ] No PII in `payload` (per `growth-attribution-governance.md`).
- [ ] STRICT_ADS_ZERO=1 smoke still PASS.

---

## 6. References

- SPEC #337 — Growth OS funnel events (#310).
- ADR-018 — Webhook idempotency (`webhook_events` ledger).
- ADR-007 — Edge-first runtime.
- ADR-009 — Multi-tenant scoping.
- ADR-012 — API response envelope.
- `app/api/webhooks/chatwoot/route.ts` — pattern reference.
- `lib/growth/funnel-events.ts`, `lib/growth/event-id.ts`.
- `supabase/migrations/20260422000400_bookings_fsm_phase_b.sql`.
- `docs/ops/growth-attribution-governance.md` — privacy posture.
