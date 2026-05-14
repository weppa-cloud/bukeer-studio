---
session_id: "2026-05-14-0850-colombiatours-12h-post-deploy-readout"
started_at: "2026-05-14T08:30:00-05:00"
ended_at: "2026-05-14T08:50:00-05:00"
agent: "codex"
scope: "p0-recovery-12h-readout"
website_id: "894545b7-73ca-4dae-b76a-da5b6a3f8441"
website_slug: "colombiatours-travel"
domain: "colombiatours.travel"
initiator: "12h post-deploy SEO/CWV check"
outcome: "watch_with_hotfix_candidates"
linked_weekly: ""
related_issues: []
---

# ColombiaTours P0 recovery - 12h post-deploy readout

## Context

- Main P0 deploy completed on `2026-05-13T18:38:31-05:00`, GitHub Actions run `25832702879`, production deploy passed.
- A newer production deploy also completed on `2026-05-14T07:55:44-05:00`, commit `8bcdeb3d`, for locale mapping.
- GSC property used: `sc-domain:colombiatours.travel`.

## GSC fresh analytics

Search Console fresh data for `2026-05-14` is still partial: only 52 total impressions at read time. It is too early to call ranking recovery from traffic.

| Date | Clicks | Impressions | CTR | Avg position |
|---|---:|---:|---:|---:|
| 2026-05-10 | 6 | 1,067 | 0.56% | 31.36 |
| 2026-05-11 | 7 | 1,014 | 0.69% | 32.04 |
| 2026-05-12 | 11 | 965 | 1.14% | 28.09 |
| 2026-05-13 | 7 | 1,076 | 0.65% | 27.08 |
| 2026-05-14 partial | 0 | 52 | 0.00% | 60.27 |

Family signals:

| Family | 2026-05-13 | 2026-05-14 partial | Read |
|---|---:|---:|---|
| Home | 6 clicks / 174 impressions | 0 / 14 | stable through 2026-05-13; partial day not useful |
| `/blog/*` | 1 / 715 | 0 / 18 | still carrying most non-home impressions |
| `/en/blog/*` | 0 / 38 | 0 / 3 | weak, not recovered |
| `en.colombiatours.travel` | 0 / 52 | 0 / 0 | old host continues to fade after redirect |
| `/en` | 0 / 23 | 0 / 8 | indexed but no early traffic signal |

## URL Inspection

Positive:

- `https://colombiatours.travel/` is indexed, self-canonical, Googlebot mobile crawl `2026-05-14T10:15:26Z`.
- `https://colombiatours.travel/blog/aerolineas-para-viajar-a-colombia-desde-mexico` is indexed, self-canonical, Googlebot mobile crawl `2026-05-14T11:07:03Z`.
- `https://colombiatours.travel/blog/estaciones-del-ano-en-colombia-un-pais` is indexed, self-canonical, Googlebot mobile crawl `2026-05-14T10:44:37Z`.
- `https://colombiatours.travel/en` is indexed, self-canonical, Googlebot mobile crawl `2026-05-14T11:29:14Z`.
- `https://en.colombiatours.travel/` is recognized as a redirect to `https://colombiatours.travel/en`.

Still not recovered:

- `https://colombiatours.travel/en/blog/los-10-mejores-lugares-turisticos-de-colombia` is still `Descubierta: actualmente sin indexar`.
- `https://colombiatours.travel/en/blog/cano-cristales-guia-de-viajes` is still `Descubierta: actualmente sin indexar`.
- `https://colombiatours.travel/en/blog/10-de-las-mejores-islas-en-colombia` is excluded by `noindex`, last crawl `2026-04-25`.
- `https://colombiatours.travel/en/blog/15-lugares-para-ir-de-vacaciones-en-colombia` is treated as a redirect/canonical to the ES blog.

## Live technical smoke

Positive:

- Public HTML now returns `Cache-Control: public, max-age=0, s-maxage=300, stale-while-revalidate=86400` on home, ES blog, `/en`, and `/paquetes`.
- Click-ID request `/?gclid=SMOKE` correctly returns `private, no-cache, no-store, max-age=0, must-revalidate`.
- Legacy root `/agencia-de-viajes-es-legal-en-colombia/` has one 301 to `/blog/agencia-de-viajes-es-legal-en-colombia`, then 200, canonical to destination.
- Lab mobile via Playwright is healthy for sampled templates:
  - Home LCP about `988ms`, LCP element `home-hero-cartagena-lcp.webp`, CLS `0`.
  - `/en` LCP about `396ms`, CLS `0`.
  - `/paquetes` LCP about `1600ms`, CLS `0`.
  - ES blog sample LCP about `1932ms`, CLS `0`.

Watch / hotfix candidates:

- `sitemap-en-US.xml` still exposes EN blog URLs that are `noindex`, 404, redirect, or discovered-not-indexed:
  - `/en/blog/10-de-las-mejores-islas-en-colombia`
  - `/en/blog/15-lugares-para-ir-de-vacaciones-en-colombia`
  - `/en/blog/cano-cristales-guia-de-viajes`
  - `/en/blog/los-10-mejores-lugares-turisticos-de-colombia`
- `/en/blog/los-10-mejores-lugares-turisticos-de-colombia` is live 200 but has `robots=noindex` while it remains in `sitemap-en-US.xml`.
- `/en/blog/10-de-las-mejores-islas-en-colombia` is live 404/noindex while it remains in `sitemap-en-US.xml`.
- `/l/city-tour-bogota/` has a two-hop chain to `/activities/...` then `/actividades/...`, final page is a 200 HTML not-found with `noindex, follow`. This should be fixed or removed from any organic surface.
- Tenant LCP asset `https://colombiatours.travel/tenant-assets/colombiatours/home-hero-cartagena-lcp.webp` is Cloudflare HIT but still returns `Cache-Control: public, max-age=0, must-revalidate`, not immutable.
- ES blog sample still uses direct Supabase JPG as LCP instead of transformed `/render/image` URL, so the blog LCP mitigation is not active for that sample.

## CWV read

No reliable field-CWV improvement can be claimed after 12 hours:

- GSC grouped CWV is field/CrUX based and lags.
- PageSpeed Insights API is still quota-blocked.
- Lab mobile currently looks better than the GSC mobile poor group, consistent with the prior diagnosis: the field issue is slower-device/network population plus caching/image behavior, not an always-reproducible lab failure.

## Decision

Status: **partial technical improvement, no traffic recovery proof yet**.

Google has recrawled several critical URLs and canonical/indexing on ES destinations is improving. The largest unresolved risk is EN sitemap/indexability inconsistency plus incomplete asset/image cache behavior.

## Recommended next actions

1. Hotfix `sitemap-en-US.xml` generation so no URL with live `noindex`, 404, or ES canonical is exposed.
2. Fix `/l/city-tour-bogota/` to one-hop equivalent destination or remove it from organic surfaces if no equivalent exists.
3. Fix immutable headers for actual tenant assets under `/tenant-assets/colombiatours/*`.
4. Extend blog LCP transform to the actual rendered blog detail path; sampled ES blog still renders direct Supabase JPG.
5. In GSC UI, request indexing for ES destination pages already PASS/indexed only after sitemap EN inconsistency is fixed; keep EN recrawl paused until quality/noindex/sitemap conflict is resolved.
6. Re-read GSC on `2026-05-15` after a full post-deploy day lands.

## Mutations

| Entity | Action | Source |
|---|---|---|
| GSC | read analytics and URL inspection | Search Console API |
| Live site | HTTP/header/sitemap/lab checks | curl + Playwright |
| Repo data | session log only | Codex |
| Supabase data | none | not mutated |

## External costs

| Provider | Operation | Cost USD | Notes |
|---|---:|---:|---|
| Google Search Console | analytics + URL inspection | 0.00 | connector reads |
| PageSpeed Insights | attempted mobile PSI | 0.00 | quota blocked |
| DataForSEO | none | 0.00 | not used |
