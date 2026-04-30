---
session_id: "2026-04-30-gsc-ctr-candidates"
started_at: "2026-04-30T09:00:00-05:00"
ended_at: "2026-04-30T09:35:00-05:00"
agent: "codex-lane-5"
scope: "weekly-planning"
website_id: "894545b7-73ca-4dae-b76a-da5b6a3f8441"
website_slug: "colombiatours-travel"
initiator: "Lane 5 - GSC demand/CTR candidates. Derive 1-2 decision-grade GSC experiments from existing growth_gsc_cache / growth_inventory."
outcome: "completed"
linked_weekly: "docs/growth-weekly/2026-05-04-council.md"
related_issues: [310]
---

# Session weekly-planning - colombiatours-travel - 2026-04-30

## Intent

Derive 1-2 decision-grade GSC demand/CTR experiments from existing `growth_gsc_cache` and `growth_inventory`. No DB mutations. Write only this session file.

## Source Cache And Window

Read-only sources:

| Source             |                      Window | Cache key / row source                                                                        |                               Fetched at |              Expires at | Rows inspected |
| ------------------ | --------------------------: | --------------------------------------------------------------------------------------------- | ---------------------------------------: | ----------------------: | -------------: |
| `growth_gsc_cache` |    2026-04-01 to 2026-04-28 | `2026-04-01\|2026-04-28\|query,page\|*\|es\|25000`                                            |                  2026-04-29 16:27:30 UTC | 2026-04-30 16:02:07 UTC |         14,655 |
| `growth_gsc_cache` |    2026-04-01 to 2026-04-28 | `2026-04-01\|2026-04-28\|page,country\|*\|es\|25000`                                          |                  2026-04-29 16:27:35 UTC | 2026-04-30 16:02:10 UTC |          5,102 |
| `growth_gsc_cache` |    2026-04-01 to 2026-04-28 | `2026-04-01\|2026-04-28\|page,device\|*\|es\|25000`                                           |                  2026-04-29 16:27:36 UTC | 2026-04-30 16:02:11 UTC |          1,707 |
| `growth_inventory` | 28d normalized GSC baseline | `website_id=894545b7-73ca-4dae-b76a-da5b6a3f8441`, `channel=seo`, ordered by `priority_score` | row `updated_at=2026-04-29 21:41:20 UTC` |                     n/a |         top 80 |

MCP availability this session: `search-console`, `google-analytics`, `supabase`, `chrome-devtools`, and `playwright` MCP tools were not exposed. I used existing persisted cache/inventory only.

## Decision Criteria

Promote rows where:

- Query or page has enough impressions to move weekly organic clicks.
- Average position is already visible enough for a snippet/title/content change to affect CTR, preferably top 15.
- Query intent is travel-planning or agency/commercial, not unrelated trivia.
- The row has a measurable 21-day CTR readout and a 45-day final readout per active OKR rules.

Reject rows where:

- Position is too low for a CTR experiment to isolate impact.
- Query intent is not aligned to qualified trip requests.
- Inventory row is primarily a technical remediation row with zero GSC demand.
- Locale/URL mismatch makes the action unclear without a separate canonical/hreflang decision.

## Candidate Experiments

### GSC-CTR-01 - Destination List Snippet Rescue

| Field               | Value                                                                                                                                                                                                                                                       |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| URL                 | `https://en.colombiatours.travel/los-10-mejores-destinos-para-conocer-colombia/`                                                                                                                                                                            |
| Primary query       | `lugares turisticos de colombia`                                                                                                                                                                                                                            |
| Source cache/window | `growth_gsc_cache` query-page, page-country, page-device; 2026-04-01 to 2026-04-28                                                                                                                                                                          |
| Inventory baseline  | 5,937 impressions, 10 clicks, 0.17% CTR, avg position 5.05                                                                                                                                                                                                  |
| Query baseline      | 805 impressions, 1 click, 0.12% CTR, avg position 4.87                                                                                                                                                                                                      |
| Supporting signals  | CO: 2,424 impressions, 4 clicks, 0.17% CTR, position 4.84. MX: 974 impressions, 0 clicks, 0.00% CTR, position 3.43. Mobile: 4,446 impressions, 9 clicks, 0.20% CTR, position 3.49.                                                                          |
| Hypothesis          | If A4 rewrites title/meta/H1 intro around "lugares turisticos de Colombia" with a concrete travel-planning promise, then CTR should rise because the page already ranks top 5 but the current snippet is failing to earn clicks across CO/MX/mobile demand. |
| Owner               | A4 SEO, with A5 Growth Ops measuring GSC readout                                                                                                                                                                                                            |
| Success metric      | By 2026-05-21, primary query CTR increases from 0.12% to >=1.00% and page CTR increases from 0.17% to >=0.75%, with avg position not worsening by more than 2.0 positions. Final read on 2026-06-14.                                                        |
| Decision            | Promote. This is the cleanest CTR candidate: high impressions, top-5 rank, broad travel intent, and clear snippet underperformance.                                                                                                                         |

Recommended action:

- Rewrite title/meta around the exact ES query family, not the current English-subdomain ambiguity.
- Add above-the-fold copy that matches "lugares turisticos de Colombia" and exposes a next-step CTA to packages or itinerary planning.
- Check canonical/hreflang before ship because the URL is on `en.colombiatours.travel` while the query and locale signal are Spanish.

### GSC-CTR-02 - Agency Trust Commercial CTR Test

