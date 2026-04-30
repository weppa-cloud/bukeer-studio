---
session_id: "2026-04-30-en-quality-backlog"
date: 2026-04-30
agent: "Worker 3"
scope: "audit"
tenant: colombiatours.travel
website_id: 894545b7-73ca-4dae-b76a-da5b6a3f8441
epic: 310
related_issues: [314, 315]
related_adrs: [019, 020, 021]
status: "operational-backlog"
supabase_mutations: false
---

# EN Quality Backlog — 2-Week Operating Plan

This is a docs-only handoff for #314/#315. It uses the existing exported backlog as row-level source of truth:

- `artifacts/seo/2026-04-29-epic310-remediation-sprint/en-url-actions.csv`
- `artifacts/seo/2026-04-29-en-blog-findings-audit/en-blog-findings-audit.md`
- `artifacts/seo/2026-04-29-epic310-remediation-sprint/epic310-remediation-sprint.md`

No Supabase content was mutated in this run.

## Baseline

| Final status        |    URLs | Severity split          | Current rule                                                                                  |
| ------------------- | ------: | ----------------------- | --------------------------------------------------------------------------------------------- |
| `review_quality`    |      13 | 12 WATCH, 1 P1          | Live EN rows exist; manually QA before keeping indexable or scaling.                          |
| `translate_from_es` |     182 | 174 P0, 8 P1            | ES source exists; keep EN hidden until transcreation and quality gate pass.                   |
| `do_not_publish`    |      20 | 18 P0, 2 P1             | EN-only/default-locale rows with no ES/WP source; keep 404/noindex unless explicitly rebuilt. |
| **Total**           | **215** | 192 P0, 11 P1, 12 WATCH | No EN URL enters sitemap/hreflang before gate.                                                |

Production smoke on 2026-04-30:

- `review_quality` samples return `200`, self-canonical, `index,follow`: `/en/blog/asegura-tu-viaje-a-colombia`, `/en/blog/descubriendo-san-andres-isla-un-paraiso`.
- `translate_from_es` samples return `404`: `/en/blog/cano-cristales-el-rio-de-los-cinco-colores`, `/en/blog/cuanto-sale-un-viaje-a-colombia-desde-mexico`.
- `do_not_publish` samples return `404`: `/blog/10-must-visit-beaches-colombia`, `/blog/airlines-from-mexico-to-colombia`.
- `sitemap.xml` has no `/en/blog/{slug}` loc entries; live reviewable EN pages can emit self-canonical indexable HTML while remaining absent from the sitemap. Treat this as a code/data policy gap before final EN publish decisions.
- Legacy `https://en.colombiatours.travel/los-10-mejores-lugares-turisticos-de-colombia/` resolves to the default `/blog/...` path with ES-only canonical/hreflang. This remains a migration/cannibalization risk for #319/#320, not a content-quality pass.

## Week 1

| Day   | Workstream              |                                                       Exact rows | Owner         | Exit criteria                                                                                                                           |
| ----- | ----------------------- | ---------------------------------------------------------------: | ------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| D1    | Freeze + assert export  |                                                          all 215 | A4 + A5       | `en-url-actions.csv` count assertion returns 13/182/20; no Supabase writes.                                                             |
| D1-D2 | Manual QA               |                                              13 `review_quality` | A4 + reviewer | Each row has pass/watch/block decision with evidence for title, meta, H1, body, canonical, robots, hreflang, schema and internal links. |
| D2-D3 | No-publish confirmation |                                              20 `do_not_publish` | A4 + A5       | Each row remains 404/noindex and absent from sitemap/internal links, or is explicitly reclassified with a new source brief.             |
| D3-D5 | Translate triage        | top 31 `translate_from_es` with score 4040, then 8 P1 score 1300 | A4            | Demand/source matrix prepared; only rows mapped to #315 Tier A/B or active ES demand move to draft queue.                               |
| D5    | Gate readiness          |                                                 first batch only | A4 + A5       | Quality-check script/API gap acknowledged; manual QA sheet can temporarily stand in for `seo_translation_quality_checks`.               |

## Week 2

| Day    | Workstream           |                                Exact rows | Owner         | Exit criteria                                                                                                                                   |
| ------ | -------------------- | ----------------------------------------: | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| D6-D8  | Draft queue          |    selected `translate_from_es` rows only | A4 + reviewer | Drafts are created outside production content or in an unpublished workflow; no indexable EN row is created without reviewer sign-off.          |
| D8-D9  | Technical validation | passed `review_quality` + selected drafts | A5            | Passed EN pages have self-canonical URL, reciprocal hreflang, sitemap inclusion, localized title/meta/H1/body/schema and no Spanish UI leakage. |
| D9-D10 | Backlog closeout     |                                   all 215 | A4 + A5       | CSV is re-exported or annotated with final decision: keep indexed, translate, keep hidden, remove/404, or watch.                                |
| D10    | Recrawl decision     |                   publish candidates only | A5 + Council  | DataForSEO recrawl is approved only after P0/P1 technical fixes and quality evidence exist.                                                     |

