# Growth Provider Profiles

Status: operational profile for Epic #310 / Spec #337  
Tenant: ColombiaTours (`colombiatours.travel`)  
Website id: `894545b7-73ca-4dae-b76a-da5b6a3f8441`  
Last updated: 2026-04-30

## Purpose

Define repeatable extraction profiles for the Growth OS Max Performance provider
layer:

`provider raw -> provider cache -> normalized facts -> joint facts -> growth_inventory -> Council`

These profiles prevent ad-hoc pulls. Every run must have a profile name, time
window or task id, raw/cache target, normalized target, and Council use.

## Storage Contract

| Provider                   | Raw/cache table            | Normalized facts                                                | Executive use                                       |
| -------------------------- | -------------------------- | --------------------------------------------------------------- | --------------------------------------------------- |
| DataForSEO                 | `growth_dataforseo_cache`  | `seo_audit_results`, `seo_audit_findings`                       | `growth_inventory` technical/opportunity rows       |
| DataForSEO AI Optimization | `growth_dataforseo_cache`  | `seo_ai_visibility_runs`, `seo_ai_visibility_facts`             | `growth_inventory` AI Search / GEO visibility rows  |
| Search Console             | `growth_gsc_cache`         | future GSC URL/query facts or summarized inventory fields       | demand, market, device, CTR, position               |
| GA4                        | `growth_ga4_cache`         | future GA4 landing/event facts or summarized inventory fields   | acquisition quality, engagement, events, conversion |
| Tracking                   | n/a or event provider logs | `funnel_events`, `meta_conversion_events`                       | activation/conversion status                        |
| Translation quality        | n/a                        | `seo_translation_quality_checks`, `seo_translation_qa_findings` | `growth_inventory` content/localization rows        |

`growth_inventory` must not store provider raw JSON. It stores only
decision-grade summaries with source, window, fallback and owner issue.

## Profile Frequency And Approval Matrix

| Provider / profile                          | Frequency                                                    | Approval mode                                                             | Paid-call risk | Normalized output                                                | Council output                                        |
| ------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------- | ----------------------------------------------------- |
| `dfs_onpage_full_v2`                        | Weekly while #312/#313 are blocked/watch.                    | Approval required for every new crawl unless issue authorizes recurrence. | High           | `seo_audit_results`, `seo_audit_findings`, usage rows.           | Technical P0/P1 candidate/watch/block rows.           |
| `dfs_onpage_rendered_sample_v1`             | On demand for priority URLs.                                 | Approval required per sample scope.                                       | Medium         | Render/performance evidence and resource findings.               | Performance WATCH/candidate rows.                     |
| `dfs_content_scale_labs_serp_v1`            | Monthly or Council-approved sprint batch for target markets. | Approval required per market/profile set.                                 | Medium         | Keyword opportunity, SERP snapshot and competitor facts.         | Content backlog and selected brief candidates.        |
| `gsc_daily_complete_web_v1`                 | Daily, one completed day, paginated.                         | Automatic after profile approval.                                         | None           | Durable GSC fact base or cache-backed summaries.                 | WATCH only unless rolled into weekly baseline.        |
| `gsc_growth_minimum_v1` / Council 28d pulls | Weekly before Council.                                       | Automatic.                                                                | None           | GSC opportunity facts/summaries.                                 | Search demand, CTR, market, device candidates.        |
| `gsc_search_appearance_v1`                  | Weekly discovery; filtered detail if supported.              | Automatic discovery; detail filters automatic after profile succeeds.     | None           | Rich-result/search appearance facts.                             | Structured-data/rich-result WATCH/candidates.         |
| `ga4_daily_landing_channel_v1`              | Daily completed day.                                         | Automatic.                                                                | None           | Landing/channel trend facts or cache-backed summaries.           | WATCH only unless rolled into weekly baseline.        |
| `ga4_growth_minimum_v1` / Council 28d pulls | Weekly before Council.                                       | Automatic.                                                                | None           | GA4 behavior, event and campaign facts/summaries.                | CRO, activation, attribution and paid-readiness rows. |
| Tracking facts                              | Continuous where configured; daily freshness; weekly smoke.  | Automatic after integration approval.                                     | None/read-only | `funnel_events`, `meta_conversion_events`, lifecycle facts.      | Conversion-truth health, paid/CRO WATCH/BLOCKED/PASS. |
| `geo_ai_visibility_v1`                      | Monthly baseline; weekly only for active experiments.        | Approval required for pilot/full run and prompt set.                      | High           | `seo_ai_visibility_runs`, `seo_ai_visibility_facts`.             | `channel = 'ai_search'` WATCH/candidate rows.         |
| Translation quality gate                    | Before localized content scale; weekly during locale push.   | Automatic scoring; publish/scale approval remains human.                  | None           | `seo_translation_quality_checks`, `seo_translation_qa_findings`. | Content/localization PASS/WATCH/BLOCKED rows.         |
| Joint normalizers                           | Weekly after provider facts; daily only for health/watch.    | Automatic; no provider calls.                                             | None           | Derived joint facts from cached/fact tables.                     | Ranked Council candidates and blockers.               |

