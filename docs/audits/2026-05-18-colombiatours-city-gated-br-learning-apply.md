# ColombiaTours City-Gated BR Learning Apply

Generated: 2026-05-18T18:54:00Z
Mode: controlled Google Ads apply. Campaign mutations were limited to the approved city-gated learning plan and landing safety correction.

## Executive Result

BR is now the only new market learning test active. AR was paused and held for second phase. MX, ES and CL remain active. US, FR and DE remain paused.

## Final State

| Area | Final state |
| --- | --- |
| BR campaign | `BR_Search_Colombia_Packages_2026_05` (`23843668228`) `ENABLED` |
| BR budget | COP 50,000/day unchanged |
| BR geo | positive São Paulo city `geoTargetConstants/1001773`; Colombia negative `geoTargetConstants/2170` |
| BR geo mode | `positive_geo_target_type = PRESENCE`; `negative_geo_target_type = PRESENCE` |
| BR active ad group | `AG1_Pacotes_Colombia` only |
| BR active keywords | `pacotes colombia` EXACT; `pacote viagem colombia` EXACT |
| BR paused scope | `AG2_Cartagena_Pacote`; all BR phrase keywords; Cartagena keywords |
| BR active ad | New RSA `809326542701`, final URL `https://colombiatours.travel/pt/pacotes` |
| BR old ad | RSA `808495883908` paused because final URL rendered a 404 page |
| AR | `AR_Search_Colombia_Packages_2026_05` (`23833803528`) paused until BR reaches 72h or 30 clicks |
| MX / ES / CL | remain `ENABLED`; no budget scale applied |
| US / FR / DE | remain `PAUSED` |
| Reusable negatives | shared list `Lista de palabras globales` attached to BR, AR, MX, ES, CL and US |

## Operations Applied

1. Initial city-gated BR apply: 20 operations.
2. Landing safety correction: 2 operations.
3. AR hold until phase 2: 1 operation.
4. Final idempotency post-check: 0 pending operations.

## Evidence

| Evidence | Path |
| --- | --- |
| Initial validate-only | `artifacts/google-ads/2026-05-18-colombiatours-city-gated-tests/2026-05-18T18-45-14-406Z-validate-report.json` |
| Initial BR apply | `artifacts/google-ads/2026-05-18-colombiatours-city-gated-tests/2026-05-18T18-45-23-888Z-apply-br-report.json` |
| Initial post-check | `artifacts/google-ads/2026-05-18-colombiatours-city-gated-tests/2026-05-18T18-45-33-612Z-validate-report.json` |
| Landing correction validate-only | `artifacts/google-ads/2026-05-18-colombiatours-city-gated-tests/2026-05-18T18-51-08-160Z-validate-report.json` |
| Landing correction apply | `artifacts/google-ads/2026-05-18-colombiatours-city-gated-tests/2026-05-18T18-51-18-188Z-apply-br-report.json` |
| Landing correction post-check | `artifacts/google-ads/2026-05-18-colombiatours-city-gated-tests/2026-05-18T18-51-28-230Z-validate-report.json` |
| AR hold validate-only | `artifacts/google-ads/2026-05-18-colombiatours-city-gated-tests/2026-05-18T18-52-49-242Z-validate-report.json` |
| AR hold apply | `artifacts/google-ads/2026-05-18-colombiatours-city-gated-tests/2026-05-18T18-52-56-193Z-apply-br-report.json` |
| Final post-check | `artifacts/google-ads/2026-05-18-colombiatours-city-gated-tests/2026-05-18T18-53-04-435Z-validate-report.json` |
| Final read-only state | `artifacts/google-ads/2026-05-18-colombiatours-city-gated-tests/2026-05-18T18-53-final-readonly-state.json` |

## Landing Safety Finding

The original active BR ad URL `https://colombiatours.travel/pt/pacotes-colombia` returned HTTP 200 but rendered `Página no encontrada`, `noindex`, and a Next 404 fallback. It should not receive paid traffic.

The valid Portuguese canonical URL is `https://colombiatours.travel/pt/pacotes`, which returns HTTP 200, `index, follow`, canonical `/pt/pacotes`, GTM/gtag markers and WhatsApp CTA hooks.

Google Ads rejected direct `ad.final_urls` update as immutable, so the safe correction was to clone the RSA with the canonical final URL and pause the old RSA.

Important: the new RSA `809326542701` is `ENABLED` but policy review was still `REVIEW_IN_PROGRESS` at the final read-only check. Do not count the 72h BR learning window until it is serving or until the first click/spend appears.

## Monitoring Rules

- Inspect BR at 24h for serving status, impressions, clicks, search terms, spend, CPC and URL/tracking integrity.
- Inspect BR at 72h or 30 clicks, whichever comes first.
- Pause or adjust if BR spends COP 150,000 without `waflow_submit`.
- Pause or adjust if more than 20% of spend goes to junk, vuelos, hotel-only, empleo, visa/docs or shipping terms.
- Keep BR only if there is `waflow_submit`, `quote_sent`, CRM opportunity, or useful conversation with `gclid`, UTM or `reference_code` present.
- Do not activate AR until BR reaches 72h/30-click gate or sales confirms useful BR lead quality.
- Do not scale MX/ES/CL budgets until 72h post-negative validation confirms lower junk leakage and CRM quality remains acceptable.

## Next AR Phase

When BR passes the learning gate, apply AR as a separate phase:

- Replace Argentina country target with Buenos Aires city `geoTargetConstants/1000073`.
- Set geo mode to `PRESENCE`.
- Keep budget at COP 30,000/day.
- Activate only `AG1_Paquetes_Colombia`.
- Activate only `paquetes a colombia` EXACT.
- Keep `AG2_Desde_Argentina` and `AG3_San_Andres` paused.
