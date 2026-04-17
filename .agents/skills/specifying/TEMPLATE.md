<!--
  GitHub Issue body template for specs created by the `specifying` skill.
  Title convention: `[SPEC] <Feature Name>`
  Labels: spec, needs-tech-validation, (optional) area:<domain>
-->

## Summary
<1-2 sentences describing the feature>

## Motivation
<User pain point or business requirement. Why now.>

## User Flows

### Flow 1: Happy path
1. User navigates to...
2. User clicks...
3. System shows...
4. User fills...
5. System validates...
6. User confirms...
7. System saves and shows success.

### Flow 2: Edge case
1. ...

## Acceptance Criteria

- [ ] AC1: <Testable assertion>
- [ ] AC2: <Testable assertion>
- [ ] AC3: <Testable assertion>

## Data Model Changes

| Table | Column | Type | Notes |
|-------|--------|------|-------|
|       |        |      |       |

## API / RPC Changes

| Endpoint / RPC | Method | Payload | Notes |
|----------------|--------|---------|-------|
|                |        |         |       |

## Permissions (RBAC)

| Role        | View | Create | Edit | Delete |
|-------------|------|--------|------|--------|
| super_admin | yes  | yes    | yes  | yes    |
| owner       | yes  | yes    | yes  | yes    |
| admin       | yes  | yes    | yes  | no     |
| agent       | yes  | no     | no   | no     |

## Affected Files

| File | Change | Description |
|------|--------|-------------|
|      | Create / Modify |    |

## Edge Cases & Error Handling

1. <Edge case> → <Expected behavior>
2. ...

## Out of Scope

- <Explicitly excluded>

## Dependencies

- <Other features, issues, or systems>

## ADR References

- ADR-XXX: <title>

## L10N

- Copy keys to add in `lib/l10n/app_es.arb`: `<key>`, `<key>`

---

<!-- Workflow markers (do not remove) -->
- Status: `Draft` → `Reviewed` (after tech-validator PLAN) → `Implementing` → `Implemented`
- Related: `Relates to #`, `Closes #`
