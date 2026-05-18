# Design Revision Backlog: Human-Agent GUI

> Date: 2026-05-18
> Source: `EXPERT_UX_UI_AUDIT_2026-05-18.md`
> Purpose: convert audit findings into executable design and v0 tasks.

## Decision

Do not implement production Next screens yet.

Proceed through:

1. Agentic UI state model.
2. Registry-backed v0 V3 retry.
3. Design System Lock Code-First and responsive rules.
4. Beta review with agency users.
5. Next component contract update.

## P0 Backlog

### P0.1 Trace Drill-Down Everywhere AI Acts

Owner: Design + Platform

Problem:

Planner and Conversation show AI suggestions, but the trace detail is too shallow for production trust.

Required design:

- Compact trace drawer.
- Data used.
- Source freshness.
- Permission check.
- Policy guardrail.
- Risk level.
- Confidence.
- Human decision history.
- Audit link.

Acceptance:

- Every AI suggestion has an inspectable trace.
- Trace never exposes hidden chain-of-thought.
- Trace uses summaries, evidence, data sources, tool results and policy results.

### P0.2 Strict Agentic State Model

Owner: Product Design + Engineering

Problem:

`pending`, `approval`, `blocked`, `AI suggested` and `manager required` are too easy to confuse.

Required design:

- A unified state model for all human-agent surfaces.
- Distinct visual treatment per state.
- Button availability rules per state.
- Copy rules per state.

Acceptance:

- Users can distinguish suggested, drafted, blocked, approval required, approved, executed and rejected.
- Public send, payment, reservation and supplier hold are disabled when policy or missing data blocks them.

### P0.3 Responsive Proof

Owner: UI Design

Problem:

Accepted screens are desktop-only.

Required design:

- 1440 desktop.
- 1280 laptop.
- 834 tablet.
- 390 mobile.

Acceptance:

- Right rail collapses without hiding approvals, trace or missing data.
- Bottom command bar does not hide primary actions or content.
- Mobile can support review and approval even if editing is reduced.

### P0.4 No Hidden Chain-Of-Thought

Owner: Product + Legal/Security + Engineering

Problem:

Trace UI must explain decisions without exposing hidden model reasoning.

Required design:

- Label `Reasoning summary`, not chain-of-thought.
- Show evidence, data, tool result, permission result and policy result.
- Provide audit trail and replay id.

Acceptance:

- No UI component requests, stores or displays hidden chain-of-thought.
- Debug/trace views are safe for customer support and audit.

## P1 Backlog

### P1.1 Rebuild Itinerary Builder As Travel Manifest

Owner: UI Design

Problem:

Itinerary Builder V2 is useful but still generic.

Required design:

- Rename design direction to `ItineraryManifest`.
- Use day sections, supplier evidence, passenger readiness, margin state and proposal readiness.
- Bring supplier rail back into the visible workflow.
- Make trace and approval states first-class.

Acceptance:

- Screen cannot be mistaken for a generic timeline editor.
- User sees what is confirmed, pending, suggested, blocked and approval-required.

### P1.2 Reframe Manager Control Plane

Owner: Product Design

Problem:

Manager Control Plane feels like an incident dashboard.

Required design:

- Queue-first layout.
- Separate daily queues from emergency states.
- Show actionability before metrics.
- Include AI rollout controls but do not make every surface feel urgent.

Acceptance:

- Manager can answer: what needs approval, what is blocked, who needs help, what changed.

### P1.3 Color Role Enforcement

Owner: Design System

Problem:

V2 improves color roles, but enforcement is not yet systemized.

Required design:

- Token lock in `DESIGN_LOCK_CODE_FIRST_2026-05-18.md`.
- Registry tokens.
- Component examples.

Acceptance:

- Purple means structure/location.
- Teal means live/realtime.
- Orange means human-in-the-loop.
- Red means blocked/destructive.
- Yellow means warning.

## P2 Backlog

### P2.1 Typography Personality

Required design:

- Outfit for orientation, command labels and section headers.
- Readex Pro for dense operational content.
- Tabular numerals for prices, margin, SLA and confidence.

### P2.2 Motion And Microinteractions

Required design:

- Live pulse.
- Pending approval ring.
- Row update flash.
- Trace drawer expand/collapse.
- Disabled action explanation.

### P2.3 Agent-Readable Structure

Required design:

- Stable component names.
- Semantic data attributes in future implementation.
- Predictable states and labels.

## Execution Order

1. `AGENTIC_UI_STATE_MODEL_2026-05-18.md`
2. `12_registry_planner_workbench_v3.md`
3. `13_registry_conversation_copilot_v3.md`
4. `14_registry_trace_approval_v3.md`
5. `15_itinerary_manifest_v3.md`
6. `DESIGN_LOCK_CODE_FIRST_2026-05-18.md`.
7. Beta review.
8. Next component contract update.
