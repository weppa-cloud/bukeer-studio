# Next Component Contract: Human-Agent GUI Foundation

> Date: 2026-05-18
> Phase: 0.25
> Purpose: bridge v0/design outputs into implementable Next components.
> Scope: contract only, no production implementation.
> Design lock: `DESIGN_LOCK_CODE_FIRST_2026-05-18.md`

## Rules

- Components must use React, TypeScript, Tailwind and existing `components/ui/*` shadcn/Radix primitives where possible.
- Components must not perform data fetching directly unless explicitly designed as server components later.
- Agentic actions must receive already-authorized capabilities from server/session context.
- Every sensitive action must expose status, reason, required permission and approval state.
- No component should display hidden chain-of-thought. Show reasoning summary, evidence, data used and trace only.
- Components must preserve Bukeer signature visual roles: primary purple for structural identity, teal for live/realtime, orange for human-in-the-loop.
- Avoid generic SaaS component names in domain surfaces. Prefer Bukeer-specific components such as `TripRail`, `PlanningCanvas`, `LiveFeedColumn`, `TraceNode` and `ApprovalCommandBar`.
- Figma is not a required source of truth. If a Figma artifact exists, it is a commentable support board; the implementation source is tokens, registry, state model and this contract.
- Sprint 0.25C starts fixture-first. No real writes, public send, payment, reservation or supplier mutation can be wired from these components.
- Portal components must receive Bukeer visual scope explicitly. Drawers/sheets/dialogs cannot rely on the page root for typography, tokens or light/dark appearance.

## Shared State Model

```ts
type HumanAgentUiState =
  | "normal"
  | "loading"
  | "empty"
  | "error"
  | "no_permission"
  | "ai_suggestion"
  | "ai_blocked"
  | "approval_required"
  | "approved"
  | "rejected"
  | "executing"
  | "executed"
  | "trace_available";

type AgenticActionState =
  | "observed"
  | "suggested"
  | "drafted"
  | "blocked_missing_data"
  | "blocked_policy"
  | "approval_required"
  | "approved"
  | "executing"
  | "executed"
  | "rejected"
  | "expired";

type AgentAutonomyLevel =
  | "A0_readonly"
  | "A1_suggest"
  | "A2_draft"
  | "A3_confirmed_write"
  | "A4_live_gated";
```

## Core Data Shapes

```ts
type AgentSuggestion = {
  id: string;
  state: AgenticActionState;
  title: string;
  proposedAction: string;
  rationale: string;
  confidence: number;
  dataUsed: string[];
  riskLevel: "low" | "medium" | "high" | "critical";
  traceId: string;
  sourceFreshness?: string;
  autonomyLevel: AgentAutonomyLevel;
};

type AgentBlockedState = {
  id: string;
  state: Extract<AgenticActionState, "blocked_missing_data" | "blocked_policy">;
  title: string;
  reason: string;
  missingData?: string[];
  policyKey?: string;
  requiredPermission?: string;
  escalationPath?: string;
  traceId: string;
};

type ApprovalRequest = {
  id: string;
  state: Extract<AgenticActionState, "approval_required" | "approved" | "rejected" | "expired">;
  proposedAction: string;
  impact: {
    customer?: string;
    finance?: string;
    operations?: string;
  };
  riskFlags: string[];
  missingData: string[];
  requiredApprover: string;
  slaLabel?: string;
  traceId: string;
  agentRunId: string;
};

type TraceEvent = {
  id: string;
  type:
    | "context_packet"
    | "reasoning_summary"
    | "tool_call"
    | "permission_check"
    | "guardrail"
    | "approval"
    | "human_decision"
    | "outcome";
  title: string;
  status: "completed" | "pending" | "warning" | "blocked" | "error";
  timestamp: string;
  summary: string;
};

type TraceDrawerSummary = {
  traceId: string;
  agentRunId: string;
  dataUsed: string[];
  sourceFreshness: string;
  confidence: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  permissionResult: "allowed" | "denied" | "requires_approval";
  policyResult: "passed" | "warning" | "blocked";
  humanDecision?: "approved" | "approved_with_edits" | "rejected" | "escalated";
  auditLink: string;
};
```

Reference: `AGENTIC_UI_STATE_MODEL_2026-05-18.md`.

## Component Contracts

### `AdminShell`

Purpose: authenticated operational shell for Bukeer Admin Next.

Required slots:

- `sidebar`
- `topbar`
- `main`
- `agentContextRail`
- `statusStrip`

States:

- Normal shell.
- Loading session context.
- No permission for locked nav items.
- Partial module error.

Acceptance:

- Sidebar and topbar do not shift layout.
- Right rail can collapse.
- Account, role and environment are always visible.

### `PlannerWorkbenchLayout`

Purpose: primary lead-to-itinerary human-agent workspace.

Required slots:

- `tripRail`
- `planningCanvas`
- `liveFeedColumn`
- `marginGuard`
- `agentRail`
- `approvalCommandBar`

Acceptance:

- A planner can understand the lead, missing data, proposed itinerary and required approvals without changing pages.
- Trace is reachable from every AI suggestion and blocked action.
- The layout does not degrade into a sidebar/topbar/card-grid dashboard.

### `TripRail`

Purpose: left-side travel opportunity rail.

Required fields:

- Traveler/lead name.
- Destination.
- Trip duration/PAX.
- Source channel.
- SLA.
- Value.
- Missing data count.
- Status border.

Acceptance:

- Uses `#7C57B3` only for selected structural state.
- Does not look like a generic navigation sidebar.

### `LiveFeedColumn`

Purpose: realtime supplier/pricing/availability feed.

Required fields:

- Supplier/product name.
- Availability state.
- Net/sale/margin.
- Last updated.
- Source/tool.
- Risk or approval flag.

Acceptance:

- Uses `#39D2C0` for live update pulse/active trace only.
- Updates are row-based, not KPI-card based.

### `ApprovalCommandBar`

Purpose: bottom-anchored human decision/action strip.

Required fields:

- Current context.
- Pending approval count.
- Primary permitted action.
- Secondary safe actions.
- Blocked reason when applicable.

Acceptance:

- Uses `#EE8B60` for pending/human-in-the-loop states.
- Does not appear as a floating action button or generic modal footer.

### `ConversationCopilotPanel`

Purpose: CRM and public/private messaging assistant.

Required areas:

- Conversation summary.
- Missing data.
- Suggested reply.
- Qualification.
- Itinerary opportunity.
- Blocked itinerary draft state.

Acceptance:

- Public reply and private note are visually distinct.
- Suggested reply can be inserted, edited, sent after review or rejected.
- AI cannot appear to send publicly without human action.

### `ItineraryManifest`

Purpose: manifest-first itinerary planning surface. It replaces the generic Itinerary Builder direction for Sprint 0.25B.

Required areas:

- Day-by-day travel manifest.
- Traveler constraints and missing data.
- Selected segment editor.
- Product candidates.
- Pricing and margin guard.
- AI draft comparison.
- Missing data and approval rail.
- Trace links per AI-generated or changed segment.

Acceptance:

- Margin below threshold is visible.
- Product alternatives can be compared.
- Approval-required actions are not mixed with normal save actions.
- The screen communicates a travel plan/manifest, not a generic form builder.

### `AgentSuggestionCard`

Purpose: show a proposed AI action.

Required fields:

- Proposed action.
- Rationale.
- Confidence.
- Data used.
- Risk level.
- Trace link.
- Actions: accept, edit, reject.

Acceptance:

- User can explain why they reject or edit.
- Card never hides risk/confidence behind a generic "apply" button.

### `AgentBlockedCard`

Purpose: explain why AI cannot proceed.

Required fields:

- Block reason.
- Missing data or policy key.
- Required permission when applicable.
- Escalation path.
- Trace link.

Acceptance:

- AI blocked is distinct from technical error.
- User knows the next permitted action.

### `ApprovalCard`

Purpose: human decision surface for sensitive actions.

Required fields:

- Proposed action.
- Why this is proposed.
- Customer/finance/operations impact.
- Risk flags.
- Missing data.
- Required approver.
- SLA.
- Trace link.

Actions:

- Approve once.
- Approve with edits.
- Reject.
- Escalate.

Acceptance:

- User cannot approve without seeing impact and risk.
- Reject/edit captures feedback.

### `TraceTimeline`

Purpose: audit trail for agentic workflow.

Required events:

- Context packet.
- Reasoning summary.
- Tool call.
- Permission check.
- Guardrail.
- Approval.
- Human decision.
- Outcome.

Acceptance:

- Trace distinguishes pending, warning, blocked and error.
- Trace does not expose secrets or hidden chain-of-thought.

### `TraceInspector`

Purpose: right-side evidence and governance inspector for agentic actions.

Required fields:

- Trace ID.
- Agent run ID.
- Confidence.
- Permission result.
- Policy result.
- Audit link.
- Data used.
- Timeline events.
- Human approval boundary.

Required behavior:

- Opens from any AI suggestion, blocked state, itinerary segment or approval request.
- Receives `light` or `dark` appearance explicitly because it is rendered through a portal.
- Shows evidence and governance; it does not show hidden chain-of-thought.
- Does not execute writes or tool calls.

Acceptance:

- Uses Bukeer signature tokens for surface, border, trace line and state pills.
- Does not look like a generic shadcn sheet/modal.
- In dark mode, contrast remains readable for labels, pills, borders and timeline nodes.
- Human approval boundary remains visible above the timeline.

### `MissingDataChecklist`

Purpose: show data blocking or weakening the workflow.

Required fields:

- Missing item.
- Blocking vs warning.
- Owner/source.
- Action to request or fill data.

Acceptance:

- Blocking items prevent unsafe actions.
- Non-blocking warnings remain visible but do not halt workflow.

### `MarginGuardPanel`

Purpose: show pricing/margin risk and policy state.

Required fields:

- Current margin.
- Target margin.
- Delta.
- Risk flags.
- Suggested remediation.
- Approval requirement.

Acceptance:

- Financial risk is visible before proposal/send/publish actions.
- Overrides require approval state.

## Implementation Notes

- Start with static/story-like components before connecting Supabase.
- Use mock data from the v0 prompts for first review.
- Add Playwright visual checks once components are mounted in a route.
- Do not wire writes until `AdminSessionContext`, permissions and tool/action contracts exist.

## First Implementation Spike

Recommended spike order:

1. `AdminShell` static layout.
2. `PlannerWorkbenchLayout` with mock data.
3. `AgentSuggestionCard`, `AgentBlockedCard`, `ApprovalCard`.
4. `TraceTimeline`.
5. `ConversationCopilotPanel`.
6. `ItineraryManifest` with fixture data.
7. Visual QA at desktop and mobile widths.
