---
session_id: "2026-04-30-tracking-attribution-readout"
started_at: "2026-04-30T09:05:00-05:00"
ended_at: "2026-04-30T09:20:00-05:00"
agent: "codex-lane-3"
scope: "tracking-attribution-readout"
website_id: "894545b7-73ca-4dae-b76a-da5b6a3f8441"
website_slug: "colombiatours"
related_issues: [322, 330, 332, 333]
outcome: "read-only evidence"
---

# Tracking / Attribution readout - 2026-04-30

Lane 3 scope: read-only evidence for Growth OS tracking. No DB mutation was made. Wompi was not implemented or queried as a required source.

## Sources checked

Local artifacts and contracts:

- `docs/ops/growth-tracking-smoke.md`
- `docs/growth-sessions/2026-04-28-1508-epic310-tracking-smoke.md`
- `docs/growth-sessions/2026-04-28-1620-itinerary-confirmed-booking-event.md`
- `supabase/migrations/20260504110900_funnel_events.sql`
- `supabase/migrations/20260504110700_meta_conversion_events.sql`
- `supabase/migrations/20260428155002_webhook_events_operational.sql`
- `supabase/migrations/20260428161000_itinerary_confirmed_funnel_event.sql`
- `supabase/migrations/20260504110800_chatwoot_waflow_linkage.sql`
- `packages/website-contract/src/schemas/growth-attribution.ts`
- `app/api/waflow/lead/route.ts`
- `app/api/growth/events/whatsapp-cta/route.ts`
- `app/api/webhooks/chatwoot/route.ts`
- `lib/analytics/track.ts`
- `lib/analytics/whatsapp-beacon.ts`

Read-only Supabase window:

- Tenant: `websites.subdomain = 'colombiatours'`
- Website: `894545b7-73ca-4dae-b76a-da5b6a3f8441`
- Since: `2026-04-28T00:00:00Z`
- Checked at: `2026-04-30T14:15:17Z`

## Exact queries checked

```sql
select id, account_id, subdomain, status
from public.websites
where subdomain = 'colombiatours';
```

```sql
select count(*)
from public.waflow_leads
where website_id = '894545b7-73ca-4dae-b76a-da5b6a3f8441'
  and created_at >= '2026-04-28T00:00:00Z';
```

```sql
select count(*)
from public.waflow_leads
where website_id = '894545b7-73ca-4dae-b76a-da5b6a3f8441'
  and submitted_at is not null
  and created_at >= '2026-04-28T00:00:00Z';
```

```sql
select event_name, stage, channel, reference_code, locale, market,
       occurred_at, created_at, provider_status, source_url, page_path, payload
from public.funnel_events
where website_id = '894545b7-73ca-4dae-b76a-da5b6a3f8441'
  and created_at >= '2026-04-28T00:00:00Z'
order by created_at desc
limit 25;
```

```sql
select event_name, count(*)
from public.funnel_events
where website_id = '894545b7-73ca-4dae-b76a-da5b6a3f8441'
  and event_name in (
    'whatsapp_cta_click',
    'waflow_submit',
    'qualified_lead',
    'quote_sent',
    'booking_confirmed'
  )
  and created_at >= '2026-04-28T00:00:00Z'
group by event_name;
```

```sql
select event_name, status, action_source, created_at, sent_at, error, trace
from public.meta_conversion_events
where website_id = '894545b7-73ca-4dae-b76a-da5b6a3f8441'
  and created_at >= '2026-04-28T00:00:00Z'
order by created_at desc
limit 50;
```

```sql
select provider, event_id, event_type, status, received_at, processed_at, error
from public.webhook_events
where received_at >= '2026-04-28T00:00:00Z'
order by received_at desc
limit 10;
```

```sql
select event_name, stage, channel, reference_code, occurred_at, created_at,
       payload, attribution
from public.funnel_events
where website_id = '894545b7-73ca-4dae-b76a-da5b6a3f8441'
  and event_name = 'booking_confirmed'
  and created_at >= '2026-04-28T00:00:00Z'
order by created_at desc
limit 10;
```

## Findings

