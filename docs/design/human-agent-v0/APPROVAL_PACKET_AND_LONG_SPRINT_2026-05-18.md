# Approval Packet & Long Sprint Plan

> Date: 2026-05-18
> Scope: Bukeer Human-Agent GUI Foundation, v0 Signature V2, registry-backed V3 next sprint.
> Approval status: **Option 1 approved on 2026-05-18**.
> Revision: Sprint 0.25B now uses Design Lock Code-First. Figma is optional support, not the implementation gate.

## Approval Decision Needed

Approve the design direction, not production implementation.

Approved decision:

- Approve `Planner Workbench V2` as the **primary direction**.
- Approve `Conversation Copilot V2` as the **supporting CRM/messaging pattern**.
- Approve `Trace Approval V2` as the **governance pattern**.
- Do not approve `Itinerary Builder V2` as-is. Approve a rebuild as `Itinerary Manifest V3`.

## Samples For Review

### Sample 1: Planner Workbench V2

Screenshot:

- `screenshots/08_signature_planner_workbench_v2.png`

Approval recommendation:

- **Approve with revisions**.

Why:

- Best Bukeer-specific product direction.
- Shows `TripRail`, planning canvas, supplier feed, margin guard, missing data, AI suggestions and approval command bar.
- Feels like a travel operations workspace, not a generic dashboard.

Required revisions:

- Stronger trace drawer.
- Clearer state model for suggested/drafted/blocked/approval/executed.
- Responsive proof.
- Accessibility and contrast pass.

### Sample 2: Conversation Copilot V2

Screenshot:

- `screenshots/09_signature_conversation_copilot_v2.png`

Approval recommendation:

- **Approve as supporting pattern**.

Why:

- Strong public/private messaging boundary.
- Entity extraction panel is useful.
- Missing-data and blocked-itinerary states are visible.
- Good base for WhatsApp/email AI copilot.

Required revisions:

- Trace drill-down from every suggested reply.
- Disable public send when missing data or policy blocks.
- Confirm accessibility in dark surface.

### Sample 3: Trace Approval V2

Screenshot:

- `screenshots/11_signature_trace_approval_v2.png`

Approval recommendation:

- **Approve as governance pattern**.

Why:

- Strongest trace and approval model.
- Separates context packet, reasoning summary, tool invocation, approval interruption and blocked action.
- Useful for all sensitive AI operations.

Required revisions:

- Add related trip/customer context.
- Clarify tool, permission, policy and risk sections.
- Ensure no hidden chain-of-thought is exposed.

### Sample 4: Itinerary Builder V2

Screenshot:

- `screenshots/10_signature_itinerary_builder_v2.png`

Approval recommendation:

- **Do not approve as primary direction**.
- Approve rebuild as `Itinerary Manifest V3`.

Why:

- It is useful but still too generic.
- Too much empty space.
- Supplier context is underused.
- It does not yet feel strongly like Bukeer.

Required rebuild:

- Day/segment manifest rail.
- Supplier evidence.
- Passenger readiness.
- Proposal readiness.
- Margin guard.
- Trace drawer.
- Approval command bar.

## Approval Checklist

Approve only if the team agrees:

- Bukeer should be workbench-first, not dashboard-first.
- AI must propose/draft before acting.
- Sensitive actions require visible approval.
- Trace is a first-class UI element.
- Planner Workbench is the first product experience to prototype.
- Itinerary Builder will be rebuilt as Itinerary Manifest.

## Proposed Long Sprint

Name:

**Sprint 0.25B: Bukeer Design Lock Code-First & Human-Agent Prototype**

Recommended duration:

- **4 weeks**.

Why 4 weeks:

- Shorter than 4 weeks will likely produce more screenshots but not enough validation.
- Longer than 4 weeks risks over-designing before beta feedback.
- Four weeks is enough to run registry-backed v0 V3, lock tokens/component contracts, validate with beta partners and prepare the Next prototype backlog.

## Sprint Objective

Turn the approved visual direction into a validated, implementable product foundation for Bukeer Admin Next.

The sprint does not build production admin routes yet. It produces the foundation required to build them safely.

