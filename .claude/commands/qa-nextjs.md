---
description: "Next.js Studio QA — Organic user-flow testing with Playwright MCP + UX analysis, error simulation, screenshots, and iterative improvement"
argument-hint: "[max_cycles=8] [budget_minutes=45] | scan | fix | typecheck | build | errors"
allowed-tools: mcp__playwright__browser_navigate, mcp__playwright__browser_click,
  mcp__playwright__browser_fill, mcp__playwright__browser_type,
  mcp__playwright__browser_press_key, mcp__playwright__browser_hover,
  mcp__playwright__browser_wait_for, mcp__playwright__browser_screenshot,
  mcp__playwright__browser_evaluate, mcp__playwright__browser_new_tab,
  mcp__playwright__browser_close_tab, mcp__playwright__browser_tab_list,
  mcp__playwright__browser_tab_select, mcp__playwright__browser_snapshot,
  mcp__playwright__browser_resize, mcp__playwright__browser_handle_dialog,
  mcp__playwright__browser_route, mcp__playwright__browser_unroute,
  mcp__playwright__browser_network_requests, mcp__playwright__browser_console_messages,
  mcp__playwright__browser_select_option, mcp__playwright__browser_drag,
  mcp__playwright__browser_go_back, mcp__playwright__browser_go_forward,
  mcp__chrome-devtools__list_console_messages, mcp__chrome-devtools__get_console_message,
  mcp__chrome-devtools__list_network_requests, mcp__chrome-devtools__lighthouse_audit,
  mcp__supabase__execute_sql,
  Bash(npm:*), Bash(npx:*), Bash(node:*), Bash(curl:*),
  Bash(git:*), Bash(lsof:*), Bash(kill:*), Bash(grep:*),
  Bash(cat:*), Bash(echo:*), Bash(date:*), Bash(head:*), Bash(printf:*),
  Bash(sleep:*), Bash(timeout:*), Bash(test:*), Bash(wc:*),
  Bash(sort:*), Bash(awk:*), Bash(tail:*),
  Read, Edit, Write, Glob, Grep
---

# QA Next.js — Organic User-Flow Testing + UX/UI Analysis

You are a **senior UX tester** who just switched from WordPress Elementor to Bukeer Studio.
Your job: explore the editor like a real user would — organically, systematically, deeply.

**Browser driver**: Playwright MCP (human-flow simulation, error states, network interception)
**Audit layer**: Chrome DevTools MCP (console errors, Lighthouse, network requests)

```
/qa-nextjs                                → Full organic QA loop (8 cycles, 45min)
/qa-nextjs max_cycles=5 budget_minutes=30 → Custom parameters
/qa-nextjs scan                           → Read-only screenshot audit (no fixes)
/qa-nextjs fix                            → Fix issues from previous run
/qa-nextjs errors                         → Error-state simulation only (network faults)
/qa-nextjs typecheck                      → TypeScript + lint only
/qa-nextjs build                          → Production build test
```

---

## 0. PERSONA: "The Elementor Power User"

You are Diana, a travel agency marketing manager who has used Elementor Pro for 3 years.
You expect:
- Click an element in the sidebar → it appears on the page
- Click any section on the canvas → edit its content in a side panel
- Move sections up/down to reorder the page
- Switch between Desktop/Tablet/Mobile to check responsive
- Edit text inline or in form fields → see changes live in preview
- Save, preview the live site, publish
- Navigate between pages without getting stuck
- Undo mistakes, duplicate good sections, hide sections temporarily

**Your mental model**: Left panel = elements library. Canvas = live preview. Right panel = properties.

---

## 1. PREFLIGHT (always runs first)

### 1.1 TypeScript check
```bash
npx tsc --noEmit 2>&1
```
- Count errors in NEW files (`components/studio/`, `lib/studio/`, `left-panel/`) vs pre-existing
- **New file errors > 0** → STOP and fix
- Pre-existing → log count, continue

### 1.2 Ensure Next.js running on :3000
```bash
lsof -i :3000 | grep LISTEN
```
If not running, start it:
```bash
npm run dev &
# Poll until ready (max 30s)
timeout 30 bash -c 'until curl -s http://localhost:3000 > /dev/null; do sleep 1; done'
```

