# Growth Intelligence DataForSEO Flows

Status: target runbook for Epic #310 / Spec #337  
Tenant: ColombiaTours (`colombiatours.travel`)  
Last updated: 2026-04-29

## Purpose

DataForSEO must not be treated as a single OnPage report. For Epic #310 it is a
multi-source intelligence provider that complements GSC, GA4, Supabase tracking
and Growth Council decisions.

The operating rule is:

`provider raw -> normalized facts -> growth_inventory matrix -> Growth Council`

Raw provider payloads stay provider-specific for traceability. The executive
matrix stores only comparable metrics, statuses and next actions.

## Storage Model

| Layer | Tables | Purpose |
|---|---|---|
| Raw/cache | `growth_dataforseo_cache`, `growth_gsc_cache`, `growth_ga4_cache` | Preserve provider responses, task ids, endpoint payloads and cache TTL. |
| Usage | `seo_provider_usage` | Track provider, endpoint, cost, task id, website/account scope and run metadata. |
| SEO facts | `seo_audit_results`, `seo_audit_findings` | Normalize per-URL crawl results and per-finding evidence from DataForSEO OnPage. |
| Conversion facts | `funnel_events`, `meta_conversion_events` | Normalize user and server-side conversion events. |
| Executive matrix | `growth_inventory` | Join signals by URL, cluster, market or experiment for prioritization and Council decisions. |

Do not store every raw JSON field in `growth_inventory`. Store summarized
decision fields such as technical status, P0/P1 counts, clicks, sessions,
conversion status, authority signal, owner issue and priority score.

## DataForSEO Modules For Epic #310

| Module | Official capability | Epic use |
|---|---|---|
| OnPage API | Crawl, pages, resources, links, redirect chains, non-indexable, microdata, screenshots, content parsing, Lighthouse. | #312 technical gate and #313 remediation backlog. |
| DataForSEO Labs | Keyword research, ranked keywords, domain rank overview, competitors, relevant pages, intersections. | #314-#320 content, clusters, EN-US, Mexico and market intelligence. |
| SERP API Advanced | Live SERP features, organic/paid elements, PAA, snippets, maps, AI overview elements when available. | SERP-first briefs, competitor gaps and experiment hypotheses. |
| Backlinks API | Summary, history, anchors, referring domains, new/lost links, spam/rank signals. | #334 authority baseline and link-building opportunities. |
| Business Data/Listings | Business listings, Google Maps-style entity data, reviews, ratings, categories. | #335 local SEO baseline and local competitor discovery. |
| Content Analysis | Brand citations, sentiment, rating distribution, phrase/category trends. | Brand monitoring and authority opportunities. |
| AI Optimization | AI keyword data and LLM mentions across platforms. | GEO/AI visibility, E-E-A-T and entity graph inputs. |

## Flow 1: DataForSEO OnPage Crawl

1. Create a DataForSEO OnPage task with a run tag, website/account scope and
   max pages appropriate for the run type.
2. Persist task response, summary and pages payloads in `growth_dataforseo_cache`.
3. Record endpoint, task id, cost and row counts in `seo_provider_usage`.
4. Normalize one row per URL into `seo_audit_results`.
5. Normalize one row per issue into `seo_audit_findings`.
6. Update `growth_inventory` only for actionable URLs or watch items.
7. Publish issue updates to #312, #313, #321 and #310 with task id and counts.

Recommended normalized finding types:

| Finding type | Severity default |
|---|---|
| `broken_fetch` | P0 |
| `visual_404_200` | P0 |
| `noindex_or_blocked` | P0 |
| `canonical_to_broken` | P0 |
| `canonical_to_redirect` | P1 |
| `missing_canonical` | P1 |
| `missing_title` | P1 |
| `missing_description` | P1 |
| `title_too_long` | P1/watch depending on page type |
| `redirect_chain` | P1/watch |
| `orphan_page` | P1/watch |
| `schema_missing_or_invalid` | P1/watch |
| `resource_error` | P1/watch |

## Flow 2: Demand And Ranking Intelligence

1. Start from GSC queries/pages and existing `growth_inventory` URLs.
2. Enrich candidates with DataForSEO Labs:
   keyword volume, intent, difficulty, ranked keywords, relevant pages,
   competitor domains and intersections.
