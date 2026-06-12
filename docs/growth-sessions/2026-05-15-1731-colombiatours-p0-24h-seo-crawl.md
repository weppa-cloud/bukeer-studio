---
session_id: "2026-05-15-1731-codex"
started_at: "2026-05-15T17:31:00-05:00"
ended_at: "2026-05-15T17:41:00-05:00"
agent: "codex"
scope: "growth-ops"
website_id: "894545b7-73ca-4dae-b76a-da5b6a3f8441"
website_slug: "colombiatours-travel"
initiator: "heartbeat colombiatours-p0-48h-seo-crawl"
outcome: "completed-interim"
linked_weekly: ""
related_issues: []
---

# Session growth-ops - colombiatours-travel - 2026-05-15 17:31

## Intent

Run an interim ColombiaTours P0 SEO crawl follow-up for `sc-domain:colombiatours.travel` and website `894545b7-73ca-4dae-b76a-da5b6a3f8441`, covering repaired URL families, redirects, canonicals, robots, sitemaps, `brain-content-publish` cleanup, cache-bust canonicalization, EN quality-gate exclusions, and available GSC/GA4 facts.

This heartbeat fired roughly 24 hours after the May 14 deploy follow-up, before the intended 48-hour recrawl window. I treated it as an interim cut and kept a final 48-hour follow-up as still useful.

## Executive read

- Production fixes are live and coherent for the main P0 items: old `/blog/brain-content-publish-*` variants redirect in one hop, `/l/city-tour-bogota/` redirects in one hop, `?nocache=` is stripped while preserving click IDs/UTMs, and HTML/cache headers remain correct.
- GSC is still stale for the two expected URLs: old brain URL last crawled `2026-05-09`, `/l/city-tour-bogota/` last crawled `2026-04-13`. Both now need recrawl, not more code in the already-fixed paths.
- `sitemap-es-CO.xml` is no longer a live fetch problem in this check: it returned `200 application/xml` in `1.8s`, and the GSC Sitemaps API reports `0` errors with last download `2026-05-15T12:08:16Z`.
- New residual issue found: submitted `pt-PT`, `fr-FR`, `de-DE`, and `pt-BR` sitemaps return HTML `200` instead of XML and GSC reports `1` error each. Separately, `/pt`, `/fr`, and `/de` are indexable with Spanish titles/content signals and are emitted as hreflang alternates from `sitemap.xml`.
- Analytics remains restored. GA4 property `294486074` returned pageview data for home, blog, paquetes, actividades, and EN for `2026-05-14` to `2026-05-15`.

## Production live crawl

Checked at `2026-05-15T22:34:38Z`.

| Family | URL | Live result | Canonical / robots | Cache |
|---|---|---|---|---|
| home | `/` | `200`, no redirect | canonical `https://colombiatours.travel`, `index, follow` | public HTML SWR |
| cache-bust | `/?nocache=1&gclid=SMOKE&utm_source=heartbeat` | one `301` to `/?gclid=SMOKE&utm_source=heartbeat`, then `200` | canonical clean root, `index, follow` | final response `private, no-store` |
| blog top | `/blog/los-10-mejores-lugares-turisticos-de-colombia` | `200`, no redirect | canonical self, `index, follow` | public HTML SWR |
| brain old | `/blog/brain-content-publish-viajes-personalizados-por-colombia-449e53c4` | one `301` to clean slug, then `200` | canonical clean slug, `index, follow` | public HTML SWR |
| brain clean | `/blog/viajes-personalizados-por-colombia` | `200`, no redirect | canonical self, `index, follow` | public HTML SWR |
| paquetes | `/paquetes` | `200`, no redirect | canonical self, `index, follow` | public HTML SWR |
| activity detail | canonical city-tour activity | `200`, no redirect | canonical self, `index, follow` | public HTML SWR |
| landing old | `/l/city-tour-bogota/` | one `301` to city-tour activity, then `200` | canonical activity, `index, follow` | public HTML SWR |
| landing Bora Bora | `/l/isla-bora-bora/` | one `301` to Bora Bora blog, then `200` | canonical blog, `index, follow` | public HTML SWR |
| Bora Bora cache-bust | blog Bora Bora `?nocache=1&gclid=SMOKE` | one `301` stripping only `nocache`, then `200` | canonical clean blog, `index, follow` | final response `private, no-store` |
| IVA ES | `/blog/devolucion-de-iva-a-turistas-extranjeros` | `200`, no redirect | canonical self, `index, follow` | public HTML SWR |
| IVA EN | `/en/blog/devolucion-de-iva-a-turistas-extranjeros` | `200`, no redirect | canonical self, `noindex, follow` | public HTML SWR |
| EN home | `/en` | `200`, no redirect | canonical self, `index, follow` | public HTML SWR |
| EN blog | `/en/blog` | `200`, no redirect | canonical self, `index, follow` | public HTML SWR |

Tenant asset cache also remains correct:

- `/tenant-assets/colombiatours/home-hero-cartagena-lcp.webp`: `200 image/webp`, `Cache-Control: public,max-age=31536000,immutable`.

## Sitemap checks

