# Learning Run — Growth Control Plane Phase 2 Source Refs + Safe QA

Date: 2026-05-18
Pipeline ID: `growth-control-plane-phase2-source-refs-safe-qa`
Branch: `feat/growth-control-plane-phase0-v1`
PR: https://github.com/weppa-cloud/bukeer-studio/pull/570
Outcome: `PASS_WITH_DATA_NEED / PASS_BLOCKED_EXPECTED / PASS_NO_DEPLOY_NO_PROD_APPLY`

## Goal

Continue after Phase 1 by creating a safe Phase 2 lane that:

1. Defines fact-level source reference resolution.
2. Prevents QA/data-audit workers from accessing privileged secrets.
3. Implements a dry-run resolver with tests.
4. Re-audits ColombiaTours `pt-BR / BR` readiness.
5. Re-runs the canary as dry-run/no-publish.

## Tasks

- T0 `t_79b4fc96` — SPEC: source refs resolver + safe QA sandbox — `done`
- T1 `t_21b044fe` — PLAN GATE — `done`
- T2 `t_d006117d` — IMPLEMENT dry-run resolver/tests — `done`
- T3 `t_72f7250c` — CODE GATE — `done`
- T4 `t_119d2649` — DATA AUDIT DRY-RUN — `done`
- T5 `t_165a9ce9` — CANARY DRY-RUN — `done`
- T6 `t_621067a5` — OPS HANDOFF — `done`
- T7 `t_8d683899` — LEARNING — `done`

## Commits

- `c66d98ee` — `docs(growth-control-plane): define phase2 source refs and safe qa spec`
- `53ffcb0c` — `docs(growth-control-plane): validate phase2 source refs plan gate`
- `f5583305` — `feat(growth-control-plane): add source ref dry-run resolver`
- `d38344f4` — `docs(growth-control-plane): validate phase2 resolver code gate`
- `4d3e10b4` — `docs(growth-control-plane): audit phase2 ColombiaTours source refs`
- `25f88ee4` — `docs(growth-control-plane): rerun phase2 ptbr canary gate`
- `b4456f34` — `docs(growth-control-plane): add phase2 ops handoff`

## Artifacts

- `docs/specs/SPEC_GROWTH_CONTROL_PLANE_PHASE2_SOURCE_REFS_SAFE_QA.md`
- `docs/ops/growth-safe-qa-sandbox.md`
- `lib/growth/agentic/source-ref-resolver.ts`
- `__tests__/lib/growth/agentic/source-ref-resolver.test.ts`
- `docs/validation/t1-phase2-source-refs-safe-qa-plan-gate-2026-05-18.md`
- `docs/validation/t2-phase2-source-ref-resolver-dry-run-2026-05-18.md`
- `docs/validation/t3-phase2-source-ref-resolver-code-gate-2026-05-18.md`
- `docs/validation/t4-phase2-colombiatours-source-refs-resolution-dry-run-2026-05-18.md`
- `docs/validation/t5-phase2-colombiatours-ptbr-contextpacket-canary-2026-05-18.md`
- `docs/validation/t6-phase2-ops-handoff-2026-05-18.md`

## Key learning

### 1. Provider/cache refs are not autonomy-grade evidence

Provider/cache refs can be useful audit breadcrumbs, but they are not enough to run autonomous ContextPackets. The resolver must classify them as unresolved or external until they are normalized into verified `growth_signal_facts`.

### 2. A blocked canary is a successful safety gate

ColombiaTours `pt-BR / BR` still has:

- 6/6 profiles without refs,
- 0 pt-BR facts,
- 0 BR-market facts,
- no run-level `growth_signal_facts:*` refs.

So `PASS_BLOCKED_EXPECTED` is correct.

### 3. QA needs constrained evidence, not broad credentials

Growth QA/data-audit/canary workers should validate behavior against committed fixtures, tests, docs, and redacted read-only evidence. They should not receive privileged DB credentials or full environment files.

### 4. Resolver should stay pure until data mapping is solved

The first useful implementation is a pure dry-run resolver and tests. Integrating it into production ContextPacket generation should wait until the data mapping/backfill lane is approved.

## Validation

- `source-ref-resolver` tests: 7/7 PASS
- `NODE_OPTIONS="--max-old-space-size=4096" npm run typecheck`: PASS
- `npm run ai:check`: PASS
- `cd packages/website-contract && npm run build`: PASS

## Follow-ups

1. Build an approved provider-runner normalization lane that writes `growth_signal_facts` for `pt-BR / BR`.
2. Create a constrained QA profile/lane that does not inherit broad env/secrets.
3. Re-run source refs audit after facts exist.
4. Re-run canary only after T4 can produce verified fact refs.
5. Keep PR #570 unmerged until human review/approval because merge to main may trigger deploy.
