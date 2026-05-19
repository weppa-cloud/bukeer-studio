# Mega Sprint Multiagente: Bukeer Admin Next 50% Push

> Date: 2026-05-18
> Timezone: America/Bogota
> Parent epic: `weppa-cloud/bukeer-flutter#823`
> Scope: planning/specs/issues only. No UI component edits.
> Target: reach approximately 50% of Epic #823 foundation progress today by parallelizing non-production documentation, contracts, validation plans and issue readiness.

## 1. Intent

This mega sprint compresses the next coordination layer for Bukeer Admin Next without bypassing the approved Design Lock Code-First path.

The goal for today is not to ship production UI. The goal is to create enough approved, non-ambiguous planning and handoff material that multiple agents can safely execute the next slices in parallel: GUI foundation, contract readiness, agentic governance, read-only admin foundation, beta validation and integration sequencing.

The sprint uses these local sources as canonical input:

- `docs/specs/SPEC_HUMAN_AGENT_EXPERIENCE_GUI_FOUNDATION.md`
- `docs/design/human-agent-v0/DESIGN_LOCK_CODE_FIRST_2026-05-18.md`
- `docs/design/human-agent-v0/SPRINT_0_25B_PLAN_2026-05-18.md`
- `docs/design/human-agent-v0/APPROVAL_PACKET_AND_LONG_SPRINT_2026-05-18.md`
- `docs/design/human-agent-v0/NEXT_COMPONENT_CONTRACT_2026-05-18.md`
- `docs/design/human-agent-v0/AGENTIC_UI_STATE_MODEL_2026-05-18.md`
- `docs/design/human-agent-v0/DESIGN_REVISION_BACKLOG_2026-05-18.md`
- `docs/design/human-agent-v0/VISUAL_QA_RUBRIC_2026-05-18.md`
- GitHub Epic #823: `Epic: Migrar Bukeer Admin de Flutter Web a Next.js`

## 2. Non-Negotiables

- Do not touch production UI components in this sprint.
- Do not wire writes, public send, payments, reservations, supplier holds or customer-facing actions.
- Do not use secrets or inspect secret-bearing env files.
- Do not revert unrelated work from other agents.
- Keep all outputs in docs/specs/issues/planning unless a product owner explicitly opens an implementation sprint.
- Preserve Design Lock Code-First as the implementation gate: registry, signature tokens, component contract, state model, prototype readiness and Visual QA.
- Use read-only first for any future data work.
- Every agentic capability must declare autonomy: `A0_readonly`, `A1_suggest`, `A2_draft`, `A3_confirmed_write` or `A4_live_gated`.
- Every AI suggestion, blocked state or approval request must map to trace, permission, policy, risk and human decision semantics.

## 3. Target Definition: What "50%" Means Today

Epic #823 is broad: replatforming, auth/session, shell, RBAC, domain migration, agentic foundation, audit, evals, rollout and rollback. A true 50% production implementation is not realistic in one day.

For this mega sprint, "approximately 50%" means 50% of the **foundation readiness** needed before implementation agents can safely proceed:

| Readiness Area | Target By End Of Day |
|---|---|
| Human-Agent GUI direction | Approved source docs mapped to tracks and owners |
| State/trace/approval semantics | Contracted and cross-referenced in acceptance criteria |
| Design Lock Code-First | Integration order and quality gates explicit |
| Next component readiness | Component contract review packet prepared, no code changes required |
| Read-only admin foundation | Planning scope defined for session, flags, queries and parity |
| Agentic governance | Tool registry, autonomy policy, ledger and eval planning split into parallel work |
| Beta validation | Review script, scorecard and decision gate scheduled |
| Issue execution | Work split into agent-sized tracks with deliverables and integration order |

Exit threshold:

- At least 6 of 8 tracks below have an owner, deliverable path and acceptance criteria.
- No track depends on unsafe writes or production UI mutation.
- Integration order is clear enough that one coordinator can merge plans without blocking all agents.

## 4. Roles And Operating Model

Use roles instead of personal names so the plan can be assigned to humans or AI agents.

| Role | Responsibility | Output Style |
|---|---|---|
| Sprint Captain | Owns sequencing, conflict resolution, final acceptance and issue map | One status doc + issue checklist |
| Product Spec Agent | Keeps #823 scope, phases and issue decomposition coherent | Spec diffs, issue text, DoD |
| UX Systems Agent | Maintains design lock, state model, Visual QA and beta learning loop | Docs only, no component edits |
| Contract Agent | Turns approved GUI/state decisions into Next component/data contracts | Contract docs and TypeScript-shaped examples |
| Agent Governance Agent | Defines autonomy, tool registry, approval ledger and trace semantics | Specs and eval checklist |
| Read-Only Data Agent | Plans read-only session/context/query/parity slices | Query contract and migration-free plan |
| QA/Evals Agent | Defines validation, BukeerBench seeds, parity checks and responsive QA | Test plan and acceptance matrix |
| Release/Rollback Agent | Defines feature flags, rollout rings and rollback runbook | Runbook and risk register |
| GitHub Triage Agent | Mirrors sprint plan into issue updates and dependencies | Issue comments/checklists |

Coordination cadence for today:

- T0 kickoff: confirm no one is touching UI components for this planning sprint.
- T+90 min: each track posts first deliverable draft or blocker.
- T+3 h: Sprint Captain resolves overlaps and updates integration order.
- T+5 h: QA/Evals and Release/Rollback agents challenge acceptance criteria.
- End of day: merge docs, update issue map, mark tracks green/yellow/red.

## 5. Parallel Tracks

### Track A: Epic #823 Issue Map And Progress Accounting

Owner:

- Product Spec Agent

Inputs:

- GitHub Epic #823.
- `SPEC_HUMAN_AGENT_EXPERIENCE_GUI_FOUNDATION.md`.
- `SPRINT_0_25B_PLAN_2026-05-18.md`.

Deliverables:

- Issue map that groups #825-#834 and future 0.25C/0.25D work into phases.
- Progress accounting model for "foundation readiness" vs "production migration".
- Checklist comment ready for Epic #823.

Acceptance criteria:

- Distinguishes design foundation, prototype readiness, read-only data foundation and production migration.
- Does not claim production Admin Next is 50% complete.
- Maps every current issue to one of the tracks in this document.
- Flags dependencies that cannot start until Design Lock Code-First or read-only contracts are approved.

Done evidence:

- A doc or issue comment draft exists and references Epic #823 plus #825-#834.

### Track B: Design Lock And Visual QA Consolidation

Owner:

- UX Systems Agent

Inputs:

- `DESIGN_LOCK_CODE_FIRST_2026-05-18.md`.
- `VISUAL_QA_RUBRIC_2026-05-18.md`.
- `EXPERT_UX_UI_AUDIT_2026-05-18.md`.
- `DESIGN_REVISION_BACKLOG_2026-05-18.md`.

Deliverables:

- Single-page Design Lock gate checklist for future implementers.
- Pass/fail rubric for Planner Workbench, Conversation Copilot, Trace Approval and Itinerary Manifest.
- Explicit rejection rules for generic dashboard/card-grid drift.

Acceptance criteria:

- Preserves code-first source order: state model, tokens, registry, public registry, component contract, Visual QA.
- Requires 1440, 1280, 834 and 390px responsive evidence before implementation readiness.
- Keeps Figma optional and non-canonical.
- Confirms no hidden chain-of-thought is requested, stored or displayed.

Done evidence:

- Checklist can be pasted into implementation issues without requiring extra interpretation.

### Track C: Component Contract Readiness

Owner:

- Contract Agent

Inputs:

- `NEXT_COMPONENT_CONTRACT_2026-05-18.md`.
- `AGENTIC_UI_STATE_MODEL_2026-05-18.md`.
- Registry component names under `docs/design/human-agent-v0/registry/`.

Deliverables:

- Contract review packet for:
  - `AdminShell`
  - `PlannerWorkbenchLayout`
  - `TripRail`
  - `PlanningCanvas`
  - `LiveFeedColumn`
  - `ConversationCopilotPanel`
  - `TraceApprovalPanel`
  - `TraceTimeline`
  - `ApprovalCommandBar`
  - `AgentSuggestionCard`
  - `AgentBlockedCard`
  - `ApprovalCard`
  - `ItineraryManifest`
  - `ManagerControlPlane`
- State and prop gaps list.
- First implementation spike order for 0.25C, still fixture-first.

Acceptance criteria:

- Every component names purpose, required data, required states, permission behavior, trace behavior and responsive behavior.
- No component is authorized to fetch or mutate data directly unless later specified as a server component.
- Sensitive actions expose status, reason, required permission and approval state.
- Fixture-first prototype remains explicitly separated from production routes.

Done evidence:

- Contract gaps are small enough for engineering to estimate 0.25C.

### Track D: Agent Governance And Trace Ledger

Owner:

- Agent Governance Agent

Inputs:

- Epic #823 agentic foundation checklist.
- `AGENTIC_UI_STATE_MODEL_2026-05-18.md`.
- `NEXT_COMPONENT_CONTRACT_2026-05-18.md`.
- Trace Approval V2/V3 docs.

Deliverables:

- Planning spec for:
  - `DomainToolRegistry`
  - `AgentRun`
  - `ToolInvocation`
  - `ApprovalRequest`
  - `TraceEvent`
  - autonomy policy
  - audit/replay id
- Governance matrix for domain actions: read, suggest, draft, confirmed write, live-gated.
- No-secrets trace policy.

