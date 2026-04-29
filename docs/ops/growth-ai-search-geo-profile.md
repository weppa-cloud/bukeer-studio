# Growth AI Search / GEO Profile

Status: proposed operational profile for Epic #310 / Spec #337  
Tenant: ColombiaTours (`colombiatours.travel`)  
Website id: `894545b7-73ca-4dae-b76a-da5b6a3f8441`  
Last updated: 2026-04-29

## Purpose

Add a measurable AI Search / Generative Engine Optimization layer to the Growth
OS without mixing it into technical OnPage audit data.

The operating rule remains:

`provider raw -> normalized facts -> growth_inventory -> Growth Council`

AI Search / GEO is not a replacement for SEO. Google says the same Search
fundamentals apply to AI features, and DataForSEO exposes separate AI
Optimization endpoints to measure LLM mentions, AI search volume and model
responses. For Epic #310, GEO should be treated as a visibility and authority
pillar that complements GSC, GA4, DataForSEO OnPage, SERP, backlinks and
conversion facts.

## Strategic Model

AI search systems select and cite content through a mix of classic web signals,
entity understanding, source corroboration and response usefulness. The Growth
OS should optimize for measurable outcomes, not speculative formatting tricks.

| Strategy | Why it matters | Growth OS measurement |
|---|---|---|
| Crawlable, technically healthy pages | AI features still depend on accessible web content and search-quality systems. | DataForSEO OnPage P0/P1, `seo_audit_results`, `seo_audit_findings`. |
| Clear entity coverage | LLMs need to understand brand, destinations, offers, expertise and relationships. | AI facts for brand/entity mentions, cited URLs and source domains. |
| Query-answer fit | AI Mode and chat-style search favor complex exploratory questions. | Prompt set mapped to intent, market, language and funnel stage. |
| Third-party corroboration | AI answers often synthesize from multiple sources, not only owned pages. | Top domains, competitor domains, source domains, backlinks/content analysis. |
| Structured commercial content | Travel recommendations need itinerary, destination, price/offer and trust details. | Schema audit, product/package page coverage, content briefs. |
| Local and market specificity | Colombia, Mexico, US and English-language prompts may cite different sources. | `market`, `locale`, `location_code`, `language_code`, GSC country/device joins. |
| Conversion continuity | AI visibility is only useful when cited/visited pages can convert. | GA4 landing/channel, `funnel_events`, `itinerary_confirmed`, Council baselines. |

## DataForSEO Fit

DataForSEO is enough for a v1 because it provides official API surfaces for:

| Capability | Endpoint family | Use in Epic #310 |
|---|---|---|
| Brand/domain mentions in LLMs | AI Optimization / LLM Mentions | Track if ColombiaTours appears in AI answers and how often. |
| Top pages cited by AI | AI Optimization / LLM Mentions Top Pages | Identify which ColombiaTours URLs are cited or missing. |
| Top domains/sources | AI Optimization / LLM Mentions Top Domains | Detect competitors and third-party sources AI relies on. |
| AI search demand | AI Optimization / AI Keyword Data | Estimate AI search volume and trend by prompt/keyword. |
| Controlled prompt responses | AI Optimization / LLM Responses / LLM Scraper | Test specific travel-planning prompts on ChatGPT, Gemini, Claude or Perplexity where supported. |
| Google AI Mode SERP | SERP API / Google AI Mode | Inspect Google AI Mode response shape for priority prompts. |

DataForSEO does not remove the need for GSC/GA4. GSC remains actual Google
search performance, GA4 remains site behavior, and tracking remains conversion
truth. DataForSEO gives AI visibility and source intelligence.

## Profile: `geo_ai_visibility_v1`

Use this after the core #310 normalization is stable, or as a controlled pilot
for #321 Council planning.

| Field | Value |
|---|---|
| Provider | DataForSEO |
| Target domain | `colombiatours.travel` |
| Target brand | `ColombiaTours`, `Colombia Tours`, `colombiatours.travel` |
| Profile tag | `epic310-geo-ai-visibility-v1-YYYYMMDD` |
| Markets | CO, MX, US |
| Locales | `es-CO`, `es-MX`, `en-US` |
| Languages | Spanish, English |
| Platforms | LLM Mentions first; LLM Responses/Scraper and Google AI Mode as controlled samples |
| Prompt count | 30-50 prompts for v1 |
| Cadence | Monthly baseline, weekly only for active Council experiments |
| Raw/cache | `growth_dataforseo_cache` |
| Usage | `seo_provider_usage` |
| Facts | `seo_ai_visibility_runs`, `seo_ai_visibility_facts` |
| Executive matrix | `growth_inventory` rows with channel `ai_search` |

## Prompt Set V1

Keep prompts stable across runs so comparisons are meaningful.

