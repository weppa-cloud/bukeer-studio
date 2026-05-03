# Safety And Governance

The runtime is prepare-only until replay/eval gates prove otherwise.

Always gated action classes:

- content publish
- transcreation merge
- paid mutation
- experiment activation

The source of truth for these classes is
`runtime/growth-orchestrator/src/toolsets.mjs`.

Memory and skill learning is proposal-only:

- Codex may produce `memory_candidates`.
- Codex may produce `skill_update_candidates`.
- Curator/Orchestrator approval is required before activation.

Default run outcome:

```text
review_required
```

No lane can enable `auto_apply_safe` until replay agreement is at least `0.90`,
and always-gated action classes remain human/Council gated regardless of score.
