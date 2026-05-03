# Architecture

The runtime is the execution plane for Growth OS agent work. It does not own
Growth state. Supabase/Bukeer Studio is the operational SSOT, and GitHub is the
implementation SSOT.

Code layout:

```text
runtime/growth-orchestrator/
├── bin/run.mjs                 # executable entrypoint
├── bin/deploy-vps.sh           # release-by-SHA deploy script
├── src/orchestrator.mjs        # claim, registry/context load, event writes
├── src/codex-executor.mjs      # codex exec adapter and artifact envelope
├── src/toolsets.mjs            # lane-level tool permissions
├── src/tool-gateway.mjs        # policy verdicts for tool calls
├── src/memory.mjs              # memory candidate normalization
├── src/skills.mjs              # skill update candidate normalization
├── src/replay.mjs              # replay seed construction
└── src/metrics.mjs             # failure and completeness helpers
```

Compatibility wrappers:

```text
scripts/growth/run-growth-symphony-orchestrator.mjs
scripts/growth/run-codex-agent-task.mjs
scripts/growth/deploy-runtime-vps.sh
```

Execution flow:

```text
growth_agent_runs claim
  -> load growth_agent_definitions
  -> load growth_agent_context_packs
  -> load lane workflow
  -> codex exec
  -> structured artifact
  -> growth_agent_run_events
  -> growth_ai_reviews
  -> review_required
```

The canonical five lanes are `orchestrator`, `technical_remediation`,
`transcreation`, `content_creator` and `content_curator`.
