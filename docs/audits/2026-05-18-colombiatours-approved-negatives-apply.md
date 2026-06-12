# ColombiaTours Approved Historical Negatives Apply

Date: 2026-05-18
Mode: Google Ads mutation approved by user
Scope: current controlled/current comparator campaigns BR, AR, MX, ES, CL, US

## Decision

User approved the P0/P1 exact negative shortlist and the optional exclusion coverage after reviewing the 24m mining output.

## Result

- Validate-only before apply: PASS.
- Applied operations: 36 campaign negative keywords.
- Post-apply validate-only: PASS with operationCount 0.
- Existing negatives skipped: 24.
- Exact terms skipped as already covered by phrase negatives: 294.

## Answer To Mitigation Question

The approved list was partially already mitigated. Existing phrase negatives already covered many `vuelos`, `vuelo`, `pasaje`, `pasajes`, `tiquete` and `tiquetes` cases in CL/MX/ES. Missing coverage remained for `boletos`, `boleto`, `avianca`, selected hotel-only exacts, and BR/AR/US campaign coverage.

## Applied By Campaign

| Campaign | Applied negatives |
| --- | --- |
| BR_Search_Colombia_Packages_2026_05 | `vuelo` PHRASE, `boletos` PHRASE, `boleto` PHRASE, `pasajes` PHRASE, `pasaje` PHRASE, `tiquete` PHRASE, `avianca` PHRASE |
| AR_Search_Colombia_Packages_2026_05 | `vuelo` PHRASE, `boletos` PHRASE, `boleto` PHRASE, `pasajes` PHRASE, `pasaje` PHRASE, `tiquete` PHRASE, `avianca` PHRASE |
| MX_Multidestino_y_Caribe_2026_05 | `boletos` PHRASE, `boleto` PHRASE, `avianca` PHRASE, `hotel dorado plaza bocagrande todo incluido` EXACT, `hotel todo incluido en cartagena colombia` EXACT |
| ES_Cartagena_Medellin_2026_05 | `boletos` PHRASE, `boleto` PHRASE, `avianca` PHRASE, `hotel dorado plaza bocagrande todo incluido` EXACT, `hotel todo incluido en cartagena colombia` EXACT |
| CL_Search_Colombia_SanAndres_2026_05 | `boletos` PHRASE, `boleto` PHRASE, `avianca` PHRASE |
| US_Florida_NY_Colombia_Packages_2026_05 | `boletos` PHRASE, `boleto` PHRASE, `pasajes` PHRASE, `pasaje` PHRASE, `tiquetes` PHRASE, `tiquete` PHRASE, `avianca` PHRASE, `hotel dorado plaza bocagrande todo incluido` EXACT, `hotel todo incluido en cartagena colombia` EXACT |

## Evidence

- Validate report: `artifacts/google-ads/2026-05-18-colombiatours-approved-negatives-apply/2026-05-18T17-30-07-407Z-validate-report.json`
- Apply report: `artifacts/google-ads/2026-05-18-colombiatours-approved-negatives-apply/2026-05-18T17-30-16-929Z-apply-report.json`
- Post-check report: `artifacts/google-ads/2026-05-18-colombiatours-approved-negatives-apply/2026-05-18T17-30-24-576Z-validate-report.json`
- Applicator: `scripts/google-ads/apply-colombiatours-approved-historical-negatives.cjs`

## Next Check

Monitor the next 72 hours of search terms and CRM quality. The expected near-term effect is less flight/ticket leakage, especially from MX/ES/AR historical patterns and future BR/AR controlled launches.
