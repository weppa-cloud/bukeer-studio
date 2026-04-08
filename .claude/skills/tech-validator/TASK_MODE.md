# MODE: TASK — Pre-Implementation TVB

## Input

| Parameter | Required | Description |
|-----------|----------|-------------|
| Task description | **YES** | Feature request, bug report, enhancement description |
| Task type | Auto-detected | FEATURE / BUGFIX / ENHANCEMENT / REFACTOR |
| Domain | Auto-detected | Module (chatwoot, itineraries, contacts, products, etc.) |

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
| UI component (<300 LOC, no logic) | **YES (lite)** | M3 + token validation only |
| Trivial fix (typo, copy, single-line) | **NO** | No architectural impact |
| Documentation only | **NO** | No code impact |
| Pure research/exploration | **NO** | No implementation |

## TVB Generation Protocol

### Phase 1: Task Analysis
1. **Classify**: Feature / Bugfix / Enhancement / Refactor
2. **Complexity**: Simple (1 file) / Moderate (2-3 files) / Complex (3+ files)
3. **Domain**: Which module?

### Phase 2: ADR Scan
Scan all ADRs in `docs/02-architecture/decisions/` and flag applicable ones (same table as PLAN mode — see [PLAN_MODE.md](PLAN_MODE.md) Step 2).

### Phase 3: Context Gathering
1. **Recent Commits**: `git log --oneline -20` filtered by domain keywords
2. **Impact Files**: Files that will be created/modified
3. **Integration Points**: Services, models, widgets affected
4. **Existing Patterns**: Similar implementations to follow

### Phase 4: Pattern Checklist

**Data Access Patterns** (`docs/02-architecture/patterns/DEFENSIVE_DATA_PATTERNS.md`):
- [ ] Typed models (not dynamic access)
- [ ] SafeMap for raw JSON
- [ ] WASM-safe numeric casts (`as num?`)
- [ ] ErrorAwareFutureBuilder for async UI
- [ ] Single setState for batch updates
- [ ] Typed service getters (not deprecated dynamic ones)

**Service Layer Patterns**:
- [ ] AppServices access (never direct instantiation)
- [ ] callWithAuth for API calls (ADR-022)
- [ ] BaseService.batchCrossService for multi-service ops
- [ ] Error handling with BukeerServiceException hierarchy
- [ ] ServiceResult for expected failures

**M3 Design System Compliance** (`docs/04-design-system/M3_IMPLEMENTATION_QUICKSTART.md`):
- [ ] M3 native components first (FilledButton, SegmentedButton, Switch, SearchBar)
- [ ] Colors ONLY via `Theme.of(context).colorScheme` — NEVER hardcoded `Color(0xFF...)`
- [ ] Typography ONLY via `Theme.of(context).textTheme` — NEVER loose `TextStyle(...)`
- [ ] Dark mode automatic (guaranteed if tokens used correctly)
- [ ] Surface hierarchy: `surfaceContainerLowest` (pages), `surfaceContainerHigh` (cards)

**Bukeer Token System** (`lib/design_system/tokens/`):
- [ ] Spacing: `BukeerSpacing.*` for ALL padding/margin (4dp grid: xs=4, s=8, m=16, l=24, xl=32)
- [ ] Pre-built EdgeInsets: `BukeerSpacing.cardInternal`, `.sectionInternal`, `.pageInternal`
- [ ] Border radius: `BukeerBorderRadius.*` (xs=4, sm=6, md=8, lg=12, xl=16, xxl=28)
- [ ] Elevation: `BukeerElevation.shadow1-6` for box shadows, `.level1-7` for Material elevation
- [ ] Borders: `BukeerBorders.defaultBorder`, `.primaryBorder`, `.errorBorder`
- [ ] Animations: Use `BukeerM3Motion` for durations and curves
- [ ] Responsive: `BukeerSpacing.getResponsivePadding(context)` for adaptive layouts
- [ ] Touch targets: 48dp minimum (WCAG 2.1 AA via `m3_touch_targets.dart`)

**Component Reusability Principles** (`docs/04-design-system/REUSABILITY_CHECKLIST.md`):
- [ ] Check if Design System already has the component (`lib/design_system/components/`)
- [ ] Abstraction level: Level 3 (global, 3+ contexts) → `lib/design_system/`
- [ ] Abstraction level: Level 2 (domain, 2-3 contexts) → `lib/bukeer/{domain}/widgets/`
- [ ] DRY: If code duplicated in 2+ places, extract immediately
- [ ] Parametrized: No hardcoded values — use generics `<T>` for type-safe configurability
- [ ] Composable: Max 300 LOC per component, split if larger
- [ ] 3-Layer separation: Widget (logic) → Pattern (config) → Layout (UI pure)
- [ ] Import from `design_system/index.dart` — NEVER from internal paths

