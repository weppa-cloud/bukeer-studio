# Issue #600 Provider Runtime Foundation Evidence

Date: 2026-05-28
Last updated: 2026-05-29
Tenant: ColombiaTours
Account: `9fc24733-b127-4184-aa22-12f03b98927a`
Website: `894545b7-73ca-4dae-b76a-da5b6a3f8441`
Issue: https://github.com/weppa-cloud/bukeer-studio/issues/600
Status: `GO`

## Decision

`GO` for the ColombiaTours provider runtime foundation gates covered by
`#600`: GSC, GA4 and DataForSEO probes pass; GSC/GA4 runtime readers resolve
`credential_ref` through Vault; GA4 expanded pulls no longer fail on duplicate
`conversions`; the invalid GSC `page_search_appearance` pull was removed;
DataForSEO paid extraction remains approval/cost gated and is represented as
governed `cost_gated` evidence in context packets.

The previous GA4 blocker is resolved: browser-assisted OAuth completed through
the logged-in Google profile, GA4 now has `credential_ref_present=true`, the
read-only GA4 probe returns `PASS`, `growth_ga4_cache` has fresh rows, and the
Supabase-backed runner wrote a ledger row for `ga4_daily_web_traffic_v1`.

This does not approve content scale-out or paid DataForSEO extraction. It means
the provider runtime foundation is certified for guarded beta operation via
snapshots/context packets.

The 2026-05-29 beta diagnostic generated one actionable Growth OS diagnostic
from materialized GSC + GA4 evidence and governed DataForSEO state. It did not
call provider APIs directly and did not publish content.

## Baseline And Final State

| Area | Baseline | Final checkpoint | Status |
| --- | --- | --- | --- |
| `seo_integrations.credential_ref` | Missing in remote schema | Column exists after migration `growth_provider_runtime_foundation_issue600` | `PASS` |
| Cache RLS | `account_id = auth.uid()` | GSC/GA4/DataForSEO cache read policies use `user_roles` account membership | `PASS` |
| Vault writer | Missing | `store_seo_integration_credential_secret(uuid,text,jsonb)` exists; grants only `postgres` and `service_role` | `PASS` |
| Vault reader | Missing | `get_seo_integration_credential_secret(uuid,text,text)` exists; grants only `postgres` and `service_role` | `PASS` |
| GSC credential | Expired `2026-05-10T10:15:16.769Z` | Browser-assisted OAuth completed; `credential_ref_present=true`; probe `PASS` HTTP 200 | `PASS` |
| GA4 credential | Expired `2026-05-10T11:23:53.577Z` | Browser-assisted OAuth completed; `credential_ref_present=true`; probe `PASS` HTTP 200 | `PASS` |
| DataForSEO credential | Connected | Read-only `appendix/user_data` probe `PASS`, HTTP 200, status 20000 | `PASS` |
| `growth_gsc_cache` | 0 rows | 15 rows after Google cache smoke | `PASS` |
| `growth_ga4_cache` | 0 rows | 10 rows after expanded compatibility smoke | `PASS` |
| `growth_dataforseo_cache` | 98 rows | 98 rows; latest fetched `2026-05-21T12:30:44.021Z` | `WATCH` |
| `growth_profile_runs` | Manual rows only | GSC and GA4 success rows written; DataForSEO row written as `cost_gated` with no provider invocation | `PASS` |
| Context packet | No certified #600 packet | Packet includes GSC/GA4/DataForSEO source profiles, freshness, dedupe and direct provider API block; DataForSEO `cost_gated` is governed, not treated as a fresh paid extraction | `PASS` |

## Implementation Added

- `supabase/migrations/20260528170000_growth_provider_runtime_foundation_issue600.sql`
- `supabase/migrations/20260528191000_growth_provider_credential_vault_rpc_issue600.sql`
- `supabase/migrations/20260528211000_growth_provider_credential_vault_reader_issue600.sql`
- Mirrored both migrations byte-for-byte into `../bukeer_flutter/supabase/migrations/`.
- `scripts/growth/provider-credential-probe.ts`
- `scripts/growth/google-oauth-browser-assisted.ts`
- `lib/growth/provider-credentials/probes.ts`
- `lib/growth/provider-credentials/vault.ts`
- `lib/growth/provider-runner/supabase-store.ts`
- `scripts/growth/provider-runner.ts --store supabase`
- Official profiles:
  - `gsc_daily_complete_web_v1`
  - `ga4_daily_web_traffic_v1`
  - `dataforseo_serp_opportunity_v1`
- Context packet support for #600 source profiles, object source refs and
  `blocked_actions`.

## Verification

Migration governance:

```bash
../bukeer_flutter/scripts/validate_supabase_migrations.sh
```

Result: `PASS`.

Focused tests:

```bash
npm test -- --runTestsByPath \
  __tests__/growth/provider-credentials/probes.test.ts \
  __tests__/growth/provider-credentials/vault.test.ts \
  __tests__/growth/provider-runner/provider-runner.test.ts \
  __tests__/growth/provider-runner/supabase-store.test.ts \
  __tests__/lib/growth/context-packets/builder.test.ts \
  __tests__/scripts/seo/populate-growth-google-cache.test.ts \
  --runInBand
```

Result: `PASS`, 6 suites / 28 tests.
Latest result after final context/GSC fixes: `PASS`, 6 suites / 30 tests.

Typecheck:

```bash
npm run typecheck
```

Result: `PASS`.

Whitespace check:

```bash
git diff --check
```

Result: `PASS`.

Credential probe after Vault reader certification and legacy token cleanup:

```bash
npx tsx scripts/growth/provider-credential-probe.ts \
  --website-id 894545b7-73ca-4dae-b76a-da5b6a3f8441
```

| Provider | Status | Reason |
| --- | --- | --- |
| GSC | `PASS` | `gsc_read_only_probe_ok`, HTTP 200, `credential_ref_present=true`, `legacy_token_present=false` |
| GA4 | `PASS` | `ga4_read_only_probe_ok`, HTTP 200, `credential_ref_present=true`, `legacy_token_present=false` |
| DataForSEO | `PASS` | `dataforseo_user_data_ok`, HTTP 200, provider status 20000 |

Refresh-after-expiry checkpoint on 2026-05-29: after the prior GSC access token
expired, the Google cache smoke refreshed through Vault and the next credential
probe still returned GSC `PASS`, `credential_ref_present=true`,
`legacy_token_present=false`, with new expiry `2026-05-29T15:26:47.320Z`.

Google cache refresh:

```bash
npx tsx scripts/seo/populate-growth-google-cache.ts \
  --apply --force --ga4-compatibility-smoke
```

Result:

- GSC live pulls succeeded: `query_page`, `page_country`, `page_device`,
  `date_page`, `search_appearance_discovery`.
- GA4 live pulls succeeded for all 10 configured pulls, including:
  `ga4_daily_landing_channel_v1`, `ga4_page_source_medium_28d_v1`,
  `ga4_event_page_28d_v1`, `ga4_campaign_source_medium_28d_v1` and
  `ga4_geo_landing_28d_v1`.
- The duplicate `conversions` metric issue is fixed by using `keyEvents`.
- The invalid `page_search_appearance` pull was removed; Search Console no
  longer returns the prior grouping error.
- Cache counts: `growth_gsc_cache=15`, `growth_ga4_cache=10`.

Supabase-backed runner apply:

```bash
npm run growth:provider-runner -- --store supabase --apply \
  --profile-id gsc_daily_complete_web_v1 \
  --account-id 9fc24733-b127-4184-aa22-12f03b98927a \
  --website-id 894545b7-73ca-4dae-b76a-da5b6a3f8441 \
  --window-start 2026-05-27 --window-end 2026-05-28
```

Result: ledger write `PASS`; run
`c1dd5108-66b0-411e-9881-1a2a9d4b12e9`; source ref
`growth_gsc_cache:d74d0731-1555-447d-b6f8-e636ada0e864`.

