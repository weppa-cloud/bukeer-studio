# ColombiaTours Meta Ads Historical Data Audit

Generated: 2026-05-19T03:02:39.302Z
Window: 2024-05-19 to 2026-05-19
Mode: read-only. Meta Ads mutations: 0. Supabase writes: 0.

## Executive Summary

- Account: Colombiatours.Travel24 (COP, America/Bogota).
- Lifetime account spend reported by Meta: $ 30.491.362.
- Audited-window spend: $ 30.491.362.
- Clicks: 309125; landing page views: 16824; platform leads: 497.
- CTR: 4.03%; CPC: $ 99; platform CPL: $ 61.351.
- Recruiting/non-customer-acquisition spend detected: $ 430.709 (1.41%). Keep this separated from travel lead learning.
- First-party Meta-attributed funnel events: 32; Meta-attributed CRM requests: 8.
- Meta click/browser coverage in first-party events: fbc 46.88%, fbp 43.75%.

## Key Findings

- Meta spend has usable creative/audience signal, but platform leads should be treated as weak until CRM quality is fed back through CAPI.
- Recruitment campaigns exist in the same ad account history; their spend must be excluded from ColombiaTours travel-lead optimization datasets.
- The account has custom pixel events and lead events, but the decision truth should be `waflow_submit`, useful conversation, `crm_quote_sent`, opportunity, and itinerary confirmation.
- Country-level learnings should be converted into city-gated tests only where direct Colombia flight connectivity and landing readiness exist.

## Monthly Spend And Lead Signals

| Month | Spend | Clicks | LPV | Platform Leads | CPL |
| --- | --- | --- | --- | --- | --- |
| 2024-10 | $ 2.431 | 27 | 0 | 0 |  |
| 2024-11 | $ 1.190.906 | 16644 | 0 | 0 |  |
| 2024-12 | $ 1.419.338 | 37511 | 0 | 52 | $ 27.295 |
| 2025-01 | $ 985.987 | 47465 | 0 | 0 |  |
| 2025-02 | $ 841.653 | 38701 | 0 | 0 |  |
| 2025-03 | $ 933.590 | 27977 | 0 | 0 |  |
| 2025-04 | $ 931.454 | 18675 | 0 | 0 |  |
| 2025-05 | $ 1.160.243 | 16307 | 0 | 0 |  |
| 2025-06 | $ 1.196.233 | 19861 | 0 | 0 |  |
| 2025-07 | $ 1.211.031 | 18119 | 15 | 0 |  |
| 2025-08 | $ 1.257.572 | 11422 | 9 | 0 |  |
| 2025-09 | $ 1.140.834 | 10802 | 474 | 0 |  |
| 2025-10 | $ 1.175.189 | 4050 | 1419 | 10 | $ 117.519 |
| 2025-11 | $ 1.368.480 | 2308 | 879 | 81 | $ 16.895 |
| 2025-12 | $ 2.154.674 | 4006 | 1354 | 181 | $ 11.904 |
| 2026-01 | $ 2.318.324 | 6694 | 3321 | 149 | $ 15.559 |
| 2026-02 | $ 2.764.156 | 5358 | 2394 | 5 | $ 552.831 |
| 2026-03 | $ 4.359.691 | 10688 | 3746 | 6 | $ 726.615 |
| 2026-04 | $ 4.023.361 | 11602 | 3088 | 13 | $ 309.489 |
| 2026-05 | $ 56.215 | 908 | 125 | 0 |  |

## Top Campaigns By Spend

