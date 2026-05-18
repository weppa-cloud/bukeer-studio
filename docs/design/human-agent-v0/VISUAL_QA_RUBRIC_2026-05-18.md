# Visual QA Rubric: Bukeer Signature UI

> Date: 2026-05-18
> Purpose: score v0/Figma/design outputs against Bukeer-specific identity and modern UI standards.

## Decision Rule

Reject any direction scoring below **34 / 45** or scoring **0** in either:

- Bukeer recognizability.
- Human-agent safety clarity.
- Brand token role discipline.

## Scorecard

| Category | 0 | 1 | 2 | 3 |
|---|---|---|---|---|
| Bukeer recognizability | Generic SaaS/admin | Travel labels only | Some custom travel patterns | Distinct Bukeer visual grammar |
| Brand token discipline | Colors arbitrary | Bukeer colors used decoratively | Some role mapping | Strict role mapping: purple structural, teal live, orange HITL |
| Typography personality | One generic font feel | Fonts present but not meaningful | Some role separation | Outfit/Readex roles visible and useful |
| Layout signature | Sidebar/topbar/card grid | Slightly customized dashboard | Workbench/pane structure appears | Screen has strong signature layout |
| Operational density | Sparse/marketing | Some real data | Dense but partly noisy | Dense, scannable and calm |
| Travel specificity | Generic entities | Travel data only | Some travel components | Native travel components: TripRail, ItineraryBlock, LiveFeed |
| Agentic clarity | AI button only | AI suggestion visible | AI rationale and state visible | Suggest/block/approval/trace all clear |
| Human control | Automation ambiguous | Human review implied | Human review visible | Approval and override are explicit patterns |
| Traceability | No trace | Trace link only | Trace summary visible | Context/tool/permission/guardrail/decision visible |
| Color contrast/accessibility | Risky | Mostly readable | Good contrast | Good contrast plus focus/keyboard states |
| Visual hierarchy | Everything equal | Some hierarchy | Work area leads | Navigation recedes, work surface leads |
| Anti-generic constraints | Many violations | Several violations | Minor violations | No dashboard/card-grid/blue/hero/chat-bubble drift |
| Responsive viability | Not considered | Basic stacking | Good tablet/mobile plan | Responsive states preserve workflow meaning |
| Microinteractions | None/default | Generic hover | Some meaningful states | Live pulse, pending ring, update flash, trace state changes |
| Implementation readiness | Decorative mock | Component names vague | Components extractable | Component contracts and tokens map cleanly to Next |

Total: 45 points.

## Required Reviewer Questions

1. Could this be mistaken for a generic SaaS dashboard if travel labels were removed?
2. Can a user recognize Bukeer from structure, not just logo/color?
3. Does the screen show what AI proposed, why, with what data and what risk?
4. Does a sensitive action visibly require approval?
5. Are the Bukeer colors playing roles, or just decorating the UI?
6. Does the surface feel useful for daily travel agency work?

## Automatic Rejection Conditions

- KPI cards are the primary composition.
- Generic sidebar + topbar + card grid dominates.
- Purple filled buttons are used as the main interaction style.
- Teal is used as generic success.
- Orange is absent from human-in-the-loop states.
- Conversation Copilot uses chat bubbles as the main language.
- Trace/Approval hides permission, guardrail or human decision.
- AI actions lack rationale, confidence, risk or trace.
- The UI copies Linear, Notion, Vercel, ChatGPT or Codex too literally.

## Acceptance Labels

- **Accept primary**: 40-45, no zeroes.
- **Accept with revisions**: 34-39, no zeroes.
- **Exploration only**: 26-33 or one critical gap.
- **Reject**: below 26, or any automatic rejection condition.
