# UI Designer Brief: Bukeer Human-Agent GUI Foundation

> Date: 2026-05-18
> Phase: 0.25
> Epic: `weppa-cloud/bukeer-flutter#823`
> Related issues: #825, #826, #827, #828
> Source: v0 prompt pack and completed screenshots in `docs/design/human-agent-v0/`
> Working mode: Design Lock Code-First. Figma is optional support, not the canonical handoff.

## Objective

Create a refined, implementable GUI foundation for Bukeer Admin Next. The goal is not to copy Flutter screens and not to copy v0 code directly. The goal is to define the next Bukeer operating experience as tokens, component contracts, states and prototype-ready rules: a travel agency workspace where humans control decisions and AI agents suggest, draft, explain, block and request approval with traceability.

## Recommended Direction

Primary direction:

- Planner Workbench as the main human-agent operating surface.
- Agent Trace & Approval UI as the mandatory governance pattern.

Secondary direction:

- Itinerary Manifest as the pattern for transactional itinerary workflows.
- Conversation Copilot as the pattern for CRM/public-private messaging boundaries.

Do not use the Design System preview as product direction. Use it as inventory for tokens, states and component anatomy only.

## Design Inputs

Review these screenshots:

- `screenshots/08_signature_planner_workbench_v2.png`
- `screenshots/09_signature_conversation_copilot_v2.png`
- `screenshots/10_signature_itinerary_builder_v2.png`
- `screenshots/11_signature_trace_approval_v2.png`
- `screenshots/03_planner_workbench.png`
- `screenshots/07_agent_trace_approval_ui.png`
- `screenshots/04_conversation_copilot.png`
- `screenshots/05_itinerary_builder.png`
- `screenshots/02_admin_shell.png`
- `screenshots/06_manager_control_plane.png`
- `screenshots/01_human_agent_design_system.png`

Review these docs:

- `SIGNATURE_VISUAL_DIRECTION_2026-05-18.md`
- `V0_SIGNATURE_PROMPTING_GUIDE_2026-05-18.md`
- `BUKEER_SIGNATURE_TOKENS_2026-05-18.md`
- `V0_DESIGN_SYSTEM_REGISTRY_PLAN_2026-05-18.md`
- `VISUAL_QA_RUBRIC_2026-05-18.md`
- `EVALUATION_SIGNATURE_V2_2026-05-18.md`
- `EXPERT_UX_UI_AUDIT_2026-05-18.md`
- `DESIGN_REVISION_BACKLOG_2026-05-18.md`
- `AGENTIC_UI_STATE_MODEL_2026-05-18.md`
- `DESIGN_LOCK_CODE_FIRST_2026-05-18.md`
- `NEXT_COMPONENT_CONTRACT_2026-05-18.md`
- `EVALUATION_2026-05-18.md`
- `V0_RUNS.md`
- `README.md`
- `docs/specs/SPEC_HUMAN_AGENT_EXPERIENCE_GUI_FOUNDATION.md`
- `FIGMA_FOUNDATION_BRIEF_2026-05-18.md` only if commentable frames are needed
- `registry/README.md`

## Product Principles

1. Human in control.
2. AI proposes before acting.
3. Traceability visible by default.
4. Missing data blocks unsafe progress.
5. Approval required is a first-class state.
6. Dense operational UI for real agency work.
7. No landing-page or marketing composition.
8. No hidden dangerous automation.
9. Public/private communication boundaries must be obvious.
10. Daily-use screens should not feel like a permanent incident dashboard.
11. The UI must be recognizable as Bukeer without relying only on logo and text labels.
12. Bukeer primary purple is structural identity, not the default filled CTA color.
13. Teal means live/realtime/active trace, not generic success.
14. Tertiary orange means human-in-the-loop, approval required or unconfirmed travel operation.

## Required Screens To Design

### 1. Admin Shell

Required:

- Sidebar with core modules.
- Topbar with account switcher, search/command, role, notification, AI state.
- Right agent context rail or collapsible panel.
- Environment/flag/account status strip.
- Platform Admin locked/no-permission state.

Design challenge:

- Keep it operational and dense without making the whole product feel like a dark SOC console.

### 2. Planner Workbench

Required:

- Lead/conversation queue.
- Trip brief.
- Missing-data checklist.
- AI suggestion cards.
- Itinerary draft timeline.
- Product/pricing/margin context.
- Approval required card.
- Trace affordance.
- Human actions: accept, edit, reject, request approval.

This is the first priority screen.

### 3. Conversation Copilot

Required:

- Conversation inbox.
- Chat thread.
- Public reply composer.
- Private note composer.
- Suggested reply with confidence, rationale and edit controls.
- Missing data and qualification panel.
- Blocked "create itinerary draft" until required data is resolved.
- No public send by AI without human review.

Design challenge:

