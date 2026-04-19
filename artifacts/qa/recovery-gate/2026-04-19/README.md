# QA Recovery Gate — Run Artifacts 2026-04-19

Part of #226 EPIC QA Recovery Gate P0 GUI.

## Contents

Session pool runs emit:

- `session-{s1-s4}/playwright-report/` — HTML report per session
- `session-{s1-s4}/test-results/` — traces/videos/screenshots
- `summary.json` — failed / skipped / did-not-run counts per project
- `server-log-*.txt` — attached when infra_outage classification fires

## Classification (see `e2e/setup/infra-classifier.ts`)

- `infra_outage` — `ECONNREFUSED`, `ERR_CONNECTION_REFUSED`, `ETIMEDOUT`, `ENOTFOUND`, webServer boot failure
- `viewport_flake` — `element is not visible in viewport`, `screenshot size mismatch`, etc. Gets 1 retry via Playwright `retries`.
- `other` — real failures. Never masked.

## Gate thresholds (AC1, AC8, AC9)

| Project        | Target                                             |
|----------------|----------------------------------------------------|
| chromium       | 0 failed, 0 did-not-run, skipped justified w/ link |
| firefox        | same as chromium, viewport_flake retried 1x        |
| mobile-chrome  | render/public/settings/domain run; DnD editor skip |

## Closure policy (AC10)

- Gate verde comment published on #207 with run/build id + artifact links.
- **Do not** close #198 / #199 / #202 here — delegated to #213 sign-off (AC-X4a partner + AC-X4b QA + AC-X4c sign-off doc) + #207 close.

---

Certificado el 19 de abril de 2026.
