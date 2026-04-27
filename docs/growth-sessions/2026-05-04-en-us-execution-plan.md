---
session_id: "2026-05-04-en-us-execution-plan"
date: 2026-05-04
agent: "A4 SEO Content Lead"
scope: "execution-plan"
tenant: colombiatours.travel
website_id: 894545b7-73ca-4dae-b76a-da5b6a3f8441
epic: 310
spec: 337
issue: 316
locale: en-US
market: US
last_updated: 2026-05-04
status_live_mcp_pull: PARTIAL
related_issues: [310, 315, 316, 317, 319, 320, 321, 337]
related_adrs: [019, 020, 021]
phases: 3
horizon: "W3 → W12 (90D)"
---

# EN-US 90D Execution Plan — ColombiaTours

## Objective recap

| 90D OKR | Baseline 2026-05-04 | 90D target (D90 = 2026-08-02) | Source of truth |
|---|---:|---:|---|
| Organic EN-US sessions / 28d | 0 (path-prefix); ~107 (subdomain, audit data) | 250 (path-prefix) | GA4 property `294486074` filtered to `/en/*` |
| Top-10 US-market keywords | 0 (path); 1 (`tax free colombia` ES via subdom) | 5+ on EN hubs | DataForSEO ranked-keywords for `colombiatours.travel` US/en |
| Domain Rating (DR) | TBD baseline (capture via Ahrefs/DFS authority before W4 publish) | +5 absolute | DFS or Ahrefs |
| Referring domains | TBD | +20 net new linking to EN hubs | DFS / GSC links report |

