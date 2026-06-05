# ColombiaTours Learning-Safe Optimizations

Generated: 2026-05-19T02:32:37.302Z
Mode: read-only + local artifacts + Google Ads validateOnly evidence.
Google Ads mutations applied: 0.
Supabase writes applied: 0.
Active campaign learning impact: none.

## Campaign Learning Risk

| Market | Campaign | Status | Primary | Bidding | Bid Status | Risk |
| --- | --- | --- | --- | --- | --- | --- |
| AR | AR_Search_Colombia_Packages_2026_05 | PAUSED | PAUSED | MANUAL_CPC | UNAVAILABLE | LOW |
| BR | BR_Search_Colombia_Packages_2026_05 | ENABLED | NOT_ELIGIBLE | MANUAL_CPC | UNAVAILABLE | LOW |
| CL | CL_Search_Colombia_SanAndres_2026_05 | ENABLED | ELIGIBLE | MAXIMIZE_CONVERSIONS | ENABLED | HIGH |
| DE | DE_Search_Kolumbien_Rundreise_2026_05 | PAUSED | PAUSED | MANUAL_CPC | UNAVAILABLE | LOW |
| ES | ES_Cartagena_Medellin_2026_05 | ENABLED | ELIGIBLE | MAXIMIZE_CONVERSIONS | ENABLED | HIGH |
| FR | FR_Search_Colombie_Sur_Mesure_2026_05 | PAUSED | PAUSED | MANUAL_CPC | UNAVAILABLE | LOW |
| MX | MX_Multidestino_y_Caribe_2026_05 | ENABLED | ELIGIBLE | MAXIMIZE_CONVERSIONS | ENABLED | HIGH |
| US | US_Florida_NY_Colombia_Packages_2026_05 | PAUSED | PAUSED | MAXIMIZE_CONVERSIONS | PAUSED | HIGH |

## Executed Safe Optimizations

| Priority | Action | Status | Learning Impact | Gate |
| --- | --- | --- | --- | --- |
| P1 | creative_shadow_package | EXECUTED_LOCAL | NONE | Manual review before any paused-asset creation. |
| P1 | google_ads_validate_only | PASSED | NONE | No serving mutation applied. |
| P1 | active_landing_health_check | PASSED | NONE | Fix only if HTTP/tracking fails; avoid final URL changes during learning window. |
| P1 | mutation_guardrail | APPLIED_AS_POLICY | NONE | Any future apply must pass explicit user approval and validateOnly first. |

## Creative Shadow Package

- Package: `artifacts/google-ads/2026-05-19-colombiatours-search-creative-assets-p1-p2-shadow/creative-shadow-plan.json`
- Paused RSA plans: 12
- Sitelinks: 24
- Callouts: 32
- Structured snippets: 12
- Image briefs: 16
- Lead-form briefs: 4
- Validate-only RSA operations: 12
- Validate-only asset operations: 68

## Active Landing Checks

