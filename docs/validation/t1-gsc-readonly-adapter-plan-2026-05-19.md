# T1 — GSC Read-only Adapter Plan Gate

Sprint: `growth-provider-adapter-gsc-readonly-colombiatours-ptbr`
Status: `PASS_PLAN_GATE`

## Preflight

- Repo branch: `feat/growth-source-truth-colombiatours-ptbr`.
- Previous HEAD: `aea29aa4`.
- GSC sites available:
  - `https://colombiatours.travel/` with `siteOwner`.
  - `sc-domain:colombiatours.travel` with `siteFullUser`.
- Real GSC read-only canary returned rows for `/tour-colombia-10-dias`.

## Policy finding

Current production policy table has manual/operator policy only. There is no persisted `gsc/search_console_page_query` policy yet. This sprint therefore implements the adapter and validates real read-only source access, but does not write a GSC policy or facts.