Checked at `2026-05-15T22:34:30Z`.

| Sitemap | Live status | Loc count | Key checks |
|---|---:|---:|---|
| `/sitemap.xml` | `200 application/xml`, `4.4s`, 510,896 bytes | 733 | no `brain-content-publish`; includes clean brain, IVA ES, city-tour activity; excludes IVA EN and old city landing |
| `/sitemap_index.xml` | `200 application/xml`, `62ms` | 3 | lists `/sitemap.xml`, `/sitemap-es-CO.xml`, `/sitemap-en-US.xml` |
| `/sitemap-es-CO.xml` | `200 application/xml`, `1.8s`, 438,953 bytes | 582 | no `brain-content-publish`; includes clean brain, IVA ES, city-tour activity |
| `/sitemap-en-US.xml` | `200 application/xml`, `1.1s`, 307,058 bytes | 387 | excludes IVA EN and `brain-content-publish`; includes city-tour activity alternate |
| `/sitemap-pt-PT.xml` | `200 text/html`, 83,046 bytes | 0 | GSC submitted sitemap error remains valid |
| `/sitemap-fr-FR.xml` | `200 text/html`, 82,838 bytes | 0 | GSC submitted sitemap error remains valid |
| `/sitemap-de-DE.xml` | `200 text/html`, 82,838 bytes | 0 | GSC submitted sitemap error remains valid |
| `/sitemap-pt-BR.xml` | `200 text/html`, 82,838 bytes | 0 | GSC submitted sitemap error remains valid |

Robots live:

- `/robots.txt`: `200 text/plain`; advertises `/sitemap.xml`, `/sitemap_index.xml`, `/sitemap-es-CO.xml`, and `/sitemap-en-US.xml`.

GSC Sitemaps API at `2026-05-15T22:37:47Z`:

| Submitted sitemap | Last downloaded | Errors | Warnings | Submitted |
|---|---|---:|---:|---:|
| `/sitemap.xml` | `2026-05-15T11:53:06Z` | 0 | 0 | 738 |
| `/sitemap-es-CO.xml` | `2026-05-15T12:08:16Z` | 0 | 0 | 582 |
| `/sitemap-en-US.xml` | `2026-05-15T13:50:57Z` | 0 | 0 | 387 |
| `/sitemap_index.xml` | `2026-05-14T01:12:13Z` | 0 | 0 | 1707 |
| `/sitemap-pt-PT.xml` | `2026-05-15T14:33:07Z` | 1 | 0 | n/a |
| `/sitemap-fr-FR.xml` | `2026-05-15T15:30:15Z` | 1 | 0 | n/a |
| `/sitemap-de-DE.xml` | `2026-05-15T17:04:28Z` | 1 | 0 | n/a |
| `/sitemap-pt-BR.xml` | `2026-05-15T14:30:40Z` | 1 | 0 | n/a |

## GSC URL Inspection facts

Pulled at `2026-05-15T22:37:09Z` through the tenant Google integration, site `sc-domain:colombiatours.travel`.

| URL | GSC verdict/state | Google canonical | Sitemap | Last crawl | Read |
|---|---|---|---|---|---|
| old brain `/blog/brain-content-publish-viajes-personalizados-por-colombia-449e53c4` | `PASS` / Submitted and indexed | old brain URL | none | `2026-05-09T09:03:36Z` | stale; production now 301s to clean slug |
| clean brain `/blog/viajes-personalizados-por-colombia` | `PASS` / Submitted and indexed | clean slug | `/sitemap.xml`, `/sitemap_index.xml` | `2026-05-14T18:00:37Z` | healthy |
| clean brain `?nocache=1` | `NEUTRAL` / URL unknown to Google | none | none | none | healthy; query variant not recognized |
| old city landing `/l/city-tour-bogota/` | `PASS` / Submitted and indexed | old landing URL | none | `2026-04-13T04:29:26Z` | stale; production now 301s to activity |
| city-tour activity destination | `PASS` / Submitted and indexed | activity URL | `/sitemap.xml`, `/sitemap_index.xml` | `2026-05-15T07:09:11Z` | healthy and freshly crawled |
| IVA EN | `PASS` / Submitted and indexed | EN IVA URL | none | `2026-04-25T08:04:14Z` | stale; live page is now `noindex, follow` and absent from sitemap |
| IVA ES | `PASS` / Submitted and indexed | ES IVA URL | `/sitemap.xml`, `/sitemap_index.xml` | `2026-05-15T21:30:40Z` | healthy; P1 content refresh remains |
| `/l/isla-bora-bora/` | `NEUTRAL` / Page with redirect | Bora Bora blog URL | none | `2026-05-08T19:31:47Z` | coherent |
| Bora Bora `?nocache=1` | `NEUTRAL` / URL unknown to Google | none | none | none | healthy; query variant not recognized |
| `/en` | `PASS` / Submitted and indexed | `/en` | `/sitemap-en-US.xml`, `/sitemap_index.xml` | `2026-05-14T20:35:15Z` | healthy |
| `/en/blog` | `PASS` / Submitted and indexed | `/en/blog` | `/sitemap-en-US.xml`, `/sitemap_index.xml` | `2026-05-15T07:47:19Z` | healthy |