Paid-call approval details and freshness rules live in
[Growth Data Automation Cadence](./growth-data-automation-cadence.md). The
short rule: read-only GSC/GA4/tracking refreshes may run on schedule; expensive
DataForSEO, AI/GEO, broad SERP, rendered crawl and paid-platform mutation work
requires explicit owner approval before the provider call starts.

## DataForSEO Feature Access States

Do not infer access from the existence of a profile. DataForSEO access is
tracked separately in `scripts/seo/dataforseo-feature-access.mjs` and enforced
by the Max Matrix orchestrator and DataForSEO runners.

| API family                      | Current state             | Operational rule                                                                                  |
| ------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------- |
| OnPage                          | `enabled_confirmed`       | Run only under approved crawl profiles; follow-up/persist/normalize existing tasks automatically. |
| SERP                            | `enabled_confirmed`       | Run only for approved keyword/location sets.                                                      |
| Keyword Data / DataForSEO Labs  | `enabled_confirmed`       | Run monthly for demand, clusters, competitor visibility and intersections.                        |
| Business Data                   | `partial_confirmed`       | Retry with refined place/query/CID before marking blocked.                                        |
| Reviews                         | `watch_needs_smoke`       | Needs verified Google CID/place identifier before paid calls.                                     |
| Backlinks                       | `blocked_no_subscription` | Do not call `/v3/backlinks/*`; use Labs + Domain Analytics fallback until access is enabled.      |
| AI Optimization: Google AI Mode | `enabled_confirmed`       | Can run as AI/GEO pilot with prompt-set approval.                                                 |
| AI Optimization: LLM Mentions   | `blocked_no_subscription` | Do not call `/v3/ai_optimization/llm_mentions/*`; keep AI/GEO as WATCH for mentions coverage.     |
| Content Analysis                | `enabled_confirmed`       | Run as P2 brand/topic sentiment input.                                                            |
| Domain Analytics                | `enabled_confirmed`       | Run as P2 competitive baseline input.                                                             |
| Merchant / App Data             | `excluded_by_scope`       | No default run for ColombiaTours Growth OS.                                                       |

When a subscription changes in DataForSEO, update the access registry, run:

```bash
node scripts/seo/dataforseo-feature-access.mjs
node scripts/seo/run-growth-max-matrix-orchestrator.mjs --cadence monthly --includeApprovalRequired true
```

Then execute a one-endpoint smoke before enabling the profile in Council.

## DataForSEO Crawl Profile

### `dfs_onpage_full_v2`

Use for the next comparable crawl after baseline task
`04290125-1574-0216-0000-00a1195b1ba0`.

| Field             | Value                                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------ |
| API               | DataForSEO OnPage `task_post`                                                                                            |
| Target            | `colombiatours.travel`                                                                                                   |
| Start URL         | `https://colombiatours.travel/`                                                                                          |
| Tag               | `epic310-onpage-full-v2-YYYYMMDD`                                                                                        |
| Max pages         | `1000` for weekly comparable run                                                                                         |
| Sitemap           | `respect_sitemap: true`                                                                                                  |
| Resources         | `load_resources: true`                                                                                                   |
| JavaScript        | `enable_javascript: true`                                                                                                |
| Browser rendering | Disabled for full weekly run unless cost is approved                                                                     |
| Priority URLs     | Up to 20 critical URLs: home, `/paquetes`, `/actividades`, planner/contact, top commercial, EN/MX hubs, known P0/P1 URLs |
| Raw endpoints     | task response, summary, pages, resources/links when used                                                                 |
| Cache             | `growth_dataforseo_cache`                                                                                                |
| Usage             | `seo_provider_usage` with task id, tag, counts and cost                                                                  |
| Facts             | `seo_audit_results`, `seo_audit_findings`                                                                                |
| Inventory         | P0/P1/watch only, with `crawl_task_id` and `finding_fingerprint`                                                         |

### Findings to normalize

| Signal                                    | Severity default | Inventory use                                |
| ----------------------------------------- | ---------------- | -------------------------------------------- |
| Fetch/status failure, status `0`, 4xx/5xx | P0               | Block/fix                                    |
| Visual 404 with HTTP 200                  | P0               | Block/fix                                    |
| Accidental noindex/blocked robots         | P0               | Block/fix                                    |
| Broken canonical target                   | P0               | Block/fix                                    |
| Missing canonical on indexable page       | P1               | Fix/watch                                    |
| Canonical to redirect                     | P1               | Fix/watch                                    |
| Missing title/description                 | P1               | Fix                                          |
| Long title/description                    | P1/watch         | Optimize                                     |
| Duplicate title/description               | P1/watch         | Consolidate                                  |
| Hreflang/canonical mismatch               | P1               | Fix before locale scale                      |
| Broken internal resource/link             | P1/watch         | Fix by impact                                |
| Schema missing/invalid                    | P1/watch         | Fix if page is commercial/editorial priority |
| Crawl depth/orphan risk                   | P1/watch         | Internal linking experiment                  |
| Page size/load resource risk              | watch            | Performance sample                           |

