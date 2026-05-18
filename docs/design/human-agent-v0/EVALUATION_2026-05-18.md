# v0 Evaluation: Human-Agent UX Foundation

> Date: 2026-05-18
> Scope: first visual review of completed v0 concepts for Bukeer Admin Next Fase 0.25.
> Status: all seven v0 concepts completed and screenshots captured.

## Recommendation

Use **Planner Workbench** as the primary direction for the first human-agent operating surface, with **Agent Trace & Approval UI** as the mandatory governance pattern.

Keep **Itinerary Builder** as the lighter alternative direction for transactional builder surfaces, but do not adopt its current large empty center area without adding denser product/pricing context.

Do not use the Design System preview as final product direction. Use it only as a token/component inventory.

## Concept Review

| Concept | Status | Decision | Notes |
|---|---|---|---|
| Human-Agent Design System | Completed | Support artifact | Useful state vocabulary and component inventory, but visually too generic and light for the final operating experience. |
| Admin Shell | Completed | Directional support | Strong operational shell, good sidebar/topbar/right agent context. Needs less monochrome dark treatment and clearer hierarchy for repeated daily use. |
| Planner Workbench | Completed | Primary direction | Best alignment with agency workflow. Shows lead queue, trip brief, itinerary draft, missing data, AI suggestion, AI blocked, approval required and trace affordance. |
| Conversation Copilot | Completed | Required workflow pattern | Strong public/private boundary, suggested reply and missing data treatment. Less dense than Planner Workbench, but necessary for CRM and Chatwoot migration. |
| Itinerary Builder | Completed | Alternative direction | Strong builder mechanics, margin guard and approval affordance. Needs denser center canvas and clearer product comparison table. |
| Manager Control Plane | Completed | Manager pattern input | Strong queues and governance posture. Current version is dense enough, but needs simplification to avoid an always-on crisis dashboard. |
| Agent Trace & Approval UI | Completed | Required governance pattern | Strongest audit/approval surface. Good distinction between reasoning summary, tool invocation, permissions, guardrails, impact and approval actions. |

## What To Carry Forward

- Three-panel operational layout: queue/context, main work surface, AI/trace/approval rail.
- Visible AI states: suggestion, blocked, approval required.
- Explicit missing-data cards before agent action.
- Trace affordance attached to every AI suggestion or blocked action.
- Approval cards with impact, risk, approver, deadline and decision buttons.
- Audit timeline that shows context packet, tool call, permission check, guardrail, human decision and outcome.
- Dense tables/lists over generic KPI cards.
- Public vs private composer boundaries from Conversation Copilot.
- Blocked itinerary draft when missing data is unresolved.

## What To Reject Or Rework

- Dark UI as the only direction. It works for control/trace surfaces, but daily planner work may need a calmer light or mixed surface mode.
- Generic SaaS metrics that are not tied to queues or next actions.
- Overloaded manager dashboard sections where every item reads as urgent.
- Empty center space in builder and conversation screens.
- Any AI action that only says "apply" without showing source, risk, confidence and audit destination.

## Required Follow-Up

1. Select the primary visual direction with beta partners: recommend Planner Workbench + Trace/Approval.
2. Ask UI designer to produce a refined GUI foundation from these outputs, not copy v0 code directly.
3. Convert approved patterns into implementable Next components:
   - `AdminShell`
   - `PlannerWorkbenchLayout`
   - `ConversationCopilotPanel`
   - `AgentSuggestionCard`
   - `AgentBlockedCard`
   - `ApprovalCard`
   - `TraceTimeline`
   - `MissingDataChecklist`
   - `MarginGuardPanel`
4. Keep v0 outputs outside production until design QA and accessibility review pass.

## Anti-Generic Addendum

After reviewing the first concepts and the user's concern, the core problem is not only screen structure. It is lack of a recognizable Bukeer visual grammar.

The next design pass must use `SIGNATURE_VISUAL_DIRECTION_2026-05-18.md` as a hard requirement:

- Primary purple `#7C57B3` is structural identity, not default CTA fill.
- Teal `#39D2C0` is live/realtime/active trace only.
- Orange `#EE8B60` is human-in-the-loop: approval required, pending hold, unconfirmed operation.
- Planner Workbench must use `TripRail`, `PlanningCanvas`, `LiveFeedColumn` and bottom `CommandBar`.
- Conversation Copilot must avoid generic chat bubbles.
- Itinerary Builder must feel like a travel manifest, not a form or spreadsheet.
- Trace Approval must feel like a focused operational trace console.

Reject any output that still reads as sidebar + topbar + rounded card grid.
