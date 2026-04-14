# Spec: [Feature Name]

## Status
- **Author**: [name]
- **Date**: [YYYY-MM-DD]
- **Status**: Draft | Reviewed | Implementing | Implemented

## Summary
[1-2 sentences describing the feature]

## Motivation
[Why this feature is needed -- user pain point or business requirement]

## User Flows

### Flow 1: [Happy Path]
1. User navigates to...
2. User clicks...
3. System shows...
4. User fills...
5. System validates...
6. User confirms...
7. System saves and shows success

### Flow 2: [Edge Case]
1. ...

## Acceptance Criteria

- [ ] AC1: [Testable assertion]
- [ ] AC2: [Testable assertion]
- [ ] AC3: [Testable assertion]

## Data Model Changes

| Table | Column | Type | Notes |
|-------|--------|------|-------|
| ... | ... | ... | ... |

## API Changes

| Endpoint/RPC | Method | Payload | Notes |
|--------------|--------|---------|-------|
| ... | ... | ... | ... |

## Permissions (RBAC)

| Role | Can View | Can Create | Can Edit | Can Delete |
|------|----------|------------|----------|------------|
| super_admin | yes | yes | yes | yes |
| owner | yes | yes | yes | yes |
| admin | yes | yes | yes | no |
| agent | yes | no | no | no |

## Affected Files

| File | Change Type | Description |
|------|------------|-------------|
| ... | Create/Modify | ... |

## Edge Cases & Error Handling

1. [Edge case description] -> [Expected behavior]
2. ...

## Out of Scope

- [Explicitly excluded items]

## Dependencies

- [Other features or systems this depends on]
