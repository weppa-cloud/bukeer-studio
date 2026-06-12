# ColombiaTours Campaign Activation Audit

Generated: 2026-05-18T17:35:46.914Z
Mode: read-only recommendation. No activation applied.

## Answer On Negatives

The approved negatives were applied at campaign level to BR/AR/MX/ES/CL/US. They are not account-global and will not automatically apply to a brand-new future campaign unless we attach a shared negative list or copy the negatives into that campaign.

## Recommendation

1. Keep optimizing MX, ES and CL because they are the only current markets with first-party quality signals.
2. If the goal is learning with controlled risk, activate BR first by unpausing its ad groups/keywords/ads, not by creating a new campaign.
3. Activate AR second, either after 72h of BR evidence or in parallel at smaller budget if speed matters.
4. Keep US paused until there is a better US landing/offer or a dedicated high-intent private/luxury structure.
5. Keep FR/DE paused under the current guardrail.

## Candidate Table
| name | status | budgetCop | spend7d | clicks7d | conv7d | enabledAdGroups | pausedAdGroups | historicalQualityLeads | historicalCplQuality | historicalWaste | recommendation | reason |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| MX_Multidestino_y_Caribe_2026_05 | ENABLED | 85000 | 553462 | 247 | 6 | 4 | 0 | 56 | 18764 | 176710 | keep_active_learning | already active with first-party quality signals; optimize before adding new markets |
| ES_Cartagena_Medellin_2026_05 | ENABLED | 60000 | 440286 | 147 | 2 | 4 | 0 | 22 | 37543 | 88338 | keep_active_learning | already active with first-party quality signals; optimize before adding new markets |
| CL_Search_Colombia_SanAndres_2026_05 | ENABLED | 30000 | 209269 | 85 | 4 | 3 | 0 | 8 | 36942 | 4339 | keep_active_learning | already active with first-party quality signals; optimize before adding new markets |
| US_Florida_NY_Colombia_Packages_2026_05 | PAUSED | 80000 | 0 | 0 | 0 | 2 | 0 | 0 |  | 9231 | hold_or_rebuild_before_reactivation | campaign paused, no first-party quality, high CPC and weak historical signal |
| AR_Search_Colombia_Packages_2026_05 | ENABLED | 30000 | 0 | 0 | 0 | 0 | 3 | 0 |  | 0 | activate_second_small_test_after_br_or_parallel_low_budget | Argentina historical market had positive themes but older structure had landing mismatch; use controlled new structure only |
| FR_Search_Colombie_Sur_Mesure_2026_05 | PAUSED | 60000 | 0 | 0 | 0 | 0 | 3 | 0 |  | 0 | keep_paused | explicit guardrail: FR/DE remain paused until proof in Spanish/LatAm markets is stable |
| DE_Search_Kolumbien_Rundreise_2026_05 | PAUSED | 60000 | 0 | 0 | 0 | 0 | 3 | 0 |  | 0 | keep_paused | explicit guardrail: FR/DE remain paused until proof in Spanish/LatAm markets is stable |
| BR_Search_Colombia_Packages_2026_05 | ENABLED | 50000 | 0 | 0 | 0 | 0 | 2 | 0 |  | 0 | activate_small_test_after_adgroup_unpause | new controlled market, tracking ready, negatives now covered, no historical waste in this new structure |

## Activation Rule

- Start with one new learning market at a time unless we explicitly accept higher spend volatility.
- Do not increase MX/ES/CL budgets until 72h post-negative data shows lower junk leakage and CRM quality remains acceptable.
- BR/AR activation should have daily cap, exact/phrase high-intent terms only, and review after 72h or 30 clicks, whichever comes first.
- Pause test if cost reaches COP 150k without waflow_submit or if search terms show >20% junk spend after the new negatives.

## Suggested BR Test Scope

- Campaign: BR_Search_Colombia_Packages_2026_05.
- Budget: keep existing COP 50,000/day; do not scale initially.
- Action needed: unpause selected ad groups/keywords/ads only. Campaign is already ENABLED.
- Why: no spend yet, tracking present, negatives now copied, clean controlled learning market.

## Suggested AR Test Scope

- Campaign: AR_Search_Colombia_Packages_2026_05.
- Budget: keep existing COP 30,000/day; activate after BR or run parallel only if we accept lower signal speed per market.
- Action needed: unpause selected ad groups/keywords/ads only. Campaign is already ENABLED.
- Why: Argentina historical terms show commercial themes but old structures had landing mismatch; controlled campaign is safer than old paused campaign.
## Direct-Flight City Gate Addendum

