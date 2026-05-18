---
session_id: "2026-05-17-0828-codex"
started_at: "2026-05-17T08:28:00-05:00"
ended_at: "2026-05-17T08:46:00-05:00"
agent: "codex"
scope: "growth-ops"
website_id: "894545b7-73ca-4dae-b76a-da5b6a3f8441"
website_slug: "colombiatours-travel"
initiator: "Run the final ColombiaTours P0 SEO crawl follow-up"
outcome: "completed-with-gsc-oauth-blocker"
linked_weekly: ""
related_issues: []
---

# Session growth-ops - colombiatours-travel - 2026-05-17 08:28

## Intent

Run the final 48-hour ColombiaTours P0 SEO crawl follow-up for `sc-domain:colombiatours.travel` and website `894545b7-73ca-4dae-b76a-da5b6a3f8441`. Validate production redirects, canonicals, robots, sitemaps, cache-bust query cleanup, `brain-content-publish` removal, EN quality gates, unsupported locale exposure, and available GSC/GA4 facts.

## Session readiness

- OKR scope: ColombiaTours 30D organic clicks target ES `6,000`, EN `600`; technical SEO final reads expected at day 7 and day 28.
- Budget: no paid provider calls used. DataForSEO waived for ColombiaTours beta; OpenRouter/NVIDIA NIM remains `0%`.
- MCP/API availability:
  - GA4 MCP reachable: property `properties/294486074`, `ColombiaTours - GA4`, timezone `America/Bogota`, currency `USD`.
  - Google Ads links visible through GA4 MCP.
  - Search Console MCP URL Inspection/Search Analytics was not exposed in this session.
  - Direct stored Google OAuth refresh tokens for GSC and GA4 now fail with `invalid_grant`; token expiry in DB is `2026-05-10`, refresh token appears expired/revoked.

## Executive read

- The original P0 production fixes are still live:
  - `/blog/brain-content-publish-*` variants checked redirect in one hop to `/blog/viajes-personalizados-por-colombia`.
  - `/l/city-tour-bogota/` redirects in one hop to the city-tour activity canonical.
  - `?nocache=` is stripped by 301 while preserving `gclid`/UTM parameters, and final click-ID responses remain private/no-store.
  - `sitemap.xml`, `sitemap_index.xml`, `sitemap-es-CO.xml`, and `sitemap-en-US.xml` return valid XML and do not expose `brain-content-publish` or EN IVA.
- GSC fresh URL Inspection could not be pulled at this final cut because the tenant Google integration token is revoked/expired. This is a P0 observability issue: reconnect Search Console/GA4 OAuth before relying on Studio API readouts.
- The largest remaining SEO technical risk is unsupported locale exposure:
  - `/sitemap-pt-PT.xml`, `/sitemap-fr-FR.xml`, `/sitemap-de-DE.xml`, and `/sitemap-pt-BR.xml` return HTML `200`, not XML.
  - Main submitted sitemaps still emit hundreds of `pt-PT`, `fr-FR`, and `de-DE` hreflang alternates.
  - `/pt`, `/fr`, `/de`, `/pt/blog`, `/fr/blog`, and `/de/blog` are live `index, follow`.
- Secondary cleanup remains: root-level `brain-content-publish-*` URLs and package/product not-found shells return `200 noindex`; they should become real `301` or `404 noindex`.

## Production live crawl

Checked at `2026-05-17T13:30:08Z`.

