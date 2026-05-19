# ColombiaTours Landing Roadmap V2 - Base vs Target Scores

Generated: 2026-05-19T00:41:38.945Z
Mode: read-only fetch + local files. No Google Ads mutations. No Supabase writes.

## Summary

- Evaluated 11 unique landings required by the Search Architecture V2 campaign/ad group map.
- Scoring target: P0/P1 landings >=95, P2 destination landings >=92, hold landings >=90.
- Campaigns remain untouched; this is a pre-activation CRO/design roadmap.
- Use this before future validate-only campaign creation or any budget scale.

## Scorecard

| Landing | Markets | Priority | Base | Target | Gap | Readiness | Top actions |
| --- | --- | --- | --- | --- | --- | --- | --- |
| /pt/pacotes-colombia | BR | P0_existing_validate | 45 | 95 | 50 | optimize_before_ads | fix routing/content before any Ads use / add above-fold origin city proof: Sao Paulo / add qualifier: no flights or hotel-only sales / add testimonials/reviews and local agency proof near first CTA / rewrite hero/meta/H1 to mirror exact keywords and ad promise / add RNT/local planner/security/payment clarity/FAQ proof modules |
| /viajes-colombia-desde-chile | CL | P1_market_landing | 90 | 95 | 5 | near_ready_needs_copy_or_design_qa | rewrite hero/meta/H1 to mirror exact keywords and ad promise |
| /viajes-colombia-desde-argentina | AR | P1_market_landing | 90 | 95 | 5 | near_ready_needs_copy_or_design_qa | rewrite hero/meta/H1 to mirror exact keywords and ad promise |
| /cartagena | MX / ES / CL / AR / US | P1_market_landing | 92 | 95 | 3 | near_ready_needs_copy_or_design_qa | add qualifier: no flights or hotel-only sales |
| /paquetes-colombia-desde-mexico | MX | P1_market_landing | 96 | 95 | 0 | ready_for_manual_ad_review | manual creative QA before future validate-only |
| /paquetes-colombia-desde-espana | ES | P1_market_landing | 96 | 95 | 0 | ready_for_manual_ad_review | manual creative QA before future validate-only |
| /paquetes/bogota-medellin-cartagena | MX / ES / CL / AR / US | P2_destination_landing | 90 | 92 | 2 | near_ready_needs_copy_or_design_qa | rewrite hero/meta/H1 to mirror exact keywords and ad promise |
| /paquetes/cartagena-medellin | ES / CL / AR / US | P2_destination_landing | 90 | 92 | 2 | near_ready_needs_copy_or_design_qa | rewrite hero/meta/H1 to mirror exact keywords and ad promise |
| /paquetes/san-andres-todo-incluido | MX / ES / CL / AR / US | P2_destination_landing | 96 | 92 | 0 | ready_for_manual_ad_review | manual creative QA before future validate-only |
| /paquetes/eje-cafetero | MX / ES / CL / AR / US | P2_destination_landing | 96 | 92 | 0 | ready_for_manual_ad_review | manual creative QA before future validate-only |
| /trips-to-colombia-from-usa | US | P3_hold | 45 | 90 | 45 | optimize_before_ads | fix routing/content before any Ads use / add qualifier: no flights or hotel-only sales / add testimonials/reviews and local agency proof near first CTA / rewrite hero/meta/H1 to mirror exact keywords and ad promise / add RNT/local planner/security/payment clarity/FAQ proof modules |

## Campaign To Landing Map

