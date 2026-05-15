# CODE GATE — ColombiaTours locale/trust recovery (Week 2)

**Gate**: T3 CODE GATE
**Spec**: `docs/specs/generated/colombiatours-locale-trust-recovery-SPEC.md`
**Validator**: tech-validator
**Date**: 2026-05-15
**Status**: PASS

## Summary

All 6 check criteria pass. Implementation faithfully follows the SPEC and
parent T2 plan. Changes are clean, well-typed, well-tested, and introduce
no regressions.

## Check 1 — No Tenant-Breaking Hacks

**Status: PASS**

| Sub-check | Evidence |
|---|---|
| All changes in generic lib/ and components/ | `lib/site/contact-channels.ts` — new generic helper; `public-ui-messages.ts` — multi-locale dictionaries; `system-fallback-pages.ts` — locale-aware fallback copy; `hotel-card.tsx` — generic CSS/component placeholder |
| No hardcoded subdomain/tenant overrides | Zero occurrences of `colombiatours` or tenant-specific skips in changed files |
| ADR-009 compliance | All strings come from locale dictionaries or `CATEGORY_CANONICAL_SEGMENT` — no generic hacks |
| ADR-007 edge compatibility | Changes are SSR dictionaries, client components, and text lookups — no Node-only APIs |

## Check 2 — Locale Correctness

**Status: PASS**

| Sub-check | Evidence |
|---|---|
| FR UI dictionary verified | `home: 'Accueil'`, `packages: 'Forfaits'`, `footer.company: 'Agence'`, `searchPage.title: 'Que recherchez-vous ?'`, `phoneLabel: 'Téléphone'` |
| DE UI dictionary verified | `home: 'Startseite'`, `destinations: 'Reiseziele'`, `footer.company: 'Agentur'`, `searchPage.title: 'Wonach suchen Sie?'`, `phoneLabel: 'Telefon'` |
| ES search title punctuation | `'¿Qué estás buscando?'` with opening and closing punctuation |
| PT search title accents | `'O que você está procurando?'` with proper accents on "você" and "está" |
| FR/DE fallback copy | Contact: `Contactez-nous` / `Kontaktieren Sie uns`; Press: `Presse` / `Presse`; Phone labels: `Téléphone` / `Telefon` |
| MESSAGES_BY_LOCALE mapping | `'fr-FR': FR_FR_MESSAGES`, `'de-DE': DE_DE_MESSAGES` — no longer mapped to ES_CO_MESSAGES |
| Test verification | `expect(french.nav.packages).not.toBe('Paquetes')` |
| English fallback for unrecognized locales | `getFallbackCopy` returns `FALLBACK_COPY['en-US']` as default |

## Check 3 — SEO/Canonical/Hreflang Impact

**Status: PASS**

| Sub-check | Evidence |
|---|---|
| Duplicate title fix | `/buscar` title changed from `'Buscar | ${siteName}'` to `'Buscar'` — layout template already appends `%s | ${siteName}` |
| Description null-safety | Description now has broader fallback chain: `account?.name || siteName || subdomain` |
| Canonical URL unchanged | Same `buildCanonicalUrl(baseUrl, pathname, localeContext)` pattern |
| Locale-aware category links | Search no-result links use `CATEGORY_CANONICAL_SEGMENT` with ES/EN/PT/FR/DE entries for all 5 product types — ADR-019 compliant |
| No new hreflang for untranslated content | Fallback pages don't add hreflang alternates — ADR-020 compliant |
| Robots unchanged | `/buscar` retains `noindex, follow`; fallback pages remain published `is_published: true` |

## Check 4 — Types and Tests

**Status: PASS**

| Sub-check | Evidence |
|---|---|
| Typecheck | `npm run typecheck` — PASS (0 errors) |
| Targeted tests | 4 suites, 17 tests — ALL PASS |
| Full suite regression | Same baseline failures on both branches: 17 suites/42 tests — ZERO REGRESSION |
| Lint | PASS (pre-existing warnings only from unrelated files) |
| hardcoded-ui check | `node scripts/lint-hardcoded-public-ui.mjs` — PASS ("ok") |

**Test coverage:**

