# SPEC: Growth OS DataForSEO Evidence-Governed Brain

## GitHub Tracking

- **Epic Issue**: TBD
- **Parent Epic**: [#310](https://github.com/weppa-cloud/bukeer-studio/issues/310)
- **Agentic Orchestrator Epic**: [#460](https://github.com/weppa-cloud/bukeer-studio/issues/460)
- **Production Runtime Epic**: [#441](https://github.com/weppa-cloud/bukeer-studio/issues/441)
- **DataForSEO Runtime Bridge Issue**: [#470](https://github.com/weppa-cloud/bukeer-studio/issues/470)
- **Child Issues**: TBD
- **Milestone**: ColombiaTours Growth OS agentic evidence hardening
- **Area**: growth + runtime + DataForSEO + agentic brain + audit

## Status

- **Author**: Codex + Growth OS Orchestrator
- **Date**: 2026-05-09
- **Status**: Draft for approval
- **Related Specs**: [[SPEC_GROWTH_OS_AGENTIC_ORCHESTRATOR_9_PLUS]], [[SPEC_GROWTH_OS_AUTONOMOUS_PRODUCTION_OPERATING_SYSTEM]], [[SPEC_GROWTH_OS_MAX_PERFORMANCE_MATRIX]], [[SPEC_GROWTH_OS_UNIFIED_BACKLOG_AND_PROFILE_RUN_LEDGER]], [[SPEC_GROWTH_OS_PAPERCLIP_AUTONOMOUS_CEO_COCKPIT]]
- **ADRs referenced**: ADR-003, ADR-005, ADR-007, ADR-009, ADR-010, ADR-013, ADR-016, ADR-018, ADR-029
- **Cross-repo impact**: Supabase remains shared with `weppa-cloud/bukeer-flutter`. Any schema/RLS migration must follow [[supabase-migration-governance]]. Runtime writes remain service-role only.

## Summary

Close the gap discovered during the ColombiaTours production run after implementing #470: DataForSEO cache is now materialized into runtime profiles and deterministic discovery can attach `dataforseo_evidence`, but Growth CEO Brain-created candidates/work items do not consistently cite DataForSEO evidence in their own decision, candidate and work item ledgers.

This SPEC makes DataForSEO a first-class evidence source for agentic reasoning. The Brain must read the runtime `dataforseo_snapshot`, cite feature-level evidence, decide whether the evidence is sufficient for each action class, block stale/missing/cost-gated provider states and avoid creating duplicate work from repeated signals or repeated brain decisions.

The executor boundary does not change. DataForSEO can influence what work is created, delegated or blocked, but public mutations still require the live-gated executor: policy, caps, freshness, quality, smoke, rollback and outcome.

## Production Learning From 2026-05-09

Observed in ColombiaTours production:

- `growth_dataforseo_cache` had 77 fresh rows.
- Runtime profiles `seo_market` and `competitor` now include `payload.dataforseo_snapshot`.
- Available feature profiles:
  - `serp`: 39 evidence rows.
  - `labs_keywords`: 33 evidence rows.
  - `domain_analytics`: 3 evidence rows.
  - `content_analysis`: 1 evidence row.
  - `unknown/business_data`: 1 evidence row.
- Deterministic discovery can attach `evidence.dataforseo_evidence`.
- Brain-created work items may include DataForSEO in context but do not always persist explicit `dataforseo_evidence` or provider citations.
- Aggressive caps proved the executor can apply production work, but repeated work items also revealed the need for evidence-aware dedupe and idempotency before scaling.

## Product Decisions

| Decision | Rule |
| --- | --- |
| Initial tenant | ColombiaTours only. |
| Evidence posture | DataForSEO evidence is required for provider-dependent content, transcreation and technical SEO decisions unless an explicit exception is recorded. |
| Brain posture | Brain may reason with DataForSEO and create candidates/work items, but must cite the evidence it used. |
| Mutation posture | Brain never mutates public content. Executor remains the only mutation boundary. |
| Feature mapping | `content_publish` uses `labs_keywords`, `serp` and `content_analysis`; `transcreation_merge` uses `serp`, `labs_keywords` and locale evidence; `safe_apply` uses `onpage` when available or an explicit technical exception. |
| Dedupe posture | New candidates/work items must be idempotent by action class, target, locale, evidence fingerprint and decision family. |
| Staleness posture | Stale, missing, empty, blocked or cost-gated DataForSEO states block provider-dependent brain materialization. |
| UI posture | Company Control must show which DataForSEO feature profile supported or blocked each decision. |

## User Flows

### Flow 1: Brain Creates Evidence-Cited Work

1. Scheduler or user wakeup starts Growth CEO Brain.
2. Context builder injects fresh profiles and `dataforseo_snapshot`.
3. Brain evaluates a provider-dependent opportunity.
4. Brain maps the action class to required DataForSEO feature profiles.
5. Brain emits `observed_signals[]`, `memory_reads[]`, `skill_reads[]`, `outcome_references[]` and `provider_evidence_reads[]`.
6. Materializer persists proposed candidate/work item with `evidence.dataforseo_evidence`.
7. UI shows why the candidate exists and which provider facts supported it.

### Flow 2: Brain Blocks Weak Provider Evidence

1. Brain identifies a content, transcreation or technical opportunity that depends on DataForSEO.
2. DataForSEO status is `stale`, `empty`, `missing_access`, `blocked` or `cost_gated`.
3. Brain writes a blocked decision with no-go reason such as `dataforseo_stale` or `dataforseo_cost_gated`.
4. No live-ready candidate/work item is created.
5. UI shows recommended corrective action: refresh provider, approve cost, run OnPage crawl or add manual exception.

### Flow 3: Duplicate Work Is Coalesced

1. Brain or discovery sees repeated signals for the same action/target/locale.
2. Runtime computes a stable evidence fingerprint.
3. Existing ready/running/published work with same fingerprint is reused or coalesced.
4. No duplicate work item is created unless the evidence version changed materially.
5. Decision ledger records `coalesced_with_work_item_id`.

### Flow 4: Technical SEO Requires OnPage Or Exception

1. Brain proposes `safe_apply`.
2. Runtime checks for DataForSEO `onpage` feature profile.
3. If `onpage` is unavailable, runtime may proceed only with an explicit technical exception:
   - target is allowlisted;
   - patch is reversible;
   - smoke plan is present;
   - `dataforseo_exception_reason` is persisted.
4. UI marks the work as `provider_exception`, not fully DataForSEO-backed.

### Flow 5: Learning Uses Provider Outcomes

1. Outcome evaluator marks work as `won`, `lost` or `inconclusive`.
2. Learning service links result back to the DataForSEO evidence fingerprint.
3. A lost provider-backed pattern blocks similar future work until new evidence arrives or a corrected skill is approved.
4. Later Brain decisions cite the memory/skill and provider evidence that changed the decision.

## Data Contracts

### `DataForSeoProviderSnapshot`

Already implemented by #470. Required shape for this SPEC:

```ts
type DataForSeoFeatureProfile =
  | "onpage"
  | "serp"
  | "labs_keywords"
  | "content_analysis"
  | "domain_analytics"
  | "ai_optimization"
  | "unknown";

type DataForSeoAccessStatus =
  | "available"
  | "missing_access"
  | "cost_gated"
  | "stale"
  | "empty"
  | "blocked"
  | "excepted";
```

### `GrowthProviderEvidenceRead`

Add a reusable ledger shape in contracts/runtime code:

```ts
interface GrowthProviderEvidenceRead {
  provider: "dataforseo";
  feature_profile: DataForSeoFeatureProfile;
  access_status: DataForSeoAccessStatus;
  cache_ids: string[];
  row_count: number;
  evidence_count: number;
  fetched_at: string | null;
  expires_at: string | null;
  endpoint_family: string | null;
  evidence_fingerprint: string;
  required_for_action: boolean;
  exception_reason?: string;
}
```

### Candidate / Work Item Evidence

Every Brain-created provider-dependent candidate/work item must include:

```json
{
  "dataforseo_evidence": {
    "required": true,
    "status": "available",
    "feature_profile": "labs_keywords",
    "evidence_fingerprint": "sha256:...",
    "cache_ids": ["..."],
    "row_count": 33,
    "evidence_count": 33,
    "expires_at": "2026-05-30T21:31:22.907+00:00"
  }
}
```

If an exception is used:

```json
{
  "dataforseo_evidence": {
    "required": true,
    "status": "excepted",
    "feature_profile": "onpage",
    "exception_reason": "technical_safe_apply_has_target_snapshot_smoke_and_rollback_but_no_onpage_cache"
  }
}
```

### Decision Ledger

Extend `growth_orchestrator_decisions` payload contract with:

- `provider_evidence_reads[]`
- `provider_no_go_reasons[]`
- `coalesced_candidate_ids[]`
- `coalesced_work_item_ids[]`
- `evidence_fingerprints[]`

No new table is required unless typecheck/query ergonomics require it. Prefer JSONB contract plus indexes on existing candidate/work item idempotency keys.

## Services

### New / Extended Runtime Functions

```ts
buildDataForSeoEvidenceContext(accountId, websiteId, actionClass, target);
selectRequiredDataForSeoFeature(actionClass, lane, target);
computeGrowthEvidenceFingerprint(providerEvidence);
attachProviderEvidenceToBrainCandidate(decision, candidate);
coalesceGrowthProviderBackedWork(input);
evaluateProviderEvidenceGate(input);
```

### Existing Functions To Extend

- `buildGrowthAgentContext`
- `runGrowthOrchestratorBrain`
- `materializeBrainDecision`
- `evaluateCandidateDataQuality`
- `discoverGrowthOpportunityCandidates`
- `getGrowthCeoCockpit`
- `getGrowthAutonomyHealth`
- `getGrowthImpactLedger`

## Safety And Security

- DataForSEO content is external data and must pass prompt-injection scanning before prompt/context injection.
- Provider evidence cannot override sensitive-surface hard blocks:
  - paid mutation;
  - pricing;
  - availability;
  - reservations;
  - payments;
  - bulk CRM;
  - outreach;
  - experiment activation.
- Service role writes only. Browser clients read tenant-scoped evidence and enqueue/admin actions only through server actions.
- DataForSEO budget/cost-gated state must block provider-dependent Brain materialization unless CEO/admin explicitly enables a costed refresh.
- Evidence citations must not expose credentials, raw API secrets or full vendor payloads in browser UI.

## UI Requirements

### Company Control: Brain Decision Detail

Show:

- DataForSEO feature profiles read by the decision.
- `available/stale/missing_access/cost_gated/blocked/excepted` status.
- cache IDs or redacted count.
- evidence freshness and expiry.
- action class requiring the evidence.
- no-go reason or exception reason.
- linked candidates/work items/publication jobs/outcomes.

### Data Health

Show:

- DataForSEO Runtime profile row even when legacy provider mirror is empty.
- Feature-level status cards for `serp`, `labs_keywords`, `content_analysis`, `domain_analytics`, `onpage`, `ai_optimization`.
- CTA/action hint:
  - refresh;
  - approve paid provider call;
  - run OnPage crawl;
  - accept technical exception.

### Workboard

Show:

- provider badge on Brain-created work;
- `dataforseo_backed`, `provider_exception` or `provider_blocked`;
- coalesced/duplicate marker when applicable.

## Acceptance Criteria

- Brain-created provider-dependent candidates include `evidence.dataforseo_evidence`.
- Brain decisions include `provider_evidence_reads[]` and cite the feature profile that influenced the decision.
- Provider-dependent work is blocked if DataForSEO status is stale, empty, missing access, cost gated or blocked.
- Technical `safe_apply` without OnPage evidence is marked as exception and requires snapshot, allowlist, smoke and rollback.
- Duplicate Brain/discovery candidates for the same action/target/locale/evidence fingerprint are coalesced.
- UI shows DataForSEO evidence on decision detail and Workboard.
- Production certification proves:
  - at least 1 Brain-created content candidate cites `labs_keywords` or `serp`;
  - at least 1 Brain-created transcreation candidate cites `serp` or `labs_keywords`;
  - at least 1 technical candidate is either `onpage` backed or explicitly marked as provider exception;
  - at least 1 stale/missing/cost-gated provider scenario blocks materialization;
  - 0 public mutations bypass executor gates.

## Test Plan

### Unit

- `selectRequiredDataForSeoFeature` maps `content_publish`, `transcreation_merge` and `safe_apply` correctly.
- `evaluateProviderEvidenceGate` allows `available`, blocks stale/missing/cost-gated/empty/blocked and allows `excepted` only with required exception fields.
- `computeGrowthEvidenceFingerprint` is stable and changes when feature profile/cache set/freshness changes materially.
- Brain schema validation requires provider citations for provider-dependent decisions.
- Prompt-injection scan blocks contaminated provider payload snippets.

### Integration

- DataForSEO profile refresh -> context snapshot -> Brain decision -> candidate with `dataforseo_evidence`.
- Brain-created duplicate candidate coalesces into existing work item.
- Stale DataForSEO snapshot creates blocked decision and no live-ready work item.
- Technical exception path creates safe_apply work with exception reason and rollback payload.
- Outcome lost creates memory/replay candidate linked to provider evidence fingerprint.

### E2E

- Data Health shows DataForSEO Runtime feature profiles.
- Decision detail shows provider evidence reads and no-go/exception reasons.
- Workboard shows provider-backed and provider-exception badges.
- Session-pool test proves user invoke -> wakeup -> Brain decision -> provider-backed candidate -> live-gated executor.
- Mobile has no horizontal overflow on Data Health, decision detail or Workboard.

### Production Certification

Run ColombiaTours controlled cycle and record:

- cycle ID;
- decision ID;
- context snapshot ID;
- candidate/work item IDs;
- provider evidence fingerprints;
- publication job IDs if applied;
- smoke results;
- rollback payload presence;
- outcome IDs.

Certification cannot pass if provider-dependent Brain work lacks provider evidence citations.

## Issue Breakdown

Recommended Epic: `Growth OS DataForSEO Evidence-Governed Brain`

Suggested children:

1. `Brain provider evidence contract and schema validation`
2. `DataForSEO evidence gate and fingerprinting`
3. `Brain materializer attaches DataForSEO evidence to candidates/work items`
4. `Provider-backed work dedupe and coalescing`
5. `Technical OnPage evidence or explicit exception path`
6. `Company Control UI provider evidence detail`
7. `Provider evidence E2E and ColombiaTours production certification`

## Open Questions

- Should DataForSEO OnPage be fetched automatically for high-confidence technical batches, or remain CEO-approved due cost?
- Should repeated technical safe_apply jobs on the same page/field be collapsed into one canonical work item retroactively?
- Should DataForSEO evidence fingerprints become a physical column for fast dedupe, or remain in JSONB until scale requires indexing?
