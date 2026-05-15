# Growth OS Context Packet Contract (#537) Implementation Plan

> For Hermes: Use subagent-driven-development skill to implement this plan task-by-task after tech-validator PLAN review. Do not implement code from this spec task.

Goal: Add a contract-first, read-only Growth OS context packet schema and builder so workers consume scoped, fresh, deduped Supabase facts instead of calling provider APIs directly.

Architecture: Put the packet Zod contract in `@bukeer/website-contract` beside existing Growth OS schemas, then implement a read-only app-side builder under `lib/growth/context-packets/` using mockable Supabase interfaces. The builder reads existing operational SSOT rows only, evaluates freshness and anti-rework, returns WATCH/BLOCKED for missing/stale required evidence, and always blocks direct provider API calls.

Tech Stack: Next.js 15 / React 19 repo, TypeScript strict, Zod v4, Jest + ts-jest, Supabase query builder interfaces.

Related ADRs and source docs:
- ADR-003: contract-first Zod validation in `@bukeer/website-contract`.
- ADR-005: no secrets/PII in packet payloads; defense-in-depth around worker inputs.
- ADR-008: package exports from `packages/website-contract/src/index.ts` are the monorepo contract surface.
- ADR-009: tenant scoping by `website_id` and `account_id`.
- ADR-016: provider cache freshness/TTL must be explicit.
- ADR-018: anti-rework/dedupe must use stable fingerprints and idempotent/replay-safe semantics.
- ADR-029: `funnel_events` is conversion/CRM tracking SSOT, not GA4/Ads platform truth.
- Source spec: `docs/specs/SPEC_GROWTH_OS_PROVIDER_PROFILE_ARCHITECTURE_V2.md` lines 122-137 require context packet sections.
- Registry audit: `docs/audits/AUDIT_GROWTH_OS_PROVIDER_PROFILE_REGISTRY_MAP_2026-05.md` recommends `feat(contract): add GrowthProviderContextPacket schema` and `feat(growth): build read-only context packet builder over Supabase facts`.
- Beta plan: `docs/plans/PLAN_GROWTH_OS_PROVIDER_PROFILE_BETA_IMPLEMENTATION.md` Phase 2.

Important constraints:
- Work only in `/opt/data/home/worktrees/bukeer-studio-context-packet` on branch `growth-context-packet-contract`.
- Do not touch `/opt/data/home/repos/bukeer-studio`.
- Read-only builder only; do not call DataForSEO, GSC, GA4, Clarity, Ads, Meta, TikTok, LinkedIn, or any provider API.
- Do not log or commit secrets. Do not add fixtures containing raw PII.
- GitHub planning SSOT; Supabase operational SSOT.
- Missing/stale required provider profiles must yield WATCH/BLOCKED status, not silent empty arrays.
- Multi-tenant scope is required by `website_id` and `account_id` where relevant.

Existing surfaces inspected:
- `packages/website-contract/src/index.ts`: central export surface; Growth OS schemas already exported here.
- `packages/website-contract/src/schemas/growth-provider-intelligence.ts`: already defines `GrowthProviderSchema`, `GrowthProviderFreshnessStatusSchema`, `GrowthProviderQualityStatusSchema`, `ProviderEvidenceReadSchema`, `GrowthEvidenceCorrelationResultSchema`, and `GrowthEvidenceDedupeVerdictSchema`. Reuse these types rather than redefining them.
- `packages/website-contract/src/schemas/growth-agent-context-packs.ts`: prior context-pack contract pattern using `GrowthTenantScopeSchema`.
- `lib/growth/agentic/context-builder.ts`: existing broad agentic context snapshot builder. Do not replace it in #537; add a narrower provider context packet builder beside it.
- `lib/growth/providers/profile-registry.ts`: typed provider registry with profile TTLs and approval/cost metadata; useful for default required profile definitions.
- `lib/growth/providers/evidence-correlation.ts`: existing stable fingerprint + dedupe evaluator; reuse in builder tests for duplicate evidence cases.
- Supabase migrations already expose operational tables: `growth_profile_runs`, `growth_gsc_cache`, `growth_ga4_cache`, `growth_dataforseo_cache`, `growth_inventory`, `growth_work_items`, `growth_publication_jobs`, `growth_work_item_outcomes`, `funnel_events`.

Required packet sections from SPEC v2 and planned fields:
- `packet_version`: literal `growth-provider-context-packet-v1`.
- `website_id / account_id`: inherited from `GrowthTenantScopeSchema`, both required.
- `worker_lane / work_type`: `worker_lane` enum/string for lane; `work_type` string for task/action family.
- `entity`: object with `type`, `id`, `canonical_url`, `locale`, `market` plus optional `path`/`slug`/`metadata`.
- `freshness_map by profile_id`: record or array keyed by profile id, with status `fresh|stale|missing|blocked|approval_required|cost_gated|quota_exhausted`, fetched/expires timestamps, required flag, quality status, and no-go reasons.
- `source_profiles`: profile id, provider, run id, window, cache refs, fact ids, evidence fingerprint, source refs.
- `facts`: named buckets `search_demand`, `technical_issues`, `market_terms`, `conversion_signals`, `paid_signals`, `ux_friction`, each carrying summarized rows and source profile ids.
- `previous_actions`: prior work items, publication jobs, pending outcomes and measurement windows.
- `dedupe_verdict`: `proceed|skip|coalesce|reopen|request_refresh|blocked` with evidence fingerprint, reason, previous refs, no-go reasons.
- `allowed_actions`: explicit worker actions allowed by packet.
- `blocked_actions`: must include `call_provider_api_directly` whenever workers consume provider-derived context; also include paid mutation actions during beta.

Schema outline:
- Create `packages/website-contract/src/schemas/growth-provider-context-packet.ts`.
- Reuse imports from `growth-attribution` and `growth-provider-intelligence`.
- Add/Export:
  - `GrowthProviderContextPacketVersionSchema = z.literal('growth-provider-context-packet-v1')`
  - `GrowthProviderContextPacketStatusSchema = z.enum(['pass','watch','blocked'])`
  - `GrowthProviderWorkerLaneSchema = z.enum(['content','transcreation','technical','cro','campaign_optimizer','all']).or(z.string().min(1).max(80))`
  - `GrowthProviderContextEntitySchema`
  - `GrowthProviderFreshnessEntrySchema`
  - `GrowthProviderSourceProfileSchema`
  - `GrowthProviderContextFactBucketSchema`
  - `GrowthProviderContextFactsSchema`
  - `GrowthProviderPreviousActionSchema`
  - `GrowthProviderDedupeVerdictSchema = z.enum(['proceed','skip','coalesce','reopen','request_refresh','blocked'])`
  - `GrowthProviderContextDedupeSchema`
  - `GrowthProviderBlockedActionSchema`
  - `GrowthProviderContextPacketSchema = GrowthTenantScopeSchema.extend({...}).superRefine(...)`
  - `GrowthProviderContextPacketInputSchema` if useful for tests/builder input.
  - Types for every schema with `z.infer`.
- SuperRefine rules:
  - `blocked_actions` must include `call_provider_api_directly`.
  - If any required freshness entry is `missing|stale|blocked|approval_required|cost_gated|quota_exhausted`, top-level `status` cannot be `pass` and dedupe verdict should be `request_refresh` or `blocked`.
  - Every fact source profile id must exist in `source_profiles` or be empty with an explicit freshness WATCH/BLOCKED reason.
  - `generated_at` must be ISO datetime; source windows with both `window_start` and `window_end` must have end >= start.

Exports:
- Modify `packages/website-contract/src/index.ts` near the Growth OS provider-intelligence exports to export the new schemas and types.
- Do not alter unrelated package exports.

Builder strategy:
- Create `lib/growth/context-packets/types.ts` with builder options and a minimal mockable Supabase interface if the existing `SupabaseLike` from `lib/growth/autonomy/runtime-common.ts` is too broad.
- Create `lib/growth/context-packets/builder.ts` with `buildGrowthProviderContextPacket(options)`.
- Recommended options:
  - `supabase`
  - `accountId`
  - `websiteId`
  - `workerLane`
  - `workType`
  - `entity: { type, id?, canonicalUrl?, locale?, market?, path?, slug? }`
  - `requiredProfileIds?: string[]`
  - `allowedActions?: string[]`
  - `now?: Date`
- Read-only Supabase reads only:
  - `growth_profile_runs`: latest rows for profile freshness/source profiles; filter by account/website, profile ids, entity key where available; never insert/update.
  - `growth_gsc_cache`, `growth_ga4_cache`, `growth_dataforseo_cache`: summarized/cache refs for source facts when available.
  - `growth_inventory`: canonical URL/entity metadata and technical inventory facts.
  - `funnel_events`: conversion/CRM truth per ADR-029, scoped by account/website/entity where possible.
  - `growth_work_items`, `growth_publication_jobs`, `growth_work_item_outcomes`: previous actions and measurement windows.
- Use `GROWTH_PROVIDER_PROFILE_REGISTRY` TTL metadata to classify freshness when profile row expires_at is absent. Prefer explicit `freshness_status`/`expires_at` from `growth_profile_runs` when present.
- Use `computeGrowthEvidenceFingerprint` and/or `evaluateGrowthEvidenceCorrelation` from `lib/growth/providers/evidence-correlation.ts` for anti-rework instead of creating a new hash convention.
- Always return a parsed `GrowthProviderContextPacketSchema` object; validation failure should be a developer error in tests.
- Do not persist packets in #537 unless a later issue asks for `growth_context_snapshots` integration. This task is read-only builder + contract.
- Add a tiny `index.ts` under `lib/growth/context-packets/` only if internal imports benefit from it.

Fresh/stale/missing/duplicate behavior:
- Fresh: required profiles have latest successful rows with `freshness_status='fresh'` or `expires_at > now`; packet status `pass`, dedupe verdict `proceed`, facts populated from fixture rows, direct provider calls blocked.
- Stale: required profile has row but `expires_at <= now` or explicit `freshness_status='stale'`; packet status `watch`, dedupe verdict `request_refresh`, facts may include stale summaries with no-go reason `profile_stale:<profile_id>`.
- Missing: required profile has no row; packet status `blocked`, dedupe verdict `request_refresh` or `blocked`, facts bucket empty only with explicit `profile_missing:<profile_id>` no-go reason.
- Duplicate evidence: existing active/measuring/failed/won/lost work with same correlation/action/evidence fingerprint returns `coalesce`, `skip`, `reopen`, `blocked`, or `scale` mapping to context packet `dedupe_verdict` as appropriate. For #537 tests, cover at least active duplicate -> `coalesce` and measurement duplicate -> `skip`.

Files to add/change:
- Create: `packages/website-contract/src/schemas/growth-provider-context-packet.ts`
- Modify: `packages/website-contract/src/index.ts`
- Create: `lib/growth/context-packets/types.ts`
- Create: `lib/growth/context-packets/builder.ts`
- Optional Create: `lib/growth/context-packets/index.ts`
- Create: `__tests__/growth/context-packets/builder.test.ts`
- Optional Create: `packages/website-contract/src/__tests__/growth-provider-context-packet.test.ts` if package-local schema tests are preferred.
- Modify: `docs/INDEX.md` only if implementation adds a new spec/doc link beyond this plan. At minimum link this plan in the Plans section/resolution map if the repo pattern requires plan indexing.

Test strategy:
- Use Jest. Avoid E2E/dev-server tests; no Playwright needed.
- Add a lightweight in-memory Supabase mock with chainable `from().select().eq().in().order().limit()` methods, or reuse any existing mock if found during implementation.
- Fixture data should be synthetic UUIDs, URLs, markets and aggregate counts only; no secrets, tokens, raw emails or phone numbers.
- Unit tests:
  1. Contract accepts a complete fresh packet and requires blocked direct provider API action.
  2. Builder fresh case: GSC/GA4 profile rows fresh; packet status `pass`; includes search/conversion facts; blocked action includes `call_provider_api_directly`.
  3. Builder stale case: required GSC row expired; packet status `watch`; freshness map marks stale; dedupe verdict `request_refresh`; no silent empty context.
  4. Builder missing case: required profile absent; packet status `blocked`; no-go reason names missing profile; facts bucket empty only with reason.
  5. Duplicate evidence case: existing active work item with same evidence fingerprint yields `coalesce` and previous action refs.
  6. Tenant scoping case: rows for another `website_id`/`account_id` are ignored.

Acceptance criteria:
- Contract includes every required Context Packet section from SPEC v2 lines 122-137.
- Schema and builder are exported/usable without consumers importing private files.
- Builder performs no provider API calls and no Supabase writes.
- Builder queries include `website_id` and `account_id` filters for all operational tables that have those columns.
- Missing/stale required profiles produce WATCH/BLOCKED packet status and explicit no-go reasons.
- Duplicate evidence is not treated as proceed.
- `blocked_actions` always includes `call_provider_api_directly`.
- Tests cover fresh, stale, missing, duplicate evidence and tenant isolation.
- No secrets or raw PII are added to fixtures/logs/docs.

Validation commands:
- `cd /opt/data/home/worktrees/bukeer-studio-context-packet`
- `npm run ai:check`
- `npm run typecheck`
- `npm test -- __tests__/growth/context-packets/builder.test.ts --runInBand`
- If package-local tests are added: `npm test -- packages/website-contract/src/__tests__/growth-provider-context-packet.test.ts --runInBand`
- `cd packages/website-contract && npm run typecheck && npm run build`
- `npm run tech-validator:code:quick`
- `git diff --check`
- Secret/PII sanity check before commit: inspect changed fixtures/docs for tokens, API keys, emails, phone numbers.

Suggested implementation sequence:

### Task 1: Add context packet Zod schema
Objective: Create the contract in website-contract with validation rules.
Files:
- Create `packages/website-contract/src/schemas/growth-provider-context-packet.ts`
- Test optionally in `packages/website-contract/src/__tests__/growth-provider-context-packet.test.ts`
Steps:
1. Write schema tests for required sections and blocked provider action.
2. Implement schema with reused provider-intelligence enums/types.
3. Run the package-local schema test or targeted Jest test.
4. Run `cd packages/website-contract && npm run typecheck`.

### Task 2: Export the contract
Objective: Make the schema/types available through `@bukeer/website-contract`.
Files:
- Modify `packages/website-contract/src/index.ts`
Steps:
1. Add exports near existing Growth OS provider-intelligence section.
2. Run `cd packages/website-contract && npm run build`.
3. Run `npm run typecheck` from repo root.

### Task 3: Add read-only builder scaffolding
Objective: Add typed builder entrypoint without provider/API/write behavior.
Files:
- Create `lib/growth/context-packets/types.ts`
- Create `lib/growth/context-packets/builder.ts`
- Optional create `lib/growth/context-packets/index.ts`
Steps:
1. Define builder options and helper types.
2. Implement tenant-scoped select helpers; queries should read only.
3. Implement freshness classification against `growth_profile_runs` and registry TTLs.
4. Parse the output through `GrowthProviderContextPacketSchema`.

### Task 4: Add fixture-driven builder tests
Objective: Prove fresh/stale/missing/duplicate behavior.
Files:
- Create `__tests__/growth/context-packets/builder.test.ts`
Steps:
1. Build in-memory Supabase query mock.
2. Add fresh fixture test.
3. Add stale fixture test.
4. Add missing fixture test.
5. Add duplicate evidence fixture test.
6. Add tenant isolation test.
7. Run `npm test -- __tests__/growth/context-packets/builder.test.ts --runInBand`.

### Task 5: Final validation and docs/index check
Objective: Ensure repo-level checks and documentation traceability pass.
Files:
- Modify `docs/INDEX.md` if required by docs convention for this new plan.
Steps:
1. Run `npm run ai:check`.
2. Run `npm run typecheck`.
3. Run package build/typecheck.
4. Run targeted tests.
5. Run `npm run tech-validator:code:quick`.
6. Run `git diff --check` and review changed fixtures for secrets/PII.

Risks / WATCH items:
- `GrowthProviderSchema` currently only includes `dataforseo|gsc|ga4|clarity`; paid providers from SPEC v2 are not represented there yet. For #537, either allow source profile `provider` to accept string extensions or plan a separate registry/schema expansion for paid read-only providers.
- Existing `lib/growth/agentic/context-builder.ts` also builds broad context snapshots. The new builder must not collide semantically; name it `provider context packet` and keep it consumer-worker focused.
- Supabase table column names may differ across migrations for some previous action/outcome rows. Keep the builder query layer narrow and mockable; fail with WATCH/BLOCKED rather than silently dropping required evidence.
- Jest path aliases can be brittle for package imports. Prefer importing public `@bukeer/website-contract` exports after Task 2 and use existing Jest config patterns.
- No live Supabase credentials should be required for unit tests.

Definition of done for #537 implementation PR:
- All acceptance criteria above pass.
- The PR description links GitHub issue #537, source spec v2, audit #536, beta plan, and ADRs 003/005/008/009/016/018/029.
- Tech-validator PLAN review is PASS before implementation and CODE review is PASS before merge.
