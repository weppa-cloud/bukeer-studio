# Growth OS Agentic Orchestrator 9+ Certification

Status: **PARTIALLY CERTIFIED, 24h MONITOR PENDING**

Scope: ColombiaTours production only.

Account: `9fc24733-b127-4184-aa22-12f03b98927a`<br>
Website: `894545b7-73ca-4dae-b76a-da5b6a3f8441`

## Executive Result

The agentic layer is live in front of the deterministic live-gated executor:

`brain reasoning -> context/memory/skills/outcomes -> candidates -> work items -> lane execution -> publication/apply -> smoke -> outcome -> learning context`

The executor remained the only public mutation boundary. Sensitive surfaces stayed blocked: paid, pricing, availability, reservations, payments, bulk CRM, outreach and experiment activation.

## Production Evidence

Window queried: from `2026-05-08T00:00:00Z`.

Valid smoke-passed live jobs, excluding placeholder targets and rolled back rows:

- `safe_apply`: 10
- `content_publish`: 8
- `transcreation_merge`: 9

Primary agentic cycles:

- `2666e431-a5bc-446a-8f7b-7228c233dba4` — `agentic-9-plus-real-targets-1`, completed, 10 claims, 6 evaluated outcomes, production mutation true.
- `233ea922-a21e-4866-95e7-7d32cc878ecf` — `agentic-9-plus-real-targets-2`, completed, 14 claims, 3 evaluated outcomes, production mutation true.

Latest decision ledger:

- `4a55fde0-f16d-44e3-8fce-1a5fc3ffb55b`
- Context snapshot: `71cb17f4-b75a-4b67-a237-7aa3229be05c`
- Type: `create_work`
- Confidence: `0.82`
- Created candidates: `14`
- Cited memory IDs: `9238a47e-8335-4e5e-b6fe-a3410fab79b1`, `06a9c521-ff28-48f5-aeec-6f55b8066ffa`, `828488fb-bac3-4089-a40c-5df8d6719536`
- Cited skill IDs: `300abce1-ee46-4c41-990b-defcebc14755`, `8260a861-4fac-42ae-88b4-b4d56df83a31`, `a4b3dd6c-830d-4cce-98ac-260e4889dcce`
- Cited outcome IDs: `d7c9c1ff-d2fe-4f52-b44c-2371debd1dd4`, `f3969fc7-b298-460d-ad47-9a76161b82a9`, `9e79d141-e621-4683-aca3-5129314b5c21`
- Sensitive blocked decision: `paid_mutation` on `paid_media`.

## Representative Live Jobs

Technical safe apply:

- `116977be-3e98-4681-a495-d45d6addb05d` -> `website_pages:1a6ad5ff-8e19-4c66-88e9-66500ecc589e`
- `e952c287-128b-47ce-ae61-8b79edd5914f` -> `website_pages:fd8c5e04-fc00-4eb8-a280-8e6b9561034c`
- `2b16e4fa-e8fb-4988-b9ea-c6fca69d3b8f` -> `website_pages:9256c0e5-96ef-4614-86a6-c6fc8a9f6d50`
- `a570a632-a644-4613-8b85-a67d2c66550f` -> `website_pages:12c4c948-21f5-443b-a89b-312c3e58662d`
- `2dca0d64-8b1f-48c9-9d5c-56a83001af7c`
- `aac42ca6-2eb0-4911-aa87-651cbdfefab7`
- `aca23812-d57f-4515-ab6c-1278ef7895b6`
- `f2ce6c1a-5552-4b32-952b-e11146cca6d5`
- `d634627b-bcf2-40c2-969c-e0f7484e0487`
- `59b06593-de17-4f68-999f-07b5aa42c64c`

Content publish:

- `d22352c3-10e2-409b-bd30-3055e16bfd02`
- `6da72ca4-489c-42c2-b27e-8485248142a0`
- `be9a6d05-fbd5-4d0b-8b97-5a008dd37e28`
- `70320235-7b64-4307-8e5a-28a2db25c98d`
- `74050492-240a-4385-aee6-6934dad26b2e`

Transcreation merge:

- `82598c0a-d8a0-4b5e-9ac2-aee024293bd7`
- `a7ab198d-46d6-47cf-b020-b2dd73f9c967`
- `73bfc915-dc32-4ccb-9d4f-ee63546b9c4e`
- `210bfea8-bdee-4daf-bcc0-2210bdf87928`
- `3467d671-858f-49ff-b94a-62ede869dcff`

## Outcome And Learning

Immediate technical outcomes evaluated:

- `32291cf9-e723-474c-ad77-358deb7ab941` — `inconclusive`, smoke pass true.
- `11c488d9-247d-414a-84f3-5ecfff26c1ba` — `inconclusive`, smoke pass true.
- `8dc0003f-72d4-42c0-9545-0f548e745f13` — `inconclusive`, smoke pass true.
- Prior won outcome: `afdc6b15-55fb-4b1c-91f7-cadd3fcb4d37`.

The later brain decision cited active memories, active skills and prior outcomes. This proves the learning context is read and used by the brain. Full closure from new evaluated outcomes into newly approved memories/skills remains admin-gated by design.

## Rollback Evidence

Dry rollback verification passed for job `d634627b-bcf2-40c2-969c-e0f7484e0487`:

- Target: `website_pages:93ed13f5-5e11-43a2-b06a-8bcf27e989f3`
- Restore field: `target_keyword`
- Current value: `cancellation colombia`
- Restore value: `null`
- Smoke result: pass, with field allowlist and type checks.

No destructive rollback was executed during this certification because the live jobs were valid and smoke-passed. The rollback payload is complete and directly executable.

## UI/E2E

Command:

```bash
GROWTH_OS_UI_E2E_ENABLED=true npm run session:run -- --grep "@growth-os-ui" --project=chromium --project=mobile-chrome
```

Result: `27 passed`, `2 skipped`, session pool slot `s1`, port `3001`.

Validated:

- CEO cockpit.
- Agents UI.
- Opportunities.
- Runs.
- Workboard.
- Run detail change sets.
- Rollback/audit evidence.
- Experiments and data health.
- Mobile no-overflow.
- Cross-tenant guard.
- Append-only events.

Firefox was not counted because the local Playwright Firefox binary is not installed in this machine.

## Implementation Notes

Key repo changes:

- Agentic contracts in `@bukeer/website-contract`.
- Agentic tables and RLS migration: `20260509120000_growth_agentic_orchestrator_9_plus.sql`.
- `runGrowthOrchestratorBrain` integrated before candidate discovery in `runGrowthOsProductionCycle`.
- Hermes-style context builder with memory, skills, outcomes, policies and prompt-injection scan.
- Paperclip-style wakeups, runtime state, task sessions and decision ledger.
- Brain now synthesizes real production targets from `website_pages` and `seo_transcreation_jobs`; placeholder transcreation fallbacks were removed.
- CEO cockpit now exposes Agentic Control data.
- Run detail UI now handles live adapter change sets without ambiguous headings and without missing follow-up text.

## Known Limits

- The 24h monitor is still running; this report should not be treated as final 24h clean certification until the monitor window completes.
- One earlier placeholder transcreation job was logged by the executor but did not touch a real row. It is excluded from the valid evidence count and the fallback was removed.
- Firefox E2E requires `npx playwright install firefox` on the machine before it can be part of the gate.

## 2026-05-10 DataForSEO Evidence-Governed Brain Addendum

Objective: close the provider-evidence gap found after the live run. Brain-created candidates and runtime execution must now cite DataForSEO feature evidence, and provider-dependent work must be blocked when evidence is missing, stale or cost-gated.

Implementation delivered:

- Added `SPEC_GROWTH_OS_DATAFORSEO_EVIDENCE_GOVERNED_BRAIN.md` and indexed it in `docs/INDEX.md`.
- Brain decisions now persist `provider_evidence_reads[]` and `evidence_fingerprints[]`.
- Brain-created candidates now persist `evidence.dataforseo_evidence`.
- Candidate idempotency now uses a compact deterministic hash, avoiding oversized keys.
- Materializer blocks provider-dependent candidates without valid DataForSEO evidence.
- Production cycle quality gate also blocks legacy provider-dependent work items without valid DataForSEO evidence.
- CEO cockpit and Workboard expose provider evidence in the UI.

