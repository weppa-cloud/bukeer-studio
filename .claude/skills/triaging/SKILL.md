---
name: triaging
description: |
  Structures bug fixes with root cause analysis before code changes.
  Reproduces bugs, isolates root cause to file:line, generates fix plan.
  USE WHEN: bug reported or regression detected.
  NOT FOR: feature requests (use specifying).
---
# Triaging

Root Cause Analysis (RCA) pipeline for bugs before writing fix code.

## Pipeline

### Phase 1: Reproduce
1. Understand the bug report (symptoms, steps to reproduce)
2. Identify affected screen/component
3. Find related code files
4. Check recent git history for related changes

### Phase 2: Isolate
1. Read the suspected code path
2. Use `mcp__dart__hover` to check types and signatures
3. Use `mcp__dart__get_runtime_errors` for runtime context
4. Use `mcp__dart__get_app_logs` for log evidence
5. Narrow down to specific `file:line`

### Phase 3: Analyze
1. Determine root cause category:
   - **Data**: Wrong type, null, missing field
   - **State**: Race condition, stale state, missing update
   - **Logic**: Wrong condition, off-by-one, missing case
   - **Integration**: API contract mismatch, schema drift
   - **UI**: Layout, overflow, missing responsive handling
2. Check if fix risks regressions
3. Identify test coverage for affected code

### Phase 4: Report
1. Generate RCA Report (see template)
2. Propose fix plan with specific file:line changes
3. Hand off to flutter-developer or backend-dev for implementation

## MCP Tools

- `mcp__dart__get_runtime_errors` -- Runtime error context
- `mcp__dart__get_app_logs` -- Application logs
- `mcp__dart__hover` -- Type information and signatures
- `mcp__dart__resolve_workspace_symbol` -- Symbol resolution

## Handoff

RCA Report -> `flutter-developer` or `backend-dev` skill for fix implementation.

## ADRs Relevantes

Check all ADRs relevant to the affected subsystem. Common bug-related ADRs:
- ADR-022: Auth token boundary
- ADR-024: Build purity
- ADR-035: Pagination
- ADR-036: Accessibility/testing surface