| Campaign | Category | Spend | Clicks | LPV | Leads | CPL | Recommendation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ABO / Leads / Web / Form Submit | lead_generation | $ 17.933.333 | 41840 | 14711 | 443 | $ 40.482 | mine_creative_and_landing_for_rebuild |
| Customer journey tráfico | traffic | $ 3.309.692 | 75368 | 265 | 0 |  | tracking_or_offer_gap |
| Customer journey Reconocimiento | awareness | $ 3.309.394 | 10447 | 3 | 0 |  | landing_load_or_click_quality_gap |
| Customer Journey Conversión | sales_or_conversion | $ 3.292.328 | 147348 | 193 | 0 |  | landing_load_or_click_quality_gap |
| Clientes potenciales complementarios | lead_generation | $ 1.345.053 | 15846 | 7 | 0 |  | landing_load_or_click_quality_gap |
| Programa de afiliados | affiliate_partner | $ 672.357 | 12305 | 0 | 0 |  | landing_load_or_click_quality_gap |
| Reclutar Travel Planners | recruiting_not_customer_acquisition | $ 306.171 | 2882 | 1062 | 0 |  | exclude_from_travel_lead_learning |
| Conversión whatsapp Campaña | messaging_leads | $ 142.281 | 816 | 0 | 0 |  | landing_load_or_click_quality_gap |
| RRHH / Convocatoria Travel Planner / Colombia / 2025 | recruiting_not_customer_acquisition | $ 94.601 | 1142 | 458 | 2 | $ 47.301 | exclude_from_travel_lead_learning |
| Descubrimiento Colombia" (TOFU) Campaña | uncategorized | $ 56.215 | 908 | 125 | 0 |  | landing_load_or_click_quality_gap |

## Market Readout

| Code | Market | Spend | Clicks | LPV | Leads | CPL | Recommendation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| MX | Mexico | $ 20.189.815 | 174676 | 13603 | 406 | $ 49.729 | evaluate_for_city_gated_meta_test |
| ES | Spain | $ 1.403.932 | 4565 | 807 | 2 | $ 701.966 | evaluate_for_city_gated_meta_test |
| CL | Chile | $ 55.877 | 422 | 0 | 0 |  | evaluate_for_city_gated_meta_test |
| BR | Brazil | $ 0 | 0 | 0 | 0 |  | no_historical_meta_signal |
| AR | Argentina | $ 3.558.701 | 39407 | 207 | 0 |  | evaluate_for_city_gated_meta_test |
| US | United States | $ 57.444 | 307 | 0 | 0 |  | evaluate_for_city_gated_meta_test |
| CO | Colombia | $ 1.693.889 | 17695 | 1899 | 89 | $ 19.032 | exclude_or_separate_local_traffic_for_international_lead_strategy |

## Recommended Actions

1. Build the first Meta test as website/WAFlow leads, not low-friction forms, unless CRM/CAPI feedback is confirmed.
2. Exclude recruiting campaigns and local/non-travel campaigns from any lookalike or learning dataset for travel leads.
3. Use historical winners for creative angles and landing offers, not as conversion truth.
4. Rebuild by city-gated markets aligned with Google Ads: Sao Paulo, Mexico City/Monterrey, Madrid/Barcelona, Santiago, then Buenos Aires.
5. Before launch, close Meta CAPI quality loop for `waflow_submit`, `crm_qualified_lead`, `crm_quote_sent`, opportunity, and confirmed itinerary.

## Files

- `artifacts/meta-ads/2026-05-19-colombiatours-meta-ads-24m-audit/meta-ads-historical-audit.json`
- `artifacts/meta-ads/2026-05-19-colombiatours-meta-ads-24m-audit/monthly-performance.csv`
- `artifacts/meta-ads/2026-05-19-colombiatours-meta-ads-24m-audit/campaign-performance.csv`
- `artifacts/meta-ads/2026-05-19-colombiatours-meta-ads-24m-audit/adset-performance.csv`
- `artifacts/meta-ads/2026-05-19-colombiatours-meta-ads-24m-audit/ad-performance.csv`
- `artifacts/meta-ads/2026-05-19-colombiatours-meta-ads-24m-audit/market-insights.csv`
- `artifacts/meta-ads/2026-05-19-colombiatours-meta-ads-24m-audit/publisher-platform.csv`
- `artifacts/meta-ads/2026-05-19-colombiatours-meta-ads-24m-audit/device-platform.csv`
- `artifacts/meta-ads/2026-05-19-colombiatours-meta-ads-24m-audit/age-gender.csv`
- `artifacts/meta-ads/2026-05-19-colombiatours-meta-ads-24m-audit/first-party-event-summary.csv`
- `artifacts/meta-ads/2026-05-19-colombiatours-meta-ads-24m-audit/waste-candidates.csv`
- `artifacts/meta-ads/2026-05-19-colombiatours-meta-ads-24m-audit/opportunities.csv`
