# ColombiaTours Google Ads + CRM Growth Study

**Generated**: 2026-05-10T07:17:54.571Z  
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
| requests | 1,569 |
| itineraries | 954 |
| funnel_events | 214 |
| waflow_leads | 70 |
| unified leads | 1,634 |
| production unified leads | 1,578 |
| Google campaign daily rows | 19 |
| Google search term rows | 249 |
| Google click_view matched gclids | 0 |

## 7/30/90 Day Scoreboard

| Window | Production leads | Synthetic excluded | Quality leads | Google quality leads | Google spend | Observed Google quality CPL | Confirmed itineraries | Confirmed markup |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 7d | 99 | 31 | 35 | 19 | COP 584,740 | COP 30,776 | 0 | COP 0 |
| 30d | 431 | 55 | 214 | 19 | COP 584,740 | COP 30,776 | 1 | COP 8,902,746 |
| 90d | 1,578 | 56 | 935 | 19 | COP 1,107,214 | COP 58,274 | 58 | COP 49,996,683 |

## Campaign Budget Plan

| Campaign | Daily budget | Mode | Objective |
|---|---:|---|---|
| MX \| Search \| Colombia paquetes alta intención | COP 300,000 | open_or_scale | 10-lead plan anchor; broadest commercial demand in DataForSEO sample. |
| ES \| Search \| Colombia viajes personalizados | COP 200,000 | scale_existing_with_governance | higher-intent and historically stronger ticket; keep volume controlled. |
| US \| Search \| Colombia Travel Packages test | COP 75,000 | test_only_when_landing_ready | premium English-language signal, high CPC, high potential ticket. |

## 30 Day Campaign Read

| Campaign | Spend | Clicks | First-party quality leads | Observed quality CPL | Action |
|---|---:|---:|---:|---:|---|
| (unattributed) | COP 0 | 0 | 195 | COP 0 | fix_attribution_before_budget_decision |
| 23815528484 | COP 0 | 0 | 17 | COP 0 | crm_only_no_paid_budget_action |
| 23819986291 | COP 0 | 0 | 2 | COP 0 | crm_only_no_paid_budget_action |
| MX_Multidestino_y_Caribe_2026_05 | COP 330,079 | 212 | 0 | - | priority_learning |
| ES_Cartagena_Medellin_2026_05 | COP 254,661 | 65 | 0 | - | audit_terms_or_pause_budget_leak |
| 120234265547150487 | COP 0 | 0 | 0 | - | watch |

## Commercial Search Term Candidates

| Search term | Campaign | Spend | Clicks | Recommendation |
|---|---|---:|---:|---|
| viaje a colombia | MX \| Leads \| Search \| Colombia #3 | COP 22,776 | 9 | keep_or_expand_exact_phrase |
| viajes a colombia | MX \| Leads \| Search \| Colombia #3 | COP 17,029 | 7 | keep_or_expand_exact_phrase |
| tour colombia | MX \| Leads \| Search \| Colombia #3 | COP 16,584 | 8 | keep_or_expand_exact_phrase |
| agencia de viajes colombia | MX_Multidestino_y_Caribe_2026_05 | COP 15,024 | 7 | keep_or_expand_exact_phrase |
| viaje a colombia todo incluido | MX \| Leads \| Search \| Colombia #3 | COP 12,363 | 7 | keep_or_expand_exact_phrase |
| city tour medellin | ES_Cartagena_Medellin_2026_05 | COP 8,398 | 1 | keep_or_expand_exact_phrase |
| viajes a colombia desde cdmx todo incluido | MX \| Leads \| Search \| Colombia #3 | COP 7,561 | 3 | keep_or_expand_exact_phrase |
| tours a colombia | MX \| Leads \| Search \| Colombia #3 | COP 7,230 | 4 | keep_or_expand_exact_phrase |
| viajes cartagena de indias todo incluido | ES_Cartagena_Medellin_2026_05 | COP 6,855 | 1 | keep_or_expand_exact_phrase |
| paquetes cartagena de indias todo incluido | ES_Cartagena_Medellin_2026_05 | COP 6,674 | 1 | keep_or_expand_exact_phrase |
| tour al eje cafetero desde medellin | ES_Cartagena_Medellin_2026_05 | COP 6,422 | 1 | keep_or_expand_exact_phrase |
| paquetes para viajar a colombia | MX_Multidestino_y_Caribe_2026_05 | COP 6,280 | 2 | keep_or_expand_exact_phrase |

## Negative / Waste Candidates

| Search term | Campaign | Spend | Clicks | Recommendation |
|---|---|---:|---:|---|
| civitatis eje cafetero | ES_Cartagena_Medellin_2026_05 | COP 3,307 | 1 | negative_candidate |
| san andres y providencia hoteles | ES_Cartagena_Medellin_2026_05 | COP 2,950 | 1 | negative_candidate |
| hoteles todo incluido en playas de colombia | MX \| Leads \| Search \| Colombia #3 | COP 2,600 | 1 | negative_candidate |
| hoteles en colombia | MX \| Leads \| Search \| Colombia #3 | COP 2,480 | 1 | negative_candidate |
| hoteles en colombia todo incluido | MX \| Leads \| Search \| Colombia #3 | COP 2,362 | 1 | negative_candidate |
| vuelos a colombia desde cdmx | MX_Multidestino_y_Caribe_2026_05 | COP 2,274 | 2 | negative_candidate |
| vuelos a colombia desde méxico | MX_Multidestino_y_Caribe_2026_05 | COP 2,172 | 2 | negative_candidate |
| vuelos a colombia desde monterrey | MX_Multidestino_y_Caribe_2026_05 | COP 1,798 | 1 | negative_candidate |
| vuelos a cartagena colombia | ES_Cartagena_Medellin_2026_05 | COP 1,521 | 1 | negative_candidate |
| aerolineas mexico colombia | MX_Multidestino_y_Caribe_2026_05 | COP 1,445 | 1 | negative_candidate |
| vuelos de méxico a colombia precios ida y vuelta | MX_Multidestino_y_Caribe_2026_05 | COP 969 | 1 | negative_candidate |

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
