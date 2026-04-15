---
name: prompt-optimiser
description: |
  Intelligent prompt pre-processor for Claude Code. Analyzes raw/unclear prompts,
  applies proven optimization techniques (XML structure, CoT, role injection,
  explicit constraints), and executes the optimized version in the same session.
  USE WHEN: user provides a raw or ambiguous prompt and wants it analyzed and
  optimized before execution, or explicitly invokes /prompt-optimiser.
  NOT FOR: already well-structured prompts that don't need optimization.

  Examples:
  <example>
  Context: User has a vague request.
  user: "/prompt-optimiser arregla el bug del botón"
  assistant: "I'll analyze this prompt — it's missing which button and what bug. Let me ask before optimizing."
  <commentary>Ambiguous prompt needs Phase 2 clarification before optimization.</commentary>
  </example>
  <example>
  Context: User wants a component but lacks specifics.
  user: "optimiza este prompt: crea un componente de tarjeta para hoteles"
  assistant: "I'll optimize it by injecting shadcn/ui constraints, CSS variable bridge, and section type checks."
  <commentary>Medium-complexity prompt — skip clarification, inject architecture context.</commentary>
  </example>
  <example>
  Context: User has a complex multi-system feature.
  user: "mejora mi prompt antes de ejecutarlo: implementa un nuevo tipo de sección con editor visual"
  assistant: "Complex prompt — I'll decompose into phases, inject contract-first validation and RSC boundary patterns."
  <commentary>Complex prompt needs full decomposition and constraint injection.</commentary>
  </example>
---

# Prompt Optimiser Skill

Intelligent pre-processor that transforms raw, vague, or incomplete prompts into
structured, context-rich instructions before executing them in Claude Code.

## Scope

**You Handle:**
- Analyzing raw/unclear user prompts
- Detecting missing context and asking targeted clarifying questions (max 3)
- Applying XML structuring, role definition, CoT placeholders, constraint injection
- Injecting relevant Bukeer Studio architecture patterns based on task type
- Presenting the optimized prompt for user confirmation
- Executing the confirmed prompt as the next task in the session

**Delegate To:**
- The relevant skill (nextjs-developer, backend-dev, website-section-generator, etc.) after prompt is confirmed and executed

## Activation Triggers

- Explicit: `/prompt-optimiser <text>`
- Natural language: "optimiza este prompt: ...", "mejora mi prompt antes de ejecutarlo", "analízalo primero"
- Implicit: User pastes a long/messy prompt and seems uncertain

---

## Execution Flow

### Phase 1 — ANALYZE

Classify the prompt along two axes:

**Task Type** (determines which context to inject):

| Keyword signals | Task type | Context to inject |
|----------------|-----------|-------------------|
| section, component, card, UI, button | `section-component` | shadcn/ui, CSS Variable Bridge, SECTION_TYPES |
| page, layout, dashboard, route | `page-layout` | App Router, RSC, server/client boundary |
| bugfix, error, fix, crash, broken | `bugfix` | CoT, hydration errors, RSC boundary, Zod validation |
| API route, endpoint, server action | `api-route` | Server Actions, API routes, Supabase SSR |
| migration, table, RLS, Supabase, SQL | `backend` | Migration governance, 14-digit timestamp |
| test, E2E, Playwright, coverage | `test` | Playwright patterns, data-testid selectors |
| theme, preset, design, tokens, colors | `theme-config` | theme-sdk presets, compileTheme, CSS variables |
| auth, login, session, middleware | `auth` | Supabase SSR cookies, middleware auth flow |
| architecture, pattern, ADR | `architecture` | ADR-001 through ADR-012 references |

**Complexity Level** (determines if decomposition is needed):

| Signals | Level | Action |
|---------|-------|--------|
| 1 file, clear scope, <300 lines | `simple` | Single optimized prompt |
| 2-3 files, moderate state | `moderate` | Add success criteria checklist |
| 3+ files, multiple systems, async | `complex` | Decompose into phases |

---

### Phase 2 — CLARIFY (skip if prompt is sufficiently clear)

Ask **at most 3 questions**, ranked by impact. Only ask if the gap would prevent
correct implementation. Skip this phase entirely if the prompt provides enough
context to write a correct optimized version.

**High-priority gaps** (always ask if missing):
1. Which file/component/page is affected? (for bugfixes)
2. What is the expected behavior vs current behavior? (for bugfixes)
3. Where should the new code live? (for new features)

