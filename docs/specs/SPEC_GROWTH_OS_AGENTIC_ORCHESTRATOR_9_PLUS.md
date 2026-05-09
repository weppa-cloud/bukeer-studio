# SPEC: Growth OS Agentic Orchestrator 9+

## GitHub Tracking

- **Epic Issue**: [#460](https://github.com/weppa-cloud/bukeer-studio/issues/460)
- **Parent Epic**: [#310](https://github.com/weppa-cloud/bukeer-studio/issues/310)
- **Control Plane Epic**: [#431](https://github.com/weppa-cloud/bukeer-studio/issues/431)
- **Production Runtime Epic**: [#441](https://github.com/weppa-cloud/bukeer-studio/issues/441)
- **Child Issues**: [#461](https://github.com/weppa-cloud/bukeer-studio/issues/461), [#462](https://github.com/weppa-cloud/bukeer-studio/issues/462), [#463](https://github.com/weppa-cloud/bukeer-studio/issues/463), [#464](https://github.com/weppa-cloud/bukeer-studio/issues/464), [#465](https://github.com/weppa-cloud/bukeer-studio/issues/465), [#466](https://github.com/weppa-cloud/bukeer-studio/issues/466), [#467](https://github.com/weppa-cloud/bukeer-studio/issues/467), [#468](https://github.com/weppa-cloud/bukeer-studio/issues/468), [#469](https://github.com/weppa-cloud/bukeer-studio/issues/469)
- **Milestone**: ColombiaTours Growth OS agentic orchestration
- **Area**: growth + runtime + supabase + studio + learning

## Status

- **Author**: Codex + Growth OS Orchestrator
- **Date**: 2026-05-08
- **Status**: Accepted for execution
- **Related Specs**: [[SPEC_GROWTH_OS_AUTONOMOUS_PRODUCTION_OPERATING_SYSTEM]], [[SPEC_GROWTH_OS_PAPERCLIP_AUTONOMOUS_CEO_COCKPIT]], [[SPEC_GROWTH_OS_RUNTIME_8_5_HERMES_INSPIRED]], [[SPEC_GROWTH_OS_SYMPHONY_ORCHESTRATOR]], [[SPEC_GROWTH_OS_AGENT_MODEL_AND_WORKFLOW_REGISTRY]], [[SPEC_GROWTH_OS_CONTROL_PLANE_UX]], [[SPEC_GROWTH_OS_SSOT_MODEL]]
- **ADRs referenced**: ADR-003, ADR-005, ADR-007, ADR-009, ADR-010, ADR-013, ADR-018, ADR-029
- **External references**: Paperclip agent company runtime patterns; Hermes Agent context, memory, toolset, cron and delegation patterns.
- **Cross-repo impact**: New Supabase tables/RLS remain shared with `weppa-cloud/bukeer-flutter`; migrations must follow [[supabase-migration-governance]]. Runtime writes remain service-role only.

## Summary

Move Growth OS from a live-gated deterministic runtime to a 9+/10 agentic operating system for ColombiaTours.

The current production cycle can refresh profiles, discover deterministic candidates, promote ready work items, claim runs and execute live-gated adapters. The missing layer is a Growth CEO Brain that reasons before the production cycle: it assembles safe context, reads active memory/skills/outcomes, creates auditable decisions, proposes candidates/work items, delegates lane work and explains why it blocked or advanced work.

This SPEC does not replace the live-gated executor. The brain never mutates public content, translations, technical rows, paid media, pricing, availability, reservations, payments, bulk CRM state or outreach. The executor remains the only production mutation boundary.

## 9+ Scorecard

| Area          | Baseline current state                                | 9+ target                                                                                                        |
| ------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Orchestration | Deterministic discovery from `growth_signal_facts`.   | Agentic brain creates structured, auditable decisions before runtime execution.                                  |
| Context       | Profiles and signals are used by runtime gates.       | Versioned context builder includes profiles, memory, skills, outcomes, caps, active work and fresh sources.      |
| Memory        | Learning summary recommends actions.                  | Outcomes create memory/skill candidates that influence later brain decisions.                                    |
| Delegation    | Work items are lane-scoped.                           | Task sessions preserve handoff, dependencies, owner agent and wakeup state.                                      |
| Wakeups       | Recurrent daemon cycle.                               | Paperclip-style wakeup queue: timer, assignment, outcome due, unblock, on demand and policy change.              |
| UI            | Cockpit and control surfaces exist.                   | Company Control shows agents, heartbeat, context, decisions, skills, memory, toolsets, costs and caps.           |
| Safety        | Live-gated adapters enforce caps, smoke and rollback. | Brain cannot mutate; executor remains the single production mutation boundary.                                   |
| Audit         | Runtime cycles and publication jobs exist.            | Decision ledger records context, alternatives, memory, skill, policy, confidence and risk.                       |
| Production    | Live-gated certification exists.                      | 24h with brain decisions: no stuck wakeups/runs, no cap overflow, no sensitive attempts, traceable learning use. |

Final acceptance rule:

```text
Growth OS 9+ means the system can explain why it created, blocked, delegated
or executed an opportunity using prior memory/outcomes, while proving that no
production mutation bypassed gates.
```

## Product Decisions

| Decision                | Rule                                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------- |
| Initial tenant          | ColombiaTours only.                                                                                           |
| Brain posture           | Full agentic reasoning with bounded writes to signals, decisions, candidates, work items and recommendations. |
| Mutation posture        | Brain never mutates production surfaces; existing live-gated executor owns all mutations.                     |
| Primary context         | `buildGrowthAgentContext` snapshots become the auditable input for brain decisions.                           |
| Primary decision ledger | `growth_orchestrator_decisions` is the source of truth for why work was created, delegated or blocked.        |
| Agent model             | Keep five canonical Growth OS lanes; do not create one agent per task.                                        |
| Learning activation     | Memory/skill proposals require human/admin approval; skill activation requires replay agreement `>=0.90`.     |
| UI                      | Bukeer Studio exposes Growth OS Company Control, not a generic Paperclip clone.                               |

## User Flows

### Flow 1: Scheduled Brain Creates Work

1. Scheduler creates a `timer` or `data_refresh` wakeup.
2. Context builder loads fresh profiles, current policies/caps, active work, recent outcomes, memory, skills, replay agreement, blocked tools and cost state.
3. Brain emits a structured `GrowthOrchestratorDecision`.
4. Service validates the decision schema and hard-blocks sensitive surfaces.
5. Valid proposed signals/candidates/work items are persisted with source refs to the decision and context snapshot.
6. Production cycle later promotes, claims and executes only through existing live-gated adapters.

### Flow 2: Brain Blocks Unsafe Work

1. Brain sees a paid, pricing, reservation, payment, availability, CRM or outreach opportunity.
2. Decision records `blocked_decisions[]`, `no_go_reasons[]`, policy evidence and recommended human path.
3. No candidate is promoted to live-ready work.
4. UI shows the blocked reason and the policy that prevented mutation.

### Flow 3: Brain Delegates Across Lanes

1. Brain identifies a parent opportunity requiring content plus technical support.
2. It creates a parent work item and child task sessions with lane owners.
3. Each child has handoff summary, dependencies, context refs and completion contract.
4. Wakeup requests are queued for assigned lanes.
5. Workboard shows parent/child hierarchy and blocking dependencies.

### Flow 4: Outcome Becomes Learning

1. Outcome evaluator marks a job `lost`, `won` or `inconclusive`.
2. Learning service creates replay case and memory/skill candidate.
3. Admin approves reusable memory or skill after replay threshold is satisfied.
4. Context builder injects active learning into future brain runs.
5. Later brain decision cites the memory/skill and explains how it changed the decision.

### Flow 5: CEO Operates Company Control

1. CEO opens Growth OS.
2. UI shows agents, heartbeats, active wakeups, brain decisions, context snapshots, caps, risk, outcomes and learning state.
3. CEO/admin can invoke heartbeat, pause/resume a lane, inspect decision rationale, approve/deprecate memory/skills and change caps.
4. Every action creates an audit event and revalidates the relevant route.

## Data Model

New tables or compatible extensions:

| Table                           | Purpose                                                                                      |
| ------------------------------- | -------------------------------------------------------------------------------------------- |
| `growth_orchestrator_decisions` | Append-only decision ledger for brain outputs, linked to cycle, wakeup and context snapshot. |
| `growth_context_snapshots`      | Compact, sanitized, versioned context bundles used by brain or lane agents.                  |
| `growth_agent_wakeup_requests`  | DB-backed wakeup queue with coalescing, priority, source and run linkage.                    |
| `growth_agent_runtime_state`    | Per-agent runtime counters, last run, session state, cost and last error.                    |
| `growth_agent_task_sessions`    | Per-agent/per-task handoff state for parent/child delegation and resumable work.             |

Minimum `GrowthOrchestratorDecision` contract:

```ts
type GrowthOrchestratorDecision = {
  decision_id: string;
  account_id: string;
  website_id: string;
  cycle_id: string | null;
  wakeup_request_id: string | null;
  context_snapshot_id: string;
  objective: string;
  north_star_alignment: string;
  decision_type:
    | "create_work"
    | "delegate"
    | "block"
    | "learn"
    | "recommend_policy"
    | "observe";
  observed_signals: unknown[];
  proposed_candidates: unknown[];
  proposed_work_items: unknown[];
  delegated_tasks: unknown[];
  blocked_decisions: unknown[];
  memory_reads: unknown[];
  skill_reads: unknown[];
  outcome_references: unknown[];
  policy_recommendations: unknown[];
  risk_assessment: unknown;
  confidence: number;
  no_go_reasons: string[];
  created_signal_fact_ids: string[];
  created_candidate_ids: string[];
  created_work_item_ids: string[];
};
```

Wakeup sources:

```text
timer | data_refresh | assignment | outcome_due | blocked_unblock | user_on_demand | policy_change
```

Task session fields must support:

- parent/child work item references
- delegated-by agent
- assigned lane
- handoff summary
- required context refs
- blocking dependencies
- completion contract
- adapter/runtime session state

## Interfaces

Server services:

```ts
runGrowthOrchestratorBrain(accountId, websiteId, options);
buildGrowthAgentContext(accountId, websiteId, lane, wakeup);
enqueueGrowthAgentWakeup(input);
claimGrowthAgentWakeup(input);
coalesceGrowthAgentWakeups(input);
recordGrowthOrchestratorDecision(input);
materializeBrainDecision(input);
createGrowthAgentTaskSession(input);
deriveGrowthLearningFromOutcome(input);
```

Server actions/admin-only:

```ts
invokeGrowthAgentHeartbeat;
pauseGrowthAgent;
resumeGrowthAgent;
inspectGrowthOrchestratorDecision;
approveGrowthAgentMemory;
deprecateGrowthAgentMemory;
approveGrowthAgentSkill;
deprecateGrowthAgentSkill;
```

Public reads:

```ts
getGrowthAgentCompanyControl(accountId, websiteId);
getGrowthOrchestratorDecisions(accountId, websiteId);
getGrowthAgentWakeups(accountId, websiteId);
getGrowthTaskSessions(accountId, websiteId);
getGrowthContextSnapshot(accountId, websiteId, snapshotId);
```

No browser/client direct writes to runtime tables. Runtime/publication/learning mutations remain service-role only behind server actions or daemon services.

## Safety And Governance

- Brain output is untrusted until schema validation and policy checks pass.
- Brain cannot emit `allowed_action_class` that targets paid, pricing, payments, reservations, availability, bulk CRM, outreach or experiment activation for live execution.
- Context builder must scan memories, skills and external source text for prompt-injection patterns before prompt assembly.
- Context snapshots must store compact excerpts and source refs, not raw provider payloads or secrets.
- Wakeup queue must enforce max one running heartbeat per agent and coalesce duplicates.
- Any brain-created candidate must include profile freshness, target, baseline, success metric, evaluation window and rollback expectation before becoming a ready work item.
- Every materialized decision must link back to `growth_orchestrator_decisions`.

## UI Requirements

Company Control must expose:

- agent cards with lane, heartbeat, status, current work, budget/cost, toolset and runtime health
- decision ledger with context used, memory/skill citations, alternatives, confidence, risk and no-go reasons
- wakeup queue with source, priority, coalesced count, status and linked run
- task sessions with parent/child hierarchy, assignee lane, dependencies and handoff summary
- learning operations for memories, skills and replay with activation blocks below agreement `0.90`
- risk/budget controls for caps, dry-run/live, kill switch, lane pause and usage

## Acceptance Criteria

- Brain runs before production cycle and records at least one valid decision per scheduled cycle when fresh context exists.
- 100% of brain-created candidates/work items link to decision and context snapshot.
- 100% of brain decisions include memory/skill/outcome references or explicit empty arrays.
- 0 production mutations are performed by the brain service.
- 0 sensitive action classes become live-ready through brain materialization.
- Wakeups are DB-backed, coalesced and visible in UI.
- Task sessions support parent/child delegation and show in Workboard.
- Approved memories/skills influence later decisions and are cited.
- Runtime can still execute existing live-gated production cycle without brain enabled.
- 24h production certification passes with no stuck wakeups/runs, no cap overflow and no sensitive mutation attempts.

## Test Plan

Unit:

- brain output validates against `GrowthOrchestratorDecision`
- hard blocks paid/pricing/payments/reservations/availability/CRM/outreach
- context builder includes correct profiles, memories, skills, outcomes and caps
- prompt-injection scanner blocks contaminated context
- wakeup coalescing avoids duplicate queued runs
- replay `<0.90` blocks skill activation

Integration:

- source facts + profiles -> brain decision -> candidate -> work item -> production cycle
- lost outcome -> learning candidate -> approved memory -> next brain decision cites it and avoids repeat
- on-demand wakeup -> decision ledger -> UI-visible run
- delegated task creates child work item with handoff and dependency
- caps/kill switch prevent live-ready materialization

E2E:

- CEO sees objective, agents, brain decisions, context, caps, outcomes and risk
- admin invokes heartbeat and inspects decision ledger
- admin approves/deprecates memory and skill
- blocked decision shows no-go reason
- Workboard shows parent/child hierarchy and owner lane
- mobile has no overflow on Overview, Workboard and Agents

Production certification:

- 24h ColombiaTours monitored run
- at least 3 real brain decisions
- at least 1 candidate created by brain
- at least 1 delegated work item
- at least 1 memory or skill cited in a decision
- at least 1 sensitive decision blocked
- 0 mutations outside executor
- 0 cap overflow
- 0 stuck wakeups/runs
- certification evidence file under `docs/growth-sessions/`

## Suggested Epic Breakdown

- Epic: [#460 `Growth OS Agentic Orchestrator 9+`](https://github.com/weppa-cloud/bukeer-studio/issues/460)
- Child 1: [#461 `Orchestrator Brain contract and decision ledger`](https://github.com/weppa-cloud/bukeer-studio/issues/461)
- Child 2: [#462 `Hermes-style context builder and prompt-injection scan`](https://github.com/weppa-cloud/bukeer-studio/issues/462)
- Child 3: [#463 `Paperclip-style wakeups and runtime state`](https://github.com/weppa-cloud/bukeer-studio/issues/463)
- Child 4: [#464 `Task sessions and delegation model`](https://github.com/weppa-cloud/bukeer-studio/issues/464)
- Child 5: [#465 `Learning loop closure: outcomes to replay, memory and skills`](https://github.com/weppa-cloud/bukeer-studio/issues/465)
- Child 6: [#466 `Agent Company Control UI`](https://github.com/weppa-cloud/bukeer-studio/issues/466)
- Child 7: [#467 `Brain/runtime integration before production cycle`](https://github.com/weppa-cloud/bukeer-studio/issues/467)
- Child 8: [#468 `Agentic orchestrator RLS and service-role hardening`](https://github.com/weppa-cloud/bukeer-studio/issues/468)
- Child 9: [#469 `Growth OS 9+ E2E and production certification`](https://github.com/weppa-cloud/bukeer-studio/issues/469)

## Assumptions

- ColombiaTours is the only initial live rollout.
- Paperclip and Hermes are reference architectures, not runtime dependencies.
- Existing production cycle remains operational if the brain is disabled.
- Skills and memories can be proposed automatically but activation remains human/admin-gated in v1.
- GitHub remains the implementation tracker; Supabase/Bukeer Studio remains operational state.
