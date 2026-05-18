# Prompt 01: Human-Agent Design System

Copy/paste this full prompt into v0.

---

Create a desktop-first React + TypeScript + Tailwind + shadcn/Radix UI design system preview for Bukeer Admin, a B2B travel agency operating system where human travel planners work with AI agents.

Context:

- Product: Bukeer, B2B travel management platform for agencies.
- Use case: internal operational admin, not public marketing.
- Users: travel agents/planners, agency managers, platform admins.
- Visual direction: calm, professional, dense, work-focused, high information clarity.
- Avoid: landing page, hero section, decorative illustrations, generic SaaS dashboard, dominant gradients, giant cards, empty marketing copy.
- Use lucide-react icons for actions and statuses.
- Use shadcn/Radix primitives where appropriate: Button, Badge, Dialog, Tabs, Select, Tooltip, DropdownMenu, Sheet, Table, ScrollArea.
- Cards must be compact with border radius <= 8px.

Build a single preview screen named "Bukeer Human-Agent Design System" containing:

1. Color and surface system:
   - Neutral app shell surfaces.
   - Primary action.
   - Success, warning, danger, info.
   - Agentic states: AI suggestion, AI blocked, approval required, trace, human override.
   - Permission states.

2. Typography and density:
   - Page heading, section heading, table text, metadata, microcopy.
   - Compact operational spacing for repeated workflows.

3. Component gallery:
   - Buttons: primary, secondary, ghost, destructive, approve, reject, edit before apply.
   - Icon buttons with tooltips.
   - Badges: lead status, itinerary status, margin risk, permission, AI confidence.
   - Data table row examples.
   - Filter bar.
   - Right panel shell.
   - Approval card.
   - AI suggestion card.
   - AI blocked card.
   - Audit timeline item.
   - Empty, error, no permission states.

4. Agent state anatomy:
   - Show how every AI suggestion displays "proposed action", "why", "data used", "risk", "confidence", "human decision".
   - Show a compact trace line: Context -> Tool -> Result -> Approval -> Outcome.

Required states shown visibly in the preview:

- Normal.
- Loading.
- Empty.
- Error.
- No permission.
- AI suggestion.
- AI blocked.
- Approval required.

Sample data should be travel-agency specific:

- Lead: Mariana Rios, family trip to Cartagena, 4 travelers, July 2026.
- Itinerary: Cartagena 5D/4N, margin risk 14%, supplier pending.
- Conversation: WhatsApp lead asking for beach + old city + kid-friendly hotel.
- Approval: AI wants to create an itinerary draft and reserve supplier hold, but supplier hold requires manager approval.

Design constraints:

- Do not create a hero page.
- Do not include explanatory onboarding text.
- Do not overuse purple, blue gradients, beige, brown, or one-color palettes.
- Text must fit on desktop and mobile.
- Make the layout responsive: desktop preview first, stack sections cleanly on mobile.
- Use accessible labels, focus states, and keyboard-friendly controls.

Output:

- Generate one polished preview page with mock data.
- Keep code production-quality enough to later extract components.
- Include no backend calls.
