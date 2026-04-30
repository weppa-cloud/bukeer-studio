# Growth Cache Health Report

Generated: 2026-04-30T18:26:57.826Z
Website: 894545b7-73ca-4dae-b76a-da5b6a3f8441
Status: PASS
Max matrix status: WATCH

## Freshness

| Table | Status | Rows | Latest | Age hours | Expired rows | Error |
|---|---|---:|---|---:|---:|---|
| growth_gsc_cache | PASS | 10 | 2026-04-30T18:22:24.741+00:00 | 0.07 | 0 |  |
| growth_ga4_cache | PASS | 9 | 2026-04-30T18:22:33.172+00:00 | 0.07 | 0 |  |
| growth_dataforseo_cache | PASS | 42 | 2026-04-30T18:23:09.232+00:00 | 0.06 | 0 |  |
| seo_audit_findings | PASS | 3133 | 2026-04-30T15:50:47.628+00:00 | 2.6 | n/a |  |
| seo_audit_results | PASS | 4618 | 2026-04-30 | 18.45 | n/a |  |
| funnel_events | PASS | 24 | 2026-04-30T17:45:01.214+00:00 | 0.7 | n/a |  |
| meta_conversion_events | PASS | 16 | 2026-04-30T17:44:58+00:00 | 0.7 | n/a |  |

## GSC Search Appearance Discovery

| Field | Value |
|---|---|
| Status | PASS |
| Implementation | standalone cache key present |
| Cache key | 2026-04-02|2026-04-29|searchAppearance|*|es|1000 |
| Rows | 2 |
| Note | Standalone GSC searchAppearance discovery is persisted in growth_gsc_cache. |

## Max Performance Profile Health

