# Data Contract

Existing runtime tables:

- `growth_agent_definitions`
- `growth_agent_context_packs`
- `growth_agent_runs`
- `growth_agent_run_events`
- `growth_ai_reviews`
- `growth_human_reviews`

Runtime 8.5 tables written best-effort until Flutter/SSOT migrations exist:

- `growth_agent_memories`
- `growth_agent_skills`
- `growth_agent_tool_calls`
- `growth_agent_replay_cases`
- `growth_agent_run_metrics`

Minimum Codex output:

```json
{
  "decision": "review_required",
  "allowed_action": "prepare_for_human",
  "confidence": 0,
  "source_refs": [],
  "evidence_summary": "",
  "risks": [],
  "next_action": "",
  "memory_candidates": [],
  "skill_update_candidates": [],
  "tool_calls": [],
  "replay_seed": {
    "eligible": false,
    "expected_decision": "review_required",
    "rationale": ""
  },
  "requires_human_review": true
}
```

Local fixture:

```text
runtime/growth-orchestrator/fixtures/smoke-run.json
```
