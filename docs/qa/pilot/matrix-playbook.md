# Pilot Matrix Visual E2E + Lighthouse Playbook

**Stage:** EPIC #214 · W6 #220
**Status:** Live (2026-04-20)
**Owner:** QA + Stage 4 Pilot Readiness
**Related:**
- [[product-detail-matrix]] — canonical matrix source of truth (W1 #215)
- [[editor-to-render-playbook]] — W4 editor→render playbook
- [[ADR-024]] — Booking V1 DEFER (Section M skip policy)
- [[ADR-025]] — Studio/Flutter field ownership (hotels read-only)

## What this covers

- **Matrix specs (structural + visual evidence):**
  - `e2e/tests/pilot/matrix/pilot-matrix-public-package.spec.ts`
  - `e2e/tests/pilot/matrix/pilot-matrix-public-activity.spec.ts` (editable loop AC-W6-12)
  - `e2e/tests/pilot/matrix/pilot-matrix-public-hotel.spec.ts` (read-only render)
  - `e2e/tests/pilot/matrix/pilot-matrix-public-blog.spec.ts` (es-CO + en-US)
- **Lighthouse specs (perf / a11y / SEO / best-practices):**
  - `e2e/tests/pilot/lighthouse/pilot-lighthouse-{package,activity,hotel,blog}.spec.ts`
- **Shared fixture:** `e2e/fixtures/product-matrix.ts`
- **Helpers:** `e2e/setup/matrix-helpers.ts`
- **Lighthouse runner:** `scripts/lighthouse-pilot.sh` + `lighthouserc.pilot.js`

## How to run

### 1. Prerequisite — session pool

Agents must never run on port 3000 or call `npm run test:e2e` directly. Claim
a slot first via the session pool (see `.claude/rules/e2e-sessions.md`).

```bash
# Check free slots
npm run session:list
```

### 2. Matrix + Lighthouse specs (Playwright)

```bash
# Claim a slot + run all W6 specs on chromium (implicit) through the pilot project
eval "$(bash scripts/session-acquire.sh)"
PORT=$PORT NEXT_DIST_DIR=.next-$SESSION_NAME npm run dev:session &
DEV_PID=$!

# Wait for the server to come up, then run the pilot project (w4|w5|w6)
timeout 60 bash -c "until curl -s http://localhost:$PORT > /dev/null; do sleep 1; done"

SESSION_NAME=$SESSION_NAME PORT=$PORT E2E_BASE_URL=http://localhost:$PORT \
  npx playwright test --project=pilot --grep "@pilot-w6"

# Or run a single project explicitly — full matrix requires chromium + firefox + mobile-chrome
for proj in chromium firefox mobile-chrome; do
  SESSION_NAME=$SESSION_NAME PORT=$PORT E2E_BASE_URL=http://localhost:$PORT \
    npx playwright test --project=$proj --grep "@pilot-w6"
done

kill $DEV_PID
bash scripts/session-release.sh "$_ACQUIRED_SESSION"
```

### 3. Standalone Lighthouse runner (HTML + JSON reports)

```bash
# Production build + Lighthouse CLI (slot-claimed inside the script)
bash scripts/lighthouse-pilot.sh
```

Output lands in `artifacts/qa/pilot/<YYYY-MM-DD>/w6-220/lighthouse/` plus the
LHCI default `.lighthouseci/`.

## Interpreting outcomes

The matrix specs emit `matrix-<type>[-mobile]-outcomes.json` as a trace
attachment. Each row's outcome is one of:

| Status             | Meaning                                                                                                   |
|--------------------|-----------------------------------------------------------------------------------------------------------|
| `ok`               | Row renders as expected — block visible via role/testid.                                                  |
| `empty`            | Conditional cell, condition not met on the seed; acceptable (seed 🟡 hygiene).                            |
| `conditional-skip` | Row needed data the seed doesn't populate; allow + document.                                              |
| `na-skip`          | Cell marked `status: 'na'` for this content type — spec skipped row.                                      |
| `defer-skip`       | Section M booking row skipped per `PILOT_BOOKING_ENABLED=false` (ADR-024).                                |
| `fail`             | Required row missing — structural bug. Fails the spec.                                                    |

A spec passes when `failures.length === 0`. Conditional / defer / na skips are
expected and recorded in the attached JSON.

## Visual snapshots

Each spec attaches a full-page screenshot per viewport (`matrix-<type>-<viewport>[...].png`).
Per AC-W6-9 these are **evidence-only** — no pixel-diff assertion. Reviewers
compare snapshots manually or feed them into QA #213 Flow 2 evidence bundle.

If you need a golden-image baseline in the future, flip to Playwright's
`toHaveScreenshot` API — snapshots will live under `__screenshots__/` per spec.

## Lighthouse thresholds

Aligned with `lighthouserc.js` (desktop defaults). Mobile perf decision gate
pending ADR-026 (only required if baseline < 0.90).

| Category        | Min score | Severity |
|-----------------|-----------|----------|
| performance     | 0.90      | warn     |
| accessibility   | 0.95      | error    |
| seo             | 0.95      | error    |
| best-practices  | 0.90      | warn     |

Error categories fail the spec; warn categories log via `console.warn` and
continue. Review the attached JSON `{ scores, reportPaths }` for context, and
open the HTML report at `reportPaths.html` for full detail.

## Extending the matrix

When a new row lands in `docs/product/product-detail-matrix.md`:

1. Add a `MatrixBlock` entry in `e2e/fixtures/product-matrix.ts` with the
   correct `row`, `section`, `selectors.primary`, per-type `TypeCell`, and the
   source pointer (`source: 'docs/product/product-detail-matrix.md#row-<n>'`).
2. If the row is editable in Studio, set `editable: true` on the relevant
   `TypeCell` — the activity spec iterates those via
   `PRODUCT_MATRIX.filter(r => r.types.act?.editable === true)`.
3. If the row is behind a feature flag, set `envFlag: 'PILOT_BOOKING_ENABLED'`
   (only flag currently supported; extend `matrix-helpers.ts::assertMatrixRow`
   if other flags surface).
4. If a row is conditional on data, set `status: 'conditional'` + `condition`
   so the spec records `empty` instead of failing on absence.

## Booking DEFER handling

All Section M rows carry `envFlag: 'PILOT_BOOKING_ENABLED'`. With the flag
unset or `false` (authoritative per ADR-024, pilot is WhatsApp-only) the
matrix iterator skips those rows with status `defer-skip`. The release gate
checklist must confirm `PILOT_BOOKING_ENABLED` is unset/`false`.

## Hotel read-only policy

Per ADR-025 (pilot 2026-04-19), hotel marketing/content is Flutter-owner. The
hotel spec asserts row presence + captures snapshots but never edits. SEO meta
rows (#41, #42, #48) remain editable via the SEO item detail surface — those
show as `ok` cells in the fixture but the editable loop is NOT exercised in
W6 (it belongs to the SEO editor suite).

## Blog translated URL

`pilot-matrix-public-blog.spec.ts` covers both `/blog/{slug}` (es-CO) and
`/en/blog/{slug}` (en-US). If the translated variant isn't published yet, the
spec emits `test.skip()` with an explicit reason linking back to W5 transcreate.
Hreflang alternates must include `x-default` per ADR-020 (asserted inline).

## Reporting regressions

1. Rerun the spec with `--headed` to see the failure interactively:
   ```bash
   SESSION_NAME=$SESSION_NAME PORT=$PORT E2E_BASE_URL=http://localhost:$PORT \
     npx playwright test e2e/tests/pilot/matrix/pilot-matrix-public-package.spec.ts \
     --grep "@pilot-w6" --headed --project=chromium
   ```
2. If the row is missing because the seed changed, update
   `e2e/setup/pilot-seed.ts` (but W6 should never re-seed — coordinate with W4).
3. If the renderer dropped a testid, fix the component (testid ownership
   belongs to W1 #215). Never add CSS-class selectors inside matrix specs —
   lint bans that.

## Cross-refs

- #213 — Pilot QA evidence bundle consumer.
- #215 — Matrix doc + `data-testid` instrumentation (W1).
- #216 — Activity parity RPC (W2) consumed by editable loop.
- #218 — Pilot seed factory (W4).
- #219 — Transcreate lifecycle (W5) — blog en-US variant owner.
