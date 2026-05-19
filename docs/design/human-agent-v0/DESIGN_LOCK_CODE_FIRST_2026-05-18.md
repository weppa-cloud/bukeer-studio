# Design Lock Code-First: Bukeer Human-Agent GUI

> Date: 2026-05-18
> Sprint: 0.25B
> Parent epic: `weppa-cloud/bukeer-flutter#823`
> Status: Approved design lock
> Source of truth: v0 registry + Bukeer tokens + Next component contract + prototype

## Decision

Bukeer Admin Next will close its visual foundation through a code-first design lock, not through a mandatory Figma foundation phase.

Approval checkpoint 2026-05-18: **Bukeer Signature Planner Workbench** is approved as the primary visual direction. The approved governance surface is a right-side **Trace Inspector**, not a generic modal. Light mode and dark mode are both required for the workbench and inspector.

Figma can still be used as a lightweight support artifact for beta review, external comments or UI designer exploration, but it is not the implementation gate. The implementation gate is the combination of:

- Bukeer v0 registry.
- Bukeer signature tokens.
- React/Tailwind/shadcn component contracts.
- Agentic UI state model.
- Prototype-ready Next backlog.
- Visual QA rubric.

## Why

The migration from Flutter to Next is not a screen-copy project. It is a chance to create a human-agent operating system for travel agencies. The design process must therefore produce components, tokens and state behavior that engineering can implement directly.

v0 is useful because it can generate React/Tailwind/shadcn interfaces from files, registries and project context, and Design Mode can refine visual details against Tailwind tokens. That makes it a better primary path for Bukeer than a static handoff-only Figma workflow.

References:

- v0 `chats.init`: https://v0.dev/docs/api/platform/chats/chats.init
- v0 Design Mode: https://v0.dev/docs/design-mode
- v0 Design Systems: https://v0.dev/docs/design-systems

## Locked Flow

1. Generate or evaluate v0 V3 outputs from the Bukeer registry.
2. Reject generic SaaS, marketing, KPI-card-first or landing-page outputs.
3. Select one primary visual direction and one alternative.
4. Extract tokens and component patterns from the approved direction.
5. Lock tokens and component contracts for Next/Tailwind.
6. Validate Planner Workbench with beta/internal senior planners.
7. Start Sprint 0.25C with a prototype route using fixtures and locked contracts.

Current state:

- Planner Workbench prototype exists at `/admin/prototype/planner-workbench`.
- Trace Inspector is tokenized with Bukeer surfaces and agentic state pills.
- Prototype includes light/dark review toggle.
- E2E covers dark appearance propagation into the inspector portal.

## Source Of Truth Order

1. `AGENTIC_UI_STATE_MODEL_2026-05-18.md`
2. `BUKEER_SIGNATURE_TOKENS_2026-05-18.md`
3. `registry/registry.json`
4. `public/r/bukeer-admin-next/registry.json`
5. `NEXT_COMPONENT_CONTRACT_2026-05-18.md`
6. `VISUAL_QA_RUBRIC_2026-05-18.md`
7. Optional Figma/lightweight board when commentable review is needed

If Figma disagrees with the registry, tokens or component contract, the code-first source wins unless product/design explicitly updates the lock.

## Token Lock

The Design Lock must produce implementable tokens for:

- Color roles: structural identity, live/realtime, human approval, warning, destructive, disabled, surfaces, borders and focus.
- Typography: title, section, body, table, metadata, status and command text.
- Spacing: compact operational density with predictable rails, tables, rows, drawers and command bars.
- Radius: restrained, with cards and panels at 8px or less unless an existing primitive requires otherwise.
- Borders/elevation: clear hierarchy without decorative floating cards.
- Density: agency operations first, not presentation dashboards.
- Motion: subtle state feedback for live updates, blocked states and approval transitions.
- Agentic states: normal, loading, empty, error, no permission, AI suggestion, AI blocked, approval required, approved, rejected, executing, executed and trace available.

## Component Lock

The following components must be locked before Sprint 0.25C starts:

- `AdminShell`
- `PlannerWorkbench`
- `TripRail`
- `PlanningCanvas`
- `LiveFeedColumn`
- `ConversationCopilot`
- `TraceApprovalPanel`
- `TraceTimeline`
- `TraceInspector`
- `ApprovalCommandBar`
- `AgentSuggestionCard`
- `AgentBlockedCard`
- `ItineraryManifest`
- `ManagerControlPlane`

Each component must define:

- Purpose.
- Required data.
- Required states.
- Permission/approval behavior.
- Trace behavior.
- Responsive behavior.
- Visual QA acceptance.

## Non-Generic Quality Bar

Reject the direction if any of these are true:

- It looks like a generic admin dashboard.
- It starts with marketing/hero composition.
- It relies on metric cards without travel workflow context.
- It hides what the AI proposed, why, or with what data.
- It lets AI actions look executable without human review.
- It loses trace, risk, missing data or approval state on responsive widths.
- It opens AI evidence in a generic unbranded modal/sheet.
- It does not feel like travel agency operations: leads, travelers, itineraries, supplier options, margins, quotes, bookings and approvals.

Approve only if:

- Bukeer identity is visible through tokens, density and domain-specific components.
- Planner can operate quickly without changing pages for every decision.
- AI suggestions are editable and traceable.
- Sensitive actions are blocked or approval-gated.
- Manager and platform users can audit outcomes.

## UI Designer Handoff

The UI designer should deliver design decisions in a form that can be converted directly to code:

- Token values or token-role changes.
- Component variants and state behavior.
- Responsive rules at 1440, 1280, 834 and 390px.
- Specific fixes to v0 outputs.
- Visual QA notes with pass/fail evidence.
- Optional Figma frames only for communication, not as the canonical source.

## Sprint 0.25C Entry Criteria

Sprint 0.25C can start when:

- Planner Workbench V3 direction is approved or explicitly revised. **Met on 2026-05-18.**
- Tokens are locked for the first prototype. **Met for Signature Planner Workbench + Trace Inspector.**
- `NEXT_COMPONENT_CONTRACT_2026-05-18.md` includes component/state requirements.
- Beta/internal review has no unresolved critical confusion around AI action, approval, public send, payment, reservation or supplier hold.
- The backlog defines a fixture-first prototype route with no real writes. **Met for 0.25C prototype route.**
