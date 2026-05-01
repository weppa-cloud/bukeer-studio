# Chatwoot Growth Traceability

Status: active for EPIC #310 / #322.

## Purpose

Make WAFlow, Chatwoot, CRM requests, itineraries and paid attribution traceable
without depending on the customer preserving the `#ref` text in WhatsApp.

Official Chatwoot references used:

- Webhooks: https://www.chatwoot.com/hc/user-guide/articles/1677693021-how-to-use-webhooks
- Conversation custom attributes:
  https://developers.chatwoot.com/api-reference/conversations/update-custom-attributes
- Custom attributes user guide:
  https://www.chatwoot.com/docs/user-guide/features/custom-attributes

## Current Production Contract

Chatwoot account webhooks send lifecycle events to:

```text
POST https://colombiatours.travel/api/webhooks/chatwoot?token=...
```

The endpoint stores the raw payload in `webhook_events`, deduplicates by provider
event id, links the event to a WAFlow lead when a reference is present, and then
updates the CRM request if the reference is not conflicting.

Native self-hosted Chatwoot v4.9.2 does not send custom HMAC headers from
account webhooks. Production therefore uses a secret URL token. Controlled tests
and future relays may still use the HMAC path with timestamp replay checks.

## Reference Strategy

Reference discovery order:

1. Chatwoot conversation/message custom attributes:
   - `growth_current_reference_code`
   - `growth_last_reference_code`
   - `growth_reference_code`
   - `reference_code`
   - `waflow_reference_code`
   - `waflow_ref`
2. `growth_reference_history`, as JSON array or comma/newline string.
3. Message text regex: `#ref: <REFERENCE>`.

The webhook does **not** use `chatwoot_conversation_id` alone to recover a
Growth reference. A WhatsApp thread can contain multiple business requests, so
conversation-only matching can corrupt attribution by linking a new message to a
previous request.

This means that if a customer deletes `#ref`, the system can still recover the
latest reference as long as Chatwoot custom attributes have been written at least
once for that conversation.

If no reference is present in custom attributes, history or message text, the
event is processed as an orphan/watch event:

- store raw payload in `webhook_events`;
- do not update `waflow_leads`;
- do not create or update `requests`;
- do not emit `funnel_events`;
- do not send Meta lifecycle CAPI.

## Internal Storage

| Layer                   | Table / field            | Purpose                                                                                                            |
| ----------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Raw WAFlow lead         | `waflow_leads`           | Lead payload, source URL, UTM, IP/user agent, reference code and Chatwoot link.                                    |
| Canonical funnel ledger | `funnel_events`          | Decision-grade events: `waflow_submit`, `whatsapp_cta_click`, `qualified_lead`, `quote_sent`, `booking_confirmed`. |
| Raw webhook ledger      | `webhook_events`         | Full Chatwoot webhook payload, auth mode, dedupe status and processing result.                                     |
| CRM object              | `requests`               | Shared CRM/system request with `chatwoot_conversation_id`, lead source and Growth custom fields.                   |
| Paid conversion ledger  | `meta_conversion_events` | Meta CAPI attempts, provider responses and event ids.                                                              |
| Executive matrix        | `growth_inventory`       | Aggregated opportunity/backlog rows for Council, not raw webhook data.                                             |

## CRM Link Rules

The webhook first searches `requests.custom_fields->>growth_reference_code`.
That is the strongest key because one Chatwoot conversation can contain multiple
business requests over time.

If no exact reference exists, the webhook may inspect `chatwoot_conversation_id`
only after a recoverable Growth reference has selected a WAFlow lead. The
conversation id is never the primary attribution key.

If the conversation is already linked to a different Growth reference, the
webhook records a conflict and does not overwrite the previous request. This
prevents corrupting attribution when a user starts a second WAFlow request inside
the same WhatsApp thread.

## Chatwoot Custom Attributes

When `CHATWOOT_BASE_URL` and `CHATWOOT_API_ACCESS_TOKEN` are configured, the
webhook mirrors Growth state back into Chatwoot conversation custom attributes:

- `growth_current_reference_code`
- `growth_last_reference_code`
- `growth_last_waflow_lead_id`
- `growth_last_session_key`
- `growth_last_source_url`
- `growth_last_page_path`
- `growth_last_utm_source`
- `growth_last_utm_medium`
- `growth_last_utm_campaign`
- `growth_last_lead_source`
- `growth_last_crm_request_id`
- `growth_last_crm_request_short_id`
- `growth_last_crm_link_status`
- `growth_last_chatwoot_event`
- `growth_last_linked_at`

If those env vars are absent, webhook processing continues and logs
`chatwoot_growth_attributes_not_updated` with status `not_configured`. This is
intentional: Chatwoot attribute sync is a traceability improvement, not a hard
dependency for ingesting webhook events.

## Reporting To Meta And GA4

Meta CAPI:

- WAFlow submit emits Lead through the WAFlow lead endpoint.
- Chatwoot lifecycle events emit server-side events through
  `sendLifecycleConversions`.
- Provider responses are stored in `meta_conversion_events`.

GA4:

- Client-side interactions are emitted through `lib/analytics/track.ts`.
- Server-side Chatwoot lifecycle events are not sent to GA4 Measurement Protocol
  yet.
