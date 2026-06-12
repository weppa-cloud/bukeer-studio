# ColombiaTours Ads 5d Search expert review

**Generated:** 2026-05-18T15:55Z
**Mode:** read-only; no campaign mutations applied
**Primary artifacts:**
- `docs/audits/2026-05-18-colombiatours-ads-5d-search-review.md`
- `artifacts/google-ads/2026-05-18-colombiatours-5d-search-review/colombiatours-crm-growth-study.json`
- `artifacts/google-ads/2026-05-18-colombiatours-5d-search-review/search-inspector.json`

## Executive decision

Do not scale yet. The 5-day CRM signal is strong, but campaign-level attribution is still below the operating threshold and Google Ads platform conversions are zero in the current 5-day Search inspection.

Use this order:

1. Fix tracking gaps on active CL and paused US before any budget increase.
2. Apply search-term negatives for transport, competitor, and low-intent exploration.
3. Keep MX and ES active; hold CL at small budget until tracking and junk terms are corrected.
4. Keep FR/DE paused. Treat BR/AR as staged, not live tests, because ad groups remain paused and delivery is zero.
5. Scale only after 3 consecutive days with seller-confirmed quality, attribution completeness >= 80%, and CPL <= COP 60k.

## 5-day scorecard

CRM/first-party rolling 5d:

| Metric | Value |
|---|---:|
| Production leads | 195 |
| Quality leads | 45 |
| Google-attributed quality leads | 30 |
| Google spend | COP 788,222 |
| Observed quality CPL | COP 26,274 |
| Confirmed itineraries | 0 |
| waflow_submit | 53 |
| whatsapp_cta_click | 38 |
| crm_quote_sent | 57 |
| Unique gclids | 56 |
| Attribution completeness with campaign | 53.8% |

Google Ads Search inspector, 2026-05-14..2026-05-18:

| Campaign | Status | Spend | Clicks | Conv | Tracking |
|---|---|---:|---:|---:|---|
| MX_Multidestino_y_Caribe_2026_05 | ENABLED | COP 348,809 | 167 | 0 | OK campaign suffix |
| ES_Cartagena_Medellin_2026_05 | ENABLED | COP 305,285 | 100 | 0 | OK campaign suffix |
| CL_Search_Colombia_SanAndres_2026_05 | ENABLED | COP 139,798 | 59 | 0 | Missing suffix |
| BR_Search_Colombia_Packages_2026_05 | ENABLED | COP 0 | 0 | 0 | OK suffix, ad groups paused |
| AR_Search_Colombia_Packages_2026_05 | ENABLED | COP 0 | 0 | 0 | OK suffix, ad groups paused |
| FR_Search_Colombie_Sur_Mesure_2026_05 | PAUSED | COP 0 | 0 | 0 | OK suffix |
| DE_Search_Kolumbien_Rundreise_2026_05 | PAUSED | COP 0 | 0 | 0 | OK suffix |
| US_Florida_NY_Colombia_Packages_2026_05 | PAUSED | COP 0 | 0 | 0 | Missing suffix |

## Spend concentration

| Ad group | Spend | Clicks | Expert read |
|---|---:|---:|---|
| MX AG2_Multidestino_Tours | COP 331,355 | 160 | Keep; build exact winners and prune loose phrase terms. |
| ES AG3_Multidestino_Premium | COP 199,564 | 57 | Keep; watch local-agency and competitor leakage. |
| CL Colombia Todo Incluido | COP 103,708 | 38 | Hold; tracking missing and transport terms leaking. |
| ES AG4_Eje_Cafetero_Test | COP 99,446 | 38 | Keep cautiously; CRM landing signal exists, but no platform conversions. |
| CL San Andres Paquetes | COP 36,090 | 21 | Hold; good product fit, but needs tracking suffix first. |

## Search terms

Useful terms to keep or expand as exact/controlled phrase:

| Term | Campaign | Spend | Clicks |
|---|---|---:|---:|
| colombia tours travel | MX | COP 13,275 | 8 |
| paquetes a colombia | MX | COP 12,296 | 4 |
| tours a colombia | MX | COP 10,864 | 7 |
| plan para cartagena todo incluido | CL | COP 7,400 | 1 |
| agencia de viaje a colombia | MX | COP 6,740 | 1 |
| paquete turístico a colombia | CL | COP 6,635 | 1 |
| tour colombia | MX | COP 6,129 | 2 |
| viajes a colombia todo incluido | MX | COP 5,495 | 3 |