### Performance sub-profile

Use a smaller, cost-controlled profile when Core Web Vitals or rendered
performance evidence is needed:

| Field     | Value                                                               |
| --------- | ------------------------------------------------------------------- |
| Profile   | `dfs_onpage_rendered_sample_v1`                                     |
| Max pages | `25-50`                                                             |
| URLs      | Same priority URL list, plus top GSC/GA4 landings                   |
| Resources | `load_resources: true`                                              |
| Rendering | enable browser rendering only for this sample when cost is approved |
| Output    | performance/CWV watch rows, not full-site replacement               |

The full weekly crawl remains the comparable technical baseline. Rendered
samples enrich it; they do not replace the full crawl.

## DataForSEO Content Scale Profiles

Use these profiles when Growth Council approves a content-scale sprint. They
are designed to maximize DataForSEO Labs and SERP value without publishing
content automatically.

### `dfs_content_scale_labs_serp_v1`

Runner:

```bash
node scripts/seo/run-dataforseo-max-performance-profiles.mjs \
  --apply true \
  --profiles dfs_labs_demand_cluster_v1,dfs_labs_competitor_visibility_v1,dfs_labs_gap_intersections_v1,dfs_serp_priority_keywords_v1,dfs_serp_local_pack_v1 \
  --seedProfile en-us-content \
  --keywordLimit 10 \
  --competitorLimit 5
```

Supported seed profiles:

| Seed profile    | Locale | Location code | Language | Purpose                                                                                       |
| --------------- | ------ | ------------: | -------- | --------------------------------------------------------------------------------------------- |
| `co-es`         | es-CO  |          2170 | es       | Colombia Spanish demand, SERP and local pack.                                                 |
| `en-us-content` | en-US  |          2840 | en       | US English demand for Colombia travel packages, Cartagena, Coffee Triangle and agency intent. |
| `mx-es-content` | es-MX  |          2484 | es       | Mexico Spanish demand for travel to Colombia, Cartagena, Eje Cafetero and package intent.     |

Output contract:

| Layer            | Target                                                                                             |
| ---------------- | -------------------------------------------------------------------------------------------------- |
| Raw/cache        | `growth_dataforseo_cache`                                                                          |
| Cost/usage       | `seo_provider_usage`                                                                               |
| Normalized facts | `seo_keyword_opportunities`, `seo_serp_snapshots`, `seo_domain_competitive_facts` where applicable |
| Backlog artifact | `scripts/seo/prepare-growth-content-scale-batch.mjs`                                               |
| Council use      | backlog/cohort only until source row, baseline, owner, metric and evaluation date are complete     |

Current controlled run on 2026-04-30:

| Market | Artifact                                                   | Calls | Cost USD | Result                          |
| ------ | ---------------------------------------------------------- | ----: | -------: | ------------------------------- |
| EN-US  | `artifacts/seo/2026-04-30-dataforseo-content-en-us-apply/` |    23 |   0.4100 | raw cached and facts normalized |
| MX     | `artifacts/seo/2026-04-30-dataforseo-content-mx-apply/`    |    23 |   0.4052 | raw cached and facts normalized |

Content batch generator:

```bash
node scripts/seo/prepare-growth-content-scale-batch.mjs \
  --outDir artifacts/seo/$(date +%F)-growth-content-scale-batch
```

The generator must filter out broad/non-Colombia keywords and keep publication
blocked until EN/MX quality gates and tracking baselines are complete.

### Weekly intake integration

Approved DataForSEO profiles can be attached to the weekly intake, but the
default is off:

```bash
node scripts/seo/run-growth-weekly-intake.mjs \
  --apply true \
  --runApprovedDataForSeoProfiles true \
  --approvedDataForSeoSeedProfiles en-us-content,mx-es-content
```

This runs approved provider profiles, normalizes Max Matrix facts, then
executes joint normalizers and Council enforcement in the same operating loop.
Do not use this flag for Backlinks or LLM Mentions until subscription access is
enabled.

## Search Console Profile

Search Console is the first-party source for actual Google Search visibility.
It should answer: what demand exists, which URLs capture it, where CTR is weak,
which markets/devices are changing, and which rich-result surfaces are active.

Official constraints that shape our profiles:

- The Search Analytics API supports grouping/filtering by dimensions such as
  `query`, `page`, `country`, `device`, `date` and `searchAppearance`.
- Results are sorted by clicks and may not return every possible row.
- For full exports, Google recommends daily one-day pulls, pagination with
  `startRow`, and a maximum response size of 25,000 rows per page.
- Search appearance must be handled as a two-step process: discover
  `searchAppearance` alone first, then filter by each discovered type.
