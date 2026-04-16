# MODE: CODE — Post-Implementation Review

## Input

| Parameter | Required | Description |
|-----------|----------|-------------|
| File paths | **YES** | Paths to files to review (or "all changed files" via `git diff --name-only`) |
| Original task/TVB | Optional | Reference to the TVB or task that motivated the code, for cross-check |

## When to Use

- After completing implementation, before commit
- When reviewing someone else's code
- When auditing existing code for compliance
- As a quality gate before PR

## Review Protocol

### Step 1: Collect Changed Files
```bash
# If reviewing staged changes
git diff --cached --name-only

# If reviewing all changes since branch diverged
git diff main...HEAD --name-only

# If specific files provided
[use provided file paths]
```

### Step 2: Static Analysis
```bash
# Recommended single command (full gate)
npm run tech-validator:code

# Fast local loop (skips lint/build)
npm run tech-validator:code:quick

# TypeScript type checking
npx tsc --noEmit

# Linting
npm run lint

# Production build (catches RSC boundary errors, missing imports)
npm run build
```

### Step 3: Pattern Violation Scan

For each changed file, scan for these violations:

**CRITICAL (must fix before commit):**

| Violation | Pattern to Detect | Fix |
|-----------|-------------------|-----|
| Untyped Supabase response | `.from('table').select()` without Zod validation | Validate with Zod schema from `@bukeer/website-contract` |
| Hardcoded color | `#fff`, `rgb(`, `hsl(` in component code | Use CSS variables: `var(--primary)`, `var(--surface)`, etc. |
| Hardcoded spacing | Inline `style={{ padding: '16px' }}` with literals | Use Tailwind utilities: `p-4`, `gap-6`, `space-y-2` |
| Hardcoded section type | String literal `'hero'` or `'testimonials'` | Use `SECTION_TYPES` from `@bukeer/website-contract` |
| Secret in client | `SUPABASE_SERVICE_ROLE_KEY` in `'use client'` file | Move to server component or API route |
| Hooks in RSC | `useState`, `useEffect` in server component | Add `'use client'` directive or restructure |
| Direct Supabase in middleware | `createClient()` in non-approved middleware path | Use `lib/supabase/middleware.ts` pattern |
| Missing `'use client'` | React hooks used without directive | Add `'use client'` at top of file |
| Flat theme shape | `{ seedColor: ... }` at root of theme object | Use `{ tokens: DesignTokens, profile: ThemeProfile }` |
| Node-only API | `fs`, `path`, `crypto` (Node module) in edge runtime | Use Web APIs or Cloudflare-compatible alternatives |

**WARNING (should fix):**

| Violation | Pattern to Detect | Fix |
|-----------|-------------------|-----|
| Missing error boundary | Page without error.tsx | Add error.tsx for the route segment |
| Raw `cn()` duplication | Same `cn()` pattern repeated 3+ times | Extract to shared component or variant |
| Missing loading state | Async component without loading.tsx or Suspense | Add loading.tsx or wrap in Suspense boundary |
| Large component | Single component file >300 LOC | Split into composition of smaller components |
| Missing Zod validation | API route without input validation | Add Zod schema for request body/params |
| Unused import | Import present but not referenced | Remove unused import |
| DRY violation | Code block duplicated 2+ times | Extract to shared utility or component |

### Step 4: Design Token Compliance Audit

For each component file, verify:

```
File: [path]
┌──────────────────────┬──────────┬─────────────────────────────┐
│ Token Category       │ Status   │ Details                     │
├──────────────────────┼──────────┼─────────────────────────────┤
│ Colors               │ ✅/⚠️/❌ │ [Uses CSS vars / hardcoded] │
│ Typography           │ ✅/⚠️/❌ │ [Uses Tailwind / inline]    │
│ Spacing              │ ✅/⚠️/❌ │ [Uses Tailwind / hardcoded] │
│ Shadows              │ ✅/⚠️/❌ │ [Uses Tailwind classes]     │
│ Border Radius        │ ✅/⚠️/❌ │ [Uses Tailwind / hardcoded] │
│ Dark Mode            │ ✅/⚠️    │ [Auto via dark: / manual]   │
│ Animations           │ ✅/⚠️    │ [Framer Motion / CSS]       │
└──────────────────────┴──────────┴─────────────────────────────┘
```

### Step 5: L10N Compliance Check

- [ ] Dashboard UI in English (no i18n framework needed)
- [ ] Public site respects `website.locale` / `website.language`
- [ ] JSON-LD `inLanguage` reads from DB (not hardcoded `'es'`)
- [ ] Test selectors use `data-testid`, not text content

### Step 6: Generate Code Review Report

```
══════════════════════════════════════════════════════════
 CODE REVIEW REPORT (CRR)
 Files Reviewed: [count]
 Verdict: [PASS ✅ | PASS WITH WARNINGS ⚠️ | FAIL ❌]
══════════════════════════════════════════════════════════

## Critical Violations (must fix)
 ❌ [file:line] — [violation] → [fix instruction]
 ❌ [file:line] — [violation] → [fix instruction]

## Warnings (should fix)
 ⚠️ [file:line] — [issue] → [recommendation]
 ⚠️ [file:line] — [issue] → [recommendation]

## L10N Compliance
 ✅/❌ Dashboard: English-only [compliant]
 ✅/❌ Public site locale: [reads from DB / hardcoded]
 ✅/❌ Test selectors: [data-testid used / text-based found]

## Design Token Compliance
 [Per-file token audit table]

## Reusability Assessment
 New Components: [count] — [appropriate locations?]
 DRY Violations: [count] — [where?]
 Existing shadcn/ui Used: [list of reused components]

## ADR Compliance
 ✅ [ADR-XXX compliant]
 ❌ [ADR-XXX violated at file:line]

## Quality Gate Results
 □ tsc --noEmit: [0 issues / N issues]
 □ npm run lint: [pass / N issues]
 □ npm run build: [pass / fail]
 □ E2E tests: [pass / fail / not run]

## TVB Cross-Check (if TVB was generated)
 [Compare implementation against original TVB checklist]
 Items fulfilled: [N/M]
 Items missed: [list]

══════════════════════════════════════════════════════════
```