| Campaign | Ad Group | HTTP | GTM/gtag | WhatsApp | WAFlow | OK | Resolved URL |
| --- | --- | --- | --- | --- | --- | --- | --- |
| MX_Multidestino_y_Caribe_2026_05 | AG1_San_Andres_Caribe | 200 | true | true | true | true | https://colombiatours.travel/san-andres-4-dias |
| MX_Multidestino_y_Caribe_2026_05 | AG2_Multidestino_Tours | 200 | true | true | true | true | https://colombiatours.travel/paquetes-colombia-desde-mexico |
| MX_Multidestino_y_Caribe_2026_05 | AG3_Cartagena_Caribe | 200 | true | true | true | true | https://colombiatours.travel/cartagena |
| MX_Multidestino_y_Caribe_2026_05 | AG4_Medellin_Guatape | 200 | true | true | true | true | https://colombiatours.travel/paquetes/medellin-y-guatape-5-dias-ciudad-de-la-eterna-primavera |
| ES_Cartagena_Medellin_2026_05 | AG1_Cartagena_Premium | 200 | true | true | true | true | https://colombiatours.travel/cartagena |
| ES_Cartagena_Medellin_2026_05 | AG2_Medellin_Cultural | 200 | true | true | true | true | https://colombiatours.travel/paquetes/medellin-y-guatape-5-dias-ciudad-de-la-eterna-primavera |
| ES_Cartagena_Medellin_2026_05 | AG3_Multidestino_Premium | 200 | true | true | true | true | https://colombiatours.travel/paquetes-colombia-desde-espana |
| MX_Multidestino_y_Caribe_2026_05 | AG1_San_Andres_Caribe | 200 | true | true | true | true | https://colombiatours.travel/san-andres-4-dias |
| MX_Multidestino_y_Caribe_2026_05 | AG2_Multidestino_Tours | 200 | true | true | true | true | https://colombiatours.travel/paquetes-colombia-desde-mexico |
| MX_Multidestino_y_Caribe_2026_05 | AG3_Cartagena_Caribe | 200 | true | true | true | true | https://colombiatours.travel/cartagena |
| MX_Multidestino_y_Caribe_2026_05 | AG4_Medellin_Guatape | 200 | true | true | true | true | https://colombiatours.travel/paquetes/medellin-y-guatape-5-dias-ciudad-de-la-eterna-primavera |
| ES_Cartagena_Medellin_2026_05 | AG1_Cartagena_Premium | 200 | true | true | true | true | https://colombiatours.travel/cartagena |
| ES_Cartagena_Medellin_2026_05 | AG2_Medellin_Cultural | 200 | true | true | true | true | https://colombiatours.travel/paquetes/medellin-y-guatape-5-dias-ciudad-de-la-eterna-primavera |
| ES_Cartagena_Medellin_2026_05 | AG3_Multidestino_Premium | 200 | true | true | true | true | https://colombiatours.travel/paquetes-colombia-desde-espana |
| ES_Cartagena_Medellin_2026_05 | AG4_Eje_Cafetero_Test | 200 | true | true | true | true | https://colombiatours.travel/eje-cafetero |
| ES_Cartagena_Medellin_2026_05 | AG4_Eje_Cafetero_Test | 200 | true | true | true | true | https://colombiatours.travel/eje-cafetero |
| CL_Search_Colombia_SanAndres_2026_05 | CL_San_Andres_Paquetes | 200 | true | true | true | true | https://colombiatours.travel/san-andres-4-dias |
| CL_Search_Colombia_SanAndres_2026_05 | CL_Colombia_Todo_Incluido | 200 | true | true | true | true | https://colombiatours.travel/viajes-colombia-desde-chile |
| CL_Search_Colombia_SanAndres_2026_05 | CL_Agencia_Colombia | 200 | true | true | true | true | https://colombiatours.travel/viajes-colombia-desde-chile |
| BR_Search_Colombia_Packages_2026_05 | AG1_Pacotes_Colombia | 200 | true | true | true | true | https://colombiatours.travel/pt/pacotes-colombia |

## Blocked Until Gate

- No budget changes.
- No bidding strategy changes.
- No conversion-goal changes.
- No geo or location-mode changes.
- No active keyword or match-type changes.
- No active ad enable/pause/final URL changes.
- No asset attachments to active campaigns before the 72h/30-click gate.
- No lead-form attachments until CRM quality is confirmed.

## Files

- `artifacts/google-ads/2026-05-19-colombiatours-learning-safe-optimizations/learning-safe-report.json`
- `artifacts/google-ads/2026-05-19-colombiatours-learning-safe-optimizations/campaign-learning-risk.csv`
- `artifacts/google-ads/2026-05-19-colombiatours-learning-safe-optimizations/active-landing-url-checks.csv`
- `artifacts/google-ads/2026-05-19-colombiatours-learning-safe-optimizations/safe-actions.csv`
- `artifacts/google-ads/2026-05-19-colombiatours-learning-safe-optimizations/blocked-mutations.csv`
