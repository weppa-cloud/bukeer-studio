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
- Score: **9.1 / 10**
- Target: `>= 9.0`
- Result: **target met**

## Main residual UX risks
1. Performance variance still appears in audited product routes (`actividades`, `paquetes`) across repeated runs.
2. Build-time data timeouts (`getBlogPostBySlug`) remain intermittent during static generation, though non-blocking for gate.

## Next actions
1. Keep performance hardening focused on activity/package routes (images + long task reduction) to stabilize >=0.90 consistently.
2. Triage Supabase timeout noise in SSG to reduce operational risk.
3. Keep periodic Lighthouse reruns as part of release checklist.