| Family | URL | Result | Canonical / robots | Read |
|---|---|---:|---|---|
| home | `/` | `200`, 0 redirects | canonical root, `index, follow` | OK |
| cache-bust | `/?nocache=1&gclid=SMOKE&utm_source=final48h` | one `301`, final `200` | canonical root, `index, follow` | OK; final cache is private/no-store |
| legacy root | `/cuanto-cuesta-viajar-a-colombia` | `200`, 0 redirects | canonical self, `index, follow` | OK, but title is mixed EN/ES |
| legacy root | `/cartagena` | `200`, 0 redirects | canonical self, `index, follow` | Needs content/title review: title is `Colombia Tours post migration` |
| legacy root | `/agencia-de-viajes-a-colombia-para-mexicanos` | `200`, 0 redirects | canonical self, `index, follow` | OK |
| blog index | `/blog` | `200`, 0 redirects | canonical self, `index, follow` | OK |
| blog top | `/blog/los-10-mejores-lugares-turisticos-de-colombia` | `200`, 0 redirects | canonical self, `index, follow` | OK |
| brain old | `/blog/brain-content-publish-viajes-personalizados-por-colombia-449e53c4` | one `301`, final clean slug | canonical clean slug, `index, follow` | OK |
| brain old | `/blog/brain-content-publish-viajes-personalizados-por-colombia-212267d1` | one `301`, final clean slug | canonical clean slug, `index, follow` | OK |
| brain clean | `/blog/viajes-personalizados-por-colombia` | `200`, 0 redirects | canonical self, `index, follow` | OK |
| root brain | `/brain-content-publish-viajes-personalizados-por-colombia-449e53c4` | `200`, 0 redirects | no canonical, `noindex` | Residual: should be 301 to clean blog slug or real 404 |
| paquetes | `/paquetes` | `200`, 0 redirects | canonical self, `index, follow` | OK |
| package not found | `/en/packages/non-existent-slug` | `200`, 0 redirects | no canonical, `noindex, follow` | Residual: should be HTTP 404 |
| activity detail | canonical city-tour activity | `200`, 0 redirects | canonical self, `index, follow` | OK |
| old landing | `/l/city-tour-bogota/` | one `301`, final city-tour activity | canonical activity, `index, follow` | OK live; still needs GSC recrawl confirmation |
| old landing | `/l/isla-bora-bora/` | one `301`, final blog | canonical Bora Bora blog, `index, follow` | OK |
| cache-bust blog | Bora Bora blog `?nocache=1&gclid=SMOKE` | one `301`, strips only `nocache` | canonical clean blog, `index, follow` | OK; final cache private/no-store |
| IVA ES | `/blog/devolucion-de-iva-a-turistas-extranjeros` | `200`, 0 redirects | canonical self, `index, follow` | OK; P1 content refresh remains |
| IVA EN | `/en/blog/devolucion-de-iva-a-turistas-extranjeros` | `200`, 0 redirects | canonical self, `noindex, follow` | OK live; still needs GSC deindex recrawl confirmation |
| EN home | `/en` | `200`, 0 redirects | canonical self, `index, follow` | Improved title now EN |
| EN blog | `/en/blog` | `200`, 0 redirects | canonical self, `index, follow` | OK |

Tenant LCP asset:

- `/tenant-assets/colombiatours/home-hero-cartagena-lcp.webp`: `200 image/webp`, `Cache-Control: public,max-age=31536000,immutable`.

## Sitemap checks

Checked at `2026-05-17T13:29:54Z`.

| Sitemap | Status | Type | Locs | Key checks |
|---|---:|---|---:|---|
| `/robots.txt` | 200 | text/plain | 0 | Advertises core sitemap set; OK |
| `/sitemap.xml` | 200 | application/xml | 733 | `brain=0`, `ivaEn=0`, clean brain and city activity present |
| `/sitemap_index.xml` | 200 | application/xml | 3 | Lists `/sitemap.xml`, `/sitemap-es-CO.xml`, `/sitemap-en-US.xml` |
| `/sitemap-es-CO.xml` | 200 | application/xml | 582 | `brain=0`, `ivaEn=0`, clean brain and city activity present |
| `/sitemap-en-US.xml` | 200 | application/xml | 387 | `brain=0`, `ivaEn=0`, city activity alternate present |
| `/sitemap-pt-PT.xml` | 200 | text/html | 0 | Broken submitted sitemap surface |
| `/sitemap-fr-FR.xml` | 200 | text/html | 0 | Broken submitted sitemap surface |
| `/sitemap-de-DE.xml` | 200 | text/html | 0 | Broken submitted sitemap surface |
| `/sitemap-pt-BR.xml` | 200 | text/html | 0 | Broken submitted sitemap surface |

Unsupported locale hreflang still emitted:

| Sitemap | `pt-PT` alternates | `fr-FR` alternates | `de-DE` alternates |
|---|---:|---:|---:|
| `/sitemap.xml` | 221 | 222 | 222 |
| `/sitemap-es-CO.xml` | 216 | 216 | 216 |
| `/sitemap-en-US.xml` | 221 | 221 | 221 |

## Unsupported locale exposure

Checked at `2026-05-17T13:30:08Z`.

| URL | Status | Canonical | Robots | Title |
|---|---:|---|---|---|
| `/pt` | 200 | `/pt` | `index, follow` | `ColombiaTours.Travel | Viagens personalizadas pela Colombia` |
| `/fr` | 200 | `/fr` | `index, follow` | `ColombiaTours.Travel | Voyages sur mesure en Colombie` |
| `/de` | 200 | `/de` | `index, follow` | `ColombiaTours.Travel | Massgeschneiderte Kolumbienreisen` |
| `/pt/blog` | 200 | `/pt/blog` | `index, follow` | `Blog | ColombiaTours.Travel` |
| `/fr/blog` | 200 | `/fr/blog` | `index, follow` | `Blog | ColombiaTours.Travel` |
| `/de/blog` | 200 | `/de/blog` | `index, follow` | `Blog | ColombiaTours.Travel` |

Interpretation: titles improved versus the 24h interim for locale home pages, but the locale system is still exposed without valid locale XML sitemaps and with broad hreflang emission. This should not stay indexable unless the content quality gate is intentionally passed for each locale.

