# Sprint 0.25E: Read-Only Real Data + Beta Review

> Date: 2026-05-18
> Phase: 4/5 beta review and closure
> Input: Sprint 0.25D read-only foundation, Signature Planner Workbench, Trace Inspector
> Goal: validate the Planner Workbench against real production-shaped data without enabling production writes.

## Sprint Intent

Sprint 0.25E moves the approved admin-next prototype from fixture proof to beta evidence:

- Phase 4 validates read-only real data in Planner Workbench and Trace Inspector.
- Phase 5 closes the beta decision with scorecards, safety findings, exit criteria and the 0.25F backlog.
- The sprint must prove comprehension and trust before any draft-only action work starts.

This sprint is not an automation rollout. It does not send messages, reserve suppliers, confirm bookings, charge payments or mutate production records.

## Scope Boundary

Read-only real data means:

- Existing leads, contacts, itinerary context, product references, margin signals and trace-shaped ledger rows may be loaded through approved server-side read adapters.
- Real account context may be shown to beta reviewers when the account owner approves the session.
- Data may be normalized into Travel Ontology v1 and displayed in Signature UI states.
- Fixture fallback stays available for local review, demos and sensitive accounts.
- Trace Inspector may explain data used, policy result, permission result, risk and human decision state.

Production writes are explicitly out of scope:

- No Supabase insert, update, delete, write RPC or service-role mutation from this sprint.
- No public customer send, WhatsApp send, email send or mass outreach.
- No supplier hold, reservation, availability lock or booking confirmation.
- No payment, refund, invoice mutation or confirmed financial write.
- No destructive platform operation, permission change or account configuration write.
- No UI copy may imply that a suggested or drafted action has already been executed.

## Sprint Checklist

Phase 4: beta review readiness

- [ ] Confirm the 0.25D read-only foundation is the only data path used for review.
- [ ] Select 3-5 beta partner sessions or senior internal planner sessions.
- [ ] Prepare one fixture-safe scenario and one approved real-data scenario per session.
- [ ] Verify all action controls are labelled as `AI suggested`, `Draft created`, `Approval required` or `Blocked`; none imply production execution.
- [ ] Capture desktop, mobile, light and dark review frames.
- [ ] Prepare scorecard and notes template before the first session.

Phase 4: beta review execution

- [ ] Run the partner script below.
- [ ] Record task completion time, visible confusion and direct quotes.
- [ ] Score clarity, speed, trust, trace comprehension, Bukeer identity and mobile/dark usability.
- [ ] Mark any production-write confusion as a safety blocker.
- [ ] Collect top 3 workflow gaps and top 3 trust gaps.

Phase 5: closure

- [ ] Summarize scorecard results and P0/P1 findings.
- [ ] Decide `proceed`, `revise` or `stop`.
- [ ] Confirm no production write capability was added during 0.25E.
- [ ] Split 0.25F backlog into draft-only actions, safety gates and deferred production writes.
- [ ] Publish the closure note with evidence links, screenshots and session count.

## Beta Scenarios

Scenario 1: high-intent family trip to Cartagena

- The planner sees a real or production-shaped lead with travelers, dates, destination intent and conversation context.
- Some required data is missing: budget range, room configuration, traveler ages or decision deadline.
- AI suggests a reply and itinerary direction.
- Expected result: user can state what is known, what is missing, what AI proposed and what remains human-controlled.

Scenario 2: margin risk and supplier fit

- The planner sees two hotel/activity options with different supplier evidence and margin impact.
- AI recommends a safer option but flags margin or policy risk.
- Expected result: user can find the risk quickly and explain why approval or revision is needed.

Scenario 3: blocked public send

- AI drafts a WhatsApp/email response but the screen blocks public send because required fields are missing or policy is not satisfied.
- Expected result: user understands nothing was sent, why it is blocked and what data is needed next.

Scenario 4: manager approval trace

- A sensitive action appears as approval required.
- The manager opens Trace Inspector and reviews data used, source freshness, confidence, permission result, policy result and risk level.
- Expected result: manager can decide approve, approve with edits, reject or escalate without external explanation.

Scenario 5: mobile and dark usability

- The same planning context is reviewed on a narrow viewport and dark mode.
- Expected result: key status, missing data, suggested draft and trace entry remain legible and discoverable.

## Beta Partner Script

Use this script at the start of each session:

"Today we are reviewing the next Bukeer Planner Workbench using read-only real data or production-shaped fixture data. The goal is to test whether a planner or manager can understand the trip, AI suggestions, missing data, risk and approvals. No production write will happen in this review. Nothing will be sent to a customer, reserved with a supplier, charged, confirmed or changed in production."

Session format: 45 minutes.

1. Context: 5 minutes.
2. Silent screen review: 5 minutes.
3. Scenario walkthrough: 15 minutes.
4. Task questions and trace inspection: 15 minutes.
5. Scorecard and wrap-up: 5 minutes.

Task questions:

1. What is the current trip status?
2. What data is real/read-only versus a draft or suggestion?
3. What is missing before the planner can continue?
4. What is the AI suggesting?
5. What is blocked and why?
6. What requires human approval?
7. Has anything been sent, reserved, paid or confirmed?
8. Is margin or supplier risk healthy, unclear or unsafe?
9. What would you do next during a real sales conversation?
10. Would you trust this screen for daily operation?

Moderator prompts:

- Ask the participant to point to the evidence on screen before explaining.
- Do not explain the trace model unless the participant gets stuck.
- Mark any confusion between suggestion, draft, approval, blocked and executed as a safety finding.
- Stop the scenario if the participant believes a production write already happened.

## Scorecard

Use a 1-5 scale where `1` means unusable or unsafe and `5` means clear enough for daily use.

| Dimension | Question | Pass signal |
|---|---|---|
| Clarity | Can the user explain trip status, missing data and next action? | No external explanation needed. |
| Speed | Can the user find status, blockers and recommended next step quickly? | Core answers in under 90 seconds after silent review. |
| Trust | Does the user trust the AI suggestion enough to inspect, edit or use it? | Trust comes from visible rationale and risk, not blind acceptance. |
| Trace comprehension | Can the user explain data used, permission, policy and confidence from Trace Inspector? | User can decide approve/reject/escalate from trace alone. |
| Bukeer identity | Does the workflow feel built for travel agencies and Bukeer operations? | User recognizes lead, trip, supplier, margin and approval language. |
| Mobile/dark usability | Is the same workflow usable in narrow viewport and dark mode? | No lost state, unreadable status or hidden trace path. |

Scoring gate:

- Average score across dimensions must be `>= 4.0`.
- No dimension may average below `3.5`.
- Any individual score `<= 2` requires revision before 0.25F.
- Any confusion that a public send, supplier hold, booking confirmation, payment or production mutation already happened is a P0 blocker.

## Acceptance Criteria

Sprint 0.25E is accepted only when:

- Beta reviewers can distinguish read-only real data from AI suggestions, internal drafts, approval states and blocked states.
- Reviewers can answer whether anything has been sent, reserved, paid, confirmed or mutated in production.
- Trace Inspector is understandable enough for managers to identify data used, source freshness, permission result, policy result, confidence and risk.
- The Planner Workbench still feels Bukeer-specific when fixture data is replaced by read-only real data.
- Mobile and dark mode do not hide the human approval boundary.
- Scorecard gates pass or the closure decision explicitly routes findings to revision.
- No code path, UI label or document in 0.25E approves production writes.

## Safety Constraints

- Default autonomy level: observe and suggest.
- Maximum allowed action state in 0.25E: internal draft preview.
- Human approval can be simulated or reviewed, but execution remains disabled.
- Every suggested or blocked action must expose trace.
- Sensitive actions must use explicit copy: "not sent", "not reserved", "not paid", "not confirmed" when relevant.
- Hidden chain-of-thought must never be shown; use concise reasoning summaries only.
- Real beta data must stay inside approved account context and must not be copied into public artifacts.

## Phase 5 Exit Criteria

Phase 5 can close when all of these are true:

- 3-5 review sessions are completed or intentionally waived with named rationale.
- The scorecard summary includes clarity, speed, trust, trace comprehension, Bukeer identity and mobile/dark usability.
- P0 safety findings are zero, or the sprint exits with `revise` / `stop`.
- P1 findings are assigned to either 0.25F draft-only backlog or design revision backlog.
- The closure note states the final decision: `proceed`, `revise` or `stop`.
- Evidence links include screenshots or session notes for desktop, mobile and dark mode.
- The team confirms again: 0.25E validated read-only real data only; production writes remain blocked.

## Sprint 0.25F Backlog: Draft-Only Actions

0.25F may add draft-only actions if 0.25E exits with `proceed` or `revise with no P0 safety blockers`.

Candidate backlog:

- Draft customer reply from conversation context, with edit-before-send only.
- Draft itinerary outline from trip brief, with no supplier hold or reservation.
- Draft missing-data request, with no public send until a human sends manually.
- Draft manager approval packet from trace, margin and policy evidence.
- Draft supplier comparison note, with no availability lock.
- Draft quote readiness checklist, with no confirmed price mutation.
- Draft internal task for planner follow-up, with no external notification.
- Draft audit summary after a human decision, with no ledger mutation unless separately approved.

Required 0.25F safety gates:

- All draft actions must be labelled `Draft created` or `AI suggested`.
- Public-send buttons stay disabled or hand off to a separate human-controlled flow.
- No payment, booking, supplier hold or confirmed financial write enters 0.25F.
- Each draft has trace, source freshness, risk, permission and policy evidence.
- Draft discard/edit paths are as visible as draft accept paths.

Deferred beyond 0.25F:

- Public customer send automation.
- Supplier hold or reservation execution.
- Payment, refund or invoice mutation.
- Confirmed booking write.
- Autonomous approval execution.
- Bulk outreach or destructive account operations.