- Adding `page`/`query` increases detail but can drop some data; keep separate
  aggregate profiles for accurate totals.

### `gsc_growth_minimum_v1`

Window: last completed 28 days unless Council defines a different baseline.

| Pull                          | Dimensions         | Priority | Current status      | Use                                   |
| ----------------------------- | ------------------ | -------- | ------------------- | ------------------------------------- |
| `query_page`                  | `query,page`       | P0       | live                | query intent mapped to URLs           |
| `page_country`                | `page,country`     | P0       | live                | market opportunity/regression         |
| `page_device`                 | `page,device`      | P1       | live                | mobile/desktop prioritization         |
| `date_page`                   | `date,page`        | P1       | live                | trend and anomaly checks              |
| `search_appearance_discovery` | `searchAppearance` | P1       | retry as standalone | rich result/snippet feature inventory |

Do not use `page,searchAppearance` as the default profile. The latest run
failed with `Search Console query failed`; per Google guidance, first discover
available search appearance values by grouping on `searchAppearance`, then add
filters only where the property supports it.

### Current execution

Window `2026-04-01 -> 2026-04-28` populated:

| Pull               |        Rows |
| ------------------ | ----------: |
| `query,page`       |      14,655 |
| `page,country`     |       5,102 |
| `page,device`      |       1,707 |
| `date,page`        |      11,981 |
| `searchAppearance` | WATCH/retry |

Cache target: `growth_gsc_cache`.

### Expanded GSC profiles

| Profile                          | Dimensions / filters                              | Window / cadence                                      | Priority | Use in Growth OS                                                                                 |
| -------------------------------- | ------------------------------------------------- | ----------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------ |
| `gsc_daily_complete_web_v1`      | `date,page,query,country,device`, `type=web`      | Daily, one completed day, paginated                   | P0       | Durable historical fact base; avoids only relying on rolling 28d snapshots.                      |
| `gsc_daily_complete_image_v1`    | `date,page,query,country,device`, `type=image`    | Daily, one completed day, paginated                   | P1       | Discover image-search demand for destinations, activities and blogs.                             |
| `gsc_council_28d_query_page_v1`  | `query,page`                                      | Weekly, last completed 28d                            | P0       | High-impression/low-CTR, intent-to-URL mapping and cannibalization.                              |
| `gsc_council_28d_page_market_v1` | `page,country`                                    | Weekly, last completed 28d                            | P0       | CO/MX/US prioritization without mixing markets.                                                  |
| `gsc_council_28d_page_device_v1` | `page,device`                                     | Weekly, last completed 28d                            | P1       | Mobile-specific SEO/CRO/performance opportunities.                                               |
| `gsc_trend_90d_page_v1`          | `date,page`                                       | Weekly, rolling 90d                                   | P1       | Trend, anomaly, content decay and post-fix validation.                                           |
| `gsc_search_appearance_v1`       | step 1: `searchAppearance`; step 2: filter + page | Weekly discovery; filtered pulls only for active type | P1       | Rich-result/snippet inventory, eligibility loss and structured-data opportunities.               |
| `gsc_locale_path_v1`             | `page,query,country` filtered by `/en/`, `/mx/`   | Weekly during locale scale                            | P1       | EN-US/MX launch baselines and wrong-locale cannibalization.                                      |
| `gsc_brand_nonbrand_v1`          | `query,page` with query classifier                | Weekly                                                | P1       | Separate brand health from non-brand acquisition; detect brand cannibalization and trust demand. |
| `gsc_freshness_3d_v1`            | `date,page,query`, `dataState=all` when available | Daily watch after deploys                             | P2       | Early directional read after launches; never used as final Council evaluation.                   |

### GSC facts to normalize

Keep raw rows in `growth_gsc_cache`. Promote these facts to either future GSC
fact tables or summarized `growth_inventory` rows:

| Fact                                  | Inputs                     | Inventory row when                                                             |
| ------------------------------------- | -------------------------- | ------------------------------------------------------------------------------ |
| High-impression / low-CTR opportunity | `query,page`               | impressions material, avg position viable, CTR below expected band.            |
| Query-to-page mismatch                | `query,page`, URL locale   | query intent/locale does not match ranking URL.                                |
| Cannibalization                       | `query,page`               | one query has multiple meaningful URLs with fragmented clicks/impressions.     |
| Market opportunity                    | `page,country`             | country has material impressions/clicks and underperforming CTR or conversion. |
| Mobile weakness                       | `page,device`              | mobile CTR or position materially worse than desktop for an actionable page.   |
| Rich-result opportunity               | `searchAppearance` + page  | appearance exists or disappears on commercial/editorial pages.                 |
| Decay / recovery                      | `date,page`                | 7d/28d trend crosses threshold after fix, publish or technical regression.     |
| Locale launch baseline                | locale-filtered page/query | EN-US/MX pages have baseline impressions/clicks before content/campaign scale. |

