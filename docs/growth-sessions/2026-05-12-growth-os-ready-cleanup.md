# Growth OS Ready Queue Cleanup + Pre-Ready Gate — 2026-05-12

## Context

The post-deploy monitor found that the production executor stayed safe, but the backlog factory was still allowing invalid `growth_work_items.status='ready'` rows:

- `ready` invalids observed before cleanup: 10-18 across monitor windows.
- duplicate `ready` groups observed before cleanup: 3-5.
- sensitive mutations: 0.
- smoke failures without rollback: 0.
- open cycles/runs/sessions after reconciliation: 0.

The root cause was architectural: runtime execution gates were strong enough, but `ready` was not enforced as an executable contract before claim.

## Production Cleanup

The standard Epic #471 cleanup script was executed first:

- command: `scripts/growth/cleanup-growth-backlog-noise.ts --apply --confirm=cleanup-growth-backlog-471`
- result: 0 decisions, because the existing cleanup contract was too broad and did not catch lane-specific adapter requirements.

A strict production cleanup then blocked invalid `ready` rows using the same lane-specific contract now added to the runtime:

- checked: 9
- blocked: 8
- remaining ready after cleanup: 1
- duplicate groups after cleanup: 0

Blocked work item IDs:

| Work item | Reason family |
|---|---|
| `a2402db0-59a7-4faf-96ca-b733df29295a` | `safe_apply` missing executable adapter contract |
| `ad91adeb-2816-4e03-a6c8-181299c1eb36` | `safe_apply` missing executable adapter contract |
| `2c418f26-a27a-4e01-8822-0dc077c9ad79` | `safe_apply` missing executable adapter contract |
| `e3382938-0ffa-4e0c-a86a-bc015a35f5fb` | `transcreation_merge` missing job/locale/source/quality contract |
| `4f8b9c85-c610-4b82-9d0c-d13bbc160b30` | `transcreation_merge` missing job/locale/source/quality contract |
| `0fb1dbf0-db04-4444-ac00-ee2675be0dc5` | `transcreation_merge` missing job/locale/source/quality contract |
| `6bd8f17d-bcb6-47fd-abae-9920b0ef4086` | `transcreation_merge` missing job/locale/source/quality contract |
| `4fefa4eb-12d9-465b-98fd-f0fe119a6cc8` | `transcreation_merge` missing job/locale/source/quality contract |

## Runtime Fix

Added a production-cycle stage before `execution_bridge`:

```text
work_item_promotion -> pre_ready_reconciliation -> execution_bridge
```

`pre_ready_reconciliation` checks every `ready` work item before claim:

- blocks incomplete `content_publish` artifacts before claim;
- blocks incomplete `transcreation_merge` artifacts before claim;
- blocks incomplete `safe_apply` artifacts before claim;
- blocks duplicate ready items for the same action/entity;
- writes `pre_ready_contract_gate` into `growth_work_items.evidence`;
- leaves valid items claimable.

This makes `ready` mean "executor can claim this now", not "maybe useful later".

## Production Verification

A controlled production cycle was executed with the new local code and no brain/discovery/promotion/claims:

- cycle id: `0566b92b-1fc9-4596-939b-c843c8acbf6d`
- `candidate_count`: 0
- `promoted_count`: 0
- `claimed_count`: 0
- `production_mutation_performed`: false
- `pre_ready_reconciliation.checked`: 1
- `pre_ready_reconciliation.invalid`: 0
- `pre_ready_reconciliation.duplicates`: 0
- `pre_ready_reconciliation.blocked`: 0

Final production queue state after verification:

- `ready_total`: 1
- duplicate ready groups: 0
- smoke failures without rollback: 0
- sensitive publication jobs: 0

Remaining valid ready item:

| Work item | Lane | Action |
|---|---|---|
| `7f986e2b-39d6-4968-a480-cfb67c81122a` | `technical_remediation` | `safe_apply` |

## Provider Watch

Clarity returned `Clarity rate limited` during the controlled cycle. This does not affect executor safety, but provider scheduling should avoid repeated forced Clarity pulls inside short monitor/reconcile loops.

## Validation

- `npm test -- __tests__/lib/growth/autonomy/production-cycle.test.ts`: PASS, 11/11.
- `npm run typecheck`: PASS.

## Next Required Deployment Step

Deploy the code change containing `pre_ready_reconciliation` to the VPS/runtime. Until this SHA is running in the scheduled executor, manual cleanup can make the queue clean, but the older scheduler can still recreate invalid `ready` rows.