Local validation on branch `dev`:

```bash
npm run typecheck
npm test -- --runTestsByPath __tests__/lib/growth/autonomy/dataforseo-provider-profile.test.ts __tests__/lib/growth/agentic/decision-materializer.test.ts __tests__/schema/growth-agentic-orchestrator.test.ts __tests__/lib/growth/autonomy/profile-freshness-gate.test.ts __tests__/lib/growth/autonomy/production-cycle.test.ts
npm run lint
GROWTH_OS_UI_E2E_ENABLED=true npm run session:run -- --project=chromium --grep "CEO cockpit loads|Workboard tab loads|Experiments and Data Health"
```

Results:

- Typecheck passed.
- Unit/integration focal tests passed: 5 suites, 22 tests.
- Lint passed with pre-existing warnings only.
- E2E session pool passed: 4 tests, slot `s1`, port `3001`.

Production dry-run:

- Cycle: `6f94335a-8ceb-4a8d-ac5c-dda94f8d6cd9`
- Decision: `6c1d1bc5-1fe4-4b83-9bda-dc7fd5926cb0`
- Context snapshot: `6db3393a-c8e7-4085-a772-d46e8bb76e81`
- Mutation performed: `false`
- Provider reads cited:
  - `onpage` — `excepted`, fingerprint `sha256:973581ef3c20ac4a63551d3e1b43d7c4af5958cc7dda535557d0359a58c2920b`
  - `serp` — `available`, 39 rows, fingerprint `sha256:569dba2214eab2df8cf3772662bb1db7e62c61960b74f25085ebc6b5ea37ffcd`
  - `labs_keywords` — `available`, 33 rows, fingerprint `sha256:935fe5140b6fb947552b57f14a89b71d73d6a6abf57562594918b642acf6c482`

Production live-gated cycle:

- Cycle: `8390e724-736c-4456-9f76-7b2a22a7674f`
- Decision: `e406a6a7-bac1-4294-ac3b-7c3aab898edd`
- Context snapshot: `f2564797-c7d3-46bd-9f7e-0496c9f6bb97`
- Candidates created by brain: `14`
- Task sessions created: `2`
- Candidates promoted: `3`
- Claims: `3`
- Applied: `1`
- Blocked by runtime evidence gate: `2`
- Production mutation performed: `true`

Applied live job:

- Publication job: `a7da01aa-18b7-4414-a8f6-7dcfd323035a`
- Work item: `60beb89a-56fa-4f6c-85bf-c558c4f958df`
- Change set: `6592e193-0fb7-4f52-a78c-603ff341c36c`
- Action: `content_publish`
- Status: `smoke_passed`
- Target: `website_blog_posts:38f6b2aa-dd0e-427e-a7cf-25b81cdb8777`
- Path: `/blog/brain-content-publish-viajes-personalizados-por-colombia-60beb89a`
- Outcome measuring: `b2959259-f82d-42fb-9a6f-bb1523a56298`, metric `organic_clicks:day_21`, evaluation date `2026-05-31`
- Outcome scheduled: `36d31699-2bc1-44a8-a3c7-4c5fad022e1c`, metric `organic_clicks:day_45`, evaluation date `2026-06-24`

Blocked legacy work:

- Change set `e8f8a2c8-41fe-4ae6-9112-e1e8415233ed`, work item `ef9c8edf-3a3c-40ed-adb3-55581fad0e81`, action `safe_apply`
- Change set `633eb1ff-b1b4-4e60-b8a6-c06153707d7b`, work item `98fdd9c0-2b6a-41a1-8344-85ed511a5008`, action `transcreation_merge`
- Block reason: `smoke:provider_evidence:dataforseo_evidence_missing`

Conclusion: the evidence-governed layer is now active in both creation and execution. New brain decisions cite DataForSEO provider reads; new provider-backed candidates carry explicit evidence; old work without evidence is blocked before mutation; valid provider-backed content can still publish through the live-gated executor with snapshot, smoke, rollback payload and outcome ledger.