### GSC guardrails

- Do not compare `page/query` detailed totals with aggregate property totals as
  if they were the same population.
- Use completed dates for Council decisions; use freshness pulls only as WATCH.
- Page through daily exports until no rows remain.
- Keep query privacy/row limitations visible in reports; missing rows are not
  automatically zero demand.
- Do not approve an experiment from GSC alone if the landing has no GA4 or
  funnel baseline.

## GA4 Profile

GA4 is the first-party source for behavior after the click: landing quality,
channel mix, source/medium, events, key events, geography, device, campaign and
conversion continuity. It should answer: traffic quality, activation leakage,
attribution gaps and whether experiments are measurable.

Official constraints that shape our profiles:

- The GA4 Data API exposes dimensions/metrics through `runReport` and the
  metadata/schema; incompatible combinations fail at request time.
- Page, landing, source/medium, campaign, event and geography dimensions are
  available, but they must be queried in compatible scopes.
- GA4 dimensions such as landing page, page location/path, hostname, event name,
  key-event status, city/country and traffic-source fields are automatically or
  event-parameter populated depending on the field.
- Key-event and event metrics must be interpreted together with our own
  `funnel_events`, because GA4 alone does not prove WAFlow/CRM attribution.

### `ga4_growth_minimum_v1`

Window: same as GSC for Council comparability.

| Pull                     | Dimensions                                              | Metrics                                                          | Priority | Current status | Use                        |
| ------------------------ | ------------------------------------------------------- | ---------------------------------------------------------------- | -------- | -------------- | -------------------------- |
| `landing_channel`        | `landingPagePlusQueryString,sessionDefaultChannelGroup` | `sessions,totalUsers,screenPageViews,engagementRate,conversions` | P0       | live           | landing quality by channel |
| `page_source_medium`     | `pagePath,sessionSourceMedium`                          | `sessions,totalUsers,screenPageViews,engagementRate,conversions` | P0       | live           | source quality by page     |
| `event_page`             | `eventName,pagePath`                                    | `eventCount,conversions`                                         | P0       | live           | activation/event gaps      |
| `campaign_source_medium` | `sessionCampaignName,sessionSource,sessionMedium`       | `sessions,totalUsers,conversions`                                | P2       | live           | paid-readiness/campaign QA |

Before adding new GA4 dimensions or metrics, validate compatibility through GA4
metadata or a controlled smoke. GA4 rejects incompatible dimension/metric
combinations at request time.

### Current execution

Window `2026-04-01 -> 2026-04-28` populated:

| Pull                     |  Rows |
| ------------------------ | ----: |
| `landing_channel`        | 5,150 |
| `page_source_medium`     | 1,873 |
| `event_page`             | 6,717 |
| `campaign_source_medium` |    66 |

Cache target: `growth_ga4_cache`.

### Expanded GA4 profiles

| Profile                              | Dimensions                                                       | Metrics                                                                                | Window / cadence              | Priority | Use in Growth OS                                                           |
| ------------------------------------ | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ----------------------------- | -------- | -------------------------------------------------------------------------- |
| `ga4_daily_landing_channel_v1`       | `date,landingPagePlusQueryString,sessionDefaultChannelGroup`     | `sessions,totalUsers,screenPageViews,engagementRate,keyEvents,conversions`             | Daily, completed day          | P0       | Durable landing/channel history and channel-quality trend.                 |
| `ga4_council_landing_channel_28d_v1` | `landingPagePlusQueryString,sessionDefaultChannelGroup`          | `sessions,totalUsers,screenPageViews,engagementRate,bounceRate,averageSessionDuration` | Weekly 28d                    | P0       | Council acquisition quality by landing/channel.                            |
| `ga4_page_source_medium_28d_v1`      | `pagePath,sessionSourceMedium`                                   | `sessions,totalUsers,screenPageViews,engagementRate,keyEvents,conversions`             | Weekly 28d                    | P0       | Message match and source/medium leakage.                                   |
| `ga4_event_page_28d_v1`              | `eventName,pagePath`                                             | `eventCount,keyEvents,conversions`                                                     | Weekly 28d                    | P0       | Activation/event gaps by page.                                             |
| `ga4_campaign_source_medium_28d_v1`  | `sessionCampaignName,sessionSource,sessionMedium`                | `sessions,totalUsers,keyEvents,conversions`                                            | Weekly; before paid decisions | P0       | Paid-readiness, campaign continuity and UTM hygiene.                       |
| `ga4_geo_landing_28d_v1`             | `country,city,landingPagePlusQueryString`                        | `sessions,totalUsers,engagementRate,keyEvents,conversions`                             | Weekly for CO/MX/US           | P1       | Market prioritization and local/geography mismatches.                      |
| `ga4_device_landing_28d_v1`          | `deviceCategory,landingPagePlusQueryString`                      | `sessions,totalUsers,engagementRate,bounceRate,averageSessionDuration,keyEvents`       | Weekly                        | P1       | Mobile/desktop CRO and performance triage.                                 |
| `ga4_hostname_locale_28d_v1`         | `hostname,landingPagePlusQueryString,sessionDefaultChannelGroup` | `sessions,totalUsers,engagementRate,keyEvents`                                         | Weekly during migration       | P1       | Detect legacy subdomain/path-prefix leakage and locale measurement gaps.   |
| `ga4_internal_search_v1`             | `searchTerm,pagePath` or `eventName,pagePath` filtered to search | `eventCount,totalUsers`                                                                | Weekly if site search active  | P2       | Demand discovery from on-site search; feed content and navigation backlog. |
| `ga4_file_outbound_engagement_v1`    | `eventName,pagePath`, event filters for file/outbound/scroll     | `eventCount,totalUsers`                                                                | Monthly                       | P2       | Detect brochures, PDFs, outbound CTA and deep-scroll behavior.             |
| `ga4_realtime_smoke_v1`              | realtime dimensions for active page/event                        | active users / event counts                                                            | On deploy/smoke only          | P2       | Deployment verification; not used for Council baselines.                   |