## `review_quality` URL Set

These 13 rows already have Studio EN and ES plus WP EN/ES signals. They are the only immediate manual QA candidates.

| Severity | URL                                                                                  | Required next validation                                                                          |
| -------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| WATCH    | `https://colombiatours.travel/en/blog/asegura-tu-viaje-a-colombia`                   | QA title/meta/H1/body for natural US English; verify reciprocal hreflang and sitemap policy.      |
| WATCH    | `https://colombiatours.travel/en/blog/boleto-de-avion-a-colombia`                    | QA aviation/travel terminology and market fit; verify no Spanish body fallback.                   |
| WATCH    | `https://colombiatours.travel/en/blog/colombia-de-los-mejores-paises-para-viajar`    | QA listicle quality, title intent and internal links to EN hubs.                                  |
| P1       | `https://colombiatours.travel/en/blog/descubriendo-san-andres-isla-un-paraiso`       | Treat first because it has P1 findings; verify metadata/canonical, image/schema and body quality. |
| WATCH    | `https://colombiatours.travel/en/blog/explora-viajes-cartagena-las-mejores-ofertas`  | QA commercial CTA and EN package links.                                                           |
| WATCH    | `https://colombiatours.travel/en/blog/explorando-colombia-armenia-quindio`           | QA Coffee Triangle naming and glossary.                                                           |
| WATCH    | `https://colombiatours.travel/en/blog/la-comuna-13-en-medellin`                      | QA safety/context claims and E-E-A-T reviewer evidence.                                           |
| WATCH    | `https://colombiatours.travel/en/blog/las-50-mejores-frases-de-viajes-para-encender` | QA whether this has EN-US demand; likely watch unless linked to language-guide strategy.          |
| WATCH    | `https://colombiatours.travel/en/blog/playas-colombianas`                            | QA beach terminology and internal links to Cartagena/Tayrona/San Andres.                          |
| WATCH    | `https://colombiatours.travel/en/blog/rodrigo-de-bastidas-un-viaje-a-los-origenes`   | QA historical accuracy and target-market intent.                                                  |
| WATCH    | `https://colombiatours.travel/en/blog/san-jose-del-guaviare`                         | QA destination terms, body language and planner CTA.                                              |
| WATCH    | `https://colombiatours.travel/en/blog/viajando-con-agencias-de-viajes`               | QA trust/commercial copy and avoid generic agency filler.                                         |
| WATCH    | `https://colombiatours.travel/en/blog/viajar-por-colombia-en-15-dias`                | QA itinerary structure, EN title intent and links to package matrix.                              |

## `do_not_publish` URL Set

These 20 rows have no WP EN/ES source and are default-locale EN-only artifacts. Keep them out of sitemap/hreflang and preserve 404/noindex unless a new ES source or strategic EN brief is approved.

| Severity | URL                                                                                                 |
| -------- | --------------------------------------------------------------------------------------------------- |
| P0       | `https://colombiatours.travel/blog/10-must-visit-beaches-colombia`                                  |
| P0       | `https://colombiatours.travel/blog/15-best-vacation-destinations-colombia`                          |
| P0       | `https://colombiatours.travel/blog/adventure-family-tours-opiniones-colombia-from-mexico`           |
| P0       | `https://colombiatours.travel/blog/airlines-flying-to-colombia-from-mexico-trusted-travel-agencies` |
| P0       | `https://colombiatours.travel/blog/airlines-from-mexico-to-colombia`                                |
| P0       | `https://colombiatours.travel/blog/airlines-that-fly-to-colombia-from-mexico`                       |
| P0       | `https://colombiatours.travel/blog/airlines-that-fly-to-colombia-from-mexico-vlr2`                  |
| P1       | `https://colombiatours.travel/blog/airlines-to-colombia-from-mexico-top-islands`                    |
| P0       | `https://colombiatours.travel/blog/airlines-to-colombia-from-mexico-bogota-tour`                    |
| P0       | `https://colombiatours.travel/blog/airlines-to-colombia-from-mexico-visit-cali`                     |
| P0       | `https://colombiatours.travel/blog/amazonia-colombia-heartbeat-of-the-planet`                       |
| P0       | `https://colombiatours.travel/blog/best-destinations-colombia-travel-guide`                         |
| P0       | `https://colombiatours.travel/blog/best-islands-colombia-tropical-paradise`                         |
| P0       | `https://colombiatours.travel/blog/budget-friendly-destinations-colombia`                           |
| P1       | `https://colombiatours.travel/blog/cano-cristales-colombia-travel-guide`                            |
| P0       | `https://colombiatours.travel/blog/colombian-phrases-you-need-to-know`                              |
| P0       | `https://colombiatours.travel/blog/exploring-the-magic-of-traveling-colombia`                       |
| P0       | `https://colombiatours.travel/blog/reasons-to-travel-to-colombia`                                   |
| P0       | `https://colombiatours.travel/blog/thermal-hot-springs-colombia-health-benefits`                    |
| P0       | `https://colombiatours.travel/blog/when-to-travel-to-colombia-best-season`                          |

