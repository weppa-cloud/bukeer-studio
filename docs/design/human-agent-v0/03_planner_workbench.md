# Prompt 03: Planner Workbench

Copy/paste this full prompt into v0.

---

Create a desktop-first React + TypeScript + Tailwind + shadcn/Radix UI concept for "Planner Workbench", the priority human-agent workspace for Bukeer Admin.

Product context:

- Bukeer is a B2B travel agency operating system.
- The Planner Workbench helps a human travel planner turn leads/conversations into quotes and itineraries.
- AI can summarize, suggest, draft, compare and flag risk, but the human decides and approves sensitive actions.

Primary workflow:

Lead/conversation -> qualification -> AI suggestions -> itinerary draft -> product selection -> margin guard -> human approval -> proposal ready.

Layout:

- Left rail: lead/conversation queue with filters and priority signals.
- Center workspace: selected lead, trip brief, itinerary draft, product candidates, pricing/margin panel.
- Right rail: AI Copilot with suggestions, missing data, action plan, trace preview.
- Drawer/sheet: approval details and audit trace.

Selected sample lead:

- Mariana Rios.
- Family of 4.
- Cartagena, 5 days / 4 nights.
- Travel window: July 12-17, 2026.
- Needs: kid-friendly hotel, beach, old city, private transfers, flexible payment.
- Budget: USD 4,800.
- Source: WhatsApp campaign.
- Status: high intent, missing children ages and passport names.

Required modules:

- Lead queue with SLA timers and source badges.
- Trip brief editable summary.
- AI suggestion card with "why", "data used", "confidence", "edit before apply".
- Missing data checklist.
- Itinerary draft timeline with hotel/activity/transfer blocks.
- Product candidates table with supplier, availability, net, sale, margin, risk.
- Margin guard panel.
- Approval card for actions requiring manager review.
- Trace preview showing context packet, tool calls and result.
- Human feedback controls: accept, edit, reject, mark wrong reason.

Required states:

- Normal: selected lead and full workbench.
- Loading: AI generating itinerary draft.
- Empty: no leads in current filter.
- Error: product availability service failed but lead context remains.
- No permission: user cannot approve margin override.
- AI suggestion: suggested reply and itinerary draft.
- AI blocked: AI cannot create supplier hold because children ages missing.
- Approval required: margin below threshold or supplier hold.

Design requirements:

- Dense operational UI, not a SaaS marketing dashboard.
- Use shadcn/Radix: Tabs, Sheet, Dialog, Button, Badge, Table, Tooltip, Select, ScrollArea.
- Use lucide-react icons.
- Show real travel data, not placeholders.
- Make it fast to scan: compact rows, strong hierarchy, sticky action bar.
- Do not use a hero section.
- Do not hide AI reasoning behind vague labels.
- Responsive: on mobile, queue -> selected workbench -> copilot in stacked tabs.
- Accessibility: keyboard-friendly queue, focus-visible buttons, labeled icon actions.

Output:

- One complete Planner Workbench screen.
- Include enough mock states to toggle visually or show stacked state examples.
- No backend calls.
