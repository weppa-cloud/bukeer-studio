---
session_id: "2026-05-13-colombiatours-p0-recovery-codex"
started_at: "2026-05-13T18:00:00-05:00"
ended_at: "2026-05-13T18:00:00-05:00"
agent: "codex"
scope: "p0-recovery"
website_id: "894545b7-73ca-4dae-b76a-da5b6a3f8441"
website_slug: "colombiatours-travel"
domain: "colombiatours.travel"
initiator: "Plan P0: Recuperación SEO/CWV ColombiaTours"
outcome: "in_progress"
linked_weekly: ""
related_issues: []
---

# P0 Recovery - ColombiaTours SEO/CWV - 2026-05-13

## Freeze operativo

Estado: **activo** desde `2026-05-13` hasta `2026-05-20 23:59 America/Bogota`.

Durante el freeze no se permiten cambios estructurales en URLs, canonicals, sitemap, hreflang, locales o publicación masiva EN salvo fixes explícitos de este P0. Cambios permitidos: redirects equivalentes faltantes, canonical incorrecto, exclusión/noindex de EN débil, cache público seguro, optimización de LCP.

## Tablero diario por familias

Fuente: GSC `sc-domain:colombiatours.travel`, ventanas `2026-04-15..2026-04-28` vs `2026-04-29..2026-05-12`.

| Familia | Pre clicks / impressions | Post clicks / impressions | Estado | Owner |
|---|---:|---:|---|---|
| Home | 62 / 2,477 | 62 / 1,910 | clicks estable; CWV example URL | Tech SEO |
| Legacy root slugs | 83 / 32,461 | 10 / 2,581 | P0 migration loss | SEO Migration |
| `/blog/*` | ~3 / 2,231 | ~24 / 12,828 | gaining, not enough to offset | SEO Content |
| `en.colombiatours.travel` | 61 / 24,466 | 20 / 3,029 | P0 EN loss | EN Recovery |
| `/en/blog/*` | low pre | emerging post | mixed indexation | EN Recovery |
| Landings `/l/*` | low volume but active | low volume | monitor redirects | SEO Migration |
| Product/listing pages | fragmented | fragmented | monitor crawl and canonical | Tech SEO |

Daily readout: update this table with latest complete GSC day, then classify each family as `recovering`, `flat`, or `regressing`.

## Reconciliación inicial

| URL / family | Pre | Post | Destination / canonical seen by GSC | Inspection state | Action |
|---|---:|---:|---|---|---|
| `/` | 62 / 2,477 | 62 / 1,910 | self canonical `/` | PASS, indexed, mobile crawl `2026-05-13` | CWV/cache only |
| `/agencia-de-viajes-es-legal-en-colombia/` | 26 / 1,035 | 1 / 54 | `/blog/agencia-de-viajes-es-legal-en-colombia` | Redirect page; destination PASS/indexed | keep redirect; recrawl destination after deploy |
| `en.colombiatours.travel/` | 19 / 3,397 | 1 / 54 | `/en` | Redirect page; destination PASS/indexed | monitor EN home quality and links |
| `en/los-10-mejores-destinos...` | 5 / 3,254 | 0 / low | Google canonicalized old EN to ES `/blog/...`; `/en/blog/...` indexed | split canonical risk | review EN content/canonical equivalence |
| `en/los-10-mejores-lugares...` | 5 / 1,419 | 0 / low | old EN canonicalized to ES `/blog/...`; `/en/blog/...` discovered not indexed | P0 EN gap | review EN quality; request manual recrawl in GSC UI |
| `/10-destinos-para-visitar-con-mama/` | 12 / 270 | 0 old; `/blog` 2 / 14 | `/blog/10-destinos-para-visitar-con-mama` | old redirect; destination PASS/indexed | keep; strengthen internal links |
| `/pueblos-para-visitar-cerca-de-bucaramanga/` | 3 / 803 | `/blog` 9 / 904 | `/blog/pueblos-para-visitar-cerca-de-bucaramanga` | destination PASS/indexed | success pattern |
| `/estaciones-del-ano-en-colombia-un-pais/` | 2 / 3,841 | `/blog` 0 / 1,946 | `/blog/estaciones-del-ano-en-colombia-un-pais` | old redirect; destination PASS/indexed | watch ranking transfer |
| `/destinos-turisticos-economicos-en-colombia/` | 3 / 509 | `/blog` 1 / 111 | `/blog/destinos-turisticos-economicos-en-colombia` | old redirect; destination PASS/indexed | watch ranking transfer |
| `/aerolineas-para-viajar-a-colombia-desde-mexico/` | 2 / 1,863 | old 0 / 112; `/blog` 0 / 17 | `/blog/aerolineas-para-viajar-a-colombia-desde-mexico` | old redirect; destination PASS/indexed | P1 content/internal-link boost |
| `en/tipos-de-mamas/` | 6 / 563 | not recognized at `/en/blog/tipos-de-mamas` | old EN excluded by noindex | expected noindex | no sitemap exposure until EN restored |
| `/devolucion-de-iva-a-turistas-extranjeros/` | 5 / 150 | 1 / 60 | not inspected in this batch | pending | inspect in next batch if still top loss |

## Cambios técnicos aplicados

- Public tenant/custom-domain HTML can now receive `Cache-Control: public, max-age=0, s-maxage=300, stale-while-revalidate=86400` only when the request is GET/HEAD, has no query params, has no click IDs, sets no cookies, and returns a 2xx response.
- `/site/*` preview remains `noindex` and `private, no-store, max-age=0, must-revalidate`.
- Static image extensions including `webp` and `avif` bypass middleware routing.
- `/tenant-assets/:path*` now has immutable long cache headers.
- Editorial blog detail now serves LCP `featured_image` through `supabaseImageUrl(..., { width: 1200, quality: 74 })` when transformable.
- EN quality-blocked blog rows are filtered out of sitemap output, including translated alternates.

## GSC actions

Completed via Search Console API:

- Refreshed page-level GSC data for `2026-04-15..2026-04-28` and `2026-04-29..2026-05-12`.
- Ran URL Inspection for 20 priority URLs across home, root legacy, `/blog`, EN old host, and `/en/blog`.

Blocked / manual:

- Google Search Console API does not provide a URL recrawl request endpoint. Manual recrawl requests and CWV validation must be started in the GSC UI after deploy.

## Next 48h

1. Deploy technical cache/image/sitemap changes.
2. In GSC UI, request indexing for the destination URLs marked P0 EN gap and the top migrated ES destinations.
3. Re-run URL Inspection after deploy for:
   - `/blog/agencia-de-viajes-es-legal-en-colombia`
   - `/en/blog/los-10-mejores-lugares-turisticos-de-colombia`
   - `/blog/aerolineas-para-viajar-a-colombia-desde-mexico`
   - `/blog/estaciones-del-ano-en-colombia-un-pais`
4. Start CWV validation for mobile LCP group after production headers are verified live.

## Mutations

| Entity | Action | Source |
|---|---|---|
| Repo code | cache, sitemap, image LCP changes | Codex |
| Repo tests | middleware public cache + sitemap EN gate tests | Codex |
| GSC | read-only analytics + URL inspection | Search Console API |
| Supabase data | none | not mutated |

## External costs

| Provider | Operation | Cost USD | Notes |
|---|---:|---:|---|
| Google Search Console | analytics + URL inspection | 0.00 | connector reads |
| DataForSEO | none | 0.00 | not used |