## `translate_from_es` Operating Rule

The 182-row exact list is the CSV subset where `final_status = translate_from_es`. Do not publish these in bulk. Week 1 triage should prioritize:

1. The 31 P0 rows with `priority_score = 4040` and 4 findings.
2. The 8 P1 rows with 5 findings and `priority_score = 1300`.
3. Rows matching #315 Tier A/B topics: Cartagena, Medellin, Bogota, San Andres, Tayrona, Coffee Triangle, safety, best time, itinerary, packages, visa/cost/travel guide.
4. Remaining rows stay hidden until GSC/DataForSEO demand or an approved cluster strategy exists.

Required per-row validation before any publish:

1. Source exists and is approved in ES.
2. Target EN draft is reviewed by a human reviewer.
3. `seo_translation_quality_checks` or temporary manual gate has grade A/B, or C with explicit watch owner.
4. URL slug is target-market appropriate, not just Spanish path with `/en/`.
5. Title, meta description, H1, body, FAQ/schema, images and CTAs are localized.
6. Canonical is self-referential; hreflang is reciprocal; sitemap includes only passed EN rows.
7. Internal links point to EN routes when those routes pass the same gate; otherwise use ES/default intentionally.

## Validation Commands

Read-only count assertion:

```bash
python3 - <<'PY'
import csv, collections
rows=list(csv.DictReader(open('artifacts/seo/2026-04-29-epic310-remediation-sprint/en-url-actions.csv')))
print(collections.Counter(r['final_status'] for r in rows))
print(collections.Counter(r['operational_severity'] for r in rows))
PY
```

Production spot check, read-only:

```bash
for url in \
  https://colombiatours.travel/en/blog/asegura-tu-viaje-a-colombia \
  https://colombiatours.travel/en/blog/cano-cristales-el-rio-de-los-cinco-colores \
  https://colombiatours.travel/blog/10-must-visit-beaches-colombia
do
  curl -I -L --max-time 20 "$url"
done
```

Sitemap policy check, read-only:

```bash
python3 - <<'PY'
import urllib.request
txt=urllib.request.urlopen('https://colombiatours.travel/sitemap.xml',timeout=25).read().decode()
print('/en/blog/ loc count:', txt.count('<loc>https://colombiatours.travel/en/blog/'))
for slug in ['asegura-tu-viaje-a-colombia','cano-cristales-el-rio-de-los-cinco-colores']:
    print(slug, txt.count(slug))
PY
```

## Code/Data Gaps

| Gap                                                                                                                      | Impact                                                                                             | Owner issue |
| ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- | ----------- |
| Blog sitemap does not expose passed EN detail URLs as `/en/blog/{slug}` locs, while live EN pages can be `index,follow`. | Review-passed EN pages may be indexable but poorly discoverable; failed EN pages must stay absent. | #313/#315   |
| `seo_translation_quality_checks` exists but has no scoring script/API and no rows yet.                                   | EN scale cannot be automated; manual QA is required for the first batch.                           | #314/#315   |
| Quality-check normalizer into `growth_inventory` is still open.                                                          | Council cannot see blocked/watch/pass translation state automatically.                             | #311/#321   |
| Existing `review_quality` slugs remain Spanish in URL paths.                                                             | Some rows may pass language quality but still fail EN-US market/CTR expectations.                  | #315        |
| `/en/packages` live title still renders Spanish text (`Paquetes de Viaje`) in production smoke.                          | Locale UI/content fallback can undermine EN publish confidence beyond blog rows.                   | #313/#315   |
| Legacy `en.colombiatours.travel` can resolve to default blog paths with ES-only canonical/hreflang.                      | Authority fragmentation and cannibalization risk remains until migration mapping lands.            | #319/#320   |

## Decision

Proceed with a constrained EN quality sprint: QA the 13 live candidates first, keep the 20 no-source rows unpublished, and translate only demand-backed ES-source rows from the 182 queue. Do not start a paid comparable recrawl or expose new EN sitemap/hreflang entries until the manual or automated quality gate has evidence.
