---
session_id: "2026-04-30-waflow-crm-reconciliation"
started_at: "2026-04-30T13:00:00-05:00"
agent: "codex"
scope: "epic310-waflow-crm-reconciliation"
website_id: "894545b7-73ca-4dae-b76a-da5b6a3f8441"
website_slug: "colombiatours"
related_issues: [310, 322, 337]
outcome: "dry-run reconciliation"
---

# WAFlow CRM Reconciliation - 2026-04-30

## Scope

Read-only reconciliation across:

- `waflow_leads`
- `funnel_events`
- `requests`
- `itineraries`

Window: since `2026-04-28T00:00:00Z`.

Artifacts:

- `artifacts/seo/2026-04-30-waflow-crm-reconciliation/waflow-crm-reconciliation.json`
- `artifacts/seo/2026-04-30-waflow-crm-reconciliation/waflow-crm-reconciliation.md`
- script: `scripts/seo/reconcile-waflow-crm-funnel.mjs`

## Result

WAFlow event parity is clean:

| Metric                        | Count |
| ----------------------------- | ----: |
| Submitted WAFlow leads        |    13 |
| `funnel_events.waflow_submit` |    13 |
| Parity delta                  |     0 |

The remaining gap is CRM linkage, not event capture.

| CRM link status                         | Count |
| --------------------------------------- | ----: |
| `candidate_time_window_high_confidence` |     6 |
| `unlinked`                              |    11 |

Six submitted WAFlow leads have a high-confidence CRM request candidate by
timestamp proximity, but no `requests.custom_fields.growth_reference_code` yet:

| reference_code     | Candidate request | Delta minutes |
| ------------------ | ----------------- | ------------: |
| `HOME-3004-534R`   | `SOL-1934`        |           0.9 |
| `HOME-3004-63R7`   | `SOL-1933`        |           0.5 |
| `SANTA--3004-P5A3` | `SOL-1932`        |           1.6 |
| `HOME-2904-VOQB`   | `SOL-1929`        |           0.5 |
| `HOME-2904-B3B7`   | `SOL-1928`        |           0.2 |
| `HOME-2904-9R79`   | `SOL-1927`        |           0.6 |

Lifecycle classification:

| Lifecycle status                   | Count | Meaning                                                                                    |
| ---------------------------------- | ----: | ------------------------------------------------------------------------------------------ |
| `lead_only`                        |    12 | WAFlow submitted, no downstream `qualified_lead` / `quote_sent` / `booking_confirmed` yet. |
| `complete_booking_confirmed`       |     1 | Controlled full chain exists.                                                              |
| `booking_without_full_prior_chain` |     2 | Itinerary confirmation emitted booking without WAFlow/Chatwoot prior stages.               |
| `not_submitted_or_open`            |     2 | CTA-only smoke rows, no WAFlow submit.                                                     |

## Interpretation

We can now certify:

- WAFlow submit persistence: `PASS`.
- WAFlow submit -> funnel ledger parity: `PASS`.
- WhatsApp CTA evidence exists for recent WAFlow submits.

We cannot yet certify:

- WAFlow submit -> CRM `requests` linkage.
- CRM `requests` -> itinerary linkage for the same acquisition reference.
- Fresh production chain from lead to confirmed itinerary without backfill.

The correct next fix is not another tracking backfill. It is an idempotent CRM
link operation that writes the Growth reference into the shared CRM object.

## Safe apply rule

The script supports a guarded apply mode:

```bash
node scripts/seo/reconcile-waflow-crm-funnel.mjs --apply true
```

It only updates candidates classified as
`candidate_time_window_high_confidence`, adding controlled metadata to
`requests.custom_fields`:

- `growth_reference_code`
- `growth_source_website_id`
- `growth_source_url`
- `growth_page_path`
- `growth_link_method = time_window_high_confidence`
- `growth_linked_at`

Do not run apply for ambiguous or unlinked rows. The durable product fix should
be owned as a shared backend contract from `bukeer_flutter`.

## Decision

#322 should now track two separate statuses:

1. WAFlow event ledger parity: `PASS`.
2. CRM lifecycle parity: `WATCH/BLOCKED` until `requests` receives an
   idempotent reference link and a fresh production chain validates the full
   sequence.

## Addendum - controlled CRM reconciliation applied

Updated: 2026-04-30T18:15Z.

The guarded apply mode was executed for the six high-confidence candidates only.

Artifacts:

- `artifacts/seo/2026-04-30-waflow-crm-reconciliation-apply/waflow-crm-reconciliation.json`
- `artifacts/seo/2026-04-30-waflow-crm-reconciliation-post-apply/waflow-crm-reconciliation.json`

Updated `requests.custom_fields` for:

| reference_code     | Request    | Request id                             |
| ------------------ | ---------- | -------------------------------------- |
| `HOME-3004-534R`   | `SOL-1934` | `a481024b-8260-410d-8591-42fe1c3956ca` |
| `HOME-3004-63R7`   | `SOL-1933` | `dbff44b2-392e-4274-ba19-de6cf150f036` |
| `SANTA--3004-P5A3` | `SOL-1932` | `f13595cc-e136-4909-9fc8-2bdb5ec5a9aa` |
| `HOME-2904-VOQB`   | `SOL-1929` | `e99f2187-5f7b-4aa6-b2c3-f34989f3ca08` |
| `HOME-2904-B3B7`   | `SOL-1928` | `4d034611-d2b9-401b-b549-c00c5cc8945f` |
| `HOME-2904-9R79`   | `SOL-1927` | `7e19b10f-4652-4d7c-b5a9-b45cfe68c35f` |

Post-apply verification:

| Metric                        | Count |
| ----------------------------- | ----: |
| Submitted WAFlow leads        |    13 |
| `funnel_events.waflow_submit` |    13 |
| Parity delta                  |     0 |
| `linked_exact_reference`      |     6 |
| `unlinked`                    |    11 |

Applied metadata keys:

- `growth_reference_code`
- `growth_source_website_id`
- `growth_source_url`
- `growth_page_path`
- `growth_link_method = time_window_high_confidence`
- `growth_linked_at`

Remaining CRM lifecycle gap:

- new production requests must be linked at creation time, not retroactively by
  timestamp;
- quote/itinerary creation must carry the same `growth_reference_code`;
- #322 still needs a fresh production chain that proves
  `waflow_submit -> request linked -> quote/itinerary -> booking_confirmed`
  without backfill.

## Addendum - all-time ColombiaTours CRM inventory

Updated: 2026-04-30T18:25Z.

The reconciliation script now supports paginated full-account inventory with:

```bash
node scripts/seo/reconcile-waflow-crm-funnel.mjs \
  --since all \
  --outDir artifacts/seo/2026-04-30-waflow-crm-reconciliation-all
```

Artifact:

- `artifacts/seo/2026-04-30-waflow-crm-reconciliation-all/waflow-crm-reconciliation.json`
- `artifacts/seo/2026-04-30-waflow-crm-reconciliation-all/waflow-crm-reconciliation.md`

All-time snapshot:

| Metric                                     | Count |
| ------------------------------------------ | ----: |
| `waflow_leads`                             |    14 |
| Submitted WAFlow leads                     |    14 |
| `funnel_events.waflow_submit`              |    13 |
| `funnel_events`                            |    24 |
| `requests`                                 |  1895 |
| `itineraries`                              |  3050 |
| `requests` with `chatwoot_conversation_id` |  1895 |
| `requests` with Growth reference           |     6 |
| `requests` with `itinerary_id`             |     3 |
| duplicate conversation groups              |    50 |

Parity detail:

- `submitted_missing_funnel_refs`: none.
- `extra_funnel_submit_refs`: none.
- `submitted_without_reference`: 1 row.

The all-time delta of `1` is not a WAFlow funnel failure. It is a
`newsletter_signup` footer row from `2026-04-24` without `reference_code`:

| id                                     | source              | placement |
| -------------------------------------- | ------------------- | --------- |
| `50b850db-26d3-40aa-bb9f-240b5328d331` | `newsletter_signup` | `footer`  |

CRM request stage inventory:

| Stage           | Count |
| --------------- | ----: |
| `new_lead`      |   892 |
| `qualified`     |    57 |
| `proposal_sent` |    16 |
| `closed_won`    |    20 |
| `closed_lost`   |   910 |

CRM request source inventory:

| Source     | Count |
| ---------- | ----: |
| `direct`   |  1573 |
| `whatsapp` |   253 |
| `chat`     |    64 |
| `telegram` |     2 |
| `unknown`  |     3 |

EPIC #310 scope confirmation:

- This is part of #310 because Growth OS must prove the full business funnel,
  not only public-site tracking.
