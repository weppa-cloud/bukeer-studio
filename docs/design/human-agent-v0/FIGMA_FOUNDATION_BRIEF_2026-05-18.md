# Optional Figma Support Brief: Bukeer Human-Agent GUI

> Date: 2026-05-18
> Phase: 0.25
> Audience: UI/UX design
> Goal: provide optional commentable frames when visual review needs Figma.
> Status: support artifact only. The canonical gate is `DESIGN_LOCK_CODE_FIRST_2026-05-18.md`.

## Objective

Support the code-first design lock with commentable visual frames when needed. The output must not look like a generic SaaS dashboard. It must make human control, AI suggestions, traceability, missing data and approval gates visually obvious.

Figma is not required to start Sprint 0.25C if the registry, tokens, component contract and prototype readiness are approved.

## Inputs

Use these as source material:

- `screenshots/08_signature_planner_workbench_v2.png`
- `screenshots/09_signature_conversation_copilot_v2.png`
- `screenshots/10_signature_itinerary_builder_v2.png`
- `screenshots/11_signature_trace_approval_v2.png`
- `SIGNATURE_VISUAL_DIRECTION_2026-05-18.md`
- `BUKEER_SIGNATURE_TOKENS_2026-05-18.md`
- `VISUAL_QA_RUBRIC_2026-05-18.md`
- `EXPERT_UX_UI_AUDIT_2026-05-18.md`
- `DESIGN_REVISION_BACKLOG_2026-05-18.md`
- `AGENTIC_UI_STATE_MODEL_2026-05-18.md`
- `registry/README.md`
- `registry-dist/registry.json`

## Optional Figma Pages

1. `00 Foundations`
2. `01 Components`
3. `02 Planner Workbench`
4. `03 Conversation Copilot`
5. `04 Trace Approval`
6. `05 Itinerary Manifest`
7. `06 Responsive`
8. `07 Beta Review Prototype`

## Foundations

Define:

- Color roles: purple structural identity, teal live/realtime, orange human-in-the-loop, red blocked/destructive, yellow warning.
- Typography roles: Outfit for display/title/labels/buttons, Readex Pro for body and dense content.
- Density scale for operational screens.
- Radius: panels <= 8px, controls <= 6px unless component state requires pill shape.
- Elevation and border rules for rails, work canvas, trace drawers and approval bars.
- Icon usage with lucide-style icons.
- Focus, hover, selected, loading, disabled, no permission and blocked states.

## Component Set

Design variants for:

- `TripRail`
- `PlanningCanvas`
- `ItineraryBlock`
- `LiveFeedColumn`
- `MarginGuard`
- `MissingDataChecklist`
- `CopilotThread`
- `EntityExtractionPanel`
- `TraceNode`
- `ToolInvocationDetail`
- `ApprovalCommandBar`
- `HumanOverrideChip`
- `PermissionBlockedState`

Each component must include states:

- Normal
- Loading
- Empty
- Error
- No permission
- AI suggestion
- AI blocked
- Approval required

Agentic state variants must also follow `AGENTIC_UI_STATE_MODEL_2026-05-18.md`:

- `observed`
- `suggested`
- `drafted`
- `blocked_missing_data`
- `blocked_policy`
- `approval_required`
- `approved`
- `executing`
- `executed`
- `rejected`
- `expired`

## Core Screens

### Planner Workbench

Primary product direction. Must show:

- Opportunity rail.
- Client/trip header.
- Itinerary planning canvas.
- Supplier/live feed.
- Margin guard.
- Missing data.
- AI suggestion card.
- Approval command bar.

### Conversation Copilot

Must show:

- Inbox.
- Public conversation.
- Internal/private note.
- Suggested reply.
- Entity extraction panel.
- Missing data checklist.
- Human review gate.
- Blocked itinerary draft.

### Trace Approval

Must show:

- Agent trace timeline.
- Tool invocation detail.
- Permission checks.
- Guardrail warnings.
- Risk assessment.
- Approval interruption.
- Blocked action.
- Approve/reject/escalate command bar.

### Itinerary Manifest

Use as the replacement for the generic Itinerary Builder direction. It must feel like a travel manifest with supplier evidence, passenger readiness, proposal readiness, margin state and approval/trace behavior.

## Responsive Requirements

Design these breakpoints:

- Desktop 1440px.
- Laptop 1280px.
- Tablet 834px.
- Mobile 390px.

Rules:

- Right rail collapses into drawer or tab without hiding missing data, approvals or trace.
- Bottom command bar must not cover primary content.
- Planner can still scan itinerary state and approval risk on laptop.
- Mobile is allowed to prioritize review/approval over full editing.

## Acceptance Criteria

- Scores >= 40/45 against `VISUAL_QA_RUBRIC_2026-05-18.md` for primary screens.
- No generic sidebar/topbar/card-grid composition.
- AI never appears as a magic button only.
- Sensitive actions always show permission, reason, risk and approval state.
- A beta partner can explain what the AI proposes and what the human must decide without external narration.

## Deliverables

- Figma file with the pages above, only when needed.
- Component variants with named states.
- Clickable prototype for Planner Workbench beta review.
- Redline notes for Next implementation.
- Exported screenshot set for GitHub issues #825, #826, #827 and #828.
- Any Figma decisions that change implementation must be translated back into `DESIGN_LOCK_CODE_FIRST_2026-05-18.md` and `NEXT_COMPONENT_CONTRACT_2026-05-18.md`.
