# Cutover Checklist — ColombiaTours Pilot

Standalone, reusable checklist imported into [`pilot-runbook-colombiatours.md`](./pilot-runbook-colombiatours.md) §5.1. Can be copied per-tenant for future pilots (adjust tenant-specific values at the top).

**Pilot tenant:** ColombiaTours (`colombiatours.travel`).
**Worker:** `bukeer-web-public`.
**Related runbooks (do NOT duplicate — see them for full detail):**
- [`product-landing-v1-runbook.md`](./product-landing-v1-runbook.md) — structural precedent (preflight / deploy / monitoring / rollback).
- [`release-gate-checklist.md`](./release-gate-checklist.md) — Go/No-Go automated gate.
- [`studio-editor-v2-rollback.md`](./studio-editor-v2-rollback.md) — Studio editor flag rollback L1–L4.
- [`ci-seo-i18n-gate.md`](./ci-seo-i18n-gate.md) — `@p0-seo` CI gate + nightly Worker preview.

> **Booking-specific rows removed per priority change v2 (2026-04-19).** Booking V1 is DEFERRED post-pilot. WhatsApp + phone CTA parity stays.

---

## Preflight — T-24 h

Owner: **Release lead** unless noted.

| # | Item | Owner | Verification |
|---|------|-------|--------------|
| P-01 | DNS TTL lowered to **300 s** on `colombiatours.travel` apex + CNAME | Platform | `dig colombiatours.travel +short` + `dig A colombiatours.travel` TTL column |
| P-02 | No Flutter migration scheduled in the ±24 h window | Cross-repo lead | Link to last commit of migrations in `weppa-cloud/bukeer-flutter` with timestamp |
| P-03 | On-call staffed (platform + release lead + partner liaison) | Release lead | Names posted in `#pilot-colombiatours` |
| P-04 | Worker `bukeer-web-public` current deploy verified green | Platform | `npx wrangler deployments list --name bukeer-web-public` — top entry matches `main` HEAD |
| P-05 | Lighthouse baseline captured (home + pkg detail + act detail + blog detail, es + en) | QA | Artifact link to `artifacts/qa/pilot/<date>/lighthouse-baseline/` |
| P-06 | Pilot seed `pilot-colombiatours-*` clean in staging | QA | `cleanupPilotSeed` log green; zero stale rows |
| P-07 | Partner Slack channel `#pilot-colombiatours` active with partner + oncall + release lead | Release lead | Channel member list |
| P-08 | Release-gate checklist fully signed off | Release lead | `release-gate-checklist.md` all boxes ticked |
| P-09 | Rollback command verified in staging (`npx wrangler rollback --name bukeer-web-public` dry-run) | Platform | Staging incident log entry with elapsed time |
| P-10 | Comms template (pre-deploy) posted in partner channel | Release lead | Slack link |

---

## Cutover — T-0

Owner: **Release lead** + **Platform on-call**.

| # | Item | Owner | Verification |
|---|------|-------|--------------|
| C-01 | Final Go/No-Go call — all preflight rows ticked | Release lead | Comment on #213 + Slack |
| C-02 | DNS change executed (`colombiatours.travel` A/CNAME → Worker) | Platform | `dig` + `curl -I https://colombiatours.travel` → 200 |
| C-03 | Worker `bukeer-web-public` serves `colombiatours.travel` | Platform | `curl -s https://colombiatours.travel | head -3` + `cf-ray` header present |
| C-04 | Smoke tests via Playwright MCP (home, 1 pkg, 1 act, 1 blog, `/en/` variants) | QA | Smoke artifacts saved to `artifacts/qa/pilot/<date>/cutover-smoke/` |
| C-05 | JSON-LD probe on 4 content types | QA | `curl -s https://colombiatours.travel/paquetes/<slug> \| grep -c 'application/ld+json'` ≥ 1 |
| C-06 | Sitemap reachable | QA | `curl -s https://colombiatours.travel/sitemap.xml \| xmllint --noout -` |
| C-07 | `robots.txt` + `llms.txt` reachable | QA | `curl -I https://colombiatours.travel/robots.txt` 200 |
| C-08 | Partner Slack notified — deploy started | Release lead | Slack message (template §6.2 of `product-landing-v1-runbook.md`) |

---

## Post-cutover — T+15 min

Owner: **Platform on-call**.

| # | Item | Owner | Verification |
|---|------|-------|--------------|
| PC-01 | Traffic rate on Worker nominal (no drop, no spike anomaly) | Platform | CF Observability dashboard link |
| PC-02 | Worker 5xx rate < 1% | Platform | `npx wrangler tail bukeer-web-public --status=error` for 5 min |
| PC-03 | P95 TTFB < 1500 ms | Platform | CF Observability |
| PC-04 | Core Web Vitals sample (home + pkg detail, mobile + desktop) | QA | Lighthouse vs baseline (P-05) — delta ≤ 10 pts |
| PC-05 | Search Console inspection sample (home + 1 pkg + 1 act + 1 blog, es + en) | SEO owner | `mcp__search-console__inspection_inspect` output saved |
| PC-06 | WhatsApp CTA + phone CTA parity check on pkg + act | Partner | Manual click → WhatsApp deep-link opens with correct number |
| PC-07 | ISR revalidation working | Platform | `POST /api/revalidate` to 1 known slug + verify response in < 60 s |
| PC-08 | Partner confirms first edit cycle on Studio post-cutover | Partner | Slack confirmation with slug + timestamp |