### Legacy Queue Cleanup

After the runtime gate was active, the active queue still contained legacy provider-dependent work created before `dataforseo_evidence` became mandatory.

Cleanup executed in production for ColombiaTours:

- Scope: `growth_work_items` where `allowed_action_class in ('content_publish','transcreation_merge','safe_apply')`, status in `ready/running/review_needed`, and `evidence.dataforseo_evidence.required` was not true.
- Updated rows: `438`
- New status: `blocked`
- New progress label: `Blocked: missing DataForSEO evidence`
- New next action: regenerate from Growth CEO Brain with fresh DataForSEO evidence before live-gated execution.
- Ledger field added: `evidence.provider_evidence_cleanup`

Post-cleanup verification:

- Active provider-dependent work missing DataForSEO evidence: `0`
- Active provider-dependent work with DataForSEO evidence: `2`
- Remaining blocked legacy missing evidence: `603`

UI follow-up implemented:

- Workboard now exposes a `Falta DataForSEO` filter.
- Workboard cards show a danger badge when provider-dependent work lacks required evidence.
- Workboard summary shows a dedicated alert with a link to the filtered view.

## 2026-05-10 Deploy + Duplicate Content Gate Certification

Deployment path:

- `dev` pushed to GitHub at `686a34ce`.
- `main` fast-forwarded to `686a34ce`.
- GitHub Actions deploy run: `25625371507`, status `success`.
- Cloudflare Worker version: `02fb7bd6-13a8-4b97-ae5a-85b22e0797f7`.
- Runtime daemon restarted with `--git-sha=686a34ce`, `--max-claims-per-lane=3`, `--interval-ms=1800000`.
- Previous daemon running `f1fcb099` was stopped to avoid double execution.

GA4 advanced provider validation against ColombiaTours production property:

- GA4 property: `294486074`.
- `ga4_admin_governance_v1`: live success, `keyEvents=4`, `dataStreams=1`, `audiences=0`.
- `ga4_pivot_funnel_v1`: live success, `rows=10`.
- `ga4_realtime_smoke_v1`: live success, `rows=1`.

Controlled live-gated cycle after deploy:

- Cycle: `c98578d3-71e5-4cfe-8f28-4f48e97c6d79`
- Git SHA: `686a34ce`
- Status: `completed`
- Claims: `7`
- Applied: `1`
- Blocked: `6`
- Production mutation performed: `true`

Duplicate content gate proof:

- Work item blocked by runtime duplicate title gate: `d7dcae2f-aede-44ac-9efb-52948df0f036`
- Action: `content_publish`
- Runtime reason: `adapter_plan_error:duplicate_content_title:e7a7ba70-7631-45d7-ae6d-571647bf94a0:brain-content-publish-viajes-personalizados-por-colombia`
- Result: no additional blog post was published for the duplicated title.

Duplicate backlog/public content cleanup:

- Canonical post kept published:
  - `website_blog_posts:e7a7ba70-7631-45d7-ae6d-571647bf94a0`
  - slug: `brain-content-publish-viajes-personalizados-por-colombia`
- Duplicate posts changed from `published` to `draft`: `62`
- Duplicate posts were not deleted; each received `canonical_post_id` pointing to the canonical post and `robots_noindex=true`.
- Duplicate work items blocked: `3`
  - `0c6271be-5c50-43fa-a4cb-7b9df8988d4a`
  - `60beb89a-56fa-4f6c-85bf-c558c4f958df`
  - `e4e663d7-0c1a-469e-8586-a60bead1f01e`
- Duplicate candidate blocked: `437529c0-17b5-4fa2-8330-0d36876b74b0`

Post-cleanup verification:

- Published posts with title `Viajes personalizados por Colombia: como elegir una ruta con sentido`: `1`
- Draft duplicates with the same title: `62`

Conclusion: the duplicate-content failure mode is now blocked at the executor boundary and the existing public duplicate set has been reduced to one canonical published post without deleting production rows.
