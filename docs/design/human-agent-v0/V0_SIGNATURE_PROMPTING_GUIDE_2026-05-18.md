# v0 Signature Prompting Guide

> Date: 2026-05-18
> Purpose: improve v0 results so Bukeer Admin Next does not look generic.

## Prompt Strategy

Use a stricter structure for every v0 prompt:

1. Name the product as a travel operations workbench, not a dashboard.
2. Define exact pane structure and widths.
3. Define Bukeer token roles.
4. Name Bukeer-specific components.
5. Specify typography roles.
6. Specify microinteractions.
7. Include global negative constraints.

## Bukeer Token Block

Add this to every prompt:

```text
Use Bukeer brand tokens:
- Primary #7C57B3 only for structural identity: active pane border, selected route rail, focus ring.
- Secondary #39D2C0 only for live/real-time states: streaming cursor, sync pulse, active trace node, updated price flash.
- Tertiary #EE8B60 for human-in-the-loop states: approval required, pending supplier hold, unconfirmed itinerary block.
- Success #34D399 only for confirmed/completed/approved states.
- Error #FF5963 for rejected/failed/blocked destructive states.
- Warning #FCDC0C for expiring holds, price changes and schedule conflicts.
- Light surface #F1F4F8 for operational canvas.
- Dark surfaces #15161E, #1B1D24, #2A2F3C, #262830 for copilot, trace and command surfaces.
Do not use blue, indigo or slate as primary tones.
```

## Typography Block

```text
Use Outfit for section headers, navigation labels, active route names, command labels and status tags.
Use Readex Pro for dense operational content, itinerary details, messages, metadata, form content and tables.
Use tabular numerals for price, time, margin, SLA and confidence values.
The difference between Outfit and Readex Pro must be visible in the rendered UI.
```

## Global Negative Constraints

```text
GLOBAL NEGATIVE CONSTRAINTS for Bukeer:
- No KPI stat cards as primary composition.
- No generic dashboard layout: sidebar nav + topbar + rounded card grid.
- No purple filled buttons everywhere.
- No blue, indigo or slate as dominant colors.
- No emoji in UI.
- No floating action buttons.
- No onboarding empty-state illustrations.
- No gradient hero backgrounds.
- No chart-first layouts.
- No chat bubbles for Conversation Copilot.
- No rounded-xl card grid with box shadows.
- Do not copy Linear, Notion, Vercel, ChatGPT or Codex visually.
- Only borrow specific behaviors: muted navigation, block-document editing, bottom command/status bar, trace console.
- AI actions must always show rationale, data used, confidence, risk and trace.
- #EE8B60 must appear in a meaningful human-in-the-loop role.
- #39D2C0 must appear only in live/streaming/active trace roles.
- #7C57B3 must appear only as structural identity, not generic CTA fill.
```

## Planner Workbench V2 Prompt Core

```text
Build the Planner Workbench screen for Bukeer, a B2B travel agency operating system.

This is not a dashboard. It is a travel planning workbench for converting a live lead into an itinerary proposal with human-agent collaboration.

LAYOUT:
- Three-column split.
- Left 280px TripRail: active travel opportunities with colored left status borders, SLA, value, destination, missing data.
- Center flex PlanningCanvas: vertical itinerary/quote timeline, day sections and editable itinerary blocks. No card grid.
- Right 320px LiveFeedColumn: real-time supplier availability, pricing updates, margin guard and agent suggestions.
- Bottom 44px CommandBar across the full screen with context-aware actions and system state.
- No top navigation bar.

SIGNATURE COMPONENTS:
TripRail, PlanningCanvas, LiveFeedColumn, ItineraryBlock, MarginGuard, AgentSuggestionCard, AgentBlockedCard, ApprovalCommandBar, TraceNode.

Use the Bukeer token block, typography block and global negative constraints.
```

## Conversation Copilot V2 Prompt Core

```text
Build Conversation Copilot for Bukeer.

This is not a chat app. It is a public/private travel conversation workbench.

LAYOUT:
- Full-height two-pane horizontal split.
- Left 55% CopilotThread on #15161E, no chat bubbles, full-width message rows.
- Right 45% EntityExtractionPanel on #1B1D24 with parsed destination, dates, PAX, budget, missing data and itinerary opportunity.
- Bottom composer has tabs for Public reply and Private note. AI never sends public messages directly.

SIGNATURE COMPONENTS:
CopilotThread, EntityExtractionPanel, MissingDataChecklist, SuggestedReplyDraft, HumanReviewGate, BlockedItineraryDraft, TraceNode.

Use the Bukeer token block, typography block and global negative constraints.
```

## Itinerary Builder V2 Prompt Core

```text
Build Itinerary Builder for Bukeer.

This is a travel manifest editor, not a form and not a spreadsheet.

LAYOUT:
- Full-width document canvas.
- Day-separated ItineraryBlock system.
- 48px left gutter for drag handles and travel type icons.
- Right floating palette collapsed by default.
- Inline editing, not modal-first editing.

SIGNATURE COMPONENTS:
ItineraryBlock, DayDivider, SupplierHoldBadge, MarginGuard, ProductCandidateStrip, ApprovalCommandBar, TraceNode.

Use the Bukeer token block, typography block and global negative constraints.
```

## Agent Trace Approval V2 Prompt Core

```text
Build Agent Trace Approval for Bukeer.

This is a dark operational trace console for human approval of AI tool actions.

LAYOUT:
- Full-screen dark focus mode.
- Center TraceTimeline with connected TraceNode rows.
- Right or inline ToolInvocationDetail.
- Bottom ApprovalCommandBar, not modal-only approval.

SIGNATURE COMPONENTS:
TraceTimeline, TraceNode, ToolInvocationDetail, GuardrailResult, PermissionCheck, ApprovalCommandBar, HumanDecisionStamp.

Use the Bukeer token block, typography block and global negative constraints.
```

## Follow-Up Prompt After v0 Generates

Use this if the output is still generic:

```text
This still looks like a generic SaaS dashboard. Remove KPI cards, remove generic sidebar/topbar/card-grid composition, reduce purple CTA usage, add Bukeer-specific components named TripRail, LiveFeedColumn, TraceNode and ApprovalCommandBar. Make the layout feel like a travel operations workbench. Preserve Bukeer colors with #7C57B3 as structural identity, #39D2C0 as live state and #EE8B60 as human-in-the-loop state.
```