- The child issue owner remains #322 for Meta/Chatwoot/conversion tracking.
- The durable implementation should be owned as shared backend CRM behavior:
  WAFlow/Chatwoot creates or links `requests` with a stable reference at the
  moment the request is created.

Do not bulk-update all historical `requests` by timestamp. Most old records are
legacy Chatwoot/CRM data without a Growth `reference_code`; those should be
classified as `legacy_no_attribution` unless an exact conversation/request/
itinerary key exists.

## Addendum - productized Chatwoot -> CRM request link

Updated: 2026-04-30T18:40Z.

Implemented the first permanent backend link in Studio-owned webhook code:

- file: `app/api/webhooks/chatwoot/route.ts`
- trigger: matched Chatwoot webhook with WAFlow lead and `conversationId`
- behavior:
  - find existing `requests` row by `account_id + chatwoot_conversation_id`;
  - if missing and inbox data is present, call shared RPC `find_or_create_request`;
  - write Growth metadata into `requests.custom_fields`:
    - `growth_reference_code`
    - `growth_source_website_id`
    - `growth_waflow_lead_id`
    - `growth_session_key`
    - `growth_source_url`
    - `growth_page_path`
    - `growth_link_method = chatwoot_webhook_reference`
    - `growth_linked_at`
    - `growth_last_chatwoot_event`
  - do not overwrite a conflicting existing reference;
  - do not mutate `request_stage` from Studio.

This keeps Flutter CRM as the operational source of truth for pipeline stage
movement while making future `WAFlow -> Chatwoot -> requests` linkage durable
without timestamp reconciliation.

Remaining permanent link:

- when Flutter creates/links an itinerary from a request, it should inherit
  `growth_reference_code` into `itineraries.custom_fields` so
  `booking_confirmed` joins without manual smoke setup.

## Addendum - CRM lead source alignment

Updated: 2026-04-30T19:05Z.

The CRM already has a first-class source field:

- `requests.lead_source`
- `requests.lead_source_detail`

Flutter uses that field in the new conversation form and CRM panel. The shared
SOT in `bukeer_flutter` allows the normalized values:

- `facebook_ads`
- `google_ads`
- `instagram_ads`
- `organic_search`
- `organic_social`
- `referral`
- `direct`
- `email_campaign`
- `partner`
- `unknown`
- legacy compatibility: `whatsapp`, `telegram`, `website`, `manual`, `email`,
  `facebook`, `instagram`

Studio webhook alignment:

- WAFlow/Chatwoot now derives `requests.lead_source` from the captured Growth
  attribution, not from Chatwoot routing metadata.
- It writes `lead_source` only when the existing value is blank, `unknown`, or
  default `direct` and the Growth source is more specific.
- It writes `lead_source_detail` with a compact Growth trace when the field is
  blank or already Growth-owned.
- It also mirrors the derived value in `requests.custom_fields.growth_lead_source`
  and `growth_lead_source_detail` for audit/debug.

This keeps the CRM source field usable by Booker Studio and Booker Flutter while
preserving manual CRM corrections.

## Addendum - historical exact Growth links source backfill

Updated: 2026-04-30T19:15Z.

Applied a narrow source alignment backfill to the six exact CRM requests already
linked by `growth_reference_code`. This was not a timestamp bulk update.

| Request    | reference_code     | lead_source    |
| ---------- | ------------------ | -------------- |
| `SOL-1927` | `HOME-2904-9R79`   | `referral`     |
| `SOL-1928` | `HOME-2904-B3B7`   | `facebook_ads` |
| `SOL-1929` | `HOME-2904-VOQB`   | `referral`     |
| `SOL-1932` | `SANTA--3004-P5A3` | `referral`     |
| `SOL-1933` | `HOME-3004-63R7`   | `referral`     |
| `SOL-1934` | `HOME-3004-534R`   | `direct`       |

Post-apply verification:

- all six rows have `requests.lead_source`;
- all six rows have `requests.lead_source_detail`;
- all six rows mirror the same value in
  `requests.custom_fields.growth_lead_source`;
- all six rows have matching `growth_lead_source_detail` for audit.

## Addendum - fresh WAFlow source test

Updated: 2026-04-30T19:55Z.

Manual production test URL:

```text
https://colombiatours.travel/paquetes-a-colombia-todo-incluido-en-9-dias?utm_source=fb&utm_medium=paid&utm_campaign=epic310_source_test&utm_content=manual_qa
```

Captured WAFlow lead:

