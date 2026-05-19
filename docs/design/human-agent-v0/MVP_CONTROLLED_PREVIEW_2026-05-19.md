# MVP Controlled Preview

> Date: 2026-05-19
> Track: E QA/docs
> Partner: ColombiaTours
> Surface: `/admin/prototype/planner-workbench`

## Decision

Open a Preview Beta for ColombiaTours today, 2026-05-19, with Admin Next Planner Workbench limited to controlled review, fixture/read-only context, draft-only actions, one manual WhatsApp handoff session, and visible human approval boundaries.

This is not production automation. The beta proves that planners understand the handoff UI, the draft-created state, and the safety boundary before any external customer, supplier, payment or booking effect is allowed.

## Preview Beta Scope

- Partner: ColombiaTours only.
- Users: named internal/admin reviewers and selected ColombiaTours beta planners.
- Mode: fixture-first, with read-only beta data only when explicitly enabled by existing Admin Next gates.
- Route: `/admin/prototype/planner-workbench`.
- Primary workflow: AI prepares a `DraftAction`; human reviews, edits, discards locally, or creates a manual WhatsApp handoff session.
- Required visible state: feature/simulation flag, visible handoff UI, `Draft created`, trace access, required human action.
- Required safety copy: not sent, not reserved, not paid, not confirmed; human must open and send manually.

## Non-Negotiable Bounds

- No automatic WhatsApp or email send.
- The only external handoff write allowed in this preview is creating a `whatsapp_flow_sessions` row and returning a `wa.me` link for manual human send.
- No supplier hold, reserve, availability lock or booking confirmation.
- No payment, refund, invoice or financial write.
- No production write path beyond the allowlisted Admin Next WhatsApp handoff endpoint.
- No hidden execution behind approval buttons; local simulation copy must remain explicit.

## Preview Flags

Required for ColombiaTours beta:

```bash
ADMIN_NEXT_PROTOTYPE_ENABLED=true
ADMIN_NEXT_DATA_SOURCE_MODE=readonly
ADMIN_NEXT_BETA_READONLY_ENABLED=true
ADMIN_NEXT_EXTERNAL_HANDOFF_ENABLED=true
ADMIN_NEXT_BETA_ACCOUNT_IDS=<colombiatours_account_id>
ADMIN_NEXT_BETA_ROLES=admin,owner,super_admin,agent
ADMIN_NEXT_EXTERNAL_HANDOFF_SUBDOMAIN=colombiatours
```

The UI hides the WhatsApp CTA unless the session passes the prototype, beta account, beta role and external handoff gates.

## WhatsApp Handoff Contract

Endpoint:

```http
POST /api/admin-next/planner-workbench/whatsapp-handoff
```

Accepted body:

```json
{
  "draftActionId": "draft-action-missing-data-request",
  "traceId": "trace-cartagena-draft-001",
  "opportunityId": "opp-cartagena-family"
}
```

The endpoint validates Admin Next session context, role permissions, ColombiaTours beta gates and draft eligibility. It accepts only `manual_whatsapp_handoff` drafts, creates the `whatsapp_flow_sessions` record, and returns `referenceCode`, `whatsappUrl`, `waMeUrl`, `expiresAt`, `notSent`, `manualSendRequired` and safety flags.

## QA Gate

Track E coverage must prove:

- The Planner Workbench renders under the existing Admin Next prototype flag.
- Draft handoff UI is visible.
- A draft shows `Draft created` state.
- The local simulation flag remains visible.
- Safety copy remains visible: not sent, not reserved, not paid, not confirmed.
- Human handoff copy says the planner must open/review and send manually.
- Local review/edit actions do not call production write routes.
- The WhatsApp handoff CTA is gated and the success state shows `Not sent`, reference code, `wa.me`, expiry and manual-send copy.

Focused command:

```bash
ADMIN_NEXT_PROTOTYPE_ENABLED=true \
E2E_WEBSERVER_CMD='ADMIN_NEXT_PROTOTYPE_ENABLED=true npm run start' \
npm run test:e2e -- e2e/tests/admin-next-planner-workbench.spec.ts --project=chromium
```

The mocked external handoff E2E is additionally gated:

```bash
ADMIN_NEXT_PROTOTYPE_ENABLED=true \
ADMIN_NEXT_EXTERNAL_HANDOFF_ENABLED=true \
ADMIN_NEXT_BETA_ACCOUNT_IDS=<allowed_account_id> \
ADMIN_NEXT_BETA_ROLES=admin,owner,super_admin,agent \
ADMIN_NEXT_E2E_EXTERNAL_HANDOFF=true \
E2E_WEBSERVER_CMD='ADMIN_NEXT_PROTOTYPE_ENABLED=true ADMIN_NEXT_EXTERNAL_HANDOFF_ENABLED=true ADMIN_NEXT_BETA_ACCOUNT_IDS=<allowed_account_id> ADMIN_NEXT_BETA_ROLES=admin,owner,super_admin,agent npm run start' \
npm run test:e2e -- e2e/tests/admin-next-planner-workbench.spec.ts --project=chromium --grep "WhatsApp handoff"
```

Local validation result on 2026-05-19:

- Passed Planner Workbench Chromium smoke: 6 passed, 1 gated handoff spec skipped.
- Passed mocked WhatsApp handoff Chromium smoke: 2 passed.
- Production `next start` requires `ADMIN_NEXT_PROTOTYPE_ENABLED=true`; without it the route correctly returns 404 in production mode.

## Visual Approval Artifacts

Local screenshots generated from production start with Admin Next prototype and handoff gates enabled:

- `output/playwright/admin-next-planner-workbench-preview.png`
- `output/playwright/admin-next-planner-workbench-preview-dark.png`
- `output/playwright/admin-next-planner-workbench-preview-mobile.png`

These artifacts are review artifacts, not source-of-truth design files. The source of truth remains code-first: tokens, components, gates and tests.

## ColombiaTours Beta Review Script

Use a 30-minute moderated review with one planner, one manager and one Bukeer observer.

Scenario 1: Review AI suggestion

- Ask the planner to identify what the AI proposes.
- Ask what data the AI used.
- Ask what risk is visible before approving anything.
- Pass condition: planner can explain proposal, source and risk without help.

Scenario 2: Create manual WhatsApp handoff

- Ask the planner to find the draft traveler data request.
- Ask the planner to create the WhatsApp handoff.
- Ask what happened after the click.
- Pass condition: planner says a handoff/link was created and clearly says the message was not sent.

Scenario 3: Trace and approval confidence

- Ask the planner to open trace.
- Ask which human permission is needed.
- Ask whether this action reserves, pays, confirms, holds supplier inventory or sends public communication.
- Pass condition: answer is no for all execution side effects.

Scorecard:

| Criterion | Pass threshold |
| --- | --- |
| Clarity | 4/5 planners understand what the AI proposes |
| Safety | 5/5 understand `Not sent`, `not reserved`, `not paid`, `not confirmed` |
| Speed | Planner completes handoff flow in under 90 seconds |
| Trust | Planner can find trace and required permission |
| Brand/UI | Reviewer says it feels like Bukeer, not a generic SaaS dashboard |

Exit rule: any confusion between `created handoff` and `sent message` blocks controlled MVP progression.

## Sprint: Controlled Productive MVP

Target window: 2026-06-12 to 2026-06-19.

Objective: move from controlled preview to safe MVP with real read-only data, internal draft persistence and internal approvals, while keeping external automation blocked except manual handoff session creation.

Work packages:

| Work package | Outcome |
| --- | --- |
| `admin_next_draft_actions` | Persist editable drafts scoped by account, opportunity, actor and trace |
| `admin_next_approval_decisions` | Persist approve/reject decisions internally without executing bookings or sends |
| Read-only Planner data | Replace fixture fallback for ColombiaTours beta with scoped itinerary/contact/supplier reads |
| Handoff ledger | Persist reference code, source draft, actor, trace id and `not_sent` state |
| Trace Inspector v2 | Show draft, decision and handoff evidence as a single chain |
| Safety QA | Automated checks for no booking/payment/supplier/public-send writes |

Acceptance criteria:

- ColombiaTours beta users can access `/admin/prototype/planner-workbench` in preview.
- Planner Workbench loads real scoped data in read-only mode.
- Drafts are editable and persisted internally.
- Approval decisions are persisted internally.
- Manual WhatsApp handoff creates `whatsapp_flow_sessions` and returns `wa.me`.
- UI always shows `Not sent`, `not reserved`, `not paid`, `not confirmed`.
- No supplier hold, booking, payment, confirmation or automated external send is possible.

Recommended implementation order:

1. Database migrations for draft actions and approval decisions.
2. Server repositories with account/RLS-safe access.
3. Planner Workbench read model combining real data and internal draft state.
4. Client mutation hooks for internal draft save and approval decisions.
5. Trace Inspector chain for draft -> approval -> handoff.
6. E2E suite with flag off, no permission, allowed ColombiaTours and safety-route blocking.

## Controlled MVP Path

### 2026-05-19: Preview Beta

- Ship Track E QA/docs.
- Run focused Playwright coverage where practical.
- Use ColombiaTours fixture/read-only review only.
- Collect planner confusion points around draft vs sent/reserved/paid/confirmed.

### 2026-06-12: Controlled MVP Start

- Start controlled MVP only if Preview Beta reviewers do not confuse a draft with an executed action.
- Keep production mutation disabled by default.
- Allow only named accounts, named roles and documented routes.
- Require trace visibility for every human decision.

### 2026-06-12 to 2026-06-19: Controlled MVP Window

- Daily QA review of planner handoff evidence.
- No broad rollout and no automated customer/supplier/payment/booking execution.
- Any copy ambiguity around sent/reserved/paid/confirmed exits to revise.
- Any unexpected production write attempt exits to stop.

### 2026-06-19: Exit Review

Proceed only if:

- Reviewers consistently understand draft-only handoff.
- Safety copy remains visible in desktop and mobile review widths.
- No production write routes were invoked by local handoff actions.
- ColombiaTours feedback supports moving from controlled MVP to the next gated slice.

Otherwise, keep Admin Next in preview, update docs/tests, and defer production automation.
