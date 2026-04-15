# E2E Session Pool — Rules for All Agents & Skills

Any agent, skill, or command that needs to start a dev server or run Playwright tests
MUST use the session pool. Never start `npm run dev` on a hardcoded port or run
`npm run test:e2e` directly — these collide with other agents running in parallel.

## Pool (4 slots)

| Slot | Port | Build cache | Report dir              |
|------|------|-------------|-------------------------|
| s1   | 3001 | `.next-s1`  | `playwright-report/s1`  |
| s2   | 3002 | `.next-s2`  | `playwright-report/s2`  |
| s3   | 3003 | `.next-s3`  | `playwright-report/s3`  |
| s4   | 3004 | `.next-s4`  | `playwright-report/s4`  |

Port 3000 is reserved for manual `npm run dev` only (no parallel agents).

## Rules

### ALWAYS: claim a slot before any dev server or test run

```bash
npm run session:run                         # auto-claim + run all tests + auto-release
npm run session:run -- --grep "checkout"    # pass playwright args after --
```

### ALWAYS: check slot availability before claiming

```bash
npm run session:list
```

Output:
```
Slot  Port  Status
s1    3001  BUSY   (PID 84231)
s2    3002  FREE
```

### ALWAYS: use the acquired SESSION_NAME for screenshots and outputs

After `session:run` claims slot `s2`, reports go to `playwright-report/s2/` and
`test-results/s2/`. Reference these paths in any output or report.

### NEVER: run these directly from an agent

```bash
# FORBIDDEN — collides with other sessions
npm run test:e2e
npm run dev
PORT=3000 npm run dev:session
playwright test
```

### NEVER: leave a lock behind

`session:run` auto-releases on exit/error/CTRL+C via trap. If you used `eval` to
claim manually, always release:
```bash
bash scripts/session-release.sh "$_ACQUIRED_SESSION"
```

### IF all slots busy: report to user, do NOT spin a 5th server

```bash
npm run session:list   # show which PIDs hold locks
# Then: "All 4 session slots are busy. Run `npm run session:list` to see active sessions."
```

Stale locks (process died without releasing) are auto-cleared by `session:run`
during slot scan. To clear manually:
```bash
bash scripts/session-release.sh s3   # release specific stale slot
```

## Skill-specific behavior

### qa-nextjs (`/qa-nextjs`)
- Preflight 1.2: claim slot via `session:run`, do NOT start on :3000
- Base URL = `http://localhost:$PORT` where $PORT comes from the acquired slot
- All screenshots go to `qa-screenshots/` (not port-specific — already story-namespaced)

### debugger
- When reproducing requires a running server, check `npm run session:list` first
- If a slot is free, claim it; if user already has a dev server, use its port
- Do NOT start a second server on the same port

### playwright-skill
- All test runs use `npm run session:run` or manual slot claim
- Pass `SESSION_NAME` to isolate `test-results/` output

### nextjs-developer
- TypeScript checks (`npx tsc --noEmit`) and lint do NOT need a slot — run directly
- Only `npm run build` or test runs need a slot

## Quick reference

```bash
npm run session:list                   # see slot status
npm run session:run                    # auto-claim + test + release
npm run session:run -- --grep "hero"   # run subset of tests
npm run session:release s2             # release stuck slot
```

Full docs: `docs/development/local-sessions.md`
