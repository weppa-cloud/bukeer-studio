# MODE: PLAN — Plan/PRD Validation

## Input

| Parameter | Required | Description |
|-----------|----------|-------------|
| Plan content | **YES** | PRD text, plan document, feature proposal, or path to .md file |
| Domain | Auto-detected | Area the plan belongs to (sections, theme, dashboard, public-site, etc.) |

## When to Use

- Before starting implementation of any PRD
- When reviewing a feature proposal
- When validating an architectural design document
- When a developer submits a plan for approval

## Validation Protocol

### Step 1: Parse Plan Scope
- Extract: features described, components mentioned, API routes involved, data models
- Identify: affected modules, estimated file count, complexity level

### Step 2: ADR Compliance Check
Scan the plan against ALL applicable ADRs in `docs/architecture/`:

| ADR | Topic | Check |
|-----|-------|-------|
| ADR-001 | Server-First Rendering | Does plan use RSC by default? Is `'use client'` only where needed? |
| ADR-002 | Error Handling | Does plan include error boundaries and structured error handling? |
| ADR-003 | Contract-First Validation | Does plan validate data with Zod schemas? Uses `@bukeer/website-contract`? |
| ADR-004 | State Management | Does plan use appropriate state strategy (server vs client, URL params)? |
| ADR-005 | Security Defense-in-Depth | Are secrets server-only? RLS policies considered? Input sanitized? |
| ADR-006 | AI Streaming | Does AI integration use streaming patterns (Vercel AI SDK)? |
| ADR-007 | Edge-First Delivery | Is it Cloudflare Workers compatible? No Node-only APIs? |
| ADR-008 | Monorepo Packages | Does it respect theme-sdk / website-contract boundaries? |
| ADR-009 | Multi-Tenant Routing | Does subdomain routing go through middleware correctly? |
| ADR-010 | Observability | Does plan include logging/monitoring where appropriate? |
| ADR-011 | Middleware Cache | Does it respect middleware caching patterns? |
| ADR-012 | API Response Envelope | Do API routes use standard response format? |

### Step 3: Design System / Token Validation
- **shadcn/ui Primitives**: Does the plan use existing shadcn/ui components before creating custom ones?
- **CSS Variable Bridge**: Does the plan reference theme tokens via `var(--primary)`, `var(--surface)`, etc.?
- **Tailwind Tokens**: Does the plan use Tailwind utility classes for spacing, typography, borders?
- **Theme SDK Presets**: If theme-related, does it use `@bukeer/theme-sdk` presets and `compileTheme()`?
- **Dark Mode**: Will the plan work in dark mode via `dark:` prefix + `next-themes`?
- **Component Reuse**: Does the plan check `components/ui/` before creating new primitives?

### Step 4: Recent Context Check
- `git log --oneline -20 --grep="[domain]"` — Are there recent commits the plan should align with?
- `git status -s` — Are there unstaged changes in the same domain?
- Check for in-progress work that may conflict

### Step 5: Generate Compliance Report

```
══════════════════════════════════════════════════════════
 PLAN COMPLIANCE REPORT (PCR)
 Plan: [Plan title/name]
 Verdict: [PASS ✅ | PASS WITH WARNINGS ⚠️ | FAIL ❌]
 Domain: [module] | Complexity: [Simple|Moderate|Complex]
══════════════════════════════════════════════════════════

## ADR Compliance
 ✅ ADR-XXX (Topic) → [How the plan complies]
 ⚠️ ADR-XXX (Topic) → [Partial compliance — what's missing]
 ❌ ADR-XXX (Topic) → [Violation — what must change]

## Design System / Tokens
 ✅ [shadcn/ui component usage is correct]
 ⚠️ [Missing CSS variable usage for X — recommend var(--primary)]
 ❌ [Plan mentions hardcoded colors — must use theme tokens]

## Token System Compliance
 Colors:       [✅ Uses CSS vars | ❌ Hardcoded hex/rgb]
 Typography:   [✅ Uses Tailwind classes | ❌ Custom inline styles]
 Spacing:      [✅ Tailwind utilities | ⚠️ Not specified]
 Shadows:      [✅ Tailwind shadow classes | ⚠️ Not specified]
 Border Radius:[✅ Tailwind rounded classes | ⚠️ Not specified]

## Reusability Assessment
 Existing Components: [List shadcn/ui or site components the plan should reuse]
 New Components Proposed: [List, with location recommendation]
 DRY Risks: [Potential duplication with existing code]

## Commit Context
 Recent Related:
 - [hash] → [description] — [alignment note]
 Potential Conflicts:
 - [unstaged file or in-progress work]

## Recommendations
 1. [Specific actionable recommendation]
 2. [Specific actionable recommendation]

══════════════════════════════════════════════════════════
```
