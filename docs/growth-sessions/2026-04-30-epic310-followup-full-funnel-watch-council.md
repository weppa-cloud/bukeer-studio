---
session_id: "2026-04-30-epic310-followup-full-funnel-watch-council"
tenant: "colombiatours-travel"
website_id: "894545b7-73ca-4dae-b76a-da5b6a3f8441"
epic: 310
spec: 337
scope: "full-funnel-watch-council-dataforseo-next-batch"
status: "pass-with-watch"
created_at: "2026-04-30"
---

# EPIC #310 Follow-Up: Full Funnel, WATCH Triage, Council, DataForSEO Next Batch

## Objective

Execute the next #310 operating loop after the technical pass-candidate close:

- Smoke full-funnel tracking: `WAFlow -> CRM request -> qualified_lead -> quote_sent -> booking_confirmed`.
- Classify the 50 technical WATCH findings from DataForSEO task `04302257-1574-0216-0000-3f30b406bb51`.
- Execute Council with 5 active experiments and assigned owners.
- Run the next DataForSEO batch for Labs demand and SERP competitor/local pack.

## Actions

| Area         | Action                                                                                  | Result               |
| ------------ | --------------------------------------------------------------------------------------- | -------------------- |
| Full funnel  | Ran `scripts/seo/reconcile-waflow-crm-funnel.mjs` read-only from `2026-04-28T00:00:00Z` | `WATCH`              |
| WATCH triage | Reviewed `dataforseo-v2-triage.json` for task `04302257-1574-0216-0000-3f30b406bb51`    | `PASS-WITH-WATCH`    |
| DataForSEO   | Ran Labs/SERP next batch with 5 profiles and 21 calls                                   | `PASS`, cost `0.348` |
| Facts        | Re-ran `normalize-growth-max-matrix-facts.mjs --apply=true --limit=1000`                | `PASS`               |
| Joint facts  | Re-ran `run-growth-joint-normalizers.mjs --apply=true --maxCouncil=5 --limit=1000`      | `PASS`               |
| Council      | Regenerated Max Matrix Council artifact                                                 | `PASS-WITH-WATCH`    |

## Full-Funnel Tracking

Artifact: `artifacts/seo/2026-04-30-full-funnel-smoke-current/`

Status: `WATCH`.

| Check                          | Result                   |
| ------------------------------ | ------------------------ |
| Submitted WAFlow leads         | 18                       |
| `funnel_events.waflow_submit`  | 18                       |
| Parity delta                   | 0                        |
| Requests in window             | 18                       |
| Requests with growth reference | 7                        |
| Complete booking chain         | 1 controlled smoke chain |
| Booking without prior chain    | 2                        |
| Lead-only refs                 | 17                       |

Decision:

- WAFlow submit parity is `PASS`.
- Full-funnel is still `WATCH`, not `PASS`, because the only complete chain is controlled smoke evidence and it is not linked to an exact CRM request.
- Do not run CRM reconciliation apply now. The dry-run did not produce safe `candidate_time_window_high_confidence` rows that would improve the state.
- Next closure requires a fresh business reference where the same `reference_code` moves through `waflow_submit -> request linked -> qualified_lead -> quote_sent -> booking_confirmed`.

## Technical WATCH Triage

Artifact: `artifacts/seo/2026-04-30-mega-sprint-triage-pass-candidate-apply/`

| Pattern            | Count | Decision                                                                                                                                        |
| ------------------ | ----: | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `technical_watch`  |    45 | Keep WATCH; no Council experiment. Mostly low-content/render-blocking/image-title/readability watch on activity pages without traffic baseline. |
| `internal_linking` |     4 | Keep WATCH/backlog; redirect-chain rows need reproducible HTTP evidence before remediation.                                                     |
| `media_assets`     |     1 | Backlog candidate; homepage missing image alt should be handled in media/a11y sweep.                                                            |

Decision:

- No WATCH row blocks #310.
- No WATCH row is promoted to active Council.
- Only the homepage image-alt row becomes low-priority backlog under #313/media accessibility.

## DataForSEO Labs/SERP Next Batch

Artifact: `artifacts/seo/2026-04-30-dataforseo-next-batch-labs-serp-apply/`