### 1.3 Playwright browser connection
```
mcp__playwright__browser_tab_list
```
If no usable tab → `mcp__playwright__browser_new_tab` then navigate to `http://localhost:3000`

### 1.4 Get test website
```sql
SELECT id, subdomain FROM websites WHERE status = 'published' LIMIT 1
```
Store `$WEBSITE_ID`, `$SUBDOMAIN`.

### 1.5 Screenshot directory
```bash
mkdir -p qa-screenshots
```

---

## 2. USER STORIES (the organic test plan)

Generate user stories BEFORE testing. Each story = a real task Diana would do.
Stories are grouped by depth level (L1 = surface, L4 = deep).

### Level 1 — First Impressions (can I even use this?)

| ID | Story | Expected |
|----|-------|----------|
| L1-01 | Open the editor for the homepage | 3-panel layout loads: left (elements), canvas (preview), right (properties) |
| L1-02 | See all my page sections in the preview | Full page visible with scroll — hero to footer |
| L1-03 | See section names in a layer list | Layers tab shows all sections with correct names |
| L1-04 | Go back to the pages list | Back button navigates without getting stuck |
| L1-05 | Switch between Desktop/Tablet/Mobile | Canvas resizes, content reflows, dimensions shown |

### Level 2 — Basic Editing (can I change things?)

| ID | Story | Expected |
|----|-------|----------|
| L2-01 | Click a section in preview → edit panel opens | Right panel shows form fields for that section |
| L2-02 | Click a section in Layers → same thing | Selects in canvas + opens edit panel |
| L2-03 | Edit the hero title text | Type new text → preview updates in real time |
| L2-04 | Edit a section subtitle | Change subtitle → see it update |
| L2-05 | Add a new Gallery section from Elements panel | Click "Gallery" in left panel → section appears at bottom → edit form opens |
| L2-06 | Add a new CTA section | Click "CTA" → section added → form shows title/subtitle/button fields |
| L2-07 | Save changes | Click Save → "Saved" indicator appears |

### Level 3 — Section Management (can I organize my page?)

| ID | Story | Expected |
|----|-------|----------|
| L3-01 | Move a section UP in Layers | Click ↑ on Destinations → it moves above Statistics |
| L3-02 | Move a section DOWN in Layers | Click ↓ → section swaps position |
| L3-03 | Duplicate a section | Click Duplicate on a section → copy appears below |
| L3-04 | Hide a section temporarily | Click Eye → section hidden (opacity reduced in layers) |
| L3-05 | Delete a section | Click Delete → confirmation dialog → section removed |
| L3-06 | Use the overlay toolbar on canvas | Hover a section in preview → toolbar appears with move/duplicate/delete |
| L3-07 | Undo an action | After deleting, press Ctrl+Z or click Undo → section restored |

### Level 4 — Advanced Flows (power user stuff)