| Surface                                 | Status  | Evidence                                                                                                                                                                                                                                                                                                   | Readout                                                                                                                                                                                                                                  |
| --------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lead / WAFlow                           | WATCH   | `waflow_leads`: 9 submitted rows since `2026-04-28`. `funnel_events.waflow_submit`: 6 rows in the same window. Recent live refs include `SANTA--3004-P5A3` and `HOME-2904-VOQB`; smoke refs include `SMOKE-STG-20260428215328`, `SMOKE-RL-20260428211226`, `SMOKE-META-20260428205932`, `SMK-0428-150408`. | Lead persistence is live, but Growth OS ledger parity is not clean: 9 submitted leads vs 6 `waflow_submit` funnel rows. Treat as usable with watch until the missing 3-row gap is reconciled.                                            |
| WhatsApp CTA                            | BLOCKED | `funnel_events.whatsapp_cta_click`: 0 rows since `2026-04-28`. Code exists in `lib/analytics/track.ts`, `lib/analytics/whatsapp-beacon.ts`, and `app/api/growth/events/whatsapp-cta/route.ts`.                                                                                                             | The first-party beacon path is implemented, but there is no durable DB evidence that public CTA clicks are being recorded. This blocks #330 activation baselines that rely on WhatsApp CTA clicks.                                       |
| itinerary_confirmed / booking_confirmed | PASS    | `funnel_events.booking_confirmed`: 2 rows since `2026-04-28`, both from `payload.source = 'itinerary_status_confirmed'` with refs `ITN-218468d106f044f185d9bd51bdce` and `ITN-6ccd27e9b22846cabe97e0268b08`.                                                                                               | The non-Wompi booking signal exists and is idempotent through `emit_itinerary_booking_confirmed(uuid)`. Watch item: both rows have `attribution = null` and `channel = 'unknown'`, so confirmed booking attribution is not yet reliable. |
| Meta CAPI log                           | WATCH   | `meta_conversion_events` since `2026-04-28`: `Lead:sent = 3`, `Lead:skipped = 6`, `ConversationContinued:skipped = 1`, `QualifiedLead:skipped = 1`, `QuoteSent:skipped = 1`. Skipped reason: `Meta CAPI is disabled or missing META_PIXEL_ID/META_ACCESS_TOKEN`.                                           | The idempotency ledger is working and smoke `Lead` sends reached `sent`, but current live rows are still `skipped`. Do not call this paid-scale ready until worker/staging/prod Meta env is consistent and lifecycle events send.        |
| Chatwoot lifecycle                      | PASS    | `webhook_events`: 2 processed Chatwoot messages for `SMK-0428-150408`. `funnel_events`: 1 `qualified_lead` and 1 `quote_sent`, both channel `chatwoot`. `meta_conversion_events`: matching `ConversationContinued`, `QualifiedLead`, and `QuoteSent` ledger rows exist, but skipped due Meta env.          | Lifecycle ingestion, webhook idempotency, WAFlow linkage, and funnel writes are proven by smoke. Watch item: only smoke evidence was found in this window; production Chatwoot webhook traffic still needs a live sample.                |

## Issue next actions

### #322 - Meta + Chatwoot Conversion Tracking

Next action: keep #322 in WATCH, not PASS. Reconcile the 9 submitted WAFlow rows vs 6 `waflow_submit` funnel rows, then rerun the smoke with a live `whatsapp_cta_click -> waflow_submit -> qualified_lead -> quote_sent -> booking_confirmed` reference chain. Also align Meta env in the worker so live `Lead`, `QualifiedLead`, and `QuoteSent` rows move from `skipped` to `sent`. Do not implement Wompi for this pass.

### #330 - Organic CRO for WAFlow, WhatsApp CTA and planner routing

Next action: treat WhatsApp CTA measurement as BLOCKED. Verify actual CTA callsites fire `trackEvent('whatsapp_cta_click', ...)` before redirect, then produce a durable `funnel_events.whatsapp_cta_click` row for ColombiaTours. Only after that should #330 build top-20 organic landing-page activation baselines.

### #332 - Google Ads enhanced conversions and offline lead stages

Next action: use the existing attribution schema (`gclid`, `gbraid`, `wbraid`, UTM keys) plus `waflow_submit`, `qualified_lead`, `quote_sent`, and `booking_confirmed` as the stage contract. Do not upload or send Google Ads offline conversions yet; first document the order/dedupe policy for `booking_confirmed`, and require non-null attribution for at least one lead-to-booking chain.

### #333 - TikTok Events API and event deduplication

Next action: keep #333 in planning/watch. The shared attribution schema already includes `ttclid`, and `event_id` is standardized, but no TikTok Pixel / Events API send path or `ttclid` evidence was checked in the live rows. Use #322's ledger parity fix and #330's WhatsApp CTA beacon proof before implementing TikTok server sends.

## Summary

Growth OS tracking is partially operational:

- Lead persistence: live, but funnel parity needs reconciliation.
- WhatsApp CTA: no DB evidence, blocked.
- Confirmed itinerary event: live without Wompi, but attribution is not joined.
- Meta CAPI ledger: live, mixed `sent`/`skipped`, not paid-scale ready.
- Chatwoot lifecycle: smoke PASS, needs production sample.
