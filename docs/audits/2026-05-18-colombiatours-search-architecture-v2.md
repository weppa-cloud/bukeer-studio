# ColombiaTours Search Architecture V2

Generated: 2026-05-18T23:10:56.825Z
Mode: local blueprint only. No Google Ads or Supabase mutations.

## Executive Summary

- Built a city-gated Search architecture from 24m mining, 5d review, landing audits and CRM/WAFlow quality signals.
- Current campaigns are explicitly not changed by this phase. New campaign designs are marked `PAUSED` or `HOLD`.
- Output includes 6 campaign rows, 31 ad group rows, 76 exact keywords, 31 RSA drafts and 9 landing briefs.
- Optimization source of truth remains first-party quality: `waflow_submit`, useful conversations, `crm_quote_sent`, opportunities, itineraries and click/UTM/reference traceability.

## Safety Contract

- Google Ads mutate operations: `0`.
- Supabase writes: `0`.
- Future new campaigns: `PAUSED_OR_HOLD`.
- Current MX/ES/CL/BR campaigns remain untouched; AR/US/FR/DE remain untouched.
- Any future implementation must run validate-only first and requires explicit approval before creating paused campaigns.

## Campaign Blueprint

| Campaign | Market | Future status | Budget COP/day | City gates | Phase |
| --- | --- | --- | --- | --- | --- |
| BR_Search_Colombia_Packages_2026_05 | BR | ENABLED_EXISTING_NO_CHANGE | 50000 | Sao Paulo (1001773) | active_learning_gate |
| MX_Search_Colombia_CityIntent_2026_06_NEXT | MX | PAUSED | 40000 | Mexico City (1010043) / Monterrey (1010132) | build_ready_paused |
| ES_Search_Colombia_CityIntent_2026_06_NEXT | ES | PAUSED | 35000 | Madrid (1005493) / Barcelona (1005424) | build_ready_paused |
| CL_Search_Colombia_Santiago_2026_06_NEXT | CL | PAUSED | 20000 | Santiago (1003325) | build_ready_paused |
| AR_Search_Colombia_BuenosAires_2026_06_NEXT | AR | PAUSED | 30000 | Buenos Aires (1000073) | phase_2_after_br |
| US_Search_Private_Colombia_CityIntent_2026_06_HOLD | US | HOLD | 0 | New York City (1023191) | hold |

Ad group count by campaign: BR_Search_Colombia_Packages_2026_05: 1; MX_Search_Colombia_CityIntent_2026_06_NEXT: 6; ES_Search_Colombia_CityIntent_2026_06_NEXT: 6; CL_Search_Colombia_Santiago_2026_06_NEXT: 6; AR_Search_Colombia_BuenosAires_2026_06_NEXT: 6; US_Search_Private_Colombia_CityIntent_2026_06_HOLD: 6.

## Landing Blueprint

| Landing | Market | Origin city | Status | HTTP | Tracking |
| --- | --- | --- | --- | --- | --- |
| /paquetes-colombia-desde-mexico | MX | Mexico City + Monterrey | usable_after_manual_confirmation | 200 | true |
| /paquetes-colombia-desde-espana | ES | Madrid + Barcelona | needs_build_or_validation | 200 | true |
| /viajes-colombia-desde-chile | CL | Santiago | needs_build_or_validation | 200 | true |
| /pt/pacotes-colombia | BR | Sao Paulo | usable_after_manual_confirmation | 200 | true |
| /viajes-colombia-desde-argentina | AR | Buenos Aires | usable_after_manual_confirmation | 200 | true |
| /paquetes/cartagena-medellin | MULTI | direct-connect markets | usable_after_manual_confirmation | 200 | true |
| /paquetes/san-andres-todo-incluido | MULTI | direct-connect markets | usable_after_manual_confirmation | 200 | true |
| /paquetes/eje-cafetero | MULTI | direct-connect markets | usable_after_manual_confirmation | 200 | true |
| /paquetes/bogota-medellin-cartagena | MULTI | direct-connect markets | usable_after_manual_confirmation | 200 | true |

Each landing brief requires city-origin proof, direct-flight/friction reducer, full-package offer, planner local, no flight/hotel-only qualifier, testimonials, suggested itineraries, WAFlow CTA, WhatsApp CTA, FAQ and tracking QA.

## Rollout Gates

| Gate | Market | Trigger | Pass criteria |
| --- | --- | --- | --- |
| BR_24h | BR | 24h after first serving/spend | serving approved, landing URL healthy, no junk spend >20%, tracking present |
| BR_72h_or_30_clicks | BR | 72h or 30 clicks, whichever first after serving starts | waflow_submit or quote_sent or useful conversation with gclid/UTM/reference_code; spend < COP 150k without submit |
| AR_phase_2 | AR | BR gate pass | Buenos Aires PRESENCE, AG1 only, [paquetes a colombia] EXACT, landing score >=90 |
| MX_ES_CL_shadow | MX/ES/CL | 72h post-negatives review | CRM quality remains >= current baseline, junk spend <=20%, no tracking regression |
| smart_bidding_blocker | ALL | before any Smart Bidding optimization | Google Ads offline uploads, GA4 MP and Meta CAPI receive recent events without 401 backlog |

## Files Generated

- JSON: `artifacts/google-ads/2026-05-18-colombiatours-search-architecture-v2/campaign-blueprint.json`
- CSV: `campaigns.csv`, `ad-groups.csv`, `keywords.csv`, `ads.csv`, `landing-briefs.csv`, `rollout-gates.csv`, `tracking-checklist.csv`

## Implementation Notes For Future Apply

1. Do not create or activate any campaign from this blueprint until landing briefs are built and score >= 90.
2. Attach/copy the shared negative coverage before any campaign can leave paused state.
3. Keep phase 1 exact-only; phrase is blocked until CRM confirms quality.
4. Do not optimize with Smart Bidding until downstream dispatch to Google Ads offline uploads, GA4 MP and Meta CAPI is clean.
