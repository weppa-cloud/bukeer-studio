---
description: "Codex Desktop visual QA — claim an isolated local session, open it in the Codex in-app browser, and inspect flows manually without Playwright test runs"
argument-hint: "[path=/] [focus='what to inspect']"
allowed-tools: Bash(npm:*), Bash(bash:*), Bash(curl:*), Bash(lsof:*), Bash(kill:*), Bash(sed:*), Bash(rg:*), Bash(cat:*), Bash(git:*), mcp__node_repl__js, mcp__node_repl__js_reset, Read, Grep, Glob
---

# Codex Visual — In-App Browser QA

Use this command when the user wants a fast local visual review in Codex Desktop.
This is **not** a Playwright E2E run. It uses the repo session pool for the dev
server and the Codex in-app browser for navigation, screenshots, and interaction.

Examples:

```text
/codex-visual
/codex-visual /site/colombiatours
/codex-visual /dashboard focus="editor layout and mobile menu"
```

## Rules

1. Do not use `npm run dev`, `npm run test:e2e`, `playwright test`, or port `3000`.
2. Do not use the Playwright MCP command workflow from `/qa-nextjs`.
3. Use the session pool: `s1`-`s4`, ports `3001`-`3004`, caches `.next-s1`-`.next-s4`.
4. Use the Codex in-app browser through the Browser plugin / Node REPL runtime.
5. Release the session slot when finished.
6. If all slots are busy, report that and stop. Do not start a fifth server.

## Flow

### 1. Check Slots

```bash
npm run session:list
```

If a slot is free, continue. If all slots are busy, show the current slot table to
the user and stop.

### 2. Start Visual Session

Prefer the repo script:

```bash
bash scripts/codex-visual-session.sh
```

Keep the process running. Capture the printed `URL`, usually
`http://localhost:3001`, `http://localhost:3002`, `http://localhost:3003`, or
`http://localhost:3004`.

If the script is unavailable, use the manual fallback:

```bash
eval "$(bash scripts/session-acquire.sh)"
PORT=$PORT NEXT_DIST_DIR=.next-$SESSION_NAME npm run dev:session
```

### 3. Open Codex In-App Browser

Use the Browser plugin with the `iab` backend. Open a new tab if needed and
navigate to the printed URL plus the requested path.

Default path:

```text
/
```

### 4. Visual Smoke Pass

Inspect, at minimum:

- Page loads without a hard error.
- Header/nav render correctly.
- Main content is visible above the fold.
- Console-visible errors or broken network states are noted if available.
- At least one interaction relevant to the user's focus works.
- If the focus is public-site rendering, check desktop and a narrow mobile viewport.

Use screenshots when visual confirmation matters. Prefer DOM snapshots for text,
links, labels, and forms.

### 5. Report

Return a concise report:

```text
URL tested:
Focus:
Result:
Findings:
Recommended next step:
```

If you made code changes during the session, reload the in-app browser before
final verification.

### 6. Cleanup

When the user is done or the command ends, stop the dev server process. The
script releases the slot automatically. If a manual claim was used:

```bash
bash scripts/session-release.sh "$_ACQUIRED_SESSION"
```
