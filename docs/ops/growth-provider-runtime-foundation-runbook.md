# Growth Provider Runtime Foundation Runbook

Issue: `#600`
Tenant: ColombiaTours

## Preflight

Do not print secrets. Do not commit `.env.local`, OAuth codes, access tokens,
refresh tokens, service-role keys, DataForSEO credentials or browser-derived
credentials.

```bash
git status --short
npm run session:list
```

## Baseline SQL

Run read-only SQL against Supabase:

```sql
select provider, status, site_url, property_id,
       access_token is not null as has_access_token,
       refresh_token is not null as has_refresh_token,
       credential_ref is not null as has_credential_ref,
       access_token_expires_at, last_error, updated_at
from public.seo_integrations
where website_id = '894545b7-73ca-4dae-b76a-da5b6a3f8441'
order by provider;
```

```sql
select 'growth_gsc_cache' table_name, count(*) row_count, max(fetched_at) latest_fetched_at, max(expires_at) latest_expires_at
from public.growth_gsc_cache where website_id = '894545b7-73ca-4dae-b76a-da5b6a3f8441'
union all
select 'growth_ga4_cache', count(*), max(fetched_at), max(expires_at)
from public.growth_ga4_cache where website_id = '894545b7-73ca-4dae-b76a-da5b6a3f8441'
union all
select 'growth_dataforseo_cache', count(*), max(fetched_at), max(expires_at)
from public.growth_dataforseo_cache where website_id = '894545b7-73ca-4dae-b76a-da5b6a3f8441';
```

## Credential Probes

```bash
npx tsx scripts/growth/provider-credential-probe.ts \
  --website-id 894545b7-73ca-4dae-b76a-da5b6a3f8441
```

Expected:

- DataForSEO: `PASS`.
- GSC/GA4: `PASS`, `WARN: needs_refresh_no_write`, or precise `FAIL`.
- No secrets in stdout.

ColombiaTours checkpoint on 2026-05-28: GSC, GA4 and DataForSEO all returned
`PASS`. GA4 `invalid_grant` is no longer an active credential blocker. After
Vault reader certification, GSC/GA4 probes returned `PASS` with
`legacy_token_present=false` in `seo_integrations`.

ColombiaTours checkpoint on 2026-05-29: GSC/GA4 still resolve via
`credential_ref` with `legacy_token_present=false`; DataForSEO health probe
returns `PASS` and paid extraction remains cost gated.

## OAuth Renewal For GSC/GA4

Use browser-assisted OAuth only if GSC/GA4 report
`WARN: needs_refresh_no_write`.

Required behavior:

- Use the logged-in Google browser profile only for consent/login.
- Do not scrape cookies, browser local storage or tokens.
- Exchange authorization code through approved callback.
- Store resulting secret in Vault/secret manager.
- Update `seo_integrations.credential_ref`.
- Do not store new raw tokens in `metadata` or docs.

Controlled local helper:

```bash
npx tsx scripts/growth/google-oauth-browser-assisted.ts \
  --provider gsc \
  --website-id 894545b7-73ca-4dae-b76a-da5b6a3f8441 \
  --site-url sc-domain:colombiatours.travel \
  --open
```

```bash
npx tsx scripts/growth/google-oauth-browser-assisted.ts \
  --provider ga4 \
  --website-id 894545b7-73ca-4dae-b76a-da5b6a3f8441 \
  --property-id 294486074 \
  --open
```

The helper writes through `store_seo_integration_credential_secret` and prints
only redacted status. By default it clears legacy token columns; temporary
compatibility requires the explicit `--legacy-columns` flag.

Do not document OAuth URLs, authorization codes, access tokens or refresh
tokens. For evidence, record only provider, `credential_ref` presence, expiry,
probe status and redacted helper status.

## Vault Reader

Runtime readers must resolve GSC/GA4 credentials through
`get_seo_integration_credential_secret` when `credential_ref` is present. The
function is service-role-only and must not be exposed to agents, browser
clients or authenticated end users.

Evidence query:

```sql
select provider,
       credential_ref is not null as credential_ref_present,
       access_token is not null as access_token_present,
       refresh_token is not null as refresh_token_present,
       access_token_expires_at
from public.seo_integrations
where website_id = '894545b7-73ca-4dae-b76a-da5b6a3f8441'
  and provider in ('gsc','ga4','dataforseo')
order by provider;
```

## Provider Runner

Dry-run with Supabase-backed store:

```bash
npm run growth:provider-runner -- \
  --store supabase \
  --dry-run \
  --profile-id gsc_daily_complete_web_v1 \
  --account-id 9fc24733-b127-4184-aa22-12f03b98927a \
  --website-id 894545b7-73ca-4dae-b76a-da5b6a3f8441 \
  --window-start 2026-05-27 \
  --window-end 2026-05-28
```

Use `--apply` only after freshness/provider evidence is known. DataForSEO
costed profiles require owner issue, approver, approval reference, positive
estimated cost, provider-scoped approval scope JSON and `cost_cap_usd` before
any paid extraction.

For GA4 expanded pulls, distinguish auth failures from profile/query failures.
GA4 profiles should use `keyEvents`; do not request deprecated `conversions`
alongside `keyEvents`.

For GSC, do not use a profile that groups `searchAppearance` with another
dimension. The valid discovery pull is `search_appearance_discovery` with only
`searchAppearance`; the invalid `page_search_appearance` pull was removed.

## Context Packet And Beta Diagnostic

Build packets from Supabase-backed ledger and caches only. Agents must receive
materialized context, never provider credentials or permission to call provider
APIs directly.

Required packet fields:

- `source_profiles`
- `profile_run_ids`
- `freshness_map`
- `dedupe_verdict`
- `blocked_actions` including `call_provider_api_directly`

Expected ColombiaTours semantics:

- GSC and GA4 can be `fresh` when ledger/cache evidence is current.
- DataForSEO paid extraction can be `cost_gated`; this is governed evidence, not
  proof that a paid extraction ran.
- `active_work:*` should coalesce into `active_work_coalesced`, not a false
  provider NO-GO.

Beta diagnostic command:

```bash
npx tsx scripts/growth/generate-growth-os-beta-diagnostic.ts
```

The diagnostic must report `provider_api_called=false` and
`published_content=false`.

## Tests

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

## Decision

Write the session report under:

```text
docs/growth-sessions/YYYY-MM-DD-issue600-provider-runtime-foundation.md
```

Comment `#600` with:

- baseline evidence;
- credential probe results;
- migration/RLS state;
- runner/profile/context packet test results;
- final `GO`, `GO-WITH-WATCH` or `NO-GO`.

## Rollback

The migration is additive. If an issue appears:

- stop using `--store supabase` in runner commands;
- use memory store only for tests;
- keep `credential_ref` unused;
- restore prior cache read policies only if approved by DB owner.
