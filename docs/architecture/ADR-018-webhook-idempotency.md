# ADR-018 — Webhook Idempotency + Replay Protection

Status: Draft
Date: 2026-04-17
Depends on: ADR-003 (contract-first validation), ADR-005 (security defense-in-depth), ADR-012 (API response envelope)
Related: #169 (Online Booking Phase B), #166 (Booking Epic)

## Context

Online Booking Phase B (#169) introduces webhook-driven state transitions for `bookings` status (`pending → confirmed`). Wompi delivers webhooks at-least-once and does not guarantee ordering. Without idempotency + replay protection, a single payment event can:

- Double-confirm a booking (state transition race)
- Re-fire downstream effects (email, WhatsApp receipt, commission write)
- Be replayed by an attacker using captured request payloads

This pattern generalizes to any third-party webhook (future: Mercado Pago, Stripe, Twilio, email providers), so this ADR defines the repository-wide contract.

## Decision

All inbound webhook handlers MUST apply four protections in order before any state mutation:

1. **HMAC signature verification** — reject if signature missing or invalid.
2. **Replay window** — reject events with `timestamp` older than 5 min or newer than 1 min future.
3. **Idempotency dedup** — persist `(provider, event_id)` in `webhook_events` with UNIQUE constraint; on conflict, return `200 OK` without re-processing.
4. **Contract parse** — Zod schema parse BEFORE business logic (`WompiEventSchema`, etc. per ADR-003).

State transitions happen only after all four pass. Dead-letter queue captures events that fail parse after signature+replay+idem pass (structural corruption).

## Schema

```sql
create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,              -- 'wompi' | 'stripe' | 'mercado_pago' | ...
  event_id text not null,              -- provider-native unique id
  event_type text not null,
  signature text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  status text not null default 'pending',  -- 'pending' | 'processed' | 'failed'
  error text,
  payload jsonb not null,
  constraint webhook_events_provider_event_unique unique (provider, event_id),
  constraint webhook_events_status_check
    check (status in ('pending', 'processed', 'failed'))
);

create index webhook_events_provider_idx on public.webhook_events(provider, received_at desc);
create index webhook_events_status_idx on public.webhook_events(status) where status != 'processed';
```

RLS: service-role only (no anon access). Public `SELECT` denied.

## Handler pattern

```typescript
// app/api/webhooks/<provider>/route.ts
export async function POST(req: NextRequest) {
  // 1. HMAC
  const raw = await req.text();
  const sig = req.headers.get('x-signature') ?? '';
  if (!verifyHmac(raw, sig, env.WEBHOOK_SECRET)) {
    return apiError('INVALID_SIGNATURE', 'Bad signature', 401);
  }

  // 2. Parse envelope + replay window
  const body = JSON.parse(raw);
  const skewSec = Math.abs(Date.now() / 1000 - body.timestamp);
  if (skewSec > 300) return apiError('REPLAY_REJECTED', 'Stale event', 400);

  // 3. Contract parse
  const parsed = WompiEventSchema.safeParse(body);
  if (!parsed.success) return apiError('INVALID_PAYLOAD', parsed.error.message, 400);

  // 4. Idempotency dedup (UNIQUE constraint)
  const supabase = createServiceRoleClient();
  const { error: insertErr } = await supabase.from('webhook_events').insert({
    provider: 'wompi',
    event_id: parsed.data.data.id,
    event_type: parsed.data.event,
    signature: sig,
    payload: parsed.data,
  });
  if (insertErr?.code === '23505') return apiSuccess({ deduped: true });  // Already seen
  if (insertErr) return apiInternalError('DEDUP_WRITE_FAILED');

  // 5. Transition
  await transitionBooking(parsed.data);

  // 6. Mark processed
  await supabase.from('webhook_events')
    .update({ status: 'processed', processed_at: new Date().toISOString() })
    .eq('provider', 'wompi').eq('event_id', parsed.data.data.id);

  return apiSuccess({ ok: true });
}
```

## Consequences

- Adds one DB insert + one update per webhook. Negligible at expected volume (<100/min).
- Dead-letter replay via admin tool (manual for v1; automated retry queue in Phase 3).
- Webhook secret rotation must be coordinated — keep old + new for 24h window.
- Handler MUST be `export const runtime = 'nodejs'` (HMAC on edge needs Web Crypto parity validation).

## References

- Wompi webhook docs: https://docs.wompi.co/docs/colombia/eventos/
- Stripe idempotency pattern: https://stripe.com/docs/idempotency
- ADR-003 contract-first validation