---

## Rollback criteria — any breach = decide rollback

Owner: **Release lead** (decision) + **Platform** (execution).

| # | Criterion | Threshold |
|---|-----------|-----------|
| R-01 | Worker error rate sustained 5 min | > 2% |
| R-02 | P95 TTFB sustained 5 min | > 3 s |
| R-03 | Search Console "Could not fetch" on inspection sample | > 20% |
| R-04 | Partner reports blocking critical issue | Any confirmed blocker |
| R-05 | Missing JSON-LD on any content type | Any miss |
| R-06 | Broken WhatsApp/phone CTA deep-link | Any type |

If any criterion fires → **decide rollback within 10 min**.

---

## Rollback sequence — ≤ 5 min execution

Owner: **Platform on-call**.

| # | Step | Target time | Command / action |
|---|------|-------------|------------------|
| RB-01 | Decision call by release lead | ≤ 10 min from signal | Slack announcement + record trigger |
| RB-02 | Partner comms (template §6.4 of `product-landing-v1-runbook.md`) | ≤ 1 min | Slack post |
| RB-03 | Worker rollback | ≤ 2 min | `npx wrangler rollback --name bukeer-web-public` |
| RB-04 | DNS revert (if DNS cutover is what introduced the regression) | ≤ 2 min | Cloudflare DNS panel → revert to prior A/CNAME |
| RB-05 | Cache purge (CF + Vercel edge if dirty) | ≤ 1 min | CF dashboard → Purge custom URLs |
| RB-06 | Verify rollback (curl + Lighthouse quick) | ≤ 2 min | `curl -I https://colombiatours.travel` + spot-check page |
| RB-07 | Revalidate ISR with rolled-back build | ≤ 1 min | `bash scripts/revalidate-all-tenants.sh` |
| RB-08 | Post-mortem issue opened | ≤ 24 h | GitHub issue with `post-mortem` label + runbook link |

**Studio editor v2 misbehavior:** if the trigger is a flag-level Studio editor issue (not Worker), do **NOT** run Worker rollback. Follow [`studio-editor-v2-rollback.md`](./studio-editor-v2-rollback.md) L1–L4 instead.

**Translation rollback:** revert to prior `Reviewed` state in Studio; public URL falls back to base locale until republish. No Worker rollback needed.

---

## Post-rollback — within 30 min

| # | Item | Owner | Verification |
|---|------|-------|--------------|
| PR-01 | Partner notified of rollback outcome | Release lead | Slack |
| PR-02 | `curl -I https://colombiatours.travel` returns 200 | Platform | Command output |
| PR-03 | ISR refreshed all tenants | Platform | Script log green |
| PR-04 | Post-rollback checklist from `product-landing-v1-runbook.md` §8.4 completed | Platform | Runbook link |
| PR-05 | Post-mortem issue opened + linked to this runbook | Release lead | Issue URL |

---

## DNS TTL guidance

| Phase | TTL | Rationale |
|-------|-----|-----------|
| T-24 h to T+24 h | **300 s (5 min)** | Fast rollback window; DNS revert propagation ≤ 5 min |
| T+24 h onwards (soak complete) | **3600 s (1 h)** | Normal resolver cache; cost of rollback acceptable |

Raise TTL back to 3600 s only after the +24 h cadence checkpoint passes.

---

## SLA targets — summary

| Action | Target |
|--------|--------|
| Rollback decision | ≤ 10 min from first confirmed signal |
| Rollback execution (`wrangler rollback`) | ≤ 5 min |
| DNS propagation (with TTL 300 s) | ≤ 60 s |
| Partner comms post-rollback | ≤ 1 min |
| Post-mortem issue opened | ≤ 24 h |

---

## Sign-off (per cutover instance)

| Role | Name | Date | Status |
|------|------|------|--------|
| Release lead |  |  |  |
| Platform on-call |  |  |  |
| QA lead |  |  |  |
| Partner (ColombiaTours) |  |  |  |

File a copy of this completed checklist under `docs/qa/pilot/sign-off-YYYY-MM-DD.md` per cutover (or rollback) event.

---

## Stage → Flow verification map (EPIC #214 W1→W6 deliverables)

Added W7-b (2026-04-20) to map shipping stages to training Flows + acceptance verification. Complement to preflight / cutover / post-cutover rows above. Use on cutover day to assert each shipped capability is exercised at least once.

