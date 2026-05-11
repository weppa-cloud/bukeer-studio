# ColombiaTours Global Transcreation Plan: DE, FR, PT-BR

Date: 2026-05-11
Tenant: ColombiaTours
Goal: transcreate current pages, products, packages, destination content, and supporting SEO assets into German, French, and Portuguese for global growth.

## Executive Decision

Do not translate the whole website literally in one bulk operation. The right path is a governed transcreation program:

1. Inventory every current public content entity.
2. Classify each entity by business value, demand, source quality, and locale fit.
3. Build money pages first for markets with paid-search and SEO demand.
4. Publish in controlled batches of max 10 URLs per approval cycle.
5. Run post-publish verification before any URL is considered complete.
6. Keep low-value, thin, outdated, or wrong-fit content as draft/watch/hidden.

The target languages are:

- `pt-BR` for Brazil first.
- `fr-FR` for France first.
- `de-DE` for Germany first.

Later variants can include `fr-CA`, `de-CH`, `pt-PT`, or broader `es-AR`/`es-UY`, but those should not block the first global rollout.

## Scope

### Include

- Commercial landing pages.
- Destination pages.
- Package kit pages.
- Activity pages that support package conversion.
- Blog/support articles only when they link to a money page.
- SEO title, meta description, H1, FAQ, schema, image alt text, CTA, slug, canonical, hreflang, and sitemap policy.

### Exclude Or Defer

- Thin legacy pages.
- Pages without source truth or product fit.
- Posts with outdated factual claims.
- Pages that only chase keyword variants.
- Product pages where inventory/pricing/logistics are uncertain.

## Critical Contract Gap

The current ColombiaTours SEO content operator contract is EN-US oriented. Its matrix actions currently include:

- `optimize_es_existing`
- `transcreate_en_from_es`
- `create_en_new`
- `keep_hidden`
- `watch`
- `block`

Before executing DE/FR/PT at scale, extend the content operation contract to support:

- `transcreate_de_from_es`
- `transcreate_fr_from_es`
- `transcreate_pt_br_from_es`
- `create_de_new`
- `create_fr_new`
- `create_pt_br_new`

This is necessary so future agents do not force German, French, and Portuguese work into EN-specific categories.

## Source Inventory

Build one canonical inventory from Supabase and current public rendering:

| Source | Entity | Purpose |
|---|---|---|
| `website_pages` | custom pages / money pages | Landing and hub transcreation. |
| `package_kits` | packages | Commercial product pages. |
| `activities` | activities | Supporting product proof and internal links. |
| `destinations` | destinations | Destination hubs and entity coverage. |
| blog/content tables | posts | SEO support content only when business-linked. |
| public URLs | rendered checks | Verify status code, H1, CTA, schema, canonical, hreflang. |
| GSC/DataForSEO/GA4/funnel_events | evidence | Prioritize by demand and conversion value. |

Never mutate source-of-truth product tables just to translate. Use approved content overlays, localized page records, or site content publishing flow.

## Prioritization Model

Score every candidate:

```text
Priority Score = Demand x Intent x Product Fit x Source Quality x Business Value - Risk Penalty
```

Where:

- Demand = DataForSEO/GSC volume and trend.
- Intent = commercial/custom-trip/package intent.
- Product Fit = ColombiaTours can actually sell the itinerary.
- Source Quality = ES source page is complete, accurate, and useful.
- Business Value = likely qualified lead or booking value.
- Risk Penalty = language mismatch, thin content, generic content, unsupported claims, weak CTA, no tracking, or cannibalization.

## Locale Strategy

### Portuguese Brazil (`pt-BR`)

Primary market: Brazil.
Tone: practical, warm, direct, package-led.
Positioning:

- Colombia as an accessible international trip from Brazil.
- Custom packages, Cartagena, San Andrés, coffee region, multidestination Colombia.
- Avoid generic "Colombia tourism" copy; qualify package/trip intent.

P0 pages:

- `/pt/pacotes-colombia`
- `/pt/viagem-colombia-pacotes`
- `/pt/cartagena-colombia-pacote`
- `/pt/colombia-10-dias`
- `/pt/san-andres-colombia-pacotes`

### French France (`fr-FR`)

Primary market: France.
Tone: premium, custom, curated, precise.
Positioning:

- `voyage sur mesure` and `circuit Colombie`.
- Local expertise, private itinerary, safe planning, cultural/nature balance.
- Strong trust proof and itinerary examples.

P0 pages:

- `/fr/voyage-colombie-sur-mesure`
- `/fr/circuit-colombie`
- `/fr/voyage-organise-colombie`
- `/fr/colombie-15-jours`
- `/fr/cartagena-colombie-voyage`

### German Germany (`de-DE`)

Primary market: Germany.
Tone: structured, trustworthy, detailed, practical.
Positioning:

- `Kolumbien Rundreise`, 10-15 days, organized/private travel.
- Clear route, inclusions, safety/logistics, expert planning.
- Avoid hype; emphasize planning reliability.

P0 pages:

- `/de/kolumbien-rundreise`
- `/de/kolumbien-reisen`
- `/de/kolumbien-15-tage`
- `/de/kolumbien-privatreise`
- `/de/cartagena-kolumbien-reise`

## Batch Plan

### Batch 0: Technical Readiness

Owner: Studio/content platform.
Output:

- Confirm localized URL model for `pt-BR`, `fr-FR`, `de-DE`.
- Confirm canonical and reciprocal hreflang implementation.
- Confirm sitemap locale policy.
- Confirm localized title/meta/H1/schema fields.
- Confirm WAFlow/WhatsApp tracking preserves `locale`, `market`, `utm`, `gclid`, `_fbp`, `_fbc`, and `reference_code`.

