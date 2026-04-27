---
name: codex-visual-testing
description: Codex Desktop visual testing workflow for Bukeer Studio. Use when the user asks to testar, probar, validar visualmente, revisar en navegador, reproduce/reproducir bug, smoke test, QA rapido, or inspect a local Bukeer Studio flow without running Playwright CLI tests. Opens an isolated session-pool dev server and uses the Codex in-app browser, not port 3000 and not `npm run test:e2e`.
---

# Codex Visual Testing

Run fast local QA through Codex Desktop's in-app browser. This skill is for
human-like visual inspection and bug reproduction, not automated Playwright test
suites.

## Intent

Classify the request into one mode:

| Mode | User language | Goal |
| --- | --- | --- |
| `testar` | "testea", "prueba", "smoke test" | Explore a flow and report what works/breaks. |
| `validar` | "valida", "verifica", "revisa visualmente" | Confirm a known change or page state. |
| `reproducir-bug` | "reproduce bug", "esto falla", "no funciona" | Reproduce exact steps, capture evidence, then hand off to `debugger` if code changes are needed. |

If the path or flow is missing, default to `/` and ask for the next action only
after the local app is open.

## Session Rules

- Never use `npm run dev`, `npm run test:e2e`, `playwright test`, or port `3000`.
- Always use the session pool (`s1`-`s4`, ports `3001`-`3004`).
- Use Codex's in-app browser through the `browser-use:browser` skill.
- Keep the dev server running while the user and Codex inspect the app.
- Stop the server and release the slot when finished.
- If all slots are busy, report `npm run session:list` output and stop.

## Start

1. Check slots:

```bash
npm run session:list
```

2. Start an isolated visual session:

```bash
bash scripts/codex-visual-session.sh
```

The script prints:

```text
Slot: s1
Port: 3001
URL: http://localhost:3001
```

Use that URL as the base URL. Append the requested path, for example
`http://localhost:3001/site/colombiatours`.

## Browser

Use the Browser plugin with the `iab` backend. Name the session according to the
mode:

- `🧪 Bukeer testar`
- `✅ Bukeer validar`
- `🔎 Bukeer bug`

Open a new in-app browser tab when needed. Navigate to the session URL and take
the cheapest useful observation:

- DOM snapshot for labels, buttons, links, and forms.
- Screenshot for layout, visual regressions, responsive issues, or "does this
  look right?" questions.

Do not run Playwright CLI. The browser runtime may expose `tab.playwright`, but
use it only as the control API for the in-app browser.

## Visual Pass

For `testar`, cover:

- Initial load has no hard error.
- Header/nav and main content render.
- One primary user interaction works.
- One responsive/narrow viewport check if the flow is public-facing.

For `validar`, cover:

- The exact page/change requested by the user.
- Before/after reload if code or data changed during the session.
- Any console-visible or network-visible issue that explains a mismatch.

For `reproducir-bug`, cover:

- Exact URL, viewport, and steps.
- Observed vs expected behavior.
- Screenshot or DOM evidence.
- Console/network clues if available.
- If reproduced and code changes are needed, switch to `debugger`.

## Report

End with:

```text
Modo:
URL:
Resultado:
Hallazgos:
Siguiente paso:
```

Mention the session slot and whether it was released. If the session is still
running for the user to inspect, say which URL remains open.