| Segment | Example prompt pattern | Intent | Market |
|---|---|---|---|
| Destination planning | `best Colombia itinerary for 10 days` | informational/commercial | US |
| Package comparison | `best Colombia tour companies for couples` | commercial | US |
| Local Spanish demand | `paquetes turísticos a San Andrés todo incluido` | transactional | CO |
| Mexico expansion | `viajes a Colombia desde México agencias recomendadas` | commercial | MX |
| Trust and safety | `is Colombia safe for family travel with a tour operator` | informational/commercial | US |
| Destination entity | `what to do in Cartagena Colombia in 3 days` | informational | US/CO |
| Offer-specific | `Colombia coffee region tour with local guide` | commercial | US |
| Brand prompt | `ColombiaTours travel agency reviews and packages` | navigational/commercial | CO/US |

Each prompt needs:

- `prompt_id`
- `prompt`
- `locale`
- `market`
- `language_code`
- `location_code`
- `intent`
- `funnel_stage`
- `target_entity`
- `expected_owned_urls`
- `competitor_domains`

## Data Contract

### `seo_ai_visibility_runs`

One row per comparable AI/GEO run.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key. |
| `account_id` | uuid | Tenant scope. |
| `website_id` | uuid | Website scope. |
| `provider` | text | `dataforseo`. |
| `profile` | text | `geo_ai_visibility_v1`. |
| `run_tag` | text | Example: `epic310-geo-ai-visibility-v1-20260429`. |
| `target_domain` | text | `colombiatours.travel`. |
| `target_brand` | text | `ColombiaTours`. |
| `locale` | text | Primary locale for run, or `multi`. |
| `market` | text | Primary market for run, or `multi`. |
| `location_code` | integer | Provider location code when applicable. |
| `language_code` | text | Provider language code. |
| `platforms` | jsonb | LLM/search platforms requested. |
| `prompt_set_version` | text | Stable prompt set id. |
| `status` | text | `pending`, `running`, `complete`, `failed`, `partial`. |
| `started_at` | timestamptz | Run start. |
| `finished_at` | timestamptz | Run end. |
| `raw_cache_keys` | jsonb | Cache references in `growth_dataforseo_cache`. |
| `cost_usd` | numeric | Sum from `seo_provider_usage`. |
| `metadata` | jsonb | Request options, notes, failures. |

### `seo_ai_visibility_facts`

One row per prompt/platform/observed entity or cited page.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key. |
| `run_id` | uuid | FK to `seo_ai_visibility_runs`. |
| `account_id` | uuid | Tenant scope. |
| `website_id` | uuid | Website scope. |
| `provider` | text | `dataforseo`. |
| `platform` | text | `chatgpt`, `gemini`, `claude`, `perplexity`, `google_ai_mode`, or provider value. |
| `model_name` | text | Provider model when available. |
| `endpoint_type` | text | `llm_mentions`, `ai_keyword_data`, `llm_response`, `llm_scraper`, `google_ai_mode`. |
| `prompt_id` | text | Stable prompt id. |
| `prompt` | text | Original prompt/query. |
| `prompt_intent` | text | Informational, commercial, transactional, navigational, mixed. |
| `keyword_cluster` | text | Destination/topic cluster. |
| `locale` | text | Fact locale. |
| `market` | text | Fact market. |
| `location_code` | integer | Provider location code. |
| `language_code` | text | Provider language code. |
| `target_domain` | text | Domain being measured. |
| `target_brand` | text | Brand/entity being measured. |
| `source_url` | text | Source/cited URL when available. |
| `source_domain` | text | Cited/source domain. |
| `owned_url` | text | ColombiaTours URL if cited or mapped. |
| `mentioned` | boolean | Target brand/domain mentioned. |
| `cited` | boolean | Owned URL/domain cited as source. |
| `mentions_count` | integer | Provider count when available. |
| `citations_count` | integer | Normalized citations count. |
| `ai_search_volume` | integer | AI keyword demand where available. |
| `impressions` | integer | Provider impression metric where available. |
| `visibility_score` | numeric | Normalized 0-100 score. |
| `rank_position` | numeric | Position/order when provider returns it. |
| `answer_excerpt` | text | Short evidence excerpt, redacted if needed. |
| `sentiment` | text | Positive, neutral, negative, mixed, unknown. |
| `competitor_domains` | jsonb | Competitor/source domains seen in response. |
| `brand_entities` | jsonb | Entities extracted from response. |
| `evidence` | jsonb | Provider ids, raw paths, response ids, item ids. |
| `fact_fingerprint` | text | Stable hash for diffing comparable runs. |
| `observed_at` | timestamptz | Provider observation time. |

### `growth_inventory` extension

Minimum contract update:

- Add `ai_search` to the `channel` check constraint.
- Use existing fields for v1 where possible:
  - `source_url`: owned URL if cited, or synthetic URL like `ai-search://prompt/{prompt_id}` when no owned page is cited.
  - `cluster`: prompt/topic cluster.
  - `intent`: prompt intent.
  - `market` / `locale`: prompt scope.
  - `priority_score`: combines AI demand, missing citation, GSC/GA4 opportunity and commercial intent.
  - `next_action`: content/entity/authority action.
  - `owner_issue`: usually #321 or content child issue.

Recommended later extension:

