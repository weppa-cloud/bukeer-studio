# SPEC: Funnel Events Observability Layer

## GitHub Tracking
- **Epic Issue**: [#419](https://github.com/weppa-cloud/bukeer-studio/issues/419)
- **Child Issue**: [#491](https://github.com/weppa-cloud/bukeer-studio/issues/491)
- **Milestone**: ColombiaTours Growth OS 90D
- **Area**: growth

## Status
- **Author**: Codex + Growth engineering
- **Date**: 2026-05-11
- **Status**: Implementing
- **ADRs referenced**: [[ADR-029]], [[ADR-016]], [[ADR-010]]
- **Cross-repo impact**: Shared Supabase reads only. `bukeer-flutter` remains writer owner for CRM lifecycle events through `record_funnel_event`.

## Summary

Add the GA4 + Microsoft Clarity observability layer around [[SPEC_FUNNEL_EVENTS_SOT]] without making either platform the source of truth. `funnel_events` remains the canonical operational log; GA4 receives a reporting copy of selected canonical events, Clarity receives non-PII behavioral context, and Growth OS/agents consume a unified Supabase view that correlates platform delivery, UX friction, CRM outcome, and paid-media attribution.

## Motivation

The current production system can prove that real `funnel_events` are written and dispatched to Meta/Google, but GA4 only reports basic events (`page_view`, `session_start`, `first_visit`) and cannot yet answer WAFlow abandonment, validation error, or full-funnel questions. Clarity is connected through provider profiles, but its behavioral signals are not consistently joined to canonical funnel events, campaign IDs, or CRM outcomes.

The business need is to make optimization evidence available to both humans and IA agents:

- Paid-media decisions must use canonical CRM and booking outcomes, not GA4-only conversions.
- Landing and WAFlow UX decisions need GA4 path/session context plus Clarity friction signals.
- Future Codex/Growth OS agents need one durable query surface with enough context to recommend changes that affect revenue.

## Principles

1. **Supabase is truth.** GA4 and Clarity are observation surfaces, never primary conversion SOT.
2. **Server-side critical events.** Browser `gtag` may remain for page/session behavior, but canonical funnel events are copied to GA4 through dispatcher/Measurement Protocol.
3. **No PII in analytics tools.** GA4/Clarity payloads use reference codes, hashes, campaign IDs, page paths, variants, and event names; no raw phone/email.
4. **Multi-tenant by contract.** Tenant GA4/Clarity config resolves from website/integration tables, not global production env except local/test fallback.
5. **One query surface for agents.** Growth OS reads a normalized Supabase view, not ad hoc GA4, Clarity, Meta, and Google queries in isolation.

## User Flows

### Flow 1: Paid click becomes observable full funnel
1. Visitor lands with `gclid` on a ColombiaTours landing.
2. Website/WAFlow writes `waflow_submit` to `funnel_events`.
3. Dispatcher sends Meta/Google optimization events and GA4 Measurement Protocol reporting copy.
4. Clarity session is tagged with non-PII context such as tenant, market, landing path, campaign ID, and WAFlow variant.
5. Growth OS view shows campaign -> landing -> WAFlow submit -> WhatsApp conversation -> CRM opportunity -> platform delivery status.

### Flow 2: WAFlow abandonment analysis
1. Visitor opens WAFlow and leaves before submit.
2. Website records `waflow_open` and either `waflow_abandon` or timed/session-end proxy event.
3. GA4 receives reporting copy for funnel exploration.
4. Clarity profile links page/session friction signals to the same landing and variant.
5. Growth agent can identify the step, landing, campaign, device, and market with highest loss.

### Flow 3: Agent optimization brief
1. Codex/Growth OS asks for last 24h quality.
2. System reads the unified observability view.
3. Output separates traffic, activation, CRM quality, booking value, platform delivery, and UX friction.
4. Recommendations cite concrete evidence and never infer conversions from GA4 alone when `funnel_events` disagrees.

## Acceptance Criteria

- [x] AC1: `event_destination_mapping` has enabled `ga4` rows for canonical reporting events: `whatsapp_cta_click`, `waflow_open`, `waflow_submit`, `waflow_validation_error`, `waflow_abandon`, `crm_lead_stage_qualified`, `crm_quote_sent`, and `crm_booking_confirmed`.
- [x] AC2: `ga4_measurement_protocol_events` exists as an idempotent delivery log with tenant scope, `funnel_event_id`, destination event name, status, redacted payload, provider response, error, and timestamps.
- [x] AC3: Dispatcher can send GA4 Measurement Protocol events from `funnel_events` using tenant GA4 config, while preserving browser GA4 page/session tracking.
- [ ] AC4: GA4 key events are configured for `generate_lead`, `qualify_lead`, `begin_checkout`, and `purchase`; legacy/imported conversion signals are documented as reporting-only where applicable.
- [ ] AC5: WAFlow emits or persists `waflow_open`, `waflow_validation_error`, and `waflow_abandon` so abandonment can be measured outside GA4.
- [ ] AC6: Clarity tags/session context include tenant, website, market, landing path, campaign ID when available, WAFlow variant, and hashed/reference identifiers only.
- [ ] AC7: A Supabase view or materialized query (`growth_funnel_observability_v1`) joins `funnel_events`, `waflow_leads`, `requests`, `itineraries`, Meta logs, Google uploads, GA4 MP logs, and latest Clarity/GA4 provider profile evidence.
- [ ] AC8: Production readout for ColombiaTours shows one 24h report with counts for funnel events, GA4 MP delivery, Meta delivery, Google uploads, Clarity profile freshness, CRM opportunities, and known gaps.
- [ ] AC9: Documentation states that IA agents must treat `funnel_events` as conversion truth and GA4/Clarity as diagnostic signals.

## Data Model Changes

| Table / View | Change | Notes |
|--------------|--------|-------|
| `event_destination_mapping` | Add/verify `destination='ga4'` rows | Reporting delivery, not bidding policy. |
| `ga4_measurement_protocol_events` | New table | Idempotent GA4 MP delivery ledger. |
| `funnel_events` | Add/verify `waflow_open`, `waflow_validation_error`, `waflow_abandon` names in constraint | Needed for abandonment measurement. |
| `growth_funnel_observability_v1` | New view/materialized view | Agent-friendly correlation surface. |
| `growth_profile_runs` | Reuse existing provider run ledger | Stores GA4/Clarity extraction profiles and freshness evidence. |

Migration path: forward-only. No historical replay to GA4 by default; replay requires explicit bounded runbook command.

Implementation evidence 2026-05-11:

- Migration `20260511162000_ga4_measurement_protocol_events.sql` applied in production and mirrored to `bukeer-flutter`.
- `dispatch-funnel-event` resolves GA4 Measurement Protocol config from tenant `seo_integrations` (`property_id`, `metadata.measurement_id`, `api_token`) and only uses env fallback for local/test.
- ColombiaTours smoke: `crm_quote_sent` reference `PRICIN-1105-TV55` dispatched to GA4 event `begin_checkout` with `status='sent'` in `ga4_measurement_protocol_events`.
- Platform goal dry-run `b7a87cc8-8d5c-494a-8f40-26a04d5acbb9`: 38 desired, 38 keep, 0 update, 0 watch, 0 blocked.

## API / Contract Changes

| Endpoint/RPC/Schema | Method | Payload | Notes |
|---------------------|--------|---------|-------|
| `dispatch-funnel-event` | Edge Function | Existing funnel event | Add `ga4` destination branch. |
| `record_funnel_event(payload jsonb)` | RPC | Existing canonical payload | Accept new WAFlow diagnostic event names. |
| `trackEvent` / WAFlow client | Browser helper | Non-PII event context | May continue browser GA4, but must persist critical WAFlow events server-side. |
| Clarity tagging helper | Browser helper | Non-PII session tags | Uses tenant/market/path/campaign/variant/reference hash only. |

## Permissions (RBAC)

| Role | View observability | Manage mapping | Replay GA4 |
|------|--------------------|----------------|------------|
| super_admin | yes | yes | yes |
| owner | tenant-scoped | no | no |
| admin | tenant-scoped | no | no |
| agent | tenant-scoped summary | no | no |
| service_role | all | yes | yes |
| anon | no | no | no |

## Affected Files / Packages

| Path | Change | Description |
|------|--------|-------------|
| `supabase/migrations/*` | Create/modify | GA4 log table, mapping rows, event-name constraints, observability view. |
| `supabase/functions/dispatch-funnel-event/index.ts` | Modify | Add GA4 MP destination branch. |
| `lib/analytics/track.ts` | Modify | Persist WAFlow diagnostic events where needed; keep browser GA4 as auxiliary. |
| `lib/growth/clarity-client.ts` / provider runner | Modify | Ensure Clarity profile evidence is joinable by URL/device/market. |
| `docs/ops/funnel-events-runbook.md` | Modify | Add GA4/Clarity observability checks. |
| `docs/INDEX.md` | Modify | Add wikilink and concept references. |

## Edge Cases & Error Handling

1. GA4 config missing for tenant -> dispatcher logs `skipped` in `ga4_measurement_protocol_events`; event remains valid in `funnel_events`.
2. Clarity unavailable or rate-limited -> Growth OS marks profile freshness `WATCH/BLOCKED`, but paid optimization still uses canonical events.
3. Browser blocks analytics -> server-side `funnel_events` still records critical events.
4. Organic/direct lead has no `gclid` -> Google Ads upload may skip; GA4/Clarity still help UX and source analysis.
5. Duplicate lifecycle events -> observability view exposes duplicate counts and latest canonical state; it must not hide data quality problems.

## Out of Scope

- Making GA4 the primary conversion source.
- Sending raw email/phone/IP to GA4 or Clarity.
- Server-side GTM container.
- BigQuery export or external warehouse reverse ETL.
- TikTok/LinkedIn destination implementations.

## Dependencies

- [[ADR-029]]
- [[SPEC_FUNNEL_EVENTS_SOT]]
- [[SPEC_GROWTH_OS_PROVIDER_EXTRACTION_PROFILES]]
- [[public-analytics-standard]]
- GitHub Epic #419

## Rollout

- Feature flag: `FUNNEL_GA4_MP_DISPATCH_V1`
- Initial tenant: ColombiaTours
- Revalidation: production smoke on ColombiaTours landings and WAFlow.
- Runbook: update `docs/ops/funnel-events-runbook.md`.
- Closure gate: 24h report with canonical event counts, GA4 MP delivery, platform delivery, Clarity profile freshness, CRM opportunities, and documented gaps.