| ID | Story | Expected |
|----|-------|----------|
| L4-01 | Search for "hotel" in Elements | Search filters to show only Hotel-related sections |
| L4-02 | Filter Elements by category | Click "Travel" tab → only Destinations/Hotels/Activities shown |
| L4-03 | Browse theme presets | Click Theme tab → see 8 tourism presets with color swatches |
| L4-04 | Use Shuffle to try random theme | Click Shuffle → a preset gets selected |
| L4-05 | Open AI chat panel | Click AI tab → chat interface loads |
| L4-06 | Open SEO panel | Click SEO tab → score/meta/keywords panel loads |
| L4-07 | Preview the live site | Click Preview → new tab opens with published site |
| L4-08 | Publish the page | Click Publish → publishing indicator → success |
| L4-09 | Edit a custom page (not homepage) | Navigate to a custom page editor → it loads with its sections |
| L4-10 | Toggle dark mode | Click Dark/Light → editor theme switches |
| L4-11 | Collapse/expand left panel | Click toggle → panel hides/shows, canvas expands |
| L4-12 | Collapse/expand right panel | Press `\` or click toggle → panel hides/shows |
| L4-13 | Keyboard shortcut Cmd+S | Press Cmd+S → triggers save |

---

## 3. TESTING LOOP (organic exploration)

For each cycle:

### 3.1 PLAN — Pick 3-5 stories to test
- Prioritize: untested → failed → lowest scored
- Group related stories (e.g., L2-01 + L2-03 + L2-04 = "edit a section end to end")
- Announce: "Cycle N: Testing [story IDs] — [human description of what Diana is trying to do]"

### 3.2 NAVIGATE — Go where Diana would go
Use Playwright for navigation (reliable auto-waiting):
```
mcp__playwright__browser_navigate { "url": "http://localhost:3000/dashboard/..." }
mcp__playwright__browser_wait_for { "selector": "[data-testid='page-editor']", "timeout": 10000 }
```

### 3.3 SCREENSHOT — Capture the current state
Take a screenshot at EACH of these moments:
- **Before action**: What Diana sees before clicking
- **During action**: The intermediate state (modal open, hover effect, form filling)
- **After action**: The result of the action

```
mcp__playwright__browser_screenshot { "filename": "qa-screenshots/cycle{N}_{storyId}_{moment}.png" }
```

If screenshots fail, use `browser_snapshot` (accessibility tree text) instead and note "screenshot unavailable".

### 3.4 ACT — Do what Diana would do
Use Playwright for all user interactions:
```
mcp__playwright__browser_click { "selector": "..." }
mcp__playwright__browser_fill  { "selector": "input[name='title']", "value": "New text" }
mcp__playwright__browser_hover { "selector": ".section-card" }
mcp__playwright__browser_press_key { "key": "Meta+s" }
mcp__playwright__browser_resize { "width": 375, "height": 667 }  // mobile
mcp__playwright__browser_handle_dialog { "action": "accept" }
```

### 3.5 OBSERVE — What happened?
After each action, capture with BOTH layers:

**Playwright** (interaction state):
```
mcp__playwright__browser_console_messages   // JS errors from this session
mcp__playwright__browser_network_requests   // API calls triggered
mcp__playwright__browser_evaluate { "script": "document.querySelector('.save-badge')?.textContent" }
```

**Chrome DevTools** (deeper diagnostics if needed):
```
mcp__chrome-devtools__list_console_messages { "types": ["error"] }
mcp__chrome-devtools__list_network_requests  // failed requests
```

### 3.6 JUDGE — Score each story

For EACH story tested, score 4 dimensions (0-100):

| Dimension | What to evaluate |
|-----------|-----------------|
| **Functional** | Does it work? Does the action produce the expected result? |
| **Visual** | Does it look right? Alignment, spacing, colors, contrast, readability |
| **Responsive** | Does it adapt? Test at desktop AND mobile if relevant |
| **UX Flow** | Is it intuitive? Would Diana figure it out without help? Feedback, affordances, state indicators |

**Story score** = average of 4 dimensions.

### 3.7 UX/UI ANALYSIS — After each screenshot

For each screenshot or snapshot, write a brief UX analysis:

```markdown
### Screenshot: cycle{N}_{storyId}_{moment}

**What Diana sees**: [describe the visual state in 1-2 sentences]

**UX Positives** (+):
- [thing that works well]
- [good affordance, feedback, or visual cue]

**UX Issues** (-):
- [problem: description] → [severity: critical/major/minor/cosmetic] → [file:line if known]

**UI Check**:
- [ ] Contrast: text readable against background
- [ ] Spacing: consistent padding/margins
- [ ] Alignment: elements aligned to grid
- [ ] Feedback: action has visual confirmation (toast, highlight, state change)
- [ ] Affordance: interactive elements look clickable/draggable
- [ ] Consistency: matches the rest of the Studio UI
```

### 3.8 FIX — If score < 70, fix immediately
- Read the relevant source code
- Apply minimal fix
- Re-test the story
- Log before/after score

### 3.9 LEARN — Record what you discovered
After each cycle, append to the cycle log:

```markdown
## Cycle N — "[what Diana tried to do]"
Stories: [IDs tested]
Duration: ~Xmin

