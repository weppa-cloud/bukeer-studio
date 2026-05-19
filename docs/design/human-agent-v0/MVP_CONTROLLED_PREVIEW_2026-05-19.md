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
npm run test:e2e -- e2e/tests/admin-next-planner-workbench.spec.ts --project=chromium
```

The mocked external handoff E2E is additionally gated:

```bash
ADMIN_NEXT_E2E_EXTERNAL_HANDOFF=true npm run test:e2e -- e2e/tests/admin-next-planner-workbench.spec.ts --project=chromium --grep "WhatsApp handoff"
```

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
