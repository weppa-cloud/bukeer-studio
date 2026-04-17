# Lighthouse CI — Core Web Vitals gate for product landing pages

Pre-deploy performance / a11y / SEO / best-practices gate for the Product
Landing v1 rollout. Complements the runbook at
[`product-landing-v1-runbook.md`](./product-landing-v1-runbook.md).

Replaces the imprecise `performance.timing` numbers captured by Playwright MCP
in QA #120 with real Lighthouse scores.

---

## Thresholds

Defined in [`lighthouserc.js`](../../lighthouserc.js):

| Category | Min score | Severity |
|----------|-----------|----------|
| Performance | 0.90 | warn |
| Accessibility | 0.95 | error |
| SEO | 0.95 | error |
| Best Practices | 0.90 | warn |

`error` categories fail the run (non-zero exit). `warn` categories surface in
the report but do not fail.

---

## URLs tested

One representative URL per product type for tenant `colombiatours`:

- `/site/colombiatours/actividades/4x1-adventure` (activity / `TouristAttraction`)
- `/site/colombiatours/hoteles/aloft-bogota-airport` (hotel / `Hotel`)
- `/site/colombiatours/paquetes/paquete-bogot-4-d-as` (package / `Product`)

Override the tenant by exporting `LHCI_TENANT=<slug>` before running.

`numberOfRuns` is `2` to reduce variance without blowing up wall time.

---

## How to run

### Prerequisites

Install dev deps (once):

```bash
npm install
```

This pulls `@lhci/cli` and `lighthouse` from `devDependencies`.

### Run the gate

```bash
bash scripts/lighthouse-ci.sh
```

The script:

1. Claims a session pool slot (`s1`..`s4`) via `scripts/session-acquire.sh`.
2. Starts `npm run dev:session` on the claimed port with an isolated
   `NEXT_DIST_DIR` (e.g. `.next-s2`).
3. Waits up to 90s for the server to respond.
4. Runs `npx lhci autorun --config=./lighthouserc.js`.
5. Releases the slot and kills the dev server on exit, error, or CTRL+C.

Reports are written to `.lighthouseci/` (gitignored).

**Do not run against `http://localhost:3000`** — that port is reserved for
manual `npm run dev`. The wrapper enforces this by using the session pool.

### Override tenant or port manually

```bash
LHCI_TENANT=colombiatours bash scripts/lighthouse-ci.sh
```

---

## Interpreting results

`.lighthouseci/` contains:

- `lhr-*.json` — raw Lighthouse results per URL per run
- `manifest.json` — index of runs
- `assertion-results.json` — pass/fail per assertion

To re-view the last run interactively:

```bash
npx lhci open
```

If an `error` assertion fails (a11y < 0.95 or SEO < 0.95), the runbook
pre-flight is blocked until the offending page is fixed. A `warn` (perf or
best-practices below their thresholds) should be investigated but does not
gate the deploy.

---

## CI integration (future)

Not wired into GitHub Actions yet. When enabled, add a job that runs
`scripts/lighthouse-ci.sh` against a preview worker URL and uploads
`.lighthouseci/` as an artifact. The session pool is only needed for local
runs; in CI use a single-runner server.

---

## Session pool compliance

This script is the only sanctioned way to run Lighthouse locally — it uses
the same slot allocator as `npm run session:run`. See
[`.claude/rules/e2e-sessions.md`](../../.claude/rules/e2e-sessions.md).