| Field          | Value                  |
| -------------- | ---------------------- |
| reference_code | `PAQUET-3004-9NGK`     |
| created_at     | `2026-04-30T18:50:28Z` |
| utm_source     | `fb`                   |
| utm_medium     | `paid`                 |
| utm_campaign   | `epic310_source_test`  |

Funnel ledger result:

| Event                | Result |
| -------------------- | ------ |
| `waflow_submit`      | PASS   |
| `whatsapp_cta_click` | PASS   |

CRM result:

| Check                                      | Result  |
| ------------------------------------------ | ------- |
| `waflow_leads.chatwoot_conversation_id`    | MISSING |
| matching `requests` row                    | MISSING |
| recent `webhook_events(provider=chatwoot)` | MISSING |

Interpretation:

- The public-site WAFlow capture and funnel ledger are working.
- The test did not reach the CRM source alignment code because no new Chatwoot
  webhook arrived.
- Latest `webhook_events(provider=chatwoot)` entries remain from
  `2026-04-28`, so this is a Chatwoot webhook/config/deployment gap, not a
  WAFlow submit gap.

Next blocker to clear for #322:

- confirm the WhatsApp inbox used by the test is connected to Chatwoot;
- confirm Chatwoot webhook points to the deployed Studio endpoint;
- confirm `CHATWOOT_WEBHOOK_SECRET` is configured in the deployed environment;
- repeat one message with the `#ref` preserved so the webhook can link
  `waflow_leads -> requests -> lead_source`.

## Addendum - Chatwoot diagnosis and controlled endpoint E2E

Updated: 2026-04-30T20:05Z.

Server diagnosis:

- Chatwoot host: `Chatia-CapRover`
- Chatwoot URL: `https://web.chatia.app`
- ColombiaTours account: `account_id=11`
- ColombiaTours WhatsApp inbox: `WA-3206129003`, `inbox_id=32`
- Current ColombiaTours Chatwoot webhook URL:
  `https://wzlxbpicdcdvxvdcvgas.supabase.co/functions/v1/chatwoot-webhook`

The fresh WhatsApp message did reach Chatwoot:

| Field           | Value                  |
| --------------- | ---------------------- |
| conversation_id | `557019`               |
| message_id      | `10790307`             |
| inbox_id        | `32`                   |
| reference_code  | `PAQUET-3004-9NGK`     |
| message time    | `2026-04-30T18:50:46Z` |

Why production webhook did not run Studio code:

- Chatwoot is configured to call the legacy Supabase Edge Function.
- It is not configured to call Studio `/api/webhooks/chatwoot`.
- Therefore the new Studio CRM source alignment code cannot run in production
  until the Studio endpoint is deployed and Chatwoot points to it.

Controlled E2E:

- Started local Studio session on port `3001`.
- Replayed the real Chatwoot `message_created` payload with a valid local HMAC
  signature.
- Endpoint returned `200` with:
  - `matched=true`
  - `lifecycleEvents=["ConversationContinued"]`
  - `crmRequestId=430c9668-93c6-4d0a-b5e7-3913bf3e9ecd`

Post-E2E Supabase verification:

| Check                                          | Result             |
| ---------------------------------------------- | ------------------ |
| `waflow_leads.chatwoot_conversation_id`        | `557019`           |
| CRM request                                    | `SOL-1935`         |
| `requests.chatwoot_conversation_id`            | `557019`           |
| `requests.custom_fields.growth_reference_code` | `PAQUET-3004-9NGK` |
| `requests.lead_source`                         | `facebook_ads`     |
| `requests.custom_fields.growth_lead_source`    | `facebook_ads`     |
| `webhook_events.status`                        | `processed`        |

Conclusion:

- Code path is validated end-to-end.
- WAFlow -> WhatsApp -> Chatwoot -> Studio webhook -> CRM request source works.
- Remaining production task is deployment/configuration, not application logic.

Production activation checklist:

1. Deploy the Studio webhook code.
2. Configure `CHATWOOT_WEBHOOK_SECRET` in the deployed Studio environment.
3. Add or update ColombiaTours Chatwoot webhook to call the deployed Studio
   `/api/webhooks/chatwoot` endpoint.
4. Preserve the existing legacy Edge Function only if still needed for other
   automations, or migrate its responsibilities deliberately.
5. Run one more real message and confirm it appears in `webhook_events` without
   local replay.

## Addendum - Studio Chatwoot webhook activated

Updated: 2026-04-30T20:20Z.

Production changes applied:

