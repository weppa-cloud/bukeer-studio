# SPEC: Growth OS Hermes Agent Context Isolation 9

## GitHub Tracking

- **Epic Issue**: [#494](https://github.com/weppa-cloud/bukeer-studio/issues/494)
- **Parent Epics**: [#310](https://github.com/weppa-cloud/bukeer-studio/issues/310), [#441](https://github.com/weppa-cloud/bukeer-studio/issues/441), [#460](https://github.com/weppa-cloud/bukeer-studio/issues/460), [#482](https://github.com/weppa-cloud/bukeer-studio/issues/482)
- **Child Issues**:
  - [#495](https://github.com/weppa-cloud/bukeer-studio/issues/495) - Growth agent context manifest contract
  - [#496](https://github.com/weppa-cloud/bukeer-studio/issues/496) - Strict per-agent context builder
  - [#497](https://github.com/weppa-cloud/bukeer-studio/issues/497) - Hermes sidecar manifest enforcement
  - [#498](https://github.com/weppa-cloud/bukeer-studio/issues/498) - Agent UI knowledge editor and isolation audit
  - [#499](https://github.com/weppa-cloud/bukeer-studio/issues/499) - Agent-specific learning assignment and behavior impact
  - [#500](https://github.com/weppa-cloud/bukeer-studio/issues/500) - Workboard and artifact manifest lineage
  - [#501](https://github.com/weppa-cloud/bukeer-studio/issues/501) - Production certification for Hermes agent isolation 9
- **Milestone**: ColombiaTours Growth OS Hermes 9/10 operating layer
- **Area**: growth + runtime + agents + learning + Bukeer Studio

## Status

- **Author**: Codex + Growth OS Orchestrator
- **Date**: 2026-05-11
- **Status**: Accepted for execution
- **Related Specs**: [[SPEC_GROWTH_OS_HERMES_CHIEF_OF_STAFF_SWARM]], [[SPEC_GROWTH_OS_AGENTIC_ORCHESTRATOR_9_PLUS]], [[SPEC_GROWTH_OS_AUTONOMOUS_PRODUCTION_OPERATING_SYSTEM]], [[SPEC_GROWTH_OS_RUNTIME_8_5_HERMES_INSPIRED]], [[SPEC_GROWTH_OS_PROVIDER_EXTRACTION_PROFILES]]
- **ADRs referenced**: ADR-003, ADR-005, ADR-009, ADR-013, ADR-018, ADR-029
- **Cross-repo impact**: Shared Supabase remains the operational source of truth. Bukeer Flutter should not write these runtime learning tables unless a future cross-repo contract is approved.

## Summary

Close the gap between "Hermes-style agent company exists" and "each agent actually runs with its own isolated skills, memories, toolset, budget and learning context."

The current #482 implementation proves the hybrid architecture: Hermes sidecar can produce artifacts, Growth OS remains the executor, Bukeer Studio shows the agent company, and learning can be cited. The remaining 9/10 gap is stricter: every Hermes/Growth agent task must prove which agent instance ran, which skills and memories were injected, which were excluded, what model/toolset/budget applied, and whether the output changed because of prior learning.

Target flow:

```text
agent instance
-> strict context manifest
-> allowed skills/memories/toolset only
-> Hermes lane task session
-> artifact
-> candidate/work item
-> Growth OS executor
-> smoke/outcome
-> learning update
-> next task cites the learned memory/skill
```

## Problem

Today the data model has the right pieces:

- `growth_agent_instances.active_skill_ids`
- `growth_agent_instances.active_memory_ids`
- `growth_agent_instances.toolset_allowlist`
- `growth_agent_skills`
- `growth_agent_memories`
- `growth_agent_replay_cases`
- `growth_agent_task_sessions`
- `growth_agent_artifacts`

But the runtime is still only partially isolated:

- lane context can include broad active memories/skills;
- the sidecar can cite memory/skill reads, but there is no hard manifest proving only the selected agent context was available;
- agent instance model, budget and toolset are visible in UI, but not yet fully enforced per sidecar task;
- cross-lane contamination is not tested as a first-class failure mode;
- learning is cited, but not yet proven to change future behavior with a measurable before/after.

This spec turns agent isolation into a contract, not a UI label.

## Goals

1. Every agent task uses a single `agent_instance_id`.
2. Every task persists a context manifest with exact skill, memory, tool, model, budget and source refs used.
3. Skills/memories are scoped by `agent_instance_id`, lane, tenant and approval status.
4. Global memories are opt-in and must be explicitly marked safe for cross-lane use.
5. Hermes sidecar and Growth OS Brain both consume the same context manifest contract.
6. Bukeer Studio shows what each agent knew, what it did not know, and why.
7. Learning must prove impact: an approved memory/skill changes a later recommendation, artifact or block decision.
8. Production certification proves no cross-agent or cross-tenant context leakage.

## Autonomy And Isolation Principles

This spec makes two terms explicit:

```text
Agent autonomy = the ability for an agent to decide, within its lane, what
artifact/recommendation/task to produce next using its own context, budget,
skills, memories and toolset.

Agent isolation = the guarantee that the agent can only see and use the
tenant, lane, tools, skills, memories and budget explicitly assigned to that
agent instance for the current task session.
```

Autonomy does **not** mean unrestricted production mutation. Hermes agents are
autonomous in reasoning, delegation and artifact generation. Growth OS remains
the only autonomous execution boundary for public mutations, and only after
policy, caps, freshness, quality, anti-rework, snapshot, smoke, rollback and
outcome gates pass.

### Autonomy Levels

| Level | Name | Agent Can Do | Agent Cannot Do |
|---|---|---|---|
| A0 | Read-only | Read context, summarize, recommend. | Create artifacts, candidates or wakeups. |
| A1 | Advisory | Create recommendations and Chief of Staff actions. | Create executable work. |
| A2 | Artifact autonomy | Create lane artifacts and task sessions. | Publish/apply/merge public surfaces. |
| A3 | Work-prep autonomy | Materialize valid artifacts into candidates/work items. | Bypass Growth OS gates or mutate production directly. |
| A4 | Live-gated execution | Request executor to run allowed action classes. | Execute outside `content_publish`, `safe_apply`, `transcreation_merge`. |

For #482 and this 9/10 layer, Hermes lane agents may reach **A2/A3**. The
Growth OS executor owns **A4**. Sensitive surfaces remain **A0/block**:

- paid media mutations;
- pricing;
- availability;
- reservations;
- payments;
- bulk CRM;
- outreach;
- experiment activation unless a future explicitly approved spec changes it.

### Isolation Dimensions

Every task session must enforce all dimensions below:

| Dimension | Rule | Evidence |
|---|---|---|
| Tenant isolation | Agent context is limited to one `account_id` + `website_id`. | Tenant scope check + RLS + manifest refs. |
| Lane isolation | Agent sees lane-owned or explicitly global-safe skills/memories only. | Manifest injected/excluded lists. |
| Tool isolation | Agent can call only `toolset_allowlist` tools for that instance. | Manifest toolset + bridge enforcement. |
| Budget isolation | Agent consumes only its instance budget and concurrency lease. | Budget snapshot + cost ledger. |
| Model isolation | Agent uses its configured model unless an approved policy override exists. | Manifest `model_provider/model_name`. |
| Memory isolation | Agent cannot cite memories not injected in the manifest. | Artifact citation validator. |
| Skill isolation | Agent cannot cite skills not injected in the manifest. | Artifact citation validator. |
| Execution isolation | One lane failure cannot fail unrelated lane sessions. | Task session status + isolated retry. |
| Mutation isolation | Hermes cannot mutate public/sensitive tables directly. | Bridge writable table allowlist + executor-only jobs. |

### Agent Autonomy Boundaries By Role

| Agent | Autonomous Scope | Required Isolation |
|---|---|---|
| Chief of Staff | Briefings, recommendations, action routing, delegation. | May read global operating memory but must cite facts from Growth OS ledgers. |
| Content Writer | Content briefs/articles, topic framing, editorial quality suggestions. | May use content skills/memories; cannot use technical/transcreation-only memories unless global-safe. |
| Content Editor/Curator | Quality review, thin-content rejection, brand/tone checks. | May approve artifact quality; cannot publish directly. |
| Technical Remediation | Safe SEO patches, smoke plans, rollback expectations. | May use technical skills/memories only; cannot change pricing/booking/payment/availability fields. |
| Transcreation | Locale payloads, glossary/TM use, quality checks. | May use locale/glossary memories; cannot merge directly. |
| Outcome Analyst | Evaluate won/lost/inconclusive and propose learning. | May read outcomes across lanes but cannot activate learning without admin/replay gate. |

### Hard Invariants

These are non-negotiable production rules:

- No Hermes task runs without `agent_instance_id`.
- No Hermes task runs without a persisted context manifest.
- No artifact can cite a memory/skill absent from that manifest.
- No artifact can request a tool absent from the agent instance allowlist.
- No artifact can request a sensitive action class.
- No agent instance can override `immutable_safety_bounds`.
- No chat or Hermes sidecar can write public website/content/SEO production rows directly.
- No cross-tenant context read may return partial data; it must fail closed.
- No learning item becomes active without approval and replay agreement when applicable.
- No production mutation is certified without snapshot, smoke, rollback payload and outcome.

## Non-Goals

- Do not let Hermes mutate public website tables directly.
- Do not replace Growth OS executor.
- Do not migrate Growth OS work queue into Hermes Kanban.
- Do not auto-activate skills/memories without replay or admin approval.
- Do not allow skills/memories to override safety-critical policies.
- Do not add multi-tenant rollout beyond ColombiaTours in this phase.

## Architecture

### Agent Instance Contract

Each enabled agent instance must have:

- `agent_instance_id`
- `agent_type`
- `lane`
- `model_provider`
- `model_name`
- `max_cost_daily_usd`
- `max_cost_weekly_usd`
- `concurrency_limit`
- `toolset_allowlist`
- `active_skill_ids`
- `active_memory_ids`
- `confidence_threshold`
- `quality_threshold`
- `immutable_safety_bounds`

Safety-critical bounds are inherited from `growth_agent_types` and policies. They are visible in UI but not editable.

### Context Manifest

Add a durable per-task manifest, either as a new table or as a normalized ledger if the implementation proves existing columns are enough.

Preferred table:

```text
growth_agent_context_manifests
```

Fields:

- `id`
- `account_id`
- `website_id`
- `agent_instance_id`
- `task_session_id`
- `lane`
- `context_snapshot_id`
- `model_provider`
- `model_name`
- `toolset_allowed[]`
- `skill_ids_injected[]`
- `memory_ids_injected[]`
- `global_memory_ids_injected[]`
- `excluded_skill_ids[]`
- `excluded_memory_ids[]`
- `provider_source_refs[]`
- `outcome_refs[]`
- `policy_refs[]`
- `prompt_injection_scan`
- `context_hash`
- `prompt_hash`
- `token_estimate`
- `budget_snapshot`
- `created_at`

If no new table is created, the same payload must be persisted in `growth_agent_task_sessions.session_state.context_manifest`.

### Context Builder

Create strict mode:

```ts
buildGrowthAgentContext({
  accountId,
  websiteId,
  agentInstanceId,
  lane,
  strictAgentIsolation: true
})
```

Rules:

- Load only active skills from `active_skill_ids`.
- Load only active memories from `active_memory_ids`.
- Load lane defaults only when the agent instance explicitly allows inheritance.
- Load global memories only when `scope='global'`, `status='active'`, `cross_lane_safe=true` and prompt-injection scan passes.
- Exclude draft/rejected/deprecated skills and memories.
- Exclude any memory/skill from another tenant.
- Record every excluded item with reason.
- Refuse to build a mutable task context if prompt-injection scan blocks any injected source.

### Hermes Sidecar Enforcement

Hermes sidecar must receive:

- `agent_instance_id`
- `context_manifest_id`
- `allowed_tools`
- `model_provider`
- `model_name`
- `budget_snapshot`
- `skill_ids`
- `memory_ids`

The sidecar may return artifacts only through the existing bridge:

- `create_agent_artifact`
- `request_materialization`
- `complete_task_session`

The bridge must reject artifact creation when:

- `agent_instance_id` is missing for lane work;
- the artifact cites skill/memory IDs not present in the manifest;
- action class is sensitive;
- tenant scope mismatches;
- toolset requested is outside the allowlist.

### Learning Loop

Learning becomes agent-specific:

```text
outcome evaluated
-> learning candidate
-> replay case
-> proposed memory/skill
-> assigned to agent instance or lane
-> admin approves
-> strict context manifest injects it
-> next task cites it
-> outcome evaluator measures if behavior improved
```

Rules:

- Skill activation still requires replay agreement `>=0.90`.
- Memory activation requires reusable fact, not session log text.
- Lost outcomes create negative memories that block repeat patterns until evidence changes.
- Won outcomes can create scale suggestions, not duplicate action repeats.
- Every cited learning item must be visible in UI with the reason it influenced the task.

## User Flows

### Flow 1: CEO Audits An Agent

1. CEO opens Growth OS Agents.
2. Selects `content_writer`.
3. Sees active skills, active memories, inherited global memories, toolset, budget and model.
4. Opens latest task session.
5. Sees context manifest: injected, excluded and blocked context.
6. Opens artifact and sees the same memory/skill IDs cited.

Success: CEO can answer "what did this agent know when it made this recommendation?"

### Flow 2: Admin Edits Agent Knowledge

1. Admin opens an agent instance.
2. Adds/removes active memories or skills from the instance.
3. UI shows replay agreement and safety gates.
4. Admin saves.
5. Next sidecar task uses the new manifest.

Success: no code deploy is required to change non-safety operating knowledge.

### Flow 3: Cross-Lane Contamination Is Blocked

1. A transcreation-only memory exists.
2. `technical_remediation` starts a task.
3. Context builder excludes that memory.
4. Manifest records exclusion reason.
5. Test proves technical artifact cannot cite that memory.

Success: each agent has its own memory boundary.

### Flow 4: Learning Changes Behavior

1. Outcome marks a content pattern `lost`.
2. System proposes a negative memory for `content_writer`.
3. Admin approves it after replay agreement.
4. Next content decision avoids the same topic/slug pattern and cites the memory.
5. Audit view shows previous action, memory, changed behavior and new result window.

Success: learning is operational, not decorative.

## UI Requirements

### Agents

Add an agent detail surface:

- active skills
- active memories
- inherited global memories
- excluded context from last run
- model/provider
- cost budget
- toolset allowlist
- safety bounds
- last context manifest
- last artifact
- pause/resume
- invoke isolated dry-run context

### Chief of Staff

When answering about agent behavior, show citations:

- `growth_agent_context_manifests:<id>`
- `growth_agent_task_sessions:<id>`
- `growth_agent_artifacts:<id>`
- `growth_agent_memories:<id>`
- `growth_agent_skills:<id>`
- `growth_work_item_outcomes:<id>`

### Workboard

Artifact-linked work items must show:

- owner agent instance
- context manifest
- memory/skill influence
- excluded context warnings
- artifact validation status

### Certification/Audit

Add or extend an audit panel showing:

- `certified`
- `measuring`
- `blocked`
- `failed`
- context leakage failures
- agent learning impact
- direct mutation boundary proof

## Data And Security

- Runtime and sidecar writes remain service-role only.
- Authenticated users receive tenant-scoped reads through server actions.
- RLS uses `user_roles`.
- Cross-tenant context build must fail.
- Agent instance edits require `council_admin`.
- Skill/memory approval requires `curator` or stricter lane role.
- Toolset and safety bounds cannot expose paid/pricing/payments/reservations/availability/bulk CRM/outreach mutation tools.

## Acceptance Criteria

- [ ] Every Hermes lane task has `agent_instance_id`.
- [ ] Every Hermes lane task has a persisted context manifest.
- [ ] Manifest lists injected skills, injected memories, excluded items and policy refs.
- [ ] Manifest declares autonomy level `A0` to `A4` and the executor boundary for the task.
- [ ] Manifest declares tenant, lane, toolset, budget, model, memory and skill isolation status.
- [ ] Artifacts cannot cite skills/memories absent from their manifest.
- [ ] Artifacts cannot request tools absent from the agent instance allowlist.
- [ ] Artifacts cannot request action classes above the agent's autonomy level.
- [ ] Context builder blocks cross-tenant and cross-lane memory leakage.
- [ ] Agent UI can edit model, budget, cadence, active skills and active memories.
- [ ] Safety-critical bounds are visible but immutable.
- [ ] UI shows each agent's autonomy level and isolation status.
- [ ] Skill activation still blocks replay `<0.90`.
- [ ] Learning loop proves `outcome -> approved memory/skill -> later task cites it`.
- [ ] At least one later decision changes behavior because of a cited learning item.
- [ ] Content, technical and transcreation agents each run with distinct manifests.
- [ ] A lane failure is isolated and does not fail unrelated lane task sessions.
- [ ] Production certification shows 0 direct Hermes mutations and 0 context leakage.

## Test Plan

### Unit

- Context builder includes only active instance skills/memories.
- Context builder excludes cross-lane memories unless global-safe.
- Prompt-injection scan blocks contaminated memory/skill/provider text.
- Artifact bridge rejects citations outside the manifest.
- Artifact bridge rejects missing `agent_instance_id`.
- Skill activation blocks replay `<0.90`.
- Lost outcome memory blocks repeated action keys.

### Integration

- Agent instance edit -> next context manifest changes.
- Hermes sidecar -> strict manifest -> artifact -> candidate -> work item.
- Content artifact cites content skills only.
- Technical artifact cites technical skills only.
- Transcreation artifact cites transcreation skills only.
- Cross-tenant context request fails.
- One lane failure does not affect other lane sessions.
- Outcome lost -> memory approved -> next task avoids repeat.

### E2E Session Pool

- Agents UI opens agent detail and shows active skills/memories.
- Admin edits agent active memory and sees next manifest include it.
- Low replay skill activation is blocked in UI.
- Chief of Staff answers "why did this agent do that?" with manifest citations.
- Workboard artifact detail shows owner agent, manifest and learning influence.
- Mobile views have no horizontal overflow.

### Production Certification

For ColombiaTours:

- 1 `content_writer` task with manifest and content artifact.
- 1 `technical_remediation` task with manifest and safe apply artifact.
- 1 `transcreation` task with manifest and transcreation artifact.
- 1 cross-lane memory leakage attempt blocked.
- 1 cross-tenant context request blocked.
- 1 learning item changes later behavior and is cited.
- 1 live-gated executor job proves mutation boundary still holds.
- 24h monitor shows no stuck wakeups, cycles or task sessions caused by strict isolation.

## Implementation Slices

1. [#495](https://github.com/weppa-cloud/bukeer-studio/issues/495) - Context manifest contract and migration.
2. [#496](https://github.com/weppa-cloud/bukeer-studio/issues/496) - Strict agent context builder.
3. [#497](https://github.com/weppa-cloud/bukeer-studio/issues/497) - Hermes sidecar manifest enforcement.
4. [#498](https://github.com/weppa-cloud/bukeer-studio/issues/498) - Agent UI knowledge editor and manifest detail.
5. [#499](https://github.com/weppa-cloud/bukeer-studio/issues/499) - Learning assignment to agent instances.
6. [#500](https://github.com/weppa-cloud/bukeer-studio/issues/500) - Artifact/workboard manifest lineage.
7. [#501](https://github.com/weppa-cloud/bukeer-studio/issues/501) - Tests and production certification.

## Open Risks

- Too much context isolation can reduce agent quality if shared business memory is over-blocked.
- Global memories need strict review, otherwise they become a backdoor for cross-lane contamination.
- Agent editability can become unsafe if model/tool choices bypass policy.
- Certification requires real production sidecar runs; dry-run evidence is insufficient.
