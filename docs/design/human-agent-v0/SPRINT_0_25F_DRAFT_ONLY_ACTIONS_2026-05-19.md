# Sprint 0.25F: Draft-Only Actions

> Date: 2026-05-19
> Input: Sprint 0.25E read-only beta foundation
> Goal: let AI prepare internal, editable drafts while production writes remain blocked.

## Sprint Intent

Sprint 0.25F is the next step after read-only beta validation. The system may prepare draft artifacts for planners and managers, but every draft stays inside a human-controlled review boundary.

This sprint is not a production automation rollout. It must not send customer messages, reserve suppliers, confirm bookings, charge payments or mutate production records.

## What 0.25F May Do

- Draft a customer reply from conversation and trip context.
- Draft a missing-data request for passenger, rooming, policy or flight gaps.
- Draft an itinerary outline for planner editing.
- Draft a manager approval packet from margin, risk and trace evidence.
- Draft a supplier comparison note.
- Draft a quote readiness checklist.
- Draft an internal follow-up task.
- Draft an audit summary after a simulated human decision.

## What 0.25F Must Not Do

- Public WhatsApp or email send.
- Supplier hold, availability lock or reservation.
- Payment, refund, invoice or confirmed financial write.
- Booking confirmation.
- Autonomous approval execution.
- Bulk outreach or destructive account operations.
- Any Supabase insert, update, delete or write RPC tied to real production records.

## Product Boundary

Every draft-only action must show:

- `Draft created` or `AI suggested`, never `sent`, `reserved`, `paid` or `confirmed`.
- Required human action before any external effect.
- Trace link.
- Source freshness.
- Risk level.
- Permission or policy result when relevant.
- Editable fields.
- Discard path as visible as accept/edit path.

## Component Contract

Primary component:

- `DraftActionPanel`

Expected sections:

- Draft type and status.
- Draft body preview.
- Editable fields.
- Required human action.
- Safety boundary: not sent, not reserved, not paid, not confirmed.
- Trace inspection action.
- Local-only actions: review draft, edit locally, discard locally.

The component must be dense and operational. It should feel like a Bukeer planner surface, not a generic SaaS card.

## Acceptance Criteria

- Planner Workbench displays at least three realistic draft actions.
- Each draft action validates against `@bukeer/admin-contract`.
- Trace Inspector can explain every draft action from Agent Ledger rows.
- Local buttons update only prototype state or explanatory copy.
- No production write code path is added.
- Dark mode and mobile keep the draft safety boundary visible.
- Tests prove production-write safety flags cannot be enabled in draft-only actions.

## Validation Plan

- Contract tests for draft action schemas.
- Fixture/schema tests for Planner Workbench draft actions.
- Agent Ledger source tests for A2 draft runs/tool invocations.
- Signature UI tests for draft panel rendering and safety labels.
- Playwright smoke for Planner Workbench draft-only path.
- `npm run typecheck`.
- `npm run build`.

## Exit Decision

0.25F can close with `proceed` only if drafts are understandable and no beta reviewer confuses a draft with a real send, hold, payment, booking or production mutation.

If any reviewer believes a draft already executed externally, the sprint exits as `revise` and production-write work remains blocked.
