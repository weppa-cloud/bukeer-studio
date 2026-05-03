# Memory

Memory is separate from context packs.

Context packs are tenant configuration. Memory is approved learning produced by
runtime experience and stored in `growth_agent_memories`.

Current v1 rule:

- Codex may propose `memory_candidates`.
- The runtime stores candidates in the artifact and run evidence.
- Curator/Orchestrator approval is required before a memory becomes active.

Code:

```text
runtime/growth-orchestrator/src/memory.mjs
runtime/growth-orchestrator/src/skills.mjs
```

Skills follow the same pattern: proposed updates are candidates until approved.
