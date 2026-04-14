---
name: prompt-optimiser
description: |
  Intelligent prompt pre-processor for Codex. Analyzes raw/unclear prompts,
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
  assistant: "I'll optimize it by injecting M3 constraints, ADR-036 semantics, and testKey pattern."
  <commentary>Medium-complexity prompt — skip clarification, inject architecture context.</commentary>
  </example>
  <example>
  Context: User has a complex multi-system feature.
  user: "mejora mi prompt antes de ejecutarlo: implementa búsqueda en tiempo real con paginación"
  assistant: "Complex prompt — I'll decompose into phases, inject ADR-035 and AppServices patterns."
  <commentary>Complex prompt needs full decomposition and constraint injection.</commentary>
  </example>
---

# Prompt Optimiser Skill

Intelligent pre-processor that transforms raw, vague, or incomplete prompts into
structured, context-rich instructions before executing them in Codex.

## Scope

**You Handle:**
- Analyzing raw/unclear user prompts
- Detecting missing context and asking targeted clarifying questions (max 3)
- Applying XML structuring, role definition, CoT placeholders, constraint injection
- Injecting relevant Bukeer architecture patterns based on task type
- Presenting the optimized prompt for user confirmation
- Executing the confirmed prompt as the next task in the session

**Delegate To:**
- The relevant skill (flutter-developer, backend-dev, etc.) after prompt is confirmed and executed

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
| componente, widget, card, UI, botón | `ui-component` | M3 patterns, Design System, ADR-036 |
| pantalla, screen, flujo, flow, navegación | `feature-screen` | GoRouter, AppServices, RBAC |
| bugfix, error, arregla, fix, crash | `bugfix` | CoT, defensive patterns, WASM safety |
| servicio, service, AppService, modelo | `service` | AppServices singleton, typed getters |
| migración, tabla, RLS, Supabase, SQL | `backend` | Migration governance, 14-digit timestamp |
| test, E2E, Patrol, cobertura | `test` | Patrol patterns, ADR-036 selector strategy |
| catálogo, hotel, Catalog V2 | `catalog` | Resolver pattern, feature flags |
| auth, token, JWT | `auth` | ADR-022, callWithAuth boundary |
| paginación, scroll, infinite | `pagination` | ADR-035, appendLastPage |
| arquitectura, patrón, ADR | `architecture` | architecture-analyzer delegation |

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
1. Which file/screen/component is affected? (for bugfixes)
2. What is the expected behavior vs current behavior? (for bugfixes)
3. Where should the new code live? (for new features)

**Low-priority gaps** (inject reasonable defaults, don't ask):
- Exact styling details → use M3 defaults
- Error message wording → use existing BukeerSnackBar patterns
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
You are an elite [Flutter developer / Supabase backend engineer / etc.] working on
the Bukeer travel platform (Flutter 3.37+ Web, Supabase, GoRouter 12.1.3).
</role>

<context>
[Inject relevant architecture context based on task type — see Context Injection Rules below]
</context>

<task>
[Restate the user's goal in precise, actionable terms]
[If complex: decompose into numbered sub-tasks with success criteria]
</task>

<constraints>
[Inject forbidden patterns from AGENTS.md relevant to this task type]
[Add scope guard: "Don't add features beyond what was asked"]
</constraints>

<success_criteria>
- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] Tests pass (flutter analyze + dart_format)
</success_criteria>

Think step by step before writing any code. [Add only for architecture/debug tasks]
```
````

**Context Injection Rules by task type:**

- `ui-component`: Import from `design_system/index.dart`. Use M3 tokens via `context.m3Colors`. Add `Semantics(label: humanText)` wrapper. Include `testKey: ValueKey('entity_screen_element')` param. Never use hardcoded colors.
- `feature-screen`: Use `appServices.serviceName.method()` (NEVER direct instantiation). Check `appServices.authorization.can*()` before privileged ops. Use GoRouter for navigation.
- `bugfix`: Use `SafeMap` extensions for JSON access. WASM-safe casts: `(val as num?)?.toDouble()`. Single `setState` for multiple changes.
- `service`: Use typed model getters (`.currentItineraryModel`, `.selectedHotelModel`). NEVER deprecated dynamic getters. Wrap API calls in `callWithAuth`.
- `backend`: Migration filename must be `YYYYMMDDHHMMSS_name.sql`. Run `./scripts/validate_supabase_migrations.sh`. Never edit `.legacy_allowlist`.
- `test`: Use `ValueKey('entity_screen_element')` selectors. Never `find.bySemanticsLabel()` (fragile to i18n).
- `catalog`: Use `resolveAccountHotelByProductRef()` resolver. Never duplicated list+match pattern.
- `auth`: No `currentJwtToken` in `lib/bukeer/` widgets. Use service `callWithAuth`.
- `pagination`: `pageItems.length < pageSize` check. Use `appendLastPage()`. Always add `.catchError()`.

**CoT placeholder** — add "Think step by step before writing any code" for:
- Architecture decisions
- Debugging complex async flows
- Multi-service interactions
- WASM compatibility issues

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
Execute the optimized prompt as the new task in this Codex session.
Do NOT start a new conversation — treat the confirmed prompt as if the user
had typed it directly. Activate the appropriate skill automatically.

**On rejection (n or edit):**
Show a brief diff of what changed vs the original prompt and ask for specific feedback.
Iterate once more (max 2 optimization rounds total).

---

## Golden Rules

**ALWAYS:**
- Preserve the user's original intent — optimize structure, not semantics
- Inject forbidden patterns from AGENTS.md relevant to the detected task type
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
**Action**: Skip Phase 2 → Inject: M3 tokens, `Semantics`, `testKey`, design_system location, scope guard

**Input**: `"implementa búsqueda en tiempo real con paginación en la pantalla de itinerarios"`
**Action**: Skip Phase 2 → Complex: decompose into phases, inject ADR-035 (pagination), AppServices pattern, CoT placeholder

## ADRs Relevantes

Note: When optimizing prompts, inject relevant ADRs based on the task domain. Check `docs/02-architecture/decisions/` for the full list.
