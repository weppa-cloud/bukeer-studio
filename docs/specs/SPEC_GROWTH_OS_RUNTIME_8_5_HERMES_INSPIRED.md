# SPEC: Growth OS Runtime 8.5 — Hermes-Inspired Execution And Learning

Status: Accepted implementation scope for EPIC #310 / Symphony Runtime  
Tenant baseline: ColombiaTours (`colombiatours.travel`)  
Created: 2026-05-03  
Owner: Growth OS Orchestrator + Studio Platform  
Canonical execution: [#310](https://github.com/weppa-cloud/bukeer-studio/issues/310)  
Related: [SPEC_GROWTH_OS_SYMPHONY_ORCHESTRATOR](./SPEC_GROWTH_OS_SYMPHONY_ORCHESTRATOR.md), [SPEC_GROWTH_OS_AGENT_MODEL_AND_WORKFLOW_REGISTRY](./SPEC_GROWTH_OS_AGENT_MODEL_AND_WORKFLOW_REGISTRY.md), [SPEC_GROWTH_OS_AGENT_LANES](./SPEC_GROWTH_OS_AGENT_LANES.md), [SPEC_GROWTH_OS_CONTROL_PLANE_UX](./SPEC_GROWTH_OS_CONTROL_PLANE_UX.md), [SPEC_GROWTH_OS_SSOT_MODEL](./SPEC_GROWTH_OS_SSOT_MODEL.md)

## Purpose

Raise the Growth OS Symphony runtime from the current `7/10` operational base
to an `8.5/10` runtime by adopting the useful runtime patterns from
Hermes Agent without replacing the Bukeer control plane.

Official rule:

```text
Hermes inspires how execution learns.
Bukeer Growth OS defines what is allowed, what is measured and who approves.
```

External reference: [NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent).
The relevant ideas are persistent execution, skills, memory, toolsets,
scheduled/background work, terminal backends and a closed learning loop.

## Runtime 8.5 Scorecard

| Capability         | Current                     | Target 8.5 requirement                                                    |
| ------------------ | --------------------------- | ------------------------------------------------------------------------- |
| Persistent runtime | VPS + Docker + polling      | Codex executor runs per claimed row and survives restarts.                |
| Agent execution    | Observe-only handoff        | `codex exec` produces structured artifacts for each lane.                 |
| Memory             | Context pack only           | Approved lane memories influence future prompts.                          |
| Skills             | Static workflow files       | Versioned lane skills with draft/active/deprecated lifecycle.             |
| Tool governance    | Policy docs + gate scaffold | Append-only tool call ledger with approval, cost and result.              |
| Eval/replay        | Agreement scaffold          | Replay cases with expected decisions and lane agreement.                  |
| Learning loop      | Manual issue comments       | AI proposes memories/skill updates; Curator approves.                     |
| UI                 | Agent/Review surfaces       | Studio shows memory, skills, tool calls, replay health and runtime score. |
| Safety             | Human/Council policy        | Policy enforced on tool calls, memory writes and skill activation.        |

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

1. **Scorecard + Benchmark** — publish runtime 8.5 matrix and pass/fail report.
2. **Codex Executor Adapter** — implement `codex exec` task runner and artifact parser.
3. **Memory + Skill Learning Loop** — store approved memories and active lane skills.
4. **Tool Gateway + Permission Ledger** — record every tool call and enforce policy.
5. **Replay/Eval Harness** — replay 30-50 historical cases and compute lane agreement.
6. **Observability + Failure Ops** — metrics, retries, stalls, errors, cost and alerts.
7. **Studio UI 8.5 Surfaces** — show memory, skills, tool calls, replay health and score.

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
- #310 remains `PASS-WITH-WATCH` until #312/#313/#322/#336 close their gates.

## Test Plan

- `node --check scripts/growth/*.mjs`
- `npx tsc --noEmit --pretty false`
- Growth OS UI E2E via session pool.
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
