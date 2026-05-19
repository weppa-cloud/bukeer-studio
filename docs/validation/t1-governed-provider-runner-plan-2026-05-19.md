# T1 — Governed Provider Runner Plan Gate

Sprint: `growth-governed-provider-runner-colombiatours-ptbr-v1`
Status: `PASS_PLAN_GATE`

## Preflight

- Branch before implementation: `16b800d3`.
- Existing source-truth chains: 6 fresh refs in `pt-BR/BR` watch mode.
- Existing allowed policy: manual/operator source-truth write gate, `store_normalized`, enabled, consented.

## Decision

Implement a dry-run/read-only governed provider-runner contract first. Do not call DataForSEO/GSC/GA4 yet. The next step can wire a real provider adapter once this contract is stable.