Exit gate:

- One draft page per locale renders correctly and is hidden from sitemap until quality gates pass.

### Batch 1: P0 Money Pages

Max 10 URLs.
Recommended first 9:

| Locale | URL | Source |
|---|---|---|
| `pt-BR` | `/pt/pacotes-colombia` | MX/ES Colombia package landing + Brazil keyword evidence. |
| `pt-BR` | `/pt/cartagena-colombia-pacote` | Cartagena package/product pages. |
| `pt-BR` | `/pt/colombia-10-dias` | 10-day Colombia tour. |
| `fr-FR` | `/fr/voyage-colombie-sur-mesure` | Colombia custom/private package landing. |
| `fr-FR` | `/fr/circuit-colombie` | 10/15-day Colombia route. |
| `fr-FR` | `/fr/voyage-organise-colombie` | Spain organized-trip evidence adapted for France. |
| `de-DE` | `/de/kolumbien-rundreise` | 10/15-day Colombia route. |
| `de-DE` | `/de/kolumbien-reisen` | General Colombia travel hub. |
| `de-DE` | `/de/kolumbien-15-tage` | 15-day Colombia package. |

Exit gate:

- All pages pass language, canonical, hreflang, schema, CTA, and rendered URL checks.
- No sitemap exposure until publish gates pass.

### Batch 2: Destination/Product Pages

Target:

- Cartagena.
- San Andrés.
- Eje Cafetero.
- Medellín + Guatapé.
- Santa Marta/Tayrona.
- Santander/San Gil/Barichara only after package-led ES source exists.

Publish order depends on demand and source readiness per locale.

### Batch 3: Support Content

Only create support articles that internally link to a P0/P1 money page.

Examples:

- Best time to travel to Colombia.
- Colombia itinerary 10/15 days.
- Colombia family trip.
- Cartagena + coffee region route.
- Colombia safety/logistics for planned private trips.

## Required Output Matrix

Every batch must produce this matrix before writing:

```text
cluster | market | locale | source_url | target_url | primary_keyword | intent | volume | cpc | difficulty | gsc_impressions | gsc_clicks | gsc_position | serp_type | competitor_gap | business_value | action | priority | publish_decision | issue
```

For DE/FR/PT execution, use the extended action names from the contract gap section.

## Quality Gates

Before publishing any URL:

- Demand evidence exists from DataForSEO or GSC.
- SERP format matches target page type.
- Top 10 competitor brief exists.
- Content is transcreated, not literal translation.
- Body language matches target locale.
- H1, title, meta, FAQ, CTA, schema, image alt text, slug are localized.
- Canonical is self-referential.
- Hreflang is reciprocal and complete.
- Sitemap policy is correct.
- CTA is valid and tracked.
- No unsupported safety, visa, price, legal, or medical claims.
- No scaled-content or doorway risk.

## Tracking And Measurement

Each localized URL must write or preserve:

- `locale`
- `market`
- `source_system`
- `reference_code`
- `utm_*`
- `gclid` / `gbraid` / `wbraid`
- `_fbp` / `_fbc`
- `whatsapp_cta_click`
- `waflow_submit`
- CRM stage events when available

Evaluation windows:

- Technical smoke: immediate.
- GSC indexing and impressions: day 7 and day 21.
- SEO/content readout: day 45.
- Paid test readout: day 7 and day 14.
- CRM quality readout: day 7 and day 30.

## Implementation Sequence

1. Extend the content matrix/action contract for DE/FR/PT.
2. Pull the full source inventory from Supabase.
3. Run DataForSEO demand + SERP briefs for P0 pages.
4. Produce Batch 1 matrix and review.
5. Draft Batch 1 content in hidden/draft state.
6. Run render, language, SEO, schema, CTA, canonical, and hreflang checks.
7. Publish max 10 URLs after explicit approval.
8. Run post-publish verification on public URLs.
9. Add them to sitemap/hreflang only after publish gates and post-publish verification pass.
10. Start controlled paid tests only for published pages with tracking verified.
11. Repeat for Batch 2 and Batch 3.

## Post-Publish Verification

Publishing is not the final state. Every localized URL must be verified after it
is live using the same professional quality criteria:

- public URL returns `200` and is not a fallback/not-found page;
- `html[lang]` matches locale;
- canonical is self-referential;
- hreflang is reciprocal and fully qualified;
- sitemap/indexability matches publish decision;
- title, meta, H1, body, FAQ, schema, alt text, and CTA match the locale;
- no mixed-language leakage or placeholder copy;
- CTA is visible on mobile and desktop;
- WhatsApp/WAFlow tracking records `locale`, `market`, `reference_code`, UTMs,
  click IDs, and Meta IDs when present;
- verification result is recorded with timestamp, URL, status, and issue.

If post-publish verification fails, the URL returns to `review`, `watch`,
`keep_hidden`, or `block` and must not be exposed in sitemap until fixed.

## Open Decisions

- Whether to create localized URL prefixes as `/pt/`, `/fr/`, `/de/` or full locale prefixes `/pt-br/`, `/fr-fr/`, `/de-de/`.
- Whether sales can respond in Portuguese, French, and German directly, or if WAFlow should qualify and route to English/Spanish support.
- Whether prices, currencies, and package inclusions must localize by market before publishing.
- Whether translated products remain hidden until a native/human review is complete.

## Recommendation

Start with Batch 0 and Batch 1 only. That gives us global expansion coverage without creating scaled-content risk. Brazil and France should be the first two operational bets, Germany third, because their demand and product fit are strongest.
