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
4. Existing `waflow_leads.chatwoot_conversation_id`, only as fallback.

This means that if a customer deletes `#ref`, the system can still recover the
latest reference as long as Chatwoot custom attributes have been written at least
once for that conversation.

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

If no exact reference exists, it searches by `chatwoot_conversation_id`. This is
allowed only when the existing request has no conflicting Growth reference or has
the same reference.

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

Known WATCH state:

- Multiple WAFlow requests in one Chatwoot conversation need a shared backend
  request model that can create or select a request by Growth reference, not only
  by conversation id. The Studio webhook now avoids corrupt overwrites, but the
  definitive shared contract belongs in the Flutter/Supabase backend.
