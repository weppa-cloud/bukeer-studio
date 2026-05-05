# SPEC: Growth OS Workboard UX Audit — Baseline To 9.5/10

Status: Draft audit baseline for EPIC #310
Tenant audited: ColombiaTours (`894545b7-73ca-4dae-b76a-da5b6a3f8441`)
Audit date: 2026-05-04
Auditor role: UX reviewer for non-technical Growth/Marketing operators
Target: Workboard and review flows above `9.5/10`

## Purpose

Establish a repeatable UX audit baseline for the Growth OS Workboard and human
review flows. The benchmark is an industry-standard work management experience
inspired by Linear: dense but calm information, fast scanning, saved/custom
views, board/list toggles, clear issue detail panes, visible status/properties,
and low-friction decisions.

References:

- Hermes Kanban: persistent tasks, assignees, dependencies, run history and
  structured handoffs.
- Linear: custom views, board/list display options, grouped board views, compact
  issue cards and detail panes.
- Growth OS principle: high-output agents, risk-governed publishing.

## Audited Flows

The following flows are the canonical suite for the next UX iteration:

1. **Command Center orientation**
   - Open Growth OS overview.
   - Confirm operator understands current workload, autonomy agreement, review
     pressure and lane status within 30 seconds.
   - Expected outcome: operator knows where to start.

2. **Agent Team capability review**
   - Open Agent Team.
   - Inspect each lane, tools, mode, runs, review count, replay and learning.
   - Expected outcome: operator understands what each agent can do and what is
     safe for it to do.

3. **Workboard scan**
   - Open Workboard.
   - Scan columns: Triage, Ready, Running, Blocked, Review Needed,
     Auto Completed, Published/Applied and Archived.
   - Expected outcome: operator can identify the next 3 decisions without
     opening technical tables.

4. **Workboard card detail**
   - Open a card.
   - Read summary, autonomy, risk, capabilities, next action and tools.
   - Expected outcome: operator understands what happened, what happens next and
     whether the agent can continue alone.

5. **Human review queue**
   - Open Review Queue.
   - Filter by status/lane.
   - Open a run detail.
   - Expected outcome: operator can approve, reject or request correction with
     evidence, without reading raw JSON.

6. **Run detail decision**
   - Review summary for marketing, risks, work produced, suggested follow-up
     tasks, tool ledger, learning candidates and event history.
   - Expected outcome: operator can decide confidently and trace the decision.

7. **Learning review**
   - Inspect memory, skill and replay candidates.
   - Expected outcome: operator understands what the system wants to learn and
     can approve/reject each candidate individually.

8. **Data Health / runtime trust**
   - Open Data Health.
   - Inspect runtime maturity, tool gateway, replay, failures, memory and skills.
   - Expected outcome: operator trusts whether autonomy should increase or stay
     gated.

## Baseline UX Score

Overall baseline: **7.1/10**

| Area                         | Score | Audit finding                                                                                      |
| ---------------------------- | ----: | -------------------------------------------------------------------------------------------------- |
| Information architecture     |   7.5 | Main surfaces exist and are logically separated. Review Queue is still too technical.              |
| Workboard scanability        |   7.0 | Columns and counts work, but card text is long and status language is mixed.                       |
| Card design                  |   6.7 | Cards are compact, but titles/URLs and English technical summaries overload the operator.          |
| Detail sheet                 |   7.4 | Useful structure; needs stronger hierarchy, preview, evidence grouping and clearer primary action. |
| Role/action clarity          |   7.2 | Actions exist in Run Detail; Workboard actions are partly disabled or indirect.                    |
| Language localization        |   5.8 | UI labels are partly Spanish, but agent outputs still contain English and technical tokens.        |
| Traceability                 |   8.3 | Tool ledger, run history, evidence and learning candidates are strong.                             |
| Visual polish                |   7.0 | Calm base, but spacing, badge colors and dense text do not yet feel Linear-level.                  |
| Autonomy communication       |   7.6 | “Sigue solo” and risk are visible, but conflict with blocked/review states in some cards.          |
| Trust / safety communication |   8.0 | Gated actions and no-auto-publish are clear, but need stronger policy reason summaries.            |

## Key Findings

### P0 — Language Must Match The Operator

The tenant is ColombiaTours, but many card summaries and run details still read
like engineering output in English. A marketing operator should see:

- “El agente va a volver a rastrear esta URL para confirmar título, H1,
  canonical y robots.”
- Not: “Re-crawl the exact URL and capture `title`, `h1`, canonical...”

Acceptance target:

- 100% of card titles, summaries, next actions and risk explanations render in
  Spanish for ColombiaTours.
