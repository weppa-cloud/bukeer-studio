# ColombiaTours Global Expansion Tests

Date: 2026-05-11
Source: `docs/growth-campaigns/outputs/2026-05-11-colombiatours-global-keyword-market-research-v2.md`

## Rule

These tests must use exact and phrase match only. Do not use broad match during the validation phase.

Primary optimization signal: qualified CRM opportunity, not click volume and not legacy Google Ads conversions.

## Landing Pages

| Market | URL | Status |
|---|---|---|
| Brazil | `https://colombiatours.travel/pt/pacotes-colombia` | Live, HTTP 200 verified |
| France | `https://colombiatours.travel/fr/voyage-colombie-sur-mesure` | Live, HTTP 200 verified |
| Germany | `https://colombiatours.travel/de/kolumbien-rundreise` | Live, HTTP 200 verified |
| Argentina | `https://colombiatours.travel/viajes-a-colombia-desde-argentina` | Live, HTTP 200 verified |

## Test Budgets

| Market | Daily Budget | Launch Gate |
|---|---:|---|
| Brazil | COP 50k-80k | PT landing live, tracking smoke pass |
| France | COP 60k-100k | FR landing live, seller handoff ready |
| Germany | COP 60k-100k | DE landing live, seller handoff ready |
| Argentina | COP 30k-50k | Spanish landing live, budget-quality filter in copy |

## Pause Gates

- Pause any ad group after COP 120k spend without useful WhatsApp conversation or `waflow_submit`.
- Pause immediately if search terms drift to flights, hotels only, cheap/2x1, visa, jobs, maps, weather or local day tours.
- Scale 20-30% only after 3 days with clean search terms, traceable `gclid`/UTM, and seller-confirmed lead quality.