| Campaign | Ad group | Market | Landing | Future status |
| --- | --- | --- | --- | --- |
| BR_Search_Colombia_Packages_2026_05 | AG1_Colombia_Packages_Exact | BR | https://colombiatours.travel/pt/pacotes-colombia | ENABLED_EXISTING_NO_CHANGE |
| MX_Search_Colombia_CityIntent_2026_06_NEXT | AG1_Colombia_Packages_Exact | MX | https://colombiatours.travel/paquetes-colombia-desde-mexico | PAUSED_DRAFT |
| MX_Search_Colombia_CityIntent_2026_06_NEXT | AG2_Medellin_Cartagena_Exact | MX | https://colombiatours.travel/paquetes/bogota-medellin-cartagena | PAUSED_DRAFT |
| MX_Search_Colombia_CityIntent_2026_06_NEXT | AG3_Cartagena_Exact | MX | https://colombiatours.travel/cartagena | PAUSED_DRAFT |
| MX_Search_Colombia_CityIntent_2026_06_NEXT | AG4_SanAndres_Exact | MX | https://colombiatours.travel/paquetes/san-andres-todo-incluido | PAUSED_DRAFT |
| MX_Search_Colombia_CityIntent_2026_06_NEXT | AG5_EjeCafetero_Exact | MX | https://colombiatours.travel/paquetes/eje-cafetero | PAUSED_DRAFT |
| MX_Search_Colombia_CityIntent_2026_06_NEXT | AG6_Bogota_Cali_SantaMarta_Exact | MX | https://colombiatours.travel/paquetes/bogota-medellin-cartagena | PAUSED_DRAFT |
| ES_Search_Colombia_CityIntent_2026_06_NEXT | AG1_Colombia_Packages_Exact | ES | https://colombiatours.travel/paquetes-colombia-desde-espana | PAUSED_DRAFT |
| ES_Search_Colombia_CityIntent_2026_06_NEXT | AG2_Medellin_Cartagena_Exact | ES | https://colombiatours.travel/paquetes/cartagena-medellin | PAUSED_DRAFT |
| ES_Search_Colombia_CityIntent_2026_06_NEXT | AG3_Cartagena_Exact | ES | https://colombiatours.travel/cartagena | PAUSED_DRAFT |
| ES_Search_Colombia_CityIntent_2026_06_NEXT | AG4_SanAndres_Exact | ES | https://colombiatours.travel/paquetes/san-andres-todo-incluido | PAUSED_DRAFT |
| ES_Search_Colombia_CityIntent_2026_06_NEXT | AG5_EjeCafetero_Exact | ES | https://colombiatours.travel/paquetes/eje-cafetero | PAUSED_DRAFT |
| ES_Search_Colombia_CityIntent_2026_06_NEXT | AG6_Bogota_Cali_SantaMarta_Exact | ES | https://colombiatours.travel/paquetes/bogota-medellin-cartagena | PAUSED_DRAFT |
| CL_Search_Colombia_Santiago_2026_06_NEXT | AG1_Colombia_Packages_Exact | CL | https://colombiatours.travel/viajes-colombia-desde-chile | PAUSED_DRAFT |
| CL_Search_Colombia_Santiago_2026_06_NEXT | AG2_Medellin_Cartagena_Exact | CL | https://colombiatours.travel/paquetes/cartagena-medellin | PAUSED_DRAFT |
| CL_Search_Colombia_Santiago_2026_06_NEXT | AG3_Cartagena_Exact | CL | https://colombiatours.travel/cartagena | PAUSED_DRAFT |
| CL_Search_Colombia_Santiago_2026_06_NEXT | AG4_SanAndres_Exact | CL | https://colombiatours.travel/paquetes/san-andres-todo-incluido | PAUSED_DRAFT |
| CL_Search_Colombia_Santiago_2026_06_NEXT | AG5_EjeCafetero_Exact | CL | https://colombiatours.travel/paquetes/eje-cafetero | PAUSED_DRAFT |
| CL_Search_Colombia_Santiago_2026_06_NEXT | AG6_Bogota_Cali_SantaMarta_Exact | CL | https://colombiatours.travel/paquetes/bogota-medellin-cartagena | PAUSED_DRAFT |
| AR_Search_Colombia_BuenosAires_2026_06_NEXT | AG1_Colombia_Packages_Exact | AR | https://colombiatours.travel/viajes-colombia-desde-argentina | PAUSED_DRAFT |
| AR_Search_Colombia_BuenosAires_2026_06_NEXT | AG2_Medellin_Cartagena_Exact | AR | https://colombiatours.travel/paquetes/cartagena-medellin | PAUSED_DRAFT |
| AR_Search_Colombia_BuenosAires_2026_06_NEXT | AG3_Cartagena_Exact | AR | https://colombiatours.travel/cartagena | PAUSED_DRAFT |
| AR_Search_Colombia_BuenosAires_2026_06_NEXT | AG4_SanAndres_Exact | AR | https://colombiatours.travel/paquetes/san-andres-todo-incluido | PAUSED_DRAFT |
| AR_Search_Colombia_BuenosAires_2026_06_NEXT | AG5_EjeCafetero_Exact | AR | https://colombiatours.travel/paquetes/eje-cafetero | PAUSED_DRAFT |
| AR_Search_Colombia_BuenosAires_2026_06_NEXT | AG6_Bogota_Cali_SantaMarta_Exact | AR | https://colombiatours.travel/paquetes/bogota-medellin-cartagena | PAUSED_DRAFT |
| US_Search_Private_Colombia_CityIntent_2026_06_HOLD | AG1_Colombia_Packages_Exact | US | https://colombiatours.travel/trips-to-colombia-from-usa | HOLD |
| US_Search_Private_Colombia_CityIntent_2026_06_HOLD | AG2_Medellin_Cartagena_Exact | US | https://colombiatours.travel/paquetes/cartagena-medellin | HOLD |
| US_Search_Private_Colombia_CityIntent_2026_06_HOLD | AG3_Cartagena_Exact | US | https://colombiatours.travel/cartagena | HOLD |
| US_Search_Private_Colombia_CityIntent_2026_06_HOLD | AG4_SanAndres_Exact | US | https://colombiatours.travel/paquetes/san-andres-todo-incluido | HOLD |
| US_Search_Private_Colombia_CityIntent_2026_06_HOLD | AG5_EjeCafetero_Exact | US | https://colombiatours.travel/paquetes/eje-cafetero | HOLD |
| US_Search_Private_Colombia_CityIntent_2026_06_HOLD | AG6_Bogota_Cali_SantaMarta_Exact | US | https://colombiatours.travel/paquetes/bogota-medellin-cartagena | HOLD |