**UX Patterns** (`docs/04-design-system/UX_PATTERNS_GUIDE.md`):
- [ ] showModalWarning for validation, showModalError for system errors
- [ ] Skeleton loading (`BukeerSkeletonList`) — not CircularProgressIndicator
- [ ] Empty states via `BukeerEmptyStateVariants`
- [ ] `BukeerRefreshIndicator` for pull-to-refresh
- [ ] `historyModule` on search bars for recent searches

**Authorization**:
- [ ] RBAC check via `appServices.authorization.can*()`
- [ ] Permission-gated UI elements

**Build Purity (ADR-024)**:
- [ ] Controller init in initState(), not build()
- [ ] No addPostFrameCallback in build()
- [ ] Stable Future references for FutureBuilder
- [ ] Explicit ScrollController fields

**Memory Safety (ADR-023)**:
- [ ] Cached .toJS handlers (no inline creation)
- [ ] Idle check for periodic tasks
- [ ] Proper listener disposal

### Phase 5: TVB Output

```
══════════════════════════════════════════════════════════
 TECHNICAL VALIDATION BRIEF (TVB)
 Task: [Concise task description]
 Type: [FEATURE|BUGFIX|ENHANCEMENT|REFACTOR] | Complexity: [Simple|Moderate|Complex]
 Module: [chatwoot|itineraries|contacts|products|auth|navigation|design_system|other]
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

## 5. M3 / Design System / Tokens
 ### Componentes
 ✓ [M3 native component to use OR existing Bukeer component from design_system/]
 ✗ [Component to AVOID — e.g., ElevatedButton → use FilledButton]

 ### Tokens Requeridos
 - Colors: [Specific colorScheme tokens needed — e.g., surfaceContainerHigh for cards]
 - Typography: [Specific textTheme tokens — e.g., titleLarge for section headers]
 - Spacing: [Specific BukeerSpacing tokens — e.g., cardInternal for card padding]
 - Elevation: [Specific elevation level — e.g., shadow2 for card shadows]
 - Border Radius: [Specific radius — e.g., mediumRadius (8dp) for containers]

 ### Reutilización
 - Nivel: [0=inline | 1=private method | 2=domain widget | 3=design system]
 - Componente existente: [path to existing component if reusable, or "new"]
 - DRY check: [Is similar code elsewhere? Reference file:line]

 ### Dark Mode
 ✓ [Automatic if all tokens used correctly / Manual check needed if...]

## 6. Integraciones a Verificar
 - [Integration point] → [What to check]
 - [Integration point] → [What to check]

## 7. Quality Gates
 □ dart analyze → 0 issues
 □ dart format → all files
 □ [Specific test requirements]
 □ Coverage: [applicable thresholds]
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

 ## M3 Compliance
 M3 Native: [Yes → use direct | Partial → extend | No → custom with justification]
 Component: [M3 component name or Bukeer DS component to extend]
 Reference: [mcp__material3__get_component_code result or DS path]

 ## Token Usage (MANDATORY — no hardcoded values)
 Colors:       [List specific colorScheme tokens to use]
 Typography:   [List specific textTheme tokens to use]
 Spacing:      [List specific BukeerSpacing tokens]
 Elevation:    [Level and shadow tokens if applicable]
 Border Radius:[Specific BukeerBorderRadius token]
 Animation:    [BukeerM3Motion token if animated]

 ## Reusability Assessment
 Abstraction Level: [0|1|2|3] → [Location: inline|private|domain|design_system]
 Similar Existing:  [Path to similar component, or "none found"]
 Parametrized:      [Yes/No — must accept config via constructor, not hardcode]
 Generic Type:      [Use <T> if the component handles varying data types]

 ## Quality
 Dark Mode:      [Auto ✓ if all tokens used | Manual check needed if...]
 Accessibility:  [semanticLabel, contrast ratio, touch target 48dp]
 ADR-024:        [Build purity — no side effects in build()]
 Max LOC:        [Must be <300 — split if larger]

══════════════════════════════════════════════════════════
```
