# Prompt 02: Admin Shell

Copy/paste this full prompt into v0.

---

Create a desktop-first React + TypeScript + Tailwind + shadcn/Radix UI admin shell concept for Bukeer Admin Next.

Product context:

- Bukeer is a B2B travel agency management platform.
- This is an internal operational admin, not a marketing site.
- The future product is a Human-Agent Travel Operating System: humans operate and approve; AI agents suggest, draft, trace, and block unsafe actions.

Screen:

Build the main "Bukeer Admin Shell" with:

- Left sidebar navigation.
- Topbar with account switcher, global search/command palette trigger, current role, AI system health, notifications.
- Main operational dashboard area.
- Right collapsible "Agent Context" panel.
- Bottom or top status strip showing environment, feature flags, active account, impersonation state if any.

Navigation items:

- Apps
- Dashboard
- Planner Workbench
- Conversations
- Itineraries
- Contacts
- Products
- Package Kits
- Website Studio
- Reports
- Manager Control
- Agent Control
- Platform Admin

Main area should show a dense operational landing for a logged-in manager:

- Today's active leads.
- Conversations needing response.
- Itinerary drafts awaiting approval.
- Margin risk queue.
- AI blocked actions.
- Recent audit events.
- Quick actions using icon buttons and compact labels.

Agent Context panel:

- Current account context.
- What the AI can read.
- What the AI cannot do without approval.
- Active context packet summary.
- Last 3 tool invocations.
- "Review approvals" action.

Required states:

- Normal: populated dashboard.
- Loading: skeleton for cards/table rows.
- Empty: no pending approvals.
- Error: failed to load one module but shell stays usable.
- No permission: Platform Admin nav locked for non-global admin.
- AI suggestion: AI suggests prioritizing a high-intent lead.
- AI blocked: AI blocked supplier hold due policy.
- Approval required: itinerary publish needs manager approval.

Design requirements:

- Use shadcn/Radix primitives and lucide-react icons.
- Use compact tables/lists rather than large marketing cards.
- No landing hero, no decorative images, no gradient blob backgrounds.
- Keep sidebar and topbar stable; no layout shift.
- Must be professional, calm, dense, and scannable.
- Include responsive behavior: sidebar collapses to icon rail or drawer on mobile; right panel stacks below main content.
- Use accessible names for icon buttons and visible focus.

Output:

- A single polished admin shell concept with mock data.
- Code should be componentized enough to extract shell, nav item, metric row, approval row, trace row.
- No real auth, no backend calls.
