# Growth OS Max Performance Orchestrator

Generated: 2026-04-30T16:52:59.286Z
Website: 894545b7-73ca-4dae-b76a-da5b6a3f8441
Mode: dry-run
Cadence: weekly
Status: WATCH

## Summary

| Metric | Value |
|---|---:|
| Total profiles | 45 |
| Selected profiles | 25 |
| Implemented selected | 7 |
| Partial selected | 7 |
| Planned selected | 11 |

## Selected Profiles

| Decision | Priority | Provider | Profile | Cadence | Implementation | Approval | Raw/cache | Facts | Owner issues | Reason |
|---|---|---|---|---|---|---|---|---|---|---|
| WATCH | P0 | gsc | gsc_daily_complete_web_v1 | daily | planned | automatic | growth_gsc_cache | seo_gsc_daily_facts | #378, #321 | Profile is specified but extractor/normalizer is not implemented. |
| WATCH | P1 | gsc | gsc_daily_complete_image_v1 | weekly | planned | automatic | growth_gsc_cache | seo_gsc_image_facts | #378, #314 | Profile is specified but extractor/normalizer is not implemented. |
| RUNNABLE | P0 | gsc | gsc_council_28d_query_page_v1 | weekly | implemented | automatic | growth_gsc_cache | seo_gsc_query_page_facts | #378, #311, #321 | Dry-run only; profile-specific execution is listed in next_commands. |
| RUNNABLE | P0 | gsc | gsc_council_28d_page_market_v1 | weekly | implemented | automatic | growth_gsc_cache | seo_gsc_market_facts | #378, #311, #321 | Dry-run only; profile-specific execution is listed in next_commands. |
| RUNNABLE | P1 | gsc | gsc_council_28d_page_device_v1 | weekly | implemented | automatic | growth_gsc_cache | seo_gsc_device_facts | #378, #311, #321 | Dry-run only; profile-specific execution is listed in next_commands. |
| RUNNABLE | P1 | gsc | gsc_trend_90d_page_v1 | weekly | partial | automatic | growth_gsc_cache | seo_gsc_trend_facts | #378, #312, #321 | Dry-run only; profile-specific execution is listed in next_commands. |
| RUNNABLE | P1 | gsc | gsc_search_appearance_v1 | weekly | partial | automatic | growth_gsc_cache | seo_gsc_appearance_facts | #378, #321 | Dry-run only; profile-specific execution is listed in next_commands. |
| WATCH | P1 | gsc | gsc_locale_path_v1 | weekly | planned | automatic | growth_gsc_cache | seo_gsc_locale_facts | #378, #314, #315, #316 | Profile is specified but extractor/normalizer is not implemented. |
| WATCH | P1 | gsc | gsc_brand_nonbrand_v1 | weekly | planned | automatic | growth_gsc_cache | seo_gsc_brand_facts | #378, #321 | Profile is specified but extractor/normalizer is not implemented. |
| WATCH | P0 | ga4 | ga4_daily_landing_channel_v1 | daily | planned | automatic | growth_ga4_cache | seo_ga4_landing_daily_facts | #379, #321 | Profile is specified but extractor/normalizer is not implemented. |
| RUNNABLE | P0 | ga4 | ga4_council_landing_channel_28d_v1 | weekly | implemented | automatic | growth_ga4_cache | seo_ga4_landing_facts | #379, #311, #321 | Dry-run only; profile-specific execution is listed in next_commands. |
| RUNNABLE | P0 | ga4 | ga4_page_source_medium_28d_v1 | weekly | implemented | automatic | growth_ga4_cache | seo_ga4_source_facts | #379, #321 | Dry-run only; profile-specific execution is listed in next_commands. |
| RUNNABLE | P0 | ga4 | ga4_event_page_28d_v1 | weekly | implemented | automatic | growth_ga4_cache | seo_ga4_event_facts | #379, #322, #321 | Dry-run only; profile-specific execution is listed in next_commands. |
| RUNNABLE | P0 | ga4 | ga4_campaign_source_medium_28d_v1 | weekly | implemented | automatic | growth_ga4_cache | seo_ga4_campaign_facts | #379, #322, #332, #333 | Dry-run only; profile-specific execution is listed in next_commands. |
| WATCH | P1 | ga4 | ga4_geo_landing_28d_v1 | weekly | planned | automatic | growth_ga4_cache | seo_ga4_geo_facts | #379, #321 | Profile is specified but extractor/normalizer is not implemented. |
| WATCH | P1 | ga4 | ga4_device_landing_28d_v1 | weekly | planned | automatic | growth_ga4_cache | seo_ga4_device_facts | #379, #321 | Profile is specified but extractor/normalizer is not implemented. |
| WATCH | P1 | ga4 | ga4_hostname_locale_28d_v1 | weekly | planned | automatic | growth_ga4_cache | seo_ga4_locale_facts | #379, #314, #315 | Profile is specified but extractor/normalizer is not implemented. |
| WATCH | P2 | ga4 | ga4_internal_search_v1 | weekly | planned | automatic_if_event_exists | growth_ga4_cache | seo_ga4_search_facts | #379, #314 | Profile is specified but extractor/normalizer is not implemented. |
| RUNNABLE | P0 | tracking | tracking_conversion_facts_v1 | continuous | partial | automatic_where_configured | n/a | funnel_events, meta_conversion_events | #322, #330, #332, #333 | Dry-run only; profile-specific execution is listed in next_commands. |
| RUNNABLE | P0 | joint | growth_search_to_activation_v1 | weekly | partial | automatic_after_sources_pass | n/a | growth_inventory | #385, #321 | Dry-run only; profile-specific execution is listed in next_commands. |
| WATCH | P1 | joint | growth_market_fit_v1 | weekly | planned | automatic_after_sources_pass | n/a | growth_inventory | #385, #321 | Profile is specified but extractor/normalizer is not implemented. |
| WATCH | P1 | joint | growth_mobile_seo_cro_v1 | weekly | planned | automatic_after_sources_pass | n/a | growth_inventory | #385, #321 | Profile is specified but extractor/normalizer is not implemented. |
| RUNNABLE | P0 | joint | growth_post_fix_validation_v1 | weekly | partial | automatic_after_sources_pass | n/a | growth_inventory | #385, #312, #313 | Dry-run only; profile-specific execution is listed in next_commands. |
| RUNNABLE | P1 | joint | growth_locale_launch_readiness_v1 | weekly | partial | automatic_after_sources_pass | n/a | growth_inventory | #385, #314, #315, #316 | Dry-run only; profile-specific execution is listed in next_commands. |
| RUNNABLE | P0 | joint | growth_paid_governance_v1 | weekly | partial | automatic_after_sources_pass | n/a | growth_inventory | #385, #322, #332, #333 | Dry-run only; profile-specific execution is listed in next_commands. |

## Next Commands

| Purpose | Command | Approval |
|---|---|---|
| Refresh free first-party caches | `npx tsx scripts/seo/populate-growth-google-cache.ts --apply --force` | automatic |
| Normalize first-party caches into growth_inventory | `node scripts/seo/run-growth-weekly-intake.mjs --apply true --skipGoogleRefresh true` | automatic |
| Generate health and Council enforcement artifacts | `node scripts/seo/growth-cache-health-report.mjs && node scripts/seo/audit-growth-max-matrix-coverage.mjs && node scripts/seo/generate-growth-max-matrix-council-artifact.mjs` | automatic |

## Guardrails

- This command does not call paid providers.
- Paid/heavy DataForSEO profiles stay approval-gated even when listed.
- Council can only promote rows with source row, baseline, owner, success metric and evaluation date.
- Raw provider payloads remain in cache/fact tables; `growth_inventory` receives only decision-grade summaries.
