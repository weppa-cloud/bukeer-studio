# Growth OS Provider Runner Beta (#538) Implementation Plan

> For Hermes: Use subagent-driven-development skill to implement this plan task-by-task after tech-validator PLAN review. Do not implement code from this spec task.

Goal: Add the beta provider runner that wraps existing Growth OS provider profile scripts with freshness, budget, approval and circuit-breaker gates before any provider API call, then writes auditable run ledger rows to `growth_profile_runs`.

Architecture: The beta runner is an internal Node CLI/runner in this repository, not a Cloudflare request-lifecycle job. Neo/Hermes and later GitHub Actions may supervise or trigger approved runs, but the runner owns gate evaluation, provider-script invocation, context-packet refresh signals and Supabase operational ledger writes. The first beta profile is the free/read-only GSC daily minimum path; GA4 is the second free/read-only expansion path; DataForSEO and paid-media profiles remain cost/approval gated and read-only unless a later issue explicitly authorizes more.

Tech Stack: Next.js 15 repository, Node 22+, TypeScript strict, Zod v4, Jest, Supabase service-role operational writes, existing SEO scripts under `scripts/seo/`, existing contract package `@bukeer/website-contract`.

Tracking:
- GitHub issue: #538 Provider Runner Beta — Freshness/Budget/Approval Gates + Run Ledger.
- Parent epic: #521 Hermes Primary Runtime MVE v0 / Provider Profile Architecture v2.
- Source spec: `docs/specs/SPEC_GROWTH_OS_PROVIDER_PROFILE_ARCHITECTURE_V2.md`.
- Registry audit: `docs/audits/AUDIT_GROWTH_OS_PROVIDER_PROFILE_REGISTRY_MAP_2026-05.md`.
- Context packet contract: #537, `packages/website-contract/src/schemas/growth-provider-context-packet.ts` and `lib/growth/context-packets/builder.ts`.

Related ADRs:
- ADR-003: contract-first Zod validation. Runner config, manifest rows and gate decisions must parse through shared schemas or local Zod schemas before execution.
- ADR-005: defense-in-depth and secrets handling. Service-role access stays server/runner-only; no secrets in logs, fixtures, commits or ledger payloads.
- ADR-008: monorepo package boundaries. Shared provider/runner types should live in app code or website-contract only when they are public contracts.
- ADR-009: multi-tenant isolation. Every run requires explicit `--website-id` and `--account-id`; ColombiaTours defaults may be local CLI convenience only, not architecture dependency.
- ADR-016: SEO intelligence caching. Freshness decisions must consider cache TTLs and avoid duplicate provider reads when cached/ledger evidence is fresh.
- ADR-018: idempotency and replay protection. Runner writes must use stable `idempotency_key` values and replay-safe status transitions.
- ADR-029: funnel events as source of truth. GA4/paid analytics facts are diagnostics; conversion truth comes from `funnel_events` where applicable.

Non-negotiable constraints:
- GitHub remains planning SSOT; Supabase remains operational SSOT.
- Neo/Hermes orchestrates only; it does not become the provider worker.
- Provider profiles are the only authorized way to call provider APIs.
- Workers consume context packets and normalized facts, not provider APIs.
- First beta path is free/read-only GSC, not DataForSEO.
- Paid media remains read-only/recommendations-only. No campaign, budget, creative, status, keyword, conversion-upload or other mutation path is allowed in this beta.
- No production run or live provider call may happen without explicit runner flags and valid gates.
- No secrets or raw PII in commits, logs, fixtures, ledger payloads or error strings.

## Current surfaces to reuse

- `scripts/seo/growth-provider-profile-registry.mjs`: existing registry with 45 SEO/analytics/joint profiles and default ColombiaTours constants.
- `scripts/seo/populate-growth-google-cache.ts`: existing GSC/GA4 cache population surface. The runner must wrap it; do not let worker code call it directly.
- `scripts/seo/normalize-growth-gsc-cache.mjs`: GSC fact normalization after cache refresh.
- `scripts/seo/normalize-growth-ga4-cache.mjs`: GA4 fact normalization after cache refresh.
- `scripts/seo/run-growth-joint-normalizers.mjs`: later joint bridge after source profiles pass.
- `supabase/migrations/20260510103000_growth_provider_intelligence_runs.sql`: existing `growth_profile_runs` ledger with `account_id`, `website_id`, `provider`, `profile_id`, `run_status`, `freshness_status`, `quality_status`, `source_refs`, `cost_usd`, `evidence_fingerprint`, `approval`, `circuit_breaker`, `payload`, `idempotency_key`, `started_at`, `completed_at`, `error`.
- #537 context packet builder: runner should refresh ledger/cache evidence so packet builder can consume fresh operational state; runner should not assemble worker truth itself.

## Runner host decision

Decision: implement the beta as an internal Node CLI/runner in this repo, for example `scripts/growth/provider-runner.ts` with supporting app-side modules under `lib/growth/provider-runner/`.

Allowed supervisors:
- Local dry-run invocation by developers and validators.
- Neo/Hermes task orchestration that calls the CLI with explicit flags and records GitHub issue traceability.
- Future GitHub Actions scheduled/manual workflow that calls the same CLI after secrets and approval policies are configured.

Rejected for beta:
- Cloudflare Worker request lifecycle. Long-running provider jobs, external API latency, retries and service-role writes do not belong in user-facing route handlers or edge request paths.
- Worker direct provider calls. Workers must request context packets or profile refresh through the runner gate, not import provider clients.
- New Supabase Edge Function rewrite. Reuse existing Node/TS scripts first unless a later audit proves a cheaper production host.

Host implications:
- The CLI is the single execution boundary for provider reads.
- `--dry-run` is default and must never call provider APIs.
- `--apply` is required before the runner may invoke a provider script.
- `--allow-live-provider-call` is required in addition to `--apply` for any live provider read, including free GSC/GA4 reads.
- Costed profiles still require approval metadata even with `--apply --allow-live-provider-call`.
- All gate decisions write or preview ledger rows before provider invocation.

## Profile manifest / registry interface

The beta runner needs a normalized manifest interface derived from the existing registry. Do not hand-code profile logic per provider.

Minimum manifest fields:

```ts
type GrowthProviderRunnerProfileManifest = {
  profile_id: string
  provider: 'gsc' | 'ga4' | 'dataforseo' | 'clarity' | 'google_ads' | 'meta_ads' | 'tiktok_ads' | 'linkedin_ads' | 'tracking' | 'joint'
  domain: 'seo' | 'analytics' | 'paid_media' | 'ux' | 'tracking' | 'joint'
  family: string
  priority: 'P0' | 'P1' | 'P2' | 'P3'
  cadence: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'on_approval' | 'continuous' | 'no_default'
  freshness_ttl_hours: number | null
  cost_policy: {
    cost_class: 'free' | 'paid_normal' | 'paid_heavy'
    estimated_cost_usd?: number
    cost_requires_owner_issue: boolean
  }
  approval_policy: {
    mode: 'automatic_read_only' | 'required_to_start' | 'required_every_run' | 'profile_approved_scope_required' | 'blocked'
    owner_issues: string[]
    approval_metadata_required: boolean
  }
  runner_policy: {
    mutation_allowed: false
    read_only: true
    dry_run_supported: true
    live_call_flag_required: true
    blocked_direct_consumers: string[]
  }
  required_identifiers: Array<'website_id' | 'account_id' | 'site_url' | 'ga4_property_id' | 'provider_account_id' | 'customer_id'>
  cache_target: 'growth_gsc_cache' | 'growth_ga4_cache' | 'growth_dataforseo_cache' | 'growth_profile_runs' | null
  extraction_scripts: string[]
  normalizer_scripts: string[]
  fact_outputs: string[]
  pii_policy: 'aggregate_only' | 'redacted_rows_only' | 'blocked_raw_pii'
}
```

Mapping from current registry:
- `id` -> `profile_id`.
- `provider`, `family`, `priority`, `cadence`, `costClass`, `approval`, `rawCache`, `factTargets`, `ownerIssues`, `extractionScripts`, `normalizerScripts` map directly.
- `freshness_ttl_hours` derives from cadence: daily = 24, weekly = 168, biweekly = 336, monthly = 720, quarterly = 2160, continuous/on_approval/no_default = null unless profile overrides.
- `cost_policy.cost_class` maps from `costClass`.
- `approval_policy.mode` maps from `approval`; free GSC/GA4 with `automatic` maps to `automatic_read_only`.
- `runner_policy.mutation_allowed` must be `false` for every beta profile. If a profile cannot be represented as read-only, runner blocks it.

Registry implementation options:
- Preferred: create a typed module `lib/growth/provider-runner/profile-manifest.ts` that imports or mirrors the existing registry output into the normalized manifest and validates with Zod.
- Acceptable beta bridge: invoke/import `scripts/seo/growth-provider-profile-registry.mjs` in a thin adapter, but tests must use static fixtures to avoid runtime provider access.
- Do not expand paid media mutation scripts into runnable profiles in #538. Paid media read-only manifests may be specified for future use but default to `blocked` or `cost_gated` until cache/approval scope exists.

## CLI contract

Proposed command shape:

```bash
tsx scripts/growth/provider-runner.ts \
  --profile-id gsc_daily_complete_web_v1 \
  --website-id <uuid> \
  --account-id <uuid> \
  --window-start 2026-05-13 \
  --window-end 2026-05-14 \
  --dry-run
```

Live read-only GSC beta shape:

```bash
tsx scripts/growth/provider-runner.ts \
  --profile-id gsc_daily_complete_web_v1 \
  --website-id <uuid> \
  --account-id <uuid> \
  --window-start 2026-05-13 \
  --window-end 2026-05-14 \
  --apply \
  --allow-live-provider-call \
  --owner-issue '#538'
```

Required CLI flags:
- `--profile-id`: must exist in manifest.
- `--website-id`: UUID, always explicit.
- `--account-id`: UUID, always explicit.
- `--window-start` and `--window-end`: ISO date/datetime; used in freshness and idempotency.
- `--dry-run` or `--apply`: mutually exclusive; default is dry-run if omitted.
- `--allow-live-provider-call`: required for any provider script invocation.
- `--owner-issue`: required for costed/risky profiles; recommended for all beta runs.

Approval metadata flags for gated profiles:
- `--approval-id` or `--approval-issue`.
- `--approved-by`.
- `--approved-at`.
- `--estimated-cost-usd`.
- `--approval-scope-json` or equivalent structured metadata.

Output contract:
- JSON summary to stdout for automation.
- Redacted logs only.
- Exit 0 for `completed`, `blocked`, `cost_gated` and freshness skip if the runner behaved correctly.
- Non-zero only for developer/runtime failures that prevented a valid ledger decision.

## Gate order and behavior

All gates run before provider script invocation. Dry-run executes every gate and prints the intended ledger transition without provider calls.

### 1. Input / manifest gate

Purpose: validate requested profile and scope before touching provider code.

Rules:
- Parse CLI args with Zod per ADR-003.
- Require explicit `website_id` and `account_id` per ADR-009.
- Resolve the profile manifest by `profile_id`.
- Reject unknown, excluded, mutation-capable or beta-blocked profiles.
- Reject profiles whose required identifiers are missing.
- For beta, require `runner_policy.read_only === true` and `mutation_allowed === false`.

Ledger outcome:
- invalid/missing scope before DB access: no ledger write if tenant scope cannot be trusted; return non-zero developer error.
- known blocked profile with valid scope: write/preview `run_status='blocked'`, `freshness_status='blocked'`, `quality_status='blocked'` with reason in `payload.no_go_reasons`.

### 2. Freshness gate

Purpose: skip provider calls when latest run/cache evidence is fresh.

Checks:
- Latest `growth_profile_runs` row for `(account_id, website_id, provider, profile_id)` and window/entity when applicable.
- Latest cache row(s) in `cache_target` when available, for example `growth_gsc_cache` for GSC profiles.
- Manifest `freshness_ttl_hours` derived from cadence.
- Successful prior runs: `run_status='completed'` and `freshness_status='fresh'` or `completed_at + ttl > now`.
- Cache freshness: latest cache row timestamp/window covers requested window and is within TTL.

Behavior:
- If ledger/cache is fresh: do not call provider. Write/preview a `completed` or `blocked`? Decision: write a `completed` ledger row with `freshness_status='fresh'`, `quality_status='pass'`, `payload.skip_reason='freshness_gate'`, `source_refs` pointing to the fresh run/cache, `row_count=0` in payload, `cost_usd=0`, and the same deterministic evidence fingerprint where available. This records that the runner evaluated and skipped safely.
- If stale/missing: continue to budget gate.
- If cache is fresh but prior run ledger missing: skip provider, write a fresh skip ledger row referencing cache rows so context packets can see the evaluation.

No-provider-call freshness test is mandatory: fixture fresh ledger/cache must assert provider script invocation count is zero.

### 3. Budget gate

Purpose: prevent unapproved cost or broad-scope runs.

Rules:
- `cost_class='free'` GSC/GA4 read-only profiles have `cost_usd=0` and can continue without explicit cost approval, though `--owner-issue` is still encouraged.
- `paid_normal` and `paid_heavy` profiles require:
  - owner issue, for example `#538` or a later scoped child issue.
  - `estimated_cost_usd > 0` unless manifest declares a hard zero-cost read-only path.
  - explicit approval metadata.
  - approved scope matching requested `website_id`, `account_id`, profile id and window.
- Missing or invalid cost metadata writes/returns `run_status='cost_gated'`, `freshness_status='cost_gated'`, `quality_status='watch'` or `blocked` depending on profile risk.

