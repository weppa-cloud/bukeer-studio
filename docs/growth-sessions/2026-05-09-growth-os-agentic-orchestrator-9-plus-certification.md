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
