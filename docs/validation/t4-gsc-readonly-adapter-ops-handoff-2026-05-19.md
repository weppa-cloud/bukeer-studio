# T4 — GSC Read-only Adapter Ops Handoff

Sprint: `growth-provider-adapter-gsc-readonly-colombiatours-ptbr`
Status: `PASS_NO_WRITE_NO_PUBLISH`

## Ready

- Pure adapter implemented.
- Focused tests pass.
- Real GSC source canary verified.

## Still blocked for write gate

- No `gsc/search_console_page_query` provider policy row exists for ColombiaTours `pt-BR/BR`.

## Next sprint

`growth-provider-policy-gsc-colombiatours-ptbr-write-gate`

Scope:

1. Insert/update one explicit GSC provider policy for ColombiaTours `pt-BR/BR`.
2. Re-run adapter with real GSC rows.
3. Write 1–3 governed GSC facts/source_refs only after policy gate passes.
