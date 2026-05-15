# Learning run — Transcreation pipeline stabilization PT-BR/hreflang (Sprint 1)

- Pipeline ID: transcreation-stabilization-20260514
- Date: 2026-05-14
- Branch: feat/transcreation-stabilization
- Commit: 98f3594af70e2dd9b58938b8714b32f15c59c20e
- Task IDs: t_e351b4df, t_6f9f7e30, t_739b56e1, t_3b7ce424, t_271650f8
- Spec refs: docs/specs/generated/transcreation-stabilization-ptbr-hreflang.md
- ADR refs: ADR-003, ADR-005, ADR-010, ADR-013, ADR-014, ADR-023
- Plan: /opt/data/.hermes/plans/transcreation-stabilization-plan.md

## Outcome

PASS: Sprint 1 (P0 Frontend PT-BR + hreflang) of the transcreation stabilization plan completed. Commit 98f3594a on feat/transcreation-stabilization. 9 files changed, 580 insertions, 32 deletions. SEO tests 136/136 PASS, typecheck PASS, lint PASS (warnings only), secrets PASS. Fix is gated: do NOT merge/deploy without authorization from Yeison/Neo.

## Evidence links

- Commit: 98f3594a on feat/transcreation-stabilization
- QA notes: docs/qa/transcreation/ptbr-routing-repro.md
- Spec: docs/specs/generated/transcreation-stabilization-ptbr-hreflang.md
- Plan: /opt/data/.hermes/plans/transcreation-stabilization-plan.md

## Gates and commands

| Gate/command | Result | Evidence |
| --- | --- | --- |
| T1 PLAN GATE | PASS | 5/5 criteria pass; Sprint 1 (PT-BR/hreflang) inherits PASS from prior validation |
| T3 CODE GATE (commit f11d5d00) | PASS | 5/5 criteria pass — PT-BR mapping, canonical/hreflang, no hardcoded strings, comprehensive tests, typecheck/lint/secrets |
| T3 CODE GATE (commit 98f3594a) | PASS | 6/6 criteria pass — scope, route locale, hreflang, middleware rewrite, backward compat, typecheck/lint |
| T5 OPS HANDOFF | PASS | Commit 98f3594a on feat/transcreation-stabilization; manual PR instructions provided (gh CLI unavailable) |
| T6 LEARNING CURATOR | PASS | Learning run completed; candidates curated below |

## What was fixed

9 files across three layers:

1. **Route layer** (`lib/seo/locale-routing.ts`): New `localeToPublicSegment()` function handles `pt-BR` → `pt-br` as explicit exception (other locales use 2-letter language prefix). New `normalizeSupportedLocaleForPublicRouting()` and `localeMatchesPublicSegment()` to correctly parse `pt-br` path segment and resolve it to `pt-BR` locale. `pickLocaleForPublicSegment()` replaces `pickLocaleForLanguage()` for exact segment matching.

2. **Middleware layer** (`middleware.ts`): Public URL path rewrite now uses `languageSegment` (not `resolvedLanguage`) for locale-rewritten paths. Blog locale aliases map `pt` → `pt-BR` instead of `pt-PT`. `normalizeBlogPublicLocale()` handles fr/de/pt uniformly.

3. **Data layer** (`lib/supabase/get-website.ts`): Blog queries expand locale fallback candidates for pt/fr/de symmetrically. `normalizeBlogPublicLocale()` maps `pt` → `pt-BR`, `fr` → `fr-FR`, `de` → `de-DE`. Type annotations added to `getPublishedBlogPostSitemapRows()` return type.

4. **Test layer** (3 test files): Existing tests updated to match new behavior. Hreflang tests validate complete alternate set including `pt-BR`, `en-US`, `de-DE`, `fr-FR`, `x-default`.

## Failures and retries

