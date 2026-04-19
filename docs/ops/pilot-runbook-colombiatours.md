# Pilot Runbook — ColombiaTours

**Tenant:** ColombiaTours (`colombiatours.travel`).
**Worker:** `bukeer-web-public`.
**Owner:** Release lead + Platform on-call.
**Status:** Active for EPIC [#214](https://github.com/weppa-cloud/bukeer-studio/issues/214) pilot cutover.
**Last updated:** 2026-04-19 (W7-a skeleton).

This runbook **cross-references and extends** four existing runbooks. It does **NOT** duplicate their content. Consult each linked runbook at the referenced step:

- [`product-landing-v1-runbook.md`](./product-landing-v1-runbook.md) — structural precedent (preflight / deploy / monitoring / rollback).
- [`release-gate-checklist.md`](./release-gate-checklist.md) — Go/No-Go automated gate.
- [`studio-editor-v2-rollback.md`](./studio-editor-v2-rollback.md) — Studio editor flag rollback L1–L4.
- [`ci-seo-i18n-gate.md`](./ci-seo-i18n-gate.md) — `@p0-seo` CI gate + nightly Worker preview.

Audience: on-call engineers, release lead, partner liaison, orchestrator. Training audience (partner Rol 2) reads [`docs/training/colombiatours-onboarding.md`](../training/colombiatours-onboarding.md) instead.

---

## 1. Scope snapshot (priority change v2 — 2026-04-19)

- **Translation** top priority — blog + packages + activities (hotels excluded from transcreate).
- **Editing** second — packages + activities Studio-editable; hotels Flutter-owner (SEO meta still editable in Studio).
- **Booking V1 DEFERRED** post-pilot — WhatsApp + phone CTAs only. See [[ADR-024]] + issue [#217](https://github.com/weppa-cloud/bukeer-studio/issues/217).
- **No rate-limit mitigation** required — client accepts direct transcreate API usage.

Full context: priority change v2 comment on EPIC [#214](https://github.com/weppa-cloud/bukeer-studio/issues/214).

---

## 2. Cutover checklist (imported)

Full checklist lives in [`cutover-checklist.md`](./cutover-checklist.md). Summary of sections:

1. Preflight (T-24 h) — 10 items (P-01 … P-10).
2. Cutover (T-0) — 8 items (C-01 … C-08).
3. Post-cutover (T+15 min) — 8 items (PC-01 … PC-08).
4. Rollback criteria — 6 triggers (R-01 … R-06).
5. Rollback sequence (≤ 5 min exec) — 8 steps (RB-01 … RB-08).
6. Post-rollback — 5 items (PR-01 … PR-05).
7. DNS TTL guidance.
8. SLA targets summary.
9. Sign-off template.

**Owner of each row + verification command / URL** is defined in the checklist file. Copy that checklist into the cutover-day artifact bundle.

**Booking-specific rows removed** per priority change v2. WhatsApp + phone CTA parity check stays (see PC-06 in `cutover-checklist.md`).

---

## 3. Preflight rule — no Flutter migration ±24 h

Hard constraint: **no Flutter migration may land in the ±24 h window around cutover.**

Rationale: the Supabase project is shared between Studio (Next.js) and Flutter admin. A Flutter-side schema change during the cutover window can silently break Studio SSR or Studio writes. Mitigation is coordination — the bukeer-flutter maintainers hold migrations while the pilot cutover is live.

Verification (preflight item P-02):
- Link to last commit of migrations in `weppa-cloud/bukeer-flutter` with timestamp.
- Cross-repo confirmation in `#pilot-colombiatours` or equivalent Slack channel before T-0.

Forward-only rule (general): **NEVER run `supabase migration down`** for Flutter migrations (`#752`, `#753`, `#754`). See `product-landing-v1-runbook.md` §8.3.

---

## 4. 48-h soak on staging

Mirrors `product-landing-v1-runbook.md` §3.2.

- Staging Worker with pilot-seeded ColombiaTours data must be green for 48 h before cutover.
- Monitor at T+5 min, T+1 h, T+4 h, T+24 h, T+48 h (KPIs from `product-landing-v1-runbook.md` §5).
- Soak may be waived (explicit decision + sign-off) if staging is not representative and direct ColombiaTours validation is performed — record rationale in the release-gate checklist appendix.

---

## 5. Rollback SLA targets

| Action | Target |
|--------|--------|
| Decision (release lead) | ≤ 10 min from first confirmed signal |
| Execution (`wrangler rollback`) | ≤ 5 min |
| Propagation (Worker) | ≤ 60 s |
| DNS propagation (with TTL 300 s) | ≤ 60 s |
| Partner comms post-rollback | ≤ 1 min |
| Post-mortem issue opened | ≤ 24 h |

Escalation chain: owner → platform on-call → release lead. See `product-landing-v1-runbook.md` §7 post-mortem triggers.

**DNS TTL policy:**
- Cutover day: ≤ 300 s on apex/CNAME.
- Post-soak (after T+24 h cadence): 3600 s.

**Worker rollback:** `npx wrangler rollback --name bukeer-web-public`. See `product-landing-v1-runbook.md` §8.

**Studio editor v2 flag rollback:** for editor-surface regressions (not Worker-level), follow [`studio-editor-v2-rollback.md`](./studio-editor-v2-rollback.md) L1–L4 **instead of** Worker rollback.

**Translation rollback:** revert to prior `Reviewed` state in Studio → public URL falls back to base locale until republish. No Worker rollback needed.

---

## 6. Post-cutover cadence

Mirrors `product-landing-v1-runbook.md` §10 closeout; expanded with partner-facing checkpoints.

### T+24 h

| Item | Owner | KPI |
|------|-------|-----|
| Error rate review | Platform | < 2% sustained |
| P95 TTFB review | Platform | < 1500 ms |
| CWV review (home + pkg + act + blog, es + en) | QA | Delta vs baseline ≤ 10 pts |
| Partner confirms first edit cycle post-cutover | Partner | Slack comment with slug |
| ISR revalidation working on sample | Platform | `POST /api/revalidate` success |

### T+7 d

| Item | Owner | KPI |
|------|-------|-----|
| Google Search Console indexing delta | SEO owner | > 80% of pilot URLs indexed |
| Organic impressions baseline vs WordPress pre-migration | SEO owner | No regression > 20% |
| Partner satisfaction check-in | Partner liaison | Comment on [#213](https://github.com/weppa-cloud/bukeer-studio/issues/213) |
| Coverage matrix drift alerts triaged | QA | 0 unresolved `error` alerts |
| Any follow-up P0 issues opened | Release lead | GitHub issue links |

### T+30 d

| Item | Owner | KPI |
|------|-------|-----|
| Organic ranking delta vs baseline | SEO owner | No regression on top-20 target keywords |
| Conversion tracking delta (WhatsApp CTA CTR) | Growth | Within ±30% of baseline |
| Formal ownership transfer (Studio) to partner | Release lead | Email / Slack confirmation archived |
| EPIC closeout | Orchestrator | Close #214 + #213 + sign-off comment on #207 |
| Post-mortem archived even if no incidents | Release lead | `docs/ops/post-mortem/pilot-colombiatours-cutover.md` |

---

## 7. Soft-freeze during screencast capture

Between screencast capture day (W7-c) and partner review session, **do not** land PRs that touch Studio editorial surfaces without a `screencast-refresh` ticket. This prevents the partner-facing training from drifting from the UI they will see live.

---

## 8. What NOT to do (runbook-level prohibitions)

Partner-facing list lives in `colombiatours-onboarding.md` §"Qué NO debes hacer". Ops-level additions:

1. **NO run `supabase migration down`** for any migration (Flutter or Studio). Forward-only policy.
2. **NO land Flutter migration in ±24 h cutover window.** Preflight §3.
3. **NO edit `websites.theme.tokens` JSON manually in the DB.** Use Studio or `@bukeer/theme-sdk` preset. CHECK constraint enforces v3 shape.
4. **NO run `npm run test:e2e` directly from any agent.** Use session pool (`npm run session:run`). Port 3000 is reserved for manual dev. See `.claude/rules/e2e-sessions.md`.
5. **NO `wrangler deploy` local for production.** All prod deploys go via CI for audit. See `product-landing-v1-runbook.md` §3.3.
6. **NO bypass `@p0-seo` gate** without written go from release lead + incident issue + post-mortem follow-up. See `ci-seo-i18n-gate.md` §Emergency bypass.
7. **NO expose date picker / lead form** — Booking V1 DEFERRED. See [[ADR-024]].
8. **NO edit hotel marketing/content in Studio** — Flutter-owner. See [[ADR-025]].

---

## 9. Evidence & artifacts

Per-cutover bundle: `artifacts/qa/pilot/YYYY-MM-DD/`.

- `lighthouse-baseline/` — preflight P-05.
- `cutover-smoke/` — cutover C-04 Playwright MCP outputs.
- `post-cutover-15min/` — PC-01 … PC-08 outputs.
- `cadence-24h/` · `cadence-7d/` · `cadence-30d/` — per-checkpoint notes.
- `incidents/` — if any rollback or degradation event.

Sign-off: `docs/qa/pilot/sign-off-YYYY-MM-DD.md` (template in `cutover-checklist.md` §Sign-off).

---

## 10. Related

- Parent EPIC: [#214](https://github.com/weppa-cloud/bukeer-studio/issues/214).
- Acceptance sibling: [#213](https://github.com/weppa-cloud/bukeer-studio/issues/213).
- Certification: [#207](https://github.com/weppa-cloud/bukeer-studio/issues/207).
- Matrix foundation: [[product-detail-matrix]] (pilot scope).
- Dependency gate: [[pilot-readiness-deps]].
- Partner-facing training: [`docs/training/colombiatours-onboarding.md`](../training/colombiatours-onboarding.md).
- Cutover checklist (standalone): [`cutover-checklist.md`](./cutover-checklist.md).
- Cross-repo bridge: [[cross-repo-flutter]].
- ADR references: [[ADR-007]] · [[ADR-011]] · [[ADR-016]] · [[ADR-019]] · [[ADR-020]] · [[ADR-021]] · [[ADR-023]] · [[ADR-024]] · [[ADR-025]].

---

## Changelog

- **2026-04-19** — Initial skeleton (W7-a). Cross-linked 4 existing runbooks; imported cutover checklist; documented DNS TTL guidance + preflight ±24 h rule; SLA target table; post-cutover cadence T+24h / T+7d / T+30d; soft-freeze rule; ops-level NOT-TO-DO list. Booking-specific rows removed per priority change v2. Screencasts + final Flow 6 Variant A / Flow 7 Variant B details deferred to W7-b + W7-c.
