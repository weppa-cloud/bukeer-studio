# ColombiaTours Paid Search 24m Historical Mining

Generated: 2026-05-18T17:13:46.209Z
Window: 2024-05-18 to 2026-05-18 (24 months)
Mode: apply_analysis_local_files_only
Read-only: true

## Executive Summary

- Google Ads spend reviewed: COP 64,616,549 across 16 campaigns and 4351 unique search terms.
- First-party rows reviewed: 2116 requests, 3079 itineraries, 661 funnel events, 132 WAFlow leads.
- Recommended negatives: 766. Estimated waste in recommended negatives: COP 2,255,534.
- Positive structural opportunities: 675. Campaign action rows: 16. Landing rows: 7971.
- Historical Google Ads conversions were treated as context only; first-party WAFlow, CRM and itinerary signals drive quality scoring.

## Validation

- [ok] Google Ads monthly spend/clicks: 23 months with campaign rows
- [ok] Search terms with spend: 15000 search term rows
- [ok] Campaign/ad group/keyword coverage: 1175/1964/13681 campaign/adGroup/keyword rows
- [ok] Landing coverage and 200 validation sample: 8000 landing rows, 50/50 sampled OK
- [ok] First-party rows: 2177 unified first-party leads
- [ok] Attribution bridge by click id/UTM/reference: 114 with click id; 137 with UTM campaign; 210 with reference_code

## Tracking Checklist

| item | status | coverage | detail |
| --- | --- | --- | --- |
| gclid/gbraid/wbraid presence in first-party rows | gap | 0.052 | 5% of unified first-party leads |
| UTM presence in first-party rows | gap | 0.063 | 6% of unified first-party leads |
| reference_code presence | gap | 0.096 | 10% of unified first-party leads |
| landing URLs return 200/2xx | ok | 1 | 50/50 sampled landings OK |
| landing tracking hooks detected | ok | 1 | 50/50 sampled landings with hooks |
| Google Ads historical conversion actions | context_only | 1 | Formulario / ColombiaTours - GA4 (web) envio_formulario / ColombiaTours - GA4 (web) registro_formulario / ColombiaTours - GA4 (web) page_... |
| WAFlow submit and CRM opportunity coverage | ok | 1 | 132 waflow rows, 2116 requests, 661 funnel events |

## Campaign Actions

| campaignName | market | spendCop | qualityLeads | negativeWasteCop | recommendedAction | reason |
| --- | --- | --- | --- | --- | --- | --- |
| MX / Leads / Search / Colombia |  | 16988278 | 0 | 1587055 | rebuild | structure should be rebuilt around winners and negatives |
| Mexico Viajar a colombia #5 | MX | 15508747 | 0 | 322876 | rebuild | structure should be rebuilt around winners and negatives |
| MX / Leads / Search / Colombia #3 |  | 9476080 | 0 | 390721 | rebuild | structure should be rebuilt around winners and negatives |
| ES / Leads / Search / Colombia |  | 7880607 | 0 | 736393 | rebuild | structure should be rebuilt around winners and negatives |
| Busqueda España | ES | 5303204 | 0 | 66037 | rebuild | structure should be rebuilt around winners and negatives |
| ARG / Leads / Search / Colombia |  | 4201876 | 0 | 371312 | landing_mismatch | high-intent spend is not aligned to landing themes |
| Viajar a Colombia desde España | ES | 1482564 | 0 | 33669 | rebuild | structure should be rebuilt around winners and negatives |
| MX_Multidestino_y_Caribe_2026_05 | MX | 1050783 | 56 | 176710 | rebuild | structure should be rebuilt around winners and negatives |
| ES_Cartagena_Medellin_2026_05 | ES | 825939 | 22 | 88338 | landing_mismatch | high-intent spend is not aligned to landing themes |
| Mexico Viajar a colombia | MX | 764441 | 0 | 21076 | rebuild | structure should be rebuilt around winners and negatives |
| CL_Search_Colombia_SanAndres_2026_05 | CL | 295534 | 8 | 4339 | landing_mismatch | high-intent spend is not aligned to landing themes |
| Viajar a Colombia-Busqueda |  | 229776 | 0 | 1113 | landing_mismatch | high-intent spend is not aligned to landing themes |
| Viajar a Colombia desde Argentina | AR | 195884 | 0 | 4461 | landing_mismatch | high-intent spend is not aligned to landing themes |
| Busqueda USA | US | 186101 | 0 | 4974 | rebuild | structure should be rebuilt around winners and negatives |
| US_Florida_NY_Colombia_Packages_2026_05 | US | 129881 | 0 | 9231 | keep | no strong pause/scale signal; keep under observation |
| MX / Leads / Search / Colombia #2 |  | 96855 | 0 | 13303 | landing_mismatch | high-intent spend is not aligned to landing themes |

