# EPIC #310 Max Performance Monthly Sprint

Date: 2026-04-30
Scope: #310, #311, #321, #378-#385
Status: PASS-WITH-WATCH

## Outcome

The Growth OS Max Performance Matrix moved from a blocked implementation state to an operational `WATCH` state:

- Core health: PASS.
- Max Matrix health: WATCH, with 0 blocked runnable weekly profiles.
- Registry coverage: 45 profiles, 8 implemented, 35 partial, 2 excluded/watch.
- First-party caches refreshed with expanded GSC and GA4 profile coverage.
- DataForSEO paid smoke executed and logged in `seo_provider_usage`.
- Joint normalizers promoted 5 Council-ready `growth_inventory` rows.
- Council enforcement now approves at most 5 active rows and keeps incomplete rows blocked.

## Provider Evidence

### GSC

Expanded apply smoke ran with `--expanded --locale --ga4-compatibility-smoke --max-pages=1`.

- Existing council pulls remained live: query/page, page/country, page/device, date/page.
- `searchAppearance` standalone discovery returned 2 rows.
- `page_search_appearance` remains WATCH because the combined page/searchAppearance query is rejected by GSC.
- New profile rows persisted in `growth_gsc_cache`:
  - `gsc_daily_complete_web_v1`: live, 0 rows for 2026-04-29.
  - `gsc_daily_complete_image_v1`: live, 0 rows for 2026-04-29.
  - `gsc_locale_path_v1`: live, 208 rows.
  - `gsc_brand_nonbrand_v1`: brand 236 rows, non-brand 14553 rows.

### GA4

GA4 compatibility smoke produced PASS/WATCH per dimension set:

- PASS: landing/channel existing 28d, device/landing, hostname/locale, internal search, file/outbound engagement.
- WATCH: daily landing/channel, page/source-medium, event/page, campaign/source-medium, geo/landing need compatibility adjustment or metric fallback.

### DataForSEO

Paid smoke used run tag `epic310-max-matrix-smoke-20260430`.

- Profiles attempted: 11.
- Calls executed: 10.
- Complete calls: 7.
- Provider errors: 3.
- Failed calls: 0.
- Cost logged: USD 0.56186.

PASS:

- Labs demand cluster.
- Labs competitor visibility.
- Labs gap/intersections.
- SERP priority keyword.
- SERP local pack.
- Content Analysis brand sentiment.
- Domain Analytics WHOIS baseline.

WATCH:

- Backlinks authority and competitor gap require DataForSEO backlinks subscription.
- Business Data local query returned no search results for the initial query.
- Reviews skipped until Google CID is provided.

### Joint Normalizers

`run-growth-joint-normalizers.mjs --apply true` read GSC, GA4, funnel and Meta CAPI evidence and updated only existing `growth_inventory` rows.

- Candidates: 275.
- Council-ready: 275.
- Promoted: 5.
- Updated: 5.
- Skipped: 0.

Council enforcement result:

- Status: PASS-WITH-WATCH.
- Approved active: 5.
- Blocked: 45 incomplete rows.
- Rejected: 0.

## Remaining WATCH Items

- GA4 metric/dimension compatibility must be refined for the failing expanded profiles.
- DataForSEO backlinks requires subscription activation.
- Business Data local profile needs a more precise listing query or approved Google CID.
- Reviews profile needs `--reviewCid`.
- Future facts tables still require Flutter/SSOT migrations before moving from cache/artifact metadata to normalized facts.

## Operating Rule

The monthly sprint now follows:

`provider raw/cache -> normalized facts or controlled metadata -> joint facts -> growth_inventory -> Council`

The Council can activate 5 or fewer experiments. All other rows remain backlog unless they have source row, baseline, owner, success metric and evaluation date.
