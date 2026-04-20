# Pilot Readiness — Dependency Gate

Source of truth for `tech-validator MODE:PLAN` Round 2 Dependency Gate tables in #213 + #214.

Last updated: 2026-04-20.

## Client priority change v2 — 2026-04-19

Client meeting 2026-04-19 reset pilot priorities. This section is authoritative and supersedes prior assumptions; downstream rows (W2/W3/W5/W6/W7) below reflect this change. See #214 for EPIC-level restatement.

- **Priority 1 — Translation**: top priority for cutover. Scope covers **blog + activities/experiences + packages**. Hotels out of translation scope (kept as-is in both locales if already translated; no new transcreate work).
- **Priority 2 — Editing**: Studio (Rol 2) must allow partner to edit marketing + content for **packages and activities**. Hotels stay Flutter-owner (no new Studio editor surface).
- **Hotels — as-is**: Flutter-owner for all marketing/catalog fields during pilot. SEO meta (`custom_seo_title`, `custom_seo_description`, `custom_faq`, `robots_noindex`) still editable via existing SEO item detail.
- **Booking V1 — DEFER**: deferred to post-pilot. Pilot goes live with WhatsApp + phone CTAs only. ADR-024 DEFER decision lands via separate PR.
- **No rate-limit mitigation**: client accepts real transcreate API usage. No TM exact-coverage short-circuit forced usage; no rate-limit mitigation ACs in W5.
- **Complementary work** (outside translation + editing priorities) can follow post-cutover.

## Hard dependencies

| Consumer AC / child | Blocked by | Current status | Notes |
|---|---|---|---|
| #213 AC-C6 (`inLanguage`) | #208 (JSON-LD inLanguage threading) | Verify at Day-0 | R2 verification noted closed |
| #213 AC-C4, C5 | #209 (EN-URL segment) | Verify at Day-0 | R2 verification noted closed |
| #213 AC-X1 | #207 W5.1–W5.4 CI gate | Open | Primary mapping |
| #213 AC-X3 | #207 W5.7 | Open | |
| #214 W2 kickoff | W1 (#215) merged | Pending Stage 1 | Scope expanded to activities RPC (formerly post-pilot follow-up) — ship `update_activity_marketing_field` + editor routes alongside packages; hotels stay Flutter-owner. Sizing bumped L → XL. |
| #214 W3 kickoff | — | **DEFER confirmed 2026-04-19 — no Stage 3 impl; ADR-024 Accepted PR pending** | Docs-only DEFER closure (size-S). Pilot ships WhatsApp + phone CTAs; `/api/leads` un-deprecation cancelled; W4 booking specs removed. |
| #214 W4 kickoff | W1 + W2 merged | Pending Stage 2 | |
| #214 W5 kickoff | W4 seed shipped | Pending Stage 4 start | `pilot-seed.ts` variant-factory. Scope expanded to blog + activities (in addition to packages); rate-limit mitigation removed. `translation-ready` seed variant must cover ≥1 pkg + 1 act + 1 blog. Sizing bumped L → XL. |
| #214 W6 kickoff | W1 + W2 + W4 merged | Pending Stage 4 | Activities editable coverage + blog matrix spec (`pilot-matrix-blog.spec.ts`). Hotels read-only (render verification only, no editing loop). Booking matrix rows skip (`PILOT_BOOKING_ENABLED=false`). |
| #214 W7-a | W1 merged | Pending Stage 1 | |
| #214 W7-b | W2 decision act/hotel | Pending Stage 2 | Flow 4 translation expanded to blog + pkg + act (3 sub-flows); Flow 2 booking DEFER (WhatsApp-only copy); Flow 6 Activity = Variant A (Studio native editor, matches W2); Flow 7 Hotel = Variant B (Flutter handoff, unchanged). |
| #214 W7-c | W2 + W3 + W4 + W5 + W6 merged | Pending Stage 5 | Screencasts post-UI freeze |
| W4/W5/W6 kickoff (#218/#219/#220) | **#226 Recovery Gate P0 green** | ✅ Unblocked 2026-04-20 | Gate green chromium+firefox 0/0/justified-skips (see #226 sign-off comment). PR #235 merged (firefox VideoObject skip parity). Cross-repo follow-up #234 (RPC video_url JOIN). |
| #207 close | #214 closed + #213 signed-off | Pending | |

## Parallel gates

| Gate | Status | Blocks |
|---|---|---|
| W3 decision meeting (GO / DEFER) | **DEFER confirmed 2026-04-19 — no Stage 3 impl; ADR-024 Accepted PR pending** | Stage 2 W3 impl (cancelled), W7 Flow 2 copy (WhatsApp-only) |
| ADR-024 finalized | Pending Accepted PR (DEFER populated; landing via separate PR) | W3 closure (docs-only), W4 booking E2E removal |
| ADR-025 finalized | Pending (skeleton shipped Stage 0) | W2 PR merge |
| #208 merge confirmation | **Verify Day-0** | W5 AC-W5-7 |
| #209 merge confirmation | **Verify Day-0** | W5 AC-W5-5/6 |

## Parallel / Recovery Gate

### #226 QA Recovery Gate P0 GUI — ✅ CLOSED 2026-04-20
- Scope: auth/smoke + studio editor + settings/domain + translations dashboard + transcreate lifecycle v2/v2.1 chromium 0/0/0.
- Boundary: data-testid work for studio/dashboards/settings (complementary to PR #225 detail-*).
- Blocks: W4 #218, W5 #219, W6 #220 kickoff.
- Does NOT close: #198/#199/#202 (delegated to #213 + #207).
- Related: #213 AC-X1, #214 Stage 4 gate criteria.
- **Sign-off**: `#226#issuecomment-4280292376` — chromium+firefox 0 failed / 9 justified skips each. Artifacts `artifacts/qa/recovery-gate/2026-04-20/post-fix/`.
- **Shipping PRs**: #231 (testids + infra_outage + firefox blocking), #232 (#226.A — 7 P0 fixes), #233 (#226.B — seed extension 9 skip gaps), #235 (firefox VideoObject skip parity).
- **Cross-repo follow-up**: #234 (extend `get_website_product_page` RPC to JOIN `package_kits.video_url` + `video_caption`).

### Stage 4 entry gate — ✅ UNBLOCKED 2026-04-20

#226 Recovery Gate P0 GUI green on chromium + firefox (0 failed, 9 justified skips per browser). W4 #218 + W5 #219 + W6 #220 kickoff permitido. Remaining Stage-specific blockers (W1 + W2 merged) already satisfied per upstream rows.

## Updates

This doc is maintained as EPIC #214 progresses. Each stage completion updates the current status column.