## Negative Keywords - Review Queue

| keywordText | matchType | estimatedWasteCop | intent | confidence | campaigns |
| --- | --- | --- | --- | --- | --- |
| vuelos a colombia | EXACT | 149694 | flight_only | 0.900 | MX / Leads / Search / Colombia / ES / Leads / Search / Colombia / ARG / Leads / Search / Colombia |
| vuelos a cartagena colombia | EXACT | 46468 | flight_only | 0.950 | MX / Leads / Search / Colombia / ES_Cartagena_Medellin_2026_05 |
| vuelos a colombia desde cdmx | EXACT | 35154 | flight_only | 0.950 | MX / Leads / Search / Colombia / MX_Multidestino_y_Caribe_2026_05 |
| vuelo a colombia | EXACT | 25259 | flight_only | 0.900 | MX / Leads / Search / Colombia |
| avianca | EXACT | 23843 | flight_only | 0.900 | Mexico Viajar a colombia #5 |
| vuelos baratos a colombia | EXACT | 21368 | flight_only | 0.800 | ES / Leads / Search / Colombia / MX / Leads / Search / Colombia |
| colombia vuelos | EXACT | 20206 | flight_only | 0.800 | MX / Leads / Search / Colombia |
| vuelos a colombia desde méxico | EXACT | 19887 | flight_only | 0.900 | MX / Leads / Search / Colombia / MX_Multidestino_y_Caribe_2026_05 |
| boletos a colombia | EXACT | 19152 | flight_only | 0.900 | MX / Leads / Search / Colombia #3 / MX / Leads / Search / Colombia |
| pasajes para colombia | EXACT | 16514 | flight_only | 0.900 | ES / Leads / Search / Colombia / MX / Leads / Search / Colombia #3 / MX / Leads / Search / Colombia |
| vuelos colombia | EXACT | 16157 | flight_only | 0.900 | ES / Leads / Search / Colombia / MX / Leads / Search / Colombia |
| vuelos de mexico a colombia | EXACT | 16105 | flight_only | 0.900 | MX / Leads / Search / Colombia / MX / Leads / Search / Colombia #3 |
| vuelos para colombia desde españa | EXACT | 15422 | flight_only | 0.900 | ES / Leads / Search / Colombia |
| vuelos de guadalajara a colombia | EXACT | 15384 | flight_only | 0.880 | MX / Leads / Search / Colombia |
| viaje a cancun todo incluido | EXACT | 14403 | junk | 0.420 | MX / Leads / Search / Colombia |
| boletos para colombia desde mexico | EXACT | 14226 | flight_only | 0.880 | MX / Leads / Search / Colombia #3 / MX / Leads / Search / Colombia |
| agencias colombianas de viajes | EXACT | 13849 | junk | 0.420 | MX / Leads / Search / Colombia #3 / Mexico Viajar a colombia #5 / ES / Leads / Search / Colombia |
| cancun todo incluido | EXACT | 13592 | junk | 0.420 | MX / Leads / Search / Colombia |
| turismundo buga | EXACT | 12952 | junk | 0.420 | ES / Leads / Search / Colombia |
| tours a las islas del rosario | EXACT | 12792 | junk | 0.420 | MX / Leads / Search / Colombia #3 |

## Positive Search Terms - Build Queue