## Analytics facts

Checked at `2026-05-15T22:36:01Z`.

`websites.analytics` remains restored:

- `ga4_id=G-6ET7YRM7NS`
- `gtm_id=GTM-KM6HDBN`
- `google_ads_id=AW-852643280`
- `facebook_pixel_id=361881980826384`
- `clarity_project_id=tj1pmavijv`

GA4 property `294486074`, date range `2026-05-14` to `2026-05-15`, returned rows for critical families:

| Family | Views in returned rows |
|---|---:|
| home `/` | 32 |
| `/blog` | 75 |
| `/paquetes` | 8 |
| `/actividades` | 7 |
| `/en` and `/en/*` | 189 |
| old `brain-content-publish` paths | 0 |
| `nocache` paths | 0 |

Additional GA4 signal: `/en/packages/non-existent-slug` had 14 views. Live check returns `200` with `noindex, follow`, title `Paquete no encontrado | ColombiaTours.Travel`, and no canonical. This is not indexable, but should become a real 404 to clean crawl and analytics noise.

## New residual findings

### P0 - Locale sitemap/hreflang pollution beyond EN

The current fix focused on EN quality gates, but live `sitemap.xml` still emits hreflang alternates for `pt-PT`, `fr-FR`, and `de-DE` at scale:

- `hreflang="pt-PT"` count in `/sitemap.xml`: 221
- `hreflang="fr-FR"` count in `/sitemap.xml`: 222
- `hreflang="de-DE"` count in `/sitemap.xml`: 222

Live locale roots are indexable while carrying Spanish title/content signals:

| URL | Live status | Canonical | Robots | Title |
|---|---:|---|---|---|
| `/pt` | 200 | `/pt` | `index, follow` | `Colombia Tours Travel | Tours Personalizados` |
| `/fr` | 200 | `/fr` | `index, follow` | `Colombia Tours Travel | Tours Personalizados` |
| `/de` | 200 | `/de` | `index, follow` | `Colombia Tours Travel | Tours Personalizados` |
| `/pt/blog` | 200 | `/pt/blog` | `index, follow` | `Blog | ColombiaTours.Travel` |
| `/fr/blog` | 200 | `/fr/blog` | `index, follow` | `Blog | ColombiaTours.Travel` |
| `/de/blog` | 200 | `/de/blog` | `index, follow` | `Blog | ColombiaTours.Travel` |

Action: extend the locale quality gate beyond EN. Do not emit unsupported locale hreflang alternates or submitted sitemaps unless the locale has approved translated content. Set unsupported locale pages to `noindex` or route them to equivalent supported locale behavior.

### P0 - Root-level brain URLs are noindex 200, not 301

The repaired `/blog/brain-content-publish-*` variants redirect correctly, including the GSC-referring `212267d1` variant. Root-level variants still render a noindex not-found shell with `200`:

- `/brain-content-publish-viajes-personalizados-por-colombia-449e53c4`: `200`, `noindex, follow`, no canonical
- `/brain-content-publish-viajes-personalizados-por-colombia-212267d1`: `200`, `noindex, follow`, no canonical
- `/brain-content-publish-viajes-personalizados-por-colombia`: `200`, `noindex`, no canonical

Action: add a generic exact/pattern redirect for root-level `brain-content-publish-*` URLs to the clean blog slug when a semantic match exists; otherwise return a real 404. For this known viajes-personalizados cluster, use one-hop 301 to `/blog/viajes-personalizados-por-colombia`.

### P1 - Not-found product/package pages should return 404

`/en/packages/non-existent-slug` is not indexable, but returns `200`. Action: make product/package/activity not-found states return HTTP 404 with `noindex`, preserving the branded not-found UI.

## Prioritized next actions

1. In GSC UI, request recrawl/validate live for `/l/city-tour-bogota/` and old `/blog/brain-content-publish-viajes-personalizados-por-colombia-449e53c4`. Do not request indexing for EN IVA; the desired outcome is deindexing.
2. Implement unsupported-locale cleanup: remove submitted `pt/fr/de/pt-BR` sitemaps or make them real XML only when valid; remove unsupported hreflang alternates from XML; set unsupported locale pages to `noindex` or supported canonical behavior.
3. Add root-level `brain-content-publish-*` cleanup for known semantic matches and return real 404/noindex for unknown brain slugs.
4. Convert package/activity not-found shells from `200 noindex` to real `404 noindex`.
5. Keep the final 48-hour follow-up active to confirm GSC last-crawl timestamps move from stale values after Google recrawls.

## External costs

| Provider | Operation | Cost USD | Notes |
|---|---|---:|---|
| none | live HTTP, GSC API, GA4 Data API | 0.00 | No paid provider calls made |

## Self-review

The main P0 deploy remains healthy in production. The most important unhandled risk is not the original `/sitemap-es-CO.xml` warning; GSC now reports it healthy. The bigger residual is unsupported locale exposure through submitted broken sitemaps and hreflang alternates, which can keep producing weak international index signals if not cleaned next.
