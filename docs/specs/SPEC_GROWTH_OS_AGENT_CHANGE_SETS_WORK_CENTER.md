# SPEC: Growth OS Agent Change Sets And Work Center

Status: Draft implementable for EPIC #310 / Runtime maturity score target
Tenant baseline: ColombiaTours (`colombiatours.travel`)
Created: 2026-05-03
Owner: Growth OS Orchestrator + Studio Product + Curator
Canonical execution: [#310](https://github.com/weppa-cloud/bukeer-studio/issues/310)
Related: [SPEC_GROWTH_OS_SYMPHONY_ORCHESTRATOR](./SPEC_GROWTH_OS_SYMPHONY_ORCHESTRATOR.md), [SPEC_GROWTH_OS_AGENT_LANES](./SPEC_GROWTH_OS_AGENT_LANES.md), [SPEC_GROWTH_OS_CONTROL_PLANE_UX](./SPEC_GROWTH_OS_CONTROL_PLANE_UX.md), [SPEC_GROWTH_OS_RUNTIME_8_5_HERMES_INSPIRED](./SPEC_GROWTH_OS_RUNTIME_8_5_HERMES_INSPIRED.md)

## Purpose

Define the Growth OS Apply Layer: every agent run must produce a tenant-scoped
change set that describes what the agent created, changed, blocked, learned or
handed off. Bukeer Studio must present those change sets as a marketing Work
Center, not as a technical run table.

Official model:

```text
high-output agents, human-governed publishing
```

Agents do high-output work: research, draft, compare, fix, prepare previews,
create follow-up tasks and record evidence. Humans govern the moment when work
becomes public, paid, merged, sent or activated.

## Core Decisions

| Decision                       | Rule                                                                 |
| ------------------------------ | -------------------------------------------------------------------- |
| Few durable agents             | Use the canonical Growth OS lanes; do not create one agent per task. |
| Capability catalog per lane    | Each lane owns many task types through change-set capabilities.      |
| Change set per run             | Every run creates at least one reviewable work product.              |
| Human-governed publishing      | Publish, merge, paid mutation and experiment activation stay gated.  |
| Work Center instead of run log | UI prioritizes work products, previews, evidence and decisions.      |

## End-To-End Flow

```text
backlog item
  -> lane assignment
  -> growth_agent_runs claim
  -> Codex execution
  -> structured artifact
  -> growth_agent_change_sets
  -> preview / diff / evidence in Work Center
  -> approve / reject / request changes
  -> optional follow-up backlog task
  -> publish / merge / activate only when required gate passes
```

If the agent cannot safely produce a draft, it must create a `blocked` or
`research_packet` change set with clear evidence and next action.

## Data Contract

Proposed shared table: `growth_agent_change_sets`.

| Field                     | Purpose                                                                                                                      |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `id`                      | Change set id.                                                                                                               |
| `account_id`              | Tenant scope. Required.                                                                                                      |
| `website_id`              | Website scope. Required.                                                                                                     |
| `run_id`                  | FK to `growth_agent_runs`. Required.                                                                                         |
| `source_table`            | Source backlog/content/profile table.                                                                                        |
| `source_id`               | Source row id.                                                                                                               |
| `agent_lane`              | Canonical lane.                                                                                                              |
| `change_type`             | Capability type, for example `blog_draft_create`.                                                                            |
| `status`                  | `proposed`, `draft_created`, `needs_review`, `changes_requested`, `approved`, `applied`, `published`, `rejected`, `blocked`. |
| `title`                   | Human-readable title in operator language.                                                                                   |
| `summary`                 | What changed and why it matters.                                                                                             |
| `before_snapshot`         | Structured previous state when available.                                                                                    |
| `after_snapshot`          | Structured proposed state or created draft.                                                                                  |
| `preview_payload`         | UI-ready preview for text, SEO, route, locale, experiment or task.                                                           |
| `evidence`                | Source refs, risks, tool verdicts, metrics and assumptions.                                                                  |
| `risk_level`              | `low`, `medium`, `high`, `blocked`.                                                                                          |
| `requires_human_review`   | Human decision requirement.                                                                                                  |
| `required_approval_role`  | `growth_operator`, `curator`, `council_admin` or `technical_owner`.                                                          |
| `parent_change_set_id`    | Optional chain from prior output.                                                                                            |
| `created_backlog_item_id` | Optional follow-up task created from this work.                                                                              |
| `approved_by/at`          | Human approval metadata.                                                                                                     |
| `applied_by/at`           | Apply metadata when a draft is written to an operational table.                                                              |
| `published_by/at`         | Public publish metadata. Only human/Council-gated.                                                                           |

## Contract-First Closure

This SPEC cannot move to implementation until the shared contract, migration and
authorization rules exist. These are required, not optional follow-ups.

### Zod Schema

Add `packages/website-contract/src/schemas/growth-agent-change-sets.ts` and
export it from `packages/website-contract/src/index.ts`.

Minimum schemas:

- `GrowthAgentChangeSetStatusSchema`;
- `GrowthAgentChangeTypeSchema`;
- `GrowthAgentChangeSetRiskLevelSchema`;
- `GrowthAgentChangeSetApprovalRoleSchema`;
- `GrowthAgentChangeSetPreviewPayloadSchema`;
- `GrowthAgentChangeSetEvidenceSchema`;
- `GrowthAgentChangeSetSchema`;
- `GrowthAgentChangeSetInsertSchema`;
- `GrowthAgentChangeSetUpdateSchema`.

The schema must validate:

- `account_id`, `website_id` and `run_id` as UUIDs;
- `agent_lane` using the existing `AgentLaneSchema`;
- `status`, `change_type`, `risk_level` and `required_approval_role` as enums;
- `before_snapshot`, `after_snapshot`, `preview_payload` and `evidence` as
  typed objects, not unbounded raw provider payloads;
- `requires_human_review = true` for content, transcreation, paid, experiment
  and outreach families;
- `published_at` cannot be present unless `status = published`;
- `applied_at` cannot be present unless `status IN ('applied', 'published')`.

### Supabase Migration And RLS

Add a Flutter/SSOT-traced migration for `growth_agent_change_sets`.

Required DB rules:

- `account_id` and `website_id` are `NOT NULL`;
- FK `run_id -> growth_agent_runs(run_id)`;
- FK `parent_change_set_id -> growth_agent_change_sets(id)` nullable;
- status/check constraints match the Zod enums;
- index `(account_id, website_id, status, agent_lane)`;
- index `(run_id)`;
- index `(source_table, source_id)`;
- deterministic unique key for dedupe:
  `(account_id, website_id, run_id, change_type, dedupe_key)`;
- RLS enforces tenant scope for reads;
- writes are server-side only through approved runtime/service paths;
- no UPDATE may bypass role checks for approve, apply, publish or reject;
- public publish, paid mutation, transcreation merge and experiment activation
  remain blocked unless their explicit Curator/Council gate writes an
  append-only review.

### Server Actions And Authorization

Implement Work Center mutations as Server Actions, not client-side direct DB
writes.

Required actions:

- `approveChangeSet(changeSetId, reason)`;
- `rejectChangeSet(changeSetId, reason)`;
- `requestChangeSetChanges(changeSetId, instructions, targetLane)`;
- `applyApprovedChangeSet(changeSetId)`;
- `approveLearningCandidate(changeSetId, candidateId)`;
- `approvePublishPacket(changeSetId)`;
- `approveExperimentPacket(changeSetId)`.

Each action must:

- load the change set by `account_id + website_id`;
- verify the current user role against `required_approval_role`;
- reject stale transitions from already terminal states;
- write `growth_human_reviews` append-only;
- write `growth_agent_run_events` append-only where relevant;
- preserve the old state if apply fails;
- never call paid providers, publish content, merge transcreation or activate
  experiments unless the matching gate action is explicitly invoked by an
  authorized role.

### Deterministic Dedupe Key

Every change set insert must include a deterministic `dedupe_key`.

Default formula:

```text
sha256(account_id + website_id + run_id + change_type + normalized_source_ref + normalized_after_snapshot)
```

For human-authored follow-up tasks, include the parent change set id:

```text
sha256(parent_change_set_id + target_lane + normalized_instructions)
```

### Non-Public Draft Targets

The first implementation slice must define safe draft targets before any apply
button ships.

| Change type            | Safe target requirement                                                                  |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| `blog_draft_create`    | Write only to a non-public draft table/status with no sitemap, route or public exposure. |
| `seo_title_meta_draft` | Write only to reviewable SEO draft metadata, not public page metadata directly.          |
| `content_update_draft` | Store before/after proposed copy without changing published content.                     |
| `transcreation_*`      | Store localized draft without hreflang/sitemap exposure.                                 |
| `experiment_*`         | Store Council packet only; activation remains a separate Council action.                 |
| `paid_*` if introduced | Store proposal only; no provider mutation from render/UI paths.                          |

### UI Implementation Rules

The Work Center must reuse existing Growth console layout and local UI
primitives. Do not introduce a parallel design system.

Required implementation patterns:

- Server Components for read-heavy pages;
- Server Actions for mutations;
- URL params for filters where possible;
- existing `components/ui/*` primitives before new controls;
- lucide icons for tool/action buttons;
- stable card/action dimensions to prevent layout shift;
- centralized copy helpers for Spanish beta labels and future localization;
- raw JSON only in collapsed technical detail sections.

## Artifact Contract

Each Codex artifact must include `change_sets`:

```json
{
  "change_sets": [
    {
      "change_type": "blog_draft_create",
      "title": "Crear borrador de blog sobre viajes a Cartagena",
      "summary": "Borrador listo para revisar por marketing.",
      "status": "draft_created",
      "risk_level": "medium",
      "requires_human_review": true,
      "required_approval_role": "curator",
      "before_snapshot": {},
      "after_snapshot": {},
      "preview_payload": {},
      "evidence": {
        "source_refs": [],
        "risks": [],
        "tool_verdicts": []
      },
      "follow_up_tasks": []
    }
  ]
}
```

The existing runtime fields remain valid: `decision`, `allowed_action`,
`confidence`, `memory_candidates`, `skill_update_candidates`, `tool_calls`,
`replay_seed` and metrics.

## Agent Capability Matrix

| Lane                    | Capabilities                                                                                                                                                               |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Orchestrator            | `backlog_route_update`, `backlog_task_split`, `follow_up_backlog_create`, `council_packet_prepare`, `governance_block`, `growth_cycle_summary`.                            |
| Technical Remediation   | `seo_title_meta_draft`, `seo_indexing_draft`, `route_mapping_draft`, `internal_link_draft`, `performance_remediation_task`, `technical_smoke_result`.                      |
| Content Creator         | `blog_draft_create`, `content_update_draft`, `content_brief_create`, `faq_schema_draft`, `landing_section_copy_draft`, `content_evidence_request`.                         |
| Transcreation           | `transcreation_draft_create`, `transcreation_update_draft`, `locale_seo_review`, `translation_quality_fix_draft`, `locale_serp_packet`, `transcreation_merge_readiness`.   |
| Content Curator/Council | `content_quality_review`, `creator_revision_request`, `publish_packet_prepare`, `experiment_candidate_prepare`, `experiment_readout_prepare`, `learning_candidate_review`. |
| Tool Gateway/Learning   | `tool_policy_verdict`, `blocked_tool_call_evidence`, `replay_case_candidate`, `memory_candidate`, `skill_update_candidate`.                                                |

## Work Center UI

| Surface           | Operator question                               | Required experience                                                     |
| ----------------- | ----------------------------------------------- | ----------------------------------------------------------------------- |
| Command Center    | What needs attention now?                       | Prioritized work cards, blockers, agent activity and review load.       |
| Agent Team        | What can each agent do and what did it produce? | Lane cards with capability catalog, tools, permissions and recent work. |
| Work Queue        | What work is ready, in progress or blocked?     | Kanban/list by lane, status, priority and human owner.                  |
| Review Desk       | What must I approve or reject?                  | Change-set preview, evidence, risks, before/after and actions.          |
| Change Set Detail | What exactly will change?                       | Human summary, preview, diff, source refs, tool verdicts and timeline.  |
| Data Health       | Can I trust this run and its evidence?          | Runtime health, stalls, cost, freshness, eval agreement and failures.   |

Review Desk copy must be Spanish-first and marketing-friendly for beta
operators. Technical detail belongs in collapsed "detalle tecnico" sections.

## UI Flow Contract

| Flow                        | Entry point         | Primary UI object | Required actions                                             | Terminal states                                      |
| --------------------------- | ------------------- | ----------------- | ------------------------------------------------------------ | ---------------------------------------------------- |
| Discover work               | Command Center      | Work card         | Open task, filter by lane/status/risk, jump to Review Desk.  | Viewed, assigned, blocked.                           |
| Inspect agent capability    | Agent Team          | Lane card         | View tools, permissions, active skills, memory, recent runs. | No mutation.                                         |
| Execute backlog task        | Work Queue          | Backlog item      | Assign lane, approve for execution, view latest run.         | Queued, running, blocked, review required.           |
| Review produced work        | Review Desk         | Change set card   | Approve, reject, request changes, create follow-up task.     | Approved, rejected, changes requested, blocked.      |
| Inspect exact change        | Change Set Detail   | Preview/diff      | Compare before/after, inspect evidence, expand JSON.         | Same as parent change set.                           |
| Apply safe draft            | Change Set Detail   | Safe draft        | Apply to non-public draft target after approval.             | Applied, needs publish approval, failed with reason. |
| Publish/merge/activate gate | Review Desk/Council | Gate packet       | Curator/Council approval only.                               | Published, merged, activated, rejected, blocked.     |
| Chain next work             | Review Desk         | Follow-up task    | Create task for same or different lane.                      | New backlog item linked to parent change set.        |
| Learn from run              | Review Desk         | Memory/skill card | Approve/reject one candidate at a time.                      | Active, rejected, deprecated.                        |
| Evaluate runtime health     | Data Health         | Health panel      | Inspect stalls, failures, blocked tools, costs, agreement.   | No mutation.                                         |

## UI States

| State             | UI behavior                                                                 |
| ----------------- | --------------------------------------------------------------------------- |
| Empty             | Explain what is missing and the next safe operational step.                 |
| Loading           | Stable skeletons; no layout shift in cards, filters or action bars.         |
| Partial data      | Show available preview/evidence and mark missing pieces explicitly.         |
| Invalid artifact  | Show "No se pudo leer el resultado" with recovery action and raw detail.    |
| Blocked by policy | Show the human reason, required role and blocked tool verdict.              |
| Permission denied | Hide unsafe actions or render disabled buttons with role requirement.       |
| Concurrent update | Refresh state and show that another reviewer already acted.                 |
| Apply failure     | Preserve approval decision, show failure class and create follow-up option. |
| Tenant mismatch   | Render not found/forbidden; no cross-tenant leakage.                        |

## Role-Based UI Matrix

| Role              | Can view | Can execute | Can approve drafts | Can publish/merge | Can approve paid/experiments | Can approve learning |
| ----------------- | -------- | ----------- | ------------------ | ----------------- | ---------------------------- | -------------------- |
| `viewer`          | Yes      | No          | No                 | No                | No                           | No                   |
| `growth_operator` | Yes      | Yes         | Low-risk ops only  | No                | No                           | No                   |
| `curator`         | Yes      | Yes         | Content/locale     | Content/locale    | No                           | Yes                  |
| `technical_owner` | Yes      | Yes         | Technical drafts   | Technical only    | No                           | No                   |
| `council_admin`   | Yes      | Yes         | Council packets    | Exceptions only   | Yes                          | Yes                  |

The ColombiaTours beta partner user `consultoria@weppa.co` must be tested with
the role actually provisioned in Supabase. The E2E suite must fail loudly if the
role fixtures do not allow testing approvals.

## Preview Requirements

| Change family         | Preview requirement                                                       |
| --------------------- | ------------------------------------------------------------------------- |
| Blog/content draft    | Rendered article preview, title/meta, slug, excerpt, CTA and source refs. |
| SEO metadata          | Google-style snippet preview plus before/after title/meta.                |
| Page/section copy     | Section preview with before/after copy and affected route.                |
| Transcreation         | Source/target comparison, locale notes and publish readiness.             |
| Technical remediation | Before/after status, route, canonical/hreflang/sitemap impact.            |
| Experiment/Council    | Hypothesis card, baseline, metric, owner and evaluation date.             |
| Learning update       | Memory/skill text, scope, reason and expected effect.                     |

## Governance Rules

- Content publish is always Curator-gated.
- Transcreation merge and sitemap/hreflang exposure are always Curator-gated.
- Paid mutation is always Council-gated.
- Experiment activation is always Council-gated.
- Outreach send is always Curator-gated.
- Creator cannot approve its own draft.
- Technical `auto_apply_safe` remains future-only and requires lane agreement
  `>= 0.90`, current policy version, smoke pass and tenant kill switch.
- Every human approval/rejection writes `growth_human_reviews` append-only.
- Every tool attempt writes `growth_agent_tool_calls` append-only.

## Chained Work

A change set can create a follow-up backlog item when the output of one agent
becomes input for another.

Examples:

- Creator creates `blog_draft_create` -> Curator receives
  `content_quality_review`.
- Curator requests changes -> Creator receives `creator_revision_request`.
- Technical agent finds missing copy -> Creator receives
  `content_evidence_request`.
- Transcreation creates draft -> Curator receives
  `transcreation_merge_readiness`.
- Council approves experiment candidate -> Orchestrator creates operational
  execution tasks.

Chained tasks must preserve `parent_backlog_item_id`, `parent_change_set_id`,
`source_run_id`, `created_by_agent_lane`, required approval role and reason for
the next task.

## E2E Coverage Matrix

All E2E tests must run through `npm run session:run -- --grep "@growth-os-ui"`
or a narrower grep using the same session-pool wrapper. Agents must not run a
direct dev server or direct Playwright command.

| Area                  | Required tests                                                                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Navigation            | `@work-center-nav`, `@work-center-empty`, `@work-center-filtering`, `@tenant-scope`, `@responsive-work-center`.                                                     |
| Change-set previews   | `@preview-blog`, `@preview-seo`, `@preview-content-diff`, `@preview-locale`, `@preview-technical`, `@preview-experiment`, `@preview-learning`, `@invalid-artifact`. |
| Human decisions       | `@approve-change-set`, `@reject-change-set`, `@request-changes`, `@apply-safe-draft`, `@concurrent-review`.                                                         |
| Permissions           | `@permission-viewer`, `@permission-curator`, `@permission-council`.                                                                                                 |
| Governance and safety | `@block-publish-gate`, `@block-locale-merge`, `@block-paid-mutation`, `@block-experiment`, `@tool-verdicts`, `@safe-apply-threshold`.                               |
| Agent/runtime health  | `@agent-capabilities`, `@agent-recent-work`, `@runtime-health`, `@replay-agreement`, `@learning-loop`.                                                              |
| Beta smoke            | `@colombiatours-smoke`, `@two-tasks-per-lane`, `@real-run-trace`, `@no-public-mutations`.                                                                           |

## E2E Fixture Requirements

The E2E suite needs deterministic, tenant-scoped and disposable fixtures for:

- one change set per preview family;
- one approved, rejected, blocked, applied and changes-requested change set;
- one invalid artifact;
- one pending memory candidate and one pending skill candidate;
- one blocked paid mutation and one blocked experiment activation;
- one viewer user and one Curator/Council-capable user;
- one cross-tenant record that must never render for ColombiaTours;
- one stale runtime health case and one healthy case.

## E2E Evidence Requirements

Every beta-readiness run must produce:

- Playwright HTML report from the session pool;
- screenshots for Command Center, Work Queue, Review Desk, Change Set Detail,
  Agent Team and Data Health;
- DB assertion summary: counts for runs, change sets, human reviews, tool calls
  and follow-up backlog tasks;
- mutation safety summary proving zero unintended public publish, paid mutation,
  transcreation merge or experiment activation;
- list of skipped tests with reason. Skipping role-gated approval tests because
  fixtures are missing is not acceptable for beta readiness.

## Implementation Slices

1. **Schema + Contract**
   - Add `growth_agent_change_sets`.
   - Add `growth-agent-change-sets.ts` Zod schemas in
     `@bukeer/website-contract`.
   - Add migration, indexes, RLS, constraints and deterministic `dedupe_key`.
   - Extend Codex artifact contract with `change_sets`.

2. **Runtime Writer**
   - Persist change sets during artifact creation.
   - Ensure every run has at least one change set.
   - Mark run incomplete if no valid change set exists.

3. **First Appliers**
   - `blog_draft_create`: create safe non-public blog/content draft.
   - `seo_title_meta_draft`: create reviewable title/meta draft.
   - `content_quality_review`: approve/reject/request changes.

4. **Work Center UI**
   - Replace technical-first runs table with work cards and Review Desk.
   - Show previews, diffs, evidence, risks and action buttons per change set.
   - Keep raw artifact details collapsed.
   - Reuse existing Growth layout, `components/ui/*`, lucide icons and
     centralized Spanish copy helpers.

5. **Chained Tasks**
   - Allow approved/rejected/request-changes decisions to create new backlog
     items for the same or another lane.
   - Link parent/child work in UI.

6. **Full E2E And Production Smoke**
   - Seed at least two tasks per lane for ColombiaTours.
   - Execute runs, verify change sets, previews and human decisions.
   - Confirm zero unintended public/publish/paid/experiment mutations.

## Acceptance Criteria

- Every `growth_agent_runs` row that reaches `review_required`, `completed` or
  `blocked` has at least one linked `growth_agent_change_sets` row.
- `growth_agent_change_sets` has Zod schemas, migration, RLS, indexes,
  constraints and deterministic dedupe before runtime/UI implementation starts.
- Review Desk can show what the agent produced in Spanish without reading raw
  JSON.
- A marketing operator can approve, reject or request changes per change set.
- Approving a draft can apply it only to a safe non-public target unless the
  required publish/merge/paid/experiment gate also passes.
- A change set can create a follow-up backlog task for another agent.
- Agent Team shows the full action catalog per lane, not only one task per
  agent.
- Two real tasks per lane can be executed for ColombiaTours with traceability:
  run -> artifact -> change set -> review -> optional follow-up task.
- E2E covers every UI flow in the matrix before the feature is beta-ready.

## Test Plan

- `node --check scripts/growth/*.mjs runtime/growth-orchestrator/src/*.mjs`
- `npx tsc --noEmit --pretty false`
- `git diff --check`
- `GROWTH_OS_UI_E2E_ENABLED=true npm run session:run -- --grep "@growth-os-ui"`
- Runtime smoke for ColombiaTours:
  - at least two runs per canonical lane;
  - every run has valid change sets;
  - Review Desk shows previews and decisions;
  - approval writes `growth_human_reviews`;
  - no automatic content publish, paid mutation, transcreation merge or
    experiment activation.
