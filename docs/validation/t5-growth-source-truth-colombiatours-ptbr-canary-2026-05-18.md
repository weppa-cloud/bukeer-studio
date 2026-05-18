# T5 — ColombiaTours pt-BR ContextPacket Readiness Canary

Status: `PASS_BLOCKED_WITH_PRECISE_DATA_NEED`
Date: `2026-05-18`
Sprint: `growth-source-truth-colombiatours-ptbr`
Task: `t_2c32b057`
Tenant: ColombiaTours
Website ID: `894545b7-73ca-4dae-b76a-da5b6a3f8441`
Route: `es-CO/CO → pt-BR/BR`
Mode: dry-run / no publish

## Verdict

`PASS_BLOCKED_WITH_PRECISE_DATA_NEED`

The canary should not generate an autonomous ContextPacket for ColombiaTours `pt-BR/BR` yet. This is the expected safe outcome.

## Why this is a pass

The sprint objective is not to force transcreation. The objective is to replace vague blocking with a precise source-truth reason. T5 confirms the reason is now explicit:

```text
BLOCKED_WITH_PRECISE_DATA_NEED:
provider/live/cache source_refs exist in profile runs, but no verified mapping exists to growth_signal_facts.id or growth_source_refs for pt-BR/BR.
```

## Readiness gates

- Locale/market exactness: `BLOCKED` for autonomous target because no `pt-BR/BR` facts/source refs exist.
- Source refs: `BLOCKED`, `growth_source_refs` total is 0.
- Fact refs: `BLOCKED`, no `growth_signal_facts:<id>` refs for `pt-BR/BR`.
- Freshness: `BLOCKED`, there are no eligible target facts/source refs to evaluate.
- Policy: `PASS`, no evidence of policy allowing workers to bypass source truth.
- Provider access: `PASS`, no provider calls made.
- Publish/transcreation: `PASS`, no publish and no mass transcreation.

## Canary input evidence

From T4 read-only audit:

```json
{
  "growth_source_refs_total": 0,
  "colombiatours_source_refs": 0,
  "colombiatours_ptbr_source_refs": 0,
  "colombiatours_ptbr_profiles": 6,
  "colombiatours_ptbr_profiles_without_source_signal_fact_ids": 6,
  "colombiatours_ptbr_facts": 0,
  "colombiatours_esco_facts": 4355
}
```

## Expected ContextPacket behavior

A ContextPacket builder/worker must return a blocked gate, not a usable autonomous packet:

```json
{
  "tenant": "ColombiaTours",
  "website_id": "894545b7-73ca-4dae-b76a-da5b6a3f8441",
  "source_locale": "es-CO",
  "source_market": "CO",
  "target_locale": "pt-BR",
  "target_market": "BR",
  "mode": "dry-run",
  "ready_for_autonomous_context": false,
  "verdict": "BLOCKED_WITH_PRECISE_DATA_NEED",
  "blockers": [
    "growth_source_refs has 0 verified refs for ColombiaTours pt-BR/BR",
    "pt-BR/BR has 6 profiles and 6 lack source_signal_fact_ids",
    "pt-BR/BR has 0 normalized growth_signal_facts",
    "profile_run source_refs are provider/live/cache lineage, not fact-level refs"
  ]
}
```

## Decision

Do not publish. Do not run mass transcreation. Do not backfill from provider/cache refs.

The next safe expansion is a governed provider-runner/normalizer slice that creates verified `growth_signal_facts` and candidate `growth_source_refs` for one bounded ColombiaTours `pt-BR/BR` entity.
