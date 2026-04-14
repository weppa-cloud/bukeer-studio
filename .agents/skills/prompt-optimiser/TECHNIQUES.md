# Prompt Optimiser — Techniques Reference

This file documents the optimization techniques applied by the `prompt-optimiser` skill,
with before/after examples and scoring heuristics.

---

## Technique 1: XML Structuring

Wrap prompt sections in semantic XML tags so the model has clear parse boundaries.

**Before:**
```
Create a hotel card component that shows name, price, and rating. It should follow our design system and be reusable.
```

**After:**
```xml
<role>
You are an elite Flutter UI engineer on the Bukeer platform.
</role>

<context>
Design System: import from `package:bukeer/design_system/index.dart`
M3 tokens: `context.m3Colors`, `context.m3TextTheme`
Component location: `lib/bukeer/design_system/components/`
</context>

<task>
Create a reusable `BukeerHotelCard` widget that displays:
- Hotel name (M3 titleMedium)
- Price per night (M3 labelLarge, currency formatted)
- Star rating (existing `BukeerRatingDisplay` widget)
</task>

<constraints>
- Never hardcode colors — use M3 tokens only
- Add `Semantics(label: hotelName)` wrapper for accessibility (ADR-036)
- Include `testKey` parameter of type `Key?` for Patrol selectors
- Component must be <300 lines; no business logic
- Don't add features beyond what was asked
</constraints>

<success_criteria>
- [ ] Widget renders correctly with all three data fields
- [ ] M3 tokens used (no hardcoded Color())
- [ ] Semantics wrapper present
- [ ] testKey parameter accepted
- [ ] flutter analyze: zero issues
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
| `ui-component` | "elite Flutter UI engineer on the Bukeer platform" |
| `feature-screen` | "elite Flutter developer specializing in GoRouter navigation and AppServices" |
| `bugfix` | "elite Flutter/Dart debugger with WASM expertise" |
| `service` | "elite Dart service architect familiar with Bukeer's AppServices singleton pattern" |
| `backend` | "elite Supabase/PostgreSQL backend engineer with RLS and migration expertise" |
| `test` | "elite Flutter testing engineer specializing in Patrol E2E and unit testing" |
| `catalog` | "elite Flutter developer familiar with Bukeer's Catalog V2 three-table architecture" |

---

## Technique 3: Task Decomposition (Complex tasks only)

For tasks touching 3+ files or multiple systems, decompose into numbered phases with
intermediate success criteria.

**Before:**
```
Implement real-time search with pagination on the itineraries screen
```

**After (decomposed):**
```xml
<task>
Implement real-time search with pagination on the itineraries screen.

Phase 1 — Search state wiring:
1. Add `_searchQuery` state variable to `ItinerariesWidget`
2. Connect `BukeerSearchBar` `onChanged` to `_handleSearchChanged()`
3. Store query in `UiStateService` via `appServices.uiState.setSearchQuery()`

Phase 2 — Pagination integration:
4. Update `_fetchPage()` to pass current search query to API call
5. Call `controller.refresh()` in `_handleSearchChanged()` to reset page to 0
6. Initialize controller in `initState()` — NOT in `build()` (ADR-024)

Phase 3 — Last-page detection (ADR-035):
7. Use `pageItems.length < _defaultPageSize` (not `isNotEmpty`) to detect last page
8. Call `appendLastPage()` on final page, `appendPage()` otherwise
9. Add `.catchError((e) { controller.error = e; })` handler

Success gate: each phase must pass `flutter analyze` before proceeding.
</task>
```

**Trigger decomposition when:**
- 3+ files will be modified
- Multiple service layers involved (UI + service + backend)
- Async state management across screens
- Pagination or infinite scroll

---

## Technique 4: Constraint Injection

Automatically inject forbidden patterns and required patterns from CLAUDE.md
relevant to the detected task type. This prevents the most common mistakes.

**Constraint blocks by task type:**

### ui-component constraints
```xml
<constraints>
- Import from `package:bukeer/design_system/index.dart` only
- Use M3 tokens: `context.m3Colors`, `context.m3TextTheme` — no hardcoded Color()
- Wrap interactive component in `Semantics(label: humanReadableText, button: true)`
- For form fields: use `Semantics(explicitChildNodes: true)` — NO label: parameter
- Accept `testKey: Key?` parameter and wrap with `KeyedSubtree(key: testKey!)` if non-null
- Never wrap Semantics with Tooltip — put Tooltip inside ExcludeSemantics
- Don't add features beyond what was asked
</constraints>
```

### feature-screen constraints
```xml
<constraints>
- Use `appServices.serviceName.method()` — NEVER instantiate services directly
- Check `appServices.authorization.can*()` before ANY privileged operation
- Use typed model getters: `.currentItineraryModel`, `.selectedHotelModel` (not deprecated dynamic getters)
- NEVER use `currentJwtToken` in widgets — API calls go through service `callWithAuth`
- Initialize controllers in `initState()` — NEVER in `build()`
- Use single `setState(() { _a=1; _b=2; })` — never multiple sequential setState calls
- Don't add features beyond what was asked
</constraints>
```

### bugfix constraints
```xml
<constraints>
- WASM-safe casts: `(val as num?)?.toDouble()` — NEVER `val as double?`
- JSON access: `json.getString('key')`, `json.getDouble('key')` via SafeMap — NEVER `data['key']!`
- Single setState for all state changes
- Don't refactor code beyond the bug fix scope
- Don't add error handling for scenarios that can't happen
</constraints>
```

### backend constraints
```xml
<constraints>
- Migration filename: `YYYYMMDDHHMMSS_name.sql` (14-digit UTC timestamp)
- Run `./scripts/validate_supabase_migrations.sh` before commit
- NEVER create 8-digit migration files (`YYYYMMDD_name.sql`)
- NEVER edit `supabase/migrations/.legacy_allowlist`
- For DROP+CREATE functions: dump current body from production first
- Add `DEPENDS ON:` header listing prior migrations
</constraints>
```

### pagination constraints
```xml
<constraints>
- Last-page check: `pageItems.length < _defaultPageSize` — NEVER `isNotEmpty`
- Call `appendLastPage(items)` on last page — NEVER `appendPage(items, null)`
- Always add `.catchError((e) { controller.error = e; })` to API call chain
- Initialize PagingController in `initState()` — not in `build()`
</constraints>
```

---

## Technique 5: Chain-of-Thought (CoT) Placeholder

Add explicit CoT instruction for tasks requiring reasoning before coding.

**Add "Think step by step before writing any code" when:**
- Debugging async/concurrent flows
- Architecture decisions (where to put code, which service to use)
- Multi-service interactions
- WASM compatibility debugging
- Choosing between patterns (e.g., model vs SafeMap vs getJsonField)

**Don't add CoT for:**
- Simple UI components (clear implementation path)
- Straightforward CRUD operations
- Formatting/styling tasks

**Example placement:**
```xml
<task>
Debug why the itinerary total amount shows 0 after hotel is added.
</task>

Think step by step before writing any code:
1. Trace the data flow from hotel addition to total display
2. Identify which service updates the total
3. Check for WASM-unsafe casts in the amount calculation
4. Verify setState is called after service update
```

---

## Technique 6: Scope Guard

Prevent over-engineering by making the constraint explicit.

**Always append for bugfix and feature tasks:**
```
Don't add features, refactor surrounding code, or make improvements beyond what was asked.
Fix only what's broken / implement only what was specified.
```

**Why:** Claude Code tends to "improve" adjacent code, add error handling for impossible
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
| "Crea un componente" | Inject M3 constraints + testKey + Semantics template |
| "Implementa X como en Y" | Resolve "Y" to a real file path before optimizing |
| "Optimiza el rendimiento" | Ask which metric, then scope to specific bottleneck |
| "Haz lo que necesites" | Refuse open-ended scope — ask for specific deliverable |
| Nested feature requests | Decompose into sequential phases, validate each |
