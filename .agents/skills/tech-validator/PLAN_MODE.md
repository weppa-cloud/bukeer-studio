# MODE: PLAN — Plan/PRD Validation

## Input

| Parameter | Required | Description |
|-----------|----------|-------------|
| Plan content | **YES** | PRD text, plan document, feature proposal, or path to .md file |
| Domain | Auto-detected | Module the plan belongs to (chatwoot, itineraries, etc.) |

## When to Use

- Before starting implementation of any PRD
- When reviewing a feature proposal
- When validating an architectural design document
- When a developer submits a plan for approval

## Validation Protocol

### Step 1: Parse Plan Scope
- Extract: features described, UI components mentioned, services involved, data models
- Identify: affected modules, estimated file count, complexity level

### Step 2: ADR Compliance Check
Scan the plan against ALL applicable ADRs in `docs/02-architecture/decisions/`:

| ADR | Topic | Check |
|-----|-------|-------|
| ADR-001 | State Management | Does plan use AppServices? Does it propose new state outside pattern? |
| ADR-011 | Layout vs Pattern | Does plan respect 3-layer separation for list pages? |
| ADR-012 | Modal Organization | Are modals/dialogs following organization standards? |
| ADR-015 | Optimistic UI | Do CRUD operations include optimistic update strategy? |
| ADR-016 | Cache SWR | Does data fetching strategy mention cache invalidation? |
| ADR-017 | OTA Standards | Do product/hotel models align with OTA standards? |
| ADR-018 | Exception Handling | Does plan include error handling strategy? |
| ADR-019 | Navigation Stack | Does navigation follow GoRouter patterns? |
| ADR-020 | Flow Tracking | Are user journeys tracked? |
| ADR-021 | Unified Dual View | If list page, does it consider list + kanban? |
| ADR-022 | Auth Token Boundary | Are API calls through service layer (not UI)? |
| ADR-023 | Chrome OOM | Are timers/listeners accounted for with cleanup? |
| ADR-024 | Build Purity | Does plan mention init patterns correctly? |
| ADR-032 | Catalog V2 | Does hotel/product work use catalog architecture? |
| ADR-035 | Pagination | Does pagination use length < pageSize + appendLastPage? |
| ADR-036 | Testing Surface | Do interactive components have `testKey` + `Semantics()`? |

### Step 3: M3 / Design System / Token Validation
- **M3 Components**: Does the plan specify M3-native components? Does it avoid deprecated Material 2?
- **Token Usage**: Does the plan reference Bukeer tokens (spacing, colors, elevation, border radius)?
- **Reusability**: Does the plan consider existing DS components before creating new ones?
- **3-Layer Architecture**: If UI, does the plan propose Widget → Pattern → Layout?
- **Dark Mode**: Will the plan work in dark mode automatically (via token usage)?

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

## M3 / Design System
 ✅ [M3 component usage is correct]
 ⚠️ [Missing token specification for X — recommend BukeerSpacing.m]
 ❌ [Plan mentions hardcoded colors — must use colorScheme]

## Token System Compliance
 Colors:       [✅ Uses colorScheme | ❌ Hardcoded]
 Typography:   [✅ Uses textTheme | ❌ Custom TextStyle]
 Spacing:      [✅ BukeerSpacing | ⚠️ Not specified]
 Elevation:    [✅ BukeerElevation | ⚠️ Not specified]
 Border Radius:[✅ BukeerBorderRadius | ⚠️ Not specified]

## Reusability Assessment
 Existing Components: [List DS components the plan should reuse]
 New Components Proposed: [List, with abstraction level recommendation]
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