| Status | Priority | Provider | Profile | Cadence | Implementation | Cache | Owner issues | Blockers / watches |
|---|---|---|---|---|---|---|---|---|
| WATCH | P0 | dataforseo | dfs_onpage_full_comparable_v3 | weekly | implemented | PASS | #312, #313 | Approval gate: required_to_start. |
| WATCH | P1 | dataforseo | dfs_onpage_rendered_sample_v1 | on_approval | partial | PASS | #312, #313 | Approval gate: required_every_run. |
| WATCH | P1 | dataforseo | dfs_serp_priority_keywords_v1 | biweekly | partial | PASS | #381, #321 | Approval gate: profile_approved_keywords_required. |
| WATCH | P1 | dataforseo | dfs_serp_local_pack_v1 | monthly | partial | PASS | #381, #335 | Approval gate: profile_approved_locations_required. |
| WATCH | P1 | dataforseo | dfs_keyword_volume_trends_v1 | monthly | partial | PASS | #380, #314 | Approval gate: profile_approved_seed_set_required. |
| WATCH | P0 | dataforseo | dfs_labs_demand_cluster_v1 | monthly | partial | PASS | #380, #314, #315, #316, #317, #318, #319, #320 | Approval gate: profile_approved_seed_set_required. |
| WATCH | P1 | dataforseo | dfs_labs_competitor_visibility_v1 | monthly | partial | PASS | #380, #381, #334 | Approval gate: profile_approved_competitors_required. |
| WATCH | P1 | dataforseo | dfs_labs_gap_intersections_v1 | monthly | partial | PASS | #380, #334 | Approval gate: profile_approved_competitors_required. |
| WATCH | P1 | dataforseo | dfs_backlinks_authority_v1 | monthly | partial | PASS | #382, #334 | Approval gate: profile_approved_competitors_required. |
| WATCH | P1 | dataforseo | dfs_backlinks_competitor_gap_v1 | monthly | partial | PASS | #382, #334 | Approval gate: profile_approved_competitors_required. |
| WATCH | P1 | dataforseo | dfs_business_local_v1 | monthly | partial | PASS | #383, #335 | Approval gate: profile_approved_locations_required. |
| WATCH | P2 | dataforseo | dfs_reviews_sentiment_v1 | monthly | partial | PASS | #383, #335 | Approval gate: profile_approved_locations_required. |
| WATCH | P1 | dataforseo | dfs_ai_geo_visibility_v1 | monthly | partial | PASS | #384, #321, #334, #335 | Approval gate: required_every_run. |
| WATCH | P2 | dataforseo | dfs_content_brand_sentiment_v1 | monthly | partial | PASS | #384, #321 | Approval gate: profile_approved_topics_required. |
| WATCH | P2 | dataforseo | dfs_domain_competitive_baseline_v1 | quarterly | partial | PASS | #384, #334 | Approval gate: profile_approved_competitors_required. |
| WATCH | P3 | dataforseo | dfs_merchant_watch_v1 | no_default | excluded | PASS | #376 | Approval gate: specific_business_case_required. |
| WATCH | P3 | dataforseo | dfs_app_data_watch_v1 | no_default | excluded | PASS | #376 | Approval gate: specific_business_case_required. |
| WATCH | P0 | gsc | gsc_daily_complete_web_v1 | daily | partial | PASS | #378, #321 | No blocker detected |
| WATCH | P1 | gsc | gsc_daily_complete_image_v1 | weekly | partial | PASS | #378, #314 | No blocker detected |
| PASS | P0 | gsc | gsc_council_28d_query_page_v1 | weekly | implemented | PASS | #378, #311, #321 | No blocker detected |
| PASS | P0 | gsc | gsc_council_28d_page_market_v1 | weekly | implemented | PASS | #378, #311, #321 | No blocker detected |
| PASS | P1 | gsc | gsc_council_28d_page_device_v1 | weekly | implemented | PASS | #378, #311, #321 | No blocker detected |
| WATCH | P1 | gsc | gsc_trend_90d_page_v1 | weekly | partial | PASS | #378, #312, #321 | No blocker detected |
| WATCH | P1 | gsc | gsc_search_appearance_v1 | weekly | partial | PASS | #378, #321 | No blocker detected |
| WATCH | P1 | gsc | gsc_locale_path_v1 | weekly | partial | PASS | #378, #314, #315, #316 | No blocker detected |
| WATCH | P1 | gsc | gsc_brand_nonbrand_v1 | weekly | partial | PASS | #378, #321 | No blocker detected |
| WATCH | P0 | ga4 | ga4_daily_landing_channel_v1 | daily | partial | PASS | #379, #321 | No blocker detected |
| PASS | P0 | ga4 | ga4_council_landing_channel_28d_v1 | weekly | implemented | PASS | #379, #311, #321 | No blocker detected |
| PASS | P0 | ga4 | ga4_page_source_medium_28d_v1 | weekly | implemented | PASS | #379, #321 | No blocker detected |
| PASS | P0 | ga4 | ga4_event_page_28d_v1 | weekly | implemented | PASS | #379, #322, #321 | No blocker detected |
| PASS | P0 | ga4 | ga4_campaign_source_medium_28d_v1 | weekly | implemented | PASS | #379, #322, #332, #333 | No blocker detected |
| WATCH | P1 | ga4 | ga4_geo_landing_28d_v1 | weekly | partial | PASS | #379, #321 | No blocker detected |
| WATCH | P1 | ga4 | ga4_device_landing_28d_v1 | weekly | partial | PASS | #379, #321 | No blocker detected |
| WATCH | P1 | ga4 | ga4_hostname_locale_28d_v1 | weekly | partial | PASS | #379, #314, #315 | No blocker detected |
| WATCH | P2 | ga4 | ga4_internal_search_v1 | weekly | partial | PASS | #379, #314 | No blocker detected |
| WATCH | P2 | ga4 | ga4_file_outbound_engagement_v1 | monthly | partial | PASS | #379, #321 | No blocker detected |
| WATCH | P0 | tracking | tracking_conversion_facts_v1 | continuous | partial | n/a | #322, #330, #332, #333 | No blocker detected |
| WATCH | P0 | joint | growth_search_to_activation_v1 | weekly | partial | n/a | #385, #321 | No blocker detected |
| WATCH | P1 | joint | growth_market_fit_v1 | weekly | partial | n/a | #385, #321 | No blocker detected |
| WATCH | P1 | joint | growth_mobile_seo_cro_v1 | weekly | partial | n/a | #385, #321 | No blocker detected |
| WATCH | P0 | joint | growth_post_fix_validation_v1 | weekly | partial | n/a | #385, #312, #313 | No blocker detected |
| WATCH | P1 | joint | growth_locale_launch_readiness_v1 | weekly | partial | n/a | #385, #314, #315, #316 | No blocker detected |
| WATCH | P0 | joint | growth_paid_governance_v1 | weekly | partial | n/a | #385, #322, #332, #333 | No blocker detected |
| WATCH | P1 | joint | growth_authority_content_fit_v1 | monthly | partial | n/a | #385, #334, #314 | No blocker detected |
| WATCH | P1 | joint | growth_ai_geo_conversion_fit_v1 | monthly | partial | n/a | #385, #384, #321 | No blocker detected |
