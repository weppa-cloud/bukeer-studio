# Learning run — Provider Runner Beta (#538) Freshness/Budget/Approval Gates + Run Ledger

- Pipeline ID: provider-runner-beta-538
- Date: 2026-05-14
- Branch: growth-provider-runner-beta
- Commit: 49a2f68aac1dd02918740153d7d15114efe7791d
- Merge SHA: c79639f3f12c622d026aaf53967223c7610b3d5b (squash merged to dev)
- PR: https://github.com/weppa-cloud/bukeer-studio/pull/547
- GitHub issue: [#538 Provider Runner Beta](https://github.com/weppa-cloud/bukeer-studio/issues/538)
- Parent epic: [#521 Hermes Primary Runtime MVE v0 / Provider Profile Architecture v2](https://github.com/weppa-cloud/bukeer-studio/issues/521)
- Task IDs: t_765c83ba (specifier), t_cd1e153e (tech-validator plan), t_68ba4b62 (developer), t_64a19c72 (tech-validator code), t_82368052 (qa-engineer), t_72d89a2f (ops), t_859c6483 (learning-curator)
- Spec refs: docs/specs/SPEC_GROWTH_OS_PROVIDER_PROFILE_ARCHITECTURE_V2.md, docs/audits/AUDIT_GROWTH_OS_PROVIDER_PROFILE_REGISTRY_MAP_2026-05.md
- ADR refs: ADR-003, ADR-005, ADR-008, ADR-009, ADR-016, ADR-018, ADR-029
- Plan: docs/plans/PLAN_GROWTH_OS_PROVIDER_RUNNER_BETA_ISSUE_538.md

## Outcome

PASS: Provider Runner Beta delivered and merged to dev. 11 files changed, 1874 insertions, 0 deletions. All 6 gates passed: specifier PLAN, tech-validator PLAN review (9/9 criteria), developer implementation, tech-validator CODE review (11/11 criteria), QA GATE (7/7 scenarios), and OPS (PR merged, issue #538 closed, epic #521 updated). Typecheck, lint, Jest (7/7 pass), secrets scan all clean. Merge at c79639f3 on dev.

## Evidence links

- Merge commit: c79639f3 — `feat(growth): add Provider Runner Beta — Freshness/Budget/Approval Gates + Run Ledger (#538)`
- PR: https://github.com/weppa-cloud/bukeer-studio/pull/547
- Epic comment: https://github.com/weppa-cloud/bukeer-studio/issues/521#issuecomment-4455384949
- Plan: docs/plans/PLAN_GROWTH_OS_PROVIDER_RUNNER_BETA_ISSUE_538.md
- Spec: docs/specs/SPEC_GROWTH_OS_PROVIDER_PROFILE_ARCHITECTURE_V2.md
- Audit: docs/audits/AUDIT_GROWTH_OS_PROVIDER_PROFILE_REGISTRY_MAP_2026-05.md

## Gates and commands

| Gate/command | Result | Evidence |
| --- | --- | --- |
| T1 Specifier PLAN | PASS | Created PLAN at commit 4450a8a9, indexed in docs/INDEX.md |
| T2 Tech-validator PLAN review | PASS | 9/9 criteria pass — runner host, gates, ledger reuse, multi-tenant, no mutation |
| T3 Developer implementation | PASS | 10 files, commit 49a2f68a, npm run typecheck PASS, 7/7 Jest tests PASS |
| T4 Tech-validator CODE review | PASS | 11/11 CHECK criteria pass — diff scope, gate ordering, freshness, cost, circuit, tenant, dry-run, beta path, mutation-free, meaningful tests, no secrets |
| T5 QA gate | PASS | 7/7 scenarios: dry-run-gsc, freshness-skip, stale-missing-gated, dataforseo-cost-gate, circuit-breaker, tenant-isolation, secret-scan |
| T6 OPS gate | PASS | PR #547 created, squash merged to dev at c79639f3, issue #538 closed, epic #521 commented |
| T7 Learning curator | RUNNING | This document |

## What was delivered

11 files across the provider runner system:

1. **Types and manifest** (`lib/growth/provider-runner/types.ts`, `manifest.ts`): Typed profile manifest interface with Zod validation. Normalized manifest covers profile_id, provider, cadence, freshness TTL, cost policy, approval policy, required identifiers, cache target, scripts, fact outputs, PII policy, and beta read-only/mutation-blocking policy.

2. **Gate engine** (`lib/growth/provider-runner/runner.ts`): Gate-first pipeline enforcing input_manifest → freshness → budget → approval → circuit_breaker → apply_live_call → executor order. Uses mocks for repository/cache queries to support dry-run and test isolation.

3. **Ledger helpers** (`lib/growth/provider-runner/ledger.ts`, `idempotency.ts`): Replay-safe `growth_profile_runs` writes with deterministic idempotency keys, evidence fingerprinting (excludes volatile run id/timestamps), redacted insert/update payload builder, and required field validation.

4. **Executor interface** (`lib/growth/provider-runner/executors.ts`): Beta executor dispatch designed for `gsc_daily_complete_web_v1`. Returns source refs, row count and summary. GA4 documented as second-path; DataForSEO remains cost-gated.

5. **CLI entrypoint** (`scripts/growth/provider-runner.ts`): Internal Node CLI with `npm run growth:provider-runner`. Defaults to dry-run. Required flags: `--profile-id`, `--website-id`, `--account-id`, `--window-start`, `--window-end`. Protective flags: `--apply`, `--allow-live-provider-call`. Outputs JSON summary to stdout.

6. **Tests** (`__tests__/growth/provider-runner/provider-runner.test.ts`): 7 tests covering fresh ledger skip, fresh cache skip, dry-run no-provider-call, DataForSEO cost gate, missing live-call flag, circuit breaker open, and tenant isolation with idempotency.

7. **Docs indexing** (`docs/INDEX.md`, `docs/plans/`): Plan indexed with wikilink `[[PLAN_GROWTH_OS_PROVIDER_RUNNER_BETA_ISSUE_538]]`.

## Key design decisions

1. **Gate-first architecture confirmed**: Six-gate pipeline is the single execution boundary. Only `--apply --allow-live-provider-call` with stale/freshness-fail + all-gates-pass path calls the provider executor. All other paths (dry-run, freshness skip, cost gate, approval miss, circuit open) skip provider invocation.

2. **Node CLI/runner host**: Not a Cloudflare Worker (too long-lived for provider jobs), not a Supabase Edge Function (reuse existing TS scripts). Internal Node CLI supervised by Neo/Hermes or future GitHub Actions. Decision was validated across all 6 gates.

3. **Static manifest subset**: Implementation uses a typed TS module (`manifest.ts`) instead of dynamically importing the `.mjs` registry (`growth-provider-profile-registry.mjs`). Avoids Jest/ts-jest ESM friction. Registry hardening deferred to later task.

4. **growth_profile_runs ledger reuse**: No new migration. `row_count`, `window`, `gate_decisions`, `skip_reason`, `no_go_reasons` all live in `payload` JSON column. Existing `provider` constraint (dataforseo|gsc|ga4|clarity) reused without forcing paid provider expansion in #538.

5. **GSC first path**: `gsc_daily_complete_web_v1` chosen as first beta profile — free/read-only, daily cadence, automatic approval, cost_usd=0, cache target `growth_gsc_cache`. GA4 documented as second path; DataForSEO cost/approval gated.

6. **CLI dry-run is safe by design**: Never writes ledger rows and never invokes provider scripts by default. Requires `--apply` and `--allow-live-provider-call` for execution. Even `--apply` alone does not invoke providers if any gate blocks.

7. **Multi-tenant isolation**: All CLI inputs and Supabase reads/writes require explicit `--website-id` and `--account-id`. Zod UUID/string schema validation at input. Manifest `required_identifiers` enforces at gate level.

8. **Circuit breaker**: Opens after 3+ failures in rolling 24h window. Cooldown of 6h. No UI for manual reset in #538. State tracked in `circuit_breaker` JSON column.

## Failures and retries

- **No failures or retries**: This pipeline ran cleanly without any blockers across all 6 profiles. Each gate passed on first attempt.
- **PR creation blocked by missing gh CLI**: The OPS worker (t_72d89a2f) opened PR #547 through `gh pr create` — available in its environment. This contrasts with earlier pipeline runs where `gh` was unavailable and manual PR instructions were produced. The discrepancy suggests `gh` availability varies by profile/environment.
- **T6 infra available**: Unlike the transcreation-stabilization run, `docs/ai/` was already available on `origin/main` (via PR #543 merge). This learning-run document is created against the developing pattern.

## Reusable patterns

1. **Gate-first pipeline architecture**: The 6-gate sequence (manifest → freshness → budget → approval → circuit_breaker → apply_live_call → executor) is a new Growth OS pattern for wrapping provider profiles before execution. This pattern should be documented as a reusable architectural decision for future profile types — any new provider integration (paid media, AI/GEO, tracking) should reuse this gate pipeline rather than inventing a new one.

2. **Provider runner as single execution boundary**: All provider API calls must go through the runner. Workers/agents consume context packets and normalized facts, never provider clients. This boundary is enforced by the manifest `runner_policy.blocked_direct_consumers` and the runner's `executors.ts` being the only code that can invoke provider scripts. Future provider integrations should maintain this boundary.

3. **Static manifest subset as beta bridge**: When the dynamic registry (`.mjs`) creates ESM friction with the test runner (Jest/ts-jest), a typed static subset is acceptable for beta. A tracking issue should document the full migration path back to dynamic import. This pattern applies to any Jest+ESM boundary problem in this repo.

4. **Deterministic idempotency key format**: `growth-provider-runner:v1:{account_id}:{website_id}:{profile_id}:{window_start}:{window_end}:{mode}:{evidence_scope_hash}` — stable across retries, prevents duplicate ledger rows. Evidence fingerprint excludes volatile run_id/timestamps. This pattern should be reused for any future runner or task that writes to `growth_profile_runs`.

5. **Multi-tenant mandatory via Zod**: Both `--website-id` and `--account-id` are required CLI arguments, validated as UUIDs via Zod. No hidden defaults. ColombiaTours values may exist as CLI convenience defaults but are not architecture dependencies. This pattern should be mandatory for any future multi-tenant CLI tool in this repo.

6. **Dry-run as default safety**: The CLI defaults to dry-run, which is side-effect-free (no ledger writes, no provider calls). Side effects require explicit flags (`--apply --allow-live-provider-call`). This reduces accidental production impact.

## Learning candidates

| Type | Audience | Recommendation | Evidence | Decision |
| --- | --- | --- | --- | --- |
| pattern_doc | developer | propose | 6-gate pipeline pattern (manifest → freshness → budget → approval → circuit_breaker → apply_live_call → executor) validated across 6 gates. Only path through all gates calls provider. | **Propose** — reusable architectural pattern for Growth OS provider integrations |
| profile_fact | developer | propose | Provider runner is a Node CLI/runner, NOT a Cloudflare Worker — confirmed by plan, code review, QA, and ops gates. Long-running provider jobs don't belong in edge request lifecycle. | **Propose** — durable infrastructure fact |
| profile_fact | developer | propose | Static typed manifest subset (not `.mjs` dynamic import) avoids Jest ESM friction for beta. Registry hardening deferred to later task. | **Propose** — explains intentional design limitation |
| profile_fact | developer | propose | CLI dry-run is default and safe by design. Side effects require both --apply AND --allow-live-provider-call flags. | **Propose** — prevents accidental production impact |
| profile_fact | developer | propose | `--website-id` and `--account-id` are mandatory UUIDs via Zod for all provider runner CLI commands — no hidden multi-tenant defaults. | **Propose** — multi-tenant pattern for all future CLI tools |
| profile_fact | developer | propose | Circuit breaker opens after 3+ failures in 24h window with 6h cooldown. No UI for manual reset in #538. | **Propose** — operational behavior to know |
| profile_fact | all | propose | The gh CLI availability varies by profile/environment. Some workers can `gh pr create`, others must produce manual PR instructions. | **Propose** — operational environment variance |
| github_issue | developer | propose | TypeScript type `ProviderRunLedgerRow` in `lib/growth/provider-runner/types.ts` lacks `locale`, `market`, `entity_key`, `action_key` columns present in DB `growth_profile_runs` migration. Non-blocking for beta, but should be aligned for production. | **Propose** — tech-debt follow-up for #539/#540 |
| github_issue | developer | propose | Circuit breaker lacks UI for manual reset. Documented in plan but not implemented in #538. Needs issue for UX/productization. | **Propose** — follow-up for #539/#540 |
| github_issue | developer | propose | `cost_requires_owner_issue` field in manifest type is unused in current gate logic. Should be wired or removed. | **Propose** — dead code cleanup |
| github_issue | developer | propose | Registry hardening: migrate from static typed manifest subset (`manifest.ts`) to dynamic `.mjs` registry import. Requires resolving Jest/ts-jest ESM friction. | **Propose** — infrastructure follow-up |
| profile_fact | developer | propose | 7/7 Jest tests pass; npm run typecheck pass; lint clean (warnings only in unrelated files). No pre-existing test failures reported. | **Propose** — baseline state |
| rejected_noise | all | reject | Kanban event timestamps, claim locks, worker PID details | Reject — operational noise |
| rejected_noise | all | reject | Specific CLI dry-run output JSON | Reject — one-off test output |
| rejected_noise | all | reject | Repository cloning details and worktree setup | Reject — CI infrastructure detail |

## Applied learning

- `docs/ai/learning-runs/2026-05-14-provider-runner-beta-538.md` — this document
- Gate-first pipeline pattern proposed for `docs/ai/patterns/gate-first-provider-runner-architecture.md`
- Provider runner as single execution boundary pattern proposed

## Rejected learning

- Raw kanban event timestamps and lock data — operational noise
- Specific worker PID and claim lock details — session-specific
- CLI dry-run JSON output — one-off test artifact
- Repository worktree path — deployment infrastructure, not knowledge
- Secrets: no credentials, tokens, or raw env values present in any gate evidence (confirmed by secret scan)

## Redaction checklist

- [x] No secrets, credentials, tokens, cookie values, or raw env values.
- [x] No raw PII.
- [x] No full raw logs.
- [x] Evidence is summarized and linked by task ID, commit, and doc path.
- [x] Candidates whose value depends on secret values are rejected.
- [x] No private IP addresses, hostnames, or internal URLs.
- [x] No worker-specific environment details (PID, claim locks, timestamps).
