# SPEC: Multi-Locale Remediation + Growth Ops (Bukeer Studio)

**Status:** Ready for execution
**Date:** 2026-04-17
**Scope:** Schema + Backend + Public routing + Dashboard + Growth ops + QA across 6 phases
**Primary source:** `/Users/yeisongomez/.claude/plans/hacer-la-siute-de-mellow-dolphin.md` (approved)
**Reference tenant:** colombiatours.travel (`894545b7-73ca-4dae-b76a-da5b6a3f8441`)

---

## 1. Purpose

Close the 10 multi-locale gaps identified in the QA real-data run (2026-04-17) and add
10 growth-ops workflows (Translation Memory, Glossary, SERP snapshot, NLP score,
Internal linking, Cannibalization, Drift, Hreflang audit, Topical authority, QA
automation) so Bukeer Studio can operate growth SEO across es-CO and en-US
markets with tooling parity ~40-50% vs Semrush / Surfer / Lokalise.

Answer target to `docs/seo/SEO-PLAYBOOK.md`: **"¿Puede un usuario ejecutar flujos
growth SEO multi-mercado con UX fluida?"** → **SI** post-implementación.

---

## 2. Current Baseline (2026-04-17)

**Evidence:** `docs/evidence/growth-readiness/ux-fluency.md` — 8/10 PASS, 2 FAILs.

### Shipped (works)
- Transcreate schema (`seo_transcreation_jobs`, `seo_localized_variants`)
- Endpoints locale-aware: `transcreate`, `optimize`, `research`, `audit`, `score`
- GSC/GA4 sync (pero hardcoded `locale:'es'` en `lib/seo/backend-service.ts:263`)
- Hreflang helpers (`lib/seo/hreflang.ts`) — completos pero NO integrados en SSR

### Gaps blocking multi-market operation
1. Truth tables (`website_blog_posts`, `website_pages`, `website_product_pages`, `destinations`) sin columna `locale` ni `translation_group_id`.
2. Rendering público monolingüe — sin `[locale]` segment.
3. Hreflang helpers no llamados desde `generateMetadata`.
4. Sitemap sin `xhtml:link` alternates.
5. Transcreate limitado a `blog|page|destination` (product types excluidos).
6. GSC/GA4 sync hardcoded `locale:'es'`.
7. `/dashboard/[id]/translations` ruta ausente.
8. OpenGraph `locale:'es_ES'` fijo en `app/site/[subdomain]/page.tsx:78`.
9. Slug collision si operador crea traducción con mismo slug.
10. Transcreate UI desconectada del editor.

### Growth ops gaps (post blockers)
11. No Translation Memory → cada transcreate = LLM call nuevo.
12. No Glossary → brand/destination drift ("Cartagena" → "Carthage").
13. No SERP snapshot per mercado (DataForSEO creds válidas pero unwired).
14. No NLP score inline editor (Surfer-style).
15. No internal linking propagation.
16. No cannibalization intra-locale monitor.
17. No drift detection source vs variant.
18. No hreflang reciprocal audit.
19. No topical authority per locale.
20. No QA automation post-draft.

---

## 3. Closed Product Decisions

1. **Translation model:** separate row per locale, linked via `translation_group_id`. No JSONB columnar.
2. **Slug per locale:** unique per `(website_id, locale, slug)`.
3. **Product types guardrail:** transcreate writes to `website_product_pages` SEO overlay only, NEVER mutates truth tables (`hotels`, `activities`, `package_kits`).
4. **Orphan target creation:** transcreate apply with `targetContentId=null` creates new row (blog/page/destination only).
5. **SERP provider:** DataForSEO Live SERP (`/v3/serp/google/organic/live/advanced`). Cache 30d per keyword+locale. Budget cap via env `DATAFORSEO_MONTHLY_CAP_USD`.
6. **LLM provider:** NVIDIA Nim (unchanged, already shipped).
7. **Execution structure:** 1 EPIC + 19 child issues across 6 sprints.
8. **Operational language in issue bodies:** English (technical) — alineado con convención repo.
9. **Dashboard UI copy:** Spanish (consistente con shipped dashboard), flag desalineación con CLAUDE.md para decisión owner.
10. **Feature flag rollback:** `ENABLE_MULTI_LOCALE_ROUTING` middleware.

---

## 4. Cross-Cutting Requirements (CC-1..CC-8)

Full detail in plan. Summary:

- **CC-1 Zod contracts** — 13 schemas in `packages/website-contract/src/schemas/translations.ts`.
- **CC-2 [[ADR-012]] envelope** — all endpoints use `apiSuccess/apiError` + error codes inventory.
- **CC-3 Cache-Tag [[ADR-016]]** — read endpoints emit tags, mutations purge.
- **CC-4 Observability** — structured JSON logs per endpoint.
- **CC-5 Security** — rehype-sanitize (LLM HTML), papaparse+CSV injection guards, rate limiting.
- **CC-6 Middleware edge cache** — `WEBSITES_LOCALE_CACHE` KV TTL 5min.
- **CC-7 Design system** — shadcn/ui primitives, CSS vars, dark mode, component reuse.
- **CC-8 Budget caps** — `seo_provider_usage` counter + fail-fast.

