# T1 — Plan: Growth Agent Flow + Context Contract

## DAG
1. Contract module: `worker-contextpacket-contract.ts`.
2. Agent simulation: `growth-agent-flow-simulation.ts`.
3. Expand GSC source-truth write gate for 3 entities.
4. Control plane UI: Data Health provider policies.
5. DataForSEO adapter: cached/read-only, no provider calls.
6. Tests/typecheck/AI sync.

## Guardrails
- Supabase is SSOT.
- Agents consume ContextPacket only.
- Provider adapters are pure transformers.
- No provider credentials in workers.
- No publish or mass transcreation.
