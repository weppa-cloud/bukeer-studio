# Prompt 10: Signature Itinerary Builder V2

Copy/paste this full prompt into v0.

---

Build Itinerary Builder for Bukeer, a B2B travel agency operating system.

This is a travel manifest editor, not a form, spreadsheet or generic itinerary page.

## Layout

- Full viewport app.
- Centered `ManifestCanvas` max width 920px on light surface `#F1F4F8`.
- Document surface `#FFFFFF`.
- 48px left gutter for drag handles and travel type icons.
- Day-separated itinerary blocks.
- Right edge `SupplierPalette` collapsed by default to 44px strip.
- Bottom `ApprovalCommandBar` for save/request approval/preview actions.
- No generic sidebar.
- No KPI cards.

## Bukeer Brand Tokens

- Primary `#7C57B3` only for active block focus, selected day rail and focus ring.
- Secondary `#39D2C0` only for live availability/pricing refresh.
- Tertiary `#EE8B60` for unconfirmed itinerary blocks, pending supplier holds and approval required.
- Success `#34D399` for confirmed blocks and approved changes.
- Error `#FF5963` for failed supplier call or rejected block.
- Warning `#FCDC0C` for expiring holds and price changes.

## Typography

- Outfit for day headers, block titles, command labels and status tags.
- Readex Pro for item details, supplier notes, passenger metadata and pricing rows.
- Tabular numerals for times, prices, margins and durations.

## Signature Components

Create these named components:

- `ManifestCanvas`
- `DayDivider`
- `ItineraryBlock`
- `SupplierHoldBadge`
- `ProductCandidateStrip`
- `MarginGuard`
- `TraceNode`
- `ApprovalCommandBar`

## Sample Itinerary

Cartagena Family Escape:

- 5 days / 4 nights.
- 2 adults + 2 children.
- July 12-17, 2026.
- Budget USD 4,800.
- Current margin 14%, target 18%.

Blocks:

- Private airport transfer, confirmed, margin 17.4%.
- Sofitel Legend Santa Clara, pending supplier confirmation, margin 12.9%.
- Old City private walking tour, confirmed, margin 18.9%.
- Rosario Islands private lancha, on request, margin 13.9%, approval required.
- Playa Blanca day trip, suggested alternative.

## Required States

Show:

- Normal editable manifest.
- Loading pricing refresh.
- Empty day.
- Error supplier availability failed.
- No permission to override margin.
- AI suggestion for better hotel + boat combination.
- AI blocked because passport names/children ages missing.
- Approval required for margin below threshold.

## Microinteractions

- Live price refresh row flashes `#39D2C0` at low opacity.
- Unconfirmed `ItineraryBlock` has `#EE8B60` left border.
- Active edited block has `#7C57B3` focus ring.
- Approved block transitions to `#34D399` status mark.

## Global Negative Constraints

- No generic form layout.
- No spreadsheet look.
- No top nav.
- No card grid.
- No shadow-heavy cards.
- No blue or indigo.
- No purple CTA fill.
- No modal-first editing.
- AI actions must show rationale, data used, confidence, risk and trace.

## Output

- Generate one desktop-first React + TypeScript + Tailwind + shadcn/Radix screen.
- Include responsive behavior.
- No backend calls.
