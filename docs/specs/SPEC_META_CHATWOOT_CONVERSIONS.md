# Spec: Meta + Chatwoot Conversion Tracking

## GitHub Tracking
- **Epic Issue**: [#322](https://github.com/weppa-cloud/bukeer-studio/issues/322)
- **Child Issues**: [#323](https://github.com/weppa-cloud/bukeer-studio/issues/323), [#324](https://github.com/weppa-cloud/bukeer-studio/issues/324), [#325](https://github.com/weppa-cloud/bukeer-studio/issues/325), [#326](https://github.com/weppa-cloud/bukeer-studio/issues/326), [#327](https://github.com/weppa-cloud/bukeer-studio/issues/327), [#328](https://github.com/weppa-cloud/bukeer-studio/issues/328)
- **Milestone**: MVP Sprint 3 - Dashboard + Growth + Rhythm
- **Area**: public-site | backend | growth

## Status
- **Author**: Codex
- **Date**: 2026-04-25
- **Status**: Reviewed
- **ADRs referenced**: ADR-003, ADR-005, ADR-007, ADR-010, ADR-012, ADR-018, ADR-024
- **Cross-repo impact**: shared Supabase tables read by Bukeer Studio; potential future bukeer-flutter CRM/dashboard reads of conversion status.

## Summary
Bukeer Studio needs end-to-end Meta conversion attribution for the travel lead funnel: public WAFlow/WhatsApp intent, Chatwoot conversation lifecycle, qualified sales follow-up, and confirmed purchase. The implementation must combine browser Pixel events, server-side Meta Conversions API events, Chatwoot webhooks, and Supabase traceability without exposing secrets or double-counting conversions.

## Motivation
Current public-site conversion tracking captures WhatsApp/WAFlow interactions, but it does not reliably tell Meta when a lead becomes a real conversation, continues with an agent, is qualified, receives a quote, or purchases. This limits campaign optimization and makes Meta reporting diverge from the actual Bukeer/Chatwoot sales funnel.

## User Flows

### Flow 1: WAFlow lead becomes a Meta Lead
1. Visitor lands on a public tenant site with Meta Pixel configured.
2. Visitor opens WAFlow or clicks a WhatsApp CTA.
3. Browser sends `Contact` for CTA intent using Meta Pixel when available.
4. Visitor completes WAFlow contact details.
5. Server persists `reference_code`, `session_key`, attribution context, and contact payload in `waflow_leads`.
6. Browser and server send the same `Lead` conversion with a shared `event_id` so Meta deduplicates the event.

### Flow 2: Chatwoot creates and progresses the conversation
1. Visitor sends the prefilled WhatsApp message containing `#ref: <reference_code>`.
2. Chatwoot creates or updates a conversation.
3. Chatwoot webhook posts conversation lifecycle events to Bukeer Studio.
4. Bukeer validates and deduplicates the webhook event, extracts `reference_code`, and links the conversation to the matching WAFlow lead.
5. Server sends Meta custom events for `ConversationCreated`, `ConversationContinued`, `QualifiedLead`, or `QuoteSent` when the configured Chatwoot event/label/status occurs.

### Flow 3: Booking or payment confirms purchase
1. A lead becomes a confirmed booking or payment.
2. Booking/payment backend resolves the related lead or `reference_code`.
3. Server sends a Meta `Purchase` event with `value`, `currency`, `order_id`, `event_id`, and matched user data.
4. Event status is stored for audit, retry, and Meta Events Manager debugging.

## Funnel Event Contract

| Funnel moment | Source | Meta event | Notes |
|---|---|---|---|
| WhatsApp CTA click | Browser | `Contact` | Existing CTA tracking remains; add event id where possible. |
| WAFlow submit | Browser + CAPI | `Lead` | Deduplicate with identical `event_name` + `event_id`. |
| Chatwoot conversation created | Chatwoot webhook + CAPI | `ConversationCreated` or `Lead` | Custom by default; `Lead` only if marketing wants confirmed conversation as optimization event. |
| User continues conversation | Chatwoot webhook + CAPI | `ConversationContinued` | Custom event. |
| Agent qualifies lead | Chatwoot label/status + CAPI | `QualifiedLead` | Custom event. |
| Quote sent | Chatwoot label/status or CRM + CAPI | `QuoteSent` | Custom event. |
| Booking/payment confirmed | Booking/payment webhook + CAPI | `Purchase` | Standard event; include `value`, `currency`, `order_id`. |

## Trace Keys

| Key | Owner | Purpose |
|---|---|---|
| `reference_code` | WAFlow | Human-visible bridge in WhatsApp message and Chatwoot custom attributes. |
| `session_key` | WAFlow browser | Upsert key for partial/final WAFlow lead state. |
| `waflow_lead_id` | Supabase | Internal stable lead id. |
| `chatwoot_conversation_id` | Chatwoot webhook | Joins Chatwoot lifecycle to Bukeer lead. |
| `event_id` | Bukeer Meta service | Unique Meta dedupe key per event, e.g. `<reference_code>:lead` and `<reference_code>:purchase:<booking_id>`. |

## Data Model Changes

| Table | Change | Notes |
|---|---|---|
| `waflow_leads` | Extend JSON payload usage | Store `fbp`, `fbc`, `fbclid`, `utm_*`, `source_url`, page path, user agent, client IP metadata already available server-side. |
| `waflow_leads` | Add optional Chatwoot linkage columns or JSON keys | Store `chatwoot_conversation_id`, inbox/account identifiers, latest lifecycle status. |
| `meta_conversion_events` | New table | Store event idempotency, event payload, status, provider response, retry count, `sent_at`, `error`, and trace ids. |
| `webhook_events` | Reuse or extend provider usage | Use ADR-018 pattern for Chatwoot webhook dedupe with provider `chatwoot`. |

Migration path: forward-only. Existing WAFlow rows remain valid; new attribution fields are nullable.

## API / Contract Changes

| Endpoint / module | Method | Payload | Notes |
|---|---|---|---|
| `/api/waflow/lead` | POST | Existing body plus attribution context when available | Zod schema validates added optional fields. |
| `/api/webhooks/chatwoot` | POST | Chatwoot webhook envelope | Verify signature/secret, replay/idempotency, Zod parse, and standard API response envelope. |
| `lib/meta/conversions-api.ts` | server module | normalized conversion event | Server-only Meta token, Web Crypto-compatible hashing, structured logging. |
| Booking/payment confirmation hook | server call | booking id, lead/ref, value, currency | Sends `Purchase` once per booking/payment confirmation. |

## Permissions (RBAC)

| Actor | View events | Create events | Retry events | Configure credentials |
|---|---:|---:|---:|---:|
| public visitor | no | indirect only | no | no |
| Chatwoot webhook | no | yes, via signed webhook | no | no |
| server service role | yes | yes | yes | yes |
| account owner/admin | future dashboard read | no | future action | no |
| super_admin | yes | yes | yes | yes |

## Affected Files / Packages

| Path | Change | Description |
|---|---|---|
| `lib/analytics/track.ts` | Modify | Add event id support for Meta Pixel calls without breaking GA/GTM. |
| `app/api/waflow/lead/route.ts` | Modify | Persist attribution context and event trace metadata. |
| `app/api/webhooks/chatwoot/route.ts` | Create | Receive and dedupe Chatwoot lifecycle events. |
| `lib/meta/*` | Create | Meta CAPI payload builder, hashing, sender, and event log helpers. |
| `supabase/migrations/*` | Create | Add conversion event log and Chatwoot linkage fields. |
| `docs/ops/meta-chatwoot-conversions-runbook.md` | Future child issue | Operational QA and troubleshooting guide. |

## Edge Cases & Error Handling
1. Browser Pixel is blocked: server CAPI still sends event using stored attribution/user data.
2. Server CAPI fails: persist `failed` event status with provider response and retry metadata; do not block WAFlow or booking confirmation.
3. Chatwoot sends duplicate webhook: return success without reprocessing using ADR-018 idempotency.
4. Chatwoot webhook has no `reference_code`: store orphan event for diagnostics; do not send lifecycle conversion until matched.
5. Same lead triggers multiple labels/status updates: send each configured lifecycle event once per lead/conversation.
6. Purchase has no resolvable lead: send `Purchase` only if privacy-safe matching data exists; otherwise log a warning and retain internal audit state.
7. Missing Meta config for tenant/account: skip external send, mark `skipped`, and keep internal event row.

## Acceptance Criteria
- [ ] `AC-MC-01`: WAFlow lead persistence stores Meta attribution context when provided by the browser.
- [ ] `AC-MC-02`: Meta `Lead` events sent by browser and CAPI use the same `event_name` and `event_id`.
- [ ] `AC-MC-03`: Chatwoot webhook implements signature/secret validation, idempotency, Zod parsing, and standard response envelopes.
- [ ] `AC-MC-04`: Chatwoot conversation events link to `waflow_leads` by `reference_code` when present.
- [ ] `AC-MC-05`: Meta event log prevents duplicate sends per `(event_name, event_id)`.
- [ ] `AC-MC-06`: `Purchase` is sent once per confirmed booking/payment with `value`, `currency`, and `order_id`.
- [ ] `AC-MC-07`: Server-side hashing uses SHA-256 and keeps raw Meta credentials server-only.
- [ ] `AC-MC-08`: Manual QA documents a successful Meta Events Manager Test Events run for Lead and Purchase.

## Test Plan
- Unit tests for Meta payload building, SHA-256 user-data hashing, event id generation, and dedupe checks.
- API tests for `/api/webhooks/chatwoot`: valid webhook, invalid secret, duplicate event, malformed payload, orphan reference.
- Integration test for WAFlow submit: attribution context stored and matching Pixel/CAPI event ids generated.
- Purchase test fixture: confirmed booking/payment triggers one `Purchase` event and logs provider response.
- Manual QA with Meta Events Manager Test Events and a Chatwoot webhook fixture.

## Plan Compliance Report (PCR)

Verdict: PASS WITH WARNINGS. Domain: public-site | backend | growth. Complexity: Complex.

### ADR Compliance
- ADR-003 Contract-First Validation: PASS. New webhook/API payloads require Zod schemas before business logic.
- ADR-005 Security Defense-in-Depth: PASS. Meta access token, service role, and Chatwoot secret remain server-only; public users never read conversion rows.
- ADR-007 Edge-First Delivery: PASS WITH WARNING. Implement hashing with Web Crypto or confirm Node runtime explicitly only if required by a third-party SDK; avoid Node-only Meta SDKs.
- ADR-010 Observability Strategy: PASS. `meta_conversion_events` and structured logger events provide audit/retry visibility.
- ADR-012 API Response Envelope: PASS. New API routes must use `apiSuccess`, `apiError`, and validation helpers.
- ADR-018 Webhook Idempotency: PASS. Chatwoot webhook follows HMAC/secret validation, replay/dedupe, contract parse, then mutation.
- ADR-024 Booking V1 Pilot Scope: PASS. This spec adds attribution and purchase reporting; it does not force self-serve booking into the pilot.

### Design System / Tokens
- Not applicable for v1. No new UI is required except future optional dashboard/runbook work.

### Reusability Assessment
- Reuse existing analytics helper in `lib/analytics/track.ts`.
- Reuse API envelope helpers in `lib/api`.
- Reuse logger and rate/idempotency patterns already present in webhook/API routes.
- Avoid adding a Meta SDK if direct `fetch` to Graph API satisfies requirements.

### Commit Context
- Recent related commits include WAFlow link/interceptor fixes and conversion-focused landing changes, so the spec aligns with active public-site lead-capture work.
- Current worktree had only `.sessions/` untracked at validation time; no tracked conflicts found.

### Recommendations
1. Implement server CAPI sender with direct `fetch` and Web Crypto hashing first.
2. Make Chatwoot lifecycle-to-Meta event mapping configurable by code constants for v1; avoid dashboard UI until tracking is proven.
3. Store provider response payloads with redaction rules to support Meta debugging without leaking secrets.

## Out of Scope
- Chatwoot UI customization.
- Meta Ads campaign setup or optimization strategy.
- Full attribution dashboard in Studio.
- Retroactive backfill of historical Chatwoot conversations.
- Changes to bukeer-flutter UI.

## Dependencies
- ADRs: ADR-003, ADR-005, ADR-007, ADR-010, ADR-012, ADR-018, ADR-024.
- Existing implementation: `waflow_leads`, `/api/waflow/lead`, `lib/analytics/track.ts`, WAFlow reference code in outbound WhatsApp message.
- External: Meta Pixel/CAPI credentials, Chatwoot webhook secret/signature configuration, Chatwoot custom attributes or message parsing for `reference_code`.

## Rollout
- Feature flag: `META_CHATWOOT_CONVERSIONS_ENABLED` or equivalent env-level guard.
- Pilot tenant: ColombiaTours or first paid-media tenant with configured Meta dataset.
- Revalidation: none for public pages unless script wiring changes require redeploy only.
- Runbook: create `docs/ops/meta-chatwoot-conversions-runbook.md` in child issue.
