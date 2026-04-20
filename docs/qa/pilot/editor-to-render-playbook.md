# Pilot editor→render playbook — W4 #218

> EPIC #214 · W4 #218 · Stage 4 · 2026-04-20
> Scope: package + activity marketing/content editor → public SSR render, ColombiaTours-shaped seed.
> Out of scope: booking (ADR-024 DEFER), hotel editor (ADR-025 Flutter-owner), transcreate lifecycle (W5), visual matrix (W6).

## What this suite proves

Each spec writes to one Studio editor, fires `/api/revalidate`, refetches the public page, and asserts the DOM/JSON-LD reflects the edit. Artifacts (before/after screenshots + HTML excerpts) land in `test-results/$SESSION_NAME/…`. W4 ships 6 specs under `e2e/tests/pilot/editor-render/` plus seed + POM + helpers.

## Required env vars

Copy `.env.local.example` → `.env.local` and fill:

| Variable | Purpose | Source |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | shared with bukeer-flutter |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public anon key | Supabase dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | service role (seed + actions) | Supabase dashboard |
| `REVALIDATE_SECRET` | server-side ISR bearer | any random string |
| `E2E_REVALIDATE_SECRET` | E2E-only mirror of the above | **must equal** `REVALIDATE_SECRET` locally |
| `E2E_WEBSITE_ID` | pilot tenant (ColombiaTours) | Supabase `websites.id` |
| `E2E_USER_EMAIL` / `E2E_USER_PASSWORD` | storage-state admin | test account |
| `ALLOW_SEED` | guardrail override | set to `1` in CI + dev |

The `waitForRevalidate` helper reads `E2E_REVALIDATE_SECRET` first, falls back to `REVALIDATE_SECRET` — both allow the spec to run on dev laptops without duplicating credentials.

## Running the suite

### Local (session pool)

Never run Playwright directly; always claim a slot via `scripts/session-acquire.sh`. Port 3000 is reserved for manual dev.

```bash
# 1. Claim a slot (sets SESSION_NAME + PORT + _ACQUIRED_SESSION)
eval "$(bash scripts/session-acquire.sh)"

# 2. Start dev server isolated to the slot
PORT=$PORT NEXT_DIST_DIR=.next-$SESSION_NAME npm run dev:session &

# 3. Wait for readiness
timeout 60 bash -c "until curl -s http://localhost:$PORT > /dev/null; do sleep 1; done"

# 4. Run the pilot suite (chromium baseline)
E2E_BASE_URL=http://localhost:$PORT E2E_SESSION_NAME=$SESSION_NAME \
  npx playwright test --project=pilot --grep "@pilot-w4" --workers=1

# 5. Release
bash scripts/session-release.sh "$_ACQUIRED_SESSION"
```

For the full browser matrix (chromium + firefox + mobile-chrome), run once per project:

```bash
npx playwright test --project=chromium --grep "@pilot-w4" --workers=1
npx playwright test --project=firefox  --grep "@pilot-w4" --workers=1
npx playwright test --project=mobile-chrome --grep "@pilot-w4" --workers=1
```

### CI (`.github/workflows/deploy.yml::e2e-pilot`)

Triggered on `workflow_dispatch` only — `gh workflow run deploy.yml --ref <branch>`. Job uses `workers: 1` and a 45-minute timeout. Artifacts uploaded to `pilot-w4-playwright` (retention 14 days).

## Seed variants

`e2e/setup/pilot-seed.ts::seedPilot(variant)` — memoised per process, idempotent select-first-then-update pattern. Variants:

| Variant | Description | Consumer |
|---|---|---|
| `baseline` | Rendered fields populated (package + activity + blog with non-trivial copy) | W4 (this wave) |
| `translation-ready` | Bilingual-leaning copy + FAQ + ≥1 act + ≥1 blog | W5 #219 transcreate lifecycle |
| `empty-state` | Nulls / empty arrays everywhere | W6 matrix empty coverage |
| `missing-locale` | es-CO populated, EN gap intentional | W5 missing-locale spec |

Cleanup is **narrow** — `cleanupPilotSeed(websiteId)` deletes only rows whose slug starts with `pilot-colombiatours-` in the seed account. Never truncates. Intended for `suite beforeAll`, not `afterAll`, so forensic inspection survives a crash.

## Artifact layout

Playwright report: `playwright-report/$SESSION_NAME/` (HTML).
Test results: `test-results/$SESSION_NAME/<spec>-<browser>/` (traces, videos, attachments).
Each spec attaches:

- `*-editor-before.png` / `*-editor-after.png` — editor surface.
- `*-public-before.png` / `*-public-after.png` — public SSR render.
- `*.html` — trimmed HTML excerpt of the asserted block (see `attachHtmlExcerpt`).

W4 evidence bundle staging path: `artifacts/qa/pilot/2026-04-20/w4-218/`.

## Justified skips

| Spec | Skip reason | Tracking |
|---|---|---|
| `video-url.spec.ts` | `get_website_product_page` RPC does not JOIN `package_kits.video_url` — iframe + VideoObject short-circuit | #234 (cross-repo) |
| All specs, mobile-chrome | DnD-only custom-section editor flow | AC-W4-3a |
| Any spec | `E2E_REVALIDATE_SECRET` missing | local dev only |
| Any spec | Public package page returns 404 (RPC gap / seed partial) | — |

All skips surface a reason string so the Stage 4 gate metric (`0 failed, justified skips only`) stays auditable.

## Known flakies

- Firefox occasionally lands on an intermediate URL before auth/session settles (see `e2e/tests/helpers.ts::gotoWebsiteSection` retry loop).
- `/api/revalidate` may 429 on rapid successive calls — specs rate-limit via sequential `waitForRevalidate` per flow.
- Supabase cold-start latency on first spec in a run can exceed 3s — `test.setTimeout` defaults are generous (20-45s).

## Follow-ups (out of W4 scope)

- W5 #219 consumes `translation-ready` for transcreate lifecycle specs.
- W6 #220 consumes `baseline` + `empty-state` for visual matrix + Lighthouse.
- #234 upstream RPC fix unlocks `video-url.spec.ts` full assertion path.
- W4.1 (conditional on W2 option) adds `marketing-recommendations` + `marketing-instructions` activity specs if Studio RPCs for those fields ship post-pilot.
