# Learning run — Growth Agents Product Control Plane v1

- Pipeline ID: `growth-agents-control-plane-v1`
- Date: 2026-05-18
- Branch: `feat/growth-control-plane-phase0-v1`
- Commits: `d81eb74f` (Phase 0-1 contract schemas + safety gates), `3a520325` (explicit locale/market context gate fix)
- GitHub issue: #569 planned/trace target — GitHub CLI auth unavailable in this environment
- Pilot tenant: ColombiaTours (`website_id=894545b7-73ca-4dae-b76a-da5b6a3f8441`)
- Task IDs: `t_fbd79615` T0, `t_cca5a20d` T1, `t_d0ebbecc` T2, `t_d4bc71d0` T3, `t_82e98c3e` T4, `t_9832c334` T5, `t_8bba007f` T6

## Outcome

PASS_WITH_WATCH: the product boundary and executable contract were materialized through T6. The run produced Supabase control-plane contracts, worker/context-packet schemas, a worker contract runbook, a cleaned locale/market gate in `context-builder.ts`, and QA evidence for the ColombiaTours mock canary path.

Watch items remain:

1. Root `npm run typecheck` could not run in this worktree because root dependencies were unavailable (`tsc: not found`). `packages/website-contract` build passed.
2. GitHub issue/PR automation is pending because `gh` auth was unavailable in this environment.
3. Several worker profiles hit response-truncation/tool-call loops; Neo applied governed operator recovery and recorded evidence in Kanban.

## Delivered artifacts

- `docs/ops/growth-agents-product-control-plane.md`
- `docs/specs/generated/growth-agents-product-control-plane-supabase-contracts.md`
- `docs/ops/growth-worker-contract.md`
- `packages/website-contract/src/schemas/growth-profile-base.ts`
- `packages/website-contract/src/schemas/growth-context-packet.ts`
- `packages/website-contract/src/schemas/growth-agent-resolution.ts`
- `packages/website-contract/src/index.ts`
- `lib/growth/agentic/context-builder.ts`
- `docs/specs/generated/growth-agent-profile-base-design-20260516.md`
- `docs/specs/generated/growth-profile-loading-architecture-roadmap-20260516.md`
- `docs/plans/profile-loading-architecture-implementation-plan-20260516.md`
- `docs/INDEX.md`

## Gates and evidence

- T0 SPEC: completed. Converted the high-level control-plane doc into field-level Supabase contracts for six governance tables.
- T1 PLAN GATE: PASS. Validated the Bukeer Studio/Supabase product boundary and the Neo/Hermes beta-only role.
- T2 DESIGN/IMPLEMENT: PASS. Materialized contract schemas and safety-gate docs in clean worktree. First developer/Codex attempt failed due missing credentials; recovered by reassigning to tool-capable `tech-validator` for docs/contracts-only work.
- T3 ARCH GATE: PASS_WITH_WATCH. Package build passed. Operator gate found and fixed a remaining implicit `es-CO`/market fallback in `context-builder.ts` and removed a doc typo in `growth-worker-contract.md`.
- T4 QA: PASS. Mock ColombiaTours context-packet simulation confirmed blocking behavior for missing source refs/freshness/permissions/locale-market and safe path for explicit `es-CO -> pt-BR / BR` packet.
- T5 OPS: completed no-deploy handoff. Branch/commit trace recorded; no provider calls, no mass publish, no deploy.
- T6 LEARNING: this document plus index/fact/skill materialization.

## Key decisions reinforced

1. Growth Agents are a Bukeer Studio product capability, not permanent Hermes profiles.
2. Supabase/Bukeer Studio is the product control plane and operational SSOT for account plans, capabilities, provider policies, context packets, source refs, freshness, outcomes, cadences, costs, and backlog policy.
3. Neo/Hermes is beta intelligence/orchestration only. Future Growth Agents runtime can be Hermes-like, but must be independent and restricted by account/profile/lane/policy.
4. Workers consume `ContextPacket` only. They must not call providers directly or research provider-backed facts on their own.
5. Context building must block on missing `source_refs`, freshness, permissions, provider policy, and exact locale/market.
6. Locale/market resolution is `exact match -> explicit allowed fallback -> BLOCKED`; implicit `es-CO/CO` fallback is forbidden.
7. ColombiaTours canary remains one explicit `es-CO -> pt-BR / BR` entity, no mass publish.

## Failures and recoveries

- **Codex credential gap:** `developer` profile could not run because Codex credentials were missing. Recovery: T2 reassigned to `tech-validator` for contract-only implementation.
- **Response truncation/tool-call loops:** T1 initial run, T3, and T6 learning-curator hit malformed todo/tool-call loops and output truncation. Recovery: Neo reclaimed orphaned runs, tightened prompts, or performed operator verification/materialization with evidence.
- **Root dependency gap:** root typecheck failed with `tsc: not found`; package-level `@bukeer/website-contract` build passed.
- **GitHub auth gap:** T5 recorded handoff instead of opening/updating issue/PR through `gh`.

## Reusable patterns

1. **Control-plane-first Growth Agent design:** before expanding workers, define account plan, capability, runtime profile, provider access, refresh, backlog priority, context packet, and outcome contracts.
2. **Context Packet as only operational input:** workers should block and emit `DATA_NEED`/outcome records instead of calling providers directly.
3. **No hidden locale defaults:** multi-locale Growth/Transcreation tasks must require explicit source locale, target locale, and target market.
4. **Operator recovery for model/tool-loop failures:** when a worker hits repeated response truncation before a verdict, reclaim the run, record the failure, tighten/patch the task body, or perform a focused operator gate with commands and commits.
5. **T6 must materialize, not just summarize:** learning is complete only when it updates repo learning docs/index, persistent facts, and relevant skills/patterns.

## Learning candidates

- `skill_patch`: add response-truncation/operator recovery pattern to `bukeer-development-pipeline` and/or `kanban-worker`.
- `fact_store`: persist the durable Growth Agents control-plane decision and explicit locale/market gate.
- `github_followup`: create/update #569 when GitHub auth is available with branch `feat/growth-control-plane-phase0-v1`, commits `d81eb74f` and `3a520325`, and no-deploy status.
- `followup_task`: install/verify root dependencies in clean worktree and run full `npm run typecheck` before PR merge.
- `followup_task`: review `normalizeGrowthLocale` defaults in other transcreation paths; this run hardened `context-builder.ts`, not every caller globally.

## Materialized to

- Repo doc: this file.
- Index: `docs/ai/learning-runs/index.jsonl` and `docs/INDEX.md`.
- Kanban: `t_8bba007f` completion metadata.
- Persistent fact store: Growth Agents Product Control Plane v1 decision.
- Skills: Bukeer development pipeline recovery pattern patched by Neo after the run.