Acceptance criteria:

- Public send, payment, reservation, supplier hold, pricing override and CRM bulk outreach are never automatic.
- Trace includes context packet, reasoning summary, tool result, permission check, guardrail, approval, human decision and outcome.
- Hidden chain-of-thought is excluded; only summaries, evidence, tool outputs and policy results are allowed.
- Ledger planning supports replay/eval without requiring writes today.

Done evidence:

- Governance matrix can be used by Contract Agent and QA/Evals Agent.

### Track E: Read-Only Admin Foundation

Owner:

- Read-Only Data Agent

Inputs:

- Epic #823 checklist.
- `SPEC_HUMAN_AGENT_EXPERIENCE_GUI_FOUNDATION.md` section "Sprint 0.25D recomendado".
- Existing repository tests mentioning Admin Next contract and prototype routes.

Deliverables:

- Planning packet for:
  - `getAdminSessionContext()`
  - feature flags `admin_next_*`
  - read-only server-side queries
  - Supabase/RLS parity assumptions
  - route/domain rollback boundaries
  - fixture-to-real-data normalization
- Explicit out-of-scope list for writes.

Acceptance criteria:

- Keeps Supabase/RLS/RPC as source of truth.
- Defines read-only contract before any data mutation plan.
- Identifies parity checks needed against Flutter.
- Identifies what can be tested with fixtures and what needs real read-only data.

Done evidence:

- A 0.25D issue or spec draft can be created from the packet.

### Track F: Planner Workbench Steel Thread

Owner:

- Product Spec Agent + UX Systems Agent

Inputs:

- Steel thread from `SPEC_HUMAN_AGENT_EXPERIENCE_GUI_FOUNDATION.md`.
- `08_signature_planner_workbench_v2.md`.
- `12_registry_planner_workbench_v3.md`.
- `BETA_PLANNER_WORKBENCH_REVIEW_SCRIPT_2026-05-18.md`.

Deliverables:

- End-to-end workflow narrative:
  - lead/conversation intake
  - AI qualification
  - missing data
  - draft itinerary
  - supplier/product comparison
  - margin guard
  - approval required
  - proposal readiness
  - audit trail
- Required fixtures and beta review tasks.
- Decision log fields for accept/revise/reject.

Acceptance criteria:

- A senior planner can understand the next action in under 10 seconds.
- AI suggestion, draft, blocked, approval required, approved and executed states are visually and semantically distinct.
- Public send/reserve/pay are clearly absent or disabled in prototype scope.
- Every AI item has trace access.

Done evidence:

- Workflow can seed 0.25C prototype issues and beta review sessions.

### Track G: QA, Evals And BukeerBench Readiness

Owner:

- QA/Evals Agent

Inputs:

- Visual QA rubric.
- Agentic UI State Model acceptance questions.
- Epic #823 BukeerBench/evals requirements.

Deliverables:

- Test matrix for:
  - Visual QA scores.
  - agentic state comprehension.
  - no-permission behavior.
  - AI blocked vs technical error behavior.
  - trace safety.
  - responsive preservation.
  - parity checks against Flutter.
- Initial BukeerBench scenario list for Planner Workbench.

Acceptance criteria:

- Every scenario has expected state, permitted action, disabled action and trace expectation.
- Visual QA uses reject/accept labels from the existing rubric.
- Responsive QA explicitly tests that approvals, trace and missing data are not hidden.
- Evals do not require secrets or production writes.

Done evidence:

- Test plan can be attached to #827/#828/#830/#832.

### Track H: Rollout, Flags And Rollback

Owner:

- Release/Rollback Agent

Inputs:

- Epic #823 principles.
- Current route/prototype boundaries.
- Read-only foundation plan from Track E.

Deliverables:

- Rollout ring proposal:
  - internal hidden prototype
  - internal read-only
  - beta planner read-only
  - controlled draft mode
  - gated writes only after separate approval
- Feature flag taxonomy.
- Rollback runbook outline.
- Risk register.

Acceptance criteria:

- Rollback does not require DB revert.
- Flags are per domain/capability, not one all-or-nothing admin flag.
- Prototype and production routes remain distinguishable.
- Risks include permission drift, financial total divergence, realtime conversation gaps, token bridge, generic UI drift and premature autonomy.

Done evidence:

- Runbook outline can become a future issue before 0.25C/0.25D ships.

## 6. Shared Acceptance Criteria For Today

All tracks must pass these shared gates:

- References at least one canonical local source file.
- Stays in documentation/planning scope.
- Does not introduce UI component edits.
- Names owner, deliverable and acceptance criteria.
- Uses the agentic state vocabulary from `AGENTIC_UI_STATE_MODEL_2026-05-18.md`.
- Keeps Design Lock Code-First as the gate before implementation.
- Separates fixture prototype, read-only data and write-enabled production behavior.
- Documents risks and integration dependencies.

