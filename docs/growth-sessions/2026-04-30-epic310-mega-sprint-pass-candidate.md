# EPIC #310 Mega Sprint Pass Candidate Close

Date: 2026-04-30
Branch: `dev`

## Objective

Move EPIC #310 from `PASS-WITH-WATCH operativo` toward candidate `PASS` by closing the technical P0/P1 crawl gate, populating Max Performance Matrix facts, enforcing Council quality gates, and leaving future access blockers explicitly deferred.

## Results

- DataForSEO post-fix crawl task: `04302257-1574-0216-0000-3f30b406bb51`.
- Crawl profile: OnPage full, `max_crawl_pages=1000`, sitemap respected, resources/JS/browser rendering disabled.
- Crawl status: `finished`, `1000` pages crawled, queue `0`, cost reported as `0`.
- OnPage score: `95.92`.
- Technical normalization: `999` `seo_audit_results`, `50` `seo_audit_findings`, `50` `growth_inventory` rows.
- Technical severity after normalization: `P0=0`, `P1=0`, `WATCH=50`.
- Diff against `04301808-1574-0216-0000-1e0a9d846a5f`: `36 resolved`, `50 open`, `0 new`, `0 regressed`, `50 watch`.
- Triage after apply: `50 WATCH` findings split into `45 technical_watch`, `4 internal_linking`, `1 media_assets`.

## Growth Facts

Max Matrix fact quality status: `PASS`.

| Fact table                     | Rows |
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
| `seo_joint_growth_facts`       |  924 |

Health report:

- Core cache/facts: `PASS`.
- GSC cache age: about `2.29h`.
- GA4 cache age: about `2.29h`.
- DataForSEO cache age: about `0.01h`.
- Max Matrix profile rollup: `WATCH`, with remaining profile coverage/access items deferred.

## Council

Final Council artifact: `PASS-WITH-WATCH`.

- Candidates: `94`.
- Approved active experiments: `5`.
- Blocked rows: `73`.
- Rejected rows: `16`.
- Enforcement updated so duplicate experiment surfaces are rejected before applying the cap of 5 active experiments.
- Rejected rows are now treated as controlled Council behavior, not as a global failure when 5 valid active experiments exist.

## Tracking Closeout

- Meta CAPI Chatwoot lifecycle events now include `messaging_channel=whatsapp` for `business_messaging` action source.
- Tests passed for Chatwoot webhook and Meta CAPI.
- Remaining tracking WATCH: CRM request-link coverage still needs stronger tests for `requests` linkage and a fresh full funnel smoke.

## Deferred Access Items

These are intentionally future scope and should not block this pass-candidate close:

- LLM Mentions API access decision.
- Backlinks API subscription or fallback.
- Business Data / Reviews CID or place id for smoke.

## Evidence

- Crawl: `artifacts/seo/2026-04-30-mega-sprint-dataforseo-pass-candidate/`
- Diff: `artifacts/seo/2026-04-30-mega-sprint-diff-pass-candidate/`
- Triage apply: `artifacts/seo/2026-04-30-mega-sprint-triage-pass-candidate-apply/`
- Fact quality: `artifacts/seo/2026-04-30-mega-sprint-fact-quality/`
- Council final: `artifacts/seo/2026-04-30-mega-sprint-council-final/`
- P0 redirect smoke: `artifacts/seo/2026-04-30-mega-sprint-p0-smoke/`

## Gate Decision

#310 is now stronger than `PASS-WITH-WATCH operativo` and can be treated as `PASS candidate` for the technical crawl/facts/Council lane because:

- P0/P1 technical findings are zero in the comparable post-fix crawl.
- Regressions are zero.
- Raw provider data has been normalized into facts.
- Joint facts and Council artifact are reproducible.

#310 should not be closed yet because Max Matrix remains `WATCH` for deferred provider access and tracking still needs a fresh full-funnel smoke.
