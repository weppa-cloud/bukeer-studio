# SPEC: Growth OS Hermes Chief of Staff Swarm

## GitHub Tracking

- **Epic Issue**: [#482](https://github.com/weppa-cloud/bukeer-studio/issues/482)
- **Parent Epics**: [#310](https://github.com/weppa-cloud/bukeer-studio/issues/310), [#431](https://github.com/weppa-cloud/bukeer-studio/issues/431), [#441](https://github.com/weppa-cloud/bukeer-studio/issues/441), [#460](https://github.com/weppa-cloud/bukeer-studio/issues/460), [#471](https://github.com/weppa-cloud/bukeer-studio/issues/471)
- **Child Issues**: [#483](https://github.com/weppa-cloud/bukeer-studio/issues/483), [#484](https://github.com/weppa-cloud/bukeer-studio/issues/484), [#485](https://github.com/weppa-cloud/bukeer-studio/issues/485), [#486](https://github.com/weppa-cloud/bukeer-studio/issues/486), [#487](https://github.com/weppa-cloud/bukeer-studio/issues/487), [#488](https://github.com/weppa-cloud/bukeer-studio/issues/488), [#489](https://github.com/weppa-cloud/bukeer-studio/issues/489), [#490](https://github.com/weppa-cloud/bukeer-studio/issues/490)
- **Milestone**: ColombiaTours Growth OS Hermes hybrid runtime
- **Area**: growth + runtime + agents + studio + multi-tenant

## Status

- **Author**: Codex + Growth OS Orchestrator
- **Date**: 2026-05-11
- **Status**: Accepted for execution
- **Related Specs**: [[SPEC_GROWTH_OS_AGENTIC_ORCHESTRATOR_9_PLUS]], [[SPEC_GROWTH_OS_RUNTIME_8_5_HERMES_INSPIRED]], [[SPEC_GROWTH_OS_PROVIDER_EXTRACTION_PROFILES]], [[SPEC_GROWTH_OS_AUTONOMOUS_PRODUCTION_OPERATING_SYSTEM]], [[SPEC_GROWTH_OS_PAPERCLIP_AUTONOMOUS_CEO_COCKPIT]], [[SPEC_GROWTH_OS_UNIFIED_BACKLOG_AND_PROFILE_RUN_LEDGER]], [[SPEC_GROWTH_OS_SSOT_MODEL]]
- **ADRs referenced**: ADR-003, ADR-005, ADR-007, ADR-009, ADR-010, ADR-013, ADR-018, ADR-029
- **External references**: Hermes Agent delegation, profiles, skills, memory, cron and toolset patterns; Paperclip heartbeat, checkout, task state and company-control patterns.
- **Cross-repo impact**: Shared Supabase tables stay tenant-scoped and service-role writes remain server/runtime only. Bukeer Flutter may read operational ledgers later, but Growth OS UI remains in Bukeer Studio for this phase.

## Summary

Add a Hermes-powered conversational and swarm layer to Growth OS without replacing the proven live-gated executor.

The target product experience is a **Growth Chief of Staff** that can talk with the CEO/operator, remember factual operating history, explain decisions, recommend next actions and delegate work to specialized agents. Hermes provides the richer conversation, skills, memory, model routing and delegation runtime. Growth OS remains the operational source of truth: Supabase stores profiles, decisions, work items, publications, outcomes, policies, caps, tasks, memories and audit logs. The TypeScript executor remains the only boundary that can mutate production website surfaces.

This is a hybrid architecture:

```text
CEO/operator conversation
-> Hermes Chief of Staff
-> Growth OS context builder + action router
-> Hermes lane agents produce artifacts
-> Growth OS work items / decisions / tasks
-> TypeScript live-gated executor
-> snapshot -> apply -> smoke -> rollback/outcome
-> learning -> future context
```

Hermes does not publish, merge, edit SEO rows or call sensitive provider mutations directly. It reasons, converses, delegates and produces reviewed artifacts. Growth OS decides whether those artifacts become candidates/work items and the executor decides whether anything can touch production.

## Product Thesis

The current Growth OS is strong as a production workflow engine: it has state machines, anti-rework, provider evidence, gates, smoke, rollback and outcomes. It is weaker as a living operating partner: the user still has to inspect tables, ask separate questions, and manually connect what happened to what should happen next.

The next step is not a full rewrite onto Hermes. The next step is to use Hermes where it is strongest:

- conversation over long-running operational history;
- subagent delegation and parallel reasoning;
- skills and memories as editable operating knowledge;
- model/tool routing per agent;
- summarizing decisions and tradeoffs for humans.

Growth OS keeps what it is strongest at:

- multi-tenant factual state;
- provider extraction and evidence correlation;
- action-class safety;
- live-gated execution;
- snapshots, smoke, rollback and measurable outcomes;
- UI controls and auditability.

## Scorecard

| Area | Current state | Target |
|---|---|---|
| Conversation | UI dashboards plus ad hoc operator questions. | Chief of Staff chat answers from factual Growth OS ledgers with citations. |
| Reasoning | Central Growth CEO Brain creates decisions. | Hermes Chief of Staff can delegate analysis to lane agents and compare recommendations. |
| Execution | TypeScript runtime executes deterministic live-gated pipeline. | Same executor remains; Hermes only produces artifacts and requests. |
| Swarm | Lanes are mostly runtime functions and task sessions. | Lane agents have isolated context, editable skills, toolsets, budgets, leases and artifacts. |
| Learning | Outcomes propose memories/skills; UI can show learning. | Conversation and agent context cite approved memories/skills and explain influence. |
| Governance | Policies/caps/kill switch are visible and enforced. | Chat/action router knows which actions are read-only, safe, approval-required or forbidden. |
| Multi-tenant | Account/website scoping, RLS and service-role runtime writes. | Hermes profiles and action context are tenant-scoped; cross-tenant reads/writes are blocked. |
| UX | CEO cockpit, Workboard, Agents and Data Health. | Adds Chief of Staff chat and decision/action workflow inside Bukeer Studio. |

Final acceptance rule:

```text
Growth OS Hermes Swarm is successful when the CEO can ask what happened,
why it happened, what the system learned and what it recommends next; Hermes
can delegate reasoning to lane agents; and every production mutation is still
traceable to a Growth OS work item, artifact, gate, snapshot, smoke, rollback
and outcome.
```

## Architecture Decisions

| Decision | Rule |
|---|---|
| Runtime posture | Hybrid. Do not replace the TypeScript executor in this phase. |
| Hermes role | Conversation, reasoning, skill/memory use, delegation and artifact generation. |
| Growth OS role | Operational SSOT, policy engine, anti-rework, work queue, execution ledger and outcome ledger. |
| Mutation boundary | Only Growth OS live-gated adapters can mutate website/content/SEO production tables. |
| Conversation truth | Supabase facts beat chat memory. Hermes memory may summarize, but factual answers must cite Growth OS rows. |
| Agent model | Fixed core agent types; editable tenant-scoped agent instances. |
| Multi-tenant | Every context, action and tool invocation carries `account_id`, `website_id`, role and policy scope. |
| Skills | Skills are editable and versioned per lane/tenant; safety-critical bounds stay code/policy-owned. |
| Kanban | Do not replace Growth OS work item state with Hermes Kanban. Hermes task state maps into `growth_agent_task_sessions`; Growth OS remains the production queue. |
| Rollout | ColombiaTours first, parallel with the current runtime until certification passes. |

## System Boundaries

### Hermes Can Do

- Answer operational questions using Growth OS context.
- Summarize cycles, decisions, profile runs, tasks, jobs, outcomes and learning.
- Recommend next actions with confidence and risk.
- Delegate analysis to lane agents.
- Generate artifacts:
  - `content_article`
  - `content_brief`
  - `transcreation_payload`
  - `safe_apply_patch`
  - `quality_review`
  - `outcome_analysis`
  - `policy_recommendation`
  - `provider_analysis`
- Ask the Growth OS action router to enqueue wakeups, candidates or work items.
- Propose memory/skill changes.

### Hermes Cannot Do

- Directly update public content tables.
- Directly publish blogs/pages.
- Directly merge transcreations.
- Directly apply technical patches.
- Directly mutate paid media, pricing, availability, reservations, payments, CRM, outreach or experiments.
- Bypass `growth_autonomy_policies`, caps, kill switch, profile freshness, anti-rework, quality gates, smoke or rollback.
- Use cross-tenant context.

### Growth OS Executor Owns

- `content_publish`
- `transcreation_merge`
- `safe_apply`
- snapshots
- smoke checks
- rollback payloads and rollback execution
- `growth_publication_jobs`
- `growth_work_item_outcomes`
- route revalidation

## User Experience

### Flow 1: Executive Briefing

User asks:

```text
Que hicimos esta semana?
```

System response must cite factual records:

1. recent `growth_runtime_cycles`;
2. `growth_orchestrator_decisions`;
3. `growth_work_items`;
4. `growth_publication_jobs`;
5. `growth_work_item_outcomes`;
6. `growth_profile_runs`;
7. `growth_agent_task_sessions`;
8. `growth_agent_memories` and `growth_agent_skills` only when they influenced decisions.

The answer must distinguish:

- completed work;
- live mutations;
- blocked work;
- measuring outcomes;
- failures/rollbacks;
- next recommended actions.

### Flow 2: Decision Support

User asks:

```text
Subo el cap tecnico a 50?
```

The Chief of Staff should:

1. read current policies/caps;
2. read recent smoke failures/rollbacks;
3. read duplicate/coalesced work;
4. read open sessions/runs;
5. recommend an action with a bounded plan;
6. offer an executable server action only if allowed.

If the action is risky, the response should suggest staged caps, for example `10 -> 25 -> 50`, with stop conditions.

### Flow 3: Guided Action

User asks:

```text
Corre el siguiente ciclo tecnico.
```

The UI action must not execute the brain directly. It should:

1. create a `growth_chief_of_staff_action` with requested intent;
2. route to an allowed action class;
3. enqueue `growth_agent_wakeup_requests` or scheduler command;
4. show queued/claimed/completed/failed state;
5. let the production cycle claim and execute under leases.

### Flow 4: Content Creation With Hermes

Current system:

1. provider facts and Brain create content opportunities;
2. TypeScript content planner builds a change set;
3. executor publishes if gates pass.

Target system:

1. Chief of Staff or scheduler delegates topic analysis to `content_strategist`;
2. `content_writer` produces a `content_article` artifact with citations, slug, locale, tone and rollback expectation;
3. `content_editor` produces `quality_review`;
4. Growth OS materializes a candidate/work item from the artifact only if anti-rework and provider evidence pass;
5. executor publishes through `content_publish` with snapshot, smoke, rollback and outcome.

### Flow 5: Technical Remediation With Hermes

1. `technical_remediation` agent reads DataForSEO/GSC/GA4/Clarity evidence and previous failed/won outcomes.
2. It produces a `safe_apply_patch` artifact with:
   - target table/id;
   - field allowlist;
   - before expectation;
   - patch;
   - rollback payload;
   - smoke plan;
   - expected outcome.
3. Growth OS validates the artifact and creates/updates a work item.
4. executor applies only through `safe_apply`.

### Flow 6: Transcreation With Hermes

1. `transcreation` agent reads source locale, target locale, glossary, translation memory, provider evidence and quality rules.
2. It produces `transcreation_payload` plus `quality_review`.
3. Growth OS blocks locale mismatch, missing TM/glossary or low quality.
4. executor merges through the existing transcreation workflow.

### Flow 7: Learning Conversation

User asks:

```text
Que aprendimos de la corrida tecnica?
```

The response should cite outcomes, memory candidates, approved memories and skill changes. If an approved memory or skill influenced a later decision, the response must show the later `decision_id` and the cited `memory_id` or `skill_id`.

## Agent Model

Agent types are fixed product primitives. Agent instances are tenant-scoped and editable.

### Fixed Agent Types

| Agent type | Purpose | Can generate artifacts | Can request live execution |
|---|---|---|---|
| `chief_of_staff` | Conversational operating partner and decision router. | yes | request only |
| `growth_ceo_brain` | Strategy and prioritization over profiles, outcomes and work. | yes | request only |
| `content_strategist` | Topic/opportunity analysis and brief generation. | yes | request only |
| `content_writer` | Article/landing copy generation. | yes | no direct |
| `content_editor` | Editorial, brand, duplication and quality review. | yes | no direct |
| `technical_remediation` | Reversible technical SEO patch design. | yes | request only |
| `transcreation` | Locale adaptation and merge payload design. | yes | request only |
| `provider_analyst` | Provider/profile interpretation and correlation. | yes | no direct |
| `outcome_analyst` | Outcome evaluation and learning proposals. | yes | no direct |
| `risk_guardian` | Policy, caps, sensitive surfaces and rollback review. | yes | no direct |

### Editable Agent Instance Fields

Tenant admins can edit:

- display name;
- enabled/paused;
- model/provider preference;
- max cost per day/week;
- concurrency limit;
- cadence/wakeup policy;
- active skills;
- active memories;
- toolset allowlist within permitted class;
- confidence threshold;
- quality threshold;
- routing priority;
- notification preferences.

Tenant admins cannot edit:

- sensitive action hard-blocks;
- service-role secret access;
- cross-tenant scope;
- executor mutation boundary;
- rollback requirement;
- smoke requirement;
- outcome requirement;
- RLS policies;
- immutable audit logs.

## Data Contracts

Reuse existing tables where possible:

- `growth_context_snapshots`
- `growth_orchestrator_decisions`
- `growth_agent_wakeup_requests`
- `growth_agent_runtime_state`
- `growth_agent_task_sessions`
- `growth_agent_memories`
- `growth_agent_skills`
- `growth_agent_replay_cases`
- `growth_work_items`
- `growth_publication_jobs`
- `growth_work_item_outcomes`
- `growth_autonomy_policies`
- `growth_profile_runs`

Additive tables/extensions:

| Table | Purpose |
|---|---|
| `growth_chief_of_staff_sessions` | Tenant-scoped conversation session header, linked to user, account and website. |
| `growth_chief_of_staff_messages` | Append-only user/assistant/tool messages with cited refs and redaction metadata. |
| `growth_chief_of_staff_actions` | Audited action requests from chat/UI, routed to read-only/safe/approval/forbidden classes. |
| `growth_agent_types` | Global registry of fixed agent type contracts and immutable safety bounds. |
| `growth_agent_instances` | Tenant-scoped editable agent configuration. |
| `growth_agent_artifacts` | Versioned artifacts produced by Hermes agents for Growth OS validation/execution. |

### `growth_chief_of_staff_actions`

Minimum fields:

- `account_id`
- `website_id`
- `session_id`
- `requested_by`
- `intent`
- `action_class`: `read_only | enqueue_wakeup | propose_policy | request_cap_change | request_runtime_cycle | approve_learning | forbidden`
- `status`: `proposed | queued | approved | rejected | completed | failed | blocked`
- `requires_approval`
- `approval`
- `policy_verdict`
- `created_refs`
- `last_error`

### `growth_agent_artifacts`

Minimum fields:

- `account_id`
- `website_id`
- `agent_instance_id`
- `task_session_id`
- `decision_id`
- `artifact_type`
- `artifact_version`
- `status`: `draft | ready_for_validation | validated | rejected | materialized | superseded`
- `payload`
- `quality_review`
- `provider_evidence_reads`
- `memory_reads`
- `skill_reads`
- `risk_assessment`
- `idempotency_key`
- `created_work_item_id`
- `created_change_set_id`

Artifact materialization is blocked unless:

- account/website scope matches;
- artifact schema validates;
- provider evidence is sufficient;
- anti-rework verdict allows materialization;
- policy allows the action class;
- rollback expectation exists for mutable artifacts;
- outcome metric and evaluation window exist.

## Action Router

All Chief of Staff and Hermes requests pass through a server-side action router.

| Action class | Examples | Handling |
|---|---|---|
| `read_only` | briefing, explain decision, summarize outcomes | allowed for tenant-scoped authenticated users |
| `enqueue_wakeup` | invoke brain, run provider analysis, ask lane agent for artifact | admin/growth operator only, creates wakeup/task session |
| `propose_policy` | recommend cap change or cadence change | creates recommendation; no mutation until approval |
| `request_cap_change` | change `growth_autonomy_policies` cap/dry-run/pause | admin approval and audit required |
| `request_runtime_cycle` | run production cycle | admin approval or explicit policy; still executor-gated |
| `approve_learning` | activate/deprecate memory or skill | admin only; replay checks enforced |
| `forbidden` | paid mutation, pricing, payments, reservations, availability, CRM bulk, outreach | always blocked |

## Hermes Runtime Placement

Hermes may run as one of these deployment shapes:

1. **Local/sidecar worker for ColombiaTours pilot**:
   - same VPS or controlled host;
   - reads only tenant-scoped context through Growth OS services/MCP;
   - writes only through action router/MCP tools.
2. **Hermes profile per tenant**:
   - one profile for ColombiaTours;
   - future tenants get separate profiles/config;
   - no shared conversation memory across tenants.
3. **Bukeer Studio chat front-end**:
   - user interacts in Bukeer Studio;
   - backend calls Hermes or a Hermes-compatible worker;
   - UI never exposes service-role credentials.

The initial implementation should run Hermes in parallel with the existing production cycle. The legacy Growth OS runtime remains active until side-by-side outputs and production certification pass.

## Multi-Tenant Security

Every request must carry:

- `account_id`
- `website_id`
- authenticated `user_id`
- `user_role`
- selected agent instance id
- action class
- policy scope

Rules:

- no global conversation memory;
- no cross-tenant tool access;
- no tenant can edit global agent type safety bounds;
- Hermes toolsets are scoped by account/website;
- all writes to runtime/publication/outcome tables remain service-role behind server actions;
- authenticated users can read only tenants where `user_roles` grants access;
- raw provider payloads and secrets are not injected into chat.

## Implementation Phases

### Phase 1: Chief of Staff Read-Only

- Add conversation tables.
- Build factual context retrieval over Growth OS ledgers.
- Implement read-only chat endpoints.
- UI: add Chief of Staff panel in Growth OS.
- Acceptance: user can ask weekly briefing, latest failures, blocked work and next recommendations with cited refs.

### Phase 2: Action Router

- Add `growth_chief_of_staff_actions`.
- Implement action classification and policy verdicts.
- Chat can enqueue wakeups but cannot run brain/executor directly.
- Acceptance: guided action creates audited queued action and wakeup.

### Phase 3: Hermes Runtime Pilot

- Create Hermes profile/toolset for ColombiaTours.
- Implement tenant-scoped context bridge.
- Run Hermes Chief of Staff in side-by-side mode against current Growth CEO Brain.
- Acceptance: Hermes decisions/artifacts are recorded without live mutation and compared to TypeScript brain outputs.

### Phase 4: Agent Instances + Company Control

- Add `growth_agent_types` and `growth_agent_instances`.
- UI: edit agent instance model, budgets, skills, memories, cadence and pause/resume.
- Immutable safety bounds shown but not editable.
- Acceptance: changing agent settings updates future context/routing without code deploy.

### Phase 5: Artifact Pipeline

- Add `growth_agent_artifacts`.
- Implement content, technical and transcreation artifact schemas.
- Validate artifacts into candidates/work items.
- Acceptance: at least one artifact per lane becomes a work item and is executed only by Growth OS executor.

### Phase 6: Swarm Execution

- Lane agents run as isolated task sessions with leases and independent failure handling.
- Brain/Chief of Staff delegates to lane agents, not monolithic functions.
- UI shows parent/child tasks, owner agent, artifact status and costs.
- Acceptance: content, technical and transcreation lane tasks can run independently and converge into the same Growth OS ledger.

### Phase 7: Production Certification

- Run ColombiaTours pilot in parallel with legacy runtime.
- Prove read-only conversation, guided actions, Hermes artifacts, executor-only mutation, multi-tenant isolation and learning citations.
- Keep legacy runtime until certification is clean.

## Acceptance Criteria

- [ ] CEO can ask "what happened this week?" and receive a cited summary from Growth OS ledgers.
- [ ] CEO can ask "what should we do next?" and receive a prioritized recommendation with evidence, risk and stop conditions.
- [ ] Chat actions are routed through `growth_chief_of_staff_actions`; no chat endpoint mutates public website tables.
- [ ] `Invoke brain now` and similar guided actions enqueue wakeups; daemon/runtime claims them.
- [ ] Hermes Chief of Staff can delegate at least one analysis task to a lane agent and record a task session.
- [ ] Agent instances are editable from UI for model, budget, cadence, skills, memories and pause/resume.
- [ ] Safety-critical boundaries are visible but not editable.
- [ ] Hermes-generated content artifact can become a Growth OS work item and publish only through `content_publish`.
- [ ] Hermes-generated technical artifact can become a Growth OS work item and apply only through `safe_apply`.
- [ ] Hermes-generated transcreation artifact can become a Growth OS work item and merge only through `transcreation_merge`.
- [ ] Every production mutation has `work_item_id`, `artifact_id` if applicable, `change_set_id`, `publication_job_id`, snapshot, smoke result, rollback payload and outcome.
- [ ] Forbidden actions are blocked with a clear policy verdict.
- [ ] Cross-tenant reads and actions fail in tests.
- [ ] Learning loop proof exists: evaluated outcome -> approved memory/skill -> later conversation or decision cites it.

## Test Plan

### Unit

- Action router classifies read-only, enqueue, approval-required and forbidden intents.
- Chief of Staff context builder returns only tenant-scoped facts.
- Conversation answer builder requires citations for operational claims.
- Prompt-injection scanner blocks contaminated memory, skill and provider text.
- Agent instance updates cannot change immutable safety bounds.
- Artifact schemas reject missing provider refs, rollback, smoke plan, metric or evaluation window.
- Skill activation still blocks replay agreement `<0.90`.

### Integration

- Chat question -> context builder -> cited answer.
- Chat guided action -> `growth_chief_of_staff_actions` -> wakeup queued -> runtime claim -> decision ledger.
- Hermes lane agent -> `growth_agent_artifacts` -> validation -> candidate/work item -> executor.
- Content artifact -> publication job -> smoke pass -> outcome measuring.
- Technical artifact smoke fail -> rollback -> job `rolled_back` -> work item blocked.
- Learning loop -> memory/skill approved -> later Chief of Staff answer cites it.
- Cross-tenant session cannot read decisions, messages, artifacts or work items from another account.

### E2E Session Pool

- Growth OS Chief of Staff chat renders in Overview.
- User asks for weekly briefing and sees cited facts.
- User asks to run brain now; UI shows action queued, wakeup queued, then completed after cycle.
- Agents UI edits allowed agent instance fields and blocks immutable fields.
- Artifact detail shows provider evidence, memory/skill reads, quality review and materialization status.
- Workboard shows Hermes-created parent/child tasks and artifact-linked work items.
- Mobile views have no horizontal overflow.

### Production Certification

For ColombiaTours:

- 1 read-only Chief of Staff weekly briefing with cited records.
- 1 guided action enqueues wakeup and completes via runtime claim.
- 1 Hermes content artifact materialized and executed by Growth OS executor.
- 1 Hermes technical artifact materialized and executed by Growth OS executor, or blocked with valid policy reason.
- 1 Hermes transcreation artifact materialized and executed by Growth OS executor, or blocked with valid policy reason.
- 1 forbidden action blocked.
- 1 learning citation in a later conversation/decision.
- 0 direct Hermes mutations to public website tables.
- 0 cross-tenant reads.
- Certification report under `docs/growth-sessions/`.

## Open Risks

- Hermes must prove stable as a production-adjacent worker before it replaces any current brain/runtime responsibility.
- Conversation memory can become misleading if it is not grounded in Supabase citations.
- Agent editability can become unsafe if instance settings are allowed to override policy bounds.
- Full runtime replacement by Hermes would recreate gates/leases/rollback from scratch; this spec explicitly avoids that in the first rollout.

## Non-Goals

- Replacing Growth OS work item tables with Hermes Kanban.
- Replacing the TypeScript live-gated executor.
- Building a generic multi-tenant AI agent marketplace.
- Enabling paid media, pricing, payment, reservation, availability, CRM bulk or outreach mutation.
- Storing Clarity recordings or PII in conversation context.
- Sharing memory across tenants.