| Profile                             |  Calls |  Cost USD | Status       |
| ----------------------------------- | -----: | --------: | ------------ |
| `dfs_labs_demand_cluster_v1`        |      2 |     0.080 | complete     |
| `dfs_labs_competitor_visibility_v1` |      7 |     0.180 | complete     |
| `dfs_labs_gap_intersections_v1`     |      1 |     0.020 | complete     |
| `dfs_serp_priority_keywords_v1`     |      8 |     0.056 | complete     |
| `dfs_serp_local_pack_v1`            |      3 |     0.012 | complete     |
| **Total**                           | **21** | **0.348** | **complete** |

Post-normalization facts:

| Fact table                     | Rows |
| ------------------------------ | ---: |
| `seo_gsc_daily_facts`          | 1000 |
| `seo_gsc_segment_facts`        | 2998 |
| `seo_ga4_landing_facts`        | 2170 |
| `seo_ga4_event_facts`          | 1002 |
| `seo_ga4_geo_facts`            |    1 |
| `seo_keyword_opportunities`    |  311 |
| `seo_serp_snapshots`           |   33 |
| `seo_content_sentiment_facts`  |    1 |
| `seo_domain_competitive_facts` |   50 |
| `seo_joint_growth_facts`       | 1072 |

Fact quality after the batch: `PASS`.

Known gap:

- The current runner is configured for the Colombia/Spanish operating profile. EN-US deep demand needs a runner enhancement to expose `location_code=2840` and `language_code=en` overrides before executing a true EN-US demand batch.

## Council Execution

Artifact: `artifacts/seo/2026-04-30-next-batch-council/`

Generated status: `PASS-WITH-WATCH`.

| Count           | Value |
| --------------- | ----: |
| Candidates      |   139 |
| Approved active |     5 |
| Blocked         |   113 |
| Rejected        |    21 |

Council decision:

- Keep maximum 5 active experiments.
- Do not fill all slots with similar GSC/CTR rows.
- Use independent workstreams so learning is not confounded: technical watch, EN quality, one GSC CTR batch, one activation batch, one tracking gate.

Active 5 for execution:

| Slot | Experiment                           | Owner                      | Success metric                                                          | Evaluation date |
| ---: | ------------------------------------ | -------------------------- | ----------------------------------------------------------------------- | --------------- |
|    1 | Panaca performance watch/remediation | A1 Backend                 | Clear `high_loading_time/high_waiting_time` or document/fix cause       | 2026-05-12      |
|    2 | EN quality pilot                     | A4 SEO + A5 Growth Ops     | Only publish EN URLs that pass quality/hreflang gate                    | 2026-05-07      |
|    3 | GSC high-impression / low-CTR batch  | A4 SEO                     | CTR/clicks/position improve on next GSC window                          | 2026-05-25      |
|    4 | GA4 landing activation gap           | A3 Tracking + A2 Dashboard | Activation events per landing session improve after attribution refresh | 2026-05-14      |
|    5 | WAFlow / itinerary traceability      | A3 Tracking                | Fresh live full chain with CRM request link and no Meta CAPI failures   | 2026-05-07      |

## Mutations

| Type                 | Target                                                                           | Result                                                  |
| -------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Provider cache/facts | Supabase `growth_dataforseo_cache`, `seo_provider_usage`, Max Matrix fact tables | DataForSEO Labs/SERP raw persisted and facts normalized |
| Inventory/Council    | `growth_inventory`, `seo_joint_growth_facts`                                     | Joint normalizers applied and 5 Council rows promoted   |
| Docs                 | `docs/growth-okrs/budget.md`                                                     | DataForSEO next-batch budget row added before paid call |

## Next Steps

1. Run fresh business full-funnel smoke when Sales has a real quote-to-confirmed itinerary.
2. Add EN-US override support to `run-dataforseo-max-performance-profiles.mjs` before the EN-US deep demand batch.
3. Keep 50 technical WATCH findings out of Council until they persist with traffic/conversion baseline.
4. Execute the 5 Council experiments with owners above.
5. Update #310/#311/#313/#321/#322 with this closeout.