User requirement: prioritize cities with direct air connectivity to Bogota, Medellin, Cartagena or other principal Colombian cities because that should improve close probability and reduce friction after lead qualification.

### Current Geo Targeting Finding

Current Google Ads geo criteria are broader than this requirement:

| Campaign | Current positive geo | Geo type | Positive geo setting |
| --- | --- | --- | --- |
| BR_Search_Colombia_Packages_2026_05 | Brazil | Country | PRESENCE_OR_INTEREST |
| AR_Search_Colombia_Packages_2026_05 | Argentina | Country | PRESENCE_OR_INTEREST |
| MX_Multidestino_y_Caribe_2026_05 | Mexico | Country | PRESENCE_OR_INTEREST |
| ES_Cartagena_Medellin_2026_05 | Spain | Country | PRESENCE_OR_INTEREST |
| CL_Search_Colombia_SanAndres_2026_05 | Chile | Country | PRESENCE_OR_INTEREST |
| US_Florida_NY_Colombia_Packages_2026_05 | Florida + New York | State | PRESENCE_OR_INTEREST |

Operational implication: before activating BR/AR for learning, do not open the full country. Replace or narrow country targeting to cities with direct connectivity and switch geo intent to presence-only if we want cleaner lead quality.

### Initial City Priority Map

| Market | Priority city geo target | Google Ads geo id | Direct connection evidence | Activation implication |
| --- | --- | --- | --- | --- |
| BR | Sao Paulo | 1001773 | GRU -> BOG direct served by Avianca/LATAM | Activate BR only in Sao Paulo first; do not target all Brazil initially. |
| AR | Buenos Aires | 1000073 | EZE -> BOG direct served by Avianca | Activate AR only in Buenos Aires after BR or as second controlled test. |
| CL | Santiago | 1003325 | SCL -> BOG direct served by Avianca/LATAM/JetSMART | Existing CL should be narrowed to Santiago if quality falls outside direct-connect city. |
| MX | Mexico City | 1010043 | MEX -> BOG direct; MEX -> MDE direct; MEX -> CTG direct evidence found | Existing MX should move from country-wide to direct-connect metros. |
| MX | Monterrey | 1010132 | MTY -> BOG direct evidence found | Add/keep Monterrey as second MX city. |
| ES | Madrid | 1005493 | MAD -> BOG and MAD -> MDE direct evidence found | Existing ES should prioritize Madrid. |
| ES | Barcelona | 1005424 | BCN -> BOG direct evidence found | Barcelona is second ES city. |
| US | New York City | 1023191 | US remains hold/rebuild; direct connectivity exists but campaign quality weak | Do not reactivate yet; use city targeting if rebuilt. |
| US | Florida state currently | 21142 | US campaign is state-level; should be split to direct airport metros if relaunched | Hold until landing/offer is rebuilt. |

### Revised Activation Recommendation

1. BR remains the best new learning candidate, but only if city-gated to Sao Paulo before ad groups are unpaused.
2. AR is second, city-gated to Buenos Aires.
3. MX/ES/CL should stay active for now, but the next optimization pass should narrow them from country-wide to direct-connect metros or split campaigns by city cluster.
4. Set positive geo targeting from `PRESENCE_OR_INTEREST` to `PRESENCE` for controlled lead-quality tests. Otherwise Google can include users merely interested in the location rather than physically in the high-connectivity city.
5. Future activation script must treat geo as a precondition: city criteria first, then ad group/keyword/ad activation.

### Sources Checked

- Sao Paulo GRU -> Bogota BOG direct: FlightsFrom / FlightRoutes / Directflights route pages.
- Buenos Aires EZE -> Bogota BOG direct: Avianca / Directflights / FlightMapper route pages.
- Santiago SCL -> Bogota BOG direct: FlightMapper / Directflights / AirlineInformation route pages.
- Mexico City MEX -> Bogota BOG, Medellin MDE, Cartagena CTG direct: FlightMapper / FlightRoutes / AirlineInformation route pages.
- Monterrey MTY -> Bogota BOG direct: FlightMapper / FlightsFrom / Directflights route pages.
- Madrid/Barcelona -> Colombia direct: Avianca route pages and Europe direct-flight route PDF.
