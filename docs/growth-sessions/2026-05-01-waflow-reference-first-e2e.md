# WAFlow Reference-First E2E

Date: 2026-05-01
Epic: #310
Issue: #322

## Result

Status: `PASS-WITH-WATCH`

The reference-first CRM contract was validated with controlled production
Supabase data through the local Studio endpoint:

- two WAFlow submissions;
- same Chatwoot conversation id;
- two different Growth references;
- two separate CRM requests;
- full `waflow_submit -> qualified_lead -> quote_sent` chains;
- one controlled reference continued to `booking_confirmed` through a QA
  confirmed itinerary.

## Evidence

Artifact:

- `artifacts/seo/2026-05-01-waflow-crm-e2e-reference-first/waflow-crm-reconciliation.md`
- `artifacts/seo/2026-05-01-waflow-crm-e2e-booking-confirmed/waflow-crm-reconciliation.md`

Controlled references:

| Reference            | Conversation | Request    | Chain                                           |
| -------------------- | ------------ | ---------- | ----------------------------------------------- |
| `E2E-202605011344-A` | `939902`     | `SOL-1942` | `waflow_submit -> qualified_lead -> quote_sent` |
| `E2E-202605011344-B` | `939902`     | `SOL-1943` | `waflow_submit -> qualified_lead -> quote_sent` |

Reconciliation summary:

- submitted WAFlow leads: 2;
- `waflow_submit` events: 2;
- parity delta: 0;
- requests with Growth reference: 2;
- CRM link status: 2 `linked_exact_reference`;
- duplicate conversation group: `939902` with `SOL-1942`, `SOL-1943`.

Booking/itinerary confirmation:

- reference: `E2E-202605011344-A`;
- request: `SOL-1942`;
- itinerary: `QA-E2E-202605011344-A12543` /
  `f6a3e728-ef7f-43ac-b664-4ec5ab2067c7`;
- event: `booking_confirmed`;
- event id:
  `af30139593a9743661a7b5a8c00946c11b2a785f990ba743c9ff5ad1f664cc5a`.

Post-booking reconciliation:

- submitted WAFlow leads: 2;
- `waflow_submit` events: 2;
- parity delta: 0;
- requests with Growth reference: 2;
- requests with itinerary: 1;
- lifecycle:
  - `complete_booking_confirmed`: 1;
  - `quote_no_booking`: 1.

## Missing Reference Guardrail

Smoke result:

- event id: `missing_ref:939901:missing-ref:1777641464`;
- conversation id: `939901`;
- `webhook_events.status = processed`;
- `reference_code = null`;
- `funnel_events = 0`;
- `meta_conversion_events = 0`.

Decision:

- if no `#ref` and no recoverable Growth custom attribute exists, process the
  webhook as orphan/watch;
- do not update WAFlow;
- do not create/update CRM request;
- do not emit funnel events;
- do not send Meta CAPI.

## Schema Gap Found

The E2E found a legacy uniqueness constraint:

- `waflow_leads_chatwoot_conversation_uidx`

This index assumes one Chatwoot conversation equals one WAFlow lead. That is no
longer valid because one WhatsApp thread can contain multiple travel requests.

Mitigation implemented in Studio:

- the webhook now catches duplicate-key conflicts on
  `waflow_leads.chatwoot_conversation_id`;
- it still stores the lifecycle event and custom attributes;
- it records:
  - `chatwoot_conversation_id_unstored`;
  - `chatwoot_conversation_unique_conflict = true`.

SSOT migration prepared in Flutter and mirrored in Studio:

- `20260504111600_waflow_reference_first_conversation_index.sql`

The migration drops the unique index and replaces it with non-unique lookup
indexes by conversation and conversation/reference.

Apply status:

- applied 2026-05-01 from the Flutter/SSOT migration through the Supabase
  Management API after confirming the Supabase MCP server was configured but not
  loaded as an active Codex tool in this thread;
- verification query returned:
  - `waflow_leads_chatwoot_conversation_idx`
  - `waflow_leads_chatwoot_conversation_reference_idx`
- `waflow_leads_chatwoot_conversation_uidx` is no longer present.

## Gate Decisions

| Gate                              | Status           | Notes                                                                |
| --------------------------------- | ---------------- | -------------------------------------------------------------------- |
| WAFlow parity                     | PASS             | 28 submitted vs 28 `waflow_submit` since 2026-04-28                  |
| Missing ref guardrail             | PASS             | orphan/watch only, no funnel/Meta pollution                          |
| Chatwoot webhook delivery         | PASS             | processed events and lifecycle mapping                               |
| Reference-first CRM request       | PASS             | two refs in same conversation created two requests                   |
| `booking_confirmed`               | PASS             | controlled QA itinerary emitted booking for ref A                    |
| WAFlow lead conversation mirror   | PASS             | post-migration smoke stored same conversation id on both WAFlow rows |
| Chatwoot custom attributes mirror | PASS-WITH-WATCH | Flutter #792 deployed as Edge Function v182; conversation `34883` backfilled |
| Meta business messaging CAPI      | WATCH            | requires real CTWA `ctwa_clid`                                       |

## Next

1. Let the next organic Chatwoot inbound message prove automatic mirror without
   manual backfill.
2. Apply a real business itinerary confirmation later to replace the controlled
   QA booking evidence for production reporting.

## Post-Migration Mirror Smoke

Run: 2026-05-01 14:37 UTC.

| Reference               | Conversation | Request    | Mirror                                         |
| ----------------------- | ------------ | ---------- | ---------------------------------------------- |
| `E2E-20260501143733-M1` | `968696`     | `SOL-1945` | `chatwoot_conversation_id=968696`, no conflict |
| `E2E-20260501143733-M2` | `968696`     | `SOL-1946` | `chatwoot_conversation_id=968696`, no conflict |

Events:

- each reference has `waflow_submit`;
- each reference has `qualified_lead`;
- each reference has `quote_sent`.

Decision: `WAFlow lead conversation mirror = PASS`.

## Live WhatsApp Production Smoke

Run: 2026-05-01 15:01-15:03 UTC.

Executed from production `https://colombiatours.travel` with UTM campaign
`epic310_live_waflow_two_refs`.

| Reference        | Conversation | Request    | Evidence                                                         |
| ---------------- | ------------ | ---------- | ---------------------------------------------------------------- |
| `HOME-0105-K3CT` | `34883`      | `SOL-1949` | `waflow_leads`, `waflow_submit`, `whatsapp_cta_click`, CRM link  |
| `HOME-0105-FG0F` | `34883`      | `SOL-1950` | `waflow_leads`, `waflow_submit`, `whatsapp_cta_click`, CRM link  |

Result:

- production WAFlow generated and stored both lead rows;
- both WhatsApp messages were delivered from WhatsApp Desktop;
- both references emitted activation events;
- both references linked to distinct CRM requests in the same Chatwoot
  conversation;
- `waflow_leads.chatwoot_conversation_id=34883` stored for both rows;
- Chatwoot conversation custom attributes were empty before Flutter mirror
  deploy.
- Flutter `process-chatwoot-message` was deployed to Supabase as version `182`.
- Conversation `34883` was backfilled after deploy:
  - `growth_current_reference_code=HOME-0105-FG0F`;
  - `growth_reference_history` includes `HOME-0105-K3CT` and
    `HOME-0105-FG0F`;
  - `growth_last_crm_request_short_id=SOL-1950`.
