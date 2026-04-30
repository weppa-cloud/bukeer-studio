---
session_id: "2026-04-30-en-quality-gate-results"
date: 2026-04-30
agent: "Lane 2 — EN Quality Gate"
scope: "audit"
tenant: colombiatours.travel
website_id: 894545b7-73ca-4dae-b76a-da5b6a3f8441
epic: 310
related_issues: [314, 315]
source_backlog: "docs/growth-sessions/2026-04-30-en-quality-backlog.md"
supabase_mutations: false
status: "completed"
---

# EN Quality Gate Results — 13 `review_quality` URLs

Read-only audit of the 13 EN URLs listed in `docs/growth-sessions/2026-04-30-en-quality-backlog.md`.

## Method

- Pulled live production HTML for each URL on 2026-04-30.
- Checked HTTP status, final URL, `meta robots`, canonical, title, meta description, H1/H2 text, `html lang`, hreflang links and sitemap presence.
- Cross-checked source state against `artifacts/seo/2026-04-29-epic310-remediation-sprint/en-url-actions.csv`.
- No Supabase writes, no CMS writes and no paid provider calls.

## Executive Decision

| Classification        | Count | URLs                                                                                                                                                                                                                                                                                                                                                                              |
| --------------------- | ----: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `publishable`         |     1 | `/en/blog/asegura-tu-viaje-a-colombia`                                                                                                                                                                                                                                                                                                                                            |
| `needs_retranslation` |     8 | `/en/blog/colombia-de-los-mejores-paises-para-viajar`, `/en/blog/descubriendo-san-andres-isla-un-paraiso`, `/en/blog/explorando-colombia-armenia-quindio`, `/en/blog/la-comuna-13-en-medellin`, `/en/blog/las-50-mejores-frases-de-viajes-para-encender`, `/en/blog/san-jose-del-guaviare`, `/en/blog/viajando-con-agencias-de-viajes`, `/en/blog/viajar-por-colombia-en-15-dias` |
| `restore_from_wp_en`  |     4 | `/en/blog/boleto-de-avion-a-colombia`, `/en/blog/explora-viajes-cartagena-las-mejores-ofertas`, `/en/blog/playas-colombianas`, `/en/blog/rodrigo-de-bastidas-un-viaje-a-los-origenes`                                                                                                                                                                                             |
| `do_not_publish`      |     0 | None in this 13-row set.                                                                                                                                                                                                                                                                                                                                                          |
| `remove_or_404`       |     0 | None in this 13-row set.                                                                                                                                                                                                                                                                                                                                                          |

All 13 currently return `200`, emit `meta robots="index, follow"`, have self-canonical EN URLs, and are absent from `sitemap.xml`. All 13 have `has_wp_en=true` and `has_wp_es=true` in the exported backlog, so Spanish-majority Studio rows should be restored from the WordPress EN source rather than rebuilt from scratch.

## Per-URL Results

