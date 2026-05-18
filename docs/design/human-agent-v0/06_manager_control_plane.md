# Prompt 06: Manager Control Plane

Copy/paste this full prompt into v0.

---

Create a desktop-first React + TypeScript + Tailwind + shadcn/Radix UI concept for Bukeer "Manager Control Plane".

Context:

- Agency managers need visibility and control across humans, leads, itineraries, margin, SLA, approvals and AI agent behavior.
- The screen is an operational control plane, not an analytics landing page.
- Managers approve sensitive actions, investigate blocked AI actions and tune rollout by team/account.

Layout:

- Top summary strip: active leads, SLA breaches, approvals pending, margin risk, AI blocked, conversion trend.
- Left/main area: operational queues and tables.
- Right area: approval inbox and agent health.
- Lower area: traces, incidents, rollout flags and team performance.

Required modules:

- Approval inbox with pending actions: margin override, supplier hold, public send, confirmed itinerary mutation.
- SLA queue for conversations/leads.
- Margin risk table.
- AI blocked queue with policy reason.
- Agent performance table: suggestions accepted, edited, rejected, blocked, average confidence, escalation rate.
- Feature flag/rollout panel: account, team, domain, autonomy level.
- Incident strip: errors, tool failures, permission denials.
- Audit timeline.

Required states:

- Normal: manager dashboard with queues.
- Loading: refreshing approvals/metrics.
- Empty: no pending approvals.
- Error: metrics service failed, queues still visible.
- No permission: manager cannot access platform-global controls.
- AI suggestion: AI recommends redistributing leads.
- AI blocked: AI cannot execute mass outreach.
- Approval required: manager approval card with approve/edit/reject.

Design requirements:

- Dense, high-signal operational UI.
- Avoid generic metric cards; every metric should connect to a queue/action.
- No hero, no marketing copy, no decorative gradients.
- Use shadcn/Radix primitives and lucide-react icons.
- Include clear human-control language in controls, not slogans.
- Approval cards must show impact, data used, risk, requester, deadline and audit destination.
- Responsive: summary strip becomes horizontal scroll or compact grid; queues stack.
- Accessible labels and focus states.

Output:

- One complete Manager Control Plane screen with realistic mock data.
- No backend calls.
