# ColombiaTours Funnel Measurement Cycle Audit

Date: 2026-05-18T16:14:47Z
Scope: ColombiaTours / Bukeer Studio funnel traceability, Supabase configuration, and live dispatch health.
Mode: read-only. No campaigns, Supabase rows, functions, cron jobs, or platform settings were mutated.

## Verdict

The full measurement cycle is not closed.

Capture into `funnel_events` is working, WAFlow attribution persistence is materially improved, and ColombiaTours has the expected destination mappings and platform goal bindings. The blocker is downstream delivery: recent events are not being dispatched to Meta CAPI, GA4 Measurement Protocol, or Google Ads offline uploads.

Primary production root cause found: the live DB function `public.fn_invoke_dispatch_funnel_event(p_event_id text)` calls `dispatch-funnel-event` with a hardcoded URL and only `Content-Type: application/json`. It does not send an `Authorization` header. Supabase Edge logs and `net._http_response` show `401` responses with `UNAUTHORIZED_NO_AUTH_HEADER`.

## GitHub Traceability

Primary owner:

- `#419` — `[Epic] Funnel Events SOT — DB-centric tracking architecture (ADR-029)`. This is the direct technical Epic for `funnel_events`, `dispatch-funnel-event`, Meta CAPI, GA4 MP, Google Ads offline uploads, and the 7-day clean-flow closure gate.

Operational validation gate:

- `#456` — `chore(funnel): F5 — production validation 7D`. This audit fails the current 7-day validation because there is a stuck/failed dispatch backlog and zero recent destination ledger rows.

Umbrella / planning SSOT:

- `#310` — `EPIC: ColombiaTours Growth Operating System 2026`.
- `#337` — `SPEC: ColombiaTours Growth Operating System 2026`.

Related child work:

- `#332` — Google Ads enhanced conversions and offline lead stages. Closed as implementation, but current production evidence shows the dispatcher path is not delivering recent rows to `google_ads_offline_uploads`.
- `#330` — Organic CRO for WAFlow, WhatsApp CTA and planner routing. Capture is working, but CRM request attribution remains incomplete.

## Expected Cycle From Docs And Code

The documented architecture expects this path:

1. Browser/WAFlow/WhatsApp/CRM action emits a canonical funnel event.
2. Server-side writer calls `record_funnel_event(payload jsonb)`.
3. `funnel_events` becomes the source of truth.
4. `trg_funnel_events_dispatch_after_insert` invokes `dispatch-funnel-event` through `pg_net`.
5. The Edge Function reads `event_destination_mapping` and `platform_goal_bindings`.
6. Destination ledgers receive rows:
   - `meta_conversion_events`
   - `ga4_measurement_protocol_events`
   - `google_ads_offline_uploads`
7. Platform uploads and CRM lifecycle events allow attribution from paid click to lead, quote, booking, and revenue.

Relevant local references:

- `packages/website-contract/src/schemas/growth-events.ts`
- `lib/growth/funnel-events.ts`
- `lib/growth/attribution-parser.ts`
- `lib/funnel/dispatch.ts`
- `supabase/migrations/20260503130000_record_funnel_event_rpc.sql`
- `supabase/migrations/20260503130100_funnel_events_dispatch_trigger.sql`
- `supabase/migrations/20260503140000_google_ads_offline_uploads.sql`
- `supabase/functions/dispatch-funnel-event/index.ts`
- `docs/specs/SPEC_FUNNEL_EVENTS_SOT.md`
- `docs/specs/SPEC_FUNNEL_EVENTS_OBSERVABILITY_LAYER.md`
- `docs/specs/SPEC_FUNNEL_EVENTS_GOAL_PROVISIONING_SYNC.md`

Relevant recent commits reviewed:

- `5f66feb7 fix(growth): persist waflow attribution fields`
- `77cc5653 fix(chatwoot): reconcile duplicate webhook lead links`
- `cdedd095 feat(funnel): add platform goal provisioning sync`
- `c931e137 feat(funnel): enable GA4 measurement protocol dispatch`
- `08d471df fix: use atomic webhook event claim`

## ColombiaTours Tenant Configuration

Website:

