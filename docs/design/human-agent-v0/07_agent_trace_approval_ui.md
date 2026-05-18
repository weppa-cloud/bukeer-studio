# Prompt 07: Agent Trace & Approval UI

Copy/paste this full prompt into v0.

---

Create a desktop-first React + TypeScript + Tailwind + shadcn/Radix UI concept for Bukeer "Agent Trace & Approval UI".

Context:

- Bukeer will expose travel-domain capabilities to AI agents through governed tools.
- Humans need to inspect what an agent did, what it wants to do, what data it used, and approve/reject sensitive actions.
- This UI must support audit, safety and trust for travel agency operations.

Screen goal:

Design a trace and approval workspace that can be opened from Planner Workbench, Conversation Copilot, Itinerary Builder or Manager Control Plane.

Layout:

- Header: agent run ID, domain, account, actor, autonomy level, status, started time, correlation ID.
- Left column: chronological trace timeline.
- Center column: selected tool invocation details.
- Right column: approval decision panel.
- Footer/sticky bar: approve, edit before approve, reject, escalate, copy audit link.

Trace timeline should include:

- Context packet created.
- AI reasoning summary, not raw hidden chain-of-thought.
- Tool call requested.
- Permission check.
- Tool result.
- Guardrail result.
- Approval interruption.
- Human decision.
- Final outcome.

Selected invocation details:

- Tool name: `itinerary.createDraft`.
- Parameters: safe visible JSON-like table.
- Data used: lead, traveler preferences, product candidates, margin rules.
- Permissions checked.
- Risk classification.
- Idempotency key.
- Rollback/audit policy.
- Related entities.

Approval panel:

- Proposed action.
- Why the agent proposes it.
- Impact on customer/finance/operations.
- Risk flags.
- Missing data.
- Required approver.
- Deadline/SLA.
- Decision buttons: approve once, approve with edits, reject, escalate.
- Rejection reason and feedback fields.

Required states:

- Normal: completed trace with pending approval.
- Loading: stream of tool invocation running.
- Empty: no trace selected.
- Error: trace load failed but run summary visible.
- No permission: user cannot approve this action.
- AI suggestion: agent proposes safe draft creation.
- AI blocked: guardrail blocked payment/reservation/pricing action.
- Approval required: pending human decision with clear actions.

Design requirements:

- No chat-only UI. This is an operational audit/approval console.
- Do not reveal hidden chain-of-thought; show concise reasoning summary and evidence.
- Use shadcn/Radix primitives and lucide-react icons.
- Make the difference between technical error, policy block and approval pending visually clear.
- Include compact JSON/details table, tabs and accordions.
- Responsive: trace, details and approval become tabs on mobile.
- Accessibility: focus trap in dialogs, labeled buttons, keyboard navigation.

Output:

- One complete trace/approval workspace with mock data.
- No backend calls.
