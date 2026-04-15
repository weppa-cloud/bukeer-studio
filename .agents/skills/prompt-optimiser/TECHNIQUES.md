# Prompt Optimiser — Techniques Reference

This file documents the optimization techniques applied by the `prompt-optimiser` skill,
with before/after examples and scoring heuristics.

---

## Technique 1: XML Structuring

Wrap prompt sections in semantic XML tags so the model has clear parse boundaries.

**Before:**
```
Create a hotel card section that shows name, price, and rating. It should follow our design system and be reusable.
```

**After:**
```xml
<role>
You are an elite Next.js developer on the Bukeer Website Studio platform.
</role>

<context>
Design System: shadcn/ui primitives from `components/ui/`
Theme tokens: CSS variables via M3ThemeProvider (`var(--primary)`, `var(--surface)`)
Section types: `SECTION_TYPES` from `@bukeer/website-contract`
Component location: `components/site/sections/`
</context>

<task>
Create a reusable hotel card section component that displays:
- Hotel name (Tailwind `text-lg font-semibold`)
- Price per night (Tailwind `text-sm`, currency formatted)
- Star rating (existing rating component or shadcn/ui Badge)
</task>

<constraints>
- Never hardcode colors — use CSS variables only (`var(--primary)`, etc.)
- Use `cn()` utility for conditional class merging
- Validate content props with Zod schema from `@bukeer/website-contract`
- Component must be <300 lines; no business logic
- Don't add features beyond what was asked
</constraints>

<success_criteria>
- [ ] Component renders correctly with all three data fields
- [ ] CSS variables used (no hardcoded hex/rgb)
- [ ] Zod validation for content props
- [ ] data-testid attributes on interactive elements
- [ ] npx tsc --noEmit: zero issues
</success_criteria>
```

**Why it works:** The model processes each section independently, reducing conflation
between role, context, and constraints. Compliance in format tests shows +100% improvement
with XML structuring vs. flat prose.

---

## Technique 2: Role Definition

Define an expert role specific to the task domain.

**Generic (weak):**
```
Create a database migration for the accounts table.
```

**Role-injected (strong):**
```
<role>
You are an elite Supabase/PostgreSQL backend engineer working on the Bukeer platform,
with deep expertise in Row Level Security (RLS), migration governance, and
production-safe schema changes.
</role>
```

**Role selection guide:**

| Task type | Role to inject |
|-----------|---------------|
| `section-component` | "elite Next.js developer specializing in reusable section components with shadcn/ui and Framer Motion" |
| `page-layout` | "elite Next.js 15 developer specializing in App Router, RSC, and server/client boundaries" |
| `bugfix` | "elite Next.js/React debugger with expertise in hydration, RSC boundaries, and Zod validation" |
| `api-route` | "elite Next.js API developer familiar with Vercel AI SDK, Supabase SSR, and edge runtime" |
| `backend` | "elite Supabase/PostgreSQL backend engineer with RLS and migration expertise" |
| `test` | "elite Playwright testing engineer specializing in Next.js E2E and component testing" |
| `theme-config` | "elite design systems engineer familiar with Bukeer's theme-sdk, CSS Variable Bridge, and M3 presets" |

---

## Technique 3: Task Decomposition (Complex tasks only)

For tasks touching 3+ files or multiple systems, decompose into numbered phases with
intermediate success criteria.

**Before:**
```
Add a new destinations grid section type with Supabase data and theme integration
```

**After (decomposed):**
```xml
<task>
Add a new destinations grid section type with Supabase data and theme integration.

Phase 1 — Contract & Schema:
1. Add `destinations-grid` to `SECTION_TYPES` in `@bukeer/website-contract`
2. Define Zod schema for section content (title, destinations array, layout variant)
3. Export types for the section props

Phase 2 — Component Implementation:
4. Create `DestinationsGridSection` in `components/site/sections/`
5. Use shadcn/ui Card + CSS variables for theme integration
6. Add Framer Motion entrance animations
7. Responsive grid: 1 col mobile, 2 col tablet, 3 col desktop

Phase 3 — Registry & Rendering:
8. Register new section type in `lib/sections/section-registry.tsx`
9. Add normalization rules in `normalizeContent()` for backward compatibility
10. Test rendering on public site via subdomain

Success gate: each phase must pass `npx tsc --noEmit` before proceeding.
</task>
```

**Trigger decomposition when:**
- 3+ files will be modified
- Multiple layers involved (schema + component + registry)
- Supabase data + frontend rendering
- Theme integration across multiple components

---

## Technique 4: Constraint Injection

Automatically inject forbidden patterns and required patterns from AGENTS.md
relevant to the detected task type. This prevents the most common mistakes.

**Constraint blocks by task type:**

