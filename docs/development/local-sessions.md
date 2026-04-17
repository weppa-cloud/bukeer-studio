# Local Sessions Without Interference

This project supports isolated local sessions so two terminals/agents can run in parallel without stepping on each other.

## Why conflicts happen

Most local instability comes from sharing:

- the same port (`3000`, `3001`, etc.)
- the same Next build cache directory (`.next`)
- the same test output folders (`test-results`, `playwright-report`)

## Single source of truth (scripts)

- Dev runner: `scripts/start-dev-node.sh`
- Prod clean runner: `scripts/start-prod-clean.sh`
- E2E session runner: `scripts/run-e2e-session.sh`
- **Session manager (auto-claim):** `scripts/session-acquire.sh` / `session-release.sh` / `session-list.sh`

---

## Session pool

There are **4 fixed slots**. Each slot = isolated port + build cache + test output dir.

| Slot | Port | Build cache    | Report dir            |
|------|------|----------------|-----------------------|
| s1   | 3001 | `.next-s1`     | `playwright-report/s1` |
| s2   | 3002 | `.next-s2`     | `playwright-report/s2` |
| s3   | 3003 | `.next-s3`     | `playwright-report/s3` |
| s4   | 3004 | `.next-s4`     | `playwright-report/s4` |

**Why 4?** Each Next.js dev server consumes ~1–2 CPU cores. On a typical 8-core machine, 4 concurrent sessions is the practical ceiling before contention degrades test reliability.

Lock files live in `.sessions/locks/<slot>/` (excluded from git). Claiming uses `mkdir` which is atomic on POSIX — first caller wins.

---

## Automatic session management (recommended)

### Run E2E — auto-claim a free slot

```bash
npm run session:run
# or with playwright args:
npm run session:run -- --grep "checkout"
```

The script:
1. Scans s1→s4, claims first free slot via atomic lock
2. Sets `SESSION_NAME` + `PORT` + `NEXT_DIST_DIR` automatically
3. Runs Playwright
4. Releases the slot on exit, error, or CTRL+C (trap)

### Check slot status

```bash
npm run session:list
```

Output example:
```
Slot  Port  Status
----  ----  ------
s1    3001  BUSY   (PID 84231)
s2    3002  FREE
s3    3003  FREE
s4    3004  STALE  (PID 71000 dead — run: rm -rf .sessions/locks/s4)
```

### Release a stuck slot manually

```bash
npm run session:release s1
# or
bash scripts/session-release.sh s1
```

Stale locks (PID dead) are also cleared automatically when `session:run` scans the pool.

---

## Manual session management (advanced)

Use this when you need full control — e.g., dev server + separate Playwright run.

### Two dev servers in parallel

Terminal A:
```bash
PORT=3001 NEXT_DIST_DIR=.next-s1 npm run dev:session
```

Terminal B:
```bash
PORT=3002 NEXT_DIST_DIR=.next-s2 npm run dev:session
```

### Two Playwright sessions in parallel (manual)

Session A:
```bash
SESSION_NAME=s1 PORT=3001 npm run test:e2e:session
```

Session B:
```bash
SESSION_NAME=s2 PORT=3002 npm run test:e2e:session
```

Outputs are isolated automatically:
- `playwright-report/s1` and `playwright-report/s2`
- `test-results/s1` and `test-results/s2`

### Claim a slot for manual use (eval pattern)

```bash
eval "$(bash scripts/session-acquire.sh)"
# Now SESSION_NAME, PORT, _ACQUIRED_SESSION are set

SESSION_NAME=$SESSION_NAME PORT=$PORT npm run test:e2e:session

# Release when done
bash scripts/session-release.sh "$_ACQUIRED_SESSION"
```

---

## Clean production-like run

```bash
PORT=3000 npm run start:prod:clean
```

Notes:

- Uses Node 22 from `/opt/homebrew/opt/node@22/bin`.
- By default closes active Next processes before build/start (`KILL_ALL_NEXT=1`).
- If you need to keep other Next instances alive:

```bash
KILL_ALL_NEXT=0 PORT=3000 npm run start:prod:clean
```

---

## First-time env setup

```bash
cp .env.local.example .env.local        # Next.js dev
cp .dev.vars.example .dev.vars          # Cloudflare Worker preview
```

Fill the values you actually need. At minimum for dev:

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — same Supabase project as `bukeer-flutter`.
- `OPENROUTER_AUTH_TOKEN` — any valid OpenRouter key; required or AI routes fail on boot.
- `REVALIDATE_SECRET` — any random string.

### MapTiler (base tiles)

`NEXT_PUBLIC_MAP_STYLE_URL` is validated as a URL in `lib/env.ts`. In prod it's required; in dev it falls back to `demotiles.maplibre.org` (unstyled, fine for smoke tests but ugly).

To get prod-equivalent tiles locally:

1. Sign up for the free tier at <https://www.maptiler.com/cloud/> (100k map loads / month, no card).
2. Dashboard → API Keys → create a key.
3. Paste it into `NEXT_PUBLIC_MAP_STYLE_TOKEN` in `.env.local`. Leave `NEXT_PUBLIC_MAP_STYLE_URL` at the default (`…/streets-v2/style.json?key={token}` — the `{token}` substitution is handled at runtime by `components/maps/destination-map.tsx` → `resolveMapStyleUrl`).
4. Restart `npm run dev`. The destinations map on `/site/colombiatours/destinos` should render with real tiles instead of the compatibility croquis.

Alternative providers that also expose a MapLibre-compatible `style.json`: Stadia Maps, Protomaps (self-hosted PMTiles on Cloudflare R2), MapBox. Swap the URL and token accordingly.