| Stage | Wave / Issue | PR | Deliverable | Training Flow(s) | Verification row |
|-------|--------------|-----|-------------|------------------|------------------|
| Stage 1 | W1 #215 | [#225](https://github.com/weppa-cloud/bukeer-studio/pull/225) + [#227](https://github.com/weppa-cloud/bukeer-studio/pull/227) | Matrix pkg+act editable + Section P blog + hotels as-is + testid instrumentation | Flow 1 (pkg mkt), Flow 5.c (blog), Flow 6 (act), Flow 7 (hotel) | `/dashboard/<id>/products` lists pkg + act; hotel detail read-only |
| Stage 2 | W2 #216 | [#229](https://github.com/weppa-cloud/bukeer-studio/pull/229) | Activities marketing parity — RPC `update_activity_marketing_field` + routes + editors | Flow 6 (Variant A) | Edit an activity marketing field → persists + reflects in public `/actividades/<slug>` ≤ 60 s |
| Stage 2 | W3 #217 | — (DEFER) | Booking V1 scope decision → DEFER | Flow 2 (DEFER note) | WhatsApp + phone CTAs visible on pkg + act detail (PC-06 in preflight table) |
| Stage 4 | W4 #218 | [#237](https://github.com/weppa-cloud/bukeer-studio/pull/237) | pilot-seed variant-factory + editor→render E2E | Flows 1, 3, 6 (editor surface) | `activity-parity.spec.ts` + `package-parity.spec.ts` green in CI |
| Stage 4 | W5 #219 | [#238](https://github.com/weppa-cloud/bukeer-studio/pull/238) | Transcreate lifecycle E2E (pkg + act + blog; hreflang + canonical + inLanguage) | Flows 5.a / 5.b / 5.c + Flow 8 | `/en/paquetes/<slug>`, `/en/actividades/<slug>`, `/en/blog/<slug>` render applied variants with `<html lang="en">` + hreflang triple |
| Stage 4 | W6 #220 | [#239](https://github.com/weppa-cloud/bukeer-studio/pull/239) | Matrix visual playbook — Playwright MCP + Lighthouse snapshots | Flows 1, 3, 4, 5, 6, 7 (UI parity) | Matrix visual E2E baseline present in `artifacts/qa/pilot/<date>/matrix-visual/` |
| Stage 5 | W7-a | [#230](https://github.com/weppa-cloud/bukeer-studio/pull/230) | Onboarding skeleton (Flows 1-5) + pilot runbook + cutover checklist | Flows 1-5 | `docs/training/colombiatours-onboarding.md` + `docs/ops/pilot-runbook-colombiatours.md` + this file exist |
| Stage 5 | W7-b | (this) | Training extension: Flows 6/7/8 + FAQ expansion + cutover Stage map | Flows 6, 7, 8 | Sign-off: partner has read Flows 6 + 7 + 8 before cutover T-0 |
| Stage 5 | W7-c | pending | Screencasts | Flows 1-8 | **Deferred** — placeholder `{{screenshot-placeholder}}` markers in `colombiatours-onboarding.md` replaced post-UI-freeze |

### Per-flow cutover day verification

Add to cutover-day artifact bundle. Each flow must have at least one executed verification row before sign-off.

| Flow | Minimum verification | Owner | Evidence |
|------|---------------------|-------|----------|
| Flow 1 — Pkg marketing | Edit 1 pkg description + cover → public URL reflects ≤ 60 s | Partner | Slug + screenshot |
| Flow 2 — Booking DEFER | WhatsApp CTA click opens correct number on 1 pkg + 1 act | Partner | `whatsapp_cta_click` event in GA4 |
| Flow 3 — Layout | Reorder 2 sections on 1 pkg; hide 1 section → public reflects | Partner | URL + screenshot |
| Flow 4 — SEO per-page | Override meta title on 1 pkg → `<title>` in HTML matches | Partner | `curl -s <url> \| grep '<title>'` |
| Flow 5 — Translation | Apply 1 pkg + 1 act + 1 blog → `/en/...` URLs render | Partner | 3 URLs + `<html lang="en">` grep |
| Flow 6 — Activity Variant A | Edit 1 activity marketing field + 1 content field → public reflects | Partner | URL + screenshot |
| Flow 7 — Hotel Flutter handoff | Open 1 hotel in Studio → editors disabled + banner Flutter-owner; edit SEO meta succeeds | Partner | Screenshot + updated `<title>` |
| Flow 8 — SEO transcreate | 1 drift re-apply OR 1 bulk apply of 2 items → variants return to `applied` | Partner | `seo_localized_variants.status` query snapshot |

### Booking-row exclusions (priority v2)

Removed rows — do NOT re-add unless Booking V1 un-DEFER-s:

- ~~Date picker smoke (pkg + act)~~ — Booking DEFERRED, [[ADR-024]].
- ~~Lead form submit smoke~~ — endpoint `/api/leads` inactive.
- ~~Lead row appears in DB~~ — N/A.
- ~~Stripe webhook signature check~~ — N/A for pilot.

Parity check kept: **WhatsApp + phone CTA** (PC-06 above) as the canonical conversion signal.

---

## Changelog

- **2026-04-20** (W7-b #221): added Stage → Flow verification map (W1→W6 deliverables + Flows 1-8) + per-flow cutover day verification rows. Documented booking-row exclusions per priority v2. Cross-linked PRs #225/#227/#229/#237/#238/#239/#230.
- **2026-04-19** (W7-a): initial standalone checklist (preflight / cutover / post-cutover / rollback + DNS TTL + SLA + sign-off template).