---

## 5. Phase Summary

| Phase | Sprint | Focus |
|-------|--------|-------|
| 1 Schema | 1 | Migrations (locale + translation_groups + 7 growth-ops tables + pg_trgm) |
| 2 Backend | 1-2 | Transcreate ext + TM + glossary + endpoints bulk |
| 3 Public routing | 2-3 | [locale] segment + hreflang + sitemap + inLanguage |
| 4 Dashboard | 3 | /translations + glossary UI + widgets drift/topical |
| 5 Growth ops | 4 | SERP snapshot + NLP score + crons + QA auto + internal linking |
| 6 QA | 5 | e2e extend + attestation v2 |

---

## 6. EPIC Master Issue

```markdown
# EPIC: Multi-Locale Remediation + Growth Ops

## Summary
Close 10 multi-locale gaps + add 10 growth-ops workflows for Bukeer Studio to
operate growth SEO across es-CO and en-US markets with tooling parity 40-50%
vs Semrush/Surfer/Lokalise.

## Context
- QA evidence: `docs/evidence/growth-readiness/ux-fluency.md` (8/10 PASS, 2 FAILs)
- Approved plan: `/Users/yeisongomez/.claude/plans/hacer-la-siute-de-mellow-dolphin.md`
- SPEC: `docs/specs/SPEC_MULTI_LOCALE_REMEDIATION.md`
- Reference tenant: colombiatours.travel

## Goals
- [ ] Truth tables support `locale` + `translation_group_id`
- [ ] Public rendering supports `[locale]` with hreflang/canonical/sitemap
- [ ] Dashboard `/translations` with bulk + drift + topical widgets
- [ ] Transcreate covers all 6 content types
- [ ] Growth-ops: TM + Glossary + SERP + NLP score + internal linking + QA auto + crons

## Non-Goals (v1)
- Side-by-side in-context editor (Weglot-style)
- DeepL/Google MT fallback before LLM
- Full backlinks depth via DataForSEO
- Reviewer assignment workflow

## Definition of Done
- 10/10 ux-fluency PASS
- G-1..G-10 new e2e tests pass
- Lighthouse ≥90/95/95 EN-US routes
- Attestation v2 signed off

## Labels
`epic`, `growth-seo`, `multi-locale`, `size-XL`

## Children
#1..#19 (see issue list)
```

---

## 7. Child Issues (19)

Full issue bodies in plan file. Summary here:

| # | Title | Phase | Depends | Effort | Labels |
|---|-------|-------|---------|--------|--------|
| 1 | Migrations: locale + translation_group_id in truth tables | 1 | — | S | database, migration, multi-locale |
| 2 | Migrations: growth-ops tables (TM, Glossary, SERP, QA, Topical, Forbidden, ProviderUsage) | 1 | #1 | S | database, migration, growth-seo |
| 3 | Zod contracts in `@bukeer/website-contract` (CC-1) | 1 | #1 | M | contract, package, growth-seo |
| 4 | Backend: eliminate locale hardcode in GSC/GA4 sync | 2 | #1 | S | backend, bug, multi-locale |
| 5 | Backend: extend transcreate to product types + orphan target creation | 2 | #2, #3 | M | backend, api, growth-seo |
| 6 | Backend: /translations listing + bulk endpoints | 2 | #3, #5 | M | backend, api, growth-seo |
| 7 | Backend: TM fuzzy match + glossary injection wiring | 2 | #2, #5 | L | backend, growth-seo, ai |
| 8 | Backend: Glossary + TM CRUD endpoints + CSV import | 2 | #3, #7 | M | backend, api, growth-seo |
| 9 | Public: `[locale]` segment routing + middleware edge cache | 3 | #1 | L | frontend, routing, multi-locale |
| 10 | Public: hreflang + canonical + OpenGraph locale + `inLanguage` dynamic | 3 | #9 | M | frontend, seo, multi-locale |
| 11 | Public: sitemap multi-locale with `xhtml:link` alternates | 3 | #9, #10 | M | frontend, seo, multi-locale |
| 12 | Dashboard: `/translations` page + widgets (drift/topical/QA badges) | 4 | #6, #8 | L | frontend, dashboard, growth-seo |
| 13 | Dashboard: Transcreate dialog + AI generate button + product translations tab | 4 | #5, #12 | L | frontend, dashboard, growth-seo |
| 14 | Dashboard: Glossary admin UI + CSV import | 4 | #8, #12 | M | frontend, dashboard, growth-seo |
| 15 | Growth ops: SERP snapshot + DataForSEO wire + budget cap | 5 | #2, #3 | L | backend, growth-seo, dataforseo |
| 16 | Growth ops: NLP score endpoint + inline editor panel (Surfer-style) | 5 | #15 | L | frontend, backend, growth-seo |
| 17 | Growth ops: internal linking auto-inject + suggest endpoint | 5 | #5 | M | backend, growth-seo, security |
| 18 | Growth ops: cannibalization + drift + hreflang-audit + topical-authority + QA crons | 5 | #2, #3, #5 | XL | backend, cron, growth-seo |
| 19 | QA: extend e2e suites + attestation v2 | 6 | all | L | qa, e2e, growth-seo |