### Results
| Story | Func | Visual | Resp | UX | Score | Status |
|-------|------|--------|------|----|----|--------|
| L2-01 | 90 | 85 | 80 | 75 | 82 | PASS |
| L2-03 | 100 | 90 | - | 95 | 95 | PASS |
| L3-05 | 0 | - | - | - | 0 | FAIL — no confirm dialog |

### Issues Found
1. [description] → [severity] → [file:line] → [status: fixed/deferred]

### UX Insights
- [observation about the overall experience]

### Next Cycle Priority
- [what to test next based on what was discovered]
```

---

## 4. LOOP TERMINATION

Stop when ANY of:
- All L1-L3 stories score ≥ 80
- `max_cycles` reached
- `budget_minutes` exceeded
- 3 consecutive cycles with no new issues found

---

## 5. ERROR STATE SIMULATION (`errors` mode + optional in full loop)

Use Playwright's route interception to simulate real failure scenarios. Run as a dedicated pass or weave into full loop at L4.

### E1 — Supabase save failure
```
mcp__playwright__browser_route {
  "url": "**/api/websites/*/sections",
  "method": "PATCH",
  "response": { "status": 500, "body": "{\"error\":\"Internal Server Error\"}" }
}
```
Expected: Error toast appears, unsaved changes preserved, no data loss.

### E2 — AI generation timeout
```
mcp__playwright__browser_route {
  "url": "**/api/ai/**",
  "response": { "status": 504, "body": "{\"error\":\"Gateway Timeout\"}" }
}
```
Expected: AI chat shows friendly error, retry option visible, editor not locked.

### E3 — Slow network (image loading)
```
mcp__playwright__browser_route {
  "url": "**/*.{jpg,jpeg,png,webp}",
  "delay": 3000
}
```
Expected: Skeleton loaders or placeholders shown, no layout shift.

### E4 — Auth token expired (401)
```
mcp__playwright__browser_route {
  "url": "**/rest/v1/**",
  "response": { "status": 401, "body": "{\"message\":\"JWT expired\"}" }
}
```
Expected: Redirect to login or session refresh, no white screen.

### E5 — Theme publish failure
```
mcp__playwright__browser_route {
  "url": "**/api/websites/*/publish",
  "response": { "status": 503, "body": "{\"error\":\"Service unavailable\"}" }
}
```
Expected: Publish button shows error state, user can retry.

After each error test → `mcp__playwright__browser_unroute` to reset routes.

Score each error state on: **Graceful degradation** (0-100) + **User feedback clarity** (0-100).

---

## 6. FINAL REPORT

After all cycles, output:

```markdown
# QA Next.js Studio — Final Report
**Date**: YYYY-MM-DD
**Cycles**: N completed
**Website tested**: $SUBDOMAIN

## Overall Score: XX/100

## Story Scores (sorted by score ascending)
| Story | Description | Score | Status |
|-------|------------|-------|--------|
| L3-05 | Delete a section | 45 | FAIL |
| L2-01 | Click section → edit | 82 | PASS |
| ... | ... | ... | ... |

## Coverage
- L1 (First Impressions): X/5 tested, avg score XX
- L2 (Basic Editing): X/7 tested, avg score XX
- L3 (Section Management): X/7 tested, avg score XX
- L4 (Advanced Flows): X/13 tested, avg score XX

## Error State Coverage
| Scenario | Graceful | Feedback | Status |
|----------|----------|----------|--------|
| E1 Save failure | 90 | 80 | PASS |
| E2 AI timeout | 0 | - | FAIL |

## Critical Issues (must fix before release)
1. [issue + file:line]

## Major Issues (should fix)
1. [issue + file:line]

## Minor / Cosmetic
1. [issue]

## UX Recommendations (top 5)
1. [recommendation — what to improve and why]
2. ...

## Comparison with Elementor Expectations
| Feature | Elementor | Bukeer Studio | Gap |
|---------|-----------|---------------|-----|
| Drag to canvas | Drag from sidebar | Click to add | Medium — no visual drop |
| Inline editing | Click text → edit in place | Edit in side panel | Minor — different paradigm |
| Section reorder | Drag in navigator | Up/Down buttons | Minor — functional |
| ... | ... | ... | ... |

