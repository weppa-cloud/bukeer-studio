# Prompt 05: Itinerary Builder

Copy/paste this full prompt into v0.

---

Create a desktop-first React + TypeScript + Tailwind + shadcn/Radix UI concept for Bukeer "AI-Assisted Itinerary Builder".

Context:

- Bukeer manages travel itineraries, products, suppliers, pricing, margins and proposals.
- This screen is used by human planners.
- AI can draft itinerary structure, recommend products, check missing data and detect margin/policy risk.
- AI cannot silently publish, change confirmed financial data or reserve supplier holds without human approval.

Layout:

- Header: itinerary identity, status, traveler, dates, margin, owner, actions.
- Left panel: day-by-day itinerary timeline.
- Center panel: selected day/item editor.
- Right panel: AI assist, product search, margin/risk guard.
- Bottom sticky action bar: save draft, request approval, preview proposal, compare with AI draft.

Sample itinerary:

- Cartagena Family Escape.
- 5 days / 4 nights.
- Travelers: 2 adults, 2 children.
- Dates: July 12-17, 2026.
- Hotel: kid-friendly beach hotel pending confirmation.
- Activities: Old City walking tour, Rosario Islands soft day trip.
- Transfers: private airport transfers.
- Margin target: 18%; current margin: 14%.

Required features:

- Day timeline with hotel, activity, transfer and note blocks.
- Product candidate table: supplier, availability, net rate, sale price, margin, policy flags.
- AI draft comparison: current itinerary vs suggested change.
- Missing data list.
- Financial guard panel with margin risk and reasons.
- Approval card for margin override or supplier hold.
- Audit trail row for edits.
- No-permission lock for financial override.

Required states:

- Normal: editable itinerary draft.
- Loading: recalculating totals and AI checking alternatives.
- Empty: itinerary has no items yet, show permitted next actions.
- Error: pricing RPC failed but draft is preserved.
- No permission: user cannot override margin.
- AI suggestion: better hotel/activity combination.
- AI blocked: cannot publish because required traveler data is missing.
- Approval required: margin below threshold or confirmed booking mutation.

Design requirements:

- Dense operational builder, not a travel landing page.
- No oversized destination imagery.
- Use tables, panels, drawers, tabs and compact cards.
- Use shadcn/Radix primitives and lucide-react icons.
- AI actions must be explicit: apply draft, edit draft, reject, request approval.
- Trace should be accessible from every AI suggestion.
- Responsive: timeline, editor and AI panel stack into tabs on mobile.
- Include accessible focus and labels.

Output:

- One complete Itinerary Builder screen with mock data.
- No backend calls.
