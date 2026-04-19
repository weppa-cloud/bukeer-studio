# CI Gate — SEO + i18n P0 E2E

**Status:** Active since EPIC [#207](https://github.com/weppa-cloud/bukeer-studio/issues/207) Workstream W5 (2026-04-19).
**Owner:** Studio platform · SEO/i18n guild.
**Contract:** single unified pipeline per [[ADR-013]], NOT parallel to `tech-validator:code`.

Related: [[ADR-010]] · [[ADR-013]] · [[ADR-014]] · [[ADR-019]] · [[ADR-020]] · [[ADR-023]].

---

## What runs when

### On every push to `main` (and manual `workflow_dispatch`)

`.github/workflows/deploy.yml` executes two mandatory jobs before `deploy-staging`:

| Job | Step | Purpose |
|---|---|---|
| `quality` | `npm run lint` + `npm run typecheck` + `npm test` | Baseline static + unit checks |
| `quality` | `npm run tech-validator:code` | [[ADR-013]] CODE-mode gate — delta-TS ([[ADR-014]]), ADR policy scans, lint/build |
| `e2e-smoke` | `playwright test public-runtime.smoke.spec.ts --grep "@p0-seo"` | P0 SEO/i18n HTML assertions + runtime smoke |
| `e2e-smoke` | `node scripts/gen-seo-i18n-report.mjs` | Emits `reports/e2e-seo-i18n/latest.json` ([[ADR-010]]) |

`deploy-staging` is gated by `needs: [quality, e2e-smoke]`. Both must succeed.

### Nightly

`.github/workflows/nightly-worker-preview.yml` runs at 07:00 UTC:

- Builds the Cloudflare Worker (`npm run build:worker`).
- Starts `npm run preview:worker` in background.
- Runs the same `@p0-seo` suite against the Worker preview ([[ADR-007]] edge-first parity).
- On failure, comments on EPIC #207 via `gh issue comment` using the built-in `GITHUB_TOKEN` secret.

---

## `@p0-seo` tagging convention

Any spec that must block staging deploy tags its `test()` titles with `@p0-seo`:

```ts
test('homepage exposes canonical + og tags @p0-seo', async ({ page }) => { ... });
```

Current P0 specs (EPIC #207 W1):

| Spec file | Gap-matrix row(s) |
|---|---|
| `e2e/tests/public-seo-metadata.spec.ts` | P0-5, P0-6 |
| `e2e/tests/public-sitemap.spec.ts` | P0-1, P0-2, P0-3 |
| `e2e/tests/public-hreflang.spec.ts` | P0-7 |
| `e2e/tests/public-structured-data.spec.ts` | P0-8 |
| `e2e/tests/middleware-locale-routing.spec.ts` | P0-9 |
| `e2e/tests/revalidate-flow.spec.ts` | P0-10 |
| `e2e/tests/seo-transcreate-v2-lifecycle.spec.ts` | P0-11 |

Gap-matrix rows are defined in
[`docs/ops/e2e-gap-audit-seo-i18n-2026-04-19.md`](./e2e-gap-audit-seo-i18n-2026-04-19.md).

---

## Required repository secrets

Configure in **Settings → Secrets and variables → Actions**:

| Secret | Used by | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL_STAGING` | `e2e-smoke`, nightly | Staging Supabase project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY_STAGING` | `e2e-smoke`, nightly | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY_STAGING` | `e2e-smoke`, nightly | Server-only |
| `REVALIDATE_SECRET_STAGING` | `e2e-smoke`, nightly | Matches `REVALIDATE_SECRET` in app env |
| `E2E_WEBSITE_ID_STAGING` | `e2e-smoke`, nightly | Seeded multi-locale tenant UUID |
| `GITHUB_TOKEN` | nightly notifier | Built-in, no setup |

When secrets are absent (e.g., forks, draft PRs), the workflow falls back to placeholder values
so the smoke subset still runs; `@p0-seo` assertions may be skipped or short-circuit.

---

## Session pool (CI vs. local)

| Environment | Runner | Tool |
|---|---|---|
| Local dev / agents | Shared machine, ports 3001–3004 | `npm run session:run` ([[ADR-023]]) |
| CI | Fresh GitHub Actions VM (isolated) | Raw `npx playwright test ...` — **NEVER** `session:run` |

`session:run` writes lock files; in CI that is wasted overhead and can obscure failures.
See `.claude/rules/e2e-sessions.md` for the rule (CI clause).

---

## Emergency bypass

**Do not bypass without a written go from the release lead.** If the gate is blocking a hotfix:

1. Open an incident issue describing the regression and why the hotfix cannot wait.
2. Admin with `admin:repo` role re-runs `deploy.yml` with `workflow_dispatch` input after
   commenting the justification on the incident issue.
3. Force-merging requires **all four** of:
   - Incident issue linked in the commit message.
   - Manual verification of the 3 critical routes in the release-gate checklist.
   - Immediate follow-up PR restoring the green gate.
   - Post-mortem within 48 h.

Bypass events are tracked in [`docs/ops/release-gate-checklist.md`](./release-gate-checklist.md) appendix.

---

## Failure triage

When `e2e-smoke` fails on `@p0-seo`:

1. Download the `e2e-seo-i18n-report` artifact from the failed run. The `gapMatrix` field maps
   failures to gap-matrix rows (e.g., `P0-7` → hreflang).
2. Download the `playwright-report` artifact for traces/screenshots.
3. Cross-reference the gap-matrix row with the audit doc
   (`docs/ops/e2e-gap-audit-seo-i18n-2026-04-19.md`) to find the upstream source file.
4. If the failure is flaky (retry passed), file a follow-up to stabilise, do NOT silence.
5. If the failure is a true regression, open a blocker on EPIC #207 and tag the responsible
   workstream owner.

---

## Changelog

- **2026-04-19** — Initial gate, EPIC #207 W5 (see EPIC acceptance criteria).