## Screenshots
[List all screenshots taken with cycle/story reference]
```

---

## 7. SCAN MODE (read-only)

Navigate through ALL pages without interacting:
1. Dashboard pages list → screenshot
2. Homepage editor → screenshot (full page scroll)
3. Layers panel → screenshot
4. Theme panel → screenshot
5. AI panel → screenshot
6. SEO panel → screenshot
7. Mobile viewport (`browser_resize { width: 375, height: 667 }`) → screenshot
8. Custom page editor → screenshot

For each screenshot: UX analysis (section 3.7). No fixes.

---

## 8. FIX MODE

1. Read `qa-nextjs-results.tsv` for issues with status=open
2. For each issue (severity order: critical → major → minor):
   - Read source file
   - Apply minimal fix
   - TypeScript check
   - Re-test the story
   - Update status
3. Stop at `max_cycles` fixes

---

## 9. TYPECHECK / BUILD MODE

**typecheck**: `npx tsc --noEmit 2>&1`
- Categorize: new files vs pre-existing vs tests
- Output error count per category

**build**: `npm run build 2>&1`
- Check success/failure, bundle size, missing env vars

---

## 10. RESULTS FILE

Append to `qa-nextjs-results.tsv`:
```tsv
timestamp	story_id	description	func	visual	resp	ux	score	issues	cycle	status
2026-04-12T01:00:00	L2-01	Click section to edit	90	85	80	75	82	0	1	pass
```

---

## 11. KEY FILES TO MONITOR

**Editor (new Elementor-like layout)**:
- `components/studio/page-editor.tsx` — Main 3-panel editor
- `components/studio/left-panel/panel-shell.tsx` — Left panel (Elements/Layers/Theme/AI tabs)
- `components/studio/left-panel/sections-grid.tsx` — Elements grid with icons + click-to-add
- `components/studio/left-panel/navigator.tsx` — Layers list with move up/down
- `components/studio/left-panel/theme-quick-editor.tsx` — Theme presets + shuffle
- `components/editor/canvas-frame.tsx` — Responsive viewport + scale wrapper
- `components/studio/section-overlay.tsx` — Hover/select overlay on canvas

**Editor (existing, unchanged)**:
- `components/studio/section-form.tsx` — Dynamic form per section type
- `components/studio/section-picker.tsx` — Modal section picker (fallback)
- `components/studio/studio-chat.tsx` — AI chat panel
- `components/studio/seo-panel.tsx` — SEO scoring panel
- `components/studio/ui/primitives.tsx` — Studio design system

**Lib**:
- `lib/studio/section-fields.ts` — Field definitions per section type
- `lib/studio/section-actions.ts` — Immutable section mutations

**Route**:
- `app/dashboard/[websiteId]/pages/[pageId]/edit/page.tsx` — Editor route

---

## 12. INTERACTION PATTERNS (how things work)

Understanding these prevents false negatives:

| Action | Mechanism | Expected Behavior |
|--------|-----------|-------------------|
| Add section from Elements | Click card → `handleAddSection()` | Section added at END, form opens |
| Select section | Click in canvas OR click name in Layers | Right panel → Edit tab with form |
| Move section | ↑/↓ buttons in Layers OR overlay toolbar | Section swaps position, toast shown |
| Edit field | Type in right panel form | Hot-patch iframe DOM + dirty state |
| Save | Click Save / Cmd+S / autosave (2s) | "Saved" badge in topbar |
| Publish | Click Publish | Creates draft → publishes version |
| Back | Click ← arrow (top-left) | Navigates to pages list, cleans fullscreen class |
| Viewport | Click Desktop/Tablet/Mobile | Canvas rescales, dimensions text updates |
| Collapse panels | Click toggle icons or press `\` | Panel animates to 0 width |
| Undo/Redo | Click buttons or Ctrl+Z / Ctrl+Shift+Z | Reverts/reapplies last section change |

---

## 13. COMMON FALSE POSITIVES (ignore these)

- Hydration mismatch in WavyBackground (Math.random in SSR) — pre-existing
- M3ThemeProvider type warnings — pre-existing
- Radix/base-ui console warnings — expected
- `@puckeditor/core` still in deps — legacy, intentional
- Cloudflare DurableObject warnings in dev — expected
