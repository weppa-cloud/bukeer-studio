# Bukeer Signature Visual Direction

> Date: 2026-05-18
> Phase: 0.25
> Purpose: prevent generic SaaS output and define a recognizable Bukeer Admin Next visual language.

## Why This Exists

The first v0 outputs were useful for workflow exploration, but several screens still looked like a generic SaaS admin: sidebar, topbar, card grid, metric cards and ordinary badges. Bukeer needs a recognizable product feel. A user should feel they are inside Bukeer, not inside an interchangeable dashboard template with travel labels.

The visual direction must keep the Bukeer Flutter palette and Material 3 discipline while giving Next Admin a stronger personality for the AI era.

## Research Inputs

- Local Bukeer design contract: `bukeer_flutter/DESIGN.md`.
- Flutter M3 implementation rules: `bukeer_flutter/docs/04-design-system/M3_IMPLEMENTATION_QUICKSTART.md`.
- v0 advice chat: https://v0.app/chat/rimAC5dEqU7.
- v0 docs: text prompting, design systems and design mode.
- Linear visual refresh: calmer density, muted navigation, softer structure and fewer attention conflicts.
- Material 3 color-role guidance: primary/secondary/tertiary roles mapped by function, emphasis and accessibility.
- Apple HIG principles: visual hierarchy, harmony and consistency.

## Product Personality

Bukeer Admin Next should feel like:

- A travel operations workbench.
- A planner command surface.
- A live itinerary and pricing cockpit.
- A human-agent approval console.

It should not feel like:

- A generic SaaS dashboard.
- A BI analytics product.
- A marketing landing page.
- ChatGPT with travel data.
- Linear/Notion/Vercel copy with different colors.

## Bukeer Palette Roles

Use the existing Bukeer Flutter palette, but assign stricter roles:

| Token | Hex | Role in Next Admin | Avoid |
|---|---:|---|---|
| Primary | `#7C57B3` | Structural identity: selected pane, active route rail, active entity border, focus ring | Filled action buttons everywhere, hero backgrounds |
| Secondary | `#39D2C0` | Live/real-time: sync pulse, active trace node, streaming cursor, realtime price update | Generic success badges |
| Tertiary | `#EE8B60` | Human-in-the-loop: approval required, pending supplier hold, unconfirmed itinerary block | Decorative accent only |
| Success | `#34D399` | Confirmed booking, approved trace, completed safe action | Any positive but non-final state |
| Success dark | `#048178` | Strong success text/icons on light surfaces | Broad backgrounds |
| Error | `#FF5963` | Rejected action, failed supplier call, blocked destructive action | Generic red decoration |
| Warning | `#FCDC0C` | Price change, expiring hold, schedule conflict | Large bright backgrounds |
| Light surface | `#F1F4F8` | Operational canvas, itinerary document background | Everything |
| Light card | `#FFFFFF` | Editable document blocks, focused panels | Excessive nested cards |
| Dark lowest | `#15161E` | Trace/approval full-screen focus mode | Generic sidebar only |
| Dark base | `#1B1D24` | Copilot/thread/agent rail, command areas | Whole product by default |
| Dark container | `#2A2F3C` | Secondary rail, dense tool panels | Flat monochrome UI |
| Dark card | `#262830` | CommandBar, trace detail rows | Card grid replacement |

Principle: primary purple marks **where you are**. It should not be the default answer to "what can I click?"

## Typography Roles

Keep Bukeer Flutter typography:

- **Outfit**: orientation, section headers, labels, command buttons, active route names.
- **Readex Pro**: dense operational text, manifests, itinerary details, messages, metadata and form content.
- **Tabular numerals**: prices, times, margins, SLA counters, confidence percentages.

The two-font system must be visible. If every row looks like the same `text-sm`, reject the design.

## Signature Layouts

### Planner Workbench

Signature: TripRail + Planning Canvas + LiveFeedColumn + bottom CommandBar.

- Left: `TripRail`, not generic sidebar navigation.
- Center: vertical itinerary/quote planning canvas, not card grid.
- Right: `LiveFeedColumn` with availability, pricing, margin and agent state.
- Bottom: `CommandBar` for context-aware actions and system state.

### Conversation Copilot

Signature: dark conversation workbench + light extracted-entity panel.

- Avoid chat bubbles.
- Show public reply vs private note boundaries.
- Highlight parsed entities as AI extracts them.
- AI can suggest and block, but not send publicly by default.

### Itinerary Builder

Signature: document-manifest blocks.

- Day-separated `ItineraryBlock` layout.
- Left gutter with travel type icons.
- Inline fields, not modal-first editing.
- Tertiary orange for unconfirmed itinerary blocks.

### Agent Trace & Approval

Signature: dark trace console with bottom approval command strip.

- `TraceNode` timeline.
- Tool invocation detail.
- Guardrail and permission results.
- Bottom approval strip, not modal-only approval.

### Manager Control Plane

Signature: queue-first operations console.

- Queues and actions before metrics.
- Avoid everything looking urgent.
- Tie every metric to an actual queue or decision.

## Signature Components

Use these names in prompts, specs and component contracts:

- `TripRail`: active travel opportunities, trip state, SLA, missing data, value.
- `PlanningCanvas`: central itinerary/quote workspace.
- `LiveFeedColumn`: realtime supplier/pricing/availability feed.
- `TraceNode`: one agent step with status, tool, confidence and time.
- `ApprovalCommandBar`: bottom strip for human decisions.
- `ItineraryBlock`: inline editable trip component.
- `CopilotThread`: non-bubble conversational workspace.
- `EntityExtractionPanel`: structured right panel for parsed traveler/trip data.
- `MarginGuard`: financial policy and margin risk panel.
- `HumanOverrideChip`: visible marker that a human changed AI output.

## Anti-Generic Rules

Reject a v0 output if it has:

- KPI metric cards as the primary composition.
- Sidebar nav + topbar + rounded card grid as the main layout.
- Purple filled buttons everywhere.
- Blue/indigo/slate as dominant colors.
- Chat bubbles for Conversation Copilot.
- A generic "Dashboard" heading.
- Hero, onboarding illustration or decorative gradient.
- Card shadows instead of structured panes and rows.
- AI action buttons without rationale, risk, confidence and trace.
- No visible use of Outfit vs Readex Pro.
- No travel-specific components beyond text labels.

## Modern UI Standards To Keep

- Clear visual hierarchy: supporting navigation recedes, work surface leads.
- Structure should be felt, not overdrawn: use subtle separators, not heavy boxes.
- Color roles must mean something and preserve contrast.
- Dense does not mean noisy: reduce equal-weight borders and badges.
- Agentic state is product state: suggestion, blocked, approval required and trace must be visible.
- Interactive feedback should be quiet but specific: streaming pulse, updated row flash, pending approval ring.
- Light/dark should be mode-based: daily planning can be light/mixed, trace/approval can be dark/focused.

## Acceptance Test

Before accepting any generated direction, ask:

> Could this be mistaken for a generic SaaS dashboard if the travel labels were removed?

If yes, reject it.

Then ask:

> What would make a user recognize this as Bukeer after two weeks of daily work?

If the answer is only "the logo and colors", reject it.
