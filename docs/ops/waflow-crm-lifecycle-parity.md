# WAFlow CRM Lifecycle Parity

Status: active runbook for Epic #310 / #322.
Owner: Growth OS + CRM platform.
Last updated: 2026-04-30.

## Purpose

Reconcile WAFlow lead tracking with the shared Bukeer CRM model used by
Bukeer Flutter and Bukeer Studio. The goal is not to create a parallel Growth
CRM. WAFlow, Chatwoot, requests, itineraries and `funnel_events` must describe
one commercial lifecycle over the same Supabase backend.

## Ledger parity result

Scope:

- Website: ColombiaTours, `894545b7-73ca-4dae-b76a-da5b6a3f8441`
- Window: since `2026-04-28T00:00:00Z`
- Source ledger: `waflow_leads` where `submitted_at is not null`
- Growth ledger: `funnel_events` where `event_name = 'waflow_submit'`

Before reconciliation:

| Metric                          | Count |
| ------------------------------- | ----: |
| Submitted WAFlow leads          |    11 |
| Matching `waflow_submit` events |     8 |
| Gap                             |     3 |

The three gaps were:

| reference_code     | Classification                   | Reason                                                                         |
| ------------------ | -------------------------------- | ------------------------------------------------------------------------------ |
| `AGENCI-2904-JPZ9` | `legacy_pre_deploy_endpoint_gap` | Submitted lead had reference, attribution and tenant scope, but no funnel row. |
| `HOME-2904-9R79`   | `legacy_pre_deploy_endpoint_gap` | Submitted lead had reference, attribution and tenant scope, but no funnel row. |
| `HOME-2904-B3B7`   | `legacy_pre_deploy_endpoint_gap` | Submitted lead had reference, attribution and tenant scope, but no funnel row. |

Rejected classifications:

- `missing_reference_code`: false. All three rows had `reference_code`.
- `no_submitted`: false. All three rows had `submitted_at`.
- `endpoint_failure_live`: not supported by the latest evidence. Newer production
  submits emit `funnel_events.waflow_submit`; these three rows are historical
  pre-parity gaps.

Backfill applied:

| reference_code     | event_id                                                           |
| ------------------ | ------------------------------------------------------------------ |
| `AGENCI-2904-JPZ9` | `0d4089c8bfbe974f45c045242a4e5b5f6e819eb237628491f46a04f929497022` |
| `HOME-2904-9R79`   | `c5768f56d4a24ce1c32d180cbfe620527a595f196b93e8c00ca16c46980526d5` |
| `HOME-2904-B3B7`   | `addd438e21973f1f184a927cbe3baa26bc0229135c8947fa780ec7351f5a09bc` |

After reconciliation:

| Metric                          | Count |
| ------------------------------- | ----: |
| Submitted WAFlow leads          |    11 |
| Matching `waflow_submit` events |    11 |
| Gap                             |     0 |

## Shared lifecycle contract

`requests` is the CRM opportunity object. Bukeer Flutter already treats
`requests.request_stage` as source of truth for the conversation pipeline:

1. `new_lead`
2. `qualified`
3. `proposal_sent`
4. `closed_won`
5. `closed_lost`

`itineraries` is the quote and operation object. The shared lifecycle maps to
Growth OS as follows:

| Business step          | Operational source                  | CRM state                           | Growth event          | Notes                                           |
| ---------------------- | ----------------------------------- | ----------------------------------- | --------------------- | ----------------------------------------------- |
| WAFlow submitted       | `waflow_leads`                      | `requests.request_stage = new_lead` | `waflow_submit`       | `reference_code` is the acquisition key.        |
| Conversation qualified | Chatwoot + agent action             | `qualified`                         | `qualified_lead`      | Conversation key is `chatwoot_conversation_id`. |
| Quote/itinerary sent   | Flutter quote flow                  | `proposal_sent`                     | `quote_sent`          | `requests.itinerary_id` links CRM to itinerary. |
| Itinerary confirmed    | `itineraries.status = 'Confirmado'` | `closed_won`                        | `booking_confirmed`   | No Wompi dependency in this phase.              |
| Lost opportunity       | CRM pipeline                        | `closed_lost`                       | optional future event | Should not emit `booking_confirmed`.            |

