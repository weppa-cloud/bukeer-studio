# T2 — GSC Read-only Adapter Implementation

Sprint: `growth-provider-adapter-gsc-readonly-colombiatours-ptbr`
Status: `PASS_IMPLEMENTED`

## Behavior

`buildGscReadonlyEvidenceRows(input)` groups GSC `page,query` rows by canonical product path, computes totals and top queries, and emits provider evidence rows.

`buildGscReadonlyAdapterDryRun(input)` passes those evidence rows to `buildGovernedProviderRunnerDryRun` using:

- provider: `gsc`
- provider_profile_type: `search_console_page_query`
- source: `gsc_search_analytics`

## Guardrails

- Adapter has no network call. Real GSC fetching stays outside this pure adapter.
- Adapter has no DB write.
- Adapter has no publish path.
- Runner blocks without explicit GSC policy.