| searchTerm | action | spendCop | intent | intentScore | expansionScore | suggestedAdGroup |
| --- | --- | --- | --- | --- | --- | --- |
| eje cafetero | promote_exact | 28712 | destination_specific | 92 | 88 | ST_EjeCafetero_Packages |
| paquete de viajes a colombia | promote_exact | 18545 | high_commercial | 100 | 87 | ST_Colombia_Packages |
| paquete turístico a colombia | promote_exact | 14423 | high_commercial | 100 | 85 | ST_Turistico |
| colombia paquetes de viaje | promote_exact | 13726 | high_commercial | 100 | 85 | ST_Colombia_Custom_Packages |
| paquete turístico colombia | promote_exact | 11445 | high_commercial | 100 | 85 | ST_Turistico |
| paquetes a san andres all inclusive | new_landing | 9319 | high_commercial | 100 | 84 | ST_SanAndres_Packages |
| tour medellin y cartagena | new_landing | 8887 | destination_specific | 90 | 84 | ST_Cartagena_Packages |
| medellin | promote_exact | 220384 | destination_specific | 86 | 83 | ST_Medellin_Packages |
| tours en cali colombia | promote_exact | 10237 | destination_specific | 90 | 83 | ST_Cali_Packages |
| tour bogota colombia | promote_exact | 8926 | destination_specific | 90 | 83 | ST_Bogota_Packages |
| paquetes de mexico a colombia | promote_exact | 8889 | high_commercial | 100 | 83 | ST_Mexico |
| paquetes de viajes a san andres colombia | promote_exact | 8311 | high_commercial | 100 | 83 | ST_SanAndres_Packages |
| paquete a san andres | promote_exact | 5434 | high_commercial | 100 | 83 | ST_SanAndres_Packages |
| cartagena de indias | new_landing | 56438 | destination_specific | 86 | 82 | ST_Cartagena_Packages |
| agencia de viajes cali colombia | promote_exact | 27385 | high_commercial | 100 | 82 | ST_Cali_Packages |
| paquetes para viajar a cartagena | promote_exact | 7217 | high_commercial | 100 | 82 | ST_Cartagena_Packages |
| paquete de viajes colombia | promote_exact | 5242 | high_commercial | 100 | 82 | ST_Colombia_Custom_Packages |
| isla san andres paquetes | new_landing | 4579 | high_commercial | 100 | 82 | ST_SanAndres_Packages |
| tour al eje cafetero desde medellin | new_landing | 17817 | destination_specific | 88 | 81 | ST_Medellin_Packages |
| tours en santa marta colombia | promote_exact | 5219 | destination_specific | 89 | 81 | ST_SantaMarta_Packages |

## Landing Opportunities

| landingUrl | spendCop | status | trackingPresent | recommendedAction | reason |
| --- | --- | --- | --- | --- | --- |
| https://colombiatours.travel/agencia-de-viajes-a-colombia-para-mexicanos/?gad_source=1&gad_campaignid=22894809738 | 4257232 | 200 | true | new_landing | multiple high-intent terms need tighter landing alignment |
| https://colombiatours.travel/viaja-colombia-desde-espana-landing/?gad_source=5 | 3991781 | 200 | true | new_landing | multiple high-intent terms need tighter landing alignment |
| https://colombiatours.travel/reserva-paquetes-todo-incluido-a-colombia/?gad_source=1&gad_campaignid=22916723251 | 2506379 | 200 | true | new_landing | multiple high-intent terms need tighter landing alignment |
| https://colombiatours.travel/agencia-de-viajes-a-colombia-para-mexicanos/?gad_source=1&gad_campaignid=23354432072 | 1014856 | 200 | true | new_landing | multiple high-intent terms need tighter landing alignment |
| https://colombiatours.travel/arma-tu-plan-medellin/?gad_source=1 | 890662 | 200 | true | new_landing | multiple high-intent terms need tighter landing alignment |
| https://colombiatours.travel/viajar-a-colombia-con-todo-incluido2?gad_source=1 | 782000 | 200 | true | new_landing | multiple high-intent terms need tighter landing alignment |
| https://colombiatours.travel/viajar-a-colombia-desde-argentina/?gad_source=1&gad_campaignid=22912634147 | 730123 | 200 | true | new_landing | multiple high-intent terms need tighter landing alignment |
| https://colombiatours.travel/agencia-de-viajes-a-colombia-para-mexicanos?utm_source=google&utm_medium=cpc&utm_campaign=23815528484&utm_co... | 171340 | 200 | true | new_landing | multiple high-intent terms need tighter landing alignment |
| https://colombiatours.travel/trips-to-colombia-from-usa/?gad_source=1 | 136167 | 200 | true | new_landing | multiple high-intent terms need tighter landing alignment |
| https://colombiatours.travel/viajes-a-colombia-desde-chile?gad_source=1&gad_campaignid=23829507075 | 69715 |  |  | new_landing | multiple high-intent terms need tighter landing alignment |
| https://colombiatours.travel/agencia-de-viajes-a-colombia-para-espanoles?utm_source=google&utm_medium=cpc&utm_campaign=23819986291&utm_co... | 43184 |  |  | new_landing | multiple high-intent terms need tighter landing alignment |
| https://colombiatours.travel/viaja-colombia-desde-espana-landing/?gad_source=1 | 1098422 | 200 | true | keep_observe | no urgent landing issue detected |
| https://colombiatours.travel/viajes-a-colombia-desde-espana-personalizados/?gad_source=5 | 912505 | 200 | true | keep_observe | no urgent landing issue detected |
| https://colombiatours.travel/?gad_source=1 | 878550 | 200 | true | keep_observe | no urgent landing issue detected |
| https://colombiatours.travel/reserva-tus-viajes-a-colombia-desde-mexico/?gad_source=1&gad_campaignid=22894809738#medellin-eje-cafetero | 782253 | 200 | true | keep_observe | no urgent landing issue detected |
| https://colombiatours.travel/viajar-a-colombia-con-todo-incluido2?gad_source=5&gad_campaignid=22912634147 | 683886 | 200 | true | keep_observe | no urgent landing issue detected |
| https://colombiatours.travel/viajar-a-colombia-con-todo-incluido2/?gad_source=5&gad_campaignid=21507476599 | 586366 | 200 | true | keep_observe | no urgent landing issue detected |
| https://colombiatours.travel/agencia-de-viajes-a-colombia-para-espanoles/?gad_source=1&gad_campaignid=22916723251 | 574992 | 200 | true | keep_observe | no urgent landing issue detected |
| https://colombiatours.travel/los-10-mejores-lugares-turisticos-de-colombia/?gad_source=1 | 442454 | 200 | true | keep_observe | no urgent landing issue detected |
| https://colombiatours.travel/reserva-a-colombia-todo-incluido-desde-mexico/?gad_source=5&gad_campaignid=22894809738 | 438946 | 200 | true | keep_observe | no urgent landing issue detected |

