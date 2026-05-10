# Epic #471 Provider Intelligence Certification

Date: 2026-05-10
Tenant: ColombiaTours
Account: `9fc24733-b127-4184-aa22-12f03b98927a`
Website: `894545b7-73ca-4dae-b76a-da5b6a3f8441`
Status: `CERTIFIED WITH CLARITY CONNECTOR WATCH`

## Scope

Epic #471 was certified as the Growth OS Provider Intelligence + Correlation Layer:

`provider run -> normalized facts -> joint facts -> anti-rework gate -> evidence-backed candidates -> work items -> outcomes -> learning`

The certification covers provider registry/ledger, DataForSEO, GSC, GA4, Clarity control state, Brain/runtime evidence, UI surfaces and E2E.

## Production Evidence

Provider profile runs in `growth_profile_runs`:

| Area | Evidence |
| --- | --- |
| DataForSEO OnPage | `dfs_onpage_full_comparable_v3` run `127f3609-58e2-4c60-a730-d48b97588a97`, `PASS`, cost `$2.50`; `dfs_onpage_changed_urls_v1` run `172299df-532b-4d01-a1f5-6031c4960ba1`, `PASS` |
| DataForSEO SERP/Labs/Auth/Historical | `dfs_serp_labs_primary_v1` run `02f32bcd-459c-4325-8c27-52196f5465da`, `PASS`; `dfs_serp_labs_secondary_v1` run `6d940b64-2a2c-45bb-ab27-d4dac6890304`, `PASS`; `dfs_historical_trends_v1` run `06f2d462-10de-4f66-9c21-a60ec9108b0d`, `PASS`; `dfs_authority_fallback_v1` run `6939a8f4-004d-4951-97d1-d82ed2247c75`, `PASS` |
| GSC expanded | `gsc_growth_minimum_v1` run `e12a5b2f-d79a-4b5f-a3fb-fc399e57c575`, `PASS`, `15869` rows; `gsc_indexability_v1` run `8173f607-218e-430d-aeae-0be464ad344c`, `PASS` |
| GA4 expanded | `ga4_growth_minimum_v1` run `c2221b01-3276-42b3-a164-f6ebe753a37d`, `PASS`; `ga4_batch_funnel_v1` run `bb71507e-738e-431f-8502-ff1df6a3926a`, `PASS`; `ga4_admin_governance_v1` run `6f38f31d-d51d-44eb-9427-108bb0ac616b`, `PASS`, 4 key events and 1 data stream; `ga4_pivot_funnel_v1` run `d75c9506-2df8-4485-b2d0-93249f9c0ceb`, `PASS`; `ga4_realtime_smoke_v1` run `184d8164-625b-4655-9f01-a94143a7b455`, `PASS` |
| Clarity | `clarity_ux_friction_v1` run `76686552-e4cb-40af-9bdf-83516b4cf49d`, `WATCH`; code enforces aggregate-only dimensions and blocks recordings/PII, but no `clarity` row exists in `seo_integrations` for ColombiaTours, so live extraction remains connector-gated |

Provider-backed work and candidate evidence:

| Signal | Evidence |
| --- | --- |
| Provider-backed candidates | `3793` opportunity candidates total; `1981` with DataForSEO evidence; `151` with provider evidence reads; `196` with correlation |
| Provider-backed work items | `1050` work items total; `81` with provider evidence reads/DataForSEO evidence; `17` with correlation |
| Sample provider-backed work item | `4bccbf42-75d2-4416-a700-9ece932f6404` |
| Sample correlated work item | `59da5d73-65c8-4a54-ac5f-dc00e1f14455` |
| Sample Brain decision with provider reads | `33a1fbbd-551f-4fa6-b00c-6a355cdc3e22` |

## Anti-Rework

The anti-rework contract is implemented in `lib/growth/providers/evidence-correlation.ts` and covered by unit tests:

- stable fingerprints ignore volatile run/cycle fields;
- active equivalent work coalesces;
- materially changed evidence reopens failed work;
- prior measuring, won/lost and rollback states alter verdicts before materialization.

Production evidence includes correlated candidates/work items with `dedupe_verdict`, `action_key`, `entity_key`, `correlation_key` and `evidence_fingerprint`.

## UI/E2E

Session-pool E2E was run against slot `s1` / port `3001`:

```bash
GROWTH_OS_UI_E2E_ENABLED=true \
E2E_GROWTH_ROLE_FIXTURES_READY=true \
E2E_GROWTH_VIEWER_EMAIL='consultoria+growth-viewer@weppa.co' \
E2E_GROWTH_CURATOR_EMAIL='consultoria+growth-curator@weppa.co' \
E2E_GROWTH_ROLE_PASSWORD='Ingeniero1!' \
E2E_GROWTH_RUN_WITH_EVENTS_ID='aeff9972-da30-44df-b99c-2874389e2eaa' \
npm run session:run -- --grep "@growth-os-ui" --project=chromium
```

Result: `16 passed (1.6m)`.

Covered:

- CEO cockpit and scheduler/runtime health;
- Agents UI, learning operations and replay threshold blocking;
- Workboard provider/correlation surfaces;
- Run detail, rollback/audit evidence and append-only events;
- Data Health provider profile runs;
- mobile no-overflow;
- cross-tenant guard;
- viewer/curator role gating.

## Unit/Schema Tests

```bash
npm test -- --runTestsByPath \
  __tests__/lib/growth/providers/profile-registry.test.ts \
  __tests__/lib/growth/providers/evidence-correlation.test.ts \
  __tests__/schema/growth-provider-intelligence.test.ts \
  __tests__/lib/growth/providers/provider-clients.test.ts \
  --runInBand
```

Result: `4 passed`, `16 tests passed`.

## Remaining Watch

Clarity is implemented as an aggregate-only provider profile and displayed as provider coverage, but ColombiaTours does not currently have a `seo_integrations` row for `provider='clarity'`. This is not a blocker for #471 closure because the epic requires coverage/freshness/blockers, not raw session recordings or forced connector provisioning. The operational follow-up is to connect Clarity credentials before expecting live UX rows.

## Closure Recommendation

Close #472-#480 and then #471.

Reasoning:

- provider registry/run ledger/correlation fields are present;
- DataForSEO, GSC and GA4 profile evidence has production rows;
- Clarity is privacy-safe and correctly `WATCH` due missing connector;
- Brain/runtime consume provider reads;
- UI/E2E and unit tests pass;
- anti-rework is implemented and evidenced.
