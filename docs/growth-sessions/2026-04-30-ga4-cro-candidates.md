---
session_id: "2026-04-30-ga4-cro-candidates"
started_at: "2026-04-30T09:12:07-05:00"
ended_at: "2026-04-30T09:20:00-05:00"
agent: "codex-lane-6"
scope: "ga4-cro-candidates"
website_id: "894545b7-73ca-4dae-b76a-da5b6a3f8441"
website_slug: "colombiatours-travel"
initiator: "Lane 6 - GA4/CRO activation candidates"
outcome: "completed"
linked_weekly: "docs/growth-weekly/2026-05-04-council.md"
related_issues: [310, 321]
---

# GA4/CRO Activation Candidates - 2026-04-30

## Scope

Derive 1-2 decision-grade CRO/activation experiments from existing `growth_ga4_cache`, `funnel_events`, and `growth_inventory`.

No DB mutations were performed. Write scope was limited to this session file.

## Sources Read

| Source                                                                                                | Window / status          |                                                               Baseline extracted | Notes                                                                                         |
| ----------------------------------------------------------------------------------------------------- | ------------------------ | -------------------------------------------------------------------------------: | --------------------------------------------------------------------------------------------- |
| `artifacts/seo/2026-04-29-growth-ga4-inventory-normalization/growth-ga4-inventory-normalization.json` | 2026-04-01 to 2026-04-28 | 4 GA4 cache reports, 13,806 GA4 rows, 476 candidates, 100 inventory rows applied | Primary GA4/CRO source because it is the applied normalizer artifact.                         |
| `growth_inventory` read-only query                                                                    | live read on 2026-04-30  |                                     top activation/qualified-lead rows persisted | Confirms the top GA4-derived rows are still queued in inventory.                              |
| `funnel_events` read-only query                                                                       | live read on 2026-04-30  |                                                                  10 events total | Current ledger: 6 `waflow_submit`, 1 `qualified_lead`, 1 `quote_sent`, 2 `booking_confirmed`. |
| `growth_ga4_cache` read-only query                                                                    | live read on 2026-04-30  |                                                                  0 rows returned | Cache appears expired/purged after the 2026-04-29 apply. Refresh before launch/readout.       |
| `docs/growth-weekly/2026-05-04-council.md`                                                            | council intake           |                           CRO rows can enter backlog; Chatwoot lifecycle blocked | Decision context for W19.                                                                     |

## Shared Baseline

| Signal                                      | Baseline |
| ------------------------------------------- | -------: |
| GA4 normalizer candidates                   |      476 |
| `event_page_dropoff` candidates             |      311 |
| `source_medium_page_opportunity` candidates |       92 |
| `landing_low_activation` candidates         |       54 |
| `campaign_traffic_watch` candidates         |       19 |
| Baseline artifact `funnel_events`           |        7 |
| Live `funnel_events` read                   |       10 |
| Live `growth_ga4_cache` rows                |        0 |

## Candidate 1 - Editorial Activation CTA Batch

**Decision status:** READY WITH TRACKING GAP.

**Source rows:** `growth_inventory.cluster='event_page_dropoff'`, top five persisted GA4-derived rows from the 2026-04-29 normalizer.

**Hypothesis:** If the top editorial pages add a contextual trip-planning CTA module above the first major content break and again near the exit area, then high-engagement informational traffic will produce measurable WAFlow opens/submits or WhatsApp clicks instead of ending as unqualified page engagement.

**Owner:** A5 Growth Ops for experiment design, A4 SEO for page copy/context, A3 Tracking/Data for funnel event verification.

**Metric:** primary: activation events per landing session, defined as `waflow_open + waflow_submit + whatsapp_cta_click` divided by GA4 landing sessions. Secondary: qualified leads from the same source URLs.

**Evaluation date:** 2026-05-14, after a 14-day post-ship readout. Require refreshed GA4 cache and `funnel_events` export for the same URL set.

### Landing / Event Baseline

| Landing URL                                                                  | GA4 sessions 28d | Engagement | GA4 events | Tracked activation / QL |
| ---------------------------------------------------------------------------- | ---------------: | ---------: | ---------: | ----------------------: |
| `https://colombiatours.travel/los-mejores-lugares-turisticos-colombia`       |               73 |      87.3% |        736 |                       0 |
| `https://colombiatours.travel/los-10-mejores-lugares-turisticos-de-colombia` |               72 |      63.3% |        674 |                       0 |
| `https://colombiatours.travel/mejor-epoca-para-viajar-a-colombia-mes-a-mes`  |               67 |      84.0% |        648 |                       0 |
| `https://colombiatours.travel/10-pueblos-cerca-de-bogota-que-debes-visitar`  |               55 |      78.6% |        599 |                       0 |
| `https://colombiatours.travel/cuanto-cuesta-viajar-a-cartagena-de-indias`    |               60 |      45.0% |        538 |                       0 |
| **Batch total**                                                              |          **327** |        n/a |  **3,195** |                   **0** |

