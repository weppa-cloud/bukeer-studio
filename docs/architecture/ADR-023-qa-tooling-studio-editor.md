# ADR-023 — QA Tooling: Playwright Component Testing + Visual Regression

**Status:** Accepted
**Date:** 2026-04-17
**Deciders:** Studio team
**Closes:** #193 (child of #190)
**Supersedes:** none
**Related:** [[ADR-013]] [[ADR-014]] [[ADR-036]]

## Context

The Studio Unified Product Editor EPIC ([[#190]]) ships ~45 new dashboard components across 6 phases (#191-#196). PCR recommendation R8 flagged that the parent spec referenced `stories/studio/*.stories.mdx` but **Storybook is not installed** in this repo. Introducing Storybook requires:

- New dev dependency + build pipeline integration
- Chromatic or Percy for visual regression (paid tier $99–149/mo)
- Parallel maintenance of stories + production wire-up
- Onboarding for every contributor

Alternative: Playwright is already installed (`@playwright/test@^1.58.2`) and mandated by `.claude/rules/e2e-sessions.md` for all agent workflows. Its experimental component testing package (`@playwright/experimental-ct-react`) provides isolated component rendering plus built-in visual regression via `toHaveScreenshot()`.

## Decision

Adopt **Option A — Playwright Component Testing builtin** for isolated component tests + visual regression.

**Rejected options:**
- **Option B** — Storybook + Chromatic. Rejected: new infra surface, monthly cost, fixture duplication.
- **Option C** — Playwright CT + Percy. Rejected: same Percy cost, no advantage over built-in tooling.

## Consequences

### Positive
- Zero new core dependencies — uses existing Playwright version.
- Fixture files are TypeScript (typesafe), not MDX (parser coupling).
- Session-pool aware: CT config reads `E2E_SESSION_NAME` env var to isolate output.
- Visual regression built-in via `toHaveScreenshot({ maxDiffPixelRatio: 0.05 })`.
- Baselines stored in git (no external storage cost).
- Same CI runner infrastructure as E2E — no separate pipeline.
- `$0` ongoing cost.

### Negative
- No cloud review UI (Chromatic's visual diff review surface). Mitigation: PR comments with diff artifacts uploaded from CI.
- Baseline regeneration requires local run `npm run test:ct:update` + commit. Mitigation: GitHub Action shortcut can be added later if noisy.
- Font rendering subtle differences between local and CI environments. Mitigation: `maxDiffPixelRatio: 0.05` tolerance absorbs noise; per-test override allowed with justification comment.

### Neutral
- Experimental API — Playwright may rename/break between minor versions. Track upstream changelog.

## Scope

### In-scope
- Component tests for Studio dashboard editors (Phase 0+).
- Visual regression for dashboard primitives + editor states (empty/loading/filled/error).
- Single desktop viewport (Chrome). Mobile breakpoints optional per-test.

### Out-of-scope (covered elsewhere)
- End-to-end flow tests → existing `playwright.config.ts` + `e2e/tests/*`.
- Public landing rendering tests → E2E.
- Cross-browser compatibility → E2E subset if needed.

## Configuration

- Config: `playwright-ct.config.ts` (separate from E2E).
- Test directory: `__tests__/ct/**`.
- Baselines: `__tests__/visual/studio-editor-baselines/` (git; migrate to LFS if >10MB total).
- Mount entry: `playwright/index.html` + `playwright/index.tsx` (imports `app/globals.css` for Tailwind + theme tokens).
- CI: `.github/workflows/ct-visual.yml` — triggers on PRs touching `components/` or test files.
- Scripts: `npm run test:ct` (run), `npm run test:ct:update` (regenerate baselines).

## Fixture convention

See `docs/qa/studio-unified-product-editor/fixtures-convention.md` for:
- TSX fixture structure (TypeScript, not MDX).
- Required states per component (empty / loading / filled / error + domain-specific).
- Naming rules (`<component>.spec.tsx`).
- Screenshot naming (`<component>-<state>.png`).

## Compliance

- **[[ADR-013]]** Automated Tech-Validator Quality Gate — CT is a new quality layer. Every Phase child issue (AC17-22 in [[#190]]) requires CT coverage.
- **[[ADR-014]]** Delta TypeScript Quality Gate — CT tests must maintain 0 new tsc errors; `tsc` runs on `__tests__/**`.
- **[[ADR-036]]** Dual-Layer Testing Surface — CT sits between unit (Jest) and E2E (Playwright). Explicitly extends the surface.
- **`.claude/rules/e2e-sessions.md`** — CT is isolated (no dev server) and does not consume session-pool slots. No conflict.

## Follow-ups

1. Add ADR-023 wikilink to `docs/INDEX.md`.
2. Evaluate baseline size after Phase 0 + Phase 0.5 merge — migrate to git LFS if >10MB total.
3. Evaluate per-test `maxDiffPixelRatio` overrides — if >5 tests need higher tolerance, reconsider font loading strategy.
4. Add `test:ct:update` to `CONTRIBUTING.md` workflow guide.

## References

- Playwright CT docs: https://playwright.dev/docs/test-components
- [[#190]] — Studio Unified Product Editor EPIC.
- [[#193]] — QA Infra RFC (this ADR closes it).
- PCR comment on [[#190]] — R8 rationale.
