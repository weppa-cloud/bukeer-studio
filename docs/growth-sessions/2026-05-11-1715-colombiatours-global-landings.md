# ColombiaTours Global Paid Landing Execution

Date: 2026-05-11
Tenant: ColombiaTours (`894545b7-73ca-4dae-b76a-da5b6a3f8441`)
Issue context: Growth OS / paid acquisition expansion after global keyword research.

## Scope

Create the first global expansion landing set before opening paid tests:

- Brazil: `/pt/pacotes-colombia`
- France: `/fr/voyage-colombie-sur-mesure`
- Germany: `/de/kolumbien-rundreise`
- Argentina: `/viajes-a-colombia-desde-argentina`

## Evidence

Source document: `docs/growth-campaigns/outputs/2026-05-11-colombiatours-global-keyword-market-research-v2.md`

Demand signals:

- Brazil: `viagem colombia` 2,400/mo; `pacotes colombia` 1,000/mo; `pacote viagem colombia` 390/mo; low CPC signal.
- France: `voyage colombie` 3,600/mo; `circuit colombie` 720/mo; `voyage organise colombie` 260/mo; `voyage sur mesure colombie` 140/mo with premium CPC signal.
- Germany: `kolumbien urlaub` 1,300/mo; `kolumbien reisen` 1,000/mo; `kolumbien rundreise` 720/mo.
- Argentina: `paquetes a colombia` 1,300/mo; `viajes a colombia` 1,300/mo; `viaje a colombia desde argentina` 480/mo.

## Publish Gate Decision

Decision: publish as controlled paid-search landing candidates.

Rationale:

- Each page is a differentiated market landing, not a doorway copy swap.
- Each page has market-specific H1, meta, CTA, product fit, FAQ and route framing.
- Pages use existing Studio-owned `website_pages` surface.
- Product truth tables are not mutated.
- Tracking path remains through existing WhatsApp/WAFlow CTA wrappers on static pages.

Watch items:

- PT/FR/DE global UI strings may fall back outside the page body; body/hero/CTA are localized.
- CRM quality must be validated before budget scale.
- Campaigns must use exact/phrase only, never broad match.

## Mutation Plan

Script: `scripts/seo/publish-colombiatours-global-market-landings.mjs`

Operations:

- Ensure `websites.supported_locales` includes `pt-BR`, `fr-FR`, and `de-DE`.
- Upsert four `website_pages` rows.
- Keep pages out of navigation.
- Publish pages with `robots_noindex=false`.
- Revalidate public paths when `REVALIDATE_SECRET` is available.

## Test Plan

- Verify each public URL returns HTTP 200.
- Verify H1/title language matches target market.
- Verify body contains WhatsApp/WAFlow references.
- Verify no campaign activation uses broad match.
- After launch, validate `whatsapp_cta_click`, `waflow_submit`, CRM opportunity and `gclid`/UTM attribution.

## Execution Result

Production mutation executed with `node scripts/seo/publish-colombiatours-global-market-landings.mjs`.

Inserted pages:

| Market | Page ID | Public URL | Verification |
|---|---|---|---|
| Brazil | `cd817ce3-50cc-478c-8938-c5ab572d0fe9` | `https://colombiatours.travel/pt/pacotes-colombia` | HTTP 200, title/H1 PT, WhatsApp present |
| France | `30031a3b-a656-4d75-9fd9-d1fb426cf54a` | `https://colombiatours.travel/fr/voyage-colombie-sur-mesure` | HTTP 200, title/H1 FR, WhatsApp present |
| Germany | `0eaf7a6e-d32d-42a1-9560-2c2ddcf88da6` | `https://colombiatours.travel/de/kolumbien-rundreise` | HTTP 200, title/H1 DE, WhatsApp present |
| Argentina | `d710dfe8-5505-4446-9f77-6fa8b601db48` | `https://colombiatours.travel/viajes-a-colombia-desde-argentina` | HTTP 200, title/H1 ES, WhatsApp present |

Locale update:

- `websites.supported_locales` now includes `pt-BR`, `fr-FR`, and `de-DE`.

Revalidation:

- Production `/api/revalidate` returned `401` with the local `REVALIDATE_SECRET`; the pages still resolved publicly from DB and returned `200`.

Google Ads prep:

- Controlled test package created under `ops/google-ads/colombiatours/2026-05-global-expansion/`.
- Keywords are exact/phrase only.
- Negative keyword seed is global with PT/FR/DE/ES variants.