- Make the workspace denser and more agency-operational than the initial v0 output, while preserving the clear public/private boundary.

### 4. Itinerary Manifest

Required:

- Day/segment manifest.
- Passenger readiness.
- Proposal readiness.
- Selected segment editor.
- Product candidates table.
- Pricing and margin guard.
- AI draft comparison.
- Missing data.
- Approval required for margin override or confirmed booking mutation.

Design challenge:

- Replace generic builder feel with a travel manifest. Add product comparison, pricing detail, supplier evidence and audit context where useful.

### 5. Agent Trace & Approval

Required:

- Trace timeline.
- Tool invocation details.
- Reasoning summary, not hidden chain-of-thought.
- Parameters and data used.
- Permission and guardrail results.
- Impact/risk/missing data.
- Decision actions: approve once, approve with edits, reject, escalate.
- Copy audit link.

This pattern must be reusable across Planner, Conversation, Itinerary and Manager surfaces.

### 6. Manager Control Plane

Required:

- Approval inbox.
- SLA queue.
- Margin risk.
- AI blocked queue.
- Agent performance.
- Rollout flags.
- Incidents/errors.
- Audit timeline.

Design challenge:

- Distinguish everyday management from emergency response. Avoid making every element look equally critical.

## Required States

Every key surface must show:

- Normal.
- Loading.
- Empty.
- Error.
- No permission.
- AI suggestion.
- AI blocked.
- Approval required.

## Component Deliverables

Deliver component specs for:

- `AdminShell`
- `AdminSidebar`
- `AdminTopbar`
- `AgentContextRail`
- `PlannerWorkbenchLayout`
- `ConversationCopilotPanel`
- `ItineraryManifest`
- `AgentSuggestionCard`
- `AgentBlockedCard`
- `ApprovalCard`
- `TraceTimeline`
- `ToolInvocationDetail`
- `MissingDataChecklist`
- `MarginGuardPanel`
- `AuditTimeline`
- `PermissionLockedState`

For each component, include:

- Purpose.
- Anatomy.
- Variants.
- States.
- Data fields required.
- Interaction notes.
- Accessibility requirements.
- Responsive behavior.

## Visual Direction Requirements

Use:

- Bukeer Flutter palette roles exactly as defined in `SIGNATURE_VISUAL_DIRECTION_2026-05-18.md`.
- Calm neutral surfaces.
- Strong but restrained status colors.
- Compact table/list rows.
- Clear right rails and drawers.
- Signature components: `TripRail`, `PlanningCanvas`, `LiveFeedColumn`, `TraceNode`, `ItineraryBlock`, `ApprovalCommandBar`, `CopilotThread`, `EntityExtractionPanel`.
- Lucide-style iconography.
- Border radius <= 8px for cards/panels unless a system token says otherwise.
- Light or mixed mode for daily planner work; dark mode can be stronger for trace/control surfaces.

Avoid:

- Hero sections.
- Decorative illustrations.
- One-color palettes.
- Purple/blue gradient dominance.
- Oversized metric cards disconnected from queues.
- AI buttons without rationale, risk and audit destination.
- Generic dashboard composition: sidebar nav + topbar + rounded card grid.
- Chat bubbles for Conversation Copilot.
- Filled purple buttons as the primary interaction pattern.

## Anti-Generic Acceptance Test

Reject a direction if:

- It could be mistaken for a generic BI/SaaS admin after removing travel labels.
- The only recognizable Bukeer elements are logo and color.
- It does not include Bukeer-specific components such as `TripRail`, `LiveFeedColumn`, `ItineraryBlock`, `TraceNode` or `ApprovalCommandBar`.
- It does not visibly separate Outfit and Readex Pro usage.
- It does not use tertiary orange for human-in-the-loop states.
- It does not use teal for live/realtime states.

## Handoff Artifacts Expected

- Token changes or confirmation against `BUKEER_SIGNATURE_TOKENS_2026-05-18.md`.
- Component specs or changes against `NEXT_COMPONENT_CONTRACT_2026-05-18.md`.
- State matrix updates against `AGENTIC_UI_STATE_MODEL_2026-05-18.md`.
- Optional Figma file only when commentable visual review is needed.
- Desktop primary breakpoint.
- Tablet/mobile responsive behavior.
- Component inventory.
- Beta partner walkthrough frames.
- Implementation notes for Next + Tailwind + shadcn/Radix.
- Accessibility checklist.

## Acceptance Criteria

- Planner Workbench is ready for beta partner review.
- Trace & Approval pattern is approved as governance baseline.
- Conversation Copilot clearly separates public reply, private note and AI suggestion.
- Itinerary Manifest resolves the previous empty-space and pricing-context issues.
- No generated v0 code is treated as production code without design/engineering review.
- Sprint 0.25C can start from tokens and component contracts without waiting on a complete Figma foundation.