3. Normalize the useful fields into keyword/cluster planning artifacts and
   `growth_inventory` summary fields.
4. Use the result to prioritize #314-#320.

The Council should not approve content work unless the experiment has a demand
source: GSC, DataForSEO Labs, SERP review, or a documented strategic exception.

## Flow 3: SERP Review

1. Select priority keywords from the demand/ranking flow.
2. Run SERP Advanced for the target market/language.
3. Extract SERP shape: organic competitors, snippets, PAA, maps/local elements,
   images/video, paid density and AI elements when returned.
4. Store raw response in `growth_dataforseo_cache` and cost in
   `seo_provider_usage`.
5. Convert the findings into briefs or experiment hypotheses.

SERP data feeds content briefs. It should not overwrite GSC truth for actual
site performance.

## Flow 4: Authority And Brand

1. Run Backlinks summary/history monthly for the domain and priority pages.
2. Track referring domains, domain/page rank, anchors, new/lost backlinks,
   broken backlinks and spam signals.
3. Run Content Analysis or AI/LLM mentions when brand/entity visibility is part
   of the experiment.
4. Promote only actionable opportunities to `growth_inventory` and #334.

## Flow 5: Local SEO

1. Use Business Data/Listings for relevant destinations, agency/service queries
   and local competitors.
2. Track NAP consistency, categories, ratings, review counts and local SERP
   competitors.
3. Feed #335 and Council experiments for local pages, GBP work or review
   acquisition.

## Flow 6: AI Search / GEO Visibility

1. Start from a stable prompt set by market, locale, intent and funnel stage.
2. Run DataForSEO AI Optimization in a controlled profile:
   LLM Mentions, Top Pages, Top Domains, AI Keyword Data and selected
   LLM Responses/Scraper or Google AI Mode samples.
3. Store raw provider responses in `growth_dataforseo_cache` and usage/cost in
   `seo_provider_usage`.
4. Normalize comparable run metadata into `seo_ai_visibility_runs`.
5. Normalize prompt/platform facts into `seo_ai_visibility_facts`.
6. Promote only decision-grade rows to `growth_inventory`, using
   `channel = 'ai_search'`.
7. Use Council to decide whether the next action is content, authority, local
   SEO, technical cleanup or CRO.

Do not store AI/GEO observations in `seo_audit_findings`; those remain for
technical OnPage findings. See
[growth-ai-search-geo-profile](./growth-ai-search-geo-profile.md).

## Flow 7: Conversion Join

1. Read GSC/GA4 for acquisition and engagement.
2. Read `funnel_events` for WAFlow, WhatsApp, Chatwoot and
   `itinerary_confirmed`.
3. Join with normalized DataForSEO signals in `growth_inventory`.
4. Compute ICE/RICE using actual baseline, not only search volume.

For now, `itinerary_confirmed` is the operational conversion event. Wompi
Purchase remains outside this flow until explicitly implemented.

## Comparison Rules

Each normalized run must carry a stable run id:

- DataForSEO: `crawl_task_id` or provider task id.
- GSC/GA4: date window and endpoint key.
- Tracking: event timestamp window and source event id.

Compare current vs previous runs by normalized URL, locale, market and signal
type:

| Status | Meaning |
|---|---|
| `new` | Present now, absent in the previous comparable run. |
| `open` | Present in both runs. |
| `resolved` | Present before, absent now. |
| `regressed` | Previously resolved, present again. |
| `watch` | Not blocking, but relevant to a Council decision. |

## Council Intake

Every Growth Council must include a short data intake section:

| Pillar | Minimum input |
|---|---|
| Technical | Latest OnPage run id, P0/P1/new/resolved/regressed counts. |
| Demand | GSC query/page movement plus DataForSEO demand sample. |
| Visibility | Ranking movement, ranked keywords or domain overview. |
| SERP | Competitor/feature observations for priority keywords. |
| Authority | Backlinks/referring domains/new-lost summary when monthly. |
| Local | Listings/reviews/categories when local SEO is in scope. |
| AI/GEO | LLM mentions, cited pages, source domains, AI keyword data and prompt facts when entity/E-E-A-T is in scope. |
| Conversion | GA4 + `funnel_events` + `itinerary_confirmed` summary. |

An experiment without a source row or baseline is rejected unless the Council
records an explicit strategic exception.