## Sprint Outcomes

By the end of the sprint, we should have:

1. Approved Bukeer Human-Agent UI state model.
2. Registry-backed v0 V3 outputs.
3. Bukeer Signature Direction selected: one primary direction and one alternative.
4. Design System Lock Code-First: tokens, component contracts, state variants and responsive rules.
5. Beta partner feedback on Planner Workbench.
6. Next component contract ready for implementation.
7. Decision: proceed to AdminShell/Planner prototype or revise design.

## Week 1: State Model + Registry-Backed V3

Goals:

- Finalize `AGENTIC_UI_STATE_MODEL_2026-05-18.md`.
- Run V3 prompts using registry context.
- Produce Planner V3, Conversation V3, Trace V3 and Itinerary Manifest V3.

Deliverables:

- Updated screenshots.
- V3 evaluation.
- Updated Visual QA scores.

Acceptance:

- Planner/Conversation/Trace score >= 40/45.
- Itinerary Manifest score >= 37/45 and no automatic rejection.
- No screen exposes hidden chain-of-thought.

## Week 2: Design System Lock Code-First

Goals:

- Convert approved V3 direction into tokens, components, variants and responsive rules.
- Make the Next/Tailwind component contract implementation-ready without waiting on a Figma handoff.

Deliverables:

- `DESIGN_LOCK_CODE_FIRST_2026-05-18.md`.
- Locked token roles for color, typography, spacing, radius, borders, elevation, density and agentic states.
- Updated `NEXT_COMPONENT_CONTRACT_2026-05-18.md`.
- Prototype-ready component inventory for AdminShell, PlannerWorkbench, ConversationCopilot, TraceApprovalPanel, ItineraryManifest and ManagerControlPlane.
- Optional Figma/lightweight board only if beta partners or an external UI designer need commentable frames.

Acceptance:

- Component states include normal, loading, empty, error, no permission, AI suggestion, AI blocked, approval required.
- Agentic states include suggested, drafted, blocked_missing_data, blocked_policy, approval_required, approved, executing, executed, rejected and expired.
- Responsive rules cover 1440, 1280, 834 and 390px.
- Sprint 0.25C can start a fixture-first Next prototype from tokens and component contracts.

## Week 3: Beta Review + Iteration

Goals:

- Test Planner Workbench with beta partners or senior internal travel planners.
- Validate comprehension, trust and daily usability.

Deliverables:

- 3-5 review sessions.
- Scorecard.
- Recorded findings.
- Decision log.

Acceptance:

- Average score >= 4.0/5.
- No critical confusion around public send, payment, reservation, supplier hold or approval.
- Users can explain what the AI proposed and what the human must decide.

## Week 4: Implementation Readiness

Goals:

- Convert design direction into engineering-ready contracts.
- Prepare the first implementation sprint.

Deliverables:

- Updated `NEXT_COMPONENT_CONTRACT_2026-05-18.md`.
- Component list and props.
- State machine contract.
- Trace drawer contract.
- Approval command bar contract.
- Implementation ticket breakdown for AdminShell + Planner prototype.

Acceptance:

- Engineering can estimate implementation.
- Product/design can sign off on first build slice.
- No unresolved P0 design findings remain.

## Recommended Next Build Sprint After This

Name:

**Sprint 0.25C: Planner Workbench Prototype in Next**

Likely duration:

- 3-4 weeks.

Build scope:

- Non-production prototype route.
- Static/fixture data first.
- Real session/permissions later.
- Planner Workbench shell.
- TripRail.
- PlanningCanvas.
- TraceDrawer.
- ApprovalCommandBar.
- State variants.

Do not include:

- Real writes.
- Payment/reservation actions.
- Supplier mutations.
- Public send.

## Decision Request

Approve one of these:

1. **Approve recommended path**: Planner V2 primary + Conversation/Trace supporting + rebuild Itinerary as Manifest + 4-week Sprint 0.25B.
2. **Approve only visual direction**: wait on beta and Figma until later.
3. **Request another v0 cycle first**: run registry-backed V3 before Figma.
4. **Reject direction**: restart visual exploration.

Approved: **Option 1**.