### Decision Read

This is decision-grade because the baseline has enough page engagement to measure a change, the tracked downstream count is zero, and all five rows share the same failure mode: many GA4 page/scroll/session events but no WAFlow, WhatsApp, or qualified-lead events.

### Gaps / Preconditions

| Gap                                                                          | Owner | Needed before launch                                                                                          |
| ---------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------- |
| Current `growth_ga4_cache` read returned 0 rows.                             | A3    | Refresh GA4 cache for the experiment URL set before launch.                                                   |
| `event_page_dropoff` rows count generic GA4 events, not CTA-specific intent. | A3    | Ensure `waflow_open`, `waflow_submit`, and `whatsapp_cta_click` are emitted with `source_url` or `page_path`. |
| CTA copy and offer need page-specific context.                               | A4/A5 | Use destination/timing/cost intent per page, not generic "contact us" copy.                                   |

## Candidate 2 - Facebook Paid Package Landing Continuity

**Decision status:** READY WITH ATTRIBUTION GAP.

**Source row:** `growth_inventory.cluster='source_medium_page_opportunity'` for `https://colombiatours.travel/paquetes-a-colombia-todo-incluido-en-9-dias`.

**Hypothesis:** If the Facebook paid landing page message, CTA path, and tracking are aligned to the ad promise, then paid traffic will convert into measurable activation and qualified-lead events instead of staying only in GA4 conversion reporting.

**Owner:** A5 Growth Ops for paid/CRO decision, A3 Tracking/Data for attribution and event reconciliation.

**Metric:** primary: paid activation rate by landing session, segmented to `fb / paid`. Secondary: `qualified_lead` count and cost per qualified lead once spend data is joined.

**Evaluation date:** 2026-05-08 for tracking reconciliation; 2026-05-15 for conversion impact if tracking is clean by 2026-05-01.

### Landing / Channel Baseline

| Landing URL                                                                | Channel / source-medium | GA4 sessions 28d |                                             GA4 engagement | GA4 conversions | Funnel activation / QL |
| -------------------------------------------------------------------------- | ----------------------- | ---------------: | ---------------------------------------------------------: | --------------: | ---------------------: |
| `https://colombiatours.travel/paquetes-a-colombia-todo-incluido-en-9-dias` | `fb / paid`             |              760 | 45.3% in source action text; 13.3% persisted in merged row |              78 |                      0 |

### Decision Read

This is decision-grade because it has material paid traffic volume and reported GA4 conversions, but the persisted funnel counters are all zero. That makes it either a CRO leakage candidate or a tracking/attribution defect. Both outcomes are actionable before scaling paid spend.

### Gaps / Preconditions

| Gap                                                                                           | Owner | Needed before launch                                                                          |
| --------------------------------------------------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------- |
| Channel normalized as `unknown` in `growth_inventory` even though source text is `fb / paid`. | A3    | Map `fb / paid` to `meta` or document why it should remain unknown.                           |
| GA4 engagement differs between persisted row and next-action text.                            | A3    | Refresh GA4 cache and reconcile the source-medium row before approving spend decisions.       |
| `funnel_events` has no page-level activation for this landing row.                            | A3    | Confirm WAFlow/WhatsApp emitters attach `source_url`, `page_path`, UTM source, and click ids. |
| Spend/cost baseline is absent.                                                                | A5    | Join Meta Ads spend before declaring CPL or ROAS impact.                                      |

## Non-Candidate Watch

The homepage `landing_low_activation` row has 140 SEO sessions, 6.4% engagement, and 0 tracked activation events. It is worth keeping in watch, but it is lower priority than the two candidates above because the immediate decision is either a broad homepage redesign or tracking diagnosis without a sharper channel/page intent.

## Mutations

| Entity   | Action                 | Before      | After             | Source                     |
| -------- | ---------------------- | ----------- | ----------------- | -------------------------- |
| Supabase | none                   | unchanged   | unchanged         | read-only inspection       |
| Repo     | added session document | file absent | this file present | user-requested write scope |

## Handoff

1. A3 refreshes GA4 cache and exports matching `funnel_events` for the candidate URLs before launch.
2. A5 chooses one active W19 slot. Candidate 2 should be gated on tracking reconciliation; Candidate 1 can launch as a CRO/content CTA batch once event capture is verified.
3. Council should reject any CRO row without baseline window, owner, primary metric, evaluation date, and a page/channel/event source row.
