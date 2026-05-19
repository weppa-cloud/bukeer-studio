# T4 — GSC Policy Write Gate Ops Handoff

Sprint: `growth-provider-policy-gsc-colombiatours-ptbr-write-gate`

## Current state

One first-party GSC chain is available for ColombiaTours `pt-BR/BR`:

```text
GSC Search Analytics evidence
→ GSC provider policy
→ growth_profile_runs
→ growth_signal_facts
→ growth_source_refs
→ growth_profiles.source_signal_fact_ids
→ growth_context_packet_log
```

IDs:

- policy: `b109b76c-52dc-4d82-b4c8-068542f86103`
- profile_run: `ad8ac930-4142-4e30-b6aa-aefcdddd6514`
- fact: `4e7796ab-7d90-4f64-b06b-a07a52647e9c`
- source_ref: `6729d4b3-5e83-44c6-a2c4-079c29626906`
- context_packet_log: `26280335-cfab-4fec-92ef-87f8ddb16564`

## Status

`PASS_WITH_WATCH_GSC_ONE_ENTITY`

This is not autonomous publish readiness. It only proves that real first-party GSC evidence can be normalized and linked into the governed ContextPacket chain.

## Next safe step

Run a simulated worker ContextPacket flow for a SEO/content agent using this fact and the existing manual/operator facts. The worker must consume only governed ContextPacket data and produce a recommendation, not a publication.