- Until GA4 MP exists, internal ledger parity is the source of truth for
  lifecycle reconciliation, while GA4 remains useful for landing/channel/session
  analysis.

Do not send raw message content or unnecessary PII to GA4 or Meta. Use
`reference_code`, page path, channel and normalized event names.

## Operational Checks

Use this sequence to diagnose E2E:

1. Confirm `waflow_leads.reference_code` exists for the test.
2. Confirm `funnel_events.event_name='waflow_submit'` exists for the same ref.
3. Confirm `webhook_events.provider='chatwoot'` processed the message event.
4. Confirm the payload or custom attributes contain a recoverable reference.
5. Confirm `requests.custom_fields.growth_reference_code` matches the same ref.
6. Confirm `meta_conversion_events` contains the WAFlow/Chatwoot provider events
   when Meta CAPI is configured.

### Missing-reference smoke

Use this smoke to prove that a WhatsApp message without any recoverable
reference does not overwrite the active CRM request for the conversation:

```bash
CHATWOOT_WEBHOOK_SECRET=... \
CHATWOOT_WEBHOOK_URL=https://colombiatours.travel/api/webhooks/chatwoot \
bash scripts/chatwoot-webhook-simulate.sh missing_ref 34883
```

Expected:

- API returns `matched=false`, `conversionsSent=0`.
- `webhook_events` has one processed row for the provider event.
- `waflow_leads` is not updated.
- `requests.custom_fields.growth_reference_code` for the existing conversation
  is not changed.
- No new `funnel_events` or Chatwoot lifecycle `meta_conversion_events` rows are
  created for the missing-reference event.

Known WATCH state:

- Multiple WAFlow requests in one Chatwoot conversation need a shared backend
  request model that can create or select a request by Growth reference, not only
  by conversation id. The Studio webhook now avoids corrupt overwrites, but the
  definitive shared contract belongs in the Flutter/Supabase backend.
- Flutter canonical contract:
  `bukeer_flutter/docs/05-business-systems/chatwoot/GROWTH_REFERENCE_FIRST_CONTRACT.md`.

### Reference-first double-request smoke

Controlled smoke, 2026-05-01:

| Reference               | Conversation | Request    | Chain                                           |
| ----------------------- | ------------ | ---------- | ----------------------------------------------- |
| `E2E-202605011344-A`    | `939902`     | `SOL-1942` | `waflow_submit -> qualified_lead -> quote_sent` |
| `E2E-202605011344-B`    | `939902`     | `SOL-1943` | `waflow_submit -> qualified_lead -> quote_sent` |
| `E2E-20260501143733-M1` | `968696`     | `SOL-1945` | `waflow_submit -> qualified_lead -> quote_sent` |
| `E2E-20260501143733-M2` | `968696`     | `SOL-1946` | `waflow_submit -> qualified_lead -> quote_sent` |

Result:

- CRM/request reference-first contract: `PASS`.
- Ledger parity: `PASS`.
- Same conversation with two requests: `PASS`.
- Controlled `booking_confirmed`: `PASS` for `E2E-202605011344-A` via QA
  itinerary `QA-E2E-202605011344-A12543`.
- WAFlow lead conversation mirror: `PASS` after post-migration smoke confirmed
  both WAFlow rows can share `chatwoot_conversation_id=968696` with no unique
  conflict.

Legacy schema gap:

- `waflow_leads_chatwoot_conversation_uidx` assumes one conversation maps to one
  WAFlow lead.
- Fixed 2026-05-01 by applying Flutter/SSOT migration
  `20260504111600_waflow_reference_first_conversation_index.sql` through the
  Supabase Management API. Verification shows only the two non-unique lookup
  indexes remain:
  - `waflow_leads_chatwoot_conversation_idx`
  - `waflow_leads_chatwoot_conversation_reference_idx`

Mitigation:

- the webhook still catches duplicate-key conflicts defensively and keeps
  lifecycle traceability in `chatwoot_custom_attributes`;
- Flutter/SSOT migration is applied and certified by the 2026-05-01
  post-migration smoke.

### Live production WAFlow smoke

Production UI smoke, 2026-05-01:

| Reference        | Conversation | Request    | Chain                                     |
| ---------------- | ------------ | ---------- | ----------------------------------------- |
| `HOME-0105-K3CT` | `34883`      | `SOL-1949` | `waflow_submit -> whatsapp_cta_click`     |
| `HOME-0105-FG0F` | `34883`      | `SOL-1950` | `waflow_submit -> whatsapp_cta_click`     |

Result:

- same real WhatsApp conversation produced two WAFlow references;
- same Chatwoot conversation produced two distinct CRM requests;
- `waflow_leads.chatwoot_conversation_id` stored `34883` for both rows;
- Chatwoot custom attributes were empty before Flutter #792 deploy.
- Flutter `process-chatwoot-message` was deployed as Supabase Edge Function
  version `182`.
- Conversation `34883` was backfilled and now exposes:
  - `growth_current_reference_code=HOME-0105-FG0F`;
  - `growth_reference_history` with both live refs;
  - `growth_last_crm_request_short_id=SOL-1950`.

Next automatic verification:

1. receive a new organic Chatwoot message containing a fresh `#ref`;
2. confirm the Edge Function mirrors attributes without manual backfill;
3. confirm `growth_reference_history` appends the new ref without overwriting
   prior requests.