Negatives / containment candidates:

| Term | Campaign | Spend | Action |
|---|---|---:|---|
| tiquete de chile a colombia | CL | COP 9,772 | Negative: tiquete/tiquetes. |
| pasaje a colombia desde mexico | MX | COP 1,002 | Negative: pasaje/pasajes. |
| tours a colombia desde méxico baratos | MX | COP 3,976 | Add cheap/bargain negatives if sales quality confirms low value. |
| aviatur cali | ES | COP 4,063 | Competitor negative candidate. |
| viajar sin limites cali | ES | COP 3,314 | Competitor/local agency negative candidate. |
| excursiones en medellín | ES | COP 3,659 | If selling full packages, negative or isolate day-tour intent. |
| excursiones al eje cafetero desde bogota | ES | COP 3,623 | If no day-trip product, negative or isolate. |

## Landing and tracking

All 14 sampled ad final URLs returned HTTP 200. `destinos/eje-cafetero` redirects cleanly to `/eje-cafetero`.

Tracking state:

- MX and ES now have campaign-level `final_url_suffix` with `utm_source=google`, `utm_medium=cpc`, `utm_campaign={campaignid}`, `utm_content={creative}`, and `gclid={gclid}`.
- CL is active and missing campaign-level tracking suffix. This is the highest-priority operational fix.
- US is paused and also missing campaign-level tracking suffix. Fix before reactivation.
- Ad-level final URLs are clean URLs, so tracking depends on campaign suffix. That is acceptable for MX/ES, not acceptable for CL/US.

## Conversion governance

The account has canonical upload actions enabled for `waflow_submit`, `quote_form_submit`, `quote_sent`, and `booking_confirmed`. However, governance still reports legacy imported actions in bidding or conversion metrics. That blocks clean Smart Bidding interpretation.

Expert action: keep optimization decisions anchored on first-party CRM quality until offline upload governance is clean. Do not optimize budget from Google platform conversions alone in this period.

## Original recommended actions

1. Apply `final_url_suffix` to CL campaign `23829507075` and US campaign `23829536568` before any scale or reactivation.
2. Add negatives: `tiquete`, `tiquetes`, `pasaje`, `pasajes`, `avion`, `vuelos`, `envios`, and selected competitor/local-agency names after one final sales-quality check.
3. Promote high-intent winners to exact where missing: `paquetes a colombia`, `tour por colombia todo incluido`, `agencia de viaje a colombia`, `viajes a colombia todo incluido`, `paquete turístico a colombia`.
4. Keep MX and ES budgets stable for now. Do not increase until attribution completeness reaches >= 80%.
5. Hold CL; if after tracking fixes it spends another COP 120k without CRM quality, pause or reduce at ad-group level.
6. Keep FR/DE paused. For BR/AR, either explicitly launch ad groups under a controlled test or pause campaign-level for account hygiene.

## Post-apply status

**Applied:** 2026-05-18T16:04Z

Mutations applied:

1. Campaign-level `final_url_suffix` added to `CL_Search_Colombia_SanAndres_2026_05` (`23829507075`).
2. Campaign-level `final_url_suffix` added to `US_Florida_NY_Colombia_Packages_2026_05` (`23829536568`).
3. Fifteen campaign-level phrase-match negatives added across CL, MX, and ES.

New negatives added:

| Campaign | Negatives |
|---|---|
| CL_Search_Colombia_SanAndres_2026_05 | `tiquete`, `envios`, `envios a colombia` |
| MX_Multidestino_y_Caribe_2026_05 | `tiquete`, `tiquetes`, `pasaje`, `pasajes` |
| ES_Cartagena_Medellin_2026_05 | `tiquete`, `tiquetes`, `pasaje`, `pasajes`, `avion`, `aerolinea`, `aviatur`, `viajar sin limites` |

Verification:

1. Negative apply script re-run in validate-only mode returned `operationCount: 0`.
2. Search inspector post-apply confirmed `hasCampaignTracking: true` for all eight reviewed campaigns.
3. The 14 sampled landing URLs still returned HTTP 200.

Still not changed:

1. No campaign statuses changed.
2. No budgets changed.
3. No conversion-governance settings changed.
4. BR/AR were not launched or paused at campaign level.