## 7. Integration Order

The integration order is intentionally staged so parallel agents do not overwrite each other or move into unsafe implementation.

### Integration 1: Canonical Language Lock

Merge first:

1. Track B Design Lock checklist.
2. Track D governance vocabulary.
3. Track A progress accounting.

Reason:

- These define the words and gates every other track must use.

Blocking condition:

- If state names or autonomy levels drift from `AGENTIC_UI_STATE_MODEL_2026-05-18.md`, pause and reconcile before writing downstream issue checklists.

### Integration 2: Contract And Steel Thread Alignment

Merge second:

1. Track C component contract gaps.
2. Track F Planner Workbench steel thread.
3. Track G QA/evals scenarios.

Reason:

- The component contract must express the same user journey and state expectations that QA will test.

Blocking condition:

- If Planner Workbench cannot show trace, missing data and approval without page hopping, do not mark 0.25C ready.

### Integration 3: Read-Only Foundation And Rollout

Merge third:

1. Track E read-only admin foundation.
2. Track H rollout/rollback plan.
3. Track A issue map update.

Reason:

- Data/session planning and release controls must agree before anyone opens implementation issues.

Blocking condition:

- If a planned route requires production writes, public send, reservation, payment or supplier mutation, move it out of this mega sprint.

### Integration 4: Epic Update

Merge last:

1. Sprint Captain writes final status.
2. GitHub Triage Agent updates Epic #823 and child issues.
3. QA/Evals Agent confirms remaining red/yellow risks.

Reason:

- Epic comments should reflect settled track outputs, not intermediate drafts.

## 8. Risk Register

| Risk | Severity | Owner | Mitigation |
|---|---:|---|---|
| Planning claims 50% of production migration instead of foundation readiness | High | Sprint Captain | Use the readiness definition in section 3 |
| Agents edit UI components during planning sprint | High | Sprint Captain | Keep scope to docs/specs/issues and review git diff before close |
| Generic SaaS/dashboard direction re-enters implementation | High | UX Systems Agent | Apply Visual QA automatic rejection rules |
| AI actions look executable without approval | High | Contract Agent | Require state, trace, permission, policy and approval fields |
| Hidden chain-of-thought exposed in trace UI | High | Agent Governance Agent | Use reasoning summaries, evidence and tool results only |
| Read-only foundation accidentally scopes writes | High | Read-Only Data Agent | Label write flows out-of-scope and require separate approval |
| Permission drift between Flutter and Next | High | Read-Only Data Agent | Plan parity checks before domain rollout |
| Financial totals or margin logic diverge | High | QA/Evals Agent | Add parity/eval fixtures for pricing and margin guard |
| Beta review confuses public send/reserve/pay states | High | UX Systems Agent | Add comprehension questions and reject on critical confusion |
| Too many tracks produce conflicting docs | Medium | Sprint Captain | Integrate in the order defined above |
| Figma becomes a blocking artifact again | Medium | UX Systems Agent | Repeat source-of-truth order in every handoff |
| Rollback requires database revert | Medium | Release/Rollback Agent | Use flags and route/domain fallback boundaries |

## 9. Issue Update Template

Use this template for Epic #823 and child issues when the track deliverable is ready:

```md
## Mega Sprint 2026-05-18 Update

Track:
Owner:
Status: Green / Yellow / Red

Deliverable:
- ...

Acceptance evidence:
- ...

Dependencies:
- ...

Risks:
- ...

Out of scope:
- Production UI component edits
- Writes/public send/payment/reservation/supplier mutation
```

## 10. End-Of-Day Scorecard

| Track | Green Criteria | Status |
|---|---|---|
| A Epic map | Issue map + progress accounting ready | TBD |
| B Design lock | Gate checklist ready | TBD |
| C Component contract | Contract gaps and spike order ready | TBD |
| D Governance | Autonomy/ledger/trace matrix ready | TBD |
| E Read-only foundation | Session/flags/query plan ready | TBD |
| F Steel thread | Planner workflow and fixtures ready | TBD |
| G QA/evals | Visual/state/eval matrix ready | TBD |
| H Rollout | Flags and rollback outline ready | TBD |

Today reaches the intended 50% foundation readiness when at least 6 tracks are green, no high-risk scope violation remains open, and the integration order has one accountable captain.

## 11. Recommended Next Actions

1. Assign named owners to Tracks A-H.
2. Create or update child issue comments using the template in section 9.
3. Complete Track B and Track D first so all agents use the same state/governance language.
4. Let Track C and Track F proceed in parallel after the language lock.
5. Run Track G as a challenge pass before marking any implementation issue ready.
6. Close the day with a single Epic #823 comment that says "50% foundation readiness target reached/not reached" and lists evidence.