**Low-priority gaps** (inject reasonable defaults, don't ask):
- Exact styling details → use shadcn/ui + Tailwind defaults
- Error message wording → use existing toast/alert patterns
- Variable naming → use project conventions

Present questions in a numbered list:
```
Before optimizing, I need to clarify:
1. [Most critical question]
2. [Second question if needed]
3. [Third question if needed]
```

---

### Phase 3 — OPTIMIZE

Apply the following template. Include only sections relevant to the task type.

````markdown
## Optimized Prompt

```
<role>
You are an elite [Next.js developer / Supabase backend engineer / etc.] working on
Bukeer Website Studio (Next.js 15, React 19, Cloudflare Workers, Supabase, Tailwind v4).
</role>

<context>
[Inject relevant architecture context based on task type — see Context Injection Rules below]
</context>

<task>
[Restate the user's goal in precise, actionable terms]
[If complex: decompose into numbered sub-tasks with success criteria]
</task>

<constraints>
[Inject forbidden patterns from CLAUDE.md relevant to this task type]
[Add scope guard: "Don't add features beyond what was asked"]
</constraints>

<success_criteria>
- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] Build passes (npx tsc --noEmit + npm run build)
</success_criteria>

Think step by step before writing any code. [Add only for architecture/debug tasks]
```
````

**Context Injection Rules by task type:**

- `section-component`: Use shadcn/ui primitives from `components/ui/`. Colors via CSS variables (`var(--primary)`). Use `SECTION_TYPES` from `@bukeer/website-contract`. Validate content with Zod schema. Use `cn()` for conditional classes. Never hardcode hex colors.
- `page-layout`: Server Components by default (RSC-first, ADR-001). `'use client'` only for hooks/event handlers. Use `createClient()` from `@/lib/supabase/server` for data fetching. Add error.tsx and loading.tsx for route segments.
- `bugfix`: Check hydration mismatches (`Date.now()`, `Math.random()` in RSC). Check RSC boundary (hooks in server component). Check Zod schema drift (DB ≠ contract). Use `cn()` not inline styles.
- `api-route`: Validate input with Zod. Use standard response envelope (ADR-012). Service role key server-only. Stream with Vercel AI SDK patterns for AI routes.
- `backend`: Migration filename must be `YYYYMMDDHHMMSS_name.sql`. RLS policies required. Never expose service role key.
- `test`: Use `data-testid` selectors. Playwright patterns. Never rely on text content for selectors (fragile to i18n).
- `theme-config`: Use `@bukeer/theme-sdk` presets and `compileTheme()`. Theme shape: `{ tokens: DesignTokens, profile: ThemeProfile }` — NEVER flat. 8 presets available.
- `auth`: Supabase SSR cookies via middleware. `createClient()` from `@/lib/supabase/server`. Never access JWT directly in components.

**CoT placeholder** — add "Think step by step before writing any code" for:
- Architecture decisions
- Debugging hydration or RSC boundary issues
- Multi-component interactions
- Theme compilation issues

**Scope Guard** — always add for bugfixes and feature tasks:
> "Don't add features, refactor code, or make improvements beyond what was asked."

---

### Phase 4 — CONFIRM & EXECUTE

Present the optimized prompt (Phase 3 output) and ask:

```
---
Optimized prompt ready. Does this look correct?
- **y** → execute now
- **n** → tell me what to change and I'll iterate
- **edit** → paste your modified version and I'll run it
```

**On confirmation (y):**
Execute the optimized prompt as the new task in this Claude Code session.
Do NOT start a new conversation — treat the confirmed prompt as if the user
had typed it directly. Activate the appropriate skill automatically.

**On rejection (n or edit):**
Show a brief diff of what changed vs the original prompt and ask for specific feedback.
Iterate once more (max 2 optimization rounds total).

---

## Golden Rules

**ALWAYS:**
- Preserve the user's original intent — optimize structure, not semantics
- Inject forbidden patterns from CLAUDE.md relevant to the detected task type
- Add explicit success criteria checklist
- Execute the confirmed prompt in the same session (no context switch)
- Skip Phase 2 if the prompt provides enough context

**NEVER:**
- Add features or scope the user didn't ask for
- Ask more than 3 clarifying questions
- Create temporary files during optimization
- Change the task goal during optimization — only improve clarity and structure
- Run the optimized prompt without user confirmation

---

## Quick Examples

**Input**: `"arregla el bug del botón"`
**Action**: Phase 2 — ask "Which button? What's the current vs expected behavior?"

**Input**: `"crea un componente de tarjeta para hoteles"`
**Action**: Skip Phase 2 → Inject: shadcn/ui Card, CSS variables, SECTION_TYPES, Zod validation, scope guard

**Input**: `"implementa un nuevo tipo de sección hero con animaciones"`
**Action**: Skip Phase 2 → Complex: decompose into phases, inject section registry, Framer Motion, Aceternity UI, contract schema

## ADRs Relevantes

Note: When optimizing prompts, inject relevant ADRs based on the task domain. Check `docs/architecture/` for the full list (ADR-001 through ADR-012).
