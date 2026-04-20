# Pilot handoff — ColombiaTours 2026-04-20

Autonomous orchestration complete. Remaining path = human + ops execution per step-by-step docs below.

## Status snapshot

```
EPICs open  #214 Pilot Readiness · #213 Pilot Acceptance QA · #221 W7 training
EPICs deps  #234 cross-repo RPC (non-blocker)
Main HEAD   ec381ae (Stage 6 final revalidation)
Flag prod   studio_editor_v2 enabled ColombiaTours 2026-04-20 14:09 UTC
DDL prod    W2 activities parity + multi-locale applied 2026-04-20
```

## Steps (sequential)

| # | Step | Owner | Eta | Doc |
|---|------|-------|-----|-----|
| 1 | Cluster F residuales autonomous | agente (en curso) | ~2h | (rsc background) |
| 2 | Ops env vars pilot session | ops-lead | 30min | [paso-2-ops-env-vars.md](paso-2-ops-env-vars.md) |
| 3 | Partner data-fill 2 picks | partner ColombiaTours | 4-8h | [paso-3-partner-data-fill.md](paso-3-partner-data-fill.md) |
| 4 | Flow 1 walkthrough + Lighthouse AC-A5 | QA-lead + partner | 2-3h | [paso-4-flow1-walkthrough.md](paso-4-flow1-walkthrough.md) |
| 5 | W7-c Loom screencasts | QA-lead | 2h | [paso-5-w7c-screencasts.md](paso-5-w7c-screencasts.md) |
| 6 | Sign-offs AC-X4a + AC-X4b | partner + QA-lead | 1h async | [paso-6-sign-offs.md](paso-6-sign-offs.md) |
| 7 | DNS cutover Stage 7 | ops-lead + QA + partner | 30min + 2h watch | [paso-7-dns-cutover.md](paso-7-dns-cutover.md) |

Total wall-clock: **2-3 días** con paralelismo partner+QA+ops.

## Parallel lanes

```
Día 1 AM:  Paso 1 (agente F)  + Paso 2 (ops)              — 2 tracks
Día 1 PM:  Paso 3 (partner data fill)                     — solo track partner
Día 2 AM:  Paso 4 (walkthrough) + Paso 5 (screencasts)    — 2 tracks QA
Día 2 PM:  Paso 6 (sign-offs async)                       — 3 tracks
Día 3 off: Paso 7 (cutover)                               — 1 track + watch
```

## Blockers per step

| Step | Blocks until |
|------|--------------|
| 2 | Paso 4 (walkthrough needs env vars for isr-revalidate specs) |
| 3 | Paso 4 (walkthrough needs real data) |
| 1 (Cluster F) | Paso 4 optional (nicer results; not hard blocker) |
| 4 + 5 | Paso 6 (sign-off needs Flow 1 + training evidence) |
| 6 | Paso 7 (cutover needs partner GO comment) |

## Shipping PRs (cluster history)

| PR | Cluster | Date |
|----|---------|------|
| #225 | W1 detail-* testids | 2026-04-19 |
| #227 | W1 matrix refresh | 2026-04-19 |
| #229 | W2 activities parity | 2026-04-19 |
| #230 | W7-a runbook | 2026-04-19 |
| #231 | #226 Recovery Gate P0 | 2026-04-19 |
| #232 | #226.A fixes | 2026-04-19 |
| #233 | #226.B seed | 2026-04-19 |
| #235 | #226 firefox VideoObject skip | 2026-04-20 |
| #237 | W4 pilot-seed + editor→render | 2026-04-20 |
| #238 | W5 transcreate lifecycle | 2026-04-20 |
| #239 | W6 matrix visual + Lighthouse | 2026-04-20 |
| #241 | W7-b training Flows 6/7/8 | 2026-04-20 |
| #242 | Stage 6 autonomous baseline | 2026-04-20 |
| #243 | Cluster A transcreate fixes | 2026-04-20 |
| #244 | Cluster D validation | 2026-04-20 |
| #245 | Cluster C turbopack | 2026-04-20 |
| #246 | Cluster B matrix render | 2026-04-20 |
| #247 | Cluster E middleware locale /site/ | 2026-04-20 |
| #248 | Stage 6 FINAL revalidation | 2026-04-20 |
| #249+ | Cluster F (en curso) | 2026-04-20 |

## Cross-repo dependencies

- **#234** (bukeer-flutter) — extend `get_website_product_page` RPC to JOIN `package_kits.video_url` + `video_caption` → unlocks VideoObject JSON-LD active pass. **Non-blocker pilot**; post-cutover follow-up.

## Emergency contacts

Listar en [paso-7-dns-cutover.md](paso-7-dns-cutover.md) tabla de on-call.

## Runbook reference

[`docs/ops/pilot-runbook-colombiatours.md`](../pilot-runbook-colombiatours.md) — master runbook con rollback, health checks, escalation paths.

## Training reference

[`docs/training/colombiatours-onboarding.md`](../../training/colombiatours-onboarding.md) — partner onboarding Flows 1-8 + FAQ + cheat-sheet (W7-a + W7-b shipped; W7-c video embeds pending Paso 5).

## Sign-off artifacts

- `docs/qa/pilot/sign-off-2026-04-20.md` — autonomous Stage 6 sign-off (shipped)
- `docs/qa/pilot/colombiatours-matrix-2026-04-20.md` — matrix coverage report (shipped)
- `docs/qa/pilot/flow-1-walkthrough-2026-04-20.md` — pending Paso 4
- `docs/qa/pilot/post-w2-apply-validation-2026-04-20.md` — Cluster D apply verify (shipped)
- `artifacts/qa/pilot/2026-04-20/` — JSON reports + manifests (gitignored, local only)
