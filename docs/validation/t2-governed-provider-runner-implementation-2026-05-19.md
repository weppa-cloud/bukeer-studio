# T2 — Governed Provider Runner Implementation

Sprint: `growth-governed-provider-runner-colombiatours-ptbr-v1`
Status: `PASS_IMPLEMENTED`

## Files

- `lib/growth/agentic/governed-provider-runner.ts`
- `__tests__/lib/growth/agentic/governed-provider-runner.test.ts`

## Behavior

The runner creates normalized candidates only when all gates pass. It blocks disabled policies, implicit locale/market fallback, missing evidence and rate-limit overrun.

## Negative guarantees

- `can_call_provider=false`
- `can_write_database=false`
- `can_publish=false`
