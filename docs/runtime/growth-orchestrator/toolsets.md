# Toolsets

Toolsets define which tools a lane may use and which action classes are always
blocked.

Code:

```text
runtime/growth-orchestrator/src/toolsets.mjs
runtime/growth-orchestrator/src/tool-gateway.mjs
```

Every lane may use `codex_exec` for analysis and artifact generation. The
runtime records tool calls in the artifact and, when migrations exist, in
`growth_agent_tool_calls`.

Always-gated action classes:

- `content_publish`
- `transcreation_merge`
- `paid_mutation`
- `experiment_activation`

These remain blocked regardless of model confidence, replay agreement or lane.