| Field               | Value                                                                                                                                                                                                                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| URL                 | `https://colombiatours.travel/las-mejores-agencias-de-viaje-en-colombia/`                                                                                                                                                                                                                                                 |
| Primary query       | `agencias de viajes confiables en bogota`                                                                                                                                                                                                                                                                                 |
| Source cache/window | `growth_gsc_cache` query-page, page-country, page-device; 2026-04-01 to 2026-04-28                                                                                                                                                                                                                                        |
| Inventory baseline  | 1,468 impressions, 1 click, 0.07% CTR, avg position 17.82                                                                                                                                                                                                                                                                 |
| Query baseline      | 192 impressions, 0 clicks, 0.00% CTR, avg position 11.93                                                                                                                                                                                                                                                                  |
| Supporting signals  | `mejores agencias de viajes en colombia`: 100 impressions, 0 clicks, 0.00% CTR, position 4.43. `agencias de viajes en colombia reconocidas`: 57 impressions, 0 clicks, 0.00% CTR, position 4.14. CO: 1,309 impressions, 1 click, 0.08% CTR, position 16.00. Mobile: 1,108 impressions, 1 click, 0.09% CTR, position 9.31. |
| Hypothesis          | If A4 reframes the snippet and first screen around trust proof, ColombiaTours credentials, and "agencia confiable" intent, then CTR should improve because multiple commercial trust queries already rank on page 1 to low page 2 but earn zero clicks.                                                                   |
| Owner               | A4 SEO, with A5 Growth Ops measuring GSC readout                                                                                                                                                                                                                                                                          |
| Success metric      | By 2026-05-21, page CTR increases from 0.07% to >=0.60% and the three tracked trust queries produce at least 5 combined clicks, with avg position not worsening by more than 2.0 positions. Final read on 2026-06-14.                                                                                                     |
| Decision            | Promote as second candidate. Volume is lower than GSC-CTR-01, but commercial intent is much closer to qualified trip requests.                                                                                                                                                                                            |

Recommended action:

- Rewrite title/meta for "agencia de viajes confiable en Colombia/Bogota" rather than generic listicle framing.
- Add visible trust proof above the fold: registration, reviews, years, destinations, and WhatsApp advisory CTA.
- Keep the page comparison/list useful, but make ColombiaTours the answer for the trust query instead of only one item in a list.

## Weak Rows Rejected

| Row                                                                                                                        |                                                                                                                             Baseline | Rejection reason                                                                                                                                                                                                   |
| -------------------------------------------------------------------------------------------------------------------------- | -----------------------------------------------------------------------------------------------------------------------------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `https://en.colombiatours.travel/` / `colombia tours`                                                                      | 2,256 impressions, 8 clicks, 0.35% CTR, avg position 34.67. Page inventory: 5,836 impressions, 27 clicks, 0.46% CTR, position 44.80. | Demand is real, but position is too low for a CTR experiment. This is a ranking/content authority problem, not a title/meta CTR test. Also URL/locale mapping needs EN-US strategy work before a clean experiment. |
| `https://colombiatours.travel/guia-completa-lada-a-colombia/` / `lada 57 de donde es`                                      |     326 impressions, 0 clicks, 0.00% CTR, avg position 5.17. Page inventory: 1,805 impressions, 0 clicks, 0.00% CTR, position 10.99. | Strong CTR gap, but the intent is telephone country-code lookup, not travel planning or qualified trip requests. Do not spend weekly experiment capacity here.                                                     |
| `https://en.colombiatours.travel/los-10-mejores-lugares-turisticos-de-colombia/` / `los 15 lugares turisticos de colombia` |     640 impressions, 7 clicks, 1.09% CTR, avg position 1.67. Page inventory: 2,709 impressions, 11 clicks, 0.41% CTR, position 6.84. | Valid page, but overlaps with GSC-CTR-01 and has a healthier primary-query CTR. It can become a follow-up after the stronger destination-list candidate is evaluated.                                              |
| DataForSEO technical rows in `growth_inventory` with 0 GSC impressions                                                     |                                                                                                              0 impressions, 0 clicks | These are remediation backlog items, not demand/CTR candidates. Keep them in the technical queue and out of this lane.                                                                                             |

## Mutations

| Entity     | Action               | Before      | After                                                   | Source                                                       |
| ---------- | -------------------- | ----------- | ------------------------------------------------------- | ------------------------------------------------------------ |
| Supabase   | None                 | n/a         | n/a                                                     | Read-only `growth_gsc_cache` / `growth_inventory` inspection |
| Repository | Created session note | file absent | `docs/growth-sessions/2026-04-30-gsc-ctr-candidates.md` | User-requested write scope                                   |

## External Costs

| Provider | Operation | Cost USD | Notes                                               |
| -------- | --------: | -------: | --------------------------------------------------- |
| None     |       n/a |     0.00 | No live GSC, GA4, DataForSEO, or AI provider calls. |

## Next Steps / Handoff

1. A4 chooses whether to ship both metadata/content edits in one batch or start with GSC-CTR-01 only.
2. If shipped on 2026-04-30, first read is 2026-05-21 and final read is 2026-06-14.
3. A5 should record the shipped title/meta/content diff next to these candidates before evaluation so CTR movement can be attributed cleanly.

## Self-Review

The promoted rows are measurable and tied to persisted cache. The main residual risk is the Spanish-query traffic landing on `en.colombiatours.travel`; that should be treated as an experiment dependency, not ignored in implementation.
