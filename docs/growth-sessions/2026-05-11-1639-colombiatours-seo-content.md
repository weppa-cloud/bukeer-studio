---
session_id: "2026-05-11-1639-colombiatours-seo-content"
date: 2026-05-11
agent: "Codex"
scope: "content-base"
tenant: colombiatours.travel
website_id: 894545b7-73ca-4dae-b76a-da5b6a3f8441
epic: 310
related_issues: [315, 316, 314, 320]
status: "draft-ready"
supabase_mutations: false
---

# ColombiaTours SEO Content Base — ES + EN-US

## Goal

Prepare a reusable bilingual base for the package hub:

- ES source: `https://colombiatours.travel/paquetes`
- EN target: `https://colombiatours.travel/en/packages`

This is a draft-only content operation. No Supabase or production content was
mutated in this run.

## Evidence

| Source | Status | Notes |
|---|---:|---|
| Production ES route | available | `/paquetes` returns title `Paquetes de Viaje` and H1 starts `Planes`. |
| Production EN route | available | `/en/packages` returns title `Travel Packages` and H1 starts `Trips`. |
| Existing DataForSEO batch | available | `epic310-next-batch-labs-serp-20260430`: 21 calls, 0 provider errors, cost USD 0.348. |
| EN quality backlog | available | 13 `review_quality`, 182 `translate_from_es`, 20 `do_not_publish`. |
| GSC fresh query data | not pulled in this run | Use Search Console MCP before publish. |
| GA4/funnel data | not pulled in this run | Use before final prioritization. |

## Demand Matrix

| cluster | market | locale | source_url | target_url | primary_keyword | intent | volume | cpc | difficulty | gsc_impressions | gsc_clicks | gsc_position | serp_type | competitor_gap | business_value | action | priority | publish_decision | issue |
|---|---|---|---|---|---|---|---:|---:|---:|---:|---:|---:|---|---|---|---|---|---|---|
| Colombia tour packages | US | en-US | `/paquetes` | `/en/packages` | colombia tour packages | commercial_planning | TBD DataForSEO refresh | TBD | TBD | TBD GSC | TBD | TBD | package hub / commercial list | Existing EN hub needs stronger US-native planner copy and trust details | High: direct package/quote intent | transcreate_en_from_es | P1 | draft | #315/#316 |
| Paquetes de viaje a Colombia | CO/LATAM | es-CO | `/paquetes` | `/paquetes` | paquetes de viaje a Colombia | booking | TBD GSC | TBD | TBD | TBD GSC | TBD | TBD | package hub | ES hub should answer trip-fit, route, season, logistics and quote intent faster | High: direct quote intent | optimize_es_existing | P1 | draft | #314 |

## Draft Artifacts

- ES optimized base: `artifacts/seo/2026-05-11-colombiatours-content-base/paquetes-es-CO-base.md`
- EN-US transcreated base: `artifacts/seo/2026-05-11-colombiatours-content-base/packages-en-US-base.md`

## Publish Gates

Current decision: `draft`.

Before publishing:

1. Pull fresh GSC query/page evidence for `/paquetes` and `/en/packages`.
2. Pull DataForSEO keyword overview/SERP for:
   - `paquetes de viaje a Colombia`
   - `colombia tour packages`
   - `custom colombia tours`
3. Confirm current package inventory and CTAs in Supabase/Studio.
4. Score draft with internal SEO scorer.
5. Render-check canonical, hreflang, sitemap inclusion, title/meta/H1, schema and CTA.

## Mutations

| Entity | Action | Before | After | Source |
|---|---|---|---|---|
| production content | none | unchanged | unchanged | draft-only run |

## Next Actions

1. Run fresh DataForSEO/GSC evidence for the two hub keywords.
2. Map internal links to actual package/activity/destination URLs.
3. Apply first to draft/review state, not direct public publish.
4. Validate and then decide whether `/en/packages` can enter sitemap/hreflang as a scaled EN hub.
