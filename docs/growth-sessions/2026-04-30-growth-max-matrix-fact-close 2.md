# Growth Max Matrix Fact Close - 2026-04-30

Scope: EPIC #310 sprint close for Max Performance Matrix facts, inventory and Council.

## Decision

- #310 remains `PASS-WITH-WATCH operativo`, not `PASS`.
- LLM Mentions stays `WATCH` and is not executed in this close.
- Backlinks stays blocked by DataForSEO subscription.
- Business Data / Reviews stays `WATCH` until CID/place id is available for a real smoke.

## Executed

- Populated Max Matrix fact tables from existing provider caches and inventory with `scripts/seo/normalize-growth-max-matrix-facts.mjs`.
- Recalculated GSC inventory rows from `growth_gsc_cache`.
- Recalculated GA4 inventory rows from `growth_ga4_cache`, `funnel_events` and `meta_conversion_events`.
- Ran joint normalizers and promoted max 5 Council-ready experiments.
- Generated health and Council artifacts.

## Supabase Counts

| Table                          | Rows |
| ------------------------------ | ---: |
| `seo_gsc_daily_facts`          |  700 |
| `seo_gsc_segment_facts`        | 2102 |
| `seo_ga4_landing_facts`        | 1515 |
| `seo_ga4_event_facts`          |  702 |
| `seo_ga4_geo_facts`            |    1 |
| `seo_keyword_opportunities`    |  111 |
| `seo_serp_snapshots`           |   12 |
| `seo_content_sentiment_facts`  |    1 |
| `seo_domain_competitive_facts` |   50 |
| `seo_joint_growth_facts`       |  876 |
| `growth_inventory`             |  843 |

## Council

- Approved active experiments: 5.
- Blocked rows: 42.
- Rejected rows: 3.
- Primary rejection reasons: missing evaluation date or active experiment cap exceeded.

## Fact Quality And Council From Facts

- Fact quality audit status: `PASS`.
- All sampled facts have `source_profile`, `fact_fingerprint`, `priority_score` and `evidence`.
- Joint facts with Council-ready metadata: 13.
- Council regenerated from `seo_joint_growth_facts`: 5 approved, 0 blocked, 8 rejected only because the active experiment cap is 5.
- Decision: do not run more provider calls before the next work cycle; current facts are usable for backlog generation and Council selection.

## Health

- Core cache health: `PASS`.
- Max Matrix status: `WATCH`.
- Coverage summary: 45 profiles, 13 covered, 28 partial, 2 provider-access-blocked, 2 excluded/watch.

## Future Implementation Backlog

These items are explicitly moved out of the current sprint close. They should
not block #310 from remaining `PASS-WITH-WATCH operativo`.

| Item                    | Current state                         | Future trigger                                                                                   | Target issues |
| ----------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------- |
| LLM Mentions            | `WATCH`; not executed in this close.  | Decide whether to pay/enable LLM Mentions access and define stable prompts, markets and cadence. | #384, #321    |
| Backlinks               | `BLOCKED` by DataForSEO subscription. | Enable Backlinks API access or approve fallback provider/manual import for authority facts.      | #382, #334    |
| Business Data / Reviews | `WATCH`; needs CID/place id.          | Obtain ColombiaTours CID/place id and approved competitor/local places for real smoke.           | #383, #335    |

## Artifacts

- `artifacts/seo/2026-04-30-growth-max-matrix-fact-normalization/growth-max-matrix-fact-normalization.md`
- `artifacts/seo/2026-04-30-growth-cache-health/growth-cache-health-report.md`
- `artifacts/seo/2026-04-30-growth-max-matrix-coverage-close/growth-max-matrix-coverage.json`
- `artifacts/seo/2026-04-30-growth-max-matrix-council-close/growth-max-matrix-council.md`
- `artifacts/seo/2026-04-30-growth-max-matrix-fact-quality/growth-max-matrix-fact-quality.md`
- `artifacts/seo/2026-04-30-growth-max-matrix-council-joint-facts/growth-max-matrix-council.md`
