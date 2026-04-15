---
name: debugger
description: |
  Structured bug diagnosis and resolution with visual feedback loop for Bukeer Studio.
  Flow: REPRODUCE → ISOLATE → HYPOTHESIZE → VERIFY → FIX → VALIDATE.
  Uses Playwright screenshots and Chrome DevTools for visual confirmation.
  ACTIVATION: bug, error, crash, visual regression, "doesn't work", "broken".
  NOT FOR: feature requests, refactoring, or documentation.

  Examples:
  <example>
  Context: User reports a visual bug.
  user: "The hero section is not showing on the public site"
  assistant: "I'll use the debugger skill to reproduce, isolate the root cause, and fix with visual verification."
  <commentary>Visual bug triggers the full REPRODUCE → FIX → VALIDATE cycle.</commentary>
  </example>
  <example>
  Context: User reports a build error.
  user: "npm run build is failing with a hydration mismatch"
  assistant: "I'll use the debugger skill to trace the hydration error to its root cause."
  <commentary>Build errors trigger ISOLATE → HYPOTHESIZE → FIX flow.</commentary>
  </example>
  <example>
  Context: User reports data not loading.
  user: "The testimonials section shows empty even though there's data in Supabase"
  assistant: "I'll debug this — likely an RLS policy issue or schema mismatch. Let me reproduce first."
  <commentary>Silent data issues follow the full diagnostic flow.</commentary>
  </example>
  <example>
  Context: Feature request, not a bug.
  user: "Add dark mode to the dashboard"
  assistant: "This is a feature request — I'll use nextjs-developer instead."
  <commentary>Not a bug → delegate to appropriate feature skill.</commentary>
  </example>
---

# Debugger Skill

Structured bug diagnosis and resolution engine for Bukeer Website Studio. Every fix
follows a disciplined flow with visual evidence at entry and exit.

## Core Flow

```
REPRODUCE → ISOLATE → HYPOTHESIZE → VERIFY → FIX → VALIDATE
    ↑                                              │
    └──────────── if fix fails ────────────────────┘
```

### Step 1: REPRODUCE
**Goal**: Confirm the bug exists and capture visual evidence.

1. Navigate to the affected page/component using Playwright or Chrome DevTools
2. **Screenshot BEFORE** — capture the current broken state
3. Check browser console for errors (`mcp__chrome-devtools__list_console_messages`)
4. Check network requests for failed API calls (`mcp__chrome-devtools__list_network_requests`)
5. Document: what's broken, what's expected, exact steps to reproduce

If the bug cannot be reproduced:
- Check if it's environment-specific (dev vs prod, Cloudflare vs local)
- Check if it's data-specific (which website/subdomain?)
- Ask user for more context (max 2 questions)

### Step 2: ISOLATE
**Goal**: Narrow down to the smallest scope.

1. **Search the codebase**: Grep for the component, section type, or error message
2. **Trace the data flow**:
   - Supabase query → Zod validation → component props → render
3. **Check recent changes**: `git log --oneline -10 --name-only` for related files
4. **Identify the layer**: Is it data (Supabase), schema (Zod), component (React), or theme (CSS vars)?

### Step 3: HYPOTHESIZE
**Goal**: Form a specific, testable hypothesis.

State it explicitly:
```
HYPOTHESIS: [Component X] fails because [specific cause] which results in [observed symptom].
TEST: [How to verify — grep, read file, check DB, inspect CSS vars, etc.]
```

Common root cause categories — see [PATTERNS.md](PATTERNS.md) for detailed catalogue.

### Step 4: VERIFY
**Goal**: Confirm the hypothesis before writing any fix.

- Read the suspected file and line
- Verify the hypothesis with evidence (grep result, DB query, CSS inspection)
- If hypothesis is wrong → return to Step 3 with new hypothesis (max 3 attempts)
- If 3 hypotheses fail → escalate to user with what you've learned

### Step 5: FIX
**Goal**: Minimal change that addresses the root cause.

**Hard rules:**
- Fix ONLY the bug — no refactoring, no improvements, no "while I'm here" changes
- The diff should be as small as possible
- Preserve existing code style and patterns
- If the fix requires changes in multiple files, explain why each change is necessary

### Step 6: VALIDATE
**Goal**: Confirm the fix works with visual evidence.

1. **Screenshot AFTER** — capture the fixed state
2. Compare before/after screenshots
3. Run validation:
   ```bash
   npx tsc --noEmit    # Type safety
   npm run lint         # Code quality
   npm run build        # Production build (catches RSC issues)
   ```
4. Check for regressions in related areas
5. Present before/after comparison to user

## Tools

| Tool | Purpose |
|------|---------|
| `mcp__playwright__browser_navigate` | Navigate to affected page |
| `mcp__playwright__browser_take_screenshot` | Visual evidence (before/after) |
| `mcp__playwright__browser_snapshot` | DOM structure inspection |
| `mcp__chrome-devtools__list_console_messages` | JavaScript errors |
| `mcp__chrome-devtools__list_network_requests` | Failed API calls, 401/403/500 |
| `mcp__chrome-devtools__evaluate_script` | Runtime state inspection |
| `mcp__chrome-devtools__take_screenshot` | Visual state capture |
| `Grep` / `Read` | Code search and inspection |
| `Bash("git blame")` | Who changed what and when |
| `Bash("git log")` | Recent changes in affected area |

## Delegate To

- `tech-validator` MODE:CODE — after fix, run compliance check
- `nextjs-developer` — if fix requires feature-level component changes
- `backend-dev` — if root cause is in Supabase (RLS, schema, Edge Function)
- `website-section-generator` — if a section component needs rebuild

## Escalation

| Situation | Action |
|-----------|--------|
| Cannot reproduce after 2 attempts | Ask user for exact steps + environment details |
| 3 hypotheses failed | Share findings, ask user for domain context |
| Root cause is in Supabase data (not code) | Report to user — may need Rol 2 (website-creator) |
| Root cause is in bukeer-flutter repo | Report cross-repo issue, document for Flutter team |
| Fix requires architectural change | Flag for `tech-validator` PLAN mode first |