- `ai_mentions_28d`
- `ai_impressions_28d`
- `ai_search_volume`
- `ai_citations`
- `ai_visibility_score`
- `source_fact_ids jsonb`

## Normalization Rules

Promote to `growth_inventory` only when the row can drive a Council decision.

| Signal | Promotion rule | Owner |
|---|---|---|
| High AI search volume, no ColombiaTours mention | Create content/entity gap row. | #314-#320 |
| ColombiaTours mentioned but not cited | Create authority/source improvement row. | #334 |
| Competitor cited repeatedly for target prompt | Create competitor gap row. | #321/#334 |
| Owned page cited but weak GA4 activation | Create CRO row joined to GA4/funnel data. | #321/#322 |
| AI source domain is third-party list/review site | Create digital PR/referral opportunity. | #334 |
| Google AI Mode uses local/map elements | Create local SEO row. | #335 |
| Prompt has demand but no matching owned URL | Create content brief candidate. | #314-#320 |

Do not promote:

- One-off low-value prompts with no volume or commercial relevance.
- Raw model text without extracted source/domain/mention fields.
- Rows where location/language cannot be compared with the next run.
- Provider errors or partial responses except as health/watch rows.

## Priority Score V1

Use a transparent score instead of a black-box GEO grade:

`priority_score = demand_score + visibility_gap + commercial_intent + conversion_fit + authority_gap - technical_risk`

| Component | Range | Example |
|---|---:|---|
| `demand_score` | 0-25 | AI search volume or proxy GSC demand. |
| `visibility_gap` | 0-25 | Competitors cited, ColombiaTours absent. |
| `commercial_intent` | 0-20 | Package/agency/booking intent. |
| `conversion_fit` | 0-15 | Matching landing has GA4/funnel baseline. |
| `authority_gap` | 0-10 | Source domains imply PR/listing need. |
| `technical_risk` | 0 to -20 | Target page has P0/P1 technical blockers. |

## Implementation Steps

1. Add Flutter/SSOT migration for `seo_ai_visibility_runs` and
   `seo_ai_visibility_facts`, plus `growth_inventory.channel = 'ai_search'`.
2. Add `geo_ai_visibility_v1` prompt fixture:
   `docs/ops/growth-ai-search-prompts-v1.json`.
3. Add script:
   `scripts/seo/run-dataforseo-ai-visibility.mjs`.
   It should support `--dryRun`, `--apply`, `--profile`, `--promptSet`,
   `--market`, `--locale`, and `--maxPrompts`.
4. Persist every provider response in `growth_dataforseo_cache`.
5. Record endpoint usage in `seo_provider_usage`.
6. Normalize facts into `seo_ai_visibility_runs` and
   `seo_ai_visibility_facts`.
7. Add script:
   `scripts/seo/normalize-ai-visibility-inventory.mjs`.
8. Add health report checks:
   latest run age, prompt coverage, platform failures, cost and fact counts.
9. Update #310/#321 with AI/GEO baseline and only approve Council experiments
   backed by normalized facts.

## Test Plan

- Dry-run with 5 prompts and no writes.
- Apply a controlled 10-prompt pilot for one market/locale.
- Verify cache rows in `growth_dataforseo_cache`.
- Verify usage rows in `seo_provider_usage`.
- Verify one run row in `seo_ai_visibility_runs`.
- Verify facts in `seo_ai_visibility_facts`.
- Verify promoted `growth_inventory` rows use `channel = 'ai_search'`.
- Verify Council rejects AI/GEO experiments without prompt id, source fact,
  baseline, owner, metric and evaluation date.

## Open Decisions

| Decision | Recommendation |
|---|---|
| Run now or after core #310 normalization? | Run a 10-prompt pilot now; full monthly baseline after second OnPage comparable run. |
| Store excerpts? | Store short excerpts only, plus raw cache key. Avoid large answer dumps in facts. |
| Use synthetic `source_url` for prompt-only gaps? | Yes for v1, with `ai-search://prompt/{prompt_id}`. Add `source_fact_ids` later. |
| Separate facts table vs reuse `seo_audit_findings`? | Separate facts table. AI visibility is not a technical audit finding. |

## Official References

- Google Search Central, AI features and your website:
  https://developers.google.com/search/docs/appearance/ai-features
- Google, AI Overviews and AI Mode in Search:
  https://search.google/pdf/google-about-AI-overviews-AI-Mode.pdf
- DataForSEO AI Optimization API:
  https://dataforseo.com/apis/ai-optimization-api
- DataForSEO LLM Mentions API:
  https://docs.dataforseo.com/v3/ai_optimization/llm_mentions/overview/
- DataForSEO AI Keyword Data API:
  https://docs.dataforseo.com/v3/ai_optimization/ai_keyword_data/overview/
- DataForSEO ChatGPT LLM Responses:
  https://docs.dataforseo.com/v3/ai_optimization/chat_gpt/llm_responses/overview/
- DataForSEO Google AI Mode SERP:
  https://docs.dataforseo.com/v3/serp/google/ai_mode/overview/
