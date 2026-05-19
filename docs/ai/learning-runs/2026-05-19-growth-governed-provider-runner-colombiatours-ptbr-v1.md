# Learning Run — Growth Governed Provider Runner ColombiaTours pt-BR v1

Pipeline: `growth-governed-provider-runner-colombiatours-ptbr-v1`
Outcome: `PASS_CONTRACT_READY_NO_PROVIDER_CALLS`

## What changed

Added a governed provider-runner dry-run/read-only module that separates provider evidence normalization from DB writes and publishing.

## Reusable lessons

1. The provider-runner should not be the writer. It should emit candidates and require a controlled write gate.
2. Exact locale/market and policy consent must be hard gates before candidate construction.
3. Rate limits belong in the contract, not only in external schedulers.
4. The next architectural slice should add a real adapter behind the same dry-run interface, not bypass the contract.

## Validations

- 29/29 focused tests passed.
- Typecheck passed.
- AI sync passed.
- Supabase canary confirmed policy/fresh refs environment.
