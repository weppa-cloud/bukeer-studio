# ColombiaTours BR Follow-up Tracker

Created: 2026-05-18 20:24 COT
Scope: BR city-gated learning test after landing correction and ad URL alignment.
Campaign: `BR_Search_Colombia_Packages_2026_05` (`23843668228`)
Ad group: `AG1_Pacotes_Colombia`
City gate: Sao Paulo `1001773`
Geo mode: `PRESENCE`
Canonical landing: `https://colombiatours.travel/pt/pacotes-colombia`

## Activation Baseline

- Applied at: 2026-05-18 20:04:53 COT (`2026-05-19T01:04:53Z`).
- Applied operations: 2 Google Ads ad operations only.
- Enabled ad: `808495883908`, final URL `https://colombiatours.travel/pt/pacotes-colombia`.
- Paused old ad: `809247707959`, final URL `https://colombiatours.travel/pacotes-colombia`.
- Post-apply validate-only: `operationCounts.total = 0`.
- No campaign budget, geo, keyword, AR, MX, ES, CL, US, FR or DE mutations in this step.

## Follow-up Checkpoints

| Checkpoint | Exact Time COT | Purpose | Required Decision |
|---|---:|---|---|
| Early check | 2026-05-19 08:30 | Confirm serving state, approval status, no rejected ads, URL/tracking still OK | No scale; only diagnose blockers |
| 24h check | 2026-05-19 20:15 | Evaluate first 24h after BR ad URL correction | Keep / fix / pause if severe leakage |
| 72h gate | 2026-05-21 20:15 | Evaluate 72h or earlier if 30 clicks reached | Decide keep BR, adjust, or prepare AR validate-only |
| 7d review | 2026-05-25 20:15 | Full learning window | Decide scale/hold/rebuild |

## Metrics To Pull

- Google Ads by campaign/ad group/keyword/ad: spend, impressions, clicks, CTR, CPC, conversions.
- Search terms: term, spend, clicks, campaign, ad group, keyword, intent class.
- Junk spend share: flights, hotel-only, visa/docs, employment, shipping, bargain, competitor.
- First-party funnel: `whatsapp_cta_click`, `waflow_open`, `waflow_submit`.
- CRM: useful conversations, low-quality leads, `crm_quote_sent`, opportunities, itinerary confirmed.
- Attribution: `gclid`, `gbraid`, `wbraid`, UTM, `reference_code`, Chatwoot conversation id.
- Landing QA: HTTP 200, index/follow, GTM/gtag/dataLayer, WAFlow and WhatsApp hooks.

## Rules

- Pause or fix if spend reaches COP 150,000 with zero `waflow_submit`.
- Pause or fix if more than 20% of spend goes to junk terms.
- Keep if there is `waflow_submit`, useful conversation, `crm_quote_sent`, or CRM opportunity with traceability.
- Do not scale until at least 3 useful leads or sales-confirmed CRM quality.
- Do not activate AR until BR reaches 72h or 30 clicks, whichever occurs first, and BR quality is acceptable.
- Keep AR paused during early/24h checks.

## Evidence Links

- Apply BR: `artifacts/google-ads/2026-05-18-colombiatours-city-gated-tests/2026-05-19T01-04-53-566Z-apply-br-report.json`
- Post-apply validate: `artifacts/google-ads/2026-05-18-colombiatours-city-gated-tests/2026-05-19T01-05-02-600Z-validate-report.json`
- Landing QA live: `output/playwright/colombiatours-landing-qa-2026-05-19/qa-live-checks.json`
- Landing scorecard: `artifacts/google-ads/2026-05-19-colombiatours-landing-roadmap-v2/landing-scorecard.json`