- Deployed Worker version `d54d03e7-e1b7-4dc0-a0ab-4fd40d86cd50`.
- Set/rotated Cloudflare `CHATWOOT_WEBHOOK_SECRET`.
- Created Chatwoot account webhook:
  - `webhook_id=59`
  - account: ColombiaTours `account_id=11`
  - name: `Bukeer Studio Growth OS`
  - URL: `https://colombiatours.travel/api/webhooks/chatwoot?token=***`
  - subscriptions:
    - `conversation_created`
    - `conversation_updated`
    - `conversation_status_changed`
    - `message_created`
    - `message_updated`
- Left legacy Supabase Edge Function webhook in place to avoid breaking existing
  automations while migration is reviewed.

Implementation note:

- Native Chatwoot account webhooks do not send custom HMAC headers.
- Studio endpoint now supports either HMAC for controlled tests/relays or a
  secret URL token for native Chatwoot webhooks.
- Token mode skips replay timestamp checks because native Chatwoot payloads do
  not provide a signed timestamp; ADR-018 idempotency still applies through
  `webhook_events(provider,event_id)`.

Native Chatwoot smoke:

- Triggered Chatwoot `WebhookJob` against real message `10790307`.
- Studio processed event via token auth.

Post-smoke verification:

| Check                                          | Result             |
| ---------------------------------------------- | ------------------ |
| `webhook_events.event_id`                      | `10790307`         |
| `webhook_events.status`                        | `processed`        |
| auth mode                                      | `token`            |
| `waflow_leads.chatwoot_conversation_id`        | `34883`            |
| CRM request                                    | `SOL-1002`         |
| `requests.chatwoot_conversation_id`            | `34883`            |
| `requests.custom_fields.growth_reference_code` | `PAQUET-3004-9NGK` |
| `requests.lead_source`                         | `facebook_ads`     |

Cleanup note:

- `SOL-1935` was created by the earlier local replay using Chatwoot internal DB
  id `557019`.
- Native Chatwoot payloads use display id `34883`; the valid production request
  is `SOL-1002`.
- `SOL-1935` was marked as a Growth test artifact with
  `growth_duplicate_of_request_short_id=SOL-1002`.

## Addendum - live webhook test after activation

Updated: 2026-04-30T20:40Z.

Manual production test URL:

```text
https://colombiatours.travel/paquetes-a-colombia-todo-incluido-en-9-dias?utm_source=fb&utm_medium=paid&utm_campaign=epic310_webhook_live_test&utm_content=manual_qa_2
```

Captured WAFlow lead:

| Field          | Value                       |
| -------------- | --------------------------- |
| reference_code | `HOME-3004-ZL6T`            |
| created_at     | `2026-04-30T19:33:25Z`      |
| utm_source     | `fb`                        |
| utm_medium     | `paid`                      |
| utm_campaign   | `epic310_webhook_live_test` |
| utm_content    | `manual_qa_2`               |

Funnel ledger:

| Event                | Result |
| -------------------- | ------ |
| `waflow_submit`      | PASS   |
| `whatsapp_cta_click` | PASS   |

Chatwoot webhook:

| Field                     | Value            |
| ------------------------- | ---------------- |
| `webhook_events.event_id` | `10790421`       |
| status                    | `processed`      |
| auth mode                 | `token`          |
| conversation id           | `34883`          |
| payload `#ref`            | `HOME-3004-ZL6T` |

CRM result:

| Check                                     | Result             |
| ----------------------------------------- | ------------------ |
| matching new request for `HOME-3004-ZL6T` | WATCH              |
| existing request in conversation `34883`  | `SOL-1002`         |
| existing request reference                | `PAQUET-3004-9NGK` |

Interpretation:

- Native Chatwoot webhook is now working in production.
- The incoming WhatsApp message preserved the new `#ref`.
- The CRM link is blocked by repeat-lead semantics: the same WhatsApp
  conversation `34883` already has request `SOL-1002` linked to previous ref
  `PAQUET-3004-9NGK`.
- Current webhook code correctly avoids overwriting an existing different
  Growth reference.

Next product gap:

- Support multiple WAFlow requests inside one long-running Chatwoot
  conversation.
- Required behavior: when a new `#ref` arrives on a conversation that already
  has a request with another `growth_reference_code`, create or select a new
  CRM request for the new reference instead of treating the conversation as a
  single immutable request.
- Until that lands, clean E2E for `lead_source` should use a fresh WhatsApp
  contact/conversation.
