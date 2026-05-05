# SPEC: Growth OS Runtime Maturity Score 8.5 → 9/10 — Hermes-Inspired Execution And Learning

Status: Accepted maturity target for EPIC #310 / Symphony Runtime; 9/10 addendum in progress
Tenant baseline: ColombiaTours (`colombiatours.travel`)
Created: 2026-05-03
Updated: 2026-05-04
Owner: Growth OS Orchestrator + Studio Platform
Canonical execution: [#310](https://github.com/weppa-cloud/bukeer-studio/issues/310)
Related: [SPEC_GROWTH_OS_SYMPHONY_ORCHESTRATOR](./SPEC_GROWTH_OS_SYMPHONY_ORCHESTRATOR.md), [SPEC_GROWTH_OS_AGENT_MODEL_AND_WORKFLOW_REGISTRY](./SPEC_GROWTH_OS_AGENT_MODEL_AND_WORKFLOW_REGISTRY.md), [SPEC_GROWTH_OS_AGENT_LANES](./SPEC_GROWTH_OS_AGENT_LANES.md), [SPEC_GROWTH_OS_CONTROL_PLANE_UX](./SPEC_GROWTH_OS_CONTROL_PLANE_UX.md), [SPEC_GROWTH_OS_SSOT_MODEL](./SPEC_GROWTH_OS_SSOT_MODEL.md)

## Purpose

Raise the Growth OS Symphony runtime from the current `7/10` operational base
to a `8.5/10` maturity score by adopting the useful runtime patterns from
Hermes Agent without replacing the Bukeer control plane. In this SPEC, `8.5`
is a benchmark score, not a runtime version or product name.

Naming convention:

```text
System: Bukeer Growth OS Runtime
Benchmark reference: Hermes-inspired runtime capabilities
Metric: Growth OS Runtime Maturity Score
Current estimate: 7.0/10
Target: 8.5/10 base; 9.0/10 active-learning operating target
```

Official rule:

```text
Hermes inspires how execution learns.
Bukeer Growth OS defines what is allowed, what is measured and who approves.
```

External reference: [NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent).
The relevant ideas are persistent execution, skills, memory, toolsets,
scheduled/background work, terminal backends and a closed learning loop.

## Autonomous Workboard v2 Addendum

The next maturity slice moves the runtime from deterministic task workflows to
capability-driven work items:

- `task_type` and `change_type` remain reporting labels; they do not decide the
  execution flow.
- The runtime decides execution from intent, lane capabilities, active skills,
  tool policy, evidence, language, risk and dependencies.
- `growth_work_items` is the generic Hermes-inspired contract for autonomous
  work. It links existing backlog rows, runs and change sets without replacing
  them.
- Internal actions may advance without human approval when policy allows:
  `observe`, `prepare`, `route`, `split`, `follow_up_backlog_create` and
  `research_packet`.
- Sensitive actions remain risk-gated and ledgered: `content_publish`,
  `transcreation_merge`, `paid_mutation`, `experiment_activation` and
  `outreach_send`.
- The operating target is 95% autonomous internal work and 5% human
  intervention on high-risk or public-impact decisions.
- For ColombiaTours, every artifact should include a Spanish `operator_summary`
  written for a non-technical marketing operator.

The UI surface for this slice is the Growth OS Workboard: a human work center
with triage, ready, running, blocked, review-needed, auto-completed,
published/applied and archived columns. Review Queue remains the audit surface;
Workboard is the daily operating surface.

## Runtime 9/10 Addendum

The 9/10 slice does not mean the runtime can publish or mutate production
growth channels by itself. It means the system can learn from approved work,
use that learning in later executions, explain its maturity score and give
humans clear controls for blocked, approved, applied and published states.

Implemented contract:

- Codex executor prompts now receive approved lane memories, active lane skills,
  lane replay agreement and the lane toolset before producing the artifact.
- Runtime evidence records which memory/skill context was loaded and the
  current lane agreement used for the decision.
- Data Health calculates a `Runtime Maturity Score` out of 9 with component
  bars for executor artifacts, learning loop, replay/eval, tool gateway,
  observability, human governance and production apply readiness.
- Workboard columns use horizontal scrolling with wider cards so operators can
  read fewer columns at a time instead of seeing compressed cards.
- Stale `running` or `claimed` work older than one hour is surfaced as blocked,
  with an operator action to mark those runs `stalled` and record a runtime
  failure event.
- Curator+ users can approve eligible low-risk review cards in batch only when
  they already have a run, change set, no blocked tool calls and no blocked
  autonomy label.
- Run detail supports human closeout actions: mark an approved change set as
  `applied`, then Council-admin can mark applied work as `published`.

Safety boundary:

- The `published` closeout button records the Growth OS state after a human or
  dedicated workflow completes the public action. It does not publish content,
  merge translations, mutate paid media or activate experiments.
- `content_publish`, `transcreation_merge`, `paid_mutation` and
  `experiment_activation` remain blocked from generic runtime automation and
  require their dedicated human/Council workflow.

9/10 operational evidence threshold:

| Evidence area   | Required before claiming 9/10 operational maturity                     |
| --------------- | ---------------------------------------------------------------------- |
| Real execution  | 25 production runs across lanes with valid artifacts and AI reviews.   |
| Learning        | At least 5 approved active memories and 3 active skills used in runs.  |
| Replay/eval     | 50 active replay cases with lane agreement visible in Data Health.     |
| Tool governance | 100% runtime tool attempts recorded in the append-only ledger.         |
| Blocked ops     | Stale runs are triaged to `stalled` with failure events and evidence.  |
| Human closeout  | At least one approved low-risk technical change is applied and smoked. |
| Safety          | Zero content, transcreation, paid or experiment mutations bypass gate. |

## Runtime Maturity Scorecard

| Capability         | 8.5 target                                                                | 9/10 addendum target                                                      |
| ------------------ | ------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Persistent runtime | Codex executor runs per claimed row and survives restarts.                | Stale execution detection, `stalled` closeout and health evidence.        |
| Agent execution    | `codex exec` produces structured artifacts for each lane.                 | Artifacts cite active memory/skill context and lane agreement.            |
| Memory             | Approved lane memories influence future prompts.                          | Active memories are injected into later runs and tracked in evidence.     |
| Skills             | Versioned lane skills with draft/active/deprecated lifecycle.             | Active skills are injected per lane with capability-specific guidance.    |
| Tool governance    | Append-only tool call ledger with approval, cost and result.              | Toolset context is prompt-visible; ledger coverage must reach 100%.       |
| Eval/replay        | Replay cases with expected decisions and lane agreement.                  | Lane agreement is part of the execution prompt and Data Health score.     |
| Learning loop      | AI proposes memories/skill updates; Curator approves.                     | Approved learning materially changes subsequent prompt context.           |
| UI                 | Studio shows memory, skills, tool calls, replay health and runtime score. | Workboard supports readable columns, blocked debugging and bulk approval. |
| Human closeout     | Human review gates unsafe outputs.                                        | UI records approved -> applied -> published closeout with role gates.     |
| Safety             | Policy enforced on tool calls, memory writes and skill activation.        | Generic runtime still cannot publish, merge translations or mutate spend. |

Target state:

```text
growth_agent_runs -> codex exec -> structured artifact
  -> AI review -> human review -> approved memory/skill update
  -> next run improved
```

## Data Model

Existing tables remain:

- `growth_agent_definitions`
- `growth_agent_context_packs`
- `growth_agent_runs`
- `growth_agent_run_events`
- `growth_ai_reviews`
- `growth_human_reviews`

New Flutter/SSOT migrations:

| Table                       | Purpose                                                                    |
| --------------------------- | -------------------------------------------------------------------------- |
| `growth_work_items`         | Generic autonomous work contract driven by capabilities, policy and risk.  |
| `growth_agent_memories`     | Approved tenant/lane procedural or decision memory.                        |
| `growth_agent_skills`       | Versioned lane skills with `draft`, `active` or `deprecated` status.       |
| `growth_agent_tool_calls`   | Append-only tool gateway ledger: policy, approval, budget, cost, result.   |
| `growth_agent_replay_cases` | Historical eval/replay cases with expected decision and lane.              |
| `growth_agent_run_metrics`  | Runtime metrics: duration, tokens, cost, exit code, retries, completeness. |

No table may store secrets, raw provider payloads, PII or unapproved content
publish state. GitHub stores aggregate evidence only.

## Executor Contract

The runtime claims an eligible row, resolves agent registry + workflow +
context pack, then calls Codex in the isolated run workspace.

Minimum run output:

```json
{
  "decision": "promote|watch|block|reject|review_required",
  "allowed_action": "auto_apply|prepare_for_human|watch|block|reject",
  "confidence": 0.0,
  "source_refs": [],
  "evidence_summary": "",
  "risks": [],
  "next_action": "",
  "memory_candidates": [],
  "skill_update_candidates": [],
  "requires_human_review": true
}
```

Default safety:

- all runs end in `review_required` until lane replay agreement is `>= 0.90`;
- content publish, transcreation merge, paid mutation and experiment activation
  are always human/Curator/Council gated;
- proposed memories and skill updates are candidates, never active without
  Curator/Orchestrator approval.

## Implementation Workstreams

1. **Scorecard + Benchmark** — publish the maturity matrix and pass/fail report for reaching `8.5/10`, then 9/10.
2. **Codex Executor Adapter** — implement `codex exec` task runner and artifact parser.
3. **Memory + Skill Learning Loop** — store approved memories and active lane skills.
4. **Tool Gateway + Permission Ledger** — record every tool call and enforce policy.
5. **Replay/Eval Harness** — replay 30-50 historical cases and compute lane agreement.
6. **Observability + Failure Ops** — metrics, retries, stalls, errors, cost and alerts.
7. **Studio UI Maturity Surfaces** — show memory, skills, tool calls, replay health and score.

## Acceptance Criteria

- Codex CLI is installed and logged in on the VPS runtime.
- One claimed run per canonical lane executes through `codex exec`.
- Five artifacts are valid against the executor contract.
- Five AI reviews are created; unsafe outputs also create human-review handoff.
- Zero automatic content, transcreation, paid or experiment mutations occur.
- Tool calls are recorded in an append-only ledger.
- Replay harness reports agreement globally and by lane.
- Studio Review Queue displays decision, evidence, risks, memory candidates,
  skill candidates and required human action.
- Data Health displays the calculated Runtime Maturity Score out of 9 and the
  component breakdown.
- Workboard supports low-risk batch approval and stale-runtime stalled
  closeout without granting publish, paid, transcreation or experiment powers.
- Run detail lets humans record approved work as applied/published with role
  gates and evidence, while public mutation remains external/dedicated.
- #310 remains `PASS-WITH-WATCH` until #312/#313/#322/#336 close their gates.

## Test Plan

- `node --check scripts/growth/*.mjs`
- `node --check runtime/growth-orchestrator/src/*.mjs`
- `npx tsc --noEmit --pretty false`
- `npm exec -- prettier --check docs/INDEX.md docs/specs/SPEC_GROWTH_OS_RUNTIME_8_5_HERMES_INSPIRED.md`
- Growth OS UI E2E via session pool.
- Workboard UI smoke:
  - columns are horizontally scrollable and readable on narrow viewports;
  - low-risk batch approval only includes eligible review cards;
  - stale running/claimed items move to `stalled` with event evidence.
- Run detail smoke:
  - Curator can mark approved work as applied;
  - Council-admin can mark applied work as published;
  - always-gated change types cannot be published through generic closeout.
- Data Health smoke:
  - runtime score renders out of 9;
  - maturity breakdown bars render from executor, learning, replay, tool,
    observability, governance and apply signals.
- VPS smoke:
  - `codex login status` returns `Logged in using ChatGPT`;
  - config smoke passes for five lanes;
  - one real run per lane creates artifact, event and review.
- Replay:
  - no active lane below `0.90` can auto-apply;
  - no always-gated action bypasses Curator/Council;
  - disagreement report lists prompt/context gaps.

## Assumptions

- Hermes is a reference pattern, not a replacement dependency.
- Codex CLI remains the executor for v1.
- Supabase/Bukeer Studio remains the operational SSOT.
- GitHub/#310 remains implementation SSOT.
- Shared schema changes originate in `bukeer-flutter`.
