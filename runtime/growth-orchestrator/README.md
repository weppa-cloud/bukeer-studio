# Growth Orchestrator Runtime

This package contains the executable Growth OS runtime for EPIC #310.

Canonical code lives here:

```text
runtime/growth-orchestrator/
├── bin/
│   ├── deploy-vps.sh
│   └── run.mjs
├── fixtures/
├── skills/
└── src/
    ├── codex-executor.mjs
    ├── memory.mjs
    ├── metrics.mjs
    ├── orchestrator.mjs
    ├── replay.mjs
    ├── skills.mjs
    ├── tool-gateway.mjs
    └── toolsets.mjs
```

Compatibility wrappers remain in `scripts/growth/` because existing runbooks,
Docker commands and issue references already call those paths.

Runtime responsibilities:

- claim eligible `growth_agent_runs` rows through Supabase;
- load lane registry, workflow and active context pack;
- execute Codex through `codex exec`;
- write structured artifacts, events and AI review evidence;
- best-effort write tool calls, replay candidates and metrics when the SSOT
  migrations exist;
- force every v1 run into `review_required`.

The runtime must never publish content, merge transcreation, mutate paid media,
activate experiments or activate memory/skills without the Bukeer Growth OS
human/Council gates.
