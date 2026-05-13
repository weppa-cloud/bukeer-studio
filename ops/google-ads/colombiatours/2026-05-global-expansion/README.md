# ColombiaTours Global Expansion Tests

Date: 2026-05-11
Source: `docs/growth-campaigns/outputs/2026-05-11-colombiatours-global-keyword-market-research-v2.md`
Status: Brazil and Argentina activated as controlled tests. France and Germany remain paused.

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

## Google Ads Resource IDs

| Campaign | ID | Status |
|---|---:|---|
| `BR_Search_Colombia_Packages_2026_05` | `23843668228` | ENABLED |
| `FR_Search_Colombie_Sur_Mesure_2026_05` | `23833804680` | PAUSED |
| `DE_Search_Kolumbien_Rundreise_2026_05` | `23843667802` | PAUSED |
| `AR_Search_Colombia_Packages_2026_05` | `23833803528` | ENABLED |

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

## Validation Commands

```bash
node scripts/google-ads/validate-global-expansion.cjs
node scripts/google-ads/validate-global-expansion.cjs --apply-paused
node scripts/google-ads/apply-global-expansion-negatives.cjs
node scripts/google-ads/apply-global-expansion-negatives.cjs --apply
node scripts/google-ads/activate-global-expansion-campaigns.cjs
node scripts/google-ads/activate-global-expansion-campaigns.cjs --apply
```

## Activation Log

2026-05-11:

- `node scripts/google-ads/activate-global-expansion-campaigns.cjs`
  - `validateOnly` passed for Brazil and Argentina.
  - Guard confirmed France and Germany were still paused.
- `node scripts/google-ads/activate-global-expansion-campaigns.cjs --apply`
  - Enabled `BR_Search_Colombia_Packages_2026_05` at COP 50,000/day.
  - Enabled `AR_Search_Colombia_Packages_2026_05` at COP 30,000/day.
  - Kept `FR_Search_Colombie_Sur_Mesure_2026_05` paused.
  - Kept `DE_Search_Kolumbien_Rundreise_2026_05` paused.

Daily monitoring must compare Google Ads spend/clicks/search terms with `funnel_events`, `waflow_leads`, WhatsApp conversations, and CRM opportunities. Pause a campaign or ad group if spend reaches COP 120k without useful conversation or if terms drift toward flights, hotels-only, visa, jobs, cheap/2x1, maps, weather, or local day tours.