### GA4 facts to normalize

Keep raw rows in `growth_ga4_cache`. Promote these facts:

| Fact                      | Inputs                          | Inventory row when                                                              |
| ------------------------- | ------------------------------- | ------------------------------------------------------------------------------- |
| Landing low activation    | landing/channel + funnel rows   | sessions are material but CTA/WAFlow/lead rows are low or zero.                 |
| Paid continuity gap       | campaign/source/medium + funnel | paid sessions or GA4 key events exist without matching funnel/Meta CAPI events. |
| Organic engagement gap    | landing/channel                 | organic sessions exist but engagement/key events trail comparable pages.        |
| Event/page drop-off       | event/page + funnel             | page has many engagement events but no activation/lead event.                   |
| Market conversion gap     | country/city + landing          | country has sessions but conversion/activation lags.                            |
| Device conversion gap     | device + landing                | mobile engagement or key-event rate trails desktop materially.                  |
| Locale measurement gap    | hostname/landing                | EN/MX/legacy host traffic is not mapped to expected locale path.                |
| Internal search demand    | search term event               | repeated on-site query maps to missing or underperforming page/offer.           |
| Attribution quality issue | source/medium/campaign          | `(not set)`, direct inflation or missing campaign data exceeds watch threshold. |

### GA4 guardrails

- Validate new dimension/metric combinations through metadata or a controlled
  smoke before adding them to scheduled jobs.
- Keep session-scoped, event-scoped and item-scoped dimensions in separate
  profiles unless Google metadata confirms compatibility.
- Use GA4 as behavior truth, but use `funnel_events`/CRM as conversion truth for
  WAFlow, qualified lead, quote and `booking_confirmed`.
- Do not sum `totalUsers` across detailed dimensions as if they were unique
  people; use it directionally by profile.
- Treat `(not set)` as a data-quality row, not as a normal channel.
- Reconcile `landingPagePlusQueryString` to canonical URL/path before joining to
  GSC/DataForSEO.

## GSC + GA4 Joint Growth Profiles

The highest-value rows come from joining search demand with behavior and
conversion. These profiles are derived from the raw caches; they should not make
new provider calls.

| Profile                             | Sources                                             | Cadence             | Priority | Council use                                                                   |
| ----------------------------------- | --------------------------------------------------- | ------------------- | -------- | ----------------------------------------------------------------------------- |
| `growth_search_to_activation_v1`    | GSC `query,page` + GA4 landing + funnel             | Weekly              | P0       | High search demand pages that fail activation.                                |
| `growth_market_fit_v1`              | GSC `page,country` + GA4 country/landing            | Weekly              | P0       | CO/MX/US market opportunities with both visibility and session quality.       |
| `growth_mobile_seo_cro_v1`          | GSC `page,device` + GA4 device/landing              | Weekly              | P1       | Mobile SEO/CRO issues where search visibility and behavior both underperform. |
| `growth_post_fix_validation_v1`     | GSC trend + GA4 landing trend + DataForSEO diff     | Weekly after fixes  | P1       | Validate whether technical/content fixes improved search and engagement.      |
| `growth_locale_launch_readiness_v1` | GSC locale path + GA4 hostname/landing + EN quality | Weekly during EN/MX | P1       | Decide if localized content can enter sitemap/hreflang/campaigns.             |
| `growth_paid_governance_v1`         | GA4 campaign/source + funnel + Meta CAPI            | Weekly before spend | P0       | Approve, watch or block paid spend based on traceability.                     |

### Joint fact contract

Joint facts are derived records, not another raw-provider cache. They must keep
links to the source provider facts or cache keys used to compute them.

| Field                      | Requirement                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------- |
| `tenant_id` / `website_id` | Required for every row; never aggregate across tenants.                                           |
| `profile`                  | One of the joint profiles above, versioned with `_v1`.                                            |
| `entity_key`               | Canonical URL/path, market, device, campaign, query cluster or locale batch key.                  |
| `source_refs`              | Cache keys or fact ids for GSC, GA4, DataForSEO, tracking, translation or AI/GEO inputs.          |
| `window`                   | Completed date window, crawl task id, or localized content batch id.                              |
| `score_components`         | Demand, visibility gap, engagement gap, conversion gap, strategic fit and confidence inputs.      |
| `health_status`            | `pass`, `watch` or `blocked` based on cache freshness, join completeness and tracking continuity. |
| `inventory_fingerprint`    | Stable dedupe key for the eventual `growth_inventory` row.                                        |

Joint facts become `growth_inventory` only when they are decision-grade. A
single joint fact may update an existing inventory row instead of creating a new
one when the same URL/market/device/campaign and issue type already exists.

### Joint fact outputs

| Joint profile                       | Fact produced                                                    | Inventory behavior                                                                                |
| ----------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `growth_search_to_activation_v1`    | URL/query demand with GA4 landing quality and funnel activation. | Promote high-demand/low-activation rows; block if tracking continuity is missing.                 |
| `growth_market_fit_v1`              | Country or city opportunity with search demand and behavior.     | Promote market-specific rows for CO/MX/US; never merge markets silently.                          |
| `growth_mobile_seo_cro_v1`          | Device-specific search and behavior delta.                       | Promote mobile candidate/watch rows when both visibility or engagement trails desktop materially. |
| `growth_post_fix_validation_v1`     | Before/after crawl, GSC and GA4 validation.                      | Close/archive fixed rows, keep WATCH if behavior did not recover, or create follow-up candidate.  |
| `growth_locale_launch_readiness_v1` | Locale path readiness from GSC, GA4 hostname/path and QA gate.   | PASS/WATCH/BLOCK localized sitemap, hreflang, content scale and campaign readiness.               |
| `growth_paid_governance_v1`         | Campaign/source continuity from GA4, funnel and Meta CAPI.       | PASS/WATCH/BLOCK paid spend; approval requires traceable events and no critical attribution gap.  |

### Joint scoring model

Use the same executive score pattern across GSC/GA4:

| Component      | Weight | Example signal                                               |
| -------------- | -----: | ------------------------------------------------------------ |
| Demand         |     25 | GSC impressions, clicks, query intent, market demand.        |
| Visibility gap |     20 | low CTR, weak position, cannibalization, rich-result loss.   |
| Engagement gap |     20 | sessions with low engagement, bounce, short duration.        |
| Conversion gap |     20 | missing CTA/WAFlow/lead/booking attribution.                 |
| Strategic fit  |     10 | commercial intent, EN/MX/US priority, Council focus.         |
| Confidence     |      5 | fresh cache, two comparable windows, no `(not set)` blocker. |

Only rows above the Council threshold become `growth_inventory` candidates.
WATCH rows stay out of experiments until they have baseline, owner, metric and
evaluation date.

Default thresholds:

| Score / health                            | Inventory action                                                            |
| ----------------------------------------- | --------------------------------------------------------------------------- |
| Score >= 75 and health `pass`             | Create/update `candidate` row for Council review.                           |
| Score 50-74 or health `watch`             | Create/update `watch` row with missing evidence or next validation step.    |
| Health `blocked`                          | Create/update `blocked` row when the blocker affects measurement or launch. |
| Score < 50 with no strategic override     | Keep in fact tables/cache only; do not promote.                             |
| Duplicate with newer accepted source refs | Update existing row, archive superseded fingerprint if needed.              |

## AI Search / GEO Profile

### `geo_ai_visibility_v1`

Use after core normalization, or as a controlled pilot for Growth Council
planning. Full details live in
[Growth AI Search / GEO Profile](./growth-ai-search-geo-profile.md).

| Field         | Value                                                                                                          |
| ------------- | -------------------------------------------------------------------------------------------------------------- |
| API           | DataForSEO AI Optimization + Google AI Mode SERP samples                                                       |
| Target domain | `colombiatours.travel`                                                                                         |
| Target brand  | `ColombiaTours`, `Colombia Tours`, `colombiatours.travel`                                                      |
| Tag           | `epic310-geo-ai-visibility-v1-YYYYMMDD`                                                                        |
| Markets       | CO, MX, US                                                                                                     |
| Locales       | `es-CO`, `es-MX`, `en-US`                                                                                      |
| Prompt set    | 30-50 stable travel-planning, destination, package, trust and brand prompts                                    |
| Raw endpoints | LLM Mentions, Top Pages, Top Domains, AI Keyword Data, controlled LLM Responses/Scraper, Google AI Mode sample |
| Cache         | `growth_dataforseo_cache`                                                                                      |
| Usage         | `seo_provider_usage`                                                                                           |
| Facts         | `seo_ai_visibility_runs`, `seo_ai_visibility_facts`                                                            |
| Inventory     | `growth_inventory` rows with `channel = 'ai_search'`                                                           |