- Raw identifiers and English source terms move to secondary evidence sections.

### P0 — Workboard Cards Need Linear-Level Density

Current cards show useful information but overload the eye with long URLs, long
titles and repeated badges. Cards should prioritize:

1. concise title;
2. agent/lane icon or compact label;
3. human outcome;
4. risk/autonomy badge;
5. age and child count.

Acceptance target:

- Card height stable.
- Max two lines for title.
- Max two lines for human outcome.
- Technical evidence hidden behind count/link.

### P0 — Review Flow Needs A Decision Panel

Run Detail has the right content, but the decision actions appear in multiple
places. The operator needs one sticky decision rail:

- Approve;
- Ask for changes;
- Reject;
- Create follow-up;
- See policy reason.

Acceptance target:

- Primary decision action visible without scrolling.
- Every action explains consequence before execution.
- Approval never looks like publish unless it publishes.

### P1 — Autonomy Status Has Contradictions

Some cards show “Sigue solo” while also being blocked or needing human review.
This weakens trust.

Acceptance target:

- One canonical state:
  - “Sigue solo” only if no human action is needed.
  - “Necesita decisión” for review-required.
  - “Bloqueado” for policy/evidence blockers.

### P1 — Workboard Needs Saved Views / Display Options

Linear’s strength is configurable views: board/list, grouping, ordering and
field visibility. Growth OS needs:

- My decisions;
- Agent activity;
- Blocked by policy;
- Ready to publish/apply;
- Learning candidates;
- ColombiaTours content drafts.

Acceptance target:

- Saved view bar or segmented control.
- Board/list toggle.
- Display density: compact / comfortable.

### P1 — Preview Is Missing For Content Work

For blog/article/content tasks, the operator needs a preview-like experience:

- proposed title/meta;
- before/after;
- article outline or excerpt;
- CTA and target page;
- evidence references.

Acceptance target:

- Content cards show “Preview available”.
- Detail sheet has Preview tab before technical evidence.

## Target 9.5 UX Definition

To score above `9.5/10`, the platform must feel like a real Growth work center:

- The operator can start from Workboard and understand all urgent work in under
  one minute.
- Every task has a human-language summary in the operator’s language.
- Every card answers: what is this, who is doing it, what changed, what is next,
  is it safe?
- Approvals are action-specific, not run-specific.
- Agent output can create the next backlog item without the human thinking about
  schema or workflow.
- Technical evidence remains available but never dominates the decision view.
- UI supports board/list, saved views, density and grouped views.
- Autonomy percentage is visible and explainable by lane/risk.

## Implementation Plan

### Phase 1 — UX Language Contract

- Add `operator_title`, `operator_summary`, `operator_next_action`,
  `operator_risk_summary` and `operator_language` to the artifact/work item
  contract.
- Backfill display fallbacks that translate technical English into Spanish
  presentation strings.
- Add UI copy map for action classes and risk reasons.

### Phase 2 — Workboard Card Redesign

- Redesign cards into Linear-like compact cards:
  - left status/risk accent;
  - title;
  - one-line outcome;
  - agent/avatar;
  - age;
  - child/evidence/tool counts.
- Add hover/active states and keyboard focus.
- Hide raw URLs unless they are the primary object.

### Phase 3 — Detail Sheet v2

- Replace one long sheet with tabs:
  - Overview;
  - Preview;
  - Evidence;
  - Tools;
  - History.
- Add sticky decision footer.
- Add policy consequence copy before approval/rejection.

### Phase 4 — Saved Views And Filters

- Add saved view presets:
  - Mis decisiones;
  - En progreso;
  - Bloqueado;
  - Auto completado;
  - Listo para publicar/aplicar;
  - Aprendizajes.
- Add board/list toggle and density control.
- Add grouping by agent, risk or lane.

### Phase 5 — E2E UX Regression Suite

- Use the same eight audited flows as automated E2E journeys.
- Add assertions for Spanish operator copy.
- Add visual snapshots for Workboard card, detail sheet and Run Detail decision
  rail.
- Add role coverage: viewer, curator, council/admin.

## Acceptance Criteria For >9.5

- 95% of visible Workboard card text is Spanish for ColombiaTours.
- No card shows contradictory autonomy/status language.
- Operator can complete a review decision path in under 4 clicks from Workboard.
- Content tasks have a preview-first detail view.
- Risk/policy reason is visible before every sensitive action.
- Board/list/density controls exist and persist per user.
- E2E covers all eight flows and passes on desktop + mobile.
- No console errors during navigation.
- No raw JSON visible by default.
- Technical evidence remains available within one click.