| URL                                                                                  | Decision              | Live technical evidence                                                                                                                                                            | Content quality evidence                                                                                                                                                                                                    | Action                                                                       |
| ------------------------------------------------------------------------------------ | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `https://colombiatours.travel/en/blog/asegura-tu-viaje-a-colombia`                   | `publishable`         | `200`; canonical self; robots `index, follow`; title `Travel Safely and Worry-Free: Insure`; meta and H1 are English; hreflang emits `es`, `en`, `x-default`; absent from sitemap. | Body is coherent EN travel-insurance content. Minor sitewide Spanish nav leakage remains (`Paquetes`, `Hoteles boutique`, etc.), but article title/meta/H1/body pass manual EN gate.                                        | Keep indexable only after sitemap/hreflang policy is corrected.              |
| `https://colombiatours.travel/en/blog/boleto-de-avion-a-colombia`                    | `restore_from_wp_en`  | `200`; canonical self; robots `index, follow`; title, meta and H1 are Spanish; absent from sitemap.                                                                                | Article body is Spanish-majority: H1 `Boleto de Avión a Colombia...`, H2 `Encontrando Vuelos Baratos a Colombia`, Spanish paragraphs. Export says `has_wp_en=true`.                                                         | Replace Studio EN content from WP EN source or hide/noindex until restored.  |
| `https://colombiatours.travel/en/blog/colombia-de-los-mejores-paises-para-viajar`    | `needs_retranslation` | `200`; canonical self; robots `index, follow`; English title/H1; absent from sitemap.                                                                                              | Mostly English body but visible quality defects: H2 `**1. Su Biodiversidad **`, typo `Lovely wheather`, ungrammatical `A Great tourist places`, malformed markdown in headings/body.                                        | Retranslate/edit before sitemap or hreflang inclusion.                       |
| `https://colombiatours.travel/en/blog/descubriendo-san-andres-isla-un-paraiso`       | `needs_retranslation` | `200`; canonical self; robots `index, follow`; English title/H1; meta description starts in Spanish; absent from sitemap.                                                          | Body is largely English and salvageable, but metadata is Spanish and there are visible spacing/quality issues such as `S an Luis Beach`. P1 backlog row.                                                                    | Fix metadata and run human EN edit before publish.                           |
| `https://colombiatours.travel/en/blog/explora-viajes-cartagena-las-mejores-ofertas`  | `restore_from_wp_en`  | `200`; canonical self; robots `index, follow`; title/H1 Spanish; meta mixed EN/ES; absent from sitemap.                                                                            | Mixed-language commercial page: `Are you planning a viajes Cartagena`, H2 `Descubre Cartagena de Indias`, phrase `vacaciones en cartagena de viaje`. Export says `has_wp_en=true`.                                          | Restore from WP EN source; keep hidden/noindex until restored.               |
| `https://colombiatours.travel/en/blog/explorando-colombia-armenia-quindio`           | `needs_retranslation` | `200`; canonical self; robots `index, follow`; English title/H1; meta description Spanish; absent from sitemap.                                                                    | Body is mostly English but needs localization polish: Spanish metadata, awkward term `Coffee Axis`, malformed bold markers and glossary issues around Coffee Region/Coffee Triangle naming.                                 | Retranslate/edit metadata and terminology.                                   |
| `https://colombiatours.travel/en/blog/la-comuna-13-en-medellin`                      | `needs_retranslation` | `200`; canonical self; robots `index, follow`; English title/H1; absent from sitemap.                                                                                              | Article body is mostly English, but visible defects remain: H2 `¿What to do in the Comuna 13?`, `Sigue` / `leyendo.`, malformed markdown `T**he`. Needs safety/context E-E-A-T review.                                      | Human EN edit plus safety/context review before publish.                     |
| `https://colombiatours.travel/en/blog/las-50-mejores-frases-de-viajes-para-encender` | `needs_retranslation` | `200`; canonical self; robots `index, follow`; English title/H1; meta description Spanish; absent from sitemap.                                                                    | Body is mostly English and readable, but metadata is Spanish. Topic intent is weak for EN-US Colombia travel demand unless tied to a language/guide strategy.                                                               | Fix metadata and keep as watch/low-priority unless demand strategy approves. |
| `https://colombiatours.travel/en/blog/playas-colombianas`                            | `restore_from_wp_en`  | `200`; canonical self; robots `index, follow`; title, meta and H1 are Spanish; absent from sitemap.                                                                                | Spanish-majority page: H1 `Descubriendo 10 Maravillosas Playas Colombianas`, H2 `Algunas de las playas colombianas más lindas`, Spanish paragraphs. Export says `has_wp_en=true`.                                           | Restore from WP EN source or hide/noindex.                                   |
| `https://colombiatours.travel/en/blog/rodrigo-de-bastidas-un-viaje-a-los-origenes`   | `restore_from_wp_en`  | `200`; canonical self; robots `index, follow`; title, meta and H1 are Spanish; absent from sitemap.                                                                                | Spanish-majority historical article: Spanish H1/H2/body throughout. Export says `has_wp_en=true`.                                                                                                                           | Restore from WP EN source or hide/noindex.                                   |
| `https://colombiatours.travel/en/blog/san-jose-del-guaviare`                         | `needs_retranslation` | `200`; canonical self; robots `index, follow`; English title/H1; meta description Spanish; absent from sitemap.                                                                    | Body mostly English, but metadata and H2 are mixed: `¿Cómo llegar a San José del Guaviare?`, `Sigue` / `leyendo.`. Destination terminology needs planner CTA polish.                                                        | Retranslate metadata/headings and edit body.                                 |
| `https://colombiatours.travel/en/blog/viajando-con-agencias-de-viajes`               | `needs_retranslation` | `200`; canonical self; robots `index, follow`; English title/H1/meta; absent from sitemap.                                                                                         | English copy is generic and contains market/product accuracy risks: says ColombiaTours packages include Ecuador and Punta Cana, which is off-intent for a Colombia agency page. Related-content snippets also leak Spanish. | Rewrite for accurate EN commercial trust page before publish.                |
| `https://colombiatours.travel/en/blog/viajar-por-colombia-en-15-dias`                | `needs_retranslation` | `200`; canonical self; robots `index, follow`; English title/H1; meta starts with Spanish phrase; absent from sitemap.                                                             | Body is mostly English but visibly low-quality: title/H1 typos `Descover`, `beautifull`; H2 `beutifull`; malformed markdown and Spanish `Sigue leyendo`.                                                                    | Retranslate/edit before publish.                                             |

## Sitemap / Hreflang Recommendation

1. Keep all `restore_from_wp_en` and `needs_retranslation` rows out of the sitemap until the corrected EN content passes manual or automated quality gate.
2. Temporarily remove EN hreflang alternates, or emit noindex, for the 12 non-publishable rows while they continue returning `200`. They currently self-canonical and `index, follow`, which lets weak EN pages be indexable even though sitemap discovery is blocked.
3. Add `/en/blog/asegura-tu-viaje-a-colombia` to the sitemap only after confirming regional hreflang output matches ADR-020 expectations: `es-CO` default URL, `en-US` EN URL and `x-default` default URL with reciprocal alternates.
4. Prefer region-specific hreflang (`en-US`, `es-CO`) over current short codes (`en`, `es`) for EN-US growth tracking and GSC market segmentation.
5. After restoring/retranslating each row, rerun this gate before adding it to sitemap or reciprocal hreflang. Passing criteria: localized title, meta description, H1/H2/body, schema/FAQ if present, EN internal links and no Spanish UI/body leakage except proper nouns.

## Mutations

| Type        | Target                                                       | Result                             |
| ----------- | ------------------------------------------------------------ | ---------------------------------- |
| Supabase    | None                                                         | No mutations performed.            |
| CMS/content | None                                                         | No mutations performed.            |
| Repo docs   | `docs/growth-sessions/2026-04-30-en-quality-gate-results.md` | Added this read-only audit report. |

## External Costs

| Provider          | Calls |  Cost |
| ----------------- | ----: | ----: |
| DataForSEO        |     0 | USD 0 |
| OpenRouter/NVIDIA |     0 | USD 0 |