### Dependency graph

```
#1 → {#2, #4, #9}
#2 → #3 → #5 → {#6, #7, #17, #18}
#3 → #15 → #16
#6 → #12 → {#13, #14}
#7 → #8 → #14
#9 → {#10, #11}
#1..#18 → #19
```

### Milestones

| Milestone | Issues | Sprint |
|-----------|--------|--------|
| Schema & Contracts | #1, #2, #3, #4 | 1 |
| Backend API | #5, #6, #7, #8 | 2 |
| Public Routing | #9, #10, #11 | 3 |
| Dashboard | #12, #13, #14 | 4 |
| Growth Ops | #15, #16, #17, #18 | 5 |
| QA & Release | #19 | 6 |

---

## 8. Critical Files

See plan section "Critical Files" for full list:
- Create: ~25 new files (endpoints, components, migrations, tests, scripts).
- Modify: ~12 existing files (hardcode fixes, wiring, schemas).
- Reuse: 4 helpers/fixtures (hreflang, contract schema, e2e fixtures, ux-fluency script).

---

## 9. Verification Protocol

Per phase:
- **Phase 1:** `supabase db reset --local`, `npm run type-check`.
- **Phase 2:** manual curl + structured log assertion + A-0 e2e pass.
- **Phase 3:** sitemap xhtml:link grep ≥1, hreflang in HTML, 200 on `[locale]`.
- **Phase 4:** Chrome DevTools MCP manual walk + bulk 3-post create.
- **Phase 5:** per-endpoint curl + log audit.
- **Phase 6:** full e2e `--grep "@real-data"` + Lighthouse + attestation v2.

Full commands in plan section "Verification".

---

## 10. Security

- RLS policies per `website.account_id`.
- Service role keys server-side only.
- XSS: rehype-sanitize LLM output + internal linking.
- CSV injection guard: papaparse + strip `= @ + -` prefix + row limit 500.
- Rate limit NLP score 1 req/s/user + SERP snapshot 10 req/hour/website.
- Budget cap DataForSEO + NVIDIA Nim via `seo_provider_usage`.
- Evidence pre-commit grep: `password|service_role` must return 0.

---

## 11. Rollback Plan

- All migrations additive (`ADD COLUMN NOT NULL DEFAULT`) — rollback via DROP COLUMN preserves data.
- `translation_group_id` backfill with row `id` preserves original state.
- Feature flag `ENABLE_MULTI_LOCALE_ROUTING` in middleware allows public routing revert without code deploy.
- Per-issue rollback notes in issue bodies.

---

## 12. Open Questions

1. **Dashboard language:** CLAUDE.md says English, shipped is Spanish. Confirm with product owner — update ADR or convert copy.
2. **Cloudflare KV namespace:** does project have one provisioned for `WEBSITES_LOCALE_CACHE`? If not, fallback in-memory Map per Worker instance.
3. **pg_cron vs Cloudflare Cron Triggers:** pick one for scheduled endpoints (drift, hreflang-audit, topical-authority, cannibalization). Cloudflare preferred if endpoints require Worker runtime.
4. **DataForSEO cost target:** confirm monthly cap budget ($50 assumed).

---

## 13. Growth Hacker Rating (post-implementation)

Estimated: **A- (8.5/10)**

| Platform | Parity |
|----------|--------|
| Semrush | ~35% |
| Surfer SEO | ~40% |
| Lokalise | ~50% |
| Ahrefs Site Audit | ~20% |

Enough to compete for mid-market agencies (1-5 person growth teams) at fraction of SaaS cost. Enterprise gaps: backlinks depth, crawler propio, rank tracker histórico >90d, reviewer workflow.

---

## References

- Plan source: `/Users/yeisongomez/.claude/plans/hacer-la-siute-de-mellow-dolphin.md`
- QA evidence: `docs/evidence/growth-readiness/ux-fluency.md`
- SEO playbook: `docs/seo/SEO-PLAYBOOK.md`
- Prior SPEC (EPIC #86): `docs/specs/SPEC_SEO_CONTENT_INTELLIGENCE_INTEGRAL.md`
- ADRs: 001, 002, 003, 005, 007, 008, 009, 010, 011, 012, 016
