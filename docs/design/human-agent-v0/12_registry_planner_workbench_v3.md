# Prompt 12: Registry Planner Workbench V3

Use the Bukeer registry and revise the Planner Workbench V2 into a production-grade concept.

Registry:

- `public/r/bukeer-admin-next/registry.json`
- Start from `signature-planner-workbench`.

Reference docs:

- `EXPERT_UX_UI_AUDIT_2026-05-18.md`
- `AGENTIC_UI_STATE_MODEL_2026-05-18.md`
- `BUKEER_SIGNATURE_TOKENS_2026-05-18.md`
- `VISUAL_QA_RUBRIC_2026-05-18.md`

## Goal

Create a React + Tailwind + shadcn/Radix desktop-first screen for Bukeer Planner Workbench V3.

It must feel like Bukeer: a travel operations workbench where agents build proposals with AI assistance, visible traceability and human approval gates.

## Must Keep

- `TripRail`
- `PlanningCanvas`
- `LiveFeedColumn`
- `MarginGuard`
- `MissingDataChecklist`
- `CopilotThread`
- `TraceNode`
- `ApprovalCommandBar`

## Must Improve

1. Add trace drawer for every AI suggestion.
2. Use the strict agentic state model:
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
3. Add disabled action states with reasons.
4. Show whether anything has been sent publicly, reserved or paid.
5. Add responsive notes or frames for 1440, 1280, 834 and 390px.
6. Preserve Bukeer color roles:
   - purple = structure
   - teal = live/realtime
   - orange = human-in-the-loop
   - red = blocked/destructive
   - yellow = stale/warning
7. Keep navigation quiet. Work surface leads.

## Required Content

Scenario:

- Mariana Rios, Cartagena family trip.
- Budget USD 4,800.
- Missing children ages and passport names.
- AI suggests hotel swap to improve margin.
- Supplier hold expires soon.
- Manager approval required before sending proposal.

Show:

- Lead/opportunity rail.
- Itinerary planning canvas.
- Supplier live feed.
- AI suggestion with rationale summary.
- Trace drawer with data used, source freshness, permission result, policy result, confidence, risk and human decision history.
- Margin guard.
- Missing data checklist.
- Approval command bar.

## Hard Rejections

- No KPI-card-first dashboard.
- No generic sidebar/topbar/card grid.
- No purple CTA everywhere.
- No hidden chain-of-thought.
- No "Approve & Send" enabled when missing data or policy blocks the action.
- No chat bubble UI.

## Output

Generate:

- React components with Tailwind.
- Component names aligned to Bukeer vocabulary.
- Normal, loading, empty, error, no permission, AI suggestion, AI blocked and approval required states.
- Brief notes in code comments only where state logic is not obvious.
