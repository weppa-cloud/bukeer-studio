# Prompt 08: Signature Planner Workbench V2

Copy/paste this full prompt into v0.

---

Build the Planner Workbench screen for Bukeer, a B2B travel agency operating system.

This is not a dashboard. It is a travel planning workbench for converting a live lead into an itinerary proposal with human-agent collaboration.

## Product Context

- Bukeer is an operational travel agency OS.
- Human planners stay in control.
- AI suggests, drafts, explains, blocks and requests approval.
- The UI must be recognizable as Bukeer, not generic SaaS.
- Keep the existing Bukeer Flutter brand palette and typography.

## Layout

- Full viewport app.
- Three-column split.
- Left 280px `TripRail`: active travel opportunities with colored left status borders, SLA, value, destination, source and missing data.
- Center flex `PlanningCanvas`: vertical itinerary/quote timeline, day sections and editable itinerary blocks. No card grid.
- Right 320px `LiveFeedColumn`: real-time supplier availability, pricing updates, margin guard and agent suggestions.
- Bottom 44px `CommandBar` across the full screen with context-aware actions and system state.
- No top navigation bar.

## Bukeer Brand Tokens

- Primary `#7C57B3` only for structural identity: active pane border, selected trip rail, focus ring.
- Secondary `#39D2C0` only for live/real-time states: streaming cursor, sync pulse, active trace node, updated price flash.
- Tertiary `#EE8B60` for human-in-the-loop states: approval required, pending supplier hold, unconfirmed itinerary block.
- Success `#34D399` only for confirmed/completed/approved states.
- Success dark `#048178` for strong success text/icons on light surfaces.
- Error `#FF5963` for rejected/failed/blocked destructive states.
- Warning `#FCDC0C` for expiring holds, price changes and schedule conflicts.
- Light surface `#F1F4F8` for operational canvas.
- Light card `#FFFFFF` for focused editable blocks.
- Dark surfaces `#15161E`, `#1B1D24`, `#2A2F3C`, `#262830` for copilot, trace and command areas.

Do not use blue, indigo or slate as primary tones.

## Typography

- Use Outfit for section headers, rail labels, active route names, command labels and status tags.
- Use Readex Pro for dense operational content, itinerary details, messages, metadata, form content and tables.
- Use tabular numerals for price, time, margin, SLA and confidence values.
- The difference between Outfit and Readex Pro must be visible.

## Signature Components

Create these named components:

- `TripRail`
- `PlanningCanvas`
- `LiveFeedColumn`
- `ItineraryBlock`
- `MarginGuard`
- `AgentSuggestionCard`
- `AgentBlockedCard`
- `ApprovalCommandBar`
- `TraceNode`
- `MissingDataChecklist`

## Sample Data

Selected lead:

- Mariana Rios.
- Family of 4.
- Cartagena, 5 days / 4 nights.
- Travel window: July 12-17, 2026.
- Needs: kid-friendly hotel, beach, old city, private transfers, flexible payment.
- Budget: USD 4,800.
- Source: WhatsApp campaign.
- Status: high intent.
- Missing: children ages, passport names.

Show trip rail items:

- Mariana Rios, Cartagena, USD 4,800, WhatsApp, SLA 18m, missing data.
- James Thornton, Medellin, USD 3,200, email, pending approval.
- Sophie Muller, Santa Marta + Tayrona, USD 9,500, referral, supplier hold.
- Camilo Vargas, Bogota + Eje Cafetero, USD 1,800, web, new.

Show live feed:

- Sofitel Legend Santa Clara: pending, margin 12.9%, supplier confirmation needed.
- Hotel Casa San Agustin: available, margin 18.6%, better fit.
- Rosario Islands private charter: on request, margin 18.7%.
- Private transfer CTG airport: confirmed, margin 17.4%.

## Required States

Show visible examples of:

- Normal.
- Loading.
- Empty.
- Error.
- No permission.
- AI suggestion.
- AI blocked.
- Approval required.

## Microinteractions

- Live price update row briefly flashes `#39D2C0` at low opacity.
- Pending approval trace node pulses with `#EE8B60`.
- Selected trip rail uses a `#7C57B3` structural border, not filled background.
- CommandBar updates state text when AI suggestion is accepted/rejected.

## Global Negative Constraints

- No KPI stat cards as primary composition.
- No generic dashboard layout: sidebar nav + topbar + rounded card grid.
- No purple filled buttons everywhere.
- No blue, indigo or slate as dominant colors.
- No emoji in UI.
- No floating action buttons.
- No onboarding empty-state illustrations.
- No gradient hero backgrounds.
- No chart-first layouts.
- No chat bubbles.
- No rounded-xl card grid with box shadows.
- Do not copy Linear, Notion, Vercel, ChatGPT or Codex visually.
- Only borrow specific behaviors: muted navigation, block-document editing, bottom command/status bar, trace console.
- AI actions must always show rationale, data used, confidence, risk and trace.
- `#EE8B60` must appear in a meaningful human-in-the-loop role.
- `#39D2C0` must appear only in live/streaming/active trace roles.
- `#7C57B3` must appear only as structural identity, not generic CTA fill.

## Output

- Generate a polished desktop-first React + TypeScript + Tailwind + shadcn/Radix UI screen.
- Include responsive behavior: columns become tabs or stacked panes on mobile.
- No backend calls.
- No placeholder lorem ipsum.
