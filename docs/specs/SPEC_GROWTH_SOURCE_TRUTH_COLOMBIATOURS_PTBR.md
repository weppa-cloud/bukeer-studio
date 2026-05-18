# SPEC — Growth Source Truth Sprint: ColombiaTours pt-BR/BR

Status: `PASS_SPEC_READY`
Date: `2026-05-18T20:17:09Z`
Owner: Bukeer Studio Growth OS
Sprint: `growth-source-truth-colombiatours-ptbr`
Pilot tenant: ColombiaTours
Website ID: `894545b7-73ca-4dae-b76a-da5b6a3f8441`

## 1. Objective

Move Growth Agents from “control plane exists” to “one governed ColombiaTours pt-BR/BR ContextPacket can be evaluated against verified source truth”.

Target lane:

```text
provider-runner governed slice
→ provider/raw cache
→ normalizer
→ growth_signal_facts
→ growth_source_refs
→ ContextPacket
→ canary dry-run
```

The sprint does **not** publish content and does **not** unlock mass transcreation. The sprint only proves whether the system can produce fact-level traceability for one bounded `es-CO → pt-BR/BR` canary.

## 2. Current baseline

Control plane is installed in Supabase production via migration:

```text
20260518193555_growth_control_plane_governance_tables_prod_compat_20260518
```

Validated tables:

- `growth_account_plans`
- `growth_capabilities`
- `growth_provider_policies`
- `growth_agent_definitions`
- `growth_source_refs`
- `growth_context_packet_log`

Current ColombiaTours data blocker:

- `growth_source_refs`: empty for ColombiaTours.
- `pt-BR/BR` facts: `0`.
- `pt-BR/BR` profiles missing refs: `6/6`.
- Prior `growth_profile_runs.source_refs` are provider/cache strings, not verified `growth_signal_facts.id` references.

## 3. Non-negotiable guardrails

1. No transcreation worker calls providers directly.
2. No implicit `es-CO/CO` fallback.
3. Locale/market rule:

```text
exact match → explicit allowed fallback → BLOCKED
```

4. No invented `source_refs`.
5. Provider/cache refs are not fact-level refs until mapped to a verified `growth_signal_facts.id` or approved external ref.
6. QA/data-audit workers cannot read `.env`, service-role keys, temp key files, or print secret fragments.
7. No mass transcreation.
8. No publish.
9. No real backfill until T4 proves a safe mapping.
10. Any live provider call requires provider policy, cost/rate gate, tenant scope, and explicit runner isolation.

## 4. Data contract

### 4.1 Source fact

A fact is autonomous-agent usable only if it has:

- tenant/website scope,
- exact `locale`,
- exact `market`,
- source/provider lineage,
- observed/extracted timestamp,
- freshness state,
- confidence/severity or metric payload,
- stable ID in `growth_signal_facts` or equivalent approved fact table.

### 4.2 Source ref

A source ref is usable only if it points to verifiable evidence:

```ts
type UsableSourceRef =
  | { ref_type: 'growth_signal_fact'; ref_id: string; verified: true }
  | { ref_type: 'external_provider_artifact'; uri: string; checksum?: string; verified: true };
```

Blocked examples:

- `dataforseo:cache:...` with no fact mapping.
- `gsc:query:...` with no normalized fact row.
- raw JSON path with no checksum/freshness.
- profile text copied without lineage.

## 5. Provider-runner/normalizer design

### Phase A — dry-run resolver

Inputs:

- existing profiles/runs,
- provider/cache source strings,
- candidate `growth_signal_facts`,
- target locale/market `pt-BR/BR`,
- source locale/market `es-CO/CO`,
- provider policy rows.

Outputs:

- candidate mappings,
- rejected mappings with reason,
- required facts still missing,
- no DB writes.

### Phase B — bounded write candidate

Only after T3/T4 pass:

- write at most one entity slice,
- populate `growth_source_refs`,
- log ContextPacket attempt in `growth_context_packet_log`,
- preserve rollback SQL/evidence.

Phase B is **not** automatically authorized by this SPEC. It needs a later operator gate if T4 says the mapping is safe.

## 6. Acceptance criteria

### T0 SPEC

- This document exists.
- `docs/INDEX.md` references it.
- Verdict: `PASS_SPEC_READY`.

### T1 PLAN GATE

Must validate:

- provider-runner is separate from transcreation worker,
- no secret exposure path,
- no fallback locale/market,
- no real backfill unless mapping is proven,
- dry-run first.

### T2 IMPLEMENT

Must add minimal dry-run implementation and tests for:

- source ref classification,
- candidate fact mapping,
- freshness status,
- exact locale/market blocking,
- blocked provider/cache-only refs,
- no DB write/provider call side effects.

Required validation:

```bash
npm ci # if dependencies missing
NODE_OPTIONS="--max-old-space-size=4096" npm run typecheck
npm run ai:check
npm run test -- --testPathPattern="source|growth" --no-coverage --runInBand
```

### T3 CODE/DATA GATE

Must confirm:

- code path is dry-run by default,
- idempotent,
- no provider calls,
- no prod writes,
- no secrets,
- source ref semantics compatible with production schema.

### T4 DATA AUDIT DRY-RUN

Must answer:

- Can existing provider/cache refs be mapped to `growth_signal_facts.id`?
- Are there any verified `pt-BR/BR` facts?
- What exact `DATA_NEED` remains?

Allowed verdicts:

- `PASS_READY_FOR_CANARY`
- `PASS_WITH_DATA_NEED`

### T5 CANARY DRY-RUN

Run one conceptual/bounded ContextPacket readiness check:

```text
source: es-CO/CO
target: pt-BR/BR
entity: 1 page/product
mode: dry-run
publish: false
provider_calls: false
```

Allowed verdicts:

- `PASS_READY_FOR_HUMAN_REVIEW`
- `PASS_BLOCKED_WITH_PRECISE_DATA_NEED`

### T6 OPS HANDOFF

Must produce expansion checklist:

- safe next runs,
- remaining blockers,
- provider/cost gates,
- rollback notes,
- no-publish guardrails.

### T7 LEARNING

Must materialize:

- learning run,
- `docs/ai/learning-runs/index.jsonl`,
- `docs/INDEX.md`,
- fact/skill patch candidates if durable.

## 7. Done definition

Sprint is done when the system can say one of these with evidence:

```text
ColombiaTours pt-BR/BR ContextPacket readiness = READY_FOR_HUMAN_REVIEW
```

or:

```text
ColombiaTours pt-BR/BR ContextPacket readiness = BLOCKED_WITH_PRECISE_DATA_NEED
```

A generic `BLOCKED` is not enough. The output must name the exact missing facts/source refs/freshness/policy rows.

## 8. Operator note

T0 was materialized by Neo/operator after the first `tech-validator` run hit model output truncation while preparing the SPEC. This is an allowed recovery pattern: compact operator gate with file evidence, Kanban trace, and no writes/providers/secrets.
