# Prompt 15: Itinerary Manifest V3

Rebuild Itinerary Builder as a Bukeer-specific travel manifest, not a generic document editor.

Reference docs:

- `EXPERT_UX_UI_AUDIT_2026-05-18.md`
- `AGENTIC_UI_STATE_MODEL_2026-05-18.md`
- `BUKEER_SIGNATURE_TOKENS_2026-05-18.md`
- `VISUAL_QA_RUBRIC_2026-05-18.md`

## Goal

Create a React + Tailwind + shadcn/Radix concept for `ItineraryManifest`, a transactional builder surface for confirmed/pending/suggested itinerary items, supplier evidence, passenger readiness, margin state and proposal readiness.

## Why This Is Different From V2

V2 was usable but too generic. This version must feel like a travel operations document with live supplier and passenger readiness, not a timeline editor.

## Required Layout

- Left day/segment manifest rail.
- Center itinerary manifest canvas.
- Right supplier and passenger readiness rail.
- Bottom proposal readiness and approval command bar.

## Required Components

- `ItineraryManifest`
- `ManifestDaySection`
- `ItineraryBlock`
- `SupplierEvidenceCard`
- `PassengerReadinessPanel`
- `ProposalReadinessBar`
- `MarginGuard`
- `TraceDrawer`
- `ApprovalCommandBar`

## Required States

- Confirmed transfer.
- Pending hotel supplier confirmation.
- Suggested hotel swap.
- Blocked activity due to missing child ages.
- Expiring supplier hold.
- Approval required because margin is below policy.
- Public proposal not sent.
- No payment captured.

## Required Data

Scenario:

- Cartagena family trip.
- 5 days / 4 nights.
- 2 adults + 2 children.
- Budget USD 4,800.
- Current margin 14%, target 18%.
- Hotel Casa San Agustin improves margin.
- Passport names and children ages missing.
- Supplier hold expires in 43 minutes.

## Hard Rejections

- No large empty form canvas.
- No generic timeline editor.
- No hidden supplier rail.
- No AI suggestion without trace.
- No approval button enabled when missing data blocks the action.

## Output

Generate desktop-first UI plus responsive notes for 1440, 1280, 834 and 390px.
