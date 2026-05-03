# SPEC: Funnel Events as Source of Truth

## GitHub Tracking
- **Epic Issue**: [#419](https://github.com/weppa-cloud/bukeer-studio/issues/419)
- **Child Issues**: [#420 (F1)](https://github.com/weppa-cloud/bukeer-studio/issues/420), [#421 (F2)](https://github.com/weppa-cloud/bukeer-studio/issues/421), [#422 (F3)](https://github.com/weppa-cloud/bukeer-studio/issues/422), [#423 (F4)](https://github.com/weppa-cloud/bukeer-studio/issues/423), [`bukeer-flutter#797` (F3-flutter)](https://github.com/weppa-cloud/bukeer-flutter/issues/797)
- **Milestone**: ColombiaTours Growth OS 90D (due 2026-07-24)
- **Area**: studio + flutter (cross-repo) + supabase

## Status
- **Author**: Growth + Tech leads (drafted via /specifying)
- **Date**: 2026-05-03
- **Status**: Draft — awaiting approval before opening GitHub artifacts
- **ADRs referenced**: [[ADR-018]] (webhook idempotency), [[ADR-025]] (studio/flutter ownership), [[ADR-029]] (funnel events as SOT — this spec is the operational counterpart)
- **Cross-repo impact**: bukeer-flutter writes via new RPC `record_funnel_event`; reads `funnel_events` for CRM dashboards; shares `meta_conversion_events`, `google_ads_offline_uploads`.

## Summary

Establish the operational system that implements [[ADR-029]]: a single canonical `funnel_events` table in Supabase as the source of truth for every funnel event in any Bukeer tenant, with three controlled writers (Studio worker, Flutter CRM, Postgres triggers) and a single dispatcher Edge Function that fans events out to Meta CAPI, Google Ads offline upload, GA4 Measurement Protocol, and any future ad platform — all deduplicated via a global `event_id`.

## Motivation

See [[ADR-029]] for full context. Three concrete pains this spec resolves:

1. **Silent tracking failures.** The `lead_calificado_form` Google Ads conversion action stopped registering on 2026-01-13. The drop was discovered four months later in a manual audit. With `funnel_events` SOT, a daily count anomaly fires within hours.
2. **Conversion sprawl.** Five `SUBMIT_LEAD_FORM` conversion actions coexist in Google Ads (only one is the goal, three accumulate parallel data, two are stale). Without a canonical writer, every team / sprint adds another action "to be safe". This spec consolidates to one writer per stage.
3. **CRM events invisible.** Flutter CRM stage changes (`qualified_lead`, `quote_sent`, `booking_confirmed`) never reach Meta or Google Ads. The full funnel below "lead submitted" is a black box for paid optimization. ROAS is not measurable.

## User Flows

### Flow 1: Lead from Google Ads click → booking confirmed (happy path)

1. **Visitor clicks Google Ads ad** with `gclid=ABC123`. Lands on `/destinos/cartagena?gclid=ABC123`.
2. **Studio worker** captures `gclid` from URL, persists in session cookie + sends `pageview` event to `funnel_events`.
3. **Visitor clicks WhatsApp CTA**. Studio fires `whatsapp_cta_click` event with `gclid=ABC123`, `fbp`, `event_id=uuid1`.
4. **Studio worker** writes row to `funnel_events`. Dispatcher reads new row → fires Meta CAPI `Contact` (with `event_id=uuid1`) and queues GA4 MP `cta_whatsapp`.
5. **Visitor opens WhatsApp**. Chatwoot creates conversation with `ctwa_clid` linking back to the Meta ad. Webhook hits Studio → `chatwoot_conversation_started` event written to `funnel_events`. Dispatcher fires Meta CAPI messaging `Contact`.
6. **Agent in Chatwoot replies**, qualifies the lead, applies label "qualified". Webhook → `chatwoot_label_qualified` event → dispatcher fires Meta CAPI `Lead` + Google Ads offline upload `qualified_lead` (with `gclid=ABC123` for attribution).
7. **Agent in Flutter CRM** marks lead stage as `quote_sent`. Flutter calls Supabase RPC `record_funnel_event({event_name: 'crm_quote_sent', user_email, gclid: 'ABC123', ...})`. Dispatcher fires Meta `InitiateCheckout` + Google Ads `quote_sent`.
8. **Customer pays.** Flutter (or DB trigger on `payments`) fires `crm_booking_confirmed` with `value_amount=4500000`, `value_currency='COP'`. Dispatcher fires Meta CAPI `Purchase` (value) + Google Ads offline upload `booking_confirmed` (value, gclid).
9. **Google Ads** now has the full attribution chain: `gclid=ABC123` → click → click cost (from spend) → qualified → quote → purchase value. Smart Bidding can optimize for true ROAS.

### Flow 2: CRM-only correction (edge case)

1. Agent realizes a lead from last week was incorrectly marked. Updates stage in Flutter CRM from `quote_sent` to `lead_dropped`.
2. Flutter calls `record_funnel_event({event_name: 'crm_lead_dropped', event_id: uuid_new, related_event_id: uuid_quote_sent, ...})`.
3. Dispatcher reads mapping: `crm_lead_dropped` is **not** mapped to any platform (internal-only event for funnel reporting). No external API call.
4. Internal dashboards reflect the corrected funnel.

### Flow 3: Replay / backfill (operational edge)

1. Devs realize Meta CAPI was disabled for 6 hours due to a misconfigured env var. Events were written to `funnel_events` but `meta_conversion_events` shows `status=skipped` for that window.
2. Run replay CLI: `npm run dispatch:replay -- --destination=meta --since=2026-05-03T10:00 --until=2026-05-03T16:00`.
3. CLI selects matching `funnel_events` rows whose `meta_conversion_events` entry is `skipped` or missing, re-invokes dispatcher with `force=true`. Dedup via `event_id` ensures Meta does not double-count.

### Flow 4: New ad platform (LinkedIn — illustrative future)

1. Add migration row to `event_destination_mapping`: `(funnel_event_name='waflow_submit', destination='linkedin', destination_event_name='Lead', value_field=null)`.
2. Implement `dispatchToLinkedIn(event)` in dispatcher (~50 lines).
3. Add `linkedin_conversions` log table with same idempotency pattern.
4. Done. No change to writers, no change to existing destinations.

## Acceptance Criteria

### Phase 1 — `funnel_events` SOT + dispatcher skeleton (Sprint 1)

- [ ] **AC1.1** `funnel_events` table exists with canonical schema (per ADR-029 schema section). Migration applied to dev, staging, prod.
- [ ] **AC1.2** `event_destination_mapping` table seeded with all 14 events from ADR-029 matrix.
- [ ] **AC1.3** Supabase RPC `record_funnel_event(payload jsonb)` exists, validates against mapping, idempotent on `event_id`. RLS: service-role write, tenant-scoped read.
- [ ] **AC1.4** Existing waflow lead path migrated: `app/api/waflow/lead/route.ts` writes to `funnel_events` instead of calling `sendMetaEvent` directly.
- [ ] **AC1.5** Existing chatwoot webhook migrated: `app/api/webhooks/chatwoot/route.ts` writes to `funnel_events`.
- [ ] **AC1.6** Existing whatsapp-cta beacon migrated: `app/api/growth/events/whatsapp-cta/route.ts` writes to `funnel_events`.
- [ ] **AC1.7** Dispatcher Edge Function `dispatch-funnel-event` deployed; subscribes to `funnel_events` INSERT (via Supabase Realtime or DB trigger + `pg_net`). For Meta destination, invokes existing `lib/meta/conversions-api.ts` logic. Writes outcome to `meta_conversion_events`.
- [ ] **AC1.8** Volume parity verified: count of Meta CAPI events sent in 24h post-cutover ≥ 95% of count in 24h pre-cutover (allow drift for pure noise / bot traffic).
- [ ] **AC1.9** Monitoring dashboard shows daily event counts per `event_name` and per `source`. Alerting on >50% drop day-over-day.

### Phase 2 — Google Ads dispatcher branch (Sprint 2, integrates #332)

- [ ] **AC2.1** `gclid`, `gbraid`, `wbraid` captured from URL query params on every Studio entry; persisted in 90-day cookie + included in every `funnel_events` row that originates from a session with that cookie.
- [ ] **AC2.2** New conversion actions created in Google Ads UI: `waflow_submit`, `quote_form_submit`, `qualified_lead`, `quote_sent`, `booking_confirmed` (with value_settings), `payment_received`. All marked `primary=true`, `include_in_conversions_metric=true`.
- [ ] **AC2.3** `google_ads_offline_uploads` log table exists. Dispatcher branch for Google Ads invokes the Conversions Upload API; writes status (`pending`/`sent`/`failed`).
- [ ] **AC2.4** Legacy GA4-imported actions (`ColombiaTours - GA4 (web) envio_formulario`, `form_submit`, `lead_calificado_form`) reclassified to `primary=false, include_in_conversions_metric=false` in Google Ads UI. Not deleted (historical data preservation).
- [ ] **AC2.5** Smart Bidding strategies on reactivated campaigns (per Google Ads audit recommendations) point to the new `waflow_submit` conversion action.
- [ ] **AC2.6** End-to-end test: a controlled lead with `gclid=TEST123` flows from waflow_submit → qualified_lead → booking_confirmed; Google Ads UI shows the conversion against `gclid=TEST123` within 24h.

### Phase 3 — Flutter CRM writer + Purchase event (Sprint 3, integrates #327 and G4 from audit)

- [ ] **AC3.1** Flutter CRM admin UI: when agent changes lead stage, calls `record_funnel_event` RPC with the appropriate `event_name` (`crm_lead_stage_qualified`, `crm_quote_sent`, `crm_booking_confirmed`, `crm_lead_dropped`).
- [ ] **AC3.2** `crm_booking_confirmed` event includes `value_amount` (booking total) and `value_currency`. Dispatcher fires Meta `Purchase` and Google Ads offline upload with value populated.
- [ ] **AC3.3** Existing stub `app/api/growth/events/itinerary-confirmed/route.ts` either removed (if Flutter writes directly) or refactored to write `funnel_events` (if Studio still has signal).
- [ ] **AC3.4** DB trigger on `payments` table fires `payment_received` event automatically when payment row inserts with `status='succeeded'`.
- [ ] **AC3.5** End-to-end test: lead from Phase 2 test now has full chain in `funnel_events` ending in `crm_booking_confirmed` with value. Reporting query produces ROAS = `SUM(value_amount) / SUM(google_ads_cost) for that gclid`.

### Phase 4 — Hardening (Sprint 4)

- [ ] **AC4.1** Replay CLI implemented and documented in [`docs/ops/funnel-events-runbook.md`](../ops/funnel-events-runbook.md).
- [ ] **AC4.2** 90-day retention policy on raw PII columns (email, phone, IP) — automated job nullifies after retention; hashed copies in destination logs persist.
- [ ] **AC4.3** Identity merge logic: when a `funnel_events` row arrives with a new `user_email` but matches an existing `external_id` or `user_id`, link records via internal `funnel_identity_links` table. Documented in spec follow-up.
- [ ] **AC4.4** Per-tenant overrides in `event_destination_mapping` (e.g., tenant-specific Pixel ID, conversion action ids). Multi-tenant readiness for future Bukeer customers.
- [ ] **AC4.5** Runbook + QA checklist (closes #328).

## Data Model Changes

| Table | Column | Type | Notes |
|-------|--------|------|-------|
| `funnel_events` | full schema | per ADR-029 | NEW table; one row per event |
| `event_destination_mapping` | `funnel_event_name` | text PK | NEW table |
| `event_destination_mapping` | `destination` | text PK | `meta` \| `google_ads` \| `ga4` \| `tiktok` \| ... |
| `event_destination_mapping` | `destination_event_name` | text | Platform-specific name |
| `event_destination_mapping` | `value_field` | text NULL | Column from `funnel_events` to use as value (e.g. `value_amount`) |
| `event_destination_mapping` | `enabled` | boolean DEFAULT true | |
| `event_destination_mapping` | `tenant_overrides` | jsonb | Per-tenant config |
| `google_ads_offline_uploads` | full schema | (NEW per #332) | Idempotent log |
| `ga4_measurement_protocol_events` | full schema | (NEW, optional Phase 2/4) | Idempotent log |
| `funnel_identity_links` | full schema | (NEW Phase 4) | Identity stitching |
| `payments` | – | – | EXISTS in Flutter; AFTER INSERT trigger added Phase 3 |
| `leads` (or equivalent) | – | – | EXISTS in Flutter; stage change RPC documented Phase 3 |

Migration path: forward-only. `funnel_events` starts empty; existing direct Meta CAPI calls continue until Phase 1 cutover. No backfill required (historical data lives in `meta_conversion_events`).

## API / Contract Changes

| Endpoint/RPC/Schema | Method | Payload | Notes |
|---------------------|--------|---------|-------|
| `record_funnel_event(payload jsonb)` | Supabase RPC | `{event_id, event_name, event_time, source, user_email?, user_phone?, gclid?, fbp?, ...}` | Idempotent on `event_id`. Validates `event_name` against mapping. |
| `record_lead_stage_change(lead_id uuid, new_stage text, agent_id uuid)` | Supabase RPC | – | Wrapper that derives event_name from stage transition + calls `record_funnel_event` |
| `record_booking_confirmed(booking_id uuid)` | Supabase RPC | – | Wrapper for booking; reads value from booking row + calls `record_funnel_event` |
| `dispatch-funnel-event` | Supabase Edge Function | trigger payload from `funnel_events` INSERT | Reads mapping; for each enabled destination, invokes destination-specific dispatcher; writes log row |
| Existing `app/api/waflow/lead/route.ts` | refactor | – | Stops calling `sendMetaEvent` directly; calls `record_funnel_event` instead |
| Existing `app/api/webhooks/chatwoot/route.ts` | refactor | – | Same pattern |
| Existing `lib/meta/conversions-api.ts` | refactor | – | Becomes a destination-specific module invoked only by dispatcher |
| New CLI `npm run dispatch:replay` | command | `--destination=<>`, `--since=<>`, `--until=<>` | Re-emit events to a destination |

## Permissions (RBAC)

| Role | Read `funnel_events` | Write `funnel_events` | Read `*_events` logs | Manage mapping |
|------|----------------------|----------------------|----------------------|----------------|
| super_admin | yes | via RPC | yes | yes |
| owner | tenant-scoped | via RPC | tenant-scoped | no |
| admin | tenant-scoped | via RPC | tenant-scoped | no |
| agent | tenant-scoped | via RPC (CRM stage changes only) | no | no |
| service_role | all | direct + via RPC | all | yes |
| anon | no | no | no | no |

`record_funnel_event` RPC is callable by `service_role` only. Studio worker and Flutter CRM call it via service-role client (server-side). Browser code never calls it directly — browser fires Pixel + posts to a public Studio endpoint that, in turn, calls the RPC server-side.

## Affected Files / Packages

### bukeer-studio
- NEW: `supabase/migrations/<ts>_funnel_events_canonical.sql` (table + indexes + RLS)
- NEW: `supabase/migrations/<ts>_event_destination_mapping.sql` (config table + seed)
- NEW: `supabase/migrations/<ts>_record_funnel_event_rpc.sql`
- NEW: `supabase/functions/dispatch-funnel-event/index.ts` (Edge Function)
- NEW: `lib/funnel/dispatch.ts`, `lib/funnel/destinations/{meta,google-ads,ga4,tiktok}.ts`
- NEW: `lib/funnel/event-id.ts` (UUIDv4 generation + Pixel/CAPI dedup helpers)
- NEW: `scripts/replay-dispatch.ts` (CLI)
- NEW: `docs/ops/funnel-events-runbook.md`
- REFACTOR: `app/api/waflow/lead/route.ts`, `app/api/webhooks/chatwoot/route.ts`, `app/api/growth/events/whatsapp-cta/route.ts`, `app/api/growth/events/itinerary-confirmed/route.ts`
- REFACTOR: `lib/meta/conversions-api.ts` (becomes destination module, called by dispatcher only)
- NEW: `lib/google-ads/offline-upload.ts` (Phase 2, ships with #332)
- NEW: `lib/analytics/gclid-capture.ts` (Phase 2)

### bukeer-flutter
- NEW: `lib/services/funnel_event_service.dart` (calls `record_funnel_event` RPC)
- NEW: hooks in lead-stage-change UI flow + booking-confirm UI flow
- NEW: `supabase/migrations/<ts>_payments_after_insert_funnel_event.sql` (DB trigger; co-located with Studio migrations since DB is shared)

### Cross-cutting
- UPDATE: `docs/INDEX.md` — add entries for ADR-029 + this SPEC
- UPDATE: `docs/specs/SPEC_META_CHATWOOT_CONVERSIONS.md` (stub) — add note that this SPEC supersedes the direct-call architecture
- UPDATE: `CLAUDE.md` — section "Funnel events SOT" with quick reference

## Test Strategy

- **Unit tests** for each destination module (mock fetch; assert payload shape, hashing, dedup key).
- **Integration test** for dispatcher: insert `funnel_events` row → assert log table updated → assert mock destination invoked once.
- **E2E test** with Playwright: simulate visitor with `gclid` → fill waflow → verify `funnel_events` row created with all attribution fields.
- **Volume parity test** during Phase 1 cutover (AC1.8).
- **Replay test**: simulate Meta API outage → verify events logged with `skipped` → run replay CLI → verify events resent.

## Rollout Plan

| Phase | Sprint | Issues | Owner | Gate to next phase |
|-------|--------|--------|-------|--------------------|
| 0 | – | this SPEC + ADR-029 | Growth + Tech leads | Approval |
| 1 | Sprint 5 | NEW epic + 4 children | Studio dev | AC1.* all met + parity verified |
| 2 | Sprint 6 | #332 (existing) + new children | Studio dev + Ads ops | AC2.* all met + 1 attributed conversion in Ads UI |
| 3 | Sprint 7 | #327 + new G4 issue | Studio + Flutter devs | AC3.* all met + ROAS query produces real number |
| 4 | Sprint 8 | hardening | Studio dev | AC4.* all met |

## Risks

| Risk | Mitigation |
|------|------------|
| Phase 1 cutover loses events | Keep direct-call code in place behind feature flag for first 48h; flip flag only after volume parity confirmed |
| Dispatcher latency adds visible delay | Dispatcher is async (writer returns immediately after `funnel_events` insert); destination calls are best-effort with retry |
| Flutter dev unavailable for Phase 3 | Phase 3 can ship without Flutter writer if DB triggers on `payments`/`bookings` cover the critical Purchase event path |
| Per-tenant mapping complexity | Phase 4 only; pilot with ColombiaTours hardcoded mapping until proven |
| PII compliance | 90-day retention + hashed-only in destination logs (Phase 4 AC4.2) |

## Out of Scope (deferred)

- Multi-touch attribution (first-touch, linear, etc.) — deferred to a future SPEC. Initial implementation uses last-touch via `gclid` / `fbc`.
- Server-side GTM Container — not needed; dispatcher replaces it.
- Customer Match / audience export to Meta/Ads — separate spec.
- Reverse ETL to data warehouse (BigQuery, Snowflake) — separate spec.

## L10N

No user-visible strings introduced.

## Open Questions

1. **Edge Function vs DB trigger + pg_net**: which deployment model for the dispatcher? Recommendation: Edge Function for portability + observability; DB trigger fires `pg_net` POST to the Edge Function URL.
2. **Identity merge** (Phase 4 AC4.3): exact algorithm — match on email AND phone? Email OR phone? Defer to Phase 4 design doc.
3. **Booking value definition** (Phase 3 AC3.2): is "Purchase" the deposit, the full payment, or the contract signed? Requires Product + Growth alignment before Phase 3 starts.
4. **Tenant scope in dispatch_log tables**: include `tenant_id` directly, or join via `funnel_events`? Recommendation: include directly for query performance.
