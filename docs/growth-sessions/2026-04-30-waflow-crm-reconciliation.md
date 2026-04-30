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
