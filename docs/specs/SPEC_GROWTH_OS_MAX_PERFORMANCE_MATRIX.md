# SPEC: Growth OS Max Performance Matrix

Status: Draft for EPIC #310 / SPEC #337  
Tenant: ColombiaTours (`colombiatours.travel`)  
Website id: `894545b7-73ca-4dae-b76a-da5b6a3f8441`  
Created: 2026-04-30  
Owner: Growth OS A5 + A1/A3/A4  
Canonical execution: [#310](https://github.com/weppa-cloud/bukeer-studio/issues/310)  
Related SPEC: [#337](https://github.com/weppa-cloud/bukeer-studio/issues/337)

## Purpose

Define the maximum-performance data matrix for Growth OS. The goal is not to
pull every available field from every provider, but to extract the highest-value
signals from DataForSEO, Google Search Console, GA4 and tracking, normalize
them into comparable facts, and generate a decision-grade backlog in
`growth_inventory` and Growth Council.

Operating rule:

```text
provider raw/cache
  -> normalized facts
  -> derived joint facts
  -> growth_inventory
  -> Growth Council
  -> experiments / remediation / content / authority / CRO / local / AI-GEO
```

## Non-Goals

- Do not store raw provider JSON in `growth_inventory`.
- Do not launch costly crawls, rendered profiles or AI/LLM batches without an
  explicit approved profile and budget/cost note.
- Do not treat GA4 key events as CRM truth without joining `funnel_events`.
- Do not approve Council experiments from WATCH rows lacking baseline, owner,
  success metric and evaluation date.
- Do not mix technical remediation backlog with the five active measurable
  Council experiments.

## Provider Coverage Matrix

| Source     | Feature/API                         | Profile                              | Primary question                                                     | Raw/cache                                 | Normalized facts                                                 | Backlog output                                       | Cadence                   | Priority |
| ---------- | ----------------------------------- | ------------------------------------ | -------------------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------- | ------------------------- | -------- |
| DataForSEO | OnPage full crawl                   | `dfs_onpage_full_comparable_v3`      | Is the site technically indexable and improving?                     | `growth_dataforseo_cache`                 | `seo_audit_results`, `seo_audit_findings`                        | #313 technical remediation, technical inventory rows | Weekly while WATCH        | P0       |
| DataForSEO | OnPage rendered sample              | `dfs_onpage_rendered_sample_v1`      | Are JS/render/performance issues real on priority URLs?              | `growth_dataforseo_cache`                 | `seo_audit_results`, `seo_audit_findings` with rendered evidence | Performance/render WATCH or fix rows                 | On approval               | P1       |
| DataForSEO | SERP Advanced                       | `dfs_serp_priority_keywords_v1`      | What does the live SERP require by market/device?                    | `growth_dataforseo_cache`                 | `seo_serp_snapshots`, `seo_serp_features`                        | CTR/snippet, SERP feature, competitor rows           | Biweekly/monthly          | P1       |
| DataForSEO | Google Maps / Local Finder SERP     | `dfs_serp_local_pack_v1`             | Are local/map-pack competitors visible for agency/destination terms? | `growth_dataforseo_cache`                 | `seo_local_serp_facts`                                           | Local SEO rows                                       | Monthly                   | P1       |
| DataForSEO | Keyword Data                        | `dfs_keyword_volume_trends_v1`       | What is the volume/CPC/trend baseline for target terms?              | `growth_dataforseo_cache`                 | `seo_keyword_opportunities`                                      | Demand and paid-readiness rows                       | Monthly                   | P1       |
| DataForSEO | Labs keyword research               | `dfs_labs_demand_cluster_v1`         | Which clusters and relevant pages should we build or improve?        | `growth_dataforseo_cache`                 | `seo_keyword_opportunities`, `seo_topic_clusters`                | #314-#320 content backlog                            | Monthly                   | P0       |
| DataForSEO | Labs competitor intelligence        | `dfs_labs_competitor_visibility_v1`  | Which competitors own our search demand?                             | `growth_dataforseo_cache`                 | `seo_competitor_visibility`                                      | Competitor, SERP, authority rows                     | Monthly                   | P1       |
| DataForSEO | Labs intersections                  | `dfs_labs_gap_intersections_v1`      | Which keywords/pages do competitors own and we miss?                 | `growth_dataforseo_cache`                 | `seo_keyword_gap_facts`                                          | Content/authority gap rows                           | Monthly                   | P1       |
| DataForSEO | Backlinks                           | `dfs_backlinks_authority_v1`         | What authority gaps block rankings?                                  | `growth_dataforseo_cache`                 | `seo_backlink_facts`                                             | #334 authority / PR rows                             | Monthly                   | P1       |
| DataForSEO | Backlinks competitors/intersections | `dfs_backlinks_competitor_gap_v1`    | Which domains link to competitors but not us?                        | `growth_dataforseo_cache`                 | `seo_backlink_gap_facts`                                         | Outreach / PR backlog                                | Monthly/quarterly         | P1       |
| DataForSEO | Business Data / Google              | `dfs_business_local_v1`              | What is local reputation and listing health?                         | `growth_dataforseo_cache`                 | `seo_local_reputation_facts`                                     | #335 local SEO rows                                  | Monthly                   | P1       |
| DataForSEO | Reviews                             | `dfs_reviews_sentiment_v1`           | What review themes affect conversion/trust?                          | `growth_dataforseo_cache`                 | `seo_review_facts`                                               | Trust/reputation rows                                | Monthly                   | P2       |
| DataForSEO | AI Optimization                     | `dfs_ai_geo_visibility_v1`           | Are we cited/mentioned by LLM/AI search surfaces?                    | `growth_dataforseo_cache`                 | `seo_ai_visibility_runs`, `seo_ai_visibility_facts`              | AI/GEO inventory rows                                | Monthly pilot             | P1       |
| DataForSEO | Content Analysis                    | `dfs_content_brand_sentiment_v1`     | What are brand/topic mentions and sentiment outside our site?        | `growth_dataforseo_cache`                 | `seo_content_sentiment_facts`                                    | PR, brand, content rows                              | Monthly                   | P2       |
| DataForSEO | Domain Analytics                    | `dfs_domain_competitive_baseline_v1` | What is competitor domain age, tech stack and domain-level context?  | `growth_dataforseo_cache`                 | `seo_domain_competitive_facts`                                   | Competitive benchmark rows                           | Monthly/quarterly         | P2       |
| DataForSEO | Merchant                            | `dfs_merchant_watch_v1`              | Does shopping/product data matter?                                   | `growth_dataforseo_cache`                 | none by default                                                  | Usually excluded                                     | No default run            | P3       |
| DataForSEO | App Data                            | `dfs_app_data_watch_v1`              | Does app-store visibility matter?                                    | `growth_dataforseo_cache`                 | none by default                                                  | Usually excluded                                     | No default run            | P3       |
| GSC        | Daily complete web export           | `gsc_daily_complete_web_v1`          | What is the durable actual Google Search history?                    | `growth_gsc_cache`                        | `seo_gsc_daily_facts`                                            | Trend/decay rows                                     | Daily completed day       | P0       |
| GSC        | Council query/page                  | `gsc_council_28d_query_page_v1`      | Which queries/pages need CTR/content action?                         | `growth_gsc_cache`                        | `seo_gsc_query_page_facts`                                       | Demand/CTR rows                                      | Weekly                    | P0       |
| GSC        | Market/device/search appearance     | `gsc_market_device_appearance_v1`    | Which markets/devices/rich surfaces matter?                          | `growth_gsc_cache`                        | `seo_gsc_segment_facts`                                          | Market/mobile/rich result rows                       | Weekly                    | P1       |
| GA4        | Landing/channel                     | `ga4_landing_channel_v1`             | Which landings and channels activate?                                | `growth_ga4_cache`                        | `seo_ga4_landing_facts`                                          | CRO/acquisition rows                                 | Daily + weekly            | P0       |
| GA4        | Source/medium/campaign              | `ga4_source_campaign_v1`             | Is traffic attributed and campaign-ready?                            | `growth_ga4_cache`                        | `seo_ga4_campaign_facts`                                         | Paid governance rows                                 | Weekly                    | P0       |
| GA4        | Event/page/key events               | `ga4_event_page_v1`                  | Where do events fail to become leads?                                | `growth_ga4_cache`                        | `seo_ga4_event_facts`                                            | Activation/drop-off rows                             | Weekly                    | P0       |
| Tracking   | Funnel + Meta CAPI                  | `tracking_conversion_facts_v1`       | Are leads/quotes/bookings traceable?                                 | `funnel_events`, `meta_conversion_events` | `funnel_events`, `meta_conversion_events`                        | Attribution rows                                     | Continuous + weekly smoke | P0       |

## DataForSEO Feature Access Gate

DataForSEO profiles have two separate states:

1. **Implementation status**: whether Growth OS has a profile, extractor,
   cache target, facts target and normalizer path.
2. **Provider access status**: whether the current DataForSEO account can call
   the underlying API family.

The orchestrator must evaluate provider access before any paid call. A profile
can be well specified and still be `BLOCKED` if the account subscription does
not include that API. Current account evidence:

| Feature/API                    | Access status             | Evidence                                                                                | Growth OS action                                                                             |
| ------------------------------ | ------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| OnPage                         | `enabled_confirmed`       | Full and post-fix crawls have completed and normalized.                                 | Runnable under crawl approval rules.                                                         |
| SERP                           | `enabled_confirmed`       | 2026-04-30 max-performance smoke completed organic and maps SERP calls.                 | Runnable for approved keyword/location sets.                                                 |
| Keyword Data / Labs            | `enabled_confirmed`       | Labs demand, competitors and intersections completed in smoke runs.                     | Runnable monthly for demand/content backlog.                                                 |
| Business Data                  | `partial_confirmed`       | Endpoint reachable; latest smoke returned `No Search Results`, not subscription denial. | Use query/place/CID refinement before marking blocked.                                       |
| Reviews                        | `watch_needs_smoke`       | Requires verified Google CID/place identifier.                                          | Do not schedule until CID is known.                                                          |
| Backlinks                      | `blocked_no_subscription` | Provider returned `40204 Access denied` for `/v3/backlinks/*`.                          | Block #334 authority facts from Backlinks; use Labs/Domain Analytics fallback until enabled. |
| AI Optimization Google AI Mode | `enabled_confirmed`       | 2026-04-29 AI visibility pilot produced raw cache and 213 facts.                        | Runnable as AI/GEO pilot under approval rules.                                               |
| AI Optimization LLM Mentions   | `blocked_no_subscription` | Provider returned `40204 Access denied` for `/v3/ai_optimization/llm_mentions/*`.       | Skip LLM Mentions endpoints; keep AI/GEO as `PASS-WITH-WATCH` with Google AI Mode only.      |
| Content Analysis               | `enabled_confirmed`       | 2026-04-30 smoke completed Content Analysis summary/search.                             | Runnable monthly for PR/brand/content signals.                                               |
| Domain Analytics               | `enabled_confirmed`       | 2026-04-30 smoke completed Whois/Technologies.                                          | Runnable monthly/quarterly for competitive baseline.                                         |
| Merchant / App Data            | `excluded_by_scope`       | Not relevant to the current travel-agency Growth OS objective.                          | Do not run by default.                                                                       |

Canonical runtime source:
`scripts/seo/dataforseo-feature-access.mjs`. If the DataForSEO plan changes,
update that file first, then rerun the orchestrator and coverage audit.

## DataForSEO Feature Profiles

### `dfs_onpage_full_comparable_v3`

Use for full technical crawl comparability.

| Parameter         | Value                                     |
| ----------------- | ----------------------------------------- |
| Target            | `https://colombiatours.travel/`           |
| Max pages         | `1000` unless approved otherwise          |
| Sitemap           | `respect_sitemap=true`                    |
| Resources         | `load_resources=true`                     |
| JavaScript        | `enable_javascript=true`                  |
| Browser rendering | false by default                          |
| Run tag           | `epic310-onpage-full-v3-YYYYMMDD`         |
| Normalizes to     | `seo_audit_results`, `seo_audit_findings` |
| Inventory rule    | P0/P1/WATCH only                          |

Backlog generated:

- P0: status/soft-404, accidental noindex, broken canonical, crawl-blocking
  robots.
- P1: canonical, metadata/H1, internal linking, media, schema, performance.
- WATCH: provider transients, low-impact metadata, profile-specific noise.

### `dfs_onpage_rendered_sample_v1`

Use only after approval for 25-50 priority URLs. It enriches, not replaces, the
full crawl. Use for Panaca-like performance/render questions, JS-dependent
content, critical packages and top GSC/GA4 landings.

### `dfs_labs_demand_cluster_v1`

Endpoints:

- Keywords For Site
- Keyword Suggestions
- Related Keywords
- Keyword Ideas
- Ranked Keywords
- Relevant Pages
- Competitors Domain
- Domain Intersection
- Page Intersection
- Domain Rank Overview
- Historical Rank Overview when evaluating a strategic domain shift

Normalize:

| Fact                                            | Backlog action                                       |
| ----------------------------------------------- | ---------------------------------------------------- |
| High-volume relevant keyword without owned page | Create content/landing backlog.                      |
| Owned page ranks but CTR/position weak          | Optimize title/meta/content/authority.               |
| Competitor owns cluster                         | SERP/competitor analysis row.                        |
| Page intersection gap                           | Build/merge/redirect page or improve internal links. |
| Historical decline                              | Recovery row with GSC/GA4 validation.                |

### `dfs_serp_priority_keywords_v1`

Use Google Organic Advanced SERP for 20-100 approved priority keywords by
market/device. Enable costly parameters only for selected samples:

- `calculate_rectangles`: only for above-the-fold/pixel-rank analysis.
- `load_async_ai_overview`: only for AI Overview sample keywords.
- HTML output: only for diagnostics, not scheduled.

Normalize:

- competitor ranking domains;
- SERP features present;
- owned URL rank;
- snippet/title mismatch;
- local pack / PAA / images / videos;
- AI Overview or Google AI Mode presence where available.

### `dfs_backlinks_authority_v1`

Endpoints:

- Summary
- History
- Referring Domains
- Anchors
- Domain Pages
- New & Lost Timeseries
- Competitors
- Domain Intersection / Page Intersection

Normalize:

- referring domains;
- backlinks;
- domain rank;
- spam score when available;
- anchors;
- linked pages;
- new/lost links;
- competitor link gaps.

Backlog generated:

- authority gap rows;
- digital PR targets;
- reclaim lost links;
- improve pages that receive links but do not convert.

### `dfs_business_local_v1`

Endpoints:

- Google My Business Info
- Google Reviews
- Google Business Listings
- Google Maps / Local Finder SERP from SERP API where needed

Normalize:

- NAP consistency;
- category;
- rating;
- review count;
- review themes;
- owner responses;
- local competitor ratings;
- map-pack visibility.

Backlog generated:

- local SEO listing fixes;
- review/reputation actions;
- trust-content updates;
- local landing improvements.

### `dfs_ai_geo_visibility_v1`

Endpoints:

- LLM Mentions;
- LLM Responses;
- LLM Scraper;
- AI Keyword Data;
- Google AI Mode SERP sample.

Normalize:

- prompt;
- market/locale;
- AI search volume;
- ColombiaTours mention/citation;
- cited owned URL;
- cited competitor/source domains;
- sentiment/recommendation position;
- connected GA4/funnel baseline if owned URL is cited.

Inventory rows use `channel='ai_search'`.

### `dfs_content_brand_sentiment_v1`

Use Content Analysis for brand/topic citations, sentiment, phrase trends and
category trends. This is a PR/brand input, not a technical SEO signal.

### `dfs_domain_competitive_baseline_v1`

Use Domain Analytics Whois and Technologies for a curated competitor set.

Normalize:

- domain;
- whois age/status;
- estimated organic/paid traffic when available;
- backlink-enriched metrics;
- detected technologies;
- CMS/framework;
- analytics/tracking/chat stack;
- CDN/hosting signals.

Backlog generated only when the signal changes a decision, for example:
competitors use a conversion widget we do not measure, or authority/traffic
context changes content/PR priority.

## GSC Profiles

| Profile                          | Dimensions / filters                                    | Cadence                    | Normalization              | Backlog generated               |
| -------------------------------- | ------------------------------------------------------- | -------------------------- | -------------------------- | ------------------------------- |
| `gsc_daily_complete_web_v1`      | `date,page,query,country,device`, `type=web`, paginated | Daily completed day        | `seo_gsc_daily_facts`      | Trend, decay, recovery          |
| `gsc_daily_complete_image_v1`    | `date,page,query,country,device`, `type=image`          | Daily or weekly            | `seo_gsc_image_facts`      | Image/destination opportunities |
| `gsc_council_28d_query_page_v1`  | `query,page`                                            | Weekly                     | `seo_gsc_query_page_facts` | CTR, intent, cannibalization    |
| `gsc_council_28d_page_market_v1` | `page,country`                                          | Weekly                     | `seo_gsc_market_facts`     | CO/MX/US priority               |
| `gsc_council_28d_page_device_v1` | `page,device`                                           | Weekly                     | `seo_gsc_device_facts`     | Mobile SEO/CRO rows             |
| `gsc_trend_90d_page_v1`          | `date,page`                                             | Weekly                     | `seo_gsc_trend_facts`      | Post-fix validation             |
| `gsc_search_appearance_v1`       | first `searchAppearance`, then filtered detail          | Weekly                     | `seo_gsc_appearance_facts` | Rich-result rows                |
| `gsc_locale_path_v1`             | page/query/country filtered by locale path              | Weekly during locale scale | `seo_gsc_locale_facts`     | EN/MX launch readiness          |
| `gsc_brand_nonbrand_v1`          | query/page + classifier                                 | Weekly                     | `seo_gsc_brand_facts`      | Brand vs non-brand health       |

GSC guardrails:

- Daily complete exports must paginate until empty.
- Use completed dates for Council baselines.
- Fresh `dataState=all` reads are WATCH only.
- Search appearance is two-step.
- Page/query detail may drop some data; keep aggregate facts separate.

## GA4 Profiles

| Profile                              | Dimensions                                                   | Metrics                                                     | Cadence                              | Normalization                 | Backlog generated        |
| ------------------------------------ | ------------------------------------------------------------ | ----------------------------------------------------------- | ------------------------------------ | ----------------------------- | ------------------------ |
| `ga4_daily_landing_channel_v1`       | `date,landingPagePlusQueryString,sessionDefaultChannelGroup` | sessions, users, views, engagement, key events, conversions | Daily                                | `seo_ga4_landing_daily_facts` | Trend / channel quality  |
| `ga4_council_landing_channel_28d_v1` | `landingPagePlusQueryString,sessionDefaultChannelGroup`      | sessions, users, engagement, bounce, duration               | Weekly                               | `seo_ga4_landing_facts`       | CRO/acquisition rows     |
| `ga4_page_source_medium_28d_v1`      | `pagePath,sessionSourceMedium`                               | sessions, users, views, engagement, key events              | Weekly                               | `seo_ga4_source_facts`        | Source/medium leakage    |
| `ga4_event_page_28d_v1`              | `eventName,pagePath`                                         | event count, key events, conversions                        | Weekly                               | `seo_ga4_event_facts`         | Activation drop-off      |
| `ga4_campaign_source_medium_28d_v1`  | campaign, source, medium                                     | sessions, users, key events, conversions                    | Weekly before spend                  | `seo_ga4_campaign_facts`      | Paid governance          |
| `ga4_geo_landing_28d_v1`             | country, city, landing                                       | sessions, users, engagement, key events                     | Weekly for priority markets          | `seo_ga4_geo_facts`           | Market conversion gaps   |
| `ga4_device_landing_28d_v1`          | device category, landing                                     | sessions, engagement, bounce, duration, key events          | Weekly                               | `seo_ga4_device_facts`        | Mobile CRO/performance   |
| `ga4_hostname_locale_28d_v1`         | hostname, landing, channel                                   | sessions, users, engagement, key events                     | Weekly during migration/locale scale | `seo_ga4_locale_facts`        | Locale measurement gaps  |
| `ga4_internal_search_v1`             | search term, page path or search event                       | event count, users                                          | Weekly if active                     | `seo_ga4_search_facts`        | On-site demand           |
| `ga4_file_outbound_engagement_v1`    | event, page path                                             | event count, users                                          | Monthly                              | `seo_ga4_engagement_facts`    | PDF/outbound/scroll rows |
| `ga4_realtime_smoke_v1`              | active page/event                                            | active users/events                                         | Deploy smoke only                    | no durable Council fact       | Deploy verification      |

GA4 guardrails:

- Validate metric/dimension compatibility via metadata or smoke.
- Keep session, event and item scopes separate.
- Use `funnel_events` as conversion truth for WAFlow/CRM.
- Treat `(not set)` as data quality.
- Do not sum `totalUsers` across dimensions as unique people.
- Canonicalize landing/page paths before joining with GSC/DataForSEO.

## Joint Profiles

| Profile                             | Sources                                                | Cadence             | Output                      | Council decision                                   |
| ----------------------------------- | ------------------------------------------------------ | ------------------- | --------------------------- | -------------------------------------------------- |
| `growth_search_to_activation_v1`    | GSC query/page + GA4 landing/channel + `funnel_events` | Weekly              | `growth_inventory` CRO rows | Optimize pages with demand but no activation.      |
| `growth_market_fit_v1`              | GSC country + GA4 geo + conversion facts               | Weekly              | market rows                 | Prioritize CO/MX/US pages and campaigns.           |
| `growth_mobile_seo_cro_v1`          | GSC device + GA4 device + technical performance        | Weekly              | mobile rows                 | Fix mobile SEO/CRO/performance.                    |
| `growth_post_fix_validation_v1`     | DataForSEO diff + GSC trend + GA4 trend                | Weekly after fixes  | validation rows             | Confirm remediation impact.                        |
| `growth_locale_launch_readiness_v1` | GSC locale + GA4 hostname/landing + EN quality         | Weekly during EN/MX | locale readiness rows       | Approve/hide/localize pages.                       |
| `growth_paid_governance_v1`         | GA4 campaign + `funnel_events` + Meta CAPI             | Weekly before spend | paid governance rows        | Approve, watch or block paid scale.                |
| `growth_authority_content_fit_v1`   | Labs demand + Backlinks + GSC                          | Monthly             | content/authority rows      | Decide content vs PR vs internal link action.      |
| `growth_ai_geo_conversion_fit_v1`   | AI/GEO facts + GA4/funnel                              | Monthly             | AI search rows              | Improve AI citations only where pages can convert. |

## Normalization Contract

### Required metadata on every raw/cache row

- `provider`
- `profile`
- `run_id` or provider task id
- `website_id`
- `account_id`
- `started_at`
- `finished_at`
- `window_start`
- `window_end`
- `status`
- `cost_usd` when paid
- `payload_hash`
- `source_endpoint`

### Required metadata on every fact row

- source provider/profile/run id;
- canonical URL or entity key;
- market/locale/device when applicable;
- metric baseline;
- severity or opportunity class;
- evidence payload pointer;
- freshness timestamp;
- confidence status: `pass`, `watch`, `blocked`.

### Required metadata on every `growth_inventory` row

- `source_provider`
- `source_profile`
- `source_run_id`
- `source_fact_id` or cache key
- `cluster`
- `channel`
- `market`
- `locale`
- `baseline`
- `priority_score`
- `owner_issue`
- `next_action`
- `status`: `idea`, `queued`, `blocked`, `watch`, `active`, `resolved`
- `evaluation_date` when promoted to experiment

## Priority Scoring

| Component      | Weight | Examples                                                      |
| -------------- | -----: | ------------------------------------------------------------- |
| Demand         |     25 | GSC impressions, Labs volume, AI demand, SERP market size.    |
| Visibility gap |     20 | low CTR, poor rank, missing SERP feature, competitor gap.     |
| Engagement gap |     15 | GA4 engagement/bounce/duration weakness.                      |
| Conversion gap |     20 | no CTA/WAFlow/lead/booking despite traffic.                   |
| Technical risk |     10 | P0/P1 crawl finding, noindex/canonical/media/performance.     |
| Strategic fit  |      5 | CO/MX/US/EN priority, commercial intent, Council OKR.         |
| Confidence     |      5 | fresh data, comparable runs, no provider/attribution blocker. |

Promotion thresholds:

- `>=75`: `queued` for backlog review.
- `60-74`: `idea` or `watch` depending on confidence.
- `<60`: keep in facts only unless manually escalated.
- Any row with missing source/baseline/owner remains out of active Council
  experiments.

## Backlog Generation Rules

| Backlog               | Inputs                                          | Owner issue    | Promotion rule                                                                  |
| --------------------- | ----------------------------------------------- | -------------- | ------------------------------------------------------------------------------- |
| Technical remediation | OnPage facts + GSC/GA4 traffic                  | #313           | P0/P1 valid finding or traffic-bearing WATCH persistent in 2 runs.              |
| Content/cluster       | Labs + GSC + SERP                               | #314-#320      | Demand exists and owned page missing/weak/mismatched.                           |
| EN/MX locale          | GSC locale + GA4 hostname + translation quality | #314/#315/#316 | Locale page has demand or strategic priority and passes quality gate.           |
| CRO/activation        | GA4 + funnel events                             | #322/#321      | Sessions/events exist but activation or qualified lead is low/zero.             |
| Paid governance       | GA4 campaign + Meta CAPI + funnel               | #322/#332/#333 | Paid traffic exists but attribution chain is incomplete or scalable.            |
| Authority             | Backlinks + Labs + SERP competitors             | #334           | Competitor/authority gap blocks priority cluster.                               |
| Local SEO             | Business Data + SERP local + GA4 geo            | #335           | Local visibility/reputation gap affects commercial market.                      |
| AI/GEO                | AI Optimization + SERP AI + GA4/funnel          | #321/#334/#335 | AI mentions/citations are missing or competitor-dominated for priority prompts. |

## Cadence

| Cadence               | Runs                                                                                                             |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Daily automatic       | `gsc_daily_complete_web_v1`, `ga4_daily_landing_channel_v1`, cache health, tracking freshness.                   |
| Weekly before Council | GSC 28d profiles, GA4 28d profiles, joint profiles, DataForSEO OnPage if #313 is WATCH, stale inventory cleanup. |
| Biweekly              | SERP priority keywords for active content/CTR experiments.                                                       |
| Monthly               | Labs demand/competitor, Backlinks, Business Data/local, AI/GEO, Content Analysis.                                |
| Quarterly             | Domain Analytics competitive baseline, broader competitor refresh.                                               |
| On approval           | Rendered crawl, SERP paid parameters, AI/LLM response batches, full recrawl beyond normal cap.                   |

## Acceptance Criteria

- Every scheduled provider run writes raw/cache plus `seo_provider_usage` or an
  explicit no-cost/no-usage note.
- Every normalizer has dry-run and apply modes.
- Every normalizer reports created/updated/skipped/error counts.
- `growth_inventory` rows must include source profile, run id, baseline,
  priority score, owner issue and next action.
- Council artifact can render:
  - top technical remediation rows;
  - top content/demand rows;
  - top CRO/conversion rows;
  - top authority/local/AI rows;
  - rejected rows with reason.
- Data health can declare each profile `PASS`, `WATCH` or `BLOCKED`.
- No active experiment is approved without source row, baseline, owner, success
  metric and evaluation date.

## Implementation Backlog

1. **Coverage audit command**
   - Compare provider features vs current scripts/cache/facts/inventory/Council.
   - Output matrix: available, extracted, persisted, normalized, used.

2. **Fact schema decision**
   - Decide whether to add dedicated fact tables or temporarily store normalized
     summaries in existing cache metadata.
   - Shared schema migrations must be traced through `bukeer-flutter`.

3. **GSC/GA4 expanded profiles**
   - Extend `populate-growth-google-cache.ts`.
   - Add compatibility smoke for GA4 dimensions/metrics.
   - Add daily completed-day mode.

4. **DataForSEO coverage profiles**
   - Add profile registry for OnPage, Labs, SERP, Backlinks, Business, AI,
     Content Analysis and Domain Analytics.
   - Add budget/approval gates per profile.

5. **Normalizers**
   - Implement separate normalizers by source/fact type.
   - Implement joint normalizers that merge GSC + GA4 + DataForSEO + tracking.

6. **Backlog generator**
   - Convert scored inventory rows into Council-ready backlog artifacts.
   - Keep max five active experiments; remediation backlog can be larger.

7. **Health and freshness**
   - Validate TTL, last success, cost, row counts, source coverage and blockers.

8. **GitHub SSOT sync**
   - Publish status to #310/#311/#321 and child issues with evidence links.

## Test Plan

- Unit-test profile registry validation.
- Run dry-run for every normalizer using latest cached payloads.
- Run one controlled apply for GSC/GA4 expanded profiles.
- Validate `growth_inventory` contains rows for:
  - high impressions / low CTR;
  - market opportunity;
  - mobile weakness;
  - landing low activation;
  - paid continuity gap;
  - technical issue with traffic;
  - authority gap;
  - local reputation gap;
  - AI/GEO visibility gap.
- Verify Council rejects rows missing baseline/owner/metric/date.
- Verify provider cost rows are present for paid DataForSEO calls.

## Official References

- DataForSEO APIs: https://dataforseo.com/apis
- DataForSEO OnPage API: https://docs.dataforseo.com/v3/on_page-overview/
- DataForSEO SERP Google Overview: https://docs.dataforseo.com/v3/serp-google-overview/
- DataForSEO Labs Google Overview: https://docs.dataforseo.com/v3/dataforseo_labs-google-overview/
- DataForSEO Backlinks Overview: https://docs.dataforseo.com/v3/backlinks-overview/
- DataForSEO Business Data Overview: https://docs.dataforseo.com/v3/business_data-overview/
- DataForSEO AI Optimization Overview: https://docs.dataforseo.com/v3/ai_optimization-overview/
- DataForSEO Content Analysis Overview: https://docs.dataforseo.com/v3/content_analysis-overview/
- DataForSEO Domain Analytics Overview: https://docs.dataforseo.com/v3/domain_analytics-overview/
- Google Search Console Search Analytics Query: https://developers.google.com/webmaster-tools/v1/searchanalytics/query
- Google Search Console all-data guide: https://developers.google.com/webmaster-tools/v1/how-tos/all-your-data
- GA4 Data API overview: https://developers.google.com/analytics/devguides/reporting/data/v1
- GA4 API dimensions and metrics: https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema
