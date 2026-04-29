# Growth Provider Profiles

Status: operational profile for Epic #310 / Spec #337  
Tenant: ColombiaTours (`colombiatours.travel`)  
Website id: `894545b7-73ca-4dae-b76a-da5b6a3f8441`  
Last updated: 2026-04-29

## Purpose

Define repeatable extraction profiles for the Growth OS provider layer:

`provider raw -> provider cache -> normalized facts -> growth_inventory -> Council`

These profiles prevent ad-hoc pulls. Every run must have a profile name, time
window or task id, raw/cache target, normalized target, and Council use.

## Storage Contract

| Provider | Raw/cache table | Normalized facts | Executive use |
|---|---|---|---|
| DataForSEO | `growth_dataforseo_cache` | `seo_audit_results`, `seo_audit_findings` | `growth_inventory` technical/opportunity rows |
| Search Console | `growth_gsc_cache` | future GSC URL/query facts or summarized inventory fields | demand, market, device, CTR, position |
| GA4 | `growth_ga4_cache` | future GA4 landing/event facts or summarized inventory fields | acquisition quality, engagement, events, conversion |
| Tracking | n/a or event provider logs | `funnel_events`, `meta_conversion_events` | activation/conversion status |

`growth_inventory` must not store provider raw JSON. It stores only
decision-grade summaries with source, window, fallback and owner issue.

## DataForSEO Crawl Profile

### `dfs_onpage_full_v2`

Use for the next comparable crawl after baseline task
`04290125-1574-0216-0000-00a1195b1ba0`.

| Field | Value |
|---|---|
| API | DataForSEO OnPage `task_post` |
| Target | `colombiatours.travel` |
| Start URL | `https://colombiatours.travel/` |
| Tag | `epic310-onpage-full-v2-YYYYMMDD` |
| Max pages | `1000` for weekly comparable run |
| Sitemap | `respect_sitemap: true` |
| Resources | `load_resources: true` |
| JavaScript | `enable_javascript: true` |
| Browser rendering | Disabled for full weekly run unless cost is approved |
| Priority URLs | Up to 20 critical URLs: home, `/paquetes`, `/actividades`, planner/contact, top commercial, EN/MX hubs, known P0/P1 URLs |
| Raw endpoints | task response, summary, pages, resources/links when used |
| Cache | `growth_dataforseo_cache` |
| Usage | `seo_provider_usage` with task id, tag, counts and cost |
| Facts | `seo_audit_results`, `seo_audit_findings` |
| Inventory | P0/P1/watch only, with `crawl_task_id` and `finding_fingerprint` |

### Findings to normalize

| Signal | Severity default | Inventory use |
|---|---|---|
| Fetch/status failure, status `0`, 4xx/5xx | P0 | Block/fix |
| Visual 404 with HTTP 200 | P0 | Block/fix |
| Accidental noindex/blocked robots | P0 | Block/fix |
| Broken canonical target | P0 | Block/fix |
| Missing canonical on indexable page | P1 | Fix/watch |
| Canonical to redirect | P1 | Fix/watch |
| Missing title/description | P1 | Fix |
| Long title/description | P1/watch | Optimize |
| Duplicate title/description | P1/watch | Consolidate |
| Hreflang/canonical mismatch | P1 | Fix before locale scale |
| Broken internal resource/link | P1/watch | Fix by impact |
| Schema missing/invalid | P1/watch | Fix if page is commercial/editorial priority |
| Crawl depth/orphan risk | P1/watch | Internal linking experiment |
| Page size/load resource risk | watch | Performance sample |

### Performance sub-profile

Use a smaller, cost-controlled profile when Core Web Vitals or rendered
performance evidence is needed:

| Field | Value |
|---|---|
| Profile | `dfs_onpage_rendered_sample_v1` |
| Max pages | `25-50` |
| URLs | Same priority URL list, plus top GSC/GA4 landings |
| Resources | `load_resources: true` |
| Rendering | enable browser rendering only for this sample when cost is approved |
| Output | performance/CWV watch rows, not full-site replacement |

The full weekly crawl remains the comparable technical baseline. Rendered
samples enrich it; they do not replace the full crawl.

## Search Console Profile

### `gsc_growth_minimum_v1`

Window: last completed 28 days unless Council defines a different baseline.

