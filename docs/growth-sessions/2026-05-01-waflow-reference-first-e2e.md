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

- not applied yet;
- `supabase db push --dry-run --linked --workdir bukeer_flutter` failed with
  pooler SCRAM auth;
- no SQL admin RPC exists in PostgREST (`exec_sql`, `execute_sql`, `run_sql`,
  `sql` not found).

## Gate Decisions

| Gate                              | Status           | Notes                                                       |
| --------------------------------- | ---------------- | ----------------------------------------------------------- |
| WAFlow parity                     | PASS             | 28 submitted vs 28 `waflow_submit` since 2026-04-28         |
| Missing ref guardrail             | PASS             | orphan/watch only, no funnel/Meta pollution                 |
| Chatwoot webhook delivery         | PASS             | processed events and lifecycle mapping                      |
| Reference-first CRM request       | PASS             | two refs in same conversation created two requests          |
| `booking_confirmed`               | PASS             | controlled QA itinerary emitted booking for ref A           |
| WAFlow lead conversation mirror   | WATCH            | blocked by legacy unique index until SSOT migration applies |
| Chatwoot custom attributes mirror | P1 Flutter-owned | #792                                                        |
| Meta business messaging CAPI      | WATCH            | requires real CTWA `ctwa_clid`                              |

## Next

1. Apply the Flutter/SSOT migration.
2. Repeat the two-reference smoke and verify both `waflow_leads` rows can store
   the same `chatwoot_conversation_id`.
3. Run a fresh live WhatsApp WAFlow test from production UI.
4. Apply a real business itinerary confirmation later to replace the controlled
   QA booking evidence for production reporting.
