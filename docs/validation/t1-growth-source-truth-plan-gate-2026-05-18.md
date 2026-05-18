# Validation: T1 PLAN GATE — ColombiaTours pt-BR Source Truth Sprint

**Date:** 2026-05-18T20:20:00Z
**Validator:** tech-validator
**Task:** t_70a71dfd
**SPEC:** [SPEC_GROWTH_SOURCE_TRUTH_COLOMBIATOURS_PTBR.md](../specs/SPEC_GROWTH_SOURCE_TRUTH_COLOMBIATOURS_PTBR.md)
**Parent:** t_d6d7e96b (completed, PASS_SPEC_READY)
**Base:** feat/growth-control-plane-phase3-db-staging @ 9408f419
**Tenant:** ColombiaTours (website_id: 894545b7-73ca-4dae-b76a-da5b6a3f8441)

---

## Diff scope

Only 2 documentation files changed in commit eaed9297:

```
docs/INDEX.md                                          |   1 +
docs/specs/SPEC_GROWTH_SOURCE_TRUTH_COLOMBIATOURS_PTBR.md | 250 +++++++
```

Zero code files, zero migrations, zero config changes. The SPEC document is the entire deliverable of T1 must validate.

---

## GATE 1: No transcreation worker provider calls

**Required by task body:** "no transcreation worker provider calls"

**Evidence:**
- SPEC Section 3 guardrail 1: "No transcreation worker calls providers directly."
- SPEC Section 5 describes provider-runner as a separate architectural component from transcreation workers (Phase A = dry-run resolver, Phase B = bounded write candidate)
- The Kanban thread confirms: "No mass transcreation, no publish, no provider calls from transcreation workers."

**Result:** PASS

---

## GATE 2: No invented source_refs

**Required by task body:** "no invented source_refs"

**Evidence:**
- SPEC Section 4.2 defines `UsableSourceRef` as a strict union type requiring `verified: true`:
  ```ts
  type UsableSourceRef =
    | { ref_type: 'growth_signal_fact': string; verified: true }
    | { 'external_provider_artifact': string; checksum?: string; verified: true };
  ```
- SPEC Section 3 guardrail 4: "No invented source_refs."
- SPEC Section 3 guardrail 5: "Provider/cache refs are not fact-level refs until mapped to a verified growth_signal_facts.id or approved external ref."
- SPEC Section 4 provides 4 explicit blocked examples (dataforseo:cache, gsc:query, raw JSON, copied profile text).

**Result:** PASS

---

## GATE 3: No implicit locale/market fallback

**Required by task body:** "no implicit locale/market fallback"

**Evidence:**
- SPEC Section 3 guardrail 2: "No implicit es-CO/CO fallback."
- SPEC Section 3 guardrail 3 establishes the exact rule:
  ```
  exact match → explicit allowed fallback → BLOCKED
  ```
- SPEC Section 6.5 (T5 canary) demonstrates the pattern with explicit `source: es-CO/CO → target: pt-BR/BR` — no implicit steps.
- The non-negotiables from the T0 task body repeat: "Rule: exact match -> explicit allowed fallback -> BLOCKED."

**Result:** PASS

---

## GATE 4: No secrets exposure

**Required by task body:** "no secrets exposure"

**Evidence:**
- SPEC Section 3 guardrail 6: "QA/data-audit workers cannot read .env, service-role keys, temp key files, or print secret fragments."
- SPEC Section 5 Phase A (dry-run) reads from existing profiles/runs and provider policy rows — no env variable access.
- The commit diff contains zero references to .env files, service role keys, or token variables.
- SPEC Section 8 confirms: "no writes/providers/secrets."
- The Kanban thread from T0 completion states: "No provider calls, no DB writes, no secrets."

**Result:** PASS

---

## GATE 5: No prod writes except explicitly-approved migrations

**Required by task body:** "no prod writes except explicitly-approved migrations (none expected in this sprint)"

**Evidence:**
- SPEC Section 5 Phase A explicitly states outputs include "no DB writes."
- SPEC Section 5 Phase B (bounded write candidate) is gated: "Only after T3/T4 pass" and "Phase B is not automatically authorized by this SPEC. It needs a later operator gate."
- SPEC Section 3 guardrail 9: "No real backfill until T4 proves a safe mapping."
- The commit contains zero SQL files, zero migration files, and zero code that could write to production.
- The 10th non-negotiable guardrail requires live provider calls to pass through provider policy, cost/rate gate, tenant scope, and runner isolation.

**Result:** PASS

---

## GATE 6: First implementation must be dry-run / bounded slice

**Required by task body:** "first implementation must be dry-run / bounded slice"

**Evidence:**
- SPEC Section 5 Phase A is explicitly the dry-run resolver: "candidate mappings, rejected mappings with reason, required facts still missing, no DB writes."
- SPEC T5 acceptance criteria defines the canary dry-run with explicit constraints: `mode: dry-run`, `publish: false`, `provider_calls: false`.
- T3 CODE/DATA GATE must confirm "code path is dry-run by default" before any writes are considered.
- SPEC Section 6 defines Acceptance Criteria in stages: T1 (plan) → T2 (dry-run impl) → T3 (code gate) → T4 (data audit) → T5 (canary) — each stage gates the next.

**Result:** PASS

---

## Additional checks

### INDEX.md format
Entry at docs/INDEX.md line 215:
```
| [[growth-source-truth-colombiatours-ptbr]] | [file](./specs/SPEC_GROWTH_SOURCE_TRUTH_COLOMBIATOURS_PTBR.md) | Sprint spec: ... |
```
Format matches adjacent entries (wikilink pattern, relative file path, description). No formatting issues.

### Migration reference
SPEC Section 2 references a migration `20260518193555_growth_control_plane_governance_tables_prod_compat_20260518` from earlier Phase 3 work. This is a retrospective reference to an already-applied migration — not a new migration being proposed. No action needed.

### Spec completeness
The 250-line SPEC covers: objective (1), current baseline (2), 10 non-negotiable guardrails (3), data contract for facts and source refs (4), two-phase provider-runner/normalizer design (5), acceptance criteria for T0 through T7 (6), done definition with evidence requirements (7), and operator recovery note (8). All required sections per the T0 task body are present.

---

## Verdict

**Verdict: PASS**

All 6 validation gates pass/block gates clear. The T0 SPEC is structurally sound, respects all non-negotiable guardrails, defines a clear two-phase approach with explicit gating, and commits no code/provider calls/secrets/writes.

**Downstream:** Task t_3163a39f (T2 IMPLEMENT) is unblocked. The implementer should follow Phase A design and T2 acceptance criteria from the SPEC. The INDEX.md entry is already present — no additional update needed for T1.

**Validator:** tech-validator
**Task:** t_70a71dfd
**Date:** 2026-05-18
