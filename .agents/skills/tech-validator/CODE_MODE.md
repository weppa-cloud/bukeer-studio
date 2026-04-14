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
- Run `mcp__dart__analyze_files` on all changed files
- Run `mcp__dart__dart_format` to check formatting

### Step 3: Pattern Violation Scan

For each changed file, scan for these violations:

**CRITICAL (must fix before commit):**

| Violation | Pattern to Detect | Fix |
|-----------|-------------------|-----|
| Dynamic access | `data['key']!` or `getJsonField(` | Use typed model or SafeMap |
| Hardcoded color | `Color(0x` or `Colors.` in widget code | Use `colorScheme.*` |
| Hardcoded spacing | `EdgeInsets(` with literal numbers | Use `BukeerSpacing.*` |
| Hardcoded text style | `TextStyle(fontSize:` | Use `textTheme.*` |
| Hardcoded border radius | `BorderRadius.circular(` with literal | Use `BukeerBorderRadius.*` |
| Token in UI | `currentJwtToken` in widget file | Move to service via callWithAuth |
| Direct service instantiation | `XxxService()` in widget | Use `appServices.xxx` |
| WASM-unsafe cast | `as double?` without `num` | Use `(val as num?)?.toDouble()` |
| Multiple setState | Two `setState(` in same method | Combine into single setState |
| Build impurity | `set*Controller(` in `build()` method | Move to `initState()` |
| Inline FutureBuilder | `future: () async` in build | Use stable `_precomputed` field |
| Wrong modal semantic | `showModalError(` with validation text | Use `showModalWarning(` |
| Deprecated getter | `.selectedItinerary` / `.selectedHotel` | Use `.currentItineraryModel` / `.selectedHotelModel` |
| Inline .toJS | `.toJS` in callback/loop | Cache as class field |

**WARNING (should fix):**

| Violation | Pattern to Detect | Fix |
|-----------|-------------------|-----|
| Missing empty state | List without `BukeerEmptyState` | Add empty state variant |
| Missing skeleton | Loading with `CircularProgressIndicator` | Use `BukeerSkeletonList` |
| Missing RBAC check | Privileged action without `can*()` | Add authorization check |
| Large component | Single widget file >300 LOC | Split into composition |
| Import from internal path | `import 'package:bukeer/design_system/tokens/spacing.dart'` | Use `design_system/index.dart` |
| DRY violation | Code block duplicated 2+ times | Extract to shared component |

### Step 4: M3 / Token Compliance Audit

For each widget file, verify:

```
File: [path]
┌──────────────────────┬──────────┬─────────────────────────────┐
│ Token Category       │ Status   │ Details                     │
├──────────────────────┼──────────┼─────────────────────────────┤
│ Colors               │ ✅/⚠️/❌ │ [Uses colorScheme / mixed]  │
│ Typography           │ ✅/⚠️/❌ │ [Uses textTheme / mixed]    │
│ Spacing              │ ✅/⚠️/❌ │ [Uses BukeerSpacing / mixed]│
│ Elevation            │ ✅/⚠️/❌ │ [Uses BukeerElevation]      │
│ Border Radius        │ ✅/⚠️/❌ │ [Uses BukeerBorderRadius]   │
│ Dark Mode            │ ✅/⚠️    │ [Auto / needs manual check] │
│ Reusability Level    │ 0-3      │ [Appropriate for scope?]    │
└──────────────────────┴──────────┴─────────────────────────────┘
```

### Step 5: L10N Compliance Check

- [ ] No hardcoded Spanish strings in Semantics labels
- [ ] AppLocalizations used for all user-visible text
- [ ] Test selectors use ValueKey, not bySemanticsLabel

> Note: Custom lint `no_hardcoded_semantics_label` detects hardcoded strings in Semantics labels automatically.

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
 ✅/❌ Hardcoded Semantics labels: [count found]
 ✅/❌ AppLocalizations usage: [compliant / missing in N files]
 ✅/❌ Test selectors: [ValueKey used / bySemanticsLabel found]

## M3 / Token Compliance
 [Per-file token audit table]

## Reusability Assessment
 New Components: [count] — [appropriate levels?]
 DRY Violations: [count] — [where?]
 Existing DS Used: [list of reused components]

## ADR Compliance
 ✅ [ADR-XXX compliant]
 ❌ [ADR-XXX violated at file:line]

## Quality Gate Results
 □ dart analyze: [0 issues / N issues]
 □ dart format: [all formatted / N files need formatting]
 □ Tests: [pass / fail / not run]
 □ Coverage: [percentage]

## TVB Cross-Check (if TVB was generated)
 [Compare implementation against original TVB checklist]
 Items fulfilled: [N/M]
 Items missed: [list]

══════════════════════════════════════════════════════════
```
