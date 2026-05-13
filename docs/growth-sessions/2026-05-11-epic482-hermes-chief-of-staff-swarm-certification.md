# Epic #482 Hermes Chief Of Staff Swarm Certification

Date: 2026-05-11  
Tenant: ColombiaTours  
Account: `9fc24733-b127-4184-aa22-12f03b98927a`  
Website: `894545b7-73ca-4dae-b76a-da5b6a3f8441`  
Status: `CERTIFIED`

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

### Final Hermes context-isolation and publication proof

After the first #482 certification pass, the runtime was hardened with strict
per-agent context manifests and artifact citation checks, then redeployed and
validated again in production.

- Runtime commit: `301a75cd fix(growth): make hermes artifacts promotion-ready`
- Previous context-isolation commit: `8a78029c feat(growth): add effectiveness benchmark ledger`
- VPS service: `growth-orchestrator`
- Hermes binary: available inside the production container
- Hermes profile: `growth-os-colombiatours`
- Sidecar run: `2bf3b3b7-58a4-4878-a2b4-235c39531f3b`
- Sidecar mode: `hermes`
- Hermes available: `true`
- Provider analysis artifact: `478cd46b-bff1-4066-af1a-4c5e0daaf3dd`

Agent task sessions and context manifests:

- Content task session: `94114dfb-ad8d-40b3-b965-7bfe0fbe3c9b`
- Content context manifest: `92c7a0ae-4a82-48a7-9bba-2e2f037dfe3c`
- Content agent instance: `a7934320-6936-40ab-9925-3590de155b49`
- Content autonomy level: `A2`
- Content model provider/model: `openrouter` / `openai/gpt-5`
- Content toolset: `provider_profiles`, `growth_context_read`
- Context isolation verdict: allowed and enforced; lane, tool, skill, memory and tenant scoped; mutation boundary `growth_os_executor`
- Artifact citation verdict: `allowed=true`

Hermes content artifact -> Growth OS executor chain:

- Content artifact: `88abd028-1979-4edd-b90b-662b295d0bba`
- Candidate: `4f05917a-f209-402c-bf7f-2a5e13185d37`
- Work item: `894bf9f8-785a-4c82-9228-24f6d3371436`
- Runtime cycle: `4adb124e-2268-4ed5-912e-9ff7574f0975`
- Agent run: `8e06f8ab-97b3-47cc-9612-6d053fc5d685`
- Change set: `e94d86a9-5071-49c1-a78a-c7b7625404f0`
- Publication job: `a1b2e26d-bb30-4ff5-be4e-035e47f1c0eb`
- Target table: `website_blog_posts`
- Target row: `234e76d0-50de-4903-a4fd-5c99a988b213`
- Public path: `/blog/growth-os-post-migracion-2bf3b3b7`
- Public HTTP check: `200`
- Blog status: `published`
- Job mode: `live`
- Smoke status: `smoke_passed`
- Rollback payload: delete created slug `growth-os-post-migracion-2bf3b3b7`
- Outcome day 21: `52b8b3c0-044d-4e22-b751-8a95b335a619`, status `measuring`
- Outcome day 45: `cb4ec57d-fb40-4efd-8904-1fecbd800f28`, status `scheduled`

Provider evidence cited by the published content work item:

- Clarity UX friction profile: `growth_profile_runs:b7c5a377-153a-4390-8f41-904af88703d6`
- GA4 pivot funnel profile: `growth_profile_runs:d75c9506-2df8-4485-b2d0-93249f9c0ceb`
- GA4 admin governance profile: `growth_profile_runs:6f38f31d-d51d-44eb-9427-108bb0ac616b`

Hermes transcreation artifact anti-rework proof:

- Transcreation task session: `878c9354-b3a7-4051-bc79-73713c29649b`
- Transcreation artifact: `7a1d5343-0f47-4e0c-b738-827d1eccefb5`
- Candidate: `ee691daa-a1dc-406d-b97b-b920fdef24a7`
- Quality gate: `pass=true`
- Blocking reason: `correlation:prior_active_same_entity_action:transcreation_merge:page:en-us:a2019510-c804-4717-be0f-dd95cebf2d5a`

This proves the correct behavior for a duplicate transcreation artifact: Hermes
can create a valid artifact, but Growth OS blocks materialization when an
equivalent active transcreation already exists.

Quality finding:

- The content chain is operationally certified, but the generated article is
  repetitive. Before mass content scaling, editorial gates should add
  non-repetition, brand-depth and useful-content scoring. This is a quality
  hardening follow-up, not a mutation-boundary failure.

### VPS Hermes sidecar production proof

On 2026-05-11 the hybrid runtime was validated directly on the Growth OS VPS
instead of local simulation.

- VPS release deployed: `09baf96fc7e34704dbedeb3d5b6dc80b152ad1e0`
- Runtime root: `/opt/growth-os/current`
- Docker service: `growth-orchestrator`
- Hermes profile: `growth-os-colombiatours`
- Deployment smoke: `runtime config smoke completed`, pass `true`
- Persisted SHA guard: `/opt/growth-os/.env` now records `GITHUB_SHA=09baf96fc7e34704dbedeb3d5b6dc80b152ad1e0`
- Fix commits:
  - `b8c24a92 fix(growth): persist runtime deploy sha on VPS`
  - `e988142f fix(growth): include transcreation IDs in Hermes artifacts`
  - `09baf96f fix(growth): cite agent context in Hermes sidecar artifacts`

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

Final VPS runtime health after local monitor shutdown:

- Open work items: `0`
- Open wakeups: `0`
- Open task sessions: `0`
- Scheduler heartbeat: `healthy`
- Heartbeat row: `24578b81-8495-4842-841e-8a3224cb6dd6`
- Heartbeat SHA: `09baf96fc7e34704dbedeb3d5b6dc80b152ad1e0`
- Last cycle id: `524f9de3-d033-4cfd-9009-867c0ff81e1d`
- Last cycle status: `completed`
- Follow-up recovery cycles:
  - `fbfa708f-d615-4131-ba78-9d96f5eb6f7c`, completed, no mutation
  - `524f9de3-d033-4cfd-9009-867c0ff81e1d`, completed, no mutation
- A one-shot brain cycle `7f3a03ec-0b4a-4dae-ba56-3de07f91d17e` hit a Supabase statement timeout while inserting a context snapshot. The next two cycles completed on the same deployed SHA, and all open wakeups/sessions were cleared.

Stale cleanup performed after controlled VPS restarts:

- Stale cycles marked failed:
  - `006c6e68-92df-4e98-bc24-999dc3128b06`
  - `606997df-034d-4b20-b5ba-5c0381585bad`
  - `9692fcd4-4843-4425-8149-18e6126949e1`
- Stale run marked stalled: `602bc090-1c07-491b-848e-c2668c6575e8`
- Stale work item blocked: `aba4ae42-a935-461e-9eb9-7bcfd35bda8b`
- Block reason: `stale_runtime_claim_recovered_missing_transcreation_contract`

Transcreation live merge proof:

- Code fix: `e988142f` included `source_entity_id`, `page_type` and `transcreation_job_id` in Hermes transcreation artifacts.
- Sidecar run: `bd5c0561-e351-4b50-b256-aae35162f83b`
- Provider analysis artifact: `a7b4ca39-e774-4e38-8156-e912c406ff15`
- Lane session: `e20933e4-845e-4f87-a5f9-0b89d8eb8254`
- Transcreation artifact: `bf78f317-96d5-4888-b992-814da5a0a983`
- Candidate: `0d9a162b-9571-4b6e-809c-ae030d1f98b5`
- Candidate anti-rework verdict: `correlation:prior_active_same_entity_action:transcreation_merge:page:en-us:a2019510-c804-4717-be0f-dd95cebf2d5a`
- Live merge job: `eea7efa1-3688-48c0-91ac-bd552b90e1b4`
- Work item: `444f667b-90a5-4fb2-bc57-1f29f9158751`
- Change set: `35dc1501-9f85-4e6b-bba7-976fe845dd62`
- Target: `seo_transcreation_jobs:70110fff-3b92-40f2-89cb-ab2804792b71`
- Target path: `page:en-US:a2019510-c804-4717-be0f-dd95cebf2d5a`
- Smoke status: `smoke_passed`
- Smoke checks: `locale_pair`, `meta_title_length`, `meta_description_length`, `quality_gate`, `overlay_present`
- Outcomes:
  - `09c5fcf7-728f-4fae-b7fc-5983e2096314`, measuring day 21
  - `f5143a25-016f-477b-a0f3-85ce0ebc92f6`, scheduled day 45
- Post-deploy daemon transcreation job: `42b7e7b5-d4d4-4ab4-bea5-7d3de94c23e1`, smoke `smoke_passed`, target `seo_transcreation_jobs:79866c9c-57b7-4910-8423-32ade776e5e3`.

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

Forbidden action production proof:

- Action: `24848423-8056-4784-9ade-55bbac28a9ee`
- Action class: `forbidden`
- Status: `blocked`
- Policy verdict: `sensitive_surface_hard_blocked`
- Mutation boundary: `growth_os_executor`
- Blocked surfaces: paid, pricing and outreach
- Result: no wakeup created and no public mutation attempted.

Cross-tenant failure proof:

- Attempt: mismatched account `00000000-0000-0000-0000-000000000000` for ColombiaTours website `894545b7-73ca-4dae-b76a-da5b6a3f8441`
- Result: denied with `hermes_tenant_scope_denied`
- Reason: `website_account_mismatch`

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

### Learning closed-loop proof

The production learning loop was closed with a real evaluated outcome:

- Evaluated outcome: `14410d79-a86d-49ea-ba63-5f9c6ebf7680`
- Draft memory created: `9be1209b-27f5-40f3-a49a-d0ffca3fadde`
- Replay case: `45517096-7530-4cd5-9677-a75c59b0a786`
- Replay agreement: `0.94`
- Memory status after approval: `active`
- Approved by: `13a23dde-997d-4038-a1cc-1d1114193259`

The next Hermes sidecar run cited the approved memory and active skills:

- Sidecar run: `1da18fab-bb2d-40af-ab93-c33db492aaca`
- Provider analysis artifact: `6249175c-1229-4118-9807-932faef7cd66`
- Task session: `17698c1d-38d9-4db7-8be7-808270183561`
- Lane artifact: `ffbae1a9-1211-4ad3-9807-fd4a9016bad0`
- Artifact type: `safe_apply_patch`
- `memory_reads`: `9be1209b-27f5-40f3-a49a-d0ffca3fadde`, `03f2b31c-c44b-4abd-b7be-bd63aef9c31a`
- `skill_reads`: `300abce1-ee46-4c41-990b-defcebc14755`, `8260a861-4fac-42ae-88b4-b4d56df83a31`

This proves `outcome -> memory/replay -> active memory -> later agent artifact cites memory/skill`.

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

Final regression rerun for all previously failed Growth OS UI cases:

```bash
GROWTH_OS_UI_E2E_ENABLED=true \
E2E_GROWTH_ROLE_FIXTURES_READY=true \
E2E_GROWTH_VIEWER_EMAIL=consultoria+growth-viewer@weppa.co \
E2E_GROWTH_CURATOR_EMAIL=consultoria+growth-curator@weppa.co \
E2E_GROWTH_ROLE_PASSWORD='[redacted]' \
npm run session:run -- \
  --project=chromium \
  --project=mobile-chrome \
  --grep "CEO cockpit|Role-gated actions|Append-only events|Run detail works|Run detail exposes|Experiments and Data Health|Mobile Growth OS surfaces"
```

Result: `15 passed`.

Production role fixtures used:

- Viewer: `consultoria+growth-viewer@weppa.co`, user `d4b132c1-f4f0-4915-9958-d183707807fa`
- Curator: `consultoria+growth-curator@weppa.co`, user `ce41b828-e59b-43fb-b2c2-823bc7267c49`
- Admin: `consultoria+growth-admin@weppa.co`, user `aff56987-c153-4d7f-8b13-4c6d3e5fa3b2`

## Unit And Type Evidence

- `npm run typecheck`: passed.
- Chief of Staff unit tests: 5 suites / 11 tests passed.
- Paperclip heartbeat v2 regression test: 1 suite / 5 tests passed.
- Hermes sidecar unit tests: 3 suites / 10 tests passed.

## Certification Verdict

Certified:

- Chief of Staff conversation ledger.
- Wakeup-first action routing.
- Wakeup coalescing.
- Editable agent company UI.
- Agent artifact validation/materialization.
- Hermes sidecar content artifact.
- Hermes sidecar transcreation artifact.
- Live `content_publish`, `safe_apply` and `transcreation_merge` through Growth OS executor.
- Forbidden action and cross-tenant blocking.
- Learning loop with later memory/skill citation.
- Growth OS executor-only mutation boundary.
- Session-pool E2E for Chromium and mobile Chrome.

Explicitly out of scope:

- Firefox E2E was skipped by operator instruction.
- Legacy Supabase RLS advisory remains outside this Epic.

Closeable issues: #482, #483, #484, #485, #486, #487, #488, #489 and #490.