### section-component constraints
```xml
<constraints>
- Use shadcn/ui primitives from `components/ui/` as base
- Colors via CSS variables: `var(--primary)`, `var(--surface)` — no hardcoded hex/rgb
- Use `cn()` from `@/lib/utils` for conditional class merging
- Validate section content with Zod schema from `@bukeer/website-contract`
- Use `SECTION_TYPES` constant — never hardcode section type strings
- Add `data-testid` on interactive elements
- Don't add features beyond what was asked
</constraints>
```

### page-layout constraints
```xml
<constraints>
- Server Components by default — `'use client'` ONLY for hooks/event handlers/browser APIs
- Use `createClient()` from `@/lib/supabase/server` for data fetching
- Never import `useEffect`, `useState` in server components
- Add error.tsx and loading.tsx for route segments
- Use `cn()` for conditional classes — never inline style objects
- Don't add features beyond what was asked
</constraints>
```

### bugfix constraints
```xml
<constraints>
- Check hydration: no `Date.now()`, `Math.random()`, or `window` in RSC
- Check RSC boundary: no hooks (`useState`, `useEffect`) in server components
- Check Zod schema: ensure DB response matches `@bukeer/website-contract` types
- Don't refactor code beyond the bug fix scope
- Don't add error handling for scenarios that can't happen
</constraints>
```

### backend constraints
```xml
<constraints>
- Migration filename: `YYYYMMDDHHMMSS_name.sql` (14-digit UTC timestamp)
- NEVER create 8-digit migration files (`YYYYMMDD_name.sql`)
- RLS policies required for new tables
- Service role key NEVER in client-side code
- Theme shape: `{ tokens: DesignTokens, profile: ThemeProfile }` — never flat
</constraints>
```

### api-route constraints
```xml
<constraints>
- Validate all input with Zod schemas
- Use standard response envelope format (ADR-012)
- Service role key only in server-side API routes
- Stream AI responses with Vercel AI SDK patterns
- Edge-compatible: no Node-only APIs (ADR-007)
</constraints>
```

---

## Technique 5: Chain-of-Thought (CoT) Placeholder

Add explicit CoT instruction for tasks requiring reasoning before coding.

**Add "Think step by step before writing any code" when:**
- Debugging hydration or RSC boundary issues
- Architecture decisions (where to put code, RSC vs client)
- Multi-component interactions
- Theme compilation or CSS variable resolution issues
- Choosing between patterns (e.g., Server Action vs API route)

**Don't add CoT for:**
- Simple UI components (clear implementation path)
- Straightforward CRUD operations
- Formatting/styling tasks

**Example placement:**
```xml
<task>
Debug why the hero section shows unstyled on the public site but works in the editor.
</task>

Think step by step before writing any code:
1. Check if M3ThemeProvider wraps the public site render path
2. Verify CSS variables are injected (inspect var(--primary) in browser)
3. Check if theme data is fetched from Supabase on the public site route
4. Compare the editor and public site rendering pipelines
```

---

## Technique 6: Scope Guard

Prevent over-engineering by making the constraint explicit.

**Always append for bugfix and feature tasks:**
```
Don't add features, refactor surrounding code, or make improvements beyond what was asked.
Fix only what's broken / implement only what was specified.
```

**Why:** Codex tends to "improve" adjacent code, add error handling for impossible
cases, and add abstractions for one-time operations. The explicit scope guard cuts this
significantly.

---

## Prompt Quality Scoring Heuristic

Score a prompt 0-10 before and after optimization. Target: ≥7 after optimization.

| Dimension | 0 | 1 | 2 |
|-----------|---|---|---|
| **Role clarity** | No role | Generic role | Expert + domain-specific |
| **Task precision** | Vague goal | Goal stated | Goal + acceptance criteria |
| **Context richness** | No context | File/module named | File + pattern + constraints |
| **Scope control** | Unbounded | Implied scope | Explicit scope guard |
| **Success verifiable** | Can't verify | Vague outcome | Checkboxes + tooling check |

**Score interpretation:**
- 0-3: Needs Phase 2 clarification + full optimization
- 4-6: Skip Phase 2, apply optimization with constraint injection
- 7-10: Prompt is already well-structured — either run directly or make minor additions

---

## Common Anti-Patterns to Fix

| Anti-pattern | Fix |
|-------------|-----|
| "Arregla el error" | Ask which file/behavior, then inject CoT + bugfix constraints |
| "Crea un componente" | Inject shadcn/ui base + CSS variables + Zod validation template |
| "Implementa X como en Y" | Resolve "Y" to a real file path before optimizing |
| "Optimiza el rendimiento" | Ask which metric, then scope to specific bottleneck |
| "Haz lo que necesites" | Refuse open-ended scope — ask for specific deliverable |
| Nested feature requests | Decompose into sequential phases, validate each |
