# ColombiaTours Google Ads + CRM Growth Study

**Generated**: 2026-05-18T15:44:03.318Z
**Mode**: read_only_growth_study
**Account**: 9fc24733-b127-4184-aa22-12f03b98927a
**Website**: colombiatours
**Google Ads API**: OK (v24)

## Executive Readout

The optimization truth for ColombiaTours is now first-party CRM opportunity quality, not legacy Google Ads conversions. A quality lead is counted when the lead reaches `qualified`, `proposal_sent`, or emits `crm_quote_sent`; confirmed itineraries are the lagging revenue signal.

Initial operating target:
- **10 quality opportunities/day**.
- **CPL target COP 40k-60k**.
- **Initial budget COP 400k-600k/day**, staged across MX/ES and a small US test only when the English landing is ready.

## Source Coverage

| Source | Rows |
|---|---:|
| requests | 59 |
| itineraries | 8 |
| funnel_events | 259 |
| waflow_leads | 36 |
| unified leads | 199 |
| production unified leads | 195 |
| Google campaign daily rows | 18 |
| Google search term rows | 198 |
| Google click_view matched gclids | 0 |

## 7/30/90 Day Scoreboard

| Window | Production leads | Synthetic excluded | Quality leads | Google quality leads | Google spend | Observed Google quality CPL | Confirmed itineraries | Confirmed markup |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5d | 195 | 4 | 45 | 30 | COP 788,222 | COP 26,274 | 0 | COP 0 |

## Campaign Budget Plan

| Campaign | Daily budget | Mode | Objective |
|---|---:|---|---|
| MX \| Search \| Colombia paquetes alta intención | COP 300,000 | open_or_scale | 10-lead plan anchor; broadest commercial demand in DataForSEO sample. |
| ES \| Search \| Colombia viajes personalizados | COP 200,000 | scale_existing_with_governance | higher-intent and historically stronger ticket; keep volume controlled. |
| US \| Search \| Colombia Travel Packages test | COP 75,000 | test_only_when_landing_ready | premium English-language signal, high CPC, high potential ticket. |

## 30 Day Campaign Read

| Campaign | Spend | Clicks | First-party quality leads | Observed quality CPL | Action |
|---|---:|---:|---:|---:|---|
| No campaign rows resolved | - | - | - | - | - |

## Commercial Search Term Candidates

| Search term | Campaign | Spend | Clicks | Recommendation |
|---|---|---:|---:|---|
| tour por colombia todo incluido 2026 | MX_Multidestino_y_Caribe_2026_05 | COP 18,034 | 5 | keep_or_expand_exact_phrase |
| paquetes a colombia | MX_Multidestino_y_Caribe_2026_05 | COP 16,106 | 5 | keep_or_expand_exact_phrase |
| colombia tours travel | MX_Multidestino_y_Caribe_2026_05 | COP 13,275 | 8 | keep_or_expand_exact_phrase |
| colombia tours | MX_Multidestino_y_Caribe_2026_05 | COP 11,312 | 7 | keep_or_expand_exact_phrase |
| agencia de viajes colombia | ES_Cartagena_Medellin_2026_05 | COP 11,258 | 3 | keep_or_expand_exact_phrase |
| tours a colombia | MX_Multidestino_y_Caribe_2026_05 | COP 10,864 | 7 | keep_or_expand_exact_phrase |
| agencias de viajes online colombia | ES_Cartagena_Medellin_2026_05 | COP 10,592 | 1 | keep_or_expand_exact_phrase |
| agencia de viajes a colombia | ES_Cartagena_Medellin_2026_05 | COP 10,193 | 3 | keep_or_expand_exact_phrase |
| plan para cartagena todo incluido | CL_Search_Colombia_SanAndres_2026_05 | COP 7,400 | 1 | keep_or_expand_exact_phrase |
| agencias de viaje pereira | ES_Cartagena_Medellin_2026_05 | COP 7,076 | 1 | keep_or_expand_exact_phrase |
| agencia de viaje a colombia | MX_Multidestino_y_Caribe_2026_05 | COP 6,740 | 1 | keep_or_expand_exact_phrase |
| viajes copernico colombia | MX_Multidestino_y_Caribe_2026_05 | COP 6,658 | 1 | keep_or_expand_exact_phrase |

## Negative / Waste Candidates

| Search term | Campaign | Spend | Clicks | Recommendation |
|---|---|---:|---:|---|
| No negative candidates found in the extracted window | - | - | - | - |

## Current Gaps

- gclid_present_but_click_view_not_resolved

## Scaling Rules

- Increase budget 20-30% after 3 consecutive days with CPL <= COP 60k and seller-confirmed quality.
- Hold budget if CPL is COP 60k-100k or attribution completeness is below 80%.
- Reduce or pause terms/ad groups with spend >= COP 120k and zero quality opportunities.
- Do not let Google optimize on legacy conversion actions until offline qualified/quote/booking imports are stable.

## Instrumentation Requirements

- Every Google Ads final URL must include utm_source=google, utm_medium=cpc, utm_campaign matching campaign name.
- WAFlow/landing must persist gclid, gbraid/wbraid, reference_code and chatwoot_conversation_id into requests/funnel_events.
- Sales team must maintain request_stage/proposal_sent/closed_won status same day for daily optimization.
- Offline upload should send qualified/proposal_sent/booking_confirmed only from first-party canonical events.

## Next Operating Actions

1. Use this report as the weekly paid-search decision packet.
2. Keep Mexico and Spain as the first budget centers until CRM opportunity quality stabilizes.
3. Open the US English test only when an English landing and seller handling path are ready.
4. Upload only canonical offline events to Google Ads: `qualified`, `crm_quote_sent`, and `crm_booking_confirmed`.
5. Require seller same-day CRM stage hygiene; otherwise the algorithm will optimize toward form volume instead of opportunities.