## Keys and ownership

| Key                        | Owner                | Purpose                                                                        |
| -------------------------- | -------------------- | ------------------------------------------------------------------------------ |
| `account_id`               | Shared backend       | Tenant boundary and RLS scope.                                                 |
| `website_id`               | Studio public site   | Public site/source attribution scope.                                          |
| `reference_code`           | WAFlow/Growth OS     | Lead/session attribution key across WAFlow, events and itinerary confirmation. |
| `chatwoot_conversation_id` | Chatwoot/Flutter CRM | Conversation key for multi-channel client communication.                       |
| `request_id`               | Flutter CRM          | Opportunity key for the commercial pipeline.                                   |
| `itinerary_id`             | Flutter operations   | Quote and operation key.                                                       |

Until shared schema additions are approved from `bukeer_flutter`, the safe
bridge is:

- keep `funnel_events.reference_code` mandatory for Growth OS events;
- persist `growth_reference_code` or `reference_code` in `itineraries.custom_fields`;
- persist WAFlow/attribution metadata in `requests.custom_fields` when linking a
  lead to a CRM request;
- keep `requests.chatwoot_conversation_id` and `requests.itinerary_id` as the
  CRM-operational join.

## Required scalable behavior

### WAFlow submit

When `/api/waflow/lead` receives a confirmed submit:

1. upsert `waflow_leads`;
2. insert idempotent `funnel_events.waflow_submit`;
3. if a Chatwoot conversation exists, ensure or link a CRM `request`;
4. store `reference_code`, source channel, UTM/ad ids and WAFlow payload summary
   in controlled request metadata;
5. never store PII in `funnel_events.payload`.

### Chatwoot conversation

Flutter CRM remains the source of truth for pipeline movement. Chatwoot labels
and custom attributes can mirror state for agent UX, but `requests.request_stage`
is the state the Growth OS should trust.

### Quote and itinerary

When a quote is created from a request, Flutter already links
`requests.itinerary_id`. The itinerary should carry the same growth reference in
`custom_fields.growth_reference_code` so `emit_itinerary_booking_confirmed(uuid)`
can join attribution without relying on Wompi.

### Operation

An itinerary in `Confirmado` is the operative conversion for Epic #310. The
confirmed itinerary event is the Growth OS booking signal until purchase/Wompi is
implemented later.

## Health checks

Ledger parity check:

```sql
with submitted as (
  select reference_code
  from public.waflow_leads
  where website_id = '894545b7-73ca-4dae-b76a-da5b6a3f8441'
    and submitted_at is not null
    and created_at >= '2026-04-28T00:00:00Z'
),
events as (
  select distinct reference_code
  from public.funnel_events
  where website_id = '894545b7-73ca-4dae-b76a-da5b6a3f8441'
    and event_name = 'waflow_submit'
    and created_at >= '2026-04-28T00:00:00Z'
)
select s.reference_code
from submitted s
left join events e using (reference_code)
where e.reference_code is null;
```

Expected: zero rows.

Chain check:

```sql
select reference_code,
       array_agg(event_name order by occurred_at) as event_chain
from public.funnel_events
where reference_code = '<REFERENCE_CODE>'
group by reference_code;
```

Expected for a complete controlled chain:

```text
waflow_submit -> qualified_lead -> quote_sent -> booking_confirmed
```

## Gaps after this reconciliation

1. Add a shared idempotent CRM-link operation from WAFlow/Chatwoot to
   `requests`, preferably owned by `bukeer_flutter` as shared backend SSOT.
2. Add explicit schema columns later if approved: `requests.reference_code`,
   `requests.source_channel`, `requests.source_website_id`, and optionally
   `requests.first_funnel_event_id`.
3. Repeat with a fresh production lead, real conversation, real quote and real
   confirmed itinerary to certify the path without backfill.
4. Keep `booking_confirmed` based on `itineraries.status = 'Confirmado'` for
   this cycle; do not implement Wompi/Purchase yet.
