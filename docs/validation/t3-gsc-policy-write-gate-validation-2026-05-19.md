# T3 — GSC Policy Write Gate Validation

Sprint: `growth-provider-policy-gsc-colombiatours-ptbr-write-gate`
Verdict: `PASS_WITH_WATCH_GSC_ONE_ENTITY`

## SQL validation

Validated joined chain:

- policy enabled: true
- consent granted: true
- data usage policy: `store_normalized`
- rate limit daily: 10
- profile_run provider: `gsc`
- provider_family: `first_party`
- run status: `completed`
- row_count: 10
- fact source: `gsc`
- signal_type: `gsc_page_query_performance`
- entity_path: `/tour-colombia-10-dias`
- locale/market: `pt-BR/BR`
- metrics: clicks 0, impressions 17, query_count 10, weighted_position 76.94117647058823
- source_ref freshness: `fresh`
- profile_has_fact: true
- context verdict: `PASS_WITH_WATCH`

## Resolver canary

Input source ref:

```text
growth_signal_facts:4e7796ab-7d90-4f64-b06b-a07a52647e9c
```

Output:

```json
{
  "status": "VERIFIED_FACT_REF",
  "freshness_status": "fresh",
  "policy_status": "allowed",
  "locale_market_status": "exact",
  "usable": true
}
```

## Repo validation

```bash
npm run test -- --testPathPattern="gsc-readonly-adapter|governed-provider-runner|provider-normalization-slice|source-truth-normalizer|source-ref-resolver" --no-coverage --runInBand
NODE_OPTIONS="--max-old-space-size=4096" npm run typecheck
npm run ai:check
```

Result:

- 5 suites PASS
- 34 tests PASS
- typecheck PASS
- ai:check PASS
