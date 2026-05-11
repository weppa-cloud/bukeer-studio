# Epic #482 Hermes Chief Of Staff Swarm Certification

Date: 2026-05-11  
Tenant: ColombiaTours  
Account: `9fc24733-b127-4184-aa22-12f03b98927a`  
Website: `894545b7-73ca-4dae-b76a-da5b6a3f8441`  
Status: `CERTIFIED_WITH_WATCH`

## Scope

This run certifies the hybrid Hermes/Growth OS layer from `SPEC_GROWTH_OS_HERMES_CHIEF_OF_STAFF_SWARM`:

- Chief of Staff conversational ledger over Growth OS operational truth.
- Safe action router for user intent.
- Editable agent company model.
- Agent artifact validation and materialization into Growth OS candidates/work items.
- UI surfaces in CEO cockpit and Agents.
- Growth OS remains the only live-gated mutation boundary.

External Hermes runtime replacement is intentionally not certified here. The accepted architecture is hybrid: Hermes-style conversation, agents and artifacts feed Growth OS; public mutations still require Growth OS executor gates.

## Production Evidence

### Supabase migration

- Migration file: `supabase/migrations/20260511110000_growth_hermes_chief_of_staff_swarm.sql`
- Applied in production through Supabase MCP.
- Remote migration record: `20260511135506 growth_hermes_chief_of_staff_swarm`
- New runtime tables:
  - `growth_chief_of_staff_sessions`
  - `growth_chief_of_staff_messages`
  - `growth_chief_of_staff_actions`
  - `growth_agent_types`
  - `growth_agent_instances`
  - `growth_agent_artifacts`

RLS was verified enabled for the new Growth tables. Supabase advisors still report legacy/system/backup tables with RLS disabled; those are outside this Epic and remain a security hardening follow-up.

### Agent company seed

- `growth_agent_instances`: 10 ColombiaTours instances.
- Example instances:
  - Chief of Staff: `03836b62-833d-409a-8c8e-931806a30301`
  - Growth CEO Brain: `4bac5ee5-04a9-4b86-87ee-1056b0185512`
  - Technical Remediation: `cf554ecd-ec8d-424e-ae2a-2405e456ce93`
  - Transcreation: `9c4412f7-22be-41af-be58-56b506a2efa4`

### Chief of Staff conversation and action routing

- Session: `f6c4e626-b419-4ecb-9b83-c98cfe9a4151`
- User message: `d0f7cec3-e100-4cd5-9eda-cbeefc4702a4`
- Assistant message: `dadab18a-1fe5-4f5d-a42a-3c9b903c5eb1`
- Action: `bd9c3698-544d-4c02-87be-106b20bb12f6`
- Wakeup: `75b7e8dc-2d0c-4d3b-8646-0c45917eecd6`

The response cited operational records from decisions, outcomes, profile runs and task sessions. Sensitive direct mutation intents are routed to `forbidden` or `requires_approval`; the UI action enqueues wakeups instead of running the Brain inside the request.

### Wakeup coalescing fix

During E2E, the server log exposed a production bug:

`wakeup coalesce failed: A 'limit' was applied without an explicit 'order'`

Fix: removed the update-chain `.limit(1)` in `enqueueGrowthAgentWakeup` and tightened the unit test to cover update-return behavior.

Production validation:

- First action: `f5d28cef-7098-4e72-8755-4d18e9d3de4f`
- Second action: `752b1bc8-65ca-4601-8619-8c4d72710d42`
- Shared wakeup: `8575e5b5-1f6d-400d-af45-9b6d58c3045a`
- `coalesced_count`: `0 -> 1`
- Status: `queued`

### Brain/runtime claim

Controlled cycle:

- Cycle: `5663625e-1c99-4ed3-8a25-755e8feda583`
- Decision: `072accc2-2838-4c18-b776-f4198b080cb1`
- Context snapshot: `e7bba71f-509c-41cf-9f11-70475999bd77`
- Claimed wakeup: `75b7e8dc-2d0c-4d3b-8646-0c45917eecd6`
- Mode: production ledger, `maxClaimsPerLane=0`, `candidateLimit=0`, `promotionLimit=0`
- Result: completed, no public mutation.

Recent full runtime evidence also exists in cycle `f3d729d7-d1f4-4666-81f6-b70ccd909e51`:

- Brain decision: `e33faca4-e0e1-415e-9626-92f1ae6bac33`
- Wakeup: `79781ca2-219f-4d98-95cf-cbd0e8536f3e`
- Candidates created: 14
- Task sessions created: 2
- Work items promoted: 10
- Claims: 3
- Applied: 2
- Blocked: 1
- Evaluated outcomes: 1

### Agent artifact materialization

Validated artifact:

- Artifact: `2112b1f6-292f-4dae-a175-692b3e36aec9`
- Type: `safe_apply_patch`
- Status: `validated`

Materialized artifact:

- Artifact: `d1cef4bb-9bc2-4d24-a5b7-ce5255d9fafb`
- Type: `safe_apply_patch`
- Status: `materialized`
- Candidate: `0b3d1c64-2770-4f2e-a827-b3a15d51e374`
- Work item: `8f995a77-e77b-4d72-848d-97a01f021e9e`
- Target: `website_pages:nosotros:seo_title`
- Public mutation: no-op validation payload.

The artifact contract required target, field allowlist, rollback payload, smoke plan, success metric and evaluation window before materialization.

## UI/E2E Evidence

Session-pool E2E only. Firefox was explicitly skipped for this closure.

Command:

```bash
GROWTH_OS_UI_E2E_ENABLED=true npm run session:run -- \
  --project=chromium \
  --project=mobile-chrome \
  --grep 'CEO cockpit|Agent Team tab loads cards|Workboard tab loads Kanban' \
  e2e/tests/growth-os-console-ui.spec.ts
```

Result:

- `7 passed`
- Chromium:
  - CEO cockpit passed.
  - Agent Team passed.
  - Workboard passed.
- Mobile Chrome:
  - CEO cockpit passed.
  - Agent Team passed.
  - Workboard passed.

Post-fix cockpit smoke:

```bash
GROWTH_OS_UI_E2E_ENABLED=true npm run session:run -- \
  --project=chromium \
  --project=mobile-chrome \
  --grep 'CEO cockpit loads current command-center surfaces and lane policy states' \
  e2e/tests/growth-os-console-ui.spec.ts
```

Result: `3 passed`.

## Unit And Type Evidence

- `npm run typecheck`: passed.
- Chief of Staff unit tests: 5 suites / 11 tests passed.
- Paperclip heartbeat v2 regression test: 1 suite / 5 tests passed.

## Certification Verdict

Certified:

- Chief of Staff conversation ledger.
- Wakeup-first action routing.
- Wakeup coalescing.
- Editable agent company UI.
- Agent artifact validation/materialization.
- Growth OS executor-only mutation boundary.
- Session-pool E2E for Chromium and mobile Chrome.

Watch:

- External Hermes worker/profile is not replacing the production daemon in this certification.
- Firefox E2E was skipped by operator instruction.
- Legacy Supabase RLS advisory remains outside this Epic.

Closeable issues: #483, #484, #486, #487, #489 and UI portions of #490. Keep #485/#488 scoped as follow-up if the goal changes from hybrid Hermes layer to external Hermes runtime/lane workers.