## Market Insights

| market | spendCop | qualityLeads | negativeWasteCop | positiveTermCount | recommendedAction |
| --- | --- | --- | --- | --- | --- |
| UNKNOWN | 38873471 | 0 | 1875498 | 816 | rebuild_structure |
| MX | 17323972 | 56 | 433702 | 667 | scale |
| ES | 7611707 | 22 | 176154 | 152 | scale |
| US | 315982 | 0 | 14205 | 15 | rebuild_structure |
| CL | 295534 | 8 | 4339 | 28 | scale |
| AR | 195884 | 0 | 4461 | 17 | rebuild_structure |

## Budget Rules

- No scaling without first-party quality: crmQualityScore >= 60 and traceabilityRate >= 0.45. Action: increase budget gradually after negatives/landing fixes are queued. Candidates: none
- Contain waste before broadening match: negativeWasteCop > 18% of spend or campaignAction in budget_leak/pause_candidate. Action: hold or reduce spend until negatives are reviewed and applied in a future change window. Candidates: none
- Landing first for destination clusters: positiveTermCount >= 5 and landingGapCostCop material. Action: build landing/ad group pair before increasing campaign daily budget. Candidates: ARG | Leads | Search | Colombia | ES_Cartagena_Medellin_2026_05 | CL_Search_Colombia_SanAndres_2026_05 | Viajar a Colombia-Busqueda | Viajar a Colombia desde Argentina | MX | Leads | Search | Colombia #2
- Market reallocation guardrail: qualityLeads > 0 and negativeWasteCop < 18% of spend at market level. Action: prioritize incremental tests in these markets. Candidates: MX | ES | CL

## QA Required Before Any Future Mutations

- Review the first 100 high-spend terms in `mining-report.json.analysis.qaSample.highSpendTermsForManualReview`.
- Review the first 50 negative recommendations in `mining-report.json.analysis.qaSample.negativeTermsForManualReview`.
- Confirm negatives manually before any future Google Ads mutation script is considered.
- Confirm landing URLs and tracking hooks for every `fix_url` or `tracking_fix` row.

## Local Artifacts

- JSON: `artifacts/google-ads/2026-05-18-colombiatours-24m-mining/mining-report.json`
- Negatives CSV: `artifacts/google-ads/2026-05-18-colombiatours-24m-mining/negative-keywords.csv`
- Positives CSV: `artifacts/google-ads/2026-05-18-colombiatours-24m-mining/positive-search-terms.csv`
- Campaign actions CSV: `artifacts/google-ads/2026-05-18-colombiatours-24m-mining/campaign-actions.csv`
- Landing opportunities CSV: `artifacts/google-ads/2026-05-18-colombiatours-24m-mining/landing-opportunities.csv`
- Market insights CSV: `artifacts/google-ads/2026-05-18-colombiatours-24m-mining/market-insights.csv`

## Query / Classification Notes

- LLM enabled: true. Model: meta/llama-4-maverick-17b-128e-instruct. Classified: 300. From cache: 0.
- Query errors: none
