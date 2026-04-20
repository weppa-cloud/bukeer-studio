# Flow 1 Walkthrough — ColombiaTours (2026-04-20)

**Executor:** Codex (operational run)  
**Session slot:** `s2` (`PORT=3002`, `NEXT_DIST_DIR=.next-s2`)  
**Server mode:** production (`npm run build` + `npm run start`)  
**Stories executed:** 12  
**Result:** `11 PASS / 1 FAIL`

## Evidence

- Summary JSON: `artifacts/qa/pilot/2026-04-20/s2/flow1-summary.json`
- Screenshots (desktop + mobile): `qa-screenshots/pilot-colombiatours-2026-04-20/s2/`
- Console logs (per story): `artifacts/qa/pilot/2026-04-20/s2/story-by-story/console/`
- Network logs (per story): `artifacts/qa/pilot/2026-04-20/s2/story-by-story/network/`

## Story-by-story PASS/FAIL

| # | Story | Route | Desktop | Mobile | HTTP/Final URL | Verdict | Notes |
|---|---|---|---|---|---|---|---|
| 1 | Homepage | `/site/colombiatours/` | PASS | PASS | 200 / `/site/colombiatours` | PASS | OK |
| 2 | Search | `/site/colombiatours/buscar` | PASS | PASS | 200 / `/site/colombiatours/buscar` | PASS | OK |
| 3 | Pkg 15D | `/site/colombiatours/paquetes/paquete-vacaciones-familiares-por-colombia-15-d-as` | PASS | PASS | 200 / same | PASS | OK |
| 4 | Pkg 15D EN | `/site/colombiatours/en/paquetes/paquete-vacaciones-familiares-por-colombia-15-d-as` | PASS | PASS | 200 / same | PASS | OK |
| 5 | Act Guatape | `/site/colombiatours/actividades/tour-a-guatape-y-pe-ol` | PASS | PASS | 200 / same | PASS | OK |
| 6 | Act Guatape EN | `/site/colombiatours/en/actividades/tour-a-guatape-y-pe-ol` | PASS | PASS | 200 / same | PASS | OK |
| 7 | Hotel detail | `/site/colombiatours/hoteles/aloft-bogota-airport` | PASS | PASS | 200 / same | PASS | OK |
| 8 | Blog detail | `/site/colombiatours/blog/guia-viajar-colombia` | PASS | PASS | 200 / same | PASS | OK |
| 9 | Privacy | `/site/colombiatours/privacy` | FAIL | FAIL | timeout / redirected to `https://colombiatours.travel/terminos-y-condiciones/politica-de-privacidad/` | **FAIL** | external redirect + `networkidle` timeout in both viewports |
| 10 | Terms | `/site/colombiatours/terms` | PASS | PASS | 200 / `https://colombiatours.travel/terminos-y-condiciones/` | PASS | redirects to canonical external terms page |
| 11 | Legal | `/site/colombiatours/legal` | PASS | PASS | 200 / same | PASS | OK |
| 12 | Translations | `/dashboard/894545b7-73ca-4dae-b76a-da5b6a3f8441/translations` | PASS | PASS | 200 / `/login?redirect=...` | PASS | expected auth redirect |

## Console/network capture status

- Console artifacts: `12/12` stories captured.
- Network artifacts: `12/12` stories captured.
- Highest warning/error count in this run: `07-hotel-aloft` (16 console warning/error entries).

## Lighthouse AC-A5 (same execution window)

Command executed:

```bash
LHCI_DIST_DIR=.next-s2 bash scripts/lighthouse-ci.sh
```

Result: **FAIL** (assertion), with one AC-A5 blocker:

- URL: `http://localhost:3001/site/colombiatours/hoteles/aloft-bogota-airport`
- Assertion failed: `categories.seo minScore >= 0.95`
- Actual: `0.92` (both runs)
- Source: `.lighthouseci/assertion-results.json`

Run scores from the latest 6 reports:

| URL | Runs | Perf | A11y | Best Practices | SEO | Gate |
|---|---:|---:|---:|---:|---:|---|
| `/site/colombiatours/actividades/4x1-adventure` | 2 | 0.87 / 0.96 | 0.97 / 0.97 | 1.00 / 1.00 | 1.00 / 1.00 | PASS |
| `/site/colombiatours/hoteles/aloft-bogota-airport` | 2 | 0.94 / 0.92 | 0.96 / 0.96 | 1.00 / 1.00 | **0.92 / 0.92** | **FAIL (SEO)** |
| `/site/colombiatours/paquetes/paquete-bogot-4-d-as` | 2 | 0.95 / 0.86 | 0.96 / 0.96 | 1.00 / 1.00 | 1.00 / 1.00 | PASS |

## Open blockers from this Flow 1 run

1. Story 9 (`/privacy`) timed out after redirecting to external canonical domain; requires explicit decision if this route should stay external, plus non-hanging redirect behavior.
2. Lighthouse AC-A5 failed on hotel SEO (`0.92 < 0.95`) and still blocks strict gate.
