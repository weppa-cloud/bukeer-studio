# Growth OS Autonomous Production Certification — 2026-05-08

## Scope

Certification skeleton for Epic #441 QA/certification of the autonomous Growth
OS production control plane for ColombiaTours.

This report is intentionally evidence-first. It does not mutate GitHub issue
state; Epic #441 checklist notes below are documentation comments only.

## Production Target

- Account: `9fc24733-b127-4184-aa22-12f03b98927a`
- Website: `894545b7-73ca-4dae-b76a-da5b6a3f8441`
- Console base: `/dashboard/894545b7-73ca-4dae-b76a-da5b6a3f8441/growth`
- E2E spec: `e2e/tests/growth-os-console-ui.spec.ts`
- Fixtures: `e2e/fixtures/growth-os-fixtures.ts`

## Certification Result

- Status: `CERTIFIED`
- Certified by: `Codex orchestration pass`
- Certified at: `2026-05-08`
- Evidence owner: `Codex / QA certification`
- Evidence links:
  - Live-gated production certification:
    `docs/growth-sessions/2026-05-08-growth-os-live-gated-certification.md`.
  - Session-pool E2E:
    `GROWTH_OS_UI_E2E_ENABLED=true npm run session:run -- --project=chromium --grep "@growth-os-ui" --reporter=line`.
  - Production build:
    `npm run build -- --no-lint`.
  - Typecheck:
    `npm run typecheck`.
- Blockers: none for the certified scope.
- Residual risk:
  - The certification proves live-gated autonomy, not unlimited autonomy.
    Caps, kill switch, quality gates, smoke checks, rollback payloads and
    outcomes remain mandatory.
  - Future outcome windows still require scheduled evaluation on day 7/day 21/
    day 28/day 45 depending on lane.

## Evidence Checklist

- [x] CEO cockpit renders current command-center surfaces.
- [x] Kill switch state/control is visible from the human operations console.
- [x] Lane policy table exposes live/paused/blocked/dry-run state.
- [x] Workboard summary, all canonical columns, bulk safety controls and
      blocked-state operations render.
- [x] Review Queue loads runs or an empty state without breaking tenant scope.
- [x] Run detail exposes human summary, change sets, runtime panel, learning
      candidates, technical evidence and append-only events.
- [x] Rollback visibility is present through CEO cockpit and run/change-set
      evidence where seeded data exists.
- [x] Agents page exposes tool matrix, replay status and learning operations.
- [x] Data Health exposes runtime learning health for replay, memory and skills.
- [x] Cross-tenant guard denies tenant B Growth data to tenant A auth context.
- [x] Viewer/curator role action checks are run when role fixtures are
      provisioned.
- [x] Mobile Growth OS routes have no document-level horizontal overflow.
- [x] Body text does not leak `[object Object]`.

## Session-Pool Commands

Never run Growth OS E2E on port `3000`. Use the session pool.

List available slots:

```bash
npm run session:list
```

Recommended one-shot certification run:

```bash
GROWTH_OS_UI_E2E_ENABLED=true npm run session:run -- --project=chromium --grep "@growth-os-ui" --reporter=line
```

Interactive/debug run:

```bash
eval "$(bash scripts/session-acquire.sh)"
PORT=$PORT NEXT_DIST_DIR=.next-$SESSION_NAME npm run dev:session &
timeout 60 bash -c "until curl -s http://localhost:$PORT > /dev/null; do sleep 1; done"
GROWTH_OS_UI_E2E_ENABLED=true SESSION_NAME=$SESSION_NAME PORT=$PORT npm run test:e2e:session -- --project=chromium --grep "@growth-os-ui" --reporter=line
bash scripts/session-release.sh "$_ACQUIRED_SESSION"
```

Release a stuck slot:

```bash
npm run session:release s1
```

## Verification Log

Record exact commands and results here.

```bash
npm run typecheck
npx tsc --noEmit --pretty false --target es2022 --module esnext --moduleResolution bundler --types node,@playwright/test --skipLibCheck e2e/tests/growth-os-console-ui.spec.ts e2e/fixtures/growth-os-fixtures.ts
GROWTH_OS_UI_E2E_ENABLED=true npm run session:run -- --project=chromium --grep "@growth-os-ui" --reporter=line
```

Final certification update:

- `npm run typecheck`: `PASS`.
- `npm run build -- --no-lint`: `PASS`; production build compiled all Growth
  routes.
- Growth OS UI E2E via session pool: `PASS`, Chromium `14 passed`, `1 skipped`
  in `55.8s`.

```bash
rm -rf .next-s1 test-results/s1 playwright-report/s1
GROWTH_OS_UI_E2E_ENABLED=true npm run session:run -- --project=chromium --grep "@growth-os-ui" --reporter=line
```

Notes:

- `scripts/run-e2e-session.sh` now sets `NEXT_DEV_TURBO=false` when
  `GROWTH_OS_UI_E2E_ENABLED=true`. Next production build passes; the dev-only
  Turbopack path intermittently hangs compiling Growth authenticated routes in
  the session pool.
- Programmatic E2E auth is regenerated for Growth UI certification so stale
  Supabase storage state does not mask auth/session regressions.
- Strict-mode selector fixes were limited to non-unique production data rows:
  multiple policies, rollback jobs and skill rows are valid production states.

Historical failed attempts, now resolved:

- Typecheck: `BLOCKED` by existing errors outside this QA slice:
  `lib/growth/console/queries.ts` nullable sort comparisons and duplicate
  `GrowthRuntimeCycle*` exports in `packages/website-contract/src/index.ts`.
- Growth OS UI E2E: `BLOCKED` before Growth OS assertions. Session pool
  claimed `s1` on port `3001`, global auth setup timed out at `/login` with
  `net::ERR_ABORTED`.
- Targeted E2E spec TypeScript check: `PASS`.
- Screenshots / traces: setup video only,
  `test-results/s1/auth.setup.ts-authenticate-setup/video.webm`.
- Session released: `YES`, `s1` released by `session:run`.
- Certification status at that point was `PENDING`; final status is
  `CERTIFIED`.

Consolidated implementation verification:

- `npm run typecheck`: `PASS`.
- `git diff --check`: `PASS`.
- Focused autonomy/runtime unit tests: `PASS`, 9 suites / 21 tests.

```bash
npm test -- --runTestsByPath __tests__/schema/growth-runtime-cycles.test.ts __tests__/lib/growth/autonomy/cycle-ledger.test.ts __tests__/lib/growth/autonomy/learning-summary.test.ts __tests__/lib/growth/autonomy/live-gate.test.ts __tests__/lib/growth/autonomy/candidate-promotion.test.ts __tests__/lib/growth/autonomy/profile-freshness-gate.test.ts __tests__/lib/growth/autonomy/publication-executor.test.ts __tests__/lib/growth/autonomy/quality-gate.test.ts __tests__/lib/growth/autonomy/outcome-evaluator.test.ts --runInBand
```

- Adapter unit tests: `PASS`, 3 suites / 9 tests.

```bash
npm test -- --runTestsByPath __tests__/lib/growth/autonomy/content-publication-adapter.test.ts __tests__/lib/growth/autonomy/transcreation-merge-adapter.test.ts __tests__/lib/growth/autonomy/technical-remediation-adapter.test.ts --runInBand
```

- `npm run build`: `PASS`. Next production build compiled all app routes,
  including `/dashboard/[websiteId]/growth/overview`,
  `/dashboard/[websiteId]/growth/agents`, `/growth/workboard`, `/growth/runs`
  and `/growth/data-health`.
- Auth setup regeneration through the session pool: `PASS`.

```bash
rm -f e2e/.auth/user.json && npm run session:run -- --project=setup
```

- Earlier Growth OS UI E2E via session pool: `FAIL`, 1 setup passed, 13 tests failed,
  1 skipped. Failure class: `page.goto: net::ERR_ABORTED; maybe frame was
  detached?` while navigating authenticated Growth OS dashboard routes and
  waiting for `domcontentloaded`.

```bash
GROWTH_OS_UI_E2E_ENABLED=true npm run session:run -- e2e/tests/growth-os-console-ui.spec.ts --project=chromium --grep "@growth-os-ui"
```

Debug evidence:

- `e2e/tests/auth.setup.ts` was adjusted so valid one-hour Supabase JWT storage
  is reusable with a five-minute freshness margin. Setup now logs
  `Auth JWT valid`.
- Session-pool route debug showed Next dev/Turbopack stuck at:
  `Compiling /dashboard/[websiteId]/growth/overview ...`.
- Production build does not reproduce the compile hang.

## Epic #441 Documentation Checklist

Docs-only checklist comments for Epic #441:

- [ ] QA slice owns only the E2E spec, fixtures, certification report/template
      and package scripts if needed.
- [ ] Backend/UI worker changes are not reverted.
- [ ] Current selectors replace stale Growth OS overview selectors.
- [ ] Certification report records commands, evidence and residual risk.
- [ ] GitHub issue state remains untouched by this worker.

## Decision

`GO`

Epic #441 certified scope is complete:

1. `growth_runtime_cycles` migration is applied in the target Supabase
   environment.
2. Session-pool E2E renders authenticated Growth OS routes and validates CEO
   cockpit, Workboard, Agents, rollback, mobile overflow and tenant guard.
3. Production live-gated evidence records the chain:
   cycle -> work item -> run -> change set -> publication job -> outcome.
4. Production evidence includes organic publish, transcreation merge,
   technical safe apply, rollback/dry rollback affordance, paid mutation
   blocked and tenant isolation evidence.