### AI/GEO signals to normalize

| Signal                                          | Inventory use                    |
| ----------------------------------------------- | -------------------------------- |
| High AI search volume, no ColombiaTours mention | Content/entity gap row           |
| ColombiaTours mentioned but not cited           | Authority/source improvement row |
| Competitor cited repeatedly                     | Competitor/source gap row        |
| Owned URL cited but low GA4 activation          | CRO/conversion row               |
| Third-party source domains recurring            | Digital PR/referral opportunity  |
| Google AI Mode local/map source                 | Local SEO row                    |

Do not reuse `seo_audit_findings` for AI visibility. AI/GEO facts are not
technical crawl findings; they need a separate comparable run/fact model.

## Normalization Rules

### Into `growth_inventory`

Promote only rows that can drive a decision:

| Signal                                   | Promotion rule                                         |
| ---------------------------------------- | ------------------------------------------------------ |
| High impressions + low CTR               | URL/query row with opportunity score and next action   |
| High impressions + poor position         | content/authority opportunity                          |
| Technical P0/P1 + GSC/GA4 traffic        | remediation priority boost                             |
| Country-specific demand                  | market-specific row, never aggregate ES/EN/MX silently |
| Mobile-specific weakness                 | CRO/performance/watch row                              |
| Landing sessions + low activation        | CRO or offer-messaging row                             |
| Event/page drop-off                      | tracking/CRO row                                       |
| Campaign traffic without conversion path | paid governance/watch row                              |
| Translation quality blocked/watch        | content/localization remediation row by locale/market  |

Every promoted row needs:

- source provider and cache key;
- date window or crawl task id;
- metric baseline;
- owner issue;
- next action;
- evaluation date when converted into an experiment.

For Max Performance Council intake, promoted rows must also identify whether
they came from a provider fact or a joint fact. Joint rows should include source
refs for every provider that materially changed the score, so Council can see
whether the candidate is driven by demand, behavior, conversion, technical
health, localization quality or paid-governance continuity.

### Not promoted

- Raw provider payloads.
- Low-volume rows without strategic relevance.
- Duplicated provider rows that do not change priority.
- Metrics with unknown compatibility or failed extraction.

## Run Cadence

| Profile                          | Cadence                                                     | Owner issue    |
| -------------------------------- | ----------------------------------------------------------- | -------------- |
| `dfs_onpage_full_v2`             | weekly while #312/#313 are blocked/watch                    | #312/#313      |
| `dfs_onpage_rendered_sample_v1`  | on demand before technical gate decisions                   | #312           |
| `gsc_growth_minimum_v1`          | weekly before Growth Council                                | #321           |
| `gsc_daily_complete_web_v1`      | daily, completed day, paginated                             | #321           |
| `gsc_search_appearance_v1`       | weekly discovery; filtered detail when supported            | #321           |
| `ga4_growth_minimum_v1`          | weekly before Growth Council                                | #321           |
| `ga4_daily_landing_channel_v1`   | daily, completed day                                        | #321/#322      |
| `growth_search_to_activation_v1` | weekly derived normalizer                                   | #311/#321/#322 |
| `geo_ai_visibility_v1`           | monthly baseline; weekly only for active AI/GEO experiments | #321/#334/#335 |
| translation quality gate         | before localized content scale or Council approval          | #314/#315/#321 |
| tracking facts                   | continuous/smoke weekly                                     | #322/#330      |

Automation and approval rules are defined in
[Growth Data Automation Cadence](./growth-data-automation-cadence.md). In
short: GSC/GA4 refresh and normalization can run automatically; DataForSEO
full crawls and AI/GEO runs require approval to start, then can be polled,
persisted, normalized and diffed automatically.

## Official References

- DataForSEO OnPage `task_post`: https://docs.dataforseo.com/v3/on_page-task_post/
- DataForSEO OnPage overview: https://docs.dataforseo.com/v3/on_page-overview/
- DataForSEO OnPage pages endpoint: https://docs.dataforseo.com/v3/on_page-pages/
- Google Search Console Search Analytics query: https://developers.google.com/webmaster-tools/v1/searchanalytics/query
- Google Search Console all data guide: https://developers.google.com/webmaster-tools/v1/how-tos/all-your-data
- GA4 Data API overview: https://developers.google.com/analytics/devguides/reporting/data/v1
- GA4 API dimensions and metrics: https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema
- Growth AI Search / GEO profile: ./growth-ai-search-geo-profile.md
- Growth Translation Quality Gate: ./growth-translation-quality-gate.md
- DataForSEO AI Optimization API: https://dataforseo.com/apis/ai-optimization-api
- DataForSEO LLM Mentions API: https://docs.dataforseo.com/v3/ai_optimization/llm_mentions/overview/
- DataForSEO AI Keyword Data API: https://docs.dataforseo.com/v3/ai_optimization/ai_keyword_data/overview/