- `website_id`: `894545b7-73ca-4dae-b76a-da5b6a3f8441`
- `account_id`: `9fc24733-b127-4184-aa22-12f03b98927a`
- Domain: `colombiatours.travel`
- Status: `published`
- Default locale: `es`
- Supported locales: `es`, `es-CO`, `en-US`, `pt-PT`, `fr-FR`, `de-DE`
- WhatsApp: `+573206129003`

Analytics configured in `websites.analytics`:

- GA4: `G-6ET7YRM7NS`
- GTM: `GTM-KM6HDBN`
- Google Ads: `AW-852643280`
- Meta Pixel: `361881980826384`
- Microsoft Clarity: `tj1pmavijv`

Active tenant channel config:

- `account_channel_contracts` has active `meta_capi` in production.
- Config keys present: `api_version`, `enabled`, `facebook_pixel_id`, `pixel_id`, `source`.
- Credential key present: `meta_access_token`.

Destination mappings are present:

- GA4 enabled mappings: 17
- Google Ads enabled mappings: 9
- Meta enabled mappings: 13
- Meta Messaging enabled mappings: 2

Key Google Ads conversion action mappings:

- `waflow_submit`: `7604169577`
- `quote_form_submit`: `7604169580`
- `crm_quote_sent`: `7604169583`
- `crm_booking_confirmed`: `7604169586`
- `crm_lead_stage_qualified`: `7394880695`
- `chatwoot_label_qualified`: `7394880695`

`platform_goal_bindings` are healthy for the core events:

- `waflow_submit`: GA4 `generate_lead`, Google Ads `7604169577`, Meta `Lead`.
- `crm_quote_sent`: GA4 `begin_checkout`, Google Ads `7604169583`, Meta `InitiateCheckout`.
- `crm_booking_confirmed`: GA4 `purchase`, Google Ads `7604169586`, Meta `Purchase`.
- `whatsapp_cta_click`: GA4 `cta_whatsapp`, Meta `Contact`, observation-only.
- `crm_lead_stage_qualified` and `chatwoot_label_qualified`: GA4 `qualify_lead`, Google Ads `7394880695`, Meta `Lead`.

## Live Funnel Health, Last 5 Days

Window: `now() - interval '5 days'` from production Supabase at 2026-05-18T16:14Z.

`funnel_events`:

- Total events: 264
- `waflow_open`: 96
- `whatsapp_cta_click`: 39
- `waflow_submit`: 37
- `crm_quote_sent`: 57
- `waflow_abandon`: 21
- `waflow_validation_error`: 14

Stage counts:

- `acquisition`: 96
- `activation`: 111
- `quote_sent`: 57

Attribution completeness in `funnel_events`:

- `reference_code`: 100.00%
- `source_url`: 100.00%
- Google click id (`gclid`/`gbraid`/`wbraid`): 67.80%
- `utm_campaign`: 61.36%

Reference-code chains:

- Unique chains: 128
- Has `waflow_open`: 69.53%
- Has intent or lead (`whatsapp_cta_click` or `waflow_submit`): 30.47%
- Has `waflow_submit`: 28.91%
- Has quote (`crm_quote_sent` or `quote_sent`): 18.75%
- Has booking (`crm_booking_confirmed` or `booking_confirmed`): 0.00%
- Has click id: 66.41%
- Has UTM: 59.38%

`waflow_leads`:

- Rows: 37
- Submitted: 100.00%
- Chatwoot conversation id present: 78.38%
- Google click id present: 64.86%
- `utm_campaign` present: 64.86%
- `reference_code` present: 100.00%
- `source_url` present: 91.89%

`requests` CRM table:

- Rows: 59
- `new_lead`: 54
- `qualified`: 1
- `closed_lost`: 4
- Chatwoot conversation id present: 100.00%
- Any UTM on request row: 0.00%
- `referral_code`: 0.00%
- `landing_url`: 0.00%
- click id in `custom_fields`: 0.00%

Destination ledgers, last 5 days:

- `meta_conversion_events`: 0
- `ga4_measurement_protocol_events`: 0
- `google_ads_offline_uploads`: 0

Dispatch status, last 5 days:

- `failed`: 259
- `pending`: 5
- `dispatched`: 0
- Failed rate: 98.11%

## Live Infrastructure Evidence

Tables exist:

- `funnel_events`
- `event_destination_mapping`
- `platform_goal_bindings`
- `meta_conversion_events`
- `ga4_measurement_protocol_events`
- `google_ads_offline_uploads`
- `waflow_leads`
- `requests`
- `net._http_response`
- `cron.job`

Triggers exist and are enabled on `funnel_events`:

- `trg_funnel_events_apply_governance_defaults`
- `trg_funnel_events_dispatch_after_insert`

Cron exists and is active:

- Job `funnel_events_redispatch`
- Schedule: `*/5 * * * *`
- Command: `select public.fn_funnel_events_redispatch_pending();`

The dispatch function in live DB differs from the expected migration behavior:

```sql
CREATE OR REPLACE FUNCTION public.fn_invoke_dispatch_funnel_event(p_event_id text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_url text := 'https://wzlxbpicdcdvxvdcvgas.functions.supabase.co/dispatch-funnel-event';
  v_request bigint;
begin
  select net.http_post(
    url := v_url,
    body := jsonb_build_object('funnel_event_id', p_event_id),
    headers := jsonb_build_object('Content-Type','application/json'),
    timeout_milliseconds := 10000
  ) into v_request;
  return true;
exception when others then
  raise warning 'fn_invoke_dispatch_funnel_event(%) failed: %', p_event_id, sqlerrm;
  return false;
end;
$function$
```

Problems:

- No `Authorization` header.
- No `apikey` header.
- No use of `current_setting('app.dispatch_service_role_key', true)`.
- The DB GUCs expected by the migration are not set in the inspected session:
  - `app.dispatch_function_url`: not present
  - `app.dispatch_service_role_key`: not present

`net._http_response` in the last 24 hours:

- `200`: 52 responses from other functions.
- `401`: 17 responses for dispatch attempts.
- Sample `401` body: `UNAUTHORIZED_NO_AUTH_HEADER`.

Supabase Edge logs in the last 24 hours also show:

- `POST | 401 | https://wzlxbpicdcdvxvdcvgas.functions.supabase.co/dispatch-funnel-event`

## 30-Day Context

`funnel_events`, last 30 days:

- Total events: 646
- `waflow_open`: 145
- `whatsapp_cta_click`: 127
- `waflow_submit`: 136
- `crm_quote_sent`: 102
- `quote_sent`: 46
- `crm_booking_confirmed`: 5
- `booking_confirmed`: 3
- `qualified_lead`: 5
- `crm_lead_stage_qualified`: 4
- `chatwoot_label_qualified`: 5

Dispatch status, last 30 days:

- `dispatched`: 333
- `failed`: 308
- `pending`: 5
- Dispatched rate: 51.55%

Interpretation:

- The cycle worked for part of the prior 30-day history.
- It is broken in the most recent 5-day window.
- The current failure is operational/config drift, not absence of funnel capture.

## Stage-by-Stage Status

| Stage | Status | Evidence |
|---|---:|---|
| Web and WAFlow capture | PASS | 264 `funnel_events` in 5 days; 37 `waflow_submit`; 100% `reference_code` and `source_url` in `funnel_events`. |
| Paid click attribution in `funnel_events` | PARTIAL PASS | 67.80% click-id presence and 61.36% `utm_campaign` in last 5 days. |
| WAFlow lead persistence | PASS with watch item | 37 `waflow_leads`, 100% submitted, 64.86% click-id/UTM campaign, 78.38% Chatwoot conversation id. |
| WhatsApp CTA tracking | PASS for capture | 39 `whatsapp_cta_click` events in 5 days. |
| Chatwoot / quote events | PASS for capture | 57 `crm_quote_sent` events in 5 days. |
| CRM request attribution | FAIL | 59 requests in 5 days, 100% Chatwoot id, but 0% UTM, `referral_code`, `landing_url`, and click-id fields. |
| Booking measurement | WATCH | 0 booking chains in 5 days; 8 booking-confirmed events in 30 days counting canonical + alias. |
| Platform dispatch | FAIL | 0 destination ledger rows in 5 days; 259 failed and 5 pending `funnel_events`; Edge/pg_net show 401. |
| Full measurement cycle | FAIL | Capture exists, but delivery to platform ledgers and CRM request attribution are incomplete. |

## Recommended Actions, Not Applied

P0: Repair dispatcher authentication.

- Replace live `fn_invoke_dispatch_funnel_event` with the migration-compatible version that reads `app.dispatch_function_url` and `app.dispatch_service_role_key`.
- Set the database GUCs at DB level:
  - `app.dispatch_function_url`
  - `app.dispatch_service_role_key`
- Ensure `net.http_post` sends at least:
  - `Content-Type: application/json`
  - `Authorization: Bearer <service-role-key>`
  - optionally `apikey: <service-role-key>` if required by current Supabase Edge auth posture.
- Validate with one controlled smoke event and confirm:
  - `funnel_events.dispatch_status = 'dispatched'`
  - `provider_status` has destination outcomes
  - at least one expected destination ledger row appears.

P0: Re-dispatch recent failed events after the auth fix.

- Requeue a bounded window, starting with ColombiaTours failed events from the last 5 days.
- Preserve idempotency by using existing `event_id` / `pixel_event_id`.
- Do not bulk-reset all tenants until the smoke confirms Meta, GA4, and Google Ads branches are healthy.

P0: Persist attribution into `requests`.

- Copy or derive these fields from `waflow_leads` / `funnel_events` when a CRM request is created or reconciled:
  - `utm_source`
  - `utm_medium`
  - `utm_campaign`
  - `landing_url`
  - `referral_code` / `reference_code`
  - `gclid`, `gbraid`, `wbraid` in `custom_fields` or first-class request columns if added later.
- Backfill recent ColombiaTours requests where `chatwoot_conversation_id` can join to `waflow_leads.chatwoot_conversation_id`.

P1: Normalize canonical aliases.

- Keep accepting aliases during transition, but normalize reporting around:
  - `crm_quote_sent` rather than `quote_sent`
  - `crm_booking_confirmed` rather than `booking_confirmed`
  - `crm_lead_stage_qualified` / `chatwoot_label_qualified` with explicit role separation.

P1: Review WAFlow redirect semantics.

- `waflow_leads.whatsapp_redirected_at` should be verified separately because submitted leads are present, but redirect semantics can affect WhatsApp handoff attribution.

P1: Run a 72-hour post-fix audit.

- Acceptance criteria:
  - `dispatch_status='failed'` below 1% for new ColombiaTours events.
  - New `waflow_submit` rows produce GA4, Meta, and Google Ads ledger entries where mapped.
  - New CRM `requests` retain UTM/click-id/reference attribution.
  - At least one quote event can be traced from paid click to `crm_quote_sent` and platform ledgers.

## Execution Update

Date: 2026-05-18T16:31Z

Actions applied after the read-only audit, with user approval:

1. Replaced live `public.fn_invoke_dispatch_funnel_event(text)` so `pg_net.http_post` sends `Authorization` and `apikey`.
2. Avoided writing service-role secrets to the repo or migration body. The function reads `app.dispatch_service_role_key` if present and falls back to Supabase Vault secret `service_role_key`.
3. Added local migration file: `supabase/migrations/20260518162000_fix_funnel_dispatcher_pgnet_auth.sql`.
4. Ran a controlled ColombiaTours smoke event: `codex-dispatch-smoke-20260518-1625-waflow-submit`.
5. Requeued the failed ColombiaTours 5-day window and dispatched it in bounded batches.
6. Backfilled CRM `requests` attribution for matched WAFlow/Chatwoot conversations.
7. Updated `app/api/webhooks/chatwoot/route.ts` so future WAFlow -> CRM links persist attribution into `requests`.

Smoke result:

- `funnel_events.dispatch_status`: `dispatched`.
- `provider_status`: Meta `dispatched`, GA4 `dispatched`, Google Ads `skipped` with `no_click_id`.
- `meta_conversion_events`: `Lead`, `status='sent'`.
- `ga4_measurement_protocol_events`: `generate_lead`, `status='sent'`.
- `google_ads_offline_uploads`: conversion action `7604169577`, `status='skipped'`, `error='no_click_id'`.
- Recent `net._http_response` after fix: HTTP `200`, no new `401` observed.

