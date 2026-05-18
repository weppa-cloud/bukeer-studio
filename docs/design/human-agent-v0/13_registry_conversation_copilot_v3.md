# Prompt 13: Registry Conversation Copilot V3

Use the Bukeer registry and revise Conversation Copilot V2.

Registry:

- `public/r/bukeer-admin-next/registry.json`
- Start from `signature-conversation-copilot`.

Reference docs:

- `EXPERT_UX_UI_AUDIT_2026-05-18.md`
- `AGENTIC_UI_STATE_MODEL_2026-05-18.md`
- `BUKEER_SIGNATURE_TOKENS_2026-05-18.md`
- `VISUAL_QA_RUBRIC_2026-05-18.md`

## Goal

Design a human-reviewed WhatsApp/email workbench for travel agents. The screen must clearly separate public customer messages, private internal notes, AI suggested replies, entity extraction, missing data and blocked itinerary drafts.

## Must Improve

1. Make public/private boundaries impossible to miss.
2. Add trace drawer from every suggested reply.
3. Disable public send when missing data or policy blocks it.
4. Show exactly what the AI can and cannot do.
5. Add manual fallback when AI is blocked.
6. Add responsive behavior for right extraction panel.

## Required States

- `suggested`: AI proposed reply only.
- `blocked_missing_data`: itinerary draft cannot proceed.
- `approval_required`: public send requires human review.
- `approved`: human approved reply.
- `executed`: reply sent publicly.
- `rejected`: reply discarded.

## Required Layout

- Left inbox.
- Center conversation thread without generic chat bubbles.
- Internal note treatment distinct from public messages.
- Suggested reply panel with rationale summary, confidence, risk and trace.
- Right `EntityExtractionPanel`.
- Missing data checklist.
- Blocked itinerary draft card.
- Human review gate.

## Hard Rejections

- Do not make it look like generic customer support chat.
- Do not enable public send from an unsafe state.
- Do not expose hidden chain-of-thought.
- Do not rely on color alone for public/private distinction.

## Output

Generate React + Tailwind + shadcn/Radix. Desktop first, with responsive notes.