## GSC / GA4 facts

### Search Console

Fresh URL Inspection, Sitemaps API, and Search Analytics API reads failed at this final run:

- Error: `invalid_grant`
- Message: `Token has been expired or revoked.`
- Stored `seo_gsc_credentials.token_expiry`:
  - `gsc`: `2026-05-10T10:15:16.769+00:00`
  - `ga4`: `2026-05-10T10:15:36.638+00:00`
- Last credential updates: `2026-05-10`.

Impact: I could not verify whether Google recrawled the stale URLs after the 48h window. The latest known URL Inspection facts remain the 24h interim:

- old brain URL still indexed, last crawl `2026-05-09`
- `/l/city-tour-bogota/` still indexed, last crawl `2026-04-13`
- EN IVA still indexed but absent from sitemap, live `noindex`
- `/sitemap-es-CO.xml` already looked healthy by live curl and GSC Sitemaps API during the 24h interim

### GA4

GA4 MCP admin was reachable:

- Property: `properties/294486074`
- Display name: `ColombiaTours - GA4`
- Timezone: `America/Bogota`
- Currency: `USD`
- Google Ads links still present, including customer IDs `1261189646`, `2511163613`, `9732379777`, `5983579164`, `6805130000`, `3001104549`, and `9378795199`.

GA4 MCP funnel read for `2026-05-15` to `2026-05-17`:

- Any `page_view`: `482` active users
- Top page breakdown sample:
  - `/agencia-de-viajes-a-colombia-para-mexicanos`: 72 active users
  - `/en/colombia-travel-packages`: 38
  - `/agencia-de-viajes-a-colombia-para-espanoles`: 33
  - `/`: 23
  - `/eje-cafetero`: 19

Website analytics config remains intact in `websites.analytics`:

- `ga4_id=G-6ET7YRM7NS`
- `gtm_id=GTM-KM6HDBN`
- `google_ads_id=AW-852643280`
- `facebook_pixel_id=361881980826384`
- `clarity_project_id=tj1pmavijv`

## Prioritized residual actions

1. P0: reconnect ColombiaTours Google OAuth integration for GSC/GA4 in Studio. The site tracking is configured, but the operational API token used for Search Console/GA4 reads is expired/revoked. Without this, we cannot confirm recrawl or automate the day-7/day-28 technical SEO reads.
2. P0: fix unsupported locale sitemap/hreflang exposure generically in the multitenant SEO layer. Either generate valid XML only for approved locales, or remove submitted `pt/fr/de/pt-BR` surfaces and suppress unsupported hreflang alternates. Do not leave HTML `200` at sitemap URLs.
3. P0/P1: decide locale indexability policy for `/pt`, `/fr`, `/de` and their blogs. If content is not quality-gated as translated, set `noindex` or canonicalize to supported locale equivalents until content passes.
4. P1: convert root-level `brain-content-publish-*` semantic matches to one-hop 301s and unknown matches to real 404/noindex. The `/blog/*` cluster is fixed; root-level not-found shells still return `200 noindex`.
5. P1: convert product/package/activity not-found shells from `200 noindex` to HTTP `404 noindex`, preserving UI. Example: `/en/packages/non-existent-slug`.
6. P1: review legacy root title quality for `/cartagena` and `/cuanto-cuesta-viajar-a-colombia`; live canonicals are clean, but titles still carry migration/mixed-language signals.
7. Manual GSC UI after OAuth reconnect: inspect/request live validation for old brain URL, `/l/city-tour-bogota/`, EN IVA, and unsupported locale sitemap errors.

## Mutations

| Entity | Action | Notes |
|---|---|---|
| none | none | Read-only crawl/API/log session |

## External costs

| Provider | Operation | Cost USD | Notes |
|---|---|---:|---|
| none | live HTTP, Supabase read, GA4 MCP admin/funnel | 0.00 | No paid provider calls made |

## Decisions / trade-offs

- I did not attempt to mutate Search Console submissions or Supabase data. This was a final readout and residual action pass.
- I did not use browser UI for Search Console because the API credential failure is itself actionable and there was no Search Console MCP surface exposed in this session.
- Unsupported locales are treated as technical SEO P0 because they can keep polluting hreflang/indexability signals across otherwise repaired ES/EN pages.

## Outputs delivered

- Production crawl facts for home, legacy root slugs, blog, paquetes, activity detail, EN, EN blog, landings, cache-bust URLs, unsupported locales, and not-found shells.
- Sitemap validation for core and submitted locale sitemaps.
- GA4 MCP admin/funnel facts and analytics DB config check.
- Residual action queue.

## Self-review

The production P0 repairs held through the 48-hour window. The blocker is not the deployed SEO behavior for the repaired URLs; it is the lack of fresh GSC API visibility due revoked OAuth and the still-open unsupported-locale surface. Fix those before treating the migration recovery as stable.