Beta defaults:
- GSC/GA4: free/read-only auto-run if freshness and circuit gates pass and live-call flags are present.
- DataForSEO: cost-gated by default.
- Google Ads/Meta/TikTok/LinkedIn: read-only/recommendations-only and approval-gated until a later paid media cache/registry issue certifies them. Mutation scripts are blocked regardless of approval.

### 4. Approval gate

Purpose: enforce human governance for risky profiles.

Rules:
- GSC/GA4 free read-only profiles with `approval='automatic'` can run automatically when CLI live-call flags are present.
- Any profile with `approval` containing `required`, `on_approval`, paid provider, DataForSEO, session-level evidence or unclear PII risk requires valid approval metadata.
- Approval metadata must include owner issue, approver identity, approval timestamp, profile id, tenant ids, requested window and estimated cost when costed.
- Approval older than the manifest-defined window or mismatched to scope is invalid.

Ledger outcome:
- Missing approval for risky/costed profile: `run_status='blocked'` or `cost_gated`, `freshness_status='approval_required'`, `quality_status='blocked'`, `approval` object with redacted/no-secret metadata and no provider call.

### 5. Circuit breaker gate

Purpose: avoid repeated failing provider calls and protect quotas.

Rules:
- Query recent `growth_profile_runs` for same `(account_id, website_id, provider, profile_id)`.
- If at least 3 failures/blocking provider errors in a rolling 24h window, block for 6h by default.
- If provider returns quota/rate-limit indicators, write `run_status='quota_exhausted'` or `blocked_provider_error` when existing status is appropriate, and set `circuit_breaker.cooldown_until`.
- Manual reset requires a future explicit approval/reset mechanism; for #538, document and store reset-needed state but do not add an admin UI.

Ledger outcome:
- Circuit open: `run_status='blocked'`, `freshness_status='blocked'`, `quality_status='blocked'`, `circuit_breaker={state:'open', failure_count, cooldown_until, reason}` and no provider call.

### 6. Apply/live-call gate

Purpose: make side effects impossible by default.

Rules:
- `--dry-run`: never invokes provider scripts and never writes persistent ledger rows unless an explicit future `--dry-run-write-ledger` flag is designed. For #538, dry-run should not write.
- `--apply` without `--allow-live-provider-call`: may write queued/blocked/freshness-skip ledger decisions that do not require provider calls, but must not invoke provider scripts.
- `--apply --allow-live-provider-call`: may invoke free/read-only provider scripts only after all gates pass.
- Costed/risky profiles still require budget/approval even with live flags.

## Run ledger contract

Reuse `growth_profile_runs`; do not add a migration for #538 unless implementation proves a real missing column. `row_count` and `window` should live in `payload` because the current migration does not expose top-level columns for them.

Required statuses:
- `queued`: pre-provider invocation row written after gates pass and before invoking provider script.
- `running`: optional immediate transition when script starts; acceptable if queued->running happens in one update.
- `completed`: provider script/normalizer succeeded, or freshness gate safely skipped a provider call.
- `failed`: unexpected runner/provider failure after a run started.
- `blocked`: manifest/approval/circuit/read-only policy blocked the profile.
- `cost_gated`: estimated cost or required cost approval missing/invalid.

Existing additional statuses that may be used when precise:
- `quota_exhausted`.
- `blocked_provider_error`.

Required fields and mapping:
- `account_id`: explicit CLI tenant scope.
- `website_id`: explicit CLI tenant scope.
- `provider`: manifest provider. Note: current DB constraint allows `dataforseo|gsc|ga4|clarity`; paid providers need a later migration before ledger writes can use them directly.
- `profile_id`: manifest profile id.
- `run_status`: status from list above.
- `freshness_status`: `fresh|stale|missing|blocked|approval_required|cost_gated|quota_exhausted`.
- `quality_status`: `pass|watch|blocked`.
- `source_refs`: array of provider/cache/script refs, never secret-bearing. Example refs: previous run id, cache table + row/window, script name, normalizer name, GitHub issue.
- `cost_usd`: 0 for GSC/GA4 beta; estimated/actual for future costed profiles.
- `evidence_fingerprint`: stable hash over normalized profile id, tenant ids, window, source refs and aggregate evidence summary; exclude volatile run id/timestamps.
- `approval`: JSON object with owner issue, approver, timestamp, scope and estimated cost; no tokens or private comments.
- `circuit_breaker`: JSON object with state, recent failures, cooldown and reset-needed fields.
- `payload.idempotency_key` optional mirror plus top-level `idempotency_key` required by schema.
- `payload.window`: `{start, end, timezone?}`.
- `payload.row_count`: count of cache/fact rows touched or read; 0 for freshness skip.
- `payload.gate_decisions`: ordered gate outcomes.
- `payload.skip_reason`: `freshness_gate` when provider call skipped.
- `payload.no_go_reasons`: list for blocked/cost_gated decisions.
- `started_at` and `completed_at`: set for applied runs; freshness skip may set both to the evaluation time.
- `error`: redacted error string only.

Idempotency key format:

```text
growth-provider-runner:v1:<account_id>:<website_id>:<profile_id>:<window_start>:<window_end>:<mode>:<evidence_scope_hash>
```

Replay behavior:
- If a row with the idempotency key exists and is completed/fresh, return the existing decision and do not call provider.
- If a row exists and is running, block/coalesce with `run_status='blocked'` preview or return a coalesced response without provider call.
- If a row exists and failed, circuit breaker decides whether retry is allowed.

Status transition examples:
- Fresh cache: evaluate -> completed/fresh/pass with `skip_reason='freshness_gate'`, no provider call.
- GSC live success: queued -> running -> completed/fresh/pass with source refs and row count.
- DataForSEO without approval: cost_gated/cost_gated/watch, no provider call.
- Repeated GSC failures: blocked/blocked/blocked with circuit breaker, no provider call.

## First beta profile

Choose `gsc_daily_complete_web_v1` as the first beta profile.

Why:
- Provider: GSC.
- Priority: P0.
- Cadence: daily.
- Cost class: free.
- Approval: automatic in existing registry.
- Cache target: `growth_gsc_cache`.
- Existing extractor: `scripts/seo/populate-growth-google-cache.ts`.
- Existing normalizer: `scripts/seo/normalize-growth-gsc-cache.mjs`.
- It exercises freshness, idempotency, ledger and context-packet handoff without paid-provider cost risk.

Minimum beta path:
1. Validate CLI args and manifest for `gsc_daily_complete_web_v1`.
2. Check freshness in `growth_profile_runs` and `growth_gsc_cache`.
3. If fresh, write/return freshness skip with no provider call.
4. If stale/missing and `--dry-run`, return planned queued/running/completed transitions without provider call.
5. If stale/missing and `--apply --allow-live-provider-call`, invoke the existing GSC cache population path in read-only mode for the requested tenant/window.
6. Run or enqueue the GSC normalizer only after extraction success.
7. Write `growth_profile_runs` completed row with source refs, row count, cost 0, evidence fingerprint and window payload.
8. Confirm #537 context packet builder can see the fresh profile run/cache rows.

GA4 second path:
- `ga4_daily_landing_channel_v1` can follow once GSC path passes.
- Same runner and gates; cache target becomes `growth_ga4_cache`; normalizer becomes `scripts/seo/normalize-growth-ga4-cache.mjs`.
- GA4 remains diagnostic; conversion truth still comes from `funnel_events` per ADR-029.

## Paid media and DataForSEO policy

DataForSEO:
- No first beta run.
- Existing profiles stay in manifest but are cost/approval gated.
- Any DataForSEO profile without valid owner issue, estimated cost and approval metadata returns `cost_gated` without calling the provider.

Paid media:
- Beta posture is read-only/recommendations-only.
- No Google Ads `apply-*`, campaign activation, negative keyword, budget, creative, conversion upload or status mutation script may be reachable from the provider runner.
- Existing Google Ads read-only diagnostic scripts may be represented only as future gated profiles after registry/cache/ledger support is explicit.
- Meta/TikTok/LinkedIn remain design-only/blocked until extractors, cache tables, provider account mapping and approvals exist.
- Current `growth_profile_runs.provider` constraint does not include paid providers. Do not force a migration in #538 unless implementation chooses to add certified paid read-only ledger support; otherwise keep paid media as blocked/manifest design in docs only.

## Worker and context packet contract

- Workers never import provider clients or call `scripts/seo/populate-growth-google-cache.ts` directly.
- Workers receive context packets from #537 builder.
- If packet freshness is stale/missing, a worker may request a profile refresh through a GitHub/Hermes task routed to the provider runner, not execute the provider itself.
- Packet `blocked_actions` must continue to include `call_provider_api_directly`.
- Runner source refs and evidence fingerprints must be stable enough for context packets and anti-rework decisions.

## Files expected for implementation

Likely create:
- `scripts/growth/provider-runner.ts`: CLI entrypoint.
- `lib/growth/provider-runner/types.ts`: internal TypeScript types.
- `lib/growth/provider-runner/manifest.ts`: normalized profile manifest adapter and Zod validation.
- `lib/growth/provider-runner/gates.ts`: freshness/budget/approval/circuit/apply gates.
- `lib/growth/provider-runner/ledger.ts`: `growth_profile_runs` write/update helpers.
- `lib/growth/provider-runner/idempotency.ts`: stable key and evidence fingerprint helpers.
- `lib/growth/provider-runner/executors.ts`: provider script wrapper dispatch, initially GSC only.
- `__tests__/growth/provider-runner/gates.test.ts`.
- `__tests__/growth/provider-runner/ledger.test.ts`.
- `__tests__/growth/provider-runner/provider-runner.test.ts`.

Likely modify:
- `package.json`: add a script such as `growth:provider-runner` if useful.
- `scripts/seo/populate-growth-google-cache.ts`: only if a safe, explicit read-only tenant/window invocation surface is missing; do not change behavior broadly.
- `docs/INDEX.md`: only if the repo maintainers want plans indexed; this plan itself does not require code behavior.

Avoid in #538 implementation unless proven necessary:
- New DB migration.
- Cloudflare route handler.
- Paid media cache schema.
- Worker task code changes beyond documenting consumption.
- Any production scheduler.

## Test strategy

Unit tests use mocks/fixtures only; no live Supabase credentials and no provider credentials.

Required cases:
1. Manifest validation accepts `gsc_daily_complete_web_v1` and derives daily TTL/cost-free/automatic read-only policy.
2. Manifest validation rejects mutation-capable or unknown profile ids.
3. Freshness gate with fresh `growth_profile_runs` returns completed/fresh skip and invokes no provider executor.
4. Freshness gate with fresh `growth_gsc_cache` but no ledger returns completed/fresh skip and invokes no provider executor.
5. Stale/missing freshness in dry-run returns planned execution and invokes no provider executor.
6. Costed DataForSEO profile without approval returns `cost_gated` and invokes no provider executor.
7. Costed profile with mismatched approval scope returns blocked/cost_gated and invokes no provider executor.
8. Free GSC profile with missing `--allow-live-provider-call` does not invoke provider executor.
9. Free GSC profile with `--apply --allow-live-provider-call` invokes the GSC executor only after all prior gates pass.
10. Circuit breaker opens after repeated recent failures and blocks provider invocation.
11. Ledger helper writes queued/running/completed transitions with required fields and stable idempotency key.
12. Tenant isolation: all mock ledger/cache queries include both `account_id` and `website_id` filters.
13. Redaction: errors containing token-like strings are sanitized before ledger/log output.
14. Paid media mutation profile fixture is blocked even if approval metadata is present.

## Validation commands expected for implementation

Run from repo root unless noted:

```bash
npm run ai:check
npm run typecheck
npm test -- __tests__/growth/provider-runner/gates.test.ts --runInBand
npm test -- __tests__/growth/provider-runner/ledger.test.ts --runInBand
npm test -- __tests__/growth/provider-runner/provider-runner.test.ts --runInBand
npm run growth:provider-runner -- --profile-id gsc_daily_complete_web_v1 --website-id <uuid> --account-id <uuid> --window-start 2026-05-13 --window-end 2026-05-14 --dry-run
npm run growth:provider-runner -- --profile-id gsc_daily_complete_web_v1 --website-id <uuid> --account-id <uuid> --window-start 2026-05-13 --window-end 2026-05-14 --dry-run --fixture-fresh-cache
npm run tech-validator:code:quick
git diff --check
```

No-provider-call freshness test requirement:
- The `--fixture-fresh-cache` or equivalent unit test must prove the GSC executor/provider script invocation count is zero when the latest ledger/cache row is fresh.
- This is a blocking acceptance criterion for #538.

Do not run in implementation validation unless explicitly approved:
- Live GSC provider call.
- Live GA4 provider call.
- DataForSEO call.
- Google Ads/Meta/TikTok/LinkedIn call.
- Production scheduler or production GitHub Action.

## Acceptance criteria mapped exactly to issue #538

1. Runner host decision is defined.
   - PASS when this plan and implementation choose an internal Node CLI/runner in this repo, supervised later by Neo/GitHub Actions, and explicitly reject Cloudflare request lifecycle for long-running provider jobs.

2. Profile manifest/registry interface needed by the runner is defined.
   - PASS when implementation exposes a normalized, validated manifest with profile id, provider, cadence, TTL, cost policy, approval policy, required identifiers, cache target, scripts, fact outputs, PII policy and beta read-only/mutation-blocking policy.

3. Freshness gate is defined and enforceable.
   - PASS when the runner checks latest `growth_profile_runs` and relevant cache before provider calls, skips when fresh, writes/returns a freshness-skip ledger decision, and tests prove no provider call happens when fresh.

4. Budget gate is defined and enforceable.
   - PASS when costed profiles require owner issue, estimated cost and explicit approval metadata before any provider call; missing metadata returns `cost_gated` with no provider call.

5. Approval gate is defined and enforceable.
   - PASS when GSC/GA4 free read-only profiles can auto-run only with live-call flags, while cost/risky profiles block without valid scope-matched approval.

6. Circuit breaker is defined and enforceable.
   - PASS when recent repeated failures open a cooldown state in `circuit_breaker`, block the profile until cooldown/manual reset, and invoke no provider script while open.

7. Run ledger writes to `growth_profile_runs` are defined.
   - PASS when implementation writes or previews queued/running/completed/failed/blocked/cost_gated decisions with `source_refs`, `cost_usd`, `evidence_fingerprint`, `idempotency_key`, payload `window`, payload `row_count`, `approval` and `circuit_breaker`; no unnecessary migration is added unless a real schema gap is proven.

8. First beta profile is selected.
   - PASS when implementation starts with `gsc_daily_complete_web_v1` or an equivalent GSC read-only daily/minimum profile using `growth_gsc_cache`; GA4 is documented as the second path.

9. Multi-tenant scope is explicit.
   - PASS when all CLI inputs and Supabase reads/writes require `--website-id` and `--account-id`; ColombiaTours defaults, if present, are local convenience only and not hidden architecture.

10. Workers do not direct-call providers.
    - PASS when the runner remains the only provider execution boundary and worker-facing output is via #537 context packets / normalized facts.

11. Paid media remains read-only/recommendations-only.
    - PASS when mutation scripts are unreachable from the beta runner and paid providers are blocked or approval-gated read-only design entries only.

12. No secrets or production side effects.
    - PASS when tests and dry-runs use fixtures/mocks, redaction is enforced, no credentials are committed/logged, and no live provider/API/production run occurs without explicit approval and flags.

13. Validation commands are provided.
    - PASS when implementation PR runs typecheck, focused Jest tests, dry-run command, no-provider-call freshness test, tech-validator and `git diff --check`.

## Suggested implementation sequence

### Task 1: Add normalized manifest adapter

Objective: Convert existing registry entries into a runner-safe manifest.

Files:
- Create `lib/growth/provider-runner/types.ts`.
- Create `lib/growth/provider-runner/manifest.ts`.
- Test `__tests__/growth/provider-runner/manifest.test.ts` or include in `gates.test.ts`.

Steps:
1. Write tests for GSC manifest derivation and mutation/unknown rejection.
2. Add Zod schemas for manifest and CLI-safe profile policy.
3. Map existing registry fields to manifest fields.
4. Ensure beta manifests default to `mutation_allowed:false`.
5. Run targeted manifest/gates test.

### Task 2: Add idempotency and ledger helpers

Objective: Centralize replay-safe run keys and `growth_profile_runs` writes.

Files:
- Create `lib/growth/provider-runner/idempotency.ts`.
- Create `lib/growth/provider-runner/ledger.ts`.
- Create `__tests__/growth/provider-runner/ledger.test.ts`.

Steps:
1. Test deterministic idempotency key for same tenant/profile/window.
2. Test evidence fingerprint excludes volatile timestamps/run ids.
3. Implement redacted insert/update payload builder.
4. Test required fields and payload window/row_count placement.

### Task 3: Add gate engine

Objective: Evaluate freshness, budget, approval, circuit breaker and apply/live-call gates before provider execution.

Files:
- Create `lib/growth/provider-runner/gates.ts`.
- Create `__tests__/growth/provider-runner/gates.test.ts`.

Steps:
1. Write fresh ledger/cache skip tests with executor spy count zero.
2. Write dry-run no-provider-call test.
3. Write DataForSEO cost-gated test.
4. Write approval mismatch blocked test.
5. Write circuit-open blocked test.
6. Implement gate engine as pure functions over manifest + mocked repository interfaces.

### Task 4: Add GSC beta executor wrapper

Objective: Provide the first live-call-capable path without broad provider rewrites.

Files:
- Create `lib/growth/provider-runner/executors.ts`.
- Modify `scripts/seo/populate-growth-google-cache.ts` only if required to expose a scoped function/CLI mode.
- Test through `__tests__/growth/provider-runner/provider-runner.test.ts`.

Steps:
1. Define executor interface returning source refs, row count and summary.
2. Add GSC executor dispatch for `gsc_daily_complete_web_v1` only.
3. Keep GA4 as planned/second-path unless implementation can share safely without expanding scope.
4. Ensure tests mock executor; no provider calls.

### Task 5: Add CLI entrypoint

Objective: Make runner executable and default-safe.

Files:
- Create `scripts/growth/provider-runner.ts`.
- Optional modify `package.json` with `growth:provider-runner` script.
- Test CLI parser in `provider-runner.test.ts`.

Steps:
1. Parse args with Zod.
2. Default to dry-run.
3. Build manifest and gate context.
4. In dry-run, print JSON decision and do not write/call providers.
5. In apply, write ledger transitions and invoke executor only when gates allow.
6. Redact logs/errors.

### Task 6: Final validation and handoff

Objective: Prove #538 is ready for code review.

Files:
- No extra files expected beyond tests/scripts.

Steps:
1. Run `npm run ai:check`.
2. Run `npm run typecheck`.
3. Run focused Jest tests.
4. Run dry-run CLI.
5. Run no-provider-call freshness test.
6. Run `npm run tech-validator:code:quick`.
7. Run `git diff --check`.
8. Review changed files for secrets/PII.
9. Commit and request tech-validator CODE review.

## Final implementation notes (2026-05-14)

Implemented in branch `growth-provider-runner-beta`:
- Added `lib/growth/provider-runner/` with typed manifests, Zod validation, idempotency/fingerprint helpers, in-memory/testable ledger store, executor interface, and a gate-first runner.
- Added `scripts/growth/provider-runner.ts` plus `npm run growth:provider-runner`; the CLI defaults to dry-run and prints profile, reason, gates, freshness, cost/approval, circuit breaker, ledger intent, and provider invocation state.
- First beta profile is `gsc_daily_complete_web_v1`; GA4 daily landing/channel is represented as second-path manifest data, and DataForSEO remains cost/approval gated.
- Dry-run and fixture-fresh-cache flows are side-effect-free. Apply mode writes queued/running/completed ledger rows only through the runner store interface and invokes the executor only after freshness, budget, approval, circuit, and live-call gates pass.
- Focused Jest coverage lives in `__tests__/growth/provider-runner/provider-runner.test.ts` and proves no provider executor call on dry-run, fresh ledger skip, fresh cache skip, missing cost approval, and open circuit breaker.

Validation run:
- `npm test -- __tests__/growth/provider-runner/provider-runner.test.ts --runInBand` — PASS (7 tests).
- `npm run typecheck` — PASS.
- `npm run growth:provider-runner -- --profile-id gsc_daily_complete_web_v1 --website-id 894545b7-73ca-4dae-b76a-da5b6a3f8441 --account-id 9fc24733-b127-4184-aa22-12f03b98927a --window-start 2026-05-13 --window-end 2026-05-14 --dry-run` — PASS; provider_invocation.called=false and ledger_intent.write=false.
- Same dry-run with `--fixture-fresh-cache` — PASS; freshness_gate skip and provider_invocation.called=false.
- `npm run tech-validator:code:quick` — PASS with two expected unchanged-scope warnings.
- `git diff --check` — PASS.

## Risks / WATCH items

- Current implementation uses a static beta manifest subset instead of dynamically importing the full `.mjs` registry, avoiding Jest/ts-jest ESM friction while preserving the selected GSC beta path and future GA4/DataForSEO policy shape. A later registry-hardening task can move the full registry into a TS module.
- Current `growth_profile_runs.provider` constraint only allows `dataforseo`, `gsc`, `ga4`, `clarity`. This is fine for GSC beta, but paid provider ledger support will need a future migration if/when read-only paid profiles become runnable.
- Existing `scripts/seo/populate-growth-google-cache.ts` may not yet expose a narrow per-profile API. If it is too broad, implementation should add a safe wrapper rather than rewrite provider logic.
- Freshness may need both ledger and cache evidence because historical cache rows can predate the runner. Prefer safe skip only when tenant/window/cache freshness is explicit.
- Approval metadata has no global product UI yet. For #538, CLI/GitHub issue metadata is enough; later work can productize approvals.
- Circuit breaker manual reset is documented but not implemented as UI in #538.
- Dry-run must remain side-effect-free. If developers want dry-run ledger rows later, that should be a separate explicit flag and issue.

## Definition of done for #538 implementation PR

- Plan passed tech-validator PLAN review before code.
- Internal Node provider runner exists and defaults to dry-run/no-provider-call.
- `gsc_daily_complete_web_v1` is the first supported beta profile.
- Freshness, budget, approval and circuit-breaker gates all run before provider execution.
- `growth_profile_runs` ledger writes are replay-safe, tenant-scoped and redacted.
- Focused unit tests cover fresh skip, cost gate, approval gate, circuit breaker, tenant isolation and redaction.
- Validation commands above pass.
- No live provider call, DataForSEO call, paid-media mutation, secret or production side effect occurs during tests/validation.