| Test file | Tests |
|---|---|
| `__tests__/lib/site/contact-channels.test.ts` | 4 new tests: phone digit sanitization, email validation, structured preference, fallback chain |
| `__tests__/lib/site/public-ui-messages.test.ts` | 2 updated tests: FR/DE dedicated dictionaries, ES/PT polished titles |
| `__tests__/lib/site/system-fallback-pages.test.ts` | 2 new tests: locale-aware contact copy (FR), locale-aware press copy (DE) |
| `__tests__/components/.../hoteles-list.test.tsx` | 1 new test: branded image placeholder (no src=null/undefined) + 1 assertion added to count test |

## Check 5 — Regression Risk

**Status: PASS**

| Sub-check | Evidence |
|---|---|
| contact-channels.ts | New helper, no existing code paths affected unless explicitly imported — all 4 imports are deliberate (header, footer, layout, system-fallback-pages) |
| Header/footer CTA resolution | Replaced inline `whatsappRaw` parsing with centralized helper — same behavior, less buggy |
| Layout waflow number | Same replacement pattern — priority chain extended (contact.whatsapp + contact.phone added to fallback) |
| Search metadata | Removed `siteName` var duplication → safer fallback chain, same observable output |
| Search category links | Previously hardcoded Spanish slugs → now locale-aware via CATEGORY_CANONICAL_SEGMENT; falls back to Spanish if language not found |
| Hotel card placeholder | `<div>` wrapper always rendered (was conditional on imageUrl); empty image case now shows branded placeholder instead of invisible element |
| Fallback pages locale | Now receives `localeContext.resolvedLocale` from the existing slug route — same pattern as other locale-aware code in same file |
| Build:worker | BLOCKED: requires Node 22+ (current env Node 20.19.2) — known pre-existing caveat, not related to PR |

## Check 6 — Secrets

**Status: PASS**

| Sub-check | Evidence |
|---|---|
| Static secrets scan | `grep -E "(api_key|secret|password|token)" on added lines — no matches (exit 1 = clean) |
| Security patterns | `os.system`, `subprocess.shell`, `eval`, `exec`, `pickle` — no matches |
| e2e auth fixture | Pre-existing, not part of PR |
| .dev.vars | No changes |
| No hardcoded credentials | Verified across all 16 changed files |

## Verdict: PASS

```
+-------------------------------------------------------------+
|                   CODE GATE VERDICT                          |
+----------------------+--------------------------------------+
| No tenant-breaking   | PASS — all changes in generic files   |
| Locale correctness   | PASS — FR/DE verified, PT/ES polished |
| SEO/canonical/hrefl  | PASS — title fix, locale-aware links  |
| Types/tests          | PASS — tsc 0 err, 17/17 tests pass    |
| Regression risk      | PASS — zero new failures, safe changes|
| Secrets              | PASS — clean scan, no credentials     |
+----------------------+--------------------------------------+
| FINAL: PASS | 6/6 checks clear                             |
| Implementation faithfully follows SPEC.                    |
| Build:worker blocked by Node 20 (not a PR issue).          |
| Proceed to PR #551 against feat/colombiatours-public-     |
| routing-recovery.                                          |
+-------------------------------------------------------------+
```

## Changed Files (16)

```
M  __tests__/components/site/themes/editorial-v1/pages/hoteles-list.test.tsx
A  __tests__/lib/site/contact-channels.test.ts
M  __tests__/lib/site/public-ui-messages.test.ts
M  __tests__/lib/site/system-fallback-pages.test.ts
M  app/site/[subdomain]/[...slug]/page.tsx
M  app/site/[subdomain]/buscar/page.tsx
M  app/site/[subdomain]/buscar/search-client.tsx
M  app/site/[subdomain]/layout.tsx
M  components/site/product-detail/p2/hotel-card.tsx
M  components/site/themes/editorial-v1/layout/site-footer.tsx
M  components/site/themes/editorial-v1/layout/site-header.tsx
A  lib/site/contact-channels.ts
M  lib/site/public-ui-messages.ts
M  lib/site/system-fallback-pages.ts
M  docs/INDEX.md
M  docs/specs/generated/colombiatours-locale-trust-recovery-SPEC.md
```

## Known Caveat

Build:worker (`npm run build:worker`) requires Node 22+ and fails at the
version check in the current environment (Node 20.19.2). This is a
pre-existing environment issue, not a PR problem. Run the build in a
Node 22+ environment (via `nvm use 22` or similar) before merging.
