---
name: tech-validator
description: |
  Technical validation for plans, tasks, and code against Bukeer architecture.
  THREE MODES:
  (1) PLAN — Validates a PRD/plan/proposal against ADRs, M3, tokens, reusability.
  (2) TASK — Generates a pre-implementation Technical Validation Brief (TVB).
  (3) CODE — Reviews written code for architectural compliance post-implementation.
  ACTIVATION: MANDATORY before any feature, bugfix, enhancement, or refactor.
  NOT FOR: Pure research, documentation-only tasks, or trivial single-line fixes.

  Examples:
  <example>
  Context: User shares a plan/PRD for validation.
  user: "Validate this plan for the package builder feature"
  assistant: "I'll run tech-validator in PLAN mode to check ADR/M3/token compliance."
  <commentary>Plan validation uses MODE: PLAN.</commentary>
  </example>
  <example>
  Context: User requests a new feature.
  user: "Add pipeline stage filter to Chatwoot conversations"
  assistant: "Before implementing, I'll generate the Technical Validation Brief (TVB)."
  <commentary>Pre-implementation uses MODE: TASK.</commentary>
  </example>
  <example>
  Context: User wants to review code already written.
  user: "Review the new PackageKitService for architecture compliance"
  assistant: "I'll run tech-validator in CODE mode to check the implementation."
  <commentary>Post-implementation review uses MODE: CODE.</commentary>
  </example>
  <example>
  Context: Trivial change that skips validation.
  user: "Fix typo in the login button text"
  assistant: "This is a trivial fix — tech-validator not required."
  <commentary>Single-line, non-architectural changes skip validation.</commentary>
  </example>
---

# Tech Validator Skill

Technical validation engine with **three operational modes** that ensures all development artifacts — plans, tasks, and code — align with Bukeer's architecture, ADRs, M3 design system, token system, and reusability principles.

## Mode Selection

| Mode | Trigger | Output | Guide |
|------|---------|--------|-------|
| **PLAN** | PRD/plan/proposal shared | Plan Compliance Report (PCR) | [PLAN_MODE.md](PLAN_MODE.md) |
| **TASK** | Feature/bugfix requested | Technical Validation Brief (TVB) | [TASK_MODE.md](TASK_MODE.md) |
| **CODE** | Code review requested | Code Review Report (CRR) | [CODE_MODE.md](CODE_MODE.md) |

## Mode Selection Logic

The agent auto-detects the mode based on input:

```
IF input contains PRD/plan/proposal document or "validate plan/PRD"
  → MODE: PLAN

ELSE IF input is a task description (feature/bugfix/enhancement)
  AND no code has been written yet
  → MODE: TASK

ELSE IF input references existing files/code or "review code"
  OR implementation is complete and requesting validation
  → MODE: CODE

ELSE IF task is trivial (typo, single-line, documentation)
  → SKIP (no validation needed)
```

The developer can also explicitly request a mode:
- "Validate this plan" → PLAN
- "Generate TVB for this task" → TASK
- "Review this code" → CODE

## ADRs Relevantes

| ADR | Topic | Check |
|-----|-------|-------|
| ADR-001 | State Management | Does it use AppServices? Does it propose new state outside pattern? |
| ADR-011 | Layout vs Pattern | Does it respect 3-layer separation for list pages? |
| ADR-012 | Modal Organization | Are modals/dialogs following organization standards? |
| ADR-015 | Optimistic UI | Do CRUD operations include optimistic update strategy? |
| ADR-016 | Cache SWR | Does data fetching strategy mention cache invalidation? |
| ADR-017 | OTA Standards | Do product/hotel models align with OTA standards? |
| ADR-018 | Exception Handling | Does it include error handling strategy? |
| ADR-019 | Navigation Stack | Does navigation follow GoRouter patterns? |
| ADR-020 | Flow Tracking | Are user journeys tracked? |
| ADR-021 | Unified Dual View | If list page, does it consider list + kanban? |
| ADR-022 | Auth Token Boundary | Are API calls through service layer (not UI)? |
| ADR-023 | Chrome OOM | Are timers/listeners accounted for with cleanup? |
| ADR-024 | Build Purity | Does it mention init patterns correctly? |
| ADR-032 | Catalog V2 | Does hotel/product work use catalog architecture? |
| ADR-035 | Pagination | Does pagination use length < pageSize + appendLastPage? |
| ADR-036 | Testing Surface | Do interactive components have `testKey` + `Semantics()`? |

## MCP Tools

- `mcp__dart__analyze_files` — Static analysis
- `mcp__dart__run_tests` — Test execution
- `mcp__dart__dart_format` — Code formatting
- `mcp__dcm__dcm_calculate_metrics` — Code metrics
- `mcp__dcm__dcm_check_dependencies` — Dependency analysis
- `mcp__dcm__dcm_check_unused_code` — Dead code detection

## Reference Files

See [REFERENCE_FILES.md](REFERENCE_FILES.md) for documentation pointers.

## L10N Check (CODE mode)

When reviewing code, check: "Are there hardcoded strings in Semantics labels?" Custom lint `no_hardcoded_semantics_label` detects this automatically.

## Delegate To

After validation, the work is handed to the appropriate skill:
- `flutter-developer`: Features, bugfixes, business logic
- `flutter-ui-components`: Standalone UI components
- `backend-dev`: Database, migrations, Edge Functions
- `testing-agent`: Test creation and validation
- `architecture-analyzer`: Deep architectural review (if violations found)

## Git Context Commands

```bash
# Recent commits for domain context
git log --oneline -20 --grep="[domain]"

# Files changed in recent related work
git log --oneline -10 --name-only --grep="[domain]"

# Unstaged changes that might conflict
git status -s

# Changed files for CODE mode
git diff --cached --name-only
git diff main...HEAD --name-only
```

## Escalation

| Situation | Action |
|-----------|--------|
| PLAN fails multiple ADRs | Return to plan author with specific violations |
| No applicable ADRs found | Review if task is truly new territory → may need new ADR |
| Conflicting ADRs | Flag to developer, suggest resolution |
| Missing typed model | Flag as blocker → model must be created first |
| CODE has critical violations | Block commit until fixed |
| CODE has only warnings | Allow commit with documented debt |
| Unclear integration points | Research mode → explore before generating report |
| After 2 research attempts | Ask developer for clarification |
