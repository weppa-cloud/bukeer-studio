Fix: Dynamic CRM audiences for Google Ads Customer Match and Meta Custom Audiences
File: docs/audits/2026-05-19-colombiatours-customer-match-audience-audit.md

Requirements:
1. Audience definitions exist for all six required audiences.
2. Dry-run report returns counts per audience: total members, consent-qualified members, email coverage, phone coverage, adds, removes, skips.
3. Google Ads and Meta bindings can be created or mapped without attaching audiences to active campaigns.
4. Sync job supports idempotent incremental adds/removes.
5. Sync logs are written to Supabase and contain no raw PII.
6. Opt-out/removal path removes contacts from Google and Meta audiences.
7. Initial `CT_confirmed_itinerary_buyers_all_24m` can be generated from confirmed itineraries joined to contacts/requests.
8. Documentation includes rollout gates for Search Observation and Meta remarketing/lookalikes.

Implementation:
TODO: Implement based on requirements above
