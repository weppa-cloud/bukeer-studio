# MODE: TASK — Pre-Implementation TVB

## Input

| Parameter | Required | Description |
|-----------|----------|-------------|
| Task description | **YES** | Feature request, bug report, enhancement description |
| Task type | Auto-detected | FEATURE / BUGFIX / ENHANCEMENT / REFACTOR |
| Domain | Auto-detected | Area (sections, theme, dashboard, public-site, api, editor, etc.) |

## When to Use

- Before writing ANY code for a feature
- Before fixing any non-trivial bug
- Before any enhancement or refactor

## Activation Rules

| Task Type | TVB Required? | Reason |
|-----------|---------------|--------|
| New feature (any size) | **YES** | Must validate architecture alignment |
| Bug fix (logic/state) | **YES** | Must identify root cause patterns |
| Enhancement/refactor | **YES** | Must verify no regression paths |
| UI component (<300 LOC, no logic) | **YES (lite)** | Token + contract validation only |
| Trivial fix (typo, copy, single-line) | **NO** | No architectural impact |
| Documentation only | **NO** | No code impact |
| Pure research/exploration | **NO** | No implementation |

## TVB Generation Protocol

### Phase 1: Task Analysis
1. **Classify**: Feature / Bugfix / Enhancement / Refactor
2. **Complexity**: Simple (1 file) / Moderate (2-3 files) / Complex (3+ files)
3. **Domain**: Which area of the app?

### Phase 2: ADR Scan
Scan all ADRs in `docs/architecture/` and flag applicable ones (same table as PLAN mode — see [PLAN_MODE.md](PLAN_MODE.md) Step 2).

### Phase 3: Context Gathering
1. **Recent Commits**: `git log --oneline -20` filtered by domain keywords
2. **Impact Files**: Files that will be created/modified
3. **Integration Points**: Components, API routes, Supabase queries affected
4. **Existing Patterns**: Similar implementations to follow

### Phase 4: Pattern Checklist

**Data Access Patterns**:
- [ ] Supabase SSR client via `createClient()` from `@/lib/supabase/server`
- [ ] Zod validation for all external data (DB responses, API inputs)
- [ ] Types from `@bukeer/website-contract` for shared data models
- [ ] Error handling with try/catch and appropriate error responses
- [ ] Service role key only in server-side code (API routes, Server Actions)

**Component Patterns**:
- [ ] Server Components by default (RSC-first per ADR-001)
- [ ] `'use client'` only when hooks, event handlers, or browser APIs needed
- [ ] Props drilling minimized — use server-side data fetching
- [ ] Suspense boundaries for async components
- [ ] Error boundaries (error.tsx) for route segments

**Design System Compliance**:
- [ ] shadcn/ui primitives first (Button, Card, Dialog, Input, etc.)
- [ ] Colors via CSS variables: `var(--primary)`, `var(--surface)` — NEVER hardcoded hex/rgb
- [ ] Typography via Tailwind classes: `text-sm`, `font-semibold` — NEVER inline styles
- [ ] Dark mode via `dark:` prefix classes (automatic with next-themes)
- [ ] Use `cn()` utility for conditional class merging

**Token System**:
- [ ] Spacing: Tailwind utilities (`p-4`, `gap-6`, `space-y-2`, etc.)
- [ ] Border radius: Tailwind classes (`rounded-md`, `rounded-lg`, `rounded-xl`)
- [ ] Shadows: Tailwind classes (`shadow-sm`, `shadow-md`, `shadow-lg`)
- [ ] Animations: Framer Motion for complex, Tailwind `animate-*` for simple
- [ ] Theme presets: `@bukeer/theme-sdk` presets when theme-related

**Section System**:
- [ ] Section types from `SECTION_TYPES` constant — NEVER hardcoded strings
- [ ] Content validated against Zod schemas from `@bukeer/website-contract`
- [ ] Section registry checked for existing types before adding new ones
- [ ] Normalization via `normalizeContent()` for backward compatibility

**Edge Compatibility (ADR-007)**:
- [ ] No Node-only APIs (`fs`, `path`, `child_process`)
- [ ] Web-standard APIs preferred (Fetch, URL, crypto.subtle)
- [ ] Dynamic imports for heavy dependencies
- [ ] Bundle size aware — no massive imports in edge runtime