| Pull | Dimensions | Priority | Current status | Use |
|---|---|---|---|---|
| `query_page` | `query,page` | P0 | live | query intent mapped to URLs |
| `page_country` | `page,country` | P0 | live | market opportunity/regression |
| `page_device` | `page,device` | P1 | live | mobile/desktop prioritization |
| `date_page` | `date,page` | P1 | live | trend and anomaly checks |
| `search_appearance_discovery` | `searchAppearance` | P1 | retry as standalone | rich result/snippet feature inventory |

Do not use `page,searchAppearance` as the default profile. The latest run
failed with `Search Console query failed`; per Google guidance, first discover
available search appearance values by grouping on `searchAppearance`, then add
filters only where the property supports it.

### Current execution

Window `2026-04-01 -> 2026-04-28` populated:

| Pull | Rows |
|---|---:|
| `query,page` | 14,655 |
| `page,country` | 5,102 |
| `page,device` | 1,707 |
| `date,page` | 11,981 |
| `searchAppearance` | WATCH/retry |

Cache target: `growth_gsc_cache`.

## GA4 Profile

### `ga4_growth_minimum_v1`

Window: same as GSC for Council comparability.

| Pull | Dimensions | Metrics | Priority | Current status | Use |
|---|---|---|---|---|---|
| `landing_channel` | `landingPagePlusQueryString,sessionDefaultChannelGroup` | `sessions,totalUsers,screenPageViews,engagementRate,conversions` | P0 | live | landing quality by channel |
| `page_source_medium` | `pagePath,sessionSourceMedium` | `sessions,totalUsers,screenPageViews,engagementRate,conversions` | P0 | live | source quality by page |
| `event_page` | `eventName,pagePath` | `eventCount,conversions` | P0 | live | activation/event gaps |
| `campaign_source_medium` | `sessionCampaignName,sessionSource,sessionMedium` | `sessions,totalUsers,conversions` | P2 | live | paid-readiness/campaign QA |

Before adding new GA4 dimensions or metrics, validate compatibility through GA4
metadata or a controlled smoke. GA4 rejects incompatible dimension/metric
combinations at request time.

### Current execution

Window `2026-04-01 -> 2026-04-28` populated:

| Pull | Rows |
|---|---:|
| `landing_channel` | 5,150 |
| `page_source_medium` | 1,873 |
| `event_page` | 6,717 |
| `campaign_source_medium` | 66 |

Cache target: `growth_ga4_cache`.

## Normalization Rules

### Into `growth_inventory`

Promote only rows that can drive a decision:

| Signal | Promotion rule |
|---|---|
| High impressions + low CTR | URL/query row with opportunity score and next action |
| High impressions + poor position | content/authority opportunity |
| Technical P0/P1 + GSC/GA4 traffic | remediation priority boost |
| Country-specific demand | market-specific row, never aggregate ES/EN/MX silently |
| Mobile-specific weakness | CRO/performance/watch row |
| Landing sessions + low activation | CRO or offer-messaging row |
| Event/page drop-off | tracking/CRO row |
| Campaign traffic without conversion path | paid governance/watch row |

Every promoted row needs:

- source provider and cache key;
- date window or crawl task id;
- metric baseline;
- owner issue;
- next action;
- evaluation date when converted into an experiment.

### Not promoted

- Raw provider payloads.
- Low-volume rows without strategic relevance.
- Duplicated provider rows that do not change priority.
- Metrics with unknown compatibility or failed extraction.

## Run Cadence

| Profile | Cadence | Owner issue |
|---|---|---|
| `dfs_onpage_full_v2` | weekly while #312/#313 are blocked/watch | #312/#313 |
| `dfs_onpage_rendered_sample_v1` | on demand before technical gate decisions | #312 |
| `gsc_growth_minimum_v1` | weekly before Growth Council | #321 |
| `ga4_growth_minimum_v1` | weekly before Growth Council | #321 |
| tracking facts | continuous/smoke weekly | #322/#330 |

## Official References

- DataForSEO OnPage `task_post`: https://docs.dataforseo.com/v3/on_page-task_post/
- DataForSEO OnPage overview: https://docs.dataforseo.com/v3/on_page-overview/
- DataForSEO OnPage pages endpoint: https://docs.dataforseo.com/v3/on_page-pages/
- Google Search Console Search Analytics query: https://developers.google.com/webmaster-tools/v1/searchanalytics/query
- Google Search Console all data guide: https://developers.google.com/webmaster-tools/v1/how-tos/all-your-data
- GA4 Data API overview: https://developers.google.com/analytics/devguides/reporting/data/v1
- GA4 API dimensions and metrics: https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema
