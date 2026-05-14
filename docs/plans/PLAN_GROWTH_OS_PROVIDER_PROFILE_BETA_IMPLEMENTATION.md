# PLAN: Growth OS Provider Profile Beta Implementation

> Implement only after technical validation and GitHub issue traceability are complete.

## Goal
Prepare and then implement the Neo/Hermes beta where provider profiles feed normalized, fresh and deduped facts into worker context packets, while GitHub remains planning SSOT and Supabase remains operational SSOT.

## Architecture
Reuse existing Growth OS scripts and migrations first. Add a generic provider profile contract, context packet builder, runner/freshness gates and worker contracts. Paid media profiles are designed now and implemented read-only after SEO/analytics provider flow is certified.

## Phase 0 — GitHub and documentation SSOT
Output: specs, audit and issue comments.

Checklist:
- [ ] Add `SPEC_GROWTH_OS_PROVIDER_PROFILE_ARCHITECTURE_V2.md`.
- [ ] Add `AUDIT_GROWTH_OS_PROVIDER_PROFILE_SYSTEM_2026-05.md`.
- [ ] Add this implementation plan.
- [ ] Update `docs/INDEX.md` with the new spec/audit/plan links.
- [ ] Comment #521 with the direction change.
- [ ] Comment #471/#310/#441/#460/#502 with traceability notes.

## Phase 1 — Provider registry audit map
Output: executable matrix mapping existing scripts to profile contracts.

Tasks:
1. Read `scripts/seo/growth-provider-profile-registry.mjs`.
2. Extract profile ids, cadence, provider, script target and cost/approval policy.
3. Map each profile to cache table and normalizer.
4. Add paid media design entries without enabling mutations.
5. Produce PASS/WATCH/BLOCKED status by profile.

Acceptance:
- [ ] Every DataForSEO/GSC/GA4/Clarity profile has script/cache/normalizer mapping or explicit gap.
- [ ] Every paid profile has read-only/mutation posture.
- [ ] Profiles include `website_id` and account scoping.

## Phase 2 — Context packet contract and builder design
Output: contract and builder implementation task.

Tasks:
1. Define TypeScript/Zod schema in `packages/website-contract/src` or appropriate contract package.
2. Implement read-only builder over Supabase facts/caches/work_items/outcomes.
3. Include freshness map, source profiles, previous actions and dedupe verdict.
4. Unit-test packet creation with fixture facts.

Acceptance:
- [ ] Context packet can be built for ColombiaTours product transcreation.
- [ ] Missing/stale provider profiles return `WATCH`/`BLOCKED`, not silent empty context.
- [ ] Packet includes blocked action `call_provider_api_directly`.

## Phase 3 — Provider runner beta
Output: provider run path reusing existing scripts.

Preferred approach:
```text
approved scheduler/Neo task
  -> Node provider runner
  -> registry lookup
  -> freshness/budget/approval gate
  -> existing script
  -> cache table
  -> normalizer
  -> growth_profile_runs
```

Tasks:
1. Decide runner host: Hermes tool host, GitHub Action, or internal Node job.
2. Avoid long-running jobs inside Cloudflare Worker request lifecycle.
3. Add dry-run mode.
4. Add ledger write/verification.
5. Run first GSC/GA4 free profile certification.

Acceptance:
- [ ] No provider call occurs when cache is fresh.
- [ ] Cost-gated profiles require owner issue.
- [ ] Run writes `growth_profile_runs` with row count, status, freshness and source refs.

## Phase 4 — Worker contract refit
Output: first worker consuming context packet instead of APIs.

Recommended first worker: `product-transcreator` because #502 already has quality gates.

Tasks:
1. Replace/directly block DataForSEO calls in normal production path.
2. Read context packet for entity/locale.
3. Check anti-rework gate before work.
4. Write work item, publication job and outcome refs.
5. Dual-write to legacy Kanban only during transition.

Acceptance:
- [ ] Worker can complete prepare-only task with context packet facts.
- [ ] Duplicate entity/locale work is skipped unless material evidence changed.
- [ ] Output links back to source profiles and owner issue.

## Phase 5 — Paid media read-only extension
Output: campaign optimizer read-only recommendations.

Tasks:
1. Validate Google Ads/Meta credential and reporting access without exposing secrets.
2. Implement or connect read-only cache/fact profiles.
3. Join paid facts with GA4/funnel/CRM facts.
4. Generate recommendation work items only; no campaign mutation.

Acceptance:
- [ ] Paid facts can create `paid_tracking_blocked`, `paid_wasted_spend`, or `paid_search_term_content_opportunity` candidates.
- [ ] No API-based campaign mutations exist in beta.
- [ ] Council/human gate required for budget/campaign actions.

## Validation Gates Before Implementation
- [ ] Documentation/index links resolve.
- [ ] `npm run ai:check` or equivalent documentation sync check, if available.
- [ ] `npm run tech-validator:code:quick` for repository workflow compatibility if dependencies are installed.
- [ ] Secret scan on diff.
- [ ] GitHub issue comments posted and linked.
- [ ] Human approval to proceed from plan/spec to code implementation.
