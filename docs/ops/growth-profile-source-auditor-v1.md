# Growth Profile Source Auditor v1 Runbook

Status: implemented as a read-only governance audit tool.

## Purpose

`growth:profile-source-audit` proves whether Growth OS profiles have enough fresh, locale-compatible and source-backed evidence for autonomous use. It does not repair profiles, call providers, publish content, dispatch Kanban work, or activate crons.

## Commands

Fixture validation without Supabase credentials:

```bash
npm run growth:profile-source-audit -- \
  --fixture=scripts/growth/fixtures/profile-source-auditor.fixture.json \
  --format=both \
  --out-dir=artifacts/growth/profile-source-auditor-fixture
```

Default ColombiaTours live read-only audit:

```bash
npm run growth:profile-source-audit -- \
  --account-id=9fc24733-b127-4184-aa22-12f03b98927a \
  --website-id=894545b7-73ca-4dae-b76a-da5b6a3f8441 \
  --locales=en-US,pt-BR,fr-FR,de-DE \
  --format=both
```

JSON-only stdout for CI:

```bash
npm run growth:profile-source-audit -- --format=json --stdout=json
```

## Outputs

The auditor writes these files under `--out-dir`:

- `profile-source-auditor-report.json`
- `profile-source-auditor-report.md`

The report includes:

- top-level status and verdict counts,
- locale/action matrix,
- per-profile verdicts and blockers,
- source table health summaries,
- agent definition locale/market mismatches,
- redacted samples only.

## Safety invariants

- `safety.readonly=true`
- `writes_attempted=0`
- `provider_calls_attempted=0`
- `crons_modified=0`
- `dispatch_attempted=0`
- `secrets_redacted=true`
- v1 rejects `--apply`, `--repair`, `--refresh-provider`, `--dispatch`, `--cron`, and `--publish` with exit code 2.
- Empty `source_signal_fact_ids` cannot return `PASS_AUTONOMOUS` or `PASS_CANARY_ONLY` when `--require-source-refs=true`.

## Fixture coverage

The deterministic fixture covers all required verdict enum values:

- `PASS_AUTONOMOUS`
- `PASS_CANARY_ONLY`
- `FAIL_MISSING_PROFILE`
- `FAIL_STALE`
- `FAIL_LOCALE_MISMATCH`
- `FAIL_MISSING_SOURCE_REFS`
- `FAIL_PROVIDER_CACHE_EMPTY`
- `FAIL_LOW_CONFIDENCE`

## Focused test command

```bash
npm run test -- --runInBand __tests__/scripts/growth/profile-source-auditor.test.js
```
