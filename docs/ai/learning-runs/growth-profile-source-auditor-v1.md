# Learning run — Growth Profile Source Auditor v1

- Pipeline ID: growth-profile-source-auditor-v1
- Date: 2026-05-16
- Branch: feat/growth-profile-source-auditor
- PR: https://github.com/weppa-cloud/bukeer-studio/pull/568
- Commits:
  - `8e0e8a42` — `feat(growth): add profile source auditor`
  - `ad646a9e` — `fix: narrow SECRET_VALUE_RE long-string pattern to avoid false positive redaction`
  - `dc9ff9e8` — `docs(qa): add Profile Source Auditor v1 QA report`
- Task IDs:
  - `t_2e644eac` — T0 SPEC
  - `t_d137d65d` — T5 OPS handoff
  - `t_dda96a69` — T4 QA gate
  - `t_5b484905` — this learning capture
- Pipeline outcome: PASS (PR #568 opened, QA gate PASS, read-only verified)

## Outcome

PASS. The first Growth OS governance tool shipped: a deterministic Profile Source Auditor that proves, per account/website/locale/market/profile type, whether autonomous execution is safe. The auditor is read-only by design — it rejects mutation flags at parse time, self-scans its source for mutation patterns, and redacts all secret-like fields from output.

The live ColombiaTours audit confirmed the expected blockers:
- 0 PASS_AUTONOMOUS — no profiles have real source refs
- 52 FAIL_MISSING_SOURCE_REFS — primary blocker, `source_signal_fact_ids=[]`
- 12 FAIL_LOCALE_MISMATCH — all 25 agent definitions pinned to locale=es-CO
- GSC/GA4 caches empty (0 rows each), DataForSEO cache healthy (89 rows, 12 fresh)

## Gates

| Gate | Result | Notes |
| --- | --- | --- |
| SPEC | PASS | `t_2e644eac` — full spec with CLI contract, verdict model, fixture mode |
| CODE | PASS | `t_d137d65d` — 776-line .mjs script, 97-line Jest test, 1728-line fixture |
| QA | PASS | `t_dda96a69` — fixture + live audit, all 8 verdicts present, safety invariants verified |
| OPS | COMPLETE | PR #568, runbook at `docs/ops/growth-profile-source-auditor-v1.md`, spec at `docs/specs/generated/` |

## Lessons

1. **V1 governance tools must be read-only by default.** The auditor rejects `--apply`, `--repair`, `--refresh-provider`, `--dispatch`, `--cron`, and `--publish` at parse time with exit code 2. This is the correct pattern for all future Growth OS governance tools — mutation modes must be a separate SPEC.

2. **Static self-safety checks prevent drift.** The `assertStaticSafety()` function scans the auditor's own source for `.insert(`, `.update(`, `.upsert(`, `.delete(`) and `hermes kanban` patterns. If any mutation code is added in a future commit, the script fails at startup. This pattern should be required for all read-only governance scripts.

3. **Fixture-based redaction testing catches leaks.** The fixture includes explicit secret-like values (`service-role-fixture-should-redact`, `Bearer eyJhbG...bbbb`) and the test asserts they are redacted in both JSON and Markdown output. This is the only reliable way to verify redaction — regex-only approaches miss edge cases.

4. **Verdict precedence masks lower-severity failures.** FAIL_MISSING_SOURCE_REFS (precedence rank 3) fires before FAIL_PROVIDER_CACHE_EMPTY (rank 4). This means empty GSC/GA4 caches are invisible in the report when profiles lack source refs. The precedence is correct (fix source refs first), but the report should surface masked failures as secondary warnings.

5. **Agent definition locale/market alignment is the systemic blocker for multi-market autonomy.** All 25 agent definitions are pinned to locale=es-CO. Until this is fixed, no non-ES autonomous flow can pass. This is a pre-existing debt, not a bug in the auditor — the auditor correctly surfaces it.

6. **Market-to-locale mapping is implicit and not centralized.** The `localeToMarket()` function maps en-US→US, pt-BR→BR, fr-FR→EU, de-DE→EU, es-CO→CO. This mapping is critical for Growth OS routing but exists only in the auditor source. It should be a centralized fact or config.

7. **growth_signal_facts.updated_at column doesn't exist.** The auditor tries to order `growth_signal_facts` by `updated_at` but the table has no such column. This is a non-fatal error. The table needs either an `updated_at` column or the auditor should fall back to `created_at`.

8. **Controlled refresh source → canary-only is a safe default.** The `isControlledSource()` function demotes profiles sourced from `neo_controlled_refresh`/`manual`/`human` to `PASS_CANARY_ONLY`. This prevents autonomous execution on profiles that were manually refreshed without provider evidence. This rule should be documented as a Growth OS operational invariant.

## Materialization Candidates

### Pattern docs (write to docs/ai/patterns/)

1. **Read-only governance auditor pattern** — Document the v1 pattern: CLI script with deterministic fixture mode, explicit verdict enums with precedence, static self-safety checks, secret redaction, mutation flag rejection at parse time, and fixture-based redaction testing. This is the template for all future Growth OS governance tools (budget auditor, provider health auditor, etc.).

2. **Verdict precedence model for Growth OS autonomy** — Document the 8-level verdict system (FAIL_MISSING_PROFILE → FAIL_LOCALE_MISMATCH → FAIL_MISSING_SOURCE_REFS → FAIL_PROVIDER_CACHE_EMPTY → FAIL_STALE → FAIL_LOW_CONFIDENCE → PASS_CANARY_ONLY → PASS_AUTONOMOUS) as a reusable pattern for any Growth OS gate that needs to decide whether autonomous execution is safe.

### Profile facts (store as durable facts)

3. **Market-to-locale mapping for Growth OS** — en-US→US, pt-BR→BR, fr-FR→EU, de-DE→EU, es-CO→CO. This mapping is used by the profile source auditor and is critical for Growth OS routing decisions. Currently only exists in the auditor source.

4. **Controlled refresh source → canary-only rule** — Profiles sourced from `neo_controlled_refresh`, `manual`, or `human` must be demoted to `PASS_CANARY_ONLY` and cannot reach `PASS_AUTONOMOUS` without provider-backed signal facts. This is a Growth OS operational invariant.

### GitHub issues

5. **growth_signal_facts table needs updated_at column** — The table has no `updated_at` column but the profile source auditor tries to order by it. Add the column or update the auditor to fall back to `created_at`. Low severity, non-fatal.

6. **Agent definitions need per-market locale alignment** — All 25 agent definitions are pinned to locale=es-CO. This blocks all non-ES autonomous flows. This is a pre-existing debt surfaced by the auditor. Requires a separate pipeline to fix agent definition locale/market targeting.

7. **Report should surface masked failures** — When a higher-precedence verdict (e.g. FAIL_MISSING_SOURCE_REFS) masks a lower-precedence one (e.g. FAIL_PROVIDER_CACHE_EMPTY), the report should include a `masked_failures` section so operators know about secondary blockers without re-running with different flags.

### Preflight/gate updates

8. **Tech-validator checklist: require static safety check for read-only scripts** — Any read-only governance script must include `assertStaticSafety()` or equivalent self-scan for mutation patterns. Add to CODE GATE checklist for Growth OS tools.

## Selective Resume Guidance

After PR #568 is merged:

- The profile source auditor is safe to run in CI as a pre-deploy gate for any Growth OS autonomous flow.
- Agent definition locale alignment is the highest-priority blocker for multi-market autonomy — create a pipeline to fix it before attempting any non-ES autonomous execution.
- The `growth_signal_facts.updated_at` column gap is non-blocking but should be fixed before the auditor is used in production CI gates.

## Evidence

- PR: https://github.com/weppa-cloud/bukeer-studio/pull/568
- Runbook: `docs/ops/growth-profile-source-auditor-v1.md`
- Spec: `docs/specs/generated/growth-profile-source-auditor-v1-SPEC.md`
- QA report: `docs/qa/growth-profile-source-auditor-v1-qa.md`
- Main files:
  - `scripts/growth/profile-source-auditor.mjs`
  - `scripts/growth/fixtures/profile-source-auditor.fixture.json`
  - `__tests__/scripts/growth/profile-source-auditor.test.js`
  - `package.json` (npm script entry)