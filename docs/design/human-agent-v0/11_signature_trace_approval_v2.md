# Prompt 11: Signature Agent Trace Approval V2

Copy/paste this full prompt into v0.

---

Build Agent Trace Approval for Bukeer, a B2B travel agency operating system.

This is a dark operational trace console for human approval of AI tool actions. It is not a dashboard and not a deployment pipeline.

## Layout

- Full-screen dark focus mode.
- Background `#15161E`.
- Center `TraceTimeline` max width 720px with connected `TraceNode` rows.
- Right `ToolInvocationDetail` panel width 420px on `#1B1D24`.
- Bottom full-width `ApprovalCommandBar` height 56px on `#262830`.
- No modal-only approval.
- No card grid.

## Bukeer Brand Tokens

- Primary `#7C57B3` only for selected trace focus and active detail tab.
- Secondary `#39D2C0` only for running tool call, active trace stream and live update.
- Tertiary `#EE8B60` for pending approval and human-in-the-loop interruption.
- Success `#34D399` for approved/completed.
- Error `#FF5963` for rejected/failed/blocked destructive.
- Warning `#FCDC0C` for policy warnings.

## Typography

- Outfit for trace section labels, command labels, tool names and status tags.
- Readex Pro for action summaries, evidence, parameters and impact text.
- Tabular numerals for timestamps, latency and confidence.

## Signature Components

Create these named components:

- `TraceTimeline`
- `TraceNode`
- `ToolInvocationDetail`
- `GuardrailResult`
- `PermissionCheck`
- `ApprovalCommandBar`
- `HumanDecisionStamp`
- `AuditLink`

## Trace Scenario

Agent wants to create itinerary draft for Mariana Rios:

- Context packet created.
- Reasoning summary produced.
- Tool call requested: `itinerary.createDraft`.
- Permission check passed for draft creation.
- Guardrail warning: margin below target and children ages missing.
- Approval interruption: pending manager approval.
- Human decision required.

## Required States

Show:

- Normal pending approval.
- Running tool call.
- Empty trace selected.
- Error loading trace.
- No permission to approve.
- AI suggestion safe draft.
- AI blocked payment/reservation/pricing override.
- Approval required.

## Microinteractions

- Running `TraceNode` uses `#39D2C0` animated arc.
- Pending approval `TraceNode` uses `#EE8B60` pulsing ring.
- Approved node turns `#34D399`.
- Rejected node turns `#FF5963`.
- Bottom command bar updates in place after decision.

## Global Negative Constraints

- No light background.
- No KPI cards.
- No modal-only approval.
- No GitHub Actions/Vercel deployment pipeline look.
- No blue progress bars.
- No hidden chain-of-thought; show concise reasoning summary and evidence only.
- AI actions must show rationale, data used, confidence, risk and trace.

## Output

- Generate one desktop-first React + TypeScript + Tailwind + shadcn/Radix screen.
- Include responsive behavior.
- No backend calls.