These are the milestones the plan optimizes for. The plan is **phased** to respect three hard dependencies that, if violated, will burn authority irreversibly:
1. ADR-019 path-prefix migration (#319/#320) MUST land before any EN hub goes live on `/en/...`.
2. Legacy `en.colombiatours.travel` MUST be reciprocally hreflang-paired or 301'd page-by-page during phase 1.
3. TM bootstrap (#317) MUST be seeded before any transcreation drafting.

---

## Owners + roles (placeholders)

| Code | Role | Phase 1 owner | Phase 2 owner | Phase 3 owner |
|---|---|---|---|---|
| A1 | Analytics + measurement | TBD | TBD | TBD |
| A2 | TM + glossary | TBD | TBD | TBD |
| A3 | Link acquisition / outreach | TBD | TBD | TBD |
| A4 | SEO content lead (this doc) | self | self | self |
| A5 | Web-engineering (routing, schema) | TBD | TBD | TBD |
| A6 | Design (hub visual + viz) | TBD | TBD | TBD |
| Reviewer | Bukeer planner E-E-A-T reviewer | Caro Hidalgo (per audit) | same | same |

---

## Phase 1 — Foundation + 5 Hubs (W3-W4 / 2026-05-04 → 2026-05-18)

**Goal:** Land the technical/TM foundation and ship the 5 priority hubs from #316. Establish baselines so D21 eval is honest.

### Deliverables (W3-W4)

| ID | Deliverable | Owner | Due | Notes |
|---|---|---|---|---|
| P1-D1 | DataForSEO live MCP re-pull for all Tier A `est` rows in #315 | A4 | 2026-05-08 | Replace bracketed estimates with verified vol/KD; no content brief commits without this |
| P1-D2 | TM bootstrap (#317) — seed `seo_translation_memory` with the 5 hubs' ES source rows + glossary terms (Coffee Triangle, Old City, USD-paired pricing, "no dar papaya", "City of Eternal Spring") | A2 | 2026-05-09 | Per ADR-021 stage 1+2; gate for drafting |
| P1-D3 | Subdomain → path migration plan locked (#319/#320) — page-by-page mapping `en.colombiatours.travel/X` → `/en/Y` with 301 + hreflang | A5 | 2026-05-09 | Required before P1-D5 |
| P1-D4 | GSC + GA4 segmentation for `/en/*` path-prefix; export D-1 baseline (0 sessions confirmed) | A1 | 2026-05-10 | Locks the eval baseline |
| P1-D5 | Hub 1 — Cartagena (`/en/destinations/cartagena`) drafted, planner-reviewed, schema-validated, published | A4 + Reviewer + A5 | 2026-05-13 | First production EN hub |
| P1-D6 | Hub 2 — Is Colombia Safe (`/en/is-colombia-safe`) drafted with original incident-rate data, planner-reviewed, published | A4 + Reviewer | 2026-05-15 | Highest backlink potential |
| P1-D7 | Hub 3 — Best Time to Visit Colombia (`/en/best-time-to-visit-colombia`) — interactive month×region table, published | A4 + A6 | 2026-05-16 | Includes original data viz |
| P1-D8 | Hub 4 — Colombia Tour Packages (`/en/colombia-tour-packages`) — package matrix with USD pricing, planner CTA | A4 + A5 | 2026-05-17 | Commercial conversion surface |
| P1-D9 | Hub 5 — Coffee Triangle (`/en/destinations/coffee-triangle`) | A4 | 2026-05-18 | Closes Phase 1 |

### Dependencies

- P1-D5 → P1-D9 each require: P1-D2 (TM), P1-D3 (subdomain migration), P1-D1 (verified KW data) → drafting can start in parallel with P1-D3 but **publish blocks on P1-D3**.
- P1-D6 requires: source ES content for safety topic to exist (`/blog/es-seguro-viajar-a-colombia/` or similar). If missing, ES content order MUST happen first per ADR-021 — never invent TM source.
- All hubs require: planner reviewer signed off (real human, name + photo + LinkedIn) for E-E-A-T schema.

### Success metrics — D14 (2026-05-18, end of Phase 1)

| Metric | Target | How measured |
|---|---|---|
| 5 hubs live on `/en/...` | 5/5 | Production crawl |
| Each hub has valid schema (Article + FAQPage + Breadcrumb + reviewedBy) | 5/5 | Rich Results Test + structured-data validator |
| Each hub indexed in GSC | 5/5 within 7d of publish | GSC URL inspection |
| Hreflang reciprocity ES↔EN-US pairs | 5/5 | Sitemap audit + hreflang report |
| Subdomain `en.colombiatours.travel` either 301'd or sitewide hreflang-paired | 100% of pages affected | Crawl diff |
| TM coverage for hub keywords | ≥80% | TM hit rate report |

### Blockers + risks

- **R1 (highest):** #319/#320 slips → cannot publish `/en/...` without authority fragmentation. **Mitigation:** publish drafts internally; release on green-light only.
- **R2:** Reviewer bandwidth (Caro Hidalgo) — 5 hub reviews in 14d. **Mitigation:** schedule 30-min review windows pre-draft; provide reviewer with template + claims-to-check list.
- **R3:** ES TM source for "Is Colombia Safe" missing → cold-start. **Mitigation:** verify ES content exists in week 1; if not, A4 commissions ES-first per ADR-021 (delays Hub 2 to W5).
- **R4:** DataForSEO MCP token limits / cost. **Mitigation:** batch all Tier A pulls in single session; tag for reconciliation.
- **R5:** Underbaked photo authority assets → schema OK but visual cred low. **Mitigation:** A6 photo-shoot or photo-license budget approved before P1-D5.

---

## Phase 2 — Authority + Internal-Linking Layer (W5-W7 / 2026-05-18 → 2026-06-08)

**Goal:** Build the authority + interconnection layer that lifts the 5 hubs from "indexed" to "ranking competitively". Ship the supporting blog/FAQ children + first link-acquisition campaigns.

### Deliverables

| ID | Deliverable | Owner | Due | Notes |
|---|---|---|---|---|
| P2-D1 | Phase 1 D14 eval report (rank, indexation, GSC impressions/clicks, schema parity) | A4 + A1 | 2026-05-19 | Triggers go/no-go for Phase 2 |
| P2-D2 | 8 supporting child pages: Salento, Cocora detail, Medellin destination hub, Bogota destination hub, Visa for US Citizens FAQ, Trip Cost guide, 7-day itinerary, 10-day itinerary | A4 + Reviewer | W5-W6 | All link to ≥2 of the 5 hubs |
| P2-D3 | Internal-link injection pass — ensure each hub has ≥15 inbound contextual links from supporting + ES-EN reciprocal pairs | A4 + A5 | 2026-05-25 | Use `lib/seo/internal-link-graph.ts` audit |
| P2-D4 | Authority asset shipping: original incident-rate dataset (Hub 2), interactive 12-month×5-region table (Hub 3), bean-to-cup infographic (Hub 5), packing-list PDF (Hub 1) | A4 + A6 | W5-W6 | These are the link-bait artifacts |
| P2-D5 | Backlink prospecting batch 1 (#321) — 30 outreach targets: travel-blog round-ups, "is X safe" link-pages, US-based travel-resource hubs, Colombia DMO partner program | A3 | W5 | Pitch the authority assets from P2-D4 |
| P2-D6 | First 5 backlink wins committed | A3 | W7 | Realistic; backlinks lag content by 3-6w |
| P2-D7 | Lighthouse audit on all 5 hubs ≥90 mobile (perf/SEO/a11y/best-practices) | A5 | W6 | Block fix-and-republish if <90 |
| P2-D8 | E-E-A-T expansion: planner profiles published at `/en/team/<name>` with full bio + credentials, linked from each hub's reviewedBy schema | A4 + A6 | W7 | Critical for safety + cost authority |
| P2-D9 | Cross-hub canonicalization audit — confirm no duplicate H1 / no canonical loop / no self-referential hreflang | A4 + A5 | W7 | Pre-Phase-3 hygiene gate |
| P2-D10 | DataForSEO weekly rank tracking job (Tier A 20 keywords, weekly snapshot) | A1 | from W5 onward | Feeds D45 + D90 evals |

### Dependencies

- P2-D2 supports the 5 hubs — each child page MUST link upward to its parent hub.
- P2-D5 depends on P2-D4 (need the authority asset to pitch).
- P2-D7 (Lighthouse) — ADR-019 / Cloudflare Worker deploy must hold perf budgets.

### Success metrics — D42 (2026-06-08, end of Phase 2)

| Metric | Target | How measured |
|---|---|---|
| Hubs ranking in top-30 US for primary KW | 4 of 5 | DFS rank tracker |
| Hubs ranking in top-15 US (any) | 1-2 of 5 | DFS rank tracker |
| EN sessions / 28d on `/en/*` | 50-100 | GA4 |
| Indexed pages on `/en/*` | 13+ (5 hubs + 8 children) | GSC coverage |
| New referring domains to EN hubs | 5+ | DFS / Ahrefs |
| Lighthouse mobile (5 hubs avg) | ≥90 perf, ≥95 SEO, ≥90 a11y | LH CI runs |
| Bounce rate on hubs | <60% | GA4 |

### Blockers + risks

- **R1:** Backlink lag — 5 wins by W7 is aggressive. **Mitigation:** parallel HARO/Help-A-B2B-Writer + travel-press kit; partner with Procolombia DMO.
- **R2:** Child-page bloat without lift — if children don't move parent rank, halt and pivot. **Mitigation:** D42 eval has explicit kill-criteria.
- **R3:** Canonical/hreflang regression as ES content team also publishes. **Mitigation:** P2-D9 audit; tighter coordination with ES batch (#314).
- **R4:** Reviewer fatigue. **Mitigation:** queue reviews, batch 3-4 pieces per session.

---

## Phase 3 — Scale + Velocity Watch (W8-W12 / 2026-06-08 → 2026-08-02)

**Goal:** Scale to 30+ EN pages, monitor ranking velocity, layer in remarketing + conversion optimization. Set up Q3 plan handoff.

### Deliverables

| ID | Deliverable | Owner | Due | Notes |
|---|---|---|---|---|
| P3-D1 | Phase 2 D42 eval + go/no-go decision | A4 + A1 | 2026-06-09 | If <2 hubs in top-15, pivot before scaling |
| P3-D2 | 17 additional supporting pages (Tier B from #315): Tayrona, Lost City trek, San Andres, Luxury, Family, Honeymoon, Adventure, Birding, Rosario Islands, Day Trips × 3 cities, Itinerary 14-day, English-speaking-guides landing, Currency guide, Travel insurance landing | A4 | W8-W11 | Cluster-peer reinforcement |
| P3-D3 | Conversion optimization on Hub 4 — A/B test package matrix layout, USD vs USD+COP toggle, hero CTA copy | A4 + A5 | W9-W10 | Trip-request rate is the 90D OKR |
| P3-D4 | Backlink prospecting batch 2 — 50 targets, leveraging the now-cited authority assets | A3 | W8-W11 | Compounding |
| P3-D5 | Remarketing + retargeting layer for EN hubs (Meta + Google Display) — pixel events on planner-form view, package-card click, FAQ scroll-depth | A1 + A5 | W9 | Captures non-converting traffic |
| P3-D6 | Programmatic monthly variants (Hub 3 children: `/en/colombia-in-january`, ..., `/en/colombia-in-december`) auto-generated from interactive table data | A4 + A5 | W10 | 12 net-new indexable URLs |
| P3-D7 | Quarterly content council with Bukeer ops — feedback loop from real US trip planners on which content moves bookings | A4 + Reviewer | W11 | Qualitative signal |
| P3-D8 | D90 SEO audit + ranking velocity report — capture Phase 3 deltas, project Q3 roadmap | A4 + A1 | W12 (2026-08-02) | Closes 90D milestone |
| P3-D9 | Q3 plan draft (W13-W24) — based on D90 learnings: which hubs to double-down, which to consolidate, which clusters to expand | A4 | W12 | Hands off to next quarter cycle |

### Dependencies

- P3-D2 throughput depends on TM cache hit rate (P2-D2 gives ~80% TM coverage).
- P3-D5 (remarketing) requires P2-D7 (Lighthouse / events instrumented).
- P3-D9 depends on D90 data being clean (P3-D8).

### Success metrics — D90 (2026-08-02)

| Metric | Target | How measured |
|---|---|---|
| Organic EN-US sessions / 28d | 250 (90D OKR) | GA4 `/en/*` |
| Top-10 US keywords on EN hubs | 5+ (90D OKR) | DFS rank tracker |
| Hubs ranking in top-10 | 2 of 5 | DFS rank tracker |
| Hubs ranking in top-30 | 5 of 5 | DFS rank tracker |
| Indexed `/en/*` pages | 30+ | GSC |
| Net-new referring domains | 20+ | DFS / Ahrefs |
| EN-US trip-request submissions / 28d | 8-12 | GA4 events / CRM |
| EN bounce rate | <55% | GA4 |
| EN avg session duration | ≥150s | GA4 |

### Blockers + risks

- **R1 (highest):** Path-prefix routing fragility (e.g., middleware bug strips `/en` incorrectly) — would void all gains. **Mitigation:** automated E2E tests on each `/en/...` URL post-deploy; existing `lib/seo/` has hreflang scanner.
- **R2:** Conversion gap — sessions grow but trip requests don't. **Mitigation:** P3-D3 A/B tests + planner-form UX audit; if still gap by W11, hand to growth-funnel agent.
- **R3:** Algorithm volatility (Google core updates Q2-Q3). **Mitigation:** E-E-A-T heavy investment in planner reviewedBy schema, original data, real photos.
- **R4:** Subdomain residue — if `en.colombiatours.travel` partial pages still live, they'll keep cannibalizing. **Mitigation:** weekly crawl-diff during Phase 3.
- **R5:** Reviewer turnover — one named reviewer for all hubs is single-point-of-failure. **Mitigation:** P2-D8 expand to 2-3 named planner reviewers by W7.

---

## Cross-phase guardrails

These hold across all three phases:

| Guardrail | Enforcement |
|---|---|
| **No literal MT** (ADR-021) | All transcreation flows through TM + glossary + AI draft + human review per `lib/seo/transcreate-workflow.ts` job-state machine |
| **No truth-field writes** | TRUTH_FIELD_DENYLIST enforced at workflow layer |
| **No invented reviewers** | Reviewer must be a real Bukeer planner with verifiable bio + photo |
| **No invented data** | Original-data claims (e.g., "1,200 US travelers, 0 incidents") must trace to verifiable Bukeer ops record |
| **Hreflang reciprocity** | Every `/en/...` published has matching ES `<link rel="alternate" hreflang="es-CO"/>` and vice versa |
| **Single canonical** | Each translated pair has one canonical per locale, no cross-locale canonical loops |
| **Schema validation** | Rich Results Test passes before publish; broken schema blocks deploy |
| **Lighthouse ≥90 mobile** | Pre-publish gate via `bash scripts/lighthouse-ci.sh` |
| **Eval cadence** | D14, D21, D42, D60, D90 — fixed checkpoints; no skipping |
| **Live MCP refresh** | Estimated KW data must be replaced with verified DFS pulls before content brief commit |

---

## Reporting cadence

| Cadence | Audience | Format | Owner |
|---|---|---|---|
| Daily (Phase 1 only) | Slack #seo-growth | rank/indexation status of latest hub | A4 |
| Weekly | Friday review (`docs/growth-sessions/<week>-friday-review.md`) | hub-by-hub rank delta + risks + asks | A4 |
| Monthly | Stakeholder | OKR scorecard + Q3 forecast | A4 + A1 |
| D14, D42, D90 | Council | Eval doc with go/no-go on next phase | A4 |

---

## Open questions for upstream agents

- **A1:** Confirm GA4 + GSC segmentation on `/en/*` is configured before P1-D4 deadline (2026-05-10).
- **A2:** Glossary lock by 2026-05-09 — needed for drafting kickoff.
- **A3:** Authority-asset list (P2-D4) is the link-bait surface. Coordinate timing of outreach with publish dates so backlinks land while content is fresh.
- **A5:** Subdomain → path migration plan (P1-D3) is the highest-impact dependency. Without firm timeline, Phase 1 publish dates slip.
- **Reviewer pipeline:** Identify second + third planner reviewers by W3 to de-risk single-point dependency by W7.

---

## Wikilinks

[[ADR-019]] [[ADR-020]] [[ADR-021]] [[SPEC #337]] [[Issue #310]] [[Issue #315]] [[Issue #316]] [[Issue #317]] [[Issue #319]] [[Issue #320]] [[Issue #321]]

Related session docs:
- `docs/growth-sessions/2026-05-04-en-us-keyword-universe.md` — KW data underpinning this plan
- `docs/growth-sessions/2026-05-04-en-us-priority-hubs.md` — Hub-by-hub specs (Phase 1 D5-D9)
- `docs/growth-sessions/2026-04-27-seo-audit-top100.md` — pre-EN baseline audit
- `docs/growth-sessions/2026-04-25-1027-colombiatours-growth-dataforseo-batch.md` — DFS source