- **Worktree had no local node_modules**: The feature worktree (`/opt/data/home/worktrees/transcreation-stabilization`) had no `npm ci` run. Developers ran tests via `PATH=... node_modules/.bin:$PATH` pointing at the main repo's node_modules. This works but is fragile — any dependency mismatch between branches would cause false failures.
- **Two code review rounds**: The first code gate (commit f11d5d00) passed with 5/5 criteria. A revised commit (98f3594a) with scope adjustments went through a second code gate (6/6 criteria). Both passed, indicating iterative refinement rather than defects.
- **gh CLI unavailable**: T5 ops handoff could not open a GitHub PR because the `gh` CLI is not installed/authenticated in this environment. Manual PR instructions were provided instead.
- **T6 infra not merged**: The T6 learning-curator infrastructure (docs/ai/, templates, schema from GitHub #542/#543) was developed on a parallel feature branch (`feat/542-dev-pipeline-learning-loop`) and has not been merged to `origin/dev`. This T6 run created `docs/ai/learning-runs/` as a one-off — the dir doesn't exist in the base branch yet.
- **34 pre-existing test failures**: origin/dev has 34 pre-existing test failures unrelated to this change. The test baseline is not clean, making it harder to distinguish regression from pre-existing noise.

## Reusable patterns

1. **Three-layer locale fix pattern**: Locale routing bugs in multi-tenant Next.js apps require touching all three layers simultaneously — route parsing (locale-routing.ts), middleware URL rewrite (middleware.ts), and DB query fallback (get-website.ts). Fixing only one layer leaves the bug half-resolved. Always audit all three when investigating locale routing issues in this codebase.

2. **Worktree test execution without local node_modules**: When a worktree lacks `npm ci`, tests can execute using the main repo's node_modules via `PATH=<main-repo>/node_modules/.bin:$PATH` and `NODE_PATH=<main-repo>/node_modules`. This is a valid pattern for temporary worktrees but fragile across divergent dependency branches.

3. **Canonical public segment for non-standard locales**: When a locale's public URL path segment differs from `localeToLanguage()` (e.g. `pt-BR` → `pt-br` not `pt`), use an explicit locale-to-segment mapping rather than deriving it from language. The `localeToPublicSegment()` function in `locale-routing.ts` is the canonical pattern.

4. **Legacy locale fallbacks must be symmetric**: Locale normalization in `getWebsite.ts` and `middleware.ts` had asymmetric fallbacks — `es`/`en` were expanded bidirectionally but `pt`/`fr`/`de` were not. When adding locale support, the fallback expansion must be symmetrical in all locations (both directions: short code → regional code AND regional code → short code).

5. **T5 ops handoff without gh CLI**: When `gh` CLI is unavailable, T5 should produce a manual PR instruction block (branch name, base branch, commit, PR description template) and a deploy checklist. This pattern works but should be documented as a known CI limitation.

## Learning candidates

| Type | Audience | Recommendation | Evidence | Decision |
| --- | --- | --- | --- | --- |
| profile_fact | developer | propose | Commit 98f3594a: pt→pt-BR mapping reversed previous pt→pt-PT decision (8bcdeb3d). ColombiaTours Brazilian audience requires pt-BR, not pt-PT | **Propose** — durable site-specific fact |
| pattern_doc | developer | propose | Three-layer locale fix pattern: locale-routing.ts + middleware.ts + get-website.ts must all change together | **Propose** — reusable debugging/implementation heuristic |
| profile_fact | developer | propose | Worktree test execution: no local node_modules; use main repo's node_modules/.bin:$PATH and NODE_PATH | **Propose** — saves developers time |
| skill_patch | tech-validator | propose | Locale routing code reviews should explicitly check all 3 layers (route parsing, middleware, DB queries) plus test file updates for all 3 | **Propose** — add to tech-validator code-review checklist for locale changes |
| profile_fact | ops | propose | gh CLI is unavailable in this environment; T5 ops should document manual PR instructions | **Propose** — known CI gap |
| profile_fact | all | propose | origin/dev has 34 pre-existing test failures; test baseline is not clean — do NOT attribute pre-existing failures to feature changes | **Propose** — saves debugging time |
| github_issue | all | propose | T6 learning-curator infra (docs/ai/) from #542/#543 is not yet merged to dev. This T6 run created the directory as one-off. Merge PR #543 to make T6 first-class | **Propose** — infrastructure follow-up |
| rejected_noise | all | reject | gh CLI unavailability details | Reject — operational environment issue, not durable knowledge |
| rejected_noise | all | reject | Specific CI/session pool slot details | Reject — session-specific |
| rejected_noise | all | reject | Pipeline timing: PR not merged at T6 dispatch time | Reject — one-off edge case for this early pipeline |

## Applied learning

- `docs/ai/learning-runs/transcreation-stabilization-20260514.md` — this document
- Three-layer locale fix pattern proposed for `docs/ai/patterns/`
- Code review checklist enhancement proposed for tech-validator skill

## Rejected learning

- Raw kanban event timestamps and lock data — operational noise
- gh CLI auth details — secret-dependent; summary is sufficient
- Specific pre-existing test failure names — belong in test infrastructure, not learning runs
- Session pool slot allocation details — one-off operational detail

## Redaction checklist

- [x] No secrets, credentials, tokens, cookie values, or raw env values.
- [x] No raw PII.
- [x] No full raw logs.
- [x] Evidence is summarized and linked by task ID, commit, and doc path.
- [x] Candidates whose value depends on secret values are rejected.
- [x] No private IP addresses, hostnames, or internal URLs.
