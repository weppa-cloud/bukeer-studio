# Growth Tracking — Browser ↔ Server Dedupe Smoke

Status: active runbook for ColombiaTours Growth OS (#310 / SPEC #337).
Owner: A3 (Tracking/Data Engineer).

This runbook validates that a single user action emits **one** logical event across browser pixel and server-side CAPI/Events API, and that it lands as **one** row in `meta_conversion_events` plus **one** row in `funnel_events`. Idempotency is guaranteed by ADR-018 (`event_id = lowercase(sha256(reference_code:event_name:occurred_at_s))`).

---

## Scope

- WAFlow lead submission (`event_name = waflow_submit` for funnel, `Lead` for Meta CAPI).
- Chatwoot lifecycle (`qualified_lead`, `quote_sent`).
- CRM itinerary confirmation (`booking_confirmed` for funnel, `Purchase` for Meta CAPI).
- Verifies `STRICT_ADS_ZERO=1` smoke still PASS (no pixel pre-consent).

## Pre-flight

1. Confirm env in `.env.local` / staging worker secrets:
   - `META_PIXEL_ID`, `META_ACCESS_TOKEN`, `META_API_VERSION`
   - `META_TEST_EVENT_CODE` (use Meta Events Manager test event code for staging)
   - `META_CONVERSIONS_API_ENABLED=true`
   - `META_CHATWOOT_CONVERSIONS_ENABLED=true` only if validating Chatwoot lifecycle webhooks (legacy fallback)
   - `CHATWOOT_WEBHOOK_SECRET`
   - `CRM_CONVERSION_WEBHOOK_SECRET`
2. Apply migrations `supabase/migrations/20260504110900_funnel_events.sql` and `20260504111000_funnel_events_backfill.sql` against the staging Supabase project (`supabase db push`).
3. Claim a session pool slot for browser testing:
   ```bash
   eval "$(bash scripts/session-acquire.sh)"
   PORT=$PORT NEXT_DIST_DIR=.next-$SESSION_NAME npm run dev:session &
   ```

## Step 1 — Browser opens WAFlow + emits pixel

1. Navigate to `http://localhost:$PORT/site/colombiatours/destino/cartagena?utm_source=smoke&utm_medium=cpc&utm_campaign=tracking-smoke`.
2. Open DevTools → Network → filter `facebook.com/tr` (Meta Pixel). Open WAFlow drawer (CTA `WhatsApp`).
3. Walk through the flow until `confirmation` step. Submit.
4. Note the `eventID` query param on the pixel `Lead` request — this is the browser-side `event_id`. Capture it (`BROWSER_EVENT_ID`).
5. Capture the `referenceCode` from the WAFlow drawer (visible in confirmation screen or in `localStorage.bukeer.waflow.session`).

## Step 2 — Server CAPI fires with same event_id

1. Tail server logs for `api.waflow.lead`:
   ```bash
   tail -f .next-$SESSION_NAME/server-logs.txt | grep waflow
   ```
   You should see `meta_lead_conversion sent` once per submit.
2. The server resolves `event_id` from `body.payload.eventIds.lead` (if browser included it) or builds it as `${referenceCode}:lead`. Both browser pixel and server CAPI MUST share that `event_id`.

## Step 3 — Verify dedupe in `meta_conversion_events`

Use Supabase SQL Editor (service role):
```sql
select provider, event_name, event_id, status, action_source, sent_at, retry_count
from public.meta_conversion_events
where event_id = '<BROWSER_EVENT_ID>'
order by created_at desc;
```

Expected:
- **Exactly one row** with `provider='meta'`, `event_name='Lead'`, `status='sent'`.
- A second insert attempt (Meta CAPI retry, or duplicate browser fire) returns `deduped: true` from `sendMetaConversionEvent` and does NOT add a row (uniqueness on `(provider, event_name, event_id)`).

## Step 4 — Verify funnel_event row

```sql
select event_id, event_name, stage, channel, reference_code, account_id, website_id,
       locale, market, occurred_at, attribution->'utm', payload, source_url
from public.funnel_events
where reference_code = '<REFERENCE_CODE>'
order by occurred_at asc;
```

Expected:
- One row for `event_name='waflow_submit'`, `stage='activation'`, `channel='waflow'`.
- `attribution->'utm'->>'utm_source' = 'smoke'`, `utm_medium = 'cpc'`, `utm_campaign = 'tracking-smoke'`.
- `payload` contains `variant`, `session_key`, `package_slug`, `destination_slug` (no PII).
- Re-submitting the same payload (curl replay against `/api/waflow/lead`) MUST NOT add a second row — the event_id collision returns `deduped: true`.

## Step 5 — Chatwoot lifecycle

1. Trigger a Chatwoot webhook with `QualifiedLead` (apply label `qualified` to the conversation, or send a webhook simulator):
   ```bash
   bash scripts/chatwoot-webhook-simulate.sh qualified_lead "<CONVERSATION_ID>" "<REFERENCE_CODE>"
   ```
2. Verify in `meta_conversion_events`:
   ```sql
   select event_name, status from public.meta_conversion_events
   where event_id like '%:chatwoot:QualifiedLead:%';
   ```
3. Verify in `funnel_events`:
   ```sql
   select event_name, stage, channel from public.funnel_events
   where reference_code = '<REFERENCE_CODE>' and event_name in ('qualified_lead','quote_sent');
   ```
4. Re-fire the webhook → `webhook_events` returns `deduped: true`, no extra `funnel_events` row.

## Step 6 — CRM itinerary confirmation

1. From CRM/Flutter, POST once when an itinerary/presupuesto changes to
   `Confirmado`:
   ```bash
   curl -X POST "http://localhost:$PORT/api/growth/events/itinerary-confirmed" \
     -H "Content-Type: application/json" \
     -H "x-bukeer-crm-secret: $CRM_CONVERSION_WEBHOOK_SECRET" \
     -d '{
       "itinerary_id": "<ITINERARY_UUID>",
       "booking_id": "<CRM_QUOTE_OR_BOOKING_ID>",
       "previous_status": "Presupuesto",
       "new_status": "Confirmado",
       "confirmed_at": "2026-05-02T12:00:00.000Z",
       "value": 2400,
       "currency": "EUR",
       "reference_code": "<REFERENCE_CODE>"
     }'
   ```
2. Verify:
   ```sql
   select event_name, reference_code, payload, provider_status
   from public.funnel_events
   where payload @> jsonb_build_object('itinerary_id', '<ITINERARY_UUID>');

   select event_name, event_id, status, request_payload
   from public.meta_conversion_events
   where event_name = 'Purchase'
     and event_id = 'purchase:<ITINERARY_UUID>';
   ```
3. Re-send the same itinerary with a later `confirmed_at`. Expected: API
   returns `deduped=true`; no second Meta `Purchase` row is created.

## Step 7 — STRICT_ADS_ZERO smoke

```bash
STRICT_ADS_ZERO=1 npm run session:run -- --grep "strict ads zero"
```

Expected: 4/4 PASS (no pixel firing on first-load public routes pre-consent). The funnel_event writer does NOT change first-load posture — it only fires on user-intent endpoints (`/api/waflow/lead`, `/api/webhooks/chatwoot`, `/api/growth/events/itinerary-confirmed`).

## Failure triage

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Two rows in `funnel_events` for same event | Browser/server clocks differ by ≥1 s on `occurred_at` | Ensure browser-side emitter uses the same epoch-second truncation when pre-computing `event_id`. |
| `meta_conversion_events.status='failed'` | Test event code expired | Refresh `META_TEST_EVENT_CODE` in Meta Events Manager. |
| Funnel row missing `attribution.utm` | `body.attribution` not forwarded by drawer | Inspect `AttributionSchema` strict — check drawer client passes `utm_*` keys. |
| RLS blocks SELECT in dashboard | Reader is not service role and account_id mismatch | Confirm `auth.uid() = account_id`; service-role queries always succeed. |

## Rollback

If a contract regression slips through, revert the route extensions; the migration is additive and safe to leave in place. Truncate `funnel_events` is OK in staging:

```sql
truncate public.funnel_events;
```
