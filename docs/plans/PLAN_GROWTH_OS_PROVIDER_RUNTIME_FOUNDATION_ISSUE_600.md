# Plan #600 - Growth OS Provider Runtime Foundation

Issue: https://github.com/weppa-cloud/bukeer-studio/issues/600
Tenant: ColombiaTours
Account: `9fc24733-b127-4184-aa22-12f03b98927a`
Website: `894545b7-73ca-4dae-b76a-da5b6a3f8441`

## Objective

Certify that Bukeer Studio can operate the ColombiaTours Growth OS provider
runtime with real GSC, GA4 and DataForSEO evidence without degrading the main
app and without allowing agents to call provider APIs directly.

Final decision values:

- `GO`: all provider, credential, runner, context packet and RLS gates pass.
- `GO-WITH-WATCH`: only non-critical P2/P3 warnings remain.
- `NO-GO`: any credential, freshness, runner, RLS, cost or direct-provider
  access gate fails.

Current ColombiaTours checkpoint on 2026-05-29: `GO`. GSC, GA4 and DataForSEO
credential probes pass; GSC and GA4 caches have current rows; the
Supabase-backed runner wrote ledger rows for the three official profiles; GA4
expanded pulls no longer request duplicate `conversions`; GSC/GA4 readers
resolve `credential_ref` through Vault; raw GSC/GA4 token columns in
`seo_integrations` were cleared for ColombiaTours; the invalid GSC
`page_search_appearance` pull was removed; context packets represent
DataForSEO as governed `cost_gated` evidence instead of a fresh paid
extraction; active work is coalesced without creating a false NO-GO.

## Implementation Gates

| Gate | Required evidence | PASS condition |
| --- | --- | --- |
| Credential registry | `seo_integrations.credential_ref` migration | Provider secrets can be referenced through Vault/secret manager; new code does not require raw token storage. |
| Vault writer | `store_seo_integration_credential_secret` RPC | Service-role code can store encrypted provider secrets and receive an opaque `credential_ref`. |
| Vault reader | `get_seo_integration_credential_secret` RPC | Service-role runtime readers resolve the opaque `credential_ref`; agents/authenticated clients cannot execute it. |
| Credential probes | `scripts/growth/provider-credential-probe.ts` | DataForSEO returns `PASS`; GSC/GA4 return `PASS`, `WARN: needs_refresh_no_write` or precise `FAIL` without writing refreshed tokens. |
| Provider runner | `scripts/growth/provider-runner.ts --store supabase` | Dry-run reads Supabase freshness; apply writes/upserts `growth_profile_runs`. |
| Provider profiles | runner manifest | `gsc_daily_complete_web_v1`, `ga4_daily_web_traffic_v1`, `dataforseo_serp_opportunity_v1` are registered. |
| Context packets | context packet builder/tests | Packets include source profiles, freshness, dedupe and `call_provider_api_directly` block. |
| RLS | migration/policy audit | Provider caches use `user_roles` account membership, not `account_id = auth.uid()`. |
| Evidence closeout | session report + GitHub comment | `#600` has commands, results and final decision. |

## Credential Renewal Policy

If GSC or GA4 returns `WARN: needs_refresh_no_write`, renew through a
browser-assisted OAuth flow for the ColombiaTours verified Google account.

Rules:

- The browser is only for Google login/consent.
- Do not scrape Chrome cookies, local storage, access tokens or refresh tokens.
- Exchange the authorization code through an approved server/local callback.
- Store the resulting provider secret in Vault/secret manager.
- Write only the opaque `credential_ref` into `seo_integrations`.
- Runtime readers must prefer Vault when `credential_ref` is present. Legacy
  token columns are fallback only for rows that have not yet been migrated.
- `.env.local` is allowed only for local smoke fallback, never as production SOT.

Checkpoint result: both GSC and GA4 were renewed through the browser-assisted
flow. The browser was used only for Google consent/login; no browser cookies,
local storage, tokens or OAuth codes were read into logs or documentation.
After Vault reader certification, ColombiaTours GSC/GA4 raw token columns in
`seo_integrations` were cleared and probes still returned `PASS`.

## Execution Sequence

1. Capture baseline SQL for `seo_integrations`, provider caches and
   `growth_profile_runs`.
2. Run credential probes for DataForSEO, GSC and GA4.
3. Apply the additive migration from the approved Supabase migration path.
4. If GSC/GA4 are expired, complete OAuth renewal and persist only
   `credential_ref`.
5. Run provider runner dry-runs with `--store supabase`.
6. Run provider runner apply only when the profile is free/read-only or has
   explicit DataForSEO approval metadata.
7. Build a context packet requiring the three #600 profiles.
8. Generate the ColombiaTours beta diagnostic from context packet/snapshot
   evidence only; do not call provider APIs or publish content.
9. Run unit tests and write the final session report.
10. Comment `#600` with `GO`, `GO-WITH-WATCH` or `NO-GO`.

## Non-goals

- No content scale-out.
- No paid media mutation.
- No broad/costed DataForSEO run without owner approval and cost cap.
- No replacement of Supabase operational SOT with Hermes memory/Kanban.
