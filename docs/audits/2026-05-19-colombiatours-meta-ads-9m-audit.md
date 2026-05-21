# ColombiaTours Meta Ads Historical Data Audit

Generated: 2026-05-19T23:22:41.014Z
Window: 2025-08-19 to 2026-05-19
Mode: read-only. Meta Ads mutations: 0. Supabase writes: 0.

## Executive Summary

- Account: Colombiatours.Travel24 (COP, America/Bogota).
- Lifetime account spend reported by Meta: $ 30.491.362.
- Audited-window spend: $ 19.880.400.
- Clicks: 60067; landing page views: 16800; platform leads: 445.
- CTR: 2.08%; CPC: $ 331; platform CPL: $ 44.675.
- Recruiting/non-customer-acquisition spend detected: $ 246.059 (1.24%). Keep this separated from travel lead learning.
- First-party Meta-attributed funnel events: 31; Meta-attributed CRM requests: 8.
- Meta click/browser coverage in first-party events: fbc 45.16%, fbp 45.16%.

## Key Findings

- Meta spend has usable creative/audience signal, but platform leads should be treated as weak until CRM quality is fed back through CAPI.
- Recruitment campaigns exist in the same ad account history; their spend must be excluded from ColombiaTours travel-lead optimization datasets.
- The account has custom pixel events and lead events, but the decision truth should be `waflow_submit`, useful conversation, `crm_quote_sent`, opportunity, and itinerary confirmation.
- Country-level learnings should be converted into city-gated tests only where direct Colombia flight connectivity and landing readiness exist.

## Monthly Spend And Lead Signals

| Month | Spend | Clicks | LPV | Platform Leads | CPL |
| --- | --- | --- | --- | --- | --- |
| 2025-08 | $ 519.476 | 3651 | 0 | 0 |  |
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
| Customer journey Reconocimiento | awareness | $ 414.725 | 1894 | 0 | 0 |  | landing_load_or_click_quality_gap |
| Customer journey tráfico | traffic | $ 413.393 | 7376 | 256 | 0 |  | tracking_or_offer_gap |
| Customer Journey Conversión | sales_or_conversion | $ 408.669 | 2749 | 188 | 0 |  | landing_load_or_click_quality_gap |
| Clientes potenciales complementarios | lead_generation | $ 408.006 | 2360 | 0 | 0 |  | landing_load_or_click_quality_gap |
| Reclutar Travel Planners | recruiting_not_customer_acquisition | $ 151.458 | 1798 | 1062 | 0 |  | exclude_from_travel_lead_learning |
| RRHH / Convocatoria Travel Planner / Colombia / 2025 | recruiting_not_customer_acquisition | $ 94.601 | 1142 | 458 | 2 | $ 47.301 | exclude_from_travel_lead_learning |
| Descubrimiento Colombia" (TOFU) Campaña | uncategorized | $ 56.215 | 908 | 125 | 0 |  | landing_load_or_click_quality_gap |

## Market Readout

| Code | Market | Spend | Clicks | LPV | Leads | CPL | Recommendation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| MX | Mexico | $ 16.889.744 | 44016 | 13591 | 406 | $ 41.600 | evaluate_for_city_gated_meta_test |
| ES | Spain | $ 1.020.045 | 2398 | 804 | 2 | $ 510.023 | evaluate_for_city_gated_meta_test |
| CL | Chile | $ 6.707 | 46 | 0 | 0 |  | evaluate_for_city_gated_meta_test |
| BR | Brazil | $ 0 | 0 | 0 | 0 |  | no_historical_meta_signal |
| AR | Argentina | $ 503.195 | 2553 | 205 | 0 |  | evaluate_for_city_gated_meta_test |
| US | United States | $ 3.870 | 9 | 0 | 0 |  | evaluate_for_city_gated_meta_test |
| CO | Colombia | $ 836.853 | 4084 | 1899 | 37 | $ 22.618 | exclude_or_separate_local_traffic_for_international_lead_strategy |

## Recommended Actions

1. Build the first Meta test as website/WAFlow leads, not low-friction forms, unless CRM/CAPI feedback is confirmed.
2. Exclude recruiting campaigns and local/non-travel campaigns from any lookalike or learning dataset for travel leads.
3. Use historical winners for creative angles and landing offers, not as conversion truth.
4. Rebuild by city-gated markets aligned with Google Ads: Sao Paulo, Mexico City/Monterrey, Madrid/Barcelona, Santiago, then Buenos Aires.
5. Before launch, close Meta CAPI quality loop for `waflow_submit`, `crm_qualified_lead`, `crm_quote_sent`, opportunity, and confirmed itinerary.

## Files

- `artifacts/meta-ads/2026-05-19-colombiatours-meta-ads-9m-audit/meta-ads-historical-audit.json`
- `artifacts/meta-ads/2026-05-19-colombiatours-meta-ads-9m-audit/monthly-performance.csv`
- `artifacts/meta-ads/2026-05-19-colombiatours-meta-ads-9m-audit/campaign-performance.csv`
- `artifacts/meta-ads/2026-05-19-colombiatours-meta-ads-9m-audit/adset-performance.csv`
- `artifacts/meta-ads/2026-05-19-colombiatours-meta-ads-9m-audit/ad-performance.csv`
- `artifacts/meta-ads/2026-05-19-colombiatours-meta-ads-9m-audit/market-insights.csv`
- `artifacts/meta-ads/2026-05-19-colombiatours-meta-ads-9m-audit/publisher-platform.csv`
- `artifacts/meta-ads/2026-05-19-colombiatours-meta-ads-9m-audit/device-platform.csv`
- `artifacts/meta-ads/2026-05-19-colombiatours-meta-ads-9m-audit/age-gender.csv`
- `artifacts/meta-ads/2026-05-19-colombiatours-meta-ads-9m-audit/first-party-event-summary.csv`
- `artifacts/meta-ads/2026-05-19-colombiatours-meta-ads-9m-audit/waste-candidates.csv`
- `artifacts/meta-ads/2026-05-19-colombiatours-meta-ads-9m-audit/opportunities.csv`
