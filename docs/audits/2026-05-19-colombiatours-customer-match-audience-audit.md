# ColombiaTours Customer Match / Buyer Audience Audit

Generated: 2026-05-19T22:56:42.683Z
Mode: read-only. Google Ads mutations: 0. Supabase writes: 0.

## Answer

- Yes, confirmed buyer contacts can be valuable as a first-party Customer Match audience if consent and Google policy requirements are satisfied.
- Current account has one CRM-based Customer Match-like list: `Clientes profit +$200` (CONTACT_INFO, FIRST_PARTY), but its reported Search/Display size is `0`.
- I did not find a current audience explicitly named or validated as `confirmed itineraries` / purchasers.
- I found no user-list audience criteria attached to the current campaign/ad group scope (campaign criteria: 0, ad group criteria: 0).

## Current Google Ads Audience State

| Audience | Type | Search Size | Display Size | Reading |
| --- | --- | --- | --- | --- |
| Clientes profit +$200 | CRM_BASED | 0 | 0 | Existing Customer Match-like list, but too small/not populated enough to use now. |
| All Converters | RULE_BASED | 120 | 160 | Site/tag converter remarketing, not confirmed purchasers. |
| All visitors (AdWords) | RULE_BASED | 960 | 660 | Remarketing visitors, not purchasers. |
| Remarketing Mexicanos | RULE_BASED | 0 | 0 | Exists but no usable size. |
| Visitantes - Página de gracias | RULE_BASED | 0 | 0 | Thank-you-page style list, not enough usable size. |

## Buyer Data Availability

- Latest itineraries sampled: 1000.
- Confirmed itinerary candidates in sample: 39.
- Confirmed with `id_contact`: 31.
- Linked contacts found: 31.
- Linked contacts with email or phone: 31.
- Linked requests found: 17.
- Linked requests with email or phone: 14.

## Recommendation

- Build a clean Customer Match list named `CT_confirmed_itinerary_buyers_all_24m` from confirmed itineraries joined to contacts/requests.
- Start as Observation-only for Search, not hard targeting.
- Do not upload until consent/legal basis is confirmed and fields are normalized/hash-ready.
- Use this later for: high-value buyer seed, exclusion of recent buyers, remarketing/upsell, and Smart Bidding audience signals.

## Files

- `artifacts/google-ads/2026-05-19-colombiatours-customer-match-audience-audit/customer-match-audience-audit.json`
- `artifacts/google-ads/2026-05-19-colombiatours-customer-match-audience-audit/google-ads-user-lists-key-findings.csv`
