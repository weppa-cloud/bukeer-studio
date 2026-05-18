# Prompt 09: Signature Conversation Copilot V2

Copy/paste this full prompt into v0.

---

Build Conversation Copilot for Bukeer, a B2B travel agency operating system.

This is not a chat app. It is a public/private travel conversation workbench where a human travel agent reviews AI suggestions before sending anything to the customer.

## Layout

- Full viewport app.
- Two-pane split.
- Left 55% `CopilotThread` on dark surface `#15161E`.
- Right 45% `EntityExtractionPanel` on `#1B1D24`.
- Bottom composer spans the left pane only and has two explicit tabs: Public reply and Private note.
- No top KPI row.
- No chat bubbles.
- No avatars beside every message.

## Bukeer Brand Tokens

- Primary `#7C57B3` only for selected conversation rail/focus ring/active pane border.
- Secondary `#39D2C0` only for live extraction, streaming cursor and active trace state.
- Tertiary `#EE8B60` for human review required, approval required and blocked draft states.
- Success `#34D399` only for sent/approved/confirmed states.
- Error `#FF5963` for rejected, failed or unsafe public-send states.
- Warning `#FCDC0C` for SLA, missing data and expiring customer response windows.
- Dark surfaces: `#15161E`, `#1B1D24`, `#2A2F3C`, `#262830`.

## Typography

- Outfit for conversation headers, entity labels, command labels and status tags.
- Readex Pro for messages, private notes, AI summaries and dense metadata.
- Tabular numerals for SLA, confidence and time.

## Signature Components

Create these named components:

- `CopilotThread`
- `EntityExtractionPanel`
- `SuggestedReplyDraft`
- `HumanReviewGate`
- `MissingDataChecklist`
- `BlockedItineraryDraft`
- `TraceNode`
- `PublicPrivateComposer`

## Sample Data

Conversation:

- Mariana Rios.
- WhatsApp.
- Request: Cartagena family trip in July, beach hotel, old city, kid-friendly activities.
- PAX: 2 adults + 2 children.
- Missing: children ages, exact travel dates, budget range.
- Intent: high purchase intent.
- AI confidence: 88%.

Suggested reply:

The AI should ask for missing ages, exact dates and budget range before itinerary creation.

Blocked action:

Create itinerary draft is blocked until children ages and budget range are resolved.

## Required States

Show:

- Normal.
- Loading/streaming extraction.
- Empty inbox.
- Error sync failed.
- No permission to reply_any.
- AI suggestion.
- AI blocked.
- Approval/public human review required.

## Microinteractions

- AI streaming cursor is `#39D2C0`.
- Newly extracted entity flashes `#39D2C0` at low opacity for 600ms.
- Blocked itinerary draft uses `#EE8B60` left border and lock icon.
- Public send button is disabled until human review gate is satisfied.

## Global Negative Constraints

- No chat bubbles.
- No generic customer support UI.
- No Intercom/Zendesk/ChatGPT look.
- No blue or indigo.
- No purple filled CTA.
- No rounded-xl card grid.
- No KPI cards.
- No decorative empty state illustration.
- AI actions must show rationale, data used, confidence, risk and trace.
- Public/private boundary must be visually obvious.

## Output

- Generate one desktop-first React + TypeScript + Tailwind + shadcn/Radix screen.
- Include responsive behavior.
- No backend calls.
