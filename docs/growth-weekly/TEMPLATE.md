---
week_of: "YYYY-WW"
week_start: "YYYY-MM-DD"  # Monday ISO date
website_id: ""            # UUID from websites table
website_slug: ""          # subdomain
generated_by: ""          # agent identifier (e.g., claude-code-s1) or "human"
generated_at: ""          # ISO timestamp
linked_session: ""        # docs/growth-sessions/... file (optional)
---

# Week YYYY-WW — {Website}

## Context

- Previous week clicks 30d: `N` (from GSC)
- OKR progress (link `docs/growth-okrs/active.md`): clicks `X/Y`, avg_position `X/Y`, tech_score `X/Y`
- Anomalies last 7d: [summary]

## Quick Wins (auto-generated)

### P1 — Striking Distance (top 3)

- [ ] **T-1** Keyword `<keyword>` — URL `/<url>` — position `N` — volume `V`
  - Target: `+2 positions` / `+0.5% CTR`
  - Action: [what to change]
  - Source: `seo_keyword_snapshots` latest

- [ ] **T-2** ...
- [ ] **T-3** ...

### P2 — Low CTR (top 2)

- [ ] **T-4** URL `/<url>` — impressions `N` — CTR actual `X%` — benchmark `Y%`
  - Target: `+1.5% CTR`
  - Action: rewrite meta title/description
  - Source: `seo_page_metrics_daily` 30d

- [ ] **T-5** ...

### P3 — Drift / Cannibalization (top 2)

- [ ] **T-6** Drift: source `<post-es-CO>` updated YYYY-MM-DD, variant `<post-en-US>` stale since YYYY-MM-DD
  - Action: re-translate

- [ ] **T-7** Cannibalization: keyword `<keyword>` — URLs `<url-a>` + `<url-b>` same locale
  - Action: consolidate / differentiate intent

## Friday Review

_Filled Friday PM by agent or human._

| Task | Status | Outcome / Notes |
|------|--------|-----------------|
| T-1  |        |                 |
| T-2  |        |                 |
| ...  |        |                 |

### Reflection

- What worked
- What got stuck
- Seed for next week

## Notes

_Free-form context, observations, decisions._