Requeue result:

- ColombiaTours 5-day `funnel_events`: all requeued rows moved to `dispatch_status='dispatched'`.
- Destination ledgers after requeue:
  - GA4 MP: `270 sent`.
  - Meta CAPI: `140 sent`.
  - Google Ads offline uploads: `30 skipped no_click_id`, `70 failed google_ads_oauth_failed_400`.

Remaining P0 after dispatcher fix:

- Google Ads offline upload auth still fails for events that have click IDs: `google_ads_oauth_failed_400`.
- This is now a Google Ads credential/OAuth issue, not a dispatcher/pg_net auth issue.

CRM attribution result:

- Updated `54` recent ColombiaTours `requests` via `chatwoot_conversation_id` -> `waflow_leads`.
- Last 5 days after backfill:
  - `utm_campaign`: `60.66%`.
  - `referral_code`: `88.52%`.
  - `landing_url`: `83.61%`.
  - click id in `custom_fields`: `60.66%`.
  - `reference_code` in `custom_fields`: `88.52%`.

Gate #456 restart:

- The 24h/7d validation clock can restart from `2026-05-18T16:31Z` for dispatcher health.
- It cannot be marked PASS until Google Ads OAuth is fixed or explicitly scoped as a separate blocking defect.

## Execution Update: Google Ads Offline Upload OAuth Closed

Date: 2026-05-18T16:50Z

Actions applied with user approval:

1. Validated the local Google Ads OAuth refresh flow without printing credentials: token endpoint returned HTTP 200 and an access token.
2. Confirmed the production Edge Function had all Google Ads secret names present, but production dispatch still failed with `google_ads_oauth_failed_400`, isolating the issue to stale/misaligned Edge secrets.
3. Rotated only Google Ads Edge secrets from the locally validated credential set and kept `GOOGLE_ADS_OFFLINE_UPLOAD_ENABLED=true`.
4. Updated and deployed `supabase/functions/dispatch-funnel-event/index.ts` so failed Google Ads offline-upload ledger rows can be retried safely:
   - Existing `sent` rows remain deduped and are not resent.
   - Existing `pending`, `skipped`, and duplicate rows remain protected.
   - Existing `failed` rows are restaged to `pending`, `retry_count` is incremented, and the same ledger row is updated after the provider response.
5. Smoke-tested one previously failed `waflow_submit` event. Result: Meta and GA4 were skipped as duplicates; Google Ads dispatched successfully and the ledger row moved to `sent` with `retry_count=1`.
6. Replayed the remaining 69 ColombiaTours Google Ads offline-upload failures with strict filters: destination `google_ads`, events `waflow_submit,crm_quote_sent`, click-id required, status `failed`, account `9fc24733-b127-4184-aa22-12f03b98927a`, website `894545b7-73ca-4dae-b76a-da5b6a3f8441`.

Validation after replay:

- Google Ads offline uploads, recent 5-day window:
  - `70 sent`, `0 failed`, `0 pending`.
  - `30 skipped no_click_id` remain correct no-op rows.
- By conversion action:
  - `waflow_submit` / `7604169577`: `26 sent`, `13 skipped no_click_id`.
  - `crm_quote_sent` / `7604169583`: `44 sent`, `17 skipped no_click_id`.
- All 70 click-id-bearing `waflow_submit` / `crm_quote_sent` events in the replay window are `dispatch_status='dispatched'`.
- Replay artifact: `artifacts/google-ads/2026-05-18-colombiatours-offline-upload-replay/dispatch-replay-google_ads-report.json`.

Updated gate status:

- Previous blocker `google_ads_oauth_failed_400` is closed for the controlled 5-day replay window.
- The funnel cycle is now technically closed across capture, dispatcher, Meta CAPI, GA4 MP, Google Ads offline upload, and CRM attribution persistence/backfill for matched recent requests.
- Gate #456 can restart from `2026-05-18T16:50Z` for new-event production health. Recommended 72-hour validation remains required before marking the 7D gate complete.