```bash
npm run growth:provider-runner -- --store supabase --apply \
  --profile-id ga4_daily_web_traffic_v1 \
  --account-id 9fc24733-b127-4184-aa22-12f03b98927a \
  --website-id 894545b7-73ca-4dae-b76a-da5b6a3f8441 \
  --window-start 2026-05-27 --window-end 2026-05-28
```

Result: ledger write `PASS`; run
`b9d932d0-217e-47dc-9289-e4b675ba8a13`; source ref
`growth_ga4_cache:f243d6b3-8e18-4826-b3da-2a66cafaa59c`.

```bash
npm run growth:provider-runner -- --store supabase --apply \
  --profile-id dataforseo_serp_opportunity_v1 \
  --account-id 9fc24733-b127-4184-aa22-12f03b98927a \
  --website-id 894545b7-73ca-4dae-b76a-da5b6a3f8441 \
  --window-start 2026-05-27 --window-end 2026-05-28
```

Result: ledger write `PASS`; run
`acb988f2-4fb9-48b7-b974-13877f24fc16`; `run_status=cost_gated`,
`cost_usd=0`; provider invocation `called=false`, reason `apply_cost_gate`.
No paid provider extraction was invoked.

Context packet verification:

- `packet_version`: `growth-provider-context-packet-v1`.
- `source_profiles`: GSC, GA4 and DataForSEO official #600 profiles.
- `profile_run_ids`: GSC
  `c1dd5108-66b0-411e-9881-1a2a9d4b12e9`, GA4
  `b9d932d0-217e-47dc-9289-e4b675ba8a13`, DataForSEO
  `acb988f2-4fb9-48b7-b974-13877f24fc16`.
- `blocked_actions` includes `call_provider_api_directly`,
  `mutate_paid_media_campaign` and `upload_provider_conversion`.
- DataForSEO `cost_gated` appears in `freshness_map`, `source_profiles` and
  the relevant fact bucket as governed blocked evidence.
- Active work is coalesced as `active_work_coalesced` and no longer surfaces as
  false `active_work:ready` NO-GO evidence.

## Beta Diagnostic

```bash
npx tsx scripts/growth/generate-growth-os-beta-diagnostic.ts
```

Result:

- Output: `docs/growth-sessions/2026-05-29-colombiatours-growth-os-beta-diagnostic.md`.
- Status: `watch`.
- Dedupe: `request_refresh` because DataForSEO is intentionally `cost_gated`.
- Provider API called by diagnostic: `false`.
- Content published by diagnostic: `false`.
- Actionable diagnostic: prepare an internal optimization brief for existing
  pages using materialized GSC demand and GA4 behavior; keep SERP/DataForSEO
  extraction behind explicit approval and cost cap.

## OAuth Notes

GSC and GA4 renewal used browser-assisted OAuth with the authenticated Google
profile. The browser was used only for Google consent/login; no cookies, local
storage, access tokens or refresh tokens were read from the browser.

The resulting provider secrets were stored through the Supabase Vault RPC and
`seo_integrations.credential_ref` was populated for both GSC and GA4. Runtime
readers now resolve credentials through the service-role-only Vault reader RPC.
For ColombiaTours, raw `access_token` and `refresh_token` columns in
`seo_integrations` were cleared after Vault reader certification; probes still
return `PASS`.

## Closed Watch Items

- Expanded GA4 profile definitions no longer request duplicate `conversions`
  metrics; normalizers read `keyEvents` with legacy `conversions` fallback.
- DataForSEO paid/broad extraction is blocked unless owner issue, approval
  reference, approver/timestamp, provider-scoped approval and `cost_cap_usd`
  are present.
- GSC/GA4 runtime readers use Vault-backed `credential_ref`; legacy token
  columns in `seo_integrations` are no longer required for ColombiaTours.

## Remaining Watch Items

- DataForSEO paid/broad extraction remains blocked until explicit human
  approval and cost cap.
- The separate Supabase RLS advisory below is still outside `#600` and should
  be handled in a dedicated security sprint.

## Security Advisory

Supabase `list_tables` returned a separate critical advisory: 31 legacy tables
have RLS disabled. This was not auto-remediated because enabling RLS without
table-specific policies can break production access. It should become a
separate security sprint.
