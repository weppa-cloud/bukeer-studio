# EPIC #128 UX Fluency Evidence

- Date: 2026-04-17
- Scope: MVP Tier 1 (translations dashboard/dialogs, locale routing metadata, glossary/TM/internal-links, rhythm persistence)
- Environment: local (`main`), ColombiaTours fixtures

## Heuristic checklist
- Public locale routing (`/site/[subdomain]` + language mapping): pass
- Metadata locale wiring (canonical/hreflang/OG/JSON-LD): pass
- Dashboard `/translations` + glossary flows: pass (UI rendered + routes present)
- Transcreate + AI dialog entrypoints: pass (components + wiring present)
- OKR/weekly/objectives persistence and generation endpoints: pass
- Quality gate (`typecheck`, `lint`, `build`, `tech-validator:code`): pass

## Fluency score (provisional)
- Score: **8.9 / 10**
- Target: `>= 9.0`
- Result: **not yet at target**

## Main UX blockers to reach >=9
1. Lighthouse performance under target on audited EN routes (0.58–0.80 representative runs).
2. SEO below 0.95 on all audited routes (`0.92`) due `meta-description` audit failing in Lighthouse.

## Next actions
1. Fix package route `meta-description` audit instability to raise SEO `>=0.95`.
2. Reduce JS unused/blocking budget on product pages (focus on activity/hotel route bundles).
3. Re-run Lighthouse CI after performance/SEO remediation.
