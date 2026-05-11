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

### VPS Hermes sidecar production proof

On 2026-05-11 the hybrid runtime was validated directly on the Growth OS VPS
instead of local simulation.

- VPS release deployed: `b8c24a921440e5ce576996f3b813c34169319b66`
- Runtime root: `/opt/growth-os/current`
- Docker service: `growth-orchestrator`
- Hermes profile: `growth-os-colombiatours`
- Deployment smoke: `runtime config smoke completed`, pass `true`
- Persisted SHA guard: `/opt/growth-os/.env` now records `GITHUB_SHA=b8c24a921440e5ce576996f3b813c34169319b66`
- Fix commit: `b8c24a92 fix(growth): persist runtime deploy sha on VPS`

Real Hermes sidecar run:

- Sidecar run: `cd4e3445-556f-4ef3-a681-078c909395b6`
- Provider analysis artifact: `689904ad-8006-4b52-a7d9-d68f3fa1d9ad`
- Mode: `hermes`
- Hermes available: `true`
- Hermes profile: `growth-os-colombiatours`
- Lane session: `b5609bef-608e-4b09-baf8-f9caaa344aaf`
- Lane: `content_writer`
- Content artifact: `47060c80-3ba6-48c9-b760-6c4b8ba2ef3b`
- Candidate: `d401e0d3-0a02-4310-a4f0-13f3f558575a`
- Work item: `b0be2865-05dc-454a-bf06-7ea5cc0862bd`

The Hermes sidecar produced the artifact only. Public mutation was performed
later by the Growth OS live-gated executor.

### VPS live-gated executor proof

Controlled production cycle:

- Cycle: `6a612c42-fd39-42a7-b165-e4f90fcbe1f9`
- Git SHA: `ad77a3b6`
- Mode: executor
- Claims: `3`
- Applied: `2`
- Blocked: `1`
- Public mutation performed: `true`

Content publication from Hermes artifact:

- Work item: `b0be2865-05dc-454a-bf06-7ea5cc0862bd`
- Run: `a44a3406-ab54-4960-9b89-f44c6819a412`
- Publication job: `bd6a7be7-8a62-45d7-abf4-b4582b5c9101`
- Action class: `content_publish`
- Target table: `website_blog_posts`
- Target row: `e5f25845-6ca9-42fe-af49-8c75640cfe00`
- Target path: `/blog/growth-os-post-migracion-cd4e3445`
- Blog status: `published`
- Smoke status: `smoke_passed`
- Rollback payload: delete created blog slug `growth-os-post-migracion-cd4e3445`
- Outcomes:
  - `5e7b0225-0c40-4c65-9090-7e977021c7ce` — `measuring`, `organic_clicks_21d:day_21`
  - `ea20f7c0-6af2-4989-a1cb-1847f25f11b0` — `scheduled`, `organic_clicks_21d:day_45`

Technical safe apply from the same controlled cycle:

- Work item: `6c7cebdc-d05d-427e-82c6-285d8fe9c7e4`
- Publication job: `4c624ff3-09b3-4c19-bd3e-ef2c35683389`
- Action class: `safe_apply`
- Target table: `website_pages`
- Target path: `/privacy`
- Smoke status: `smoke_passed`
- Immediate outcome: `8b46b450-a410-434f-b045-e26bb7abd55b`, status `inconclusive`

Post-deploy daemon cycle:

- Cycle: `93189254-e2eb-44e5-b0f5-ed0a409bdda9`
- Git SHA: `b8c24a921440e5ce576996f3b813c34169319b66`
- Status: `completed`
- Claims: `2`
- Applied: `1`
- Blocked: `1`
- Public mutation performed: `true`
- Latest technical job: `24af9b4f-3ad2-4ef7-b16d-2aabeaaf8e5c`
- Target path: `/paquetes-a-colombia-todo-incluido-en-9-dias`
- Smoke status: `smoke_passed`

Runtime health after reconciliation:

- Open work items: `0`
- Open wakeups: `0`
- Open task sessions: `0`
- Scheduler heartbeat: `healthy`
- Heartbeat row: `24578b81-8495-4842-841e-8a3224cb6dd6`
- Last cycle id: `93189254-e2eb-44e5-b0f5-ed0a409bdda9`
- Last cycle status: `completed`

Stale cleanup performed after controlled VPS restarts:

- Stale cycles marked failed:
  - `006c6e68-92df-4e98-bc24-999dc3128b06`
  - `606997df-034d-4b20-b5ba-5c0381585bad`
  - `9692fcd4-4843-4425-8149-18e6126949e1`
- Stale run marked stalled: `602bc090-1c07-491b-848e-c2668c6575e8`
- Stale work item blocked: `aba4ae42-a935-461e-9eb9-7bcfd35bda8b`
- Block reason: `stale_runtime_claim_recovered_missing_transcreation_contract`

Transcreation lane evidence remains guarded:

- Hermes transcreation lane produced artifact evidence in sidecar validation.
- Live merge was not forced because the available transcreation payloads lacked
  `source_entity_id` and `transcreation_job_id`, or were blocked by anti-rework.
- This is an executor contract pass, not a public mutation pass: invalid
  transcreation artifacts do not bypass Growth OS gates.

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