**Quality Gates**:
- [ ] `npx tsc --noEmit` → 0 type errors
- [ ] `npm run lint` → 0 lint errors
- [ ] `npm run build` → successful production build
- [ ] Playwright E2E if applicable

### Phase 5: TVB Output

```
══════════════════════════════════════════════════════════
 TECHNICAL VALIDATION BRIEF (TVB)
 Task: [Concise task description]
 Type: [FEATURE|BUGFIX|ENHANCEMENT|REFACTOR] | Complexity: [Simple|Moderate|Complex]
 Domain: [sections|theme|dashboard|public-site|api|editor|auth|other]
══════════════════════════════════════════════════════════

## 1. ADRs Aplicables
 - ADR-XXX (Topic) → [Why it applies and what to respect]
 - ADR-XXX (Topic) → [Why it applies and what to respect]

## 2. Commits Recientes Relevantes
 - [hash] → [description] (verificar [specific aspect])
 - [hash] → [description] (alinearse con [specific pattern])

## 3. Archivos de Impacto
 - [file_path] ([create|modify|review] — [reason])
 - [file_path] ([create|modify|review] — [reason])

## 4. Patrones Obligatorios
 ✓ [Pattern name] → [Specific application to this task]
 ✓ [Pattern name] → [Specific application to this task]
 ✗ [Anti-pattern to avoid] → [Why it's risky here]

## 5. Design System / Tokens
 ### Components
 ✓ [shadcn/ui component to use OR existing site component]
 ✗ [Component to AVOID — e.g., custom button → use shadcn Button]

 ### Tokens Required
 - Colors: [Specific CSS vars — e.g., var(--primary) for CTA buttons]
 - Typography: [Specific Tailwind classes — e.g., text-lg font-semibold for headers]
 - Spacing: [Specific Tailwind utilities — e.g., p-6 gap-4 for card layout]
 - Shadows: [Specific shadow class — e.g., shadow-md for cards]
 - Border Radius: [Specific class — e.g., rounded-xl for containers]

 ### Reusability
 - Location: [components/ui/ | components/site/ | components/editor/ | components/admin/]
 - Existing component: [path to reusable component, or "new"]
 - DRY check: [Is similar code elsewhere? Reference file:line]

 ### Dark Mode
 ✓ [Automatic if CSS vars + dark: prefix used / Manual check needed if...]

## 6. Integraciones a Verificar
 - [Integration point] → [What to check]
 - [Integration point] → [What to check]

## 7. Quality Gates
 □ npx tsc --noEmit → 0 type errors
 □ npm run lint → 0 lint errors
 □ npm run build → success
 □ [Specific test requirements]
 □ [E2E if applicable]

══════════════════════════════════════════════════════════
```

## TVB Lite (for simple UI components)

For standalone UI components (<300 LOC, no business logic):

```
══════════════════════════════════════════════════════════
 TVB LITE | [Component name]
 Type: UI COMPONENT | LOC estimate: [n]
══════════════════════════════════════════════════════════

 ## Design System Compliance
 shadcn/ui Base: [Yes → extend existing | No → custom with justification]
 Component: [shadcn/ui component name or existing component to extend]

 ## Token Usage (MANDATORY — no hardcoded values)
 Colors:       [CSS variables to use]
 Typography:   [Tailwind text/font classes]
 Spacing:      [Tailwind padding/margin/gap utilities]
 Shadows:      [Tailwind shadow class if applicable]
 Border Radius:[Tailwind rounded class]
 Animation:    [Framer Motion or Tailwind animate-* if applicable]

 ## Reusability Assessment
 Location: [components/ui/ | components/site/ | components/editor/]
 Similar Existing: [Path to similar component, or "none found"]
 Parametrized: [Yes/No — must accept props, not hardcode]

 ## Quality
 Dark Mode:      [Auto ✓ if CSS vars + dark: prefix used]
 Accessibility:  [aria-label, contrast ratio, focus management]
 RSC Compatible: [Server component? Or needs 'use client'?]
 Max LOC:        [Must be <300 — split if larger]

══════════════════════════════════════════════════════════
```
