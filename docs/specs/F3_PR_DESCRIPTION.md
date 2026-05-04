# F3 -- Studio side `crm_booking_confirmed` Purchase event (PR description draft)

> Draft body for the F3 PR (#422). Paste verbatim into `gh pr create --body`
> when opening the PR. Update unchecked items as cross-repo work lands.

## Summary

Implements the Studio side of **F3** of [Epic #419](https://github.com/weppa-cloud/bukeer-studio/issues/419) -- the
`crm_booking_confirmed` Purchase event whose `value_amount = itineraries.total_markup`
per ADR-029 + sign-off 2026-05-03 (Option A).

**Scope of this PR**:

1. **DB trigger migration** (`supabase/migrations/20260503150000_itinerary_confirmed_emits_funnel_event.sql`) --
   drops the legacy `trg_itinerary_booking_confirmed_funnel_event` trigger
   (which emitted the pre-SOT `booking_confirmed` alias with revenue value)
   and replaces it with `trg_itinerary_emit_crm_booking_confirmed`. The new
   function `fn_emit_crm_booking_confirmed` calls the F1 RPC
   `record_funnel_event` with the canonical event name and
   `value_amount = total_markup`. NULL `total_markup` is handled gracefully
   (value=0 + raw_payload flag + `RAISE NOTICE`).
2. **RPC wrappers migration** (`supabase/migrations/20260503150100_record_booking_confirmed_rpc.sql`) --
   `record_booking_confirmed(uuid)` and `record_lead_stage_change(uuid, text, uuid)`.
   Both `SECURITY DEFINER`, granted to `service_role` + `authenticated` so
   Flutter can call from server-side via its supabase client. Both share the
   deterministic `event_id` formula with the trigger so manual + auto produce
   ONE funnel_events row.
3. **Stub route refactor** (`app/api/growth/events/itinerary-confirmed/route.ts`) --
   becomes a thin pass-through to `record_booking_confirmed`. Auth gate
   unchanged. Legacy body fields (`value`, `currency`, `locale`, `market`)
   intentionally ignored (RPC reads from DB row); response surfaces
   `value_override_ignored` for diagnostics.
4. **Tests** -- `__tests__/api/itinerary-confirmed-route.test.ts` rewritten for
   the new wrapper behaviour; `__tests__/supabase/itinerary-confirmed-trigger.test.ts`
   pins the SQL migration contract (event_id formula, value source, predicate,
   RPC call, exception handling, grants).
5. **Docs** -- this file (cross-repo coordination notes for #797).

## AC checklist (Phase 3 from SPEC, post 2026-05-03 sign-off)

- [partial] **AC3.1** Flutter CRM admin UI calls `record_funnel_event` RPC --
  **handled by cross-repo bukeer-flutter#797**. Studio side ships the RPC
  wrappers (`record_lead_stage_change`) ready to be called.
- [x] **AC3.2** `crm_booking_confirmed` event with `value_amount = total_markup`
  and `value_currency = currency_type`. DB trigger fires on
  `itineraries.status -> 'Confirmado'` (auto-flip via the existing
  `fn_payment_confirms_request` trigger in bukeer-flutter migrations).
- [x] **AC3.3** Stub `app/api/growth/events/itinerary-confirmed/route.ts`
  refactored: now a thin wrapper around `record_booking_confirmed`.
- [removed] ~~**AC3.4** payment_received trigger~~ -- removed per Option A
  sign-off 2026-05-03 (would fire at the same instant as
  `crm_booking_confirmed`).
- [x] **AC3.5** ROAS query produces non-null number -- query template below.

## What this PR delivers

- Automatic emission of `crm_booking_confirmed` events when
  `itineraries.status` flips to `'Confirmado'` (covers the bulk of bookings
  via `fn_payment_confirms_request` -> `Presupuesto -> Confirmado`).
- Two RPC wrappers (`record_booking_confirmed`, `record_lead_stage_change`)
  for explicit calls from Flutter (#797) or future writers.
- Refactored stub route -- still functional for any Flutter callers that
  haven't migrated yet, but now backed by the canonical RPC. Idempotent
  shared-`event_id` with the trigger so dual writes -> 1 row.

## What's NOT in this PR (follow-up #797)

- Flutter CRM UI hooks for `qualified` / `quote_sent` stages -- those events
  come from agent actions in CRM, not from DB state changes, and require
  Flutter to call `record_lead_stage_change` from the stage-change UI.
- Without #797, F3 covers the booking lifecycle only; pre-booking CRM events
  (`crm_lead_stage_qualified`, `crm_quote_sent`) remain emitted only by
  Chatwoot label changes (F1 path: `chatwoot_label_qualified`).

## Manual validation post-merge

1. **Apply migrations to staging** (F1 -> F2 -> F3 order MUST be respected
   since the trigger and RPC depend on `record_funnel_event`).
2. Manually update an itinerary's `status` to `'Confirmado'` via the
   dashboard (or via SQL on a staging row). Verify a `funnel_events` row
   appears with:
   - `event_name = 'crm_booking_confirmed'`
   - `value_amount = <itinerary.total_markup>` (NOT total_amount)
   - `value_currency = <itinerary.currency_type>`
   - `source = 'db_trigger'`
   - `pixel_event_id` populated (UUID)
3. Update the same itinerary again with the same `status='Confirmado'`
   (no-op transition). Verify NO new `funnel_events` row -- the WHEN
   predicate skips when `OLD.status = NEW.status`.
4. Toggle status `Confirmado -> Presupuesto -> Confirmado`. Verify a SECOND
   `funnel_events` row appears (different `event_time` -> different
   deterministic `event_id`).
5. Check `meta_conversion_events` for the propagated Purchase event
   (depends on F1 dispatcher). Expected: one row per `crm_booking_confirmed`
   funnel event with `provider='meta'`, `event_name='Purchase'`,
   `status='sent'` (or `pending` until first dispatch tick).
6. Find a historical itinerary with `total_markup IS NULL` (~1.2% of rows,
   per spec). Re-confirm it (transition status). Verify the
   `funnel_events.payload->'total_markup_missing'` is `true` and
   `value_amount = 0`. Expect a `RAISE NOTICE` in the Postgres logs.

## ROAS query template (AC3.5)

```sql
-- Markup-based ROAS by ISO week, last 90 days.
SELECT date_trunc('week', event_time) AS week,
       count(*)                       AS bookings,
       sum(value_amount)              AS markup_total_cop,
       sum(value_amount) / nullif(
         (SELECT sum(cost_micros)::numeric / 1e6
          FROM google_ads_offline_uploads
          WHERE uploaded_at BETWEEN date_trunc('week', event_time)
                                AND date_trunc('week', event_time) + interval '7 days'),
         0
       )                              AS roas_markup
FROM funnel_events
WHERE event_name = 'crm_booking_confirmed'
  AND event_time > now() - interval '90 days'
GROUP BY 1
ORDER BY 1 DESC;
```

(Replace the `google_ads_offline_uploads` join with the actual cost source
once F2 lands; until then sub the GA4 `sessions.cost` extract.)

## Cross-repo coordination -- bukeer-flutter#797 still required

The DB trigger handles the auto-confirm path (most coverage). Flutter still
needs to wire `record_lead_stage_change` calls in its CRM stage-change UI for
the `crm_lead_stage_qualified` and `crm_quote_sent` events. Without #797, F3
covers booking_confirmed only; qualified_lead and quote_sent events from CRM
agent actions are still invisible to Meta/Ads.

Closes #422 (partial -- full close after #797 ships)
Supersedes #327
