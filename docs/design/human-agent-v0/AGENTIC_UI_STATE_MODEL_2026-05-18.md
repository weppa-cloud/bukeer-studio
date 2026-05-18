# Agentic UI State Model

> Date: 2026-05-18
> Purpose: make AI suggestion, blocked, approval and execution states unambiguous across Bukeer Admin Next.

## Why

The audit found that current v0 screens can blur `AI suggested`, `pending`, `approval required`, `blocked` and `approved`. In human-agent travel operations, ambiguous state is a safety risk.

This model applies to Planner Workbench, Conversation Copilot, Itinerary Manifest, Trace Approval and Manager Control Plane.

## State Ladder

| State | Meaning | Human action | AI/action availability | Visual role |
|---|---|---|---|---|
| `observed` | AI or system detected a signal | Inspect or ignore | No mutation | Neutral |
| `suggested` | AI proposes an action | Accept, edit, dismiss | No mutation | Teal, low risk |
| `drafted` | AI created an internal draft | Review, edit, discard | Draft only | Purple structure |
| `blocked_missing_data` | Required data is absent | Request or add data | Sensitive actions disabled | Orange HITL |
| `blocked_policy` | Policy prevents action | Escalate or change plan | Action disabled | Red blocked |
| `approval_required` | Human approval gate is open | Approve, approve with edits, reject, escalate | Awaiting human | Orange HITL |
| `approved` | Human approved the action | Execute or monitor | Execution allowed if still valid | Green success |
| `executing` | Tool/action is running | Monitor/cancel when safe | In progress | Teal live |
| `executed` | Action completed | Audit or continue | Complete | Green success |
| `rejected` | Human rejected action | Revise or close | Blocked from execution | Red/destructive |
| `expired` | Data/hold/approval is stale | Refresh, re-price, re-approve | Execution disabled | Yellow warning |

## Button Rules

| State | Primary button | Secondary buttons | Disabled actions |
|---|---|---|---|
| `suggested` | Accept suggestion | Edit, dismiss, inspect trace | Send/public write/payment/reservation |
| `drafted` | Review draft | Edit, discard, inspect trace | Public send/payment/reservation |
| `blocked_missing_data` | Request missing data | Add manually, inspect trace | Apply, send, reserve, pay |
| `blocked_policy` | Escalate | Change plan, inspect policy | Execute action |
| `approval_required` | Approve | Approve with edits, reject, escalate | Auto-execute unless policy permits |
| `approved` | Execute | Review, revoke if not executed | None if still valid |
| `executing` | View progress | Cancel if reversible | Duplicate execution |
| `executed` | View audit | Continue workflow | Re-execute without idempotency |
| `expired` | Refresh data | Re-price, re-request supplier | Execute stale action |

## Copy Rules

Use direct labels:

- "AI suggested" means no change has been made.
- "Draft created" means internal Bukeer draft only.
- "Blocked: missing data" means the user must collect data before proceeding.
- "Blocked by policy" means the action cannot proceed without a different route.
- "Approval required" means execution is paused until a human decides.
- "Approved" means human allowed execution, not necessarily executed.
- "Executed" means system completed the action.

Avoid:

- "Pending" without a noun.
- "AI ready".
- "Approved" when only a suggestion was accepted.
- "Safe" without risk details.

## Trace Requirements Per State

Every state from `suggested` onward must expose:

- `traceId`
- `agentRunId`
- `dataUsed`
- `sourceFreshness`
- `confidence`
- `riskLevel`
- `permissionResult`
- `policyResult`
- `humanDecision`
- `auditLink`

Never expose hidden chain-of-thought. Use concise reasoning summaries only.

## Visual Role Mapping

- Purple: current structure, selected entity, draft context.
- Teal: live, streaming, executing, active trace.
- Orange: human-in-the-loop, missing data, approval required.
- Red: blocked, rejected, destructive.
- Yellow: stale, expiring, warning.
- Green: approved, executed, confirmed.

## Acceptance Test

A beta user must be able to answer:

1. Did AI only suggest this?
2. Did AI create a draft?
3. Is the action blocked?
4. What is missing?
5. Who must approve?
6. Has anything been sent to the customer?
7. Has anything been reserved or paid?

If any answer is unclear, the screen fails.
