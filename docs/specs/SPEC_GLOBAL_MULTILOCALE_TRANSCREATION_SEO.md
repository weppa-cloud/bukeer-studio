# SPEC: Global Multilocale Transcreation SEO

Status: Ready for execution
Date: 2026-05-11
Tenant pilot: ColombiaTours
GitHub Epic: [#502](https://github.com/weppa-cloud/bukeer-studio/issues/502)
Related ADRs: ADR-019, ADR-020, ADR-021, ADR-016, ADR-029

## Purpose

Implement a governed system to transcreate and publish ColombiaTours content in
German (`de-DE`), French (`fr-FR`), and Brazilian Portuguese (`pt-BR`) while
preserving SEO quality, Google visibility, conversion tracking, and product
truth boundaries.

This is not a literal bulk translation workflow. The approved flow is:

```text
inventory -> demand evidence -> SERP brief -> draft -> review -> apply ->
publish -> post-publish verification -> sitemap/hreflang exposure -> monitor
```

Publishing is not considered complete until the post-publish verification gate
passes and evidence is recorded.

## Source Of Truth

- GitHub Epic and child issues track execution state.
- This spec defines the durable implementation contract.
- Product truth remains in canonical catalog tables and must not be overwritten
  by transcreation.

## Scope

### Included

- Commercial landing pages.
- Package/product SEO overlays.
- Destination pages.
- Commercially relevant activity pages.
- Support articles only when they link to a money page.
- Metadata, schema, CTA, alt text, canonical, hreflang, sitemap policy, and
  monitoring records for localized content.

### Excluded

- Literal machine translation as a publishable output.
- Automatic publishing without review.
- Bulk publishing more than 10 URLs per batch without explicit approval.
- Any write to canonical product truth fields in `package_kits`, `activities`,
  `destinations`, `hotels`, or equivalent catalog tables.
- Paid campaign activation before public URL, tracking, sitemap, and hreflang
  verification pass.

## Locales And URL Policy

Initial locales:

| Locale | Market | URL prefix |
|---|---|---|
| `pt-BR` | Brazil | `/pt/...` |
| `fr-FR` | France | `/fr/...` |
| `de-DE` | Germany | `/de/...` |

Use simple language prefixes in v1. The full locale is stored in metadata,
tracking payloads, transcreation jobs, hreflang, and monitoring records.

## Required Actions

Extend the transcreation and Growth OS action contracts to support:

- `transcreate_de_from_es`
- `transcreate_fr_from_es`
- `transcreate_pt_br_from_es`
- `create_de_new`
- `create_fr_new`
- `create_pt_br_new`

These actions must be accepted by validation schemas, change sets, work items,
publication jobs, and any relevant UI/status surfaces that currently assume
EN-US-only transcreation.

## Content Surfaces

Approved write surfaces:

- `seo_transcreation_jobs`
- `seo_localized_variants`
- `content_translations`
- `product_seo_overrides`
- `website_pages`
- `website_sections`
- Growth OS change sets and publication jobs when applicable

Read-only truth surfaces:

- `package_kits`
- `activities`
- `destinations`
- `hotels`
- product name, slug, price, duration, inventory, availability, and canonical
  description fields

## Publication States

Each localized item must resolve to one publication state:

| State | Meaning |
|---|---|
| `draft` | Content incomplete or missing evidence. |
| `review` | Draft ready for strict/native review. |
| `publish` | Approved, rendered, indexable, and verified. |
| `watch` | Live but not ready for scale. |
| `keep_hidden` | Not indexable and not exposed in sitemap. |
| `block` | Generic, risky, duplicate, unsupported, or wrong-language content. |

## Required Matrix

Every batch must produce this matrix before content writes:

```text
cluster | market | locale | source_url | target_url | primary_keyword | intent |
volume | cpc | difficulty | gsc_impressions | gsc_clicks | gsc_position |
serp_type | competitor_gap | business_value | action | priority |
publish_decision | issue
```

## Batch 0: Infrastructure And Contract

Acceptance criteria:

- `/pt`, `/fr`, and `/de` route prefixes resolve without breaking existing ES/EN
  routes.
- Rendered HTML exposes the correct `lang` for each target locale.
- Canonical links are self-referential for localized URLs.
- Hreflang alternates are fully qualified and reciprocal when equivalent pages
  exist.
- Draft/review/hidden/blocked pages are excluded from sitemap.
- Published pages are eligible for sitemap only after post-publish verification.
- CTA and WAFlow preserve `locale`, `market`, `utm_*`, click IDs, Meta IDs, and
  `reference_code`.
- Growth OS/transcreation action schemas accept DE/FR/PT-BR actions.

## Batch 1: P0 Money Pages

Create at most nine initial pages:

| Locale | URL | Intent |
|---|---|---|
| `pt-BR` | `/pt/pacotes-colombia` | Brazil Colombia packages |
| `pt-BR` | `/pt/cartagena-colombia-pacote` | Cartagena package |
| `pt-BR` | `/pt/colombia-10-dias` | 10-day Colombia itinerary |
| `fr-FR` | `/fr/voyage-colombie-sur-mesure` | premium custom trip |
| `fr-FR` | `/fr/circuit-colombie` | Colombia circuit |
| `fr-FR` | `/fr/voyage-organise-colombie` | organized Colombia trip |
| `de-DE` | `/de/kolumbien-rundreise` | Colombia round trip |
| `de-DE` | `/de/kolumbien-reisen` | Colombia travel hub |
| `de-DE` | `/de/kolumbien-15-tage` | 15-day Colombia tour |

Each page requires:

- demand evidence from DataForSEO or GSC;
- top-10 SERP competitive brief;
- target-market keyword re-research;
- localized title, meta, H1, body, FAQ, CTA, schema, alt text, and slug;
- review state before apply;
- public URL verification after publish.

## Batch 2: Products And Destinations

Priority order:

1. Cartagena.
2. San Andres.
3. Eje Cafetero.
4. Medellin + Guatape.
5. Santa Marta/Tayrona.
6. Santander/San Gil/Barichara only after a package-led Spanish source exists.

## Batch 3: Support Content

Support content is allowed only when it links to a money page and has demand
evidence.

Examples:

- best time to travel to Colombia;
- Colombia 10/15-day itinerary;
- family trip to Colombia;
- custom Colombia travel;
- safety/logistics for international travelers;
- Cartagena + coffee region route;
- Colombia coffee route.

## Quality Gates

A localized URL may enter `publish` only if all gates pass:

- demand evidence exists;
- SERP intent matches the target page type;
- top-10 SERP brief exists;
- content is transcreated, not literal translation;
- body language matches the target locale;
- title, meta, H1, FAQ, CTA, schema, image alt text, and slug are localized;
- canonical is self-referential;
- hreflang is reciprocal and fully qualified where alternates exist;
- sitemap policy matches publication state;
- CTA is valid and measurable;
- no unsupported safety, visa, legal, medical, or price claims;
- no doorway, scaled-content, scraping, or generic mass-page risk.

## Post-Publish Verification Gate

After publish/apply, each URL must pass a post-publish verification before the
work item or issue can be closed.

Required checks:

- public URL returns HTTP `200`;
- response is HTML and not a fallback/not-found page;
- `html[lang]` matches target locale;
- canonical is self-referential;
- hreflang alternates are fully qualified and reciprocal;
- page is indexable only if state is `publish` or approved `watch`;
- sitemap inclusion matches state;
- title/meta/H1 match target language and keyword intent;
- body has no placeholder text and no mixed-language leakage;
- structured data validates for the page type;
- primary CTA is visible on mobile and desktop;
- WhatsApp/WAFlow click emits expected funnel event with `locale` and `market`;
- `reference_code`, UTMs, click IDs, and Meta IDs are preserved where present;
- verification evidence is recorded with timestamp, URL, status, and result.

If any check fails:

- set the item back to `review`, `watch`, `keep_hidden`, or `block`;
- remove or prevent sitemap exposure;
- record the failure reason and required fix;
- do not close the related child issue.

## Monitoring

Every published URL must record:

```text
public_url | locale | market | published_at | baseline | day_7_check |
day_21_check | day_45_check | owner | issue
```

Monitoring reads:

- day 7: indexability, GSC discovery, rendering, CTA health;
- day 21: impressions, CTR, query fit, title/meta adjustment need;
- day 45: ranking movement, qualified lead signal, internal link adjustment;
- day 7 and day 14 for any paid traffic test;
- day 30 for CRM quality and booking correlation where available.

## GitHub Execution Structure

Epic:

```text
feat(seo): Global multilingual transcreation for ColombiaTours DE/FR/PT-BR
```

Recommended labels:

- `epic`
- `type:feat`
- `area:growth`
- `area:seo`
- `priority:p1`
- `size:l`
- `needs-tvb`

Child issues:

1. [#503](https://github.com/weppa-cloud/bukeer-studio/issues/503) — F0 — Multilocale transcreation contract.
2. [#504](https://github.com/weppa-cloud/bukeer-studio/issues/504) — F1 — Technical SEO routing, hreflang, sitemap readiness.
3. [#505](https://github.com/weppa-cloud/bukeer-studio/issues/505) — F2 — Source inventory and prioritization matrix.
4. [#506](https://github.com/weppa-cloud/bukeer-studio/issues/506) — F3 — Batch 1 P0 money page drafts.
5. [#507](https://github.com/weppa-cloud/bukeer-studio/issues/507) — F4 — Strict/native review and publish gates.
6. [#508](https://github.com/weppa-cloud/bukeer-studio/issues/508) — F5 — Post-publish verification and Google visibility.
7. [#509](https://github.com/weppa-cloud/bukeer-studio/issues/509) — F6 — Batch 2 product/destination rollout.
8. [#510](https://github.com/weppa-cloud/bukeer-studio/issues/510) — F7 — Monitoring and optimization.

## Test Plan

Contract tests:

- DE/FR/PT-BR actions are accepted.
- publication states validate.
- required matrix columns are enforced.

SEO render tests:

- localized URLs return `200`;
- `html[lang]`, title, meta, H1, canonical, and hreflang are correct;
- draft/hidden/blocked URLs are not in sitemap.

Content quality checks:

- body language matches locale;
- no placeholder content;
- no ES/EN leakage inside DE/FR/PT-BR body;
- localized CTA and FAQ exist.

Funnel tests:

- WhatsApp click records `whatsapp_cta_click` with locale/market;
- WAFlow submit records `waflow_submit`;
- `reference_code`, UTMs, click IDs, and Meta IDs are preserved.

Post-publish tests:

- public URL verification records pass/fail evidence;
- failed pages are removed from sitemap or blocked from sitemap exposure;
- child issue cannot close until the verification record passes.

## Assumptions

- ColombiaTours is the first tenant.
- Spanish source content is the primary source; English can be supporting
  context when it exists.
- Brazil, France, and Germany are the first global markets.
- Native/human review is required for P0 commercial pages before `publish`.
- Paid campaigns are blocked until post-publish verification passes.
- Batch size is capped at 10 URLs unless explicitly approved.
