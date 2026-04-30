# SPEC: Growth OS Paid Media Integration

Status: Draft implementable for EPIC #310  
Tenant: ColombiaTours (`colombiatours.travel`)  
Website id: `894545b7-73ca-4dae-b76a-da5b6a3f8441`  
Created: 2026-04-30  
Owner: A5 Growth Ops + SEM Lead + A3 Tracking  
Canonical execution: [#310](https://github.com/weppa-cloud/bukeer-studio/issues/310)  
Related SPECs: [#337](https://github.com/weppa-cloud/bukeer-studio/issues/337), [SPEC_GROWTH_OS_MAX_PERFORMANCE_MATRIX](./SPEC_GROWTH_OS_MAX_PERFORMANCE_MATRIX.md), [SPEC_META_CHATWOOT_CONVERSIONS](./SPEC_META_CHATWOOT_CONVERSIONS.md)

## Purpose

Define how Growth OS integrates SEO, Meta Ads and Google Ads before creating or
scaling campaigns. Paid media is not a separate execution channel. It is a
measured Growth OS input that must pass tracking, attribution, landing quality
and Council governance before spend is increased.

Operating rule:

```text
paid platform raw/cache
  -> normalized paid facts
  -> joint SEO/GA4/funnel facts
  -> growth_inventory
  -> Growth Council
  -> campaign create / scale / iterate / pause / stop
```

This SPEC answers:

- what must exist before campaigns are created;
- which Meta Ads and Google Ads profiles Growth OS must extract;
- how paid data joins SEO demand, GA4 behavior and CRM/funnel truth;
- who owns each stage of campaign planning, creation and optimization;
- how experiments stay measurable while remediation/backlog can remain large.

## External Direction

The design follows current provider direction:

- Meta recommends Pixel + Conversions API and announced simplified CAPI setup
  in April 2026: <https://about.fb.com/ltam/news/2026/04/eliminar-barreras-tecnicas-para-ayudar-a-empresas-de-todos-los-tamanos-a-aprovechar-mas-sus-anuncios/>
- Google Ads API v24 was released on 2026-04-22 and includes relevant changes
  for Demand Gen, Performance Max, travel feed data and view-through conversion
  optimization: <https://developers.google.cn/google-ads/api/docs/release-notes?hl=en>
- Google recommends Data Manager API for new offline conversion workflows:
  <https://developers.google.com/google-ads/api/docs/conversions/upload-offline>
- Google Data Manager API supports conversion and audience delivery across
  Google products: <https://developers.google.com/data-manager/api>

## Non-Goals

- Do not create campaigns directly from code in the first implementation.
  Campaign creation remains manual until measurement, preflight and kill rules
  are proven.
- Do not scale budget from platform-reported conversions alone.
- Do not store raw provider JSON in `growth_inventory`.
- Do not store raw PII in paid caches or GitHub evidence.
- Do not send Wompi/Purchase unless the booking/payment flow is explicitly
  implemented. `booking_confirmed` / `itinerary_confirmed` remains the operating
  conversion for this cycle.
- Do not mix paid remediation backlog with the five active Council experiments.

## Required Gates

### Gate 0 - Measurement Readiness

Owner: A3 Tracking + A1 Backend  
Required before any new paid campaign is launched.

| Check                    | Requirement                                                                                                             | Status output        |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------- | -------------------- |
| Click ids                | Capture `fbclid`, `_fbp`, `_fbc`, `gclid`, `gbraid`, `wbraid` when present.                                             | `PASS/WATCH/BLOCKED` |
| UTMs                     | URL passes [UTM Convention](../ops/utm-convention.md).                                                                  | `PASS/BLOCKED`       |
| WAFlow                   | `waflow_submit` event emitted with tenant, page, UTM and click id context.                                              | `PASS/WATCH/BLOCKED` |
| CRM link                 | CRM request can be linked by stable reference or deterministic fallback.                                                | `PASS/WATCH/BLOCKED` |
| Lead stages              | `qualified_lead`, `quote_sent`, `booking_confirmed` or `itinerary_confirmed` are traceable.                             | `PASS/WATCH/BLOCKED` |
| Meta CAPI                | Lead events can be sent/skipped/deduped safely with sanitized logs.                                                     | `PASS/WATCH/BLOCKED` |
| Google conversion import | Enhanced Conversions for Leads or Data Manager API path is designed and smoke-tested before optimization depends on it. | `PASS/WATCH/BLOCKED` |
| Consent/loading          | Paid tags stay behind consent or user intent per [public analytics standard](../ops/public-analytics-standard.md).      | `PASS/BLOCKED`       |

Minimum launch state: `PASS-WITH-WATCH` with documented watch rows.  
Scale state: `PASS`.

### Gate 1 - Campaign Preflight

Owner: SEM Lead + A5 Growth Ops

Each proposed campaign must have:

- platform and campaign objective;
- market and language;
- landing URL;
- audience or keyword set;
- budget cap;
- UTM set;
- conversion goal;
- baseline;
- success metric;
- kill rule;
- owner;
- evaluation date;
- Council source row from `growth_inventory`.

### Gate 2 - Launch Smoke

Owner: SEM Lead + A3 Tracking

Run within the first 24 hours:

- ad click URL resolves to final public 200 landing;
- no hidden locale, soft-404 or accidental noindex;
- UTM and click id are present in first-party events;
- WAFlow CTA is reachable;
- Meta CAPI and/or Google conversion path records status without critical error;
- cost and clicks appear in paid cache.

### Gate 3 - Council Decision

Owner: A5 Growth Ops

Council can only decide from rows that include source row, baseline, owner,
success metric and evaluation date. Decisions:

- `scale`: increase budget within approved cap;
- `iterate`: change creative, keyword, audience or landing;
- `pause`: stop spend while fixing a blocker;
- `stop`: close experiment;
- `backlog`: move to remediation/content/tracking queue.

## Data Architecture

### Raw / Cache Tables

| Table                          | Purpose                                                                                                                                                    |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `growth_meta_ads_cache`        | Meta Ads Insights, campaign/ad set/ad/creative snapshots, CAPI quality summaries.                                                                          |
| `growth_google_ads_cache`      | Google Ads reporting, search terms, keywords, landing pages, geo/device, conversion import status.                                                         |
| `growth_paid_conversion_cache` | Sanitized provider conversion upload/import attempts and status.                                                                                           |
| `paid_provider_usage`          | Cost, quota and API run accounting for paid providers. If not created yet, `seo_provider_usage` can be extended temporarily with `provider_family='paid'`. |

### Normalized Paid Facts

These facts should be created through `bukeer-flutter` migrations when approved.
Until then, extractors may store controlled metadata/artifacts but must not block
read-only profile validation.

| Fact table                       | Grain                                       | Main use                                                        |
| -------------------------------- | ------------------------------------------- | --------------------------------------------------------------- |
| `paid_campaign_facts`            | platform, account, campaign, date           | Budget allocation and campaign health.                          |
| `paid_adset_facts`               | platform, campaign, ad set, date            | Audience, placement and budget decisions.                       |
| `paid_ad_creative_facts`         | platform, ad, creative, date                | Creative winners/losers and message-market fit.                 |
| `paid_keyword_facts`             | Google keyword, match type, date            | Search bidding and quality score actions.                       |
| `paid_search_term_facts`         | Google search term, campaign/ad group, date | Negative keywords, expansion and SEO content ideas.             |
| `paid_landing_page_facts`        | final URL, campaign, date                   | Landing activation and CRO backlog.                             |
| `paid_conversion_upload_facts`   | provider, job, event, date                  | Upload/import health and provider optimization confidence.      |
| `paid_attribution_quality_facts` | provider, campaign/landing, date            | Missing click ids, missing UTMs, dedupe gaps and match quality. |
| `paid_joint_growth_facts`        | campaign/landing/market/date window         | Cross-provider decision rows for `growth_inventory`.            |

### Growth Inventory Contract

Paid rows promoted to `growth_inventory` must include:

- `source_profile`;
- `source_run_id`;
- `source_row_id` or stable fingerprint;
- `platform`;
- `campaign_id` / `campaign_name`;
- `landing_url`;
- `market`;
- `baseline`;
- `priority_score`;
- `owner_issue`;
- `next_action`;
- `status`: `idea`, `queued`, `active`, `watch`, `blocked`, `rejected`, `done`;
- `success_metric`;
- `evaluation_date`;
- `evidence`.

Allowed paid row types:

- `paid_wasted_spend`;
- `paid_high_ctr_low_qualified`;
- `paid_landing_activation_gap`;
- `paid_search_term_negative`;
- `paid_search_term_content_opportunity`;
- `paid_geo_market_fit`;
- `paid_tracking_blocked`;
- `meta_capi_quality_gap`;
- `google_enhanced_conversion_gap`;
- `seo_paid_cannibalization_watch`;
- `retargeting_opportunity`.

## Meta Ads Profiles

### `meta_ads_campaign_daily_v1`

Purpose: daily spend, delivery and conversion health by campaign.

Fields:

- campaign id/name/status/objective;
- spend, impressions, reach, frequency;
- clicks, outbound clicks, landing page views when available;
- CPM, CPC, CTR, outbound CTR;
- platform conversions and conversion value;
- UTM campaign parity.

Actions:

- budget reallocation;
- pause waste;
- detect reporting drift vs first-party facts.

### `meta_ads_adset_audience_v1`

Purpose: understand audience, placement, market and delivery quality.

Fields:

- ad set id/name/status;
- country, region, placement, device/platform when available;
- audience type;
- spend, impressions, reach, frequency;
- click and lead metrics.

Actions:

- split or consolidate audiences;
- cap frequency;
- identify market/device mismatch.

### `meta_ads_creative_v1`

Purpose: creative and message-market fit.

Fields:

- ad id/name/status;
- creative id, format, headline/body/url tags when available;
- outbound CTR, CPC, CPM;
- WAFlow submit rate and qualified lead rate joined from Growth OS.

Actions:

- keep winners;
- kill high CTR / low quality creatives;
- feed content and landing copy backlog.

### `meta_ads_landing_page_v1`

Purpose: join ad traffic to landing behavior.

Fields:

- landing URL and normalized path;
- campaign/ad/adset;
- clicks/landing page views;
- GA4 sessions/engaged sessions;
- WAFlow submit, qualified lead, quote sent, itinerary confirmed.

Actions:

- CRO backlog;
- landing mismatch fixes;
- retargeting audience candidates.

### `meta_capi_quality_v1`

Purpose: ensure Meta optimization receives clean server-side events.

Fields:

- event name, event id status, dedupe status;
- sent/skipped/failed counts;
- missing `_fbp`, `_fbc`, `fbclid`, email hash, phone hash where applicable;
- error class and sanitized provider status;
- test event status when configured.

Actions:

- block scale when CAPI is failing;
- prioritize click id and dedupe fixes;
- decide if campaign remains `WATCH`.

### `meta_advantage_governance_v1`

Purpose: decide if Meta automation can be trusted.

Fields:

- campaign automation type when available;
- conversion signal quality;
- audience broadness;
- creative volume;
- first-party qualified lead rate.

Actions:

- allow Advantage-style optimization only when conversion signal is healthy;
- otherwise keep manual/bounded tests.

## Google Ads Profiles

### `google_ads_campaign_daily_v1`

Purpose: campaign spend and performance by day.

Fields:

- customer/account, campaign id/name/status/channel type;
- cost, impressions, clicks, CTR, CPC;
- conversions, conversion value, all conversions;
- budget, bidding strategy, optimization score where available;
- UTM campaign parity.

Actions:

- budget allocation;
- pause waste;
- detect campaigns reporting conversions without first-party evidence.

### `google_ads_search_terms_v1`

Purpose: search term governance.

Fields:

- search term, keyword, match type;
- campaign/ad group;
- cost, impressions, clicks, CTR, CPC;
- conversions and first-party lead stages;
- landing URL.

Actions:

- negative keywords;
- exact/phrase expansion;
- SEO content ideas;
- market demand validation.

### `google_ads_keyword_quality_v1`

Purpose: improve Google Search efficiency.

Fields:

- keyword, match type, campaign/ad group;
- quality score;
- expected CTR;
- ad relevance;
- landing page experience;
- cost/click/conversion data.

Actions:

- improve landing;
- change ad copy;
- pause low-quality terms;
- build missing SEO page if the term is strategic.

### `google_ads_landing_page_v1`

Purpose: paid landing page CRO and attribution.

Fields:

- final URL and expanded final URL;
- mobile final URL when present;
- campaign/ad group/keyword/search term;
- cost/clicks/conversions;
- GA4 sessions/engagement;
- funnel lead stages.

Actions:

- landing activation backlog;
- URL/canonical/noindex guard;
- page speed watch rows.

### `google_ads_geo_device_v1`

Purpose: market and device fit.

Fields:

- country, region/city if allowed;
- device;
- cost, clicks, conversions;
- first-party qualified lead and quote rates.

Actions:

- market budget shift;
- mobile CRO;
- exclude geos/devices that create low-quality leads.

### `google_ads_pmax_demandgen_v1`

Purpose: governance for Performance Max and Demand Gen.

Fields:

- campaign channel subtype;
- asset group or available performance dimensions;
- cost/conversions/value;
- travel feed status when applicable;
- view-through conversion watch when used.

Actions:

- keep PMax/Demand Gen bounded until first-party conversion import is trusted;
- require landing and audience evidence before scale.

### `google_data_manager_conversion_import_v1`

Purpose: send or validate offline/enhanced lead conversions through the preferred
Google path for new offline conversion workflows.

Fields:

- job id/run id;
- event name/stage;
- source system and tenant;
- hashed user data presence flags;
- `gclid`, `gbraid`, `wbraid` presence flags;
- upload status/error class;
- matched/imported counts when available.

Actions:

- block scale if import jobs fail;
- improve click id and lead identity capture;
- allow Google bidding to optimize on qualified leads instead of shallow clicks.

Fallback: Google Ads API conversion uploads can be used only when Data Manager
API does not fit the tenant/account setup, and must keep the same redaction and
idempotency rules.

## Joint Normalizers

| Profile                              | Inputs                                           | Output                                                                          |
| ------------------------------------ | ------------------------------------------------ | ------------------------------------------------------------------------------- |
| `paid_search_to_qualified_lead_v1`   | Google search terms + GA4 + `funnel_events`      | Terms/campaigns with spend but no qualified leads, or high qualified lead rate. |
| `paid_landing_activation_gap_v1`     | Meta/Google landing facts + GA4 + WAFlow         | Landings with paid clicks but weak activation.                                  |
| `paid_search_term_content_gap_v1`    | Google search terms + GSC + DataForSEO Labs/SERP | Paid terms that should become SEO/content backlog or negatives.                 |
| `paid_geo_market_fit_v1`             | Paid geo/device + GA4 + CRM stages               | Markets/devices that deserve scale, watch or exclusion.                         |
| `paid_creative_to_qualified_lead_v1` | Meta creative + WAFlow/CRM                       | Creative hooks that generate qualified or low-quality demand.                   |
| `paid_conversion_quality_gap_v1`     | Meta CAPI + Google imports + funnel              | Campaigns blocked by missing or failed optimization signals.                    |
| `paid_budget_waste_v1`               | Paid spend + funnel truth                        | Spend rows with no activation/qualification after threshold.                    |
| `seo_paid_cannibalization_v1`        | Paid queries + GSC ranking/clicks                | Terms where paid spend should be reduced or used only for tests.                |

## Campaign Lifecycle

### Stage 0 - Measurement and Landing Readiness

Owners: A3 Tracking, A1 Backend, A4 SEO/Content  
Output: launch gate `PASS/PASS-WITH-WATCH/BLOCKED`.

Validate tracking, UTMs, click ids, conversion stages, landing metadata,
canonical/indexability, speed watch and SEO conflict.

### Stage 1 - Strategy and Offer

Owners: SEM Lead, A5 Growth Ops, Sales Lead, A4 SEO/Content  
Output: campaign brief.

Decide channel, market, offer, landing, keyword/audience, budget cap, success
metric and kill rule. The campaign must map to a `growth_inventory` row or a
Council-approved strategic exception.

### Stage 2 - Manual Campaign Creation

Owner: SEM Lead  
Support: A3 Tracking, Designer/Creative, A4 SEO/Content

Manual first:

- create campaign in Meta Ads Manager or Google Ads;
- apply naming and UTM convention;
- configure conversion goals;
- verify pixel/tag/CAPI/import path;
- set budget cap and schedule;
- document campaign id in Council artifact.

Automated later:

- campaign drafts through provider APIs;
- naming/UTM preflight linter;
- budget cap validator;
- API-based pause/kill rules.

### Stage 3 - Launch Smoke

Owners: SEM Lead + A3 Tracking  
Output: launch smoke evidence.

Confirm click, landing, UTM, click id, WAFlow event, provider event/import status
and paid cache row.

### Stage 4 - Daily Monitoring

Owner: SEM Lead  
Support: A5 Growth Ops

Cadence:

- day 1: tracking smoke;
- day 3: sanity check;
- day 7: first decision;
- day 14: strong decision;
- day 30: booking/revenue read.

### Stage 5 - Growth Council

Owner: A5 Growth Ops

Council decides scale/iterate/pause/stop/backlog. Maximum active experiments:
five by default. More than five is allowed only if experiments are independent
by channel, market, landing and primary metric, and each has a separate owner
and budget cap.

### Stage 6 - Learning Loop

Owners: SEM Lead + A4 SEO/Content + A5 Growth Ops

Feed learning back into:

- negative keywords;
- new SEO/content briefs;
- landing CRO backlog;
- creative messaging;
- market prioritization;
- tracking fixes;
- future Council hypotheses.

## RACI

| Workstream                 | Responsible              | Accountable    | Consulted                  | Informed |
| -------------------------- | ------------------------ | -------------- | -------------------------- | -------- |
| Tracking/CAPI/Data Manager | A3 Tracking + A1 Backend | A5 Growth Ops  | SEM Lead                   | Council  |
| Campaign strategy          | SEM Lead                 | A5 Growth Ops  | A4 SEO/Content, Sales Lead | Council  |
| Campaign creation          | SEM Lead                 | A5 Growth Ops  | A3 Tracking, Creative      | Council  |
| Landing/content quality    | A4 SEO/Content           | A5 Growth Ops  | SEM Lead, Sales Lead       | Council  |
| Daily optimization         | SEM Lead                 | A5 Growth Ops  | A3 Tracking                | Council  |
| Budget decisions           | A5 Growth Ops            | Business Owner | SEM Lead, Sales Lead       | Council  |
| API automation             | A1 Backend               | A5 Growth Ops  | SEM Lead, A3 Tracking      | Council  |

## Naming, UTM And Identity Rules

- Follow [UTM Convention](../ops/utm-convention.md).
- Google Ads campaign name must equal `utm_campaign`.
- Meta campaign/ad set naming must preserve market, intent and asset.
- No PII in any UTM, campaign name or GitHub evidence.
- Store click ids only with tenant and lead/conversion context.
- Browser and server events for the same action must share `event_id`.
- Hash user data server-side only when sending to conversion APIs and allowed by
  policy and consent posture.

## Budget And Kill Rules

Council sets actual budget. Default pilot rule until Council overrides:

| Channel          | Pilot cap recommendation                  | Kill rule examples                                                                          |
| ---------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------- |
| Google Search    | Small daily cap by market/asset           | Stop term/ad group after approved spend threshold with zero qualified leads.                |
| Meta prospecting | Small daily cap per audience/creative set | Stop if outbound CTR and WAFlow submit rate stay below threshold after minimum impressions. |
| Meta retargeting | Smaller cap than prospecting              | Stop if frequency rises and no qualified lead follows.                                      |
| Demand Gen/PMax  | Bounded pilot only                        | Do not scale until offline/enhanced conversion import is healthy.                           |

Every campaign must include:

- max daily budget;
- max test spend;
- primary success metric;
- hard stop condition;
- first review date;
- final evaluation date.

## Implementation Phases

### Phase 0 - Spec And GitHub SSOT

- Publish this SPEC.
- Update #310 with paid media integration scope.
- Create child issues only after SPEC approval.

### Phase 1 - Data Contracts And Migrations

- Create paid cache/fact migrations from `bukeer-flutter` SSOT.
- Add RLS/tenant checks and idempotency keys.
- Extend provider usage accounting.

### Phase 2 - Read-Only Reporting Connectors

- Meta Ads Insights read-only profiles.
- Google Ads reporting read-only profiles.
- Dry-run and apply modes with row counts.

### Phase 3 - Conversion Quality

- Meta CAPI quality report.
- Google Data Manager API / Enhanced Conversions for Leads smoke.
- Attribution quality facts.

### Phase 4 - Joint Normalizers

- Join paid platform data with GA4, GSC, DataForSEO, `funnel_events`,
  `meta_conversion_events` and CRM/request facts.
- Promote only decision-grade rows to `growth_inventory`.

### Phase 5 - Council Enforcement

- Block campaign rows without source, baseline, owner, metric and evaluation
  date.
- Generate rejected rows with reason.
- Keep remediation backlog separate from active experiments.

### Phase 6 - Campaign Draft Automation

Only after two successful Council cycles:

- generate campaign drafts through APIs;
- validate naming/UTMs automatically;
- require manual approval before activation;
- implement pause/kill action automation with explicit safeguards.

## Child Issue Map

Recommended child issues under #310:

| Issue title                                                  | Scope                                                                       |
| ------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Paid Measurement Contracts - Meta CAPI + Google Data Manager | Click ids, conversion identity, CAPI/import quality, privacy rules.         |
| Paid Provider Profile Registry                               | Meta/Google read-only profiles, cadence, cache target, usage accounting.    |
| Paid Fact Tables And Flutter SSOT Migrations                 | Shared paid fact schemas, RLS, idempotency and usage rows.                  |
| Paid Reporting Extractors                                    | Meta Ads Insights and Google Ads reporting dry-run/apply.                   |
| Paid Joint Normalizers                                       | Join paid, SEO, GA4, funnel and CRM facts into `growth_inventory`.          |
| Campaign Preflight And UTM Validator                         | Naming/UTM/click id/landing/tracking gate before launch.                    |
| Growth Council Paid Governance                               | Council artifact, max active experiments, budget and kill rule enforcement. |
| Offline Conversion Import Smoke                              | Google Data Manager API or fallback Google Ads API upload path.             |

## Acceptance Criteria

- #310 references this SPEC as the paid media integration contract.
- No paid campaign can be marked launch-ready without Gate 0 and Gate 1.
- Meta and Google read-only profiles have dry-run output with expected row
  counts before any campaign automation.
- Paid facts exclude raw PII and provider secrets.
- `growth_inventory` contains paid rows only when they include source,
  baseline, owner, next action, metric and evaluation date.
- Council rejects rows with missing baseline or tracking gap.
- A pilot campaign brief can be created from `growth_inventory` without new
  ad-hoc fields.
- Campaign creation remains manual until two Council cycles prove reporting,
  tracking and kill rules.

## Test Plan

- Unit/schema checks for paid fact normalizers and UTM validator.
- Dry-run Meta and Google profiles with no mutations.
- Apply read-only caches and verify created/updated/skipped/error counts.
- Run launch preflight against one Google Search draft URL and one Meta draft
  URL without activating spend.
- Smoke WAFlow to CRM request to qualified lead to quote sent to itinerary
  confirmed.
- Verify Meta CAPI dedupe and sanitized provider status.
- Verify Google conversion import path in sandbox/test mode or dry-run.
- Verify Council rejects missing source row, baseline, owner, metric or
  evaluation date.
- Verify GitHub evidence contains redacted aggregate output only.

## Open Decisions

| Decision                     | Default                                                                                                           |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Google conversion API path   | Prefer Data Manager API for new offline/enhanced conversion workflows; fallback to Google Ads API only if needed. |
| Campaign creation automation | Defer until reporting and preflight gates pass for two Council cycles.                                            |
| Active experiment cap        | Default five. More only if independent by market/channel/landing/metric and separately owned.                     |
| Wompi/Purchase               | Out of scope for this SPEC cycle. Use `booking_confirmed` / `itinerary_confirmed`.                                |
| Backlinks/LLM Mentions       | Future/blocked provider access does not block paid governance; treat as authority/AI watch rows.                  |
