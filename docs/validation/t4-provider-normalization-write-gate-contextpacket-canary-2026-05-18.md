# T4 — ContextPacket Canary After Write

Sprint: `growth-provider-normalization-colombiatours-ptbr-write-gate-slice1`
Tenant: ColombiaTours
Website: `894545b7-73ca-4dae-b76a-da5b6a3f8441`
Entity: `/tour-colombia-10-dias`
Target: `pt-BR/BR`
Scope: one-entity production DML only; no provider calls, no publish, no mass transcreation.

Status: `PASS_WITH_WATCH_ONE_ENTITY`

Resolver result for `growth_signal_facts:87c3fa60-8930-497e-b767-cef7f541a308`:

```json
{
  "status": "VERIFIED_FACT_REF",
  "freshness_status": "fresh",
  "policy_status": "allowed",
  "locale_market_status": "exact",
  "usable": true,
  "reasons": ["verified_fact_ref"]
}
```

Context log:

- `growth_context_packet_log.id`: `1dd79ba7-44c8-4908-9922-a6ecb760f2aa`
- verdict: `PASS_WITH_WATCH`
- reason: single entity only, manual operator seed requires more facts before mass transcreation.
