# Paso 4 — Flow 1 walkthrough (AC-A1..A4 + AC-A5 Lighthouse)

**Owner**: QA-lead (+ partner sit-in for UX confirmation)
**Prereq**: Paso 3 complete (real data filled)
**Estimated**: 2-3h wall clock

## Goal

Execute `/qa-nextjs` story-by-story suite against **live ColombiaTours data** via Playwright MCP on session-pool slot. Capture desktop + mobile screenshots + console logs + HAR per story + Lighthouse 3 pages.

Closes AC-A1..A5 of #213. Enables AC-X4b QA sign-off.

## Setup

```bash
cd /Users/yeisongomez/Documents/Proyectos/Bukeer/bukeer-studio
git checkout main && git pull

# Claim session slot
eval "$(bash scripts/session-acquire.sh)"
echo "Using slot: $SESSION_NAME on port $PORT"

# Inject pilot env vars (from paso-2)
export REVALIDATE_SECRET=F125AB8D-D0C0-41E9-8625-4937FC2F24E8
export SUPABASE_SERVICE_ROLE_KEY=<paste from Supabase dashboard>

# Start isolated dev server
PORT=$PORT NEXT_DIST_DIR=.next-$SESSION_NAME npm run dev:session &
SERVER_PID=$!

# Wait for boot
timeout 60 bash -c "until curl -s http://localhost:$PORT > /dev/null; do sleep 1; done"
echo "Dev server ready on :$PORT"
```

## Story catalog (per `/qa-nextjs` command)

Base URL: `http://localhost:$PORT/?subdomain=colombiatours`
Alt: use header `x-subdomain: colombiatours` via Playwright context option.

### Stories (11 total, booking skip)

| # | Story | Desktop 1440×900 | Mobile iPhone 14 390×844 |
|---|-------|:-:|:-:|
| 1 | homepage | [ ] | [ ] |
| 2 | search (`/buscar?q=...`) | [ ] | [ ] |
| 3 | detail pkg (Pkg 15D) | [ ] | [ ] |
| 4 | detail act (Guatape) | [ ] | [ ] |
| 5 | detail hotel (cualquier live) | [ ] | [ ] |
| 6 | detail blog (≥1 live post) | [ ] | [ ] |
| 7 | `/privacy` | [ ] | [ ] |
| 8 | `/terms` | [ ] | [ ] |
| 9 | `/legal` | [ ] | [ ] |
| 10 | `/dashboard/{wid}/translations` (authed) | [ ] | [ ] |
| 11 | language switcher es-CO ↔ en-US | [ ] | [ ] |
| ~~12~~ | ~~booking~~ | SKIP — ADR-024 DEFER | — |

Per story output:
- Desktop PNG → `qa-screenshots/pilot-colombiatours-2026-04-20/$SESSION_NAME/<story>/desktop.png`
- Mobile PNG → `qa-screenshots/pilot-colombiatours-2026-04-20/$SESSION_NAME/<story>/mobile.png`
- Console log → `artifacts/qa/pilot/2026-04-20/$SESSION_NAME/story-by-story/console/<story>.txt`
- Network HAR → `artifacts/qa/pilot/2026-04-20/$SESSION_NAME/story-by-story/network/<story>.har`

## Runner — Playwright MCP

Use Claude Code Playwright MCP tools (not direct Playwright CLI). For each story:

1. `mcp__playwright__browser_navigate` → URL
2. `mcp__playwright__browser_resize` → 1440×900
3. `mcp__playwright__browser_take_screenshot` → desktop.png
4. `mcp__playwright__browser_console_messages` → save to console log
5. `mcp__playwright__browser_network_requests` → save to HAR
6. `mcp__playwright__browser_resize` → 390×844 (iPhone 14)
7. `mcp__playwright__browser_take_screenshot` → mobile.png
8. Capture same console+network per viewport
9. PASS/FAIL + note

## Gate criteria per story

- Zero console **error** (React boundary, hydration, uncaught promise)
- Warnings → triaged list (accept/fix/defer)
- Zero network 5xx
- 4xx only on expected unauth / 404 paths
- Visual render matches matrix expectation per canonical matrix §A-L

## AC-A5 Lighthouse

```bash
bash scripts/lighthouse-ci.sh
```

3 páginas críticas mobile profile (Moto G4 + Slow 4G):
- home
- 1 pkg detail (Pkg 15D)
- 1 act detail (Guatape)

Archive → `artifacts/qa/pilot/2026-04-20/lighthouse/{home,pkg-detail,act-detail}/{mobile,desktop}.html`

**Gate thresholds**:
| Metric | Threshold | Action if below |
|--------|-----------|-----------------|
| Performance | ≥ 0.90 warn | Soft block, open remediation issue |
| Accessibility | ≥ 0.95 error | Hard block si < 0.85 |
| SEO | ≥ 0.95 | Hard block si < 0.90 |
| Best Practices | ≥ 0.90 warn | Soft block |

Con data real (no noindex), act + blog SEO deben subir de 0.58 → ≥ 0.95.

## Cleanup

```bash
kill $SERVER_PID
bash scripts/session-release.sh "$_ACQUIRED_SESSION"
```

## Report format

Crear `docs/qa/pilot/flow-1-walkthrough-2026-04-20.md`:
- Story table PASS/FAIL + screenshot thumbnails
- Lighthouse scores summary
- Issues open list (link a nuevos GitHub issues)
- Console warning triage
- Gate verdict: GO / SOFT-BLOCK / NO-GO

## Cierre

AC-A1..A5 cubiertos. Habilitar AC-X4b (QA sign-off comment en #207).
