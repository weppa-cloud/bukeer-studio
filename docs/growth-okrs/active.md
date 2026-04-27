---
tenant: colombiatours-travel
website_id: 894545b7-73ca-4dae-b76a-da5b6a3f8441
epic: 310
spec: 337
last_updated: 2026-04-27
---

# Active OKRs

_Last updated: 2026-04-27 — A5 Growth Ops sprint W1 (manual, awaiting #149 persistence)._

> **Cross-references:** [SPEC #337](https://github.com/weppa-cloud/bukeer-website-public/issues/337) · [Epic #310](https://github.com/weppa-cloud/bukeer-website-public/issues/310) · [Governance gate](../ops/growth-attribution-governance.md) · [Council template](../growth-weekly/2026-04-27-council-template.md) · [UTM convention](../ops/utm-convention.md)

---

## North Star & Outcome

| Metric | Definition | Why |
|---|---|---|
| **North Star (input/leading)** | `qualified_trip_requests / month` | Count of WAFlow + Chatwoot leads that pass qualification (destination known, dates window, budget tier). Captures pre-revenue intent. |
| **Outcome (lagging)** | `confirmed_bookings_attributed_to_growth_channels / month` | Bookings sourced via paid + organic + CRM channels. Excludes direct-organic uncategorized. |

> Both metrics are **always reported per `(account_id, website_id, locale, market)` tuple** — never aggregated across markets (ADR-009, governance redaction rules).

---

## AARRR Funnel — Channel Mapping

| Stage | Definition | Channels | Primary metric | Source table (post-A1/A3) |
|---|---|---|---|---|
| **Acquisition** | First non-bot visit attributed to a known channel | Organic SEO, Google Ads, Meta Ads, TikTok Ads, Direct, Referral, Email | `sessions`, `clicks` | `seo_page_metrics_daily`, `funnel_events.event_name='session_start'` |
| **Activation** | Engaged session — scrolls hero, opens itinerary builder, requests price | All Acquisition + on-site CTAs | `engaged_sessions`, `cta_clicks` | `funnel_events.event_name in ('cta_click','itinerary_view')` |
| **Qualified Lead (NS proxy)** | WAFlow submit OR Chatwoot conversation reaches `qualified` status | All channels | `qualified_trip_requests` | `funnel_events.event_name='qualified_lead'` |
| **Quote** | Sales sent quote / package brief to lead | Sales (post-WAFlow) | `quotes_sent` | `funnel_events.event_name='quote_sent'` |
| **Booking** | Confirmed booking with deposit/full payment | Sales | `confirmed_bookings`, `revenue` | `funnel_events.event_name='booking_confirmed'` |
| **Review/Repeat** | Post-trip review submitted OR repeat booking from same `contact_id` | CRM | `reviews_30d`, `repeat_bookings_90d` | `funnel_events.event_name in ('review_submitted','repeat_booking')` |

> Stages 1-3 are **owned by Growth (this team)**. Stages 4-6 are co-owned with Sales/Ops; Growth tracks but does not gate on them.

---

## Cadence — Weekly Growth Council

- **Day:** every **Monday 10:00 AM (America/Bogota, UTC-5)**.
- **Duration:** 60 min hard cap.
- **Owner:** A5 Growth Ops (rotating note-taker).
- **Required attendees:** A5 (chair), A4 (SEO), A3 (tracking), A1 (contracts), Sales lead.
- **Optional:** A2 (dashboard), Founder, Paid agency partner.
- **Deliverables every Monday by 09:30:**
  1. Previous week's classification grid (`win | loss | inconclusive | scale | stop`) committed to `docs/growth-weekly/YYYY-MM-DD-council.md`.
  2. ≤5 new experiments scored ICE + RICE for sign-off.
- **Decision rules:**
  - Quorum = 3/5 required attendees including A5.
  - Default: **proceed unless someone vetoes with rationale**. Vetoes recorded in council doc.
  - Budget changes >USD 500/week require explicit Founder approval before commit.
  - Scale-up of any paid experiment requires PASS on A3 dedupe smoke + A4 audit gate.
- **Async fallback:** if quorum not met, A5 publishes proposal in council doc; objections within 24h or auto-approved.

### Agenda template (Monday)

1. **0–5 min** — Read-out: previous week wins/losses (3-line summary each).
2. **5–25 min** — Experiment classification grid review.
3. **25–45 min** — New experiments pitch (≤5, ICE-scored).
4. **45–55 min** — Blockers, risks, dependencies (link issues).
5. **55–60 min** — Decisions logged, owners assigned, evaluation dates set.

---

## Scoring Rules — ICE + RICE

Both scores are mandatory on every experiment. ICE drives weekly prioritization; RICE is the tiebreaker for sprint-level scope.

### ICE (1–10 each, multiply for total)

- **Impact:** estimated lift on North Star or Outcome (1 = trivial, 10 = doubles a stage).
- **Confidence:** how grounded is the hypothesis (1 = blind hunch, 10 = prior data + literature).
- **Ease:** lower friction to ship (1 = >5 days + cross-team, 10 = <1 day single owner).
- **Total = I × C × E** (max 1000). Prioritize ≥150 for the week.

### RICE (sprint-scope tiebreaker)

- **Reach × Impact × Confidence ÷ Effort.**
- Reach = visitors/leads affected/month.
- Effort = person-days.
- Use when ICE ties or when weekly experiments compete for shared resource (e.g., dashboard slot).

> Both scores must be filled before council. Experiments without a baseline + success metric are auto-rejected.

---

## Evaluation windows — by work type

| Work type | First read | Final read | Rationale |
|---|---|---|---|
| **Paid (Google/Meta/TikTok)** | day 7 | day 14 | Statistical signal on ad sets requires ~14 days of consistent budget/audience. Day 7 gates kill switch. |
| **SEO content (new + optimized)** | day 21 | day 45 | GSC indexing + ranking maturity curve. Day 21 = title/meta CTR signal; day 45 = position lift settled. |
| **Technical SEO (CWV, schema, hreflang, indexability)** | immediate (CI) | day 7 + day 28 | CI smoke must pass at deploy. Day 7 = GSC re-crawl coverage; day 28 = ranking impact. |
| **CRM / lifecycle (WAFlow, Chatwoot, email)** | day 1 (delivery) + day 7 (response) | day 30 (booking) | Daily delivery health + weekly response cohorts. 30d to confirm booking impact. |
| **Authority / digital PR / linkable assets** | day 30 (links) | day 90 (rankings) | DR/RD movement requires 30+ days; ranking lift requires 60-90d for non-brand. |

> **Default rule:** an experiment without an evaluation date (one of `day_X` from above) cannot be approved at council.

---

## colombiatours-travel (894545b7-73ca-4dae-b76a-da5b6a3f8441)

### Ciclo 7D (week of 2026-W18, starts 2026-04-27)

| KPI | Target | Current | Progress | Source | Last fetch |
|-----|--------|---------|----------|--------|------------|
| qualified_trip_requests (ES) | 25 | — | — | `funnel_events` (post-A3) / WAFlow proxy | awaiting first run |
| quick_wins_completed | 5 | 0 | 0% | `docs/growth-weekly/2026-04-27-experiments.md` | 2026-04-27 |
| paid_test_dedupe_pass | 1 | — | — | A3 smoke `docs/ops/growth-tracking-smoke.md` | pending W2 |

### Ciclo 30D (2026-04 → 2026-05)

| KPI | Target | Current | Progress | Source | Last fetch |
|-----|--------|---------|----------|--------|------------|
| qualified_trip_requests (ES) | 100 | — | — | `funnel_events` ES locale | — |
| qualified_trip_requests (MX) | 25 | — | — | `funnel_events` MX market | — |
| qualified_trip_requests (EN) | 10 | — | — | `funnel_events` EN locale | — |
| confirmed_bookings_growth_channels | 8 | — | — | Sales reconciliation + `funnel_events` | — |
| organic_clicks (ES) | 6 000 | — | — | GSC | — |
| organic_clicks (EN) | 600 | — | — | GSC | — |
| avg_position (top 50 keywords) | ≤ 12 | — | — | `seo_keyword_snapshots` | — |
| tech_score | ≥ 78 | — | — | `seo_audit_results.performance_score` | — |

### Ciclo 90D (2026-Q2: 2026-04 → 2026-06)

#### Objective 1 — Triplicar qualified trip requests ES vs Q1 baseline

| KPI | From | To | Current | Source |
|-----|------|----|---------|--------|
| Qualified trip requests/mo (ES) | 35 (Q1 avg) | 105 | — | `funnel_events` (post-A3) |
| Confirmed bookings/mo from growth channels (ES) | 6 (Q1 avg) | 18 | — | Sales recon |
| Cost per qualified lead (ES paid) | n/a | ≤ USD 18 | — | Google/Meta + funnel_events |

#### Objective 2 — Open EN-US channel from zero

| KPI | From | To | Current | Source |
|-----|------|----|---------|--------|
| Sessions EN-US | 0 | 1 500 | 0 | `seo_page_metrics_daily WHERE locale='en-US'` |
| Top-10 keywords EN-US | 0 | 20 | 0 | `seo_keyword_snapshots WHERE locale='en-US'` |
| Qualified trip requests EN | 0 | 30 | — | `funnel_events WHERE locale='en-US'` |

#### Objective 3 — Consolidar autoridad dominio

| KPI | From | To | Current | Source |
|-----|------|----|---------|--------|
| DR | 0 | 30 | — | manual (Ahrefs / DataForSEO Backlinks) |
| Referring domains | 0 | 50 | — | DataForSEO Backlinks API |
| Authority pitches placed | 0 | 6 | 0 | `docs/ops/authority-pipeline.md` log |

### Notes / Decisions

- Period start: 2026-04-01
- Period end: 2026-06-30
- Key focus: ES qualified-lead engine (paid + organic) + EN-US foundation + authority backlog.
- Paid scale unblocked 2026-04-27 (#336 closed) — first non-brand ES test scheduled W2 conditional on A3 dedupe smoke + A4 audit gate.
- All metrics tracked separately per market (ES/EN/MX). Aggregation forbidden.