## Optimization Actions

| Landing | # | Action | Owner | Acceptance |
| --- | --- | --- | --- | --- |
| https://colombiatours.travel/pt/pacotes-colombia | 1 | fix routing/content before any Ads use | engineering | URL returns 200, index/follow, no not-found copy, canonical sane |
| https://colombiatours.travel/pt/pacotes-colombia | 2 | add above-fold origin city proof: Sao Paulo | growth_content | Hero and first screen mention origin city and direct-connect rationale |
| https://colombiatours.travel/pt/pacotes-colombia | 3 | add qualifier: no flights or hotel-only sales | growth_content | Qualifier visible before first CTA: no flight-only or hotel-only sales |
| https://colombiatours.travel/pt/pacotes-colombia | 4 | add testimonials/reviews and local agency proof near first CTA | growth_content | At least one proof band with testimonials/reviews/local agency credibility |
| https://colombiatours.travel/pt/pacotes-colombia | 5 | rewrite hero/meta/H1 to mirror exact keywords and ad promise | design_content | H1/meta/hero align with exact keywords and RSA promise |
| https://colombiatours.travel/pt/pacotes-colombia | 6 | add RNT/local planner/security/payment clarity/FAQ proof modules | growth_content | Trust module includes RNT/local planner/security/payment/FAQ details |
| https://colombiatours.travel/paquetes/bogota-medellin-cartagena | 1 | rewrite hero/meta/H1 to mirror exact keywords and ad promise | design_content | H1/meta/hero align with exact keywords and RSA promise |
| https://colombiatours.travel/cartagena | 1 | add qualifier: no flights or hotel-only sales | growth_content | Qualifier visible before first CTA: no flight-only or hotel-only sales |
| https://colombiatours.travel/paquetes/cartagena-medellin | 1 | rewrite hero/meta/H1 to mirror exact keywords and ad promise | design_content | H1/meta/hero align with exact keywords and RSA promise |
| https://colombiatours.travel/viajes-colombia-desde-chile | 1 | rewrite hero/meta/H1 to mirror exact keywords and ad promise | design_content | H1/meta/hero align with exact keywords and RSA promise |
| https://colombiatours.travel/viajes-colombia-desde-argentina | 1 | rewrite hero/meta/H1 to mirror exact keywords and ad promise | design_content | H1/meta/hero align with exact keywords and RSA promise |
| https://colombiatours.travel/trips-to-colombia-from-usa | 1 | fix routing/content before any Ads use | engineering | URL returns 200, index/follow, no not-found copy, canonical sane |
| https://colombiatours.travel/trips-to-colombia-from-usa | 2 | add qualifier: no flights or hotel-only sales | growth_content | Qualifier visible before first CTA: no flight-only or hotel-only sales |
| https://colombiatours.travel/trips-to-colombia-from-usa | 3 | add testimonials/reviews and local agency proof near first CTA | growth_content | At least one proof band with testimonials/reviews/local agency credibility |
| https://colombiatours.travel/trips-to-colombia-from-usa | 4 | rewrite hero/meta/H1 to mirror exact keywords and ad promise | design_content | H1/meta/hero align with exact keywords and RSA promise |
| https://colombiatours.travel/trips-to-colombia-from-usa | 5 | add RNT/local planner/security/payment clarity/FAQ proof modules | growth_content | Trust module includes RNT/local planner/security/payment/FAQ details |

## Scoring Rubric

- Technical/tracking: 0-18 points for 200, index/follow, canonical, GTM/gtag, dataLayer, WAFlow and WhatsApp.
- Message match: 0-22 points for keyword, market, origin-city, package-language and direct-connect fit.
- Persuasion: 0-20 points for complete package, planner local, no flight/hotel-only filter, itinerary and budget clarity.
- Conversion: 0-15 points for CTA hierarchy, repeated CTAs, WAFlow, WhatsApp and FAQ.
- Trust: 0-15 points for testimonials, RNT/local proof, support, payment/budget clarity and planner credibility.
- Visual readiness: 0-10 points using HTML-level visual proxies: hero, images, cards/sections, itinerary modules and destination structure.

## Files Generated

- `artifacts/google-ads/2026-05-19-colombiatours-landing-roadmap-v2/landing-scorecard.json`
- `artifacts/google-ads/2026-05-19-colombiatours-landing-roadmap-v2/landing-scorecard.csv`
- `artifacts/google-ads/2026-05-19-colombiatours-landing-roadmap-v2/landing-actions.csv`
- `artifacts/google-ads/2026-05-19-colombiatours-landing-roadmap-v2/campaign-landing-map.csv`
