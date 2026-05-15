# PLAN GATE — ColombiaTours locale/trust/commercial UX recovery (Week 2)

**Gate**: T1 PLAN GATE
**SPEC**: `docs/specs/generated/colombiatours-locale-trust-recovery-SPEC.md`
**Validator**: tech-validator
**Date**: 2026-05-15
**Status**: PASS

## Summary

All 6 check criteria pass. One minor WARN on FR2 title fix specificity — does not block.

## Check 1 — Locale Architecture (FR/DE UI mapping, PT strings, hreflang ADR-020)

**Status: PASS**

| Sub-check | Evidence |
|---|---|
| FR1 FR/DE UI mapping correctness | Static inspection confirms `getPublicUiMessages('fr-FR')` and `getPublicUiMessages('de-DE')` return `ES_CO_MESSAGES`. SPEC correctly requires `FR_FR_MESSAGES` + `DE_DE_MESSAGES` and `MESSAGES_BY_LOCALE` remap. |
| Scope governance | Untranslated body content explicitly excluded from code scope; governed by noindex/fallback policy (FR1 line 136). |
| ADR-019 compliance | SPEC references ADR-019 (line 44-47). Confirmed `CATEGORY_CANONICAL_SEGMENT` exists with ES/EN/PT/FR/DE entries for all 4 product types (locale-routing.ts lines 53-59). |
| ADR-020 compliance | SPEC states no hreflang emitted solely for UI chrome (FR1 line 136-137). Acceptance examples verify locale codes (`fr-FR`, `de-DE`), `x-default` defaulting to canonical. |
| Acceptance examples | FR1 lines 140-142 give concrete PASS/FAIL examples for FR/DE chrome (e.g., `'Destinations'` not `'Destinos'`). |
| PT accent improvements | SPEC line 133 requires PT-BR strings and improved accented copy for strings touched this sprint. |
| Edge compatibility (ADR-007) | Changes are UI dictionaries + client-dictated in SSR — no Node-only APIs, no heavy per-request processing. |

Minor note: SPEC implicitly complies with ADR-020 Rule 4 (reciprocal links) because FR/DE pages with only UI chrome should not emit hreflang at all → no reciprocity to maintain.

## Check 2 — Metadata/SEO Safety (title duplication, robots, hreflang)

**Status: PASS with WARN**

| Sub-check | Evidence |
|---|---|
| Title duplication root cause | Confirmed: `app/site/[subdomain]/layout.tsx` line 176 has `template: '%s | ${siteName}'`. Search page line 25 sets `title: \`Buscar | ${siteName}\`` → produces `Buscar | X | X`. SPEC correctly identifies this. |
| FR2 duplicate title fix | SPEC FR2 (lines 147-151) requires single site-name title. Task 3 (line 263) specifies "prevent duplicate site name." **WARN**: Should be more explicit: fix is to set `title: 'Buscar'` (remove `${siteName}` since parent template appends it). Intent is clear enough for coding. |
| FR2 search copy fix | `¿Qué estás buscando?` specified correctly with opening punctuation. PT `O que você está procurando?` also specified (Task 2 line 245). |
| FR2 robots | `noindex, follow` retained (line 154). Current page.tsx line 32 already has `robots: { index: false, follow: true }`. |
| FR2 route-safe links | SPEC references `CATEGORY_CANONICAL_SEGMENT` machinery. Confirmed FR/DE entries exist for all categories. Task 3 (lines 265-269) specifies stable slugs: `/destinos`, `/hoteles`, `/actividades`, `/paquetes`. |

## Check 3 — Data-vs-Code Separation

**Status: PASS**

| Sub-check | Evidence |
|---|---|
| Clean boundary defined | Section 9 (lines 414-431): explicit mapping of what code owns vs data/content owns. |
| Code scope | UI dictionaries, metadata behavior, route-safe links, hotel card placeholder, contact channel normalization. |
| Data/content scope | Full transcreation, canonical media assets, blog cleanup, activity content, taxonomy data. |
| P2 inventory-only | Section 4 P2 (lines 106-110) is explicitly inventory-only — no content/data mutation in this sprint. |
| ADR-021 compliance | SPEC line 53-55: "This sprint is remediation, not full transcreation" + "data/content remediation separated from code." |
| ADR-028 compliance | Hoteles image fallback (FR3 lines 160-163): prefer canonical assets, add safe placeholders only when data absent. |
| Multi-tenant safety (ADR-009) | SPEC line 37: "ColombiaTours-specific content lives in data/config or scoped fallback." |
| No schema migration | SPEC line 116: "No new database schema migrations unless tech-validator explicitly approves." |

## Check 4 — Commercial Trust Acceptance (CTAs, channels, image fallback)

**Status: PASS**

| Sub-check | Evidence |
|---|---|
| FR5 channel resolution priority | SPEC lines 192-196: structured columns → account → contact → social — clear priority chain. |
| FR5 sanitized links | `wa.me` links must be sanitized to digits (line 197). No `mailto:undefined`/empty CTAs (line 198). |
| FR5 locale-aware CTAs | CTA text locale-aware where surrounding page is locale-aware (line 199). |
| FR5 smoke scope | Header/footer/fallback + at least one product/detail CTA (line 200). |
| FR4 contact/press narrow scope | Only single-segment known aliases (line 169). CMS-first, no broad 404 masking (line 170). Unknown/multi-segment returns null (line 172). |
| FR4 English fallback for non-ES | Line 188: English fallback for incomplete locale strings rather than Spanish. |
| FR3 hotel image trust | Count spacing fix, missing image handling, data remediation inventory for unrecoverable cases (lines 157-164). |
| ADR-028 for placeholders | SPEC line 56: "prefer canonical product/media assets" — correct. |
| Data inventory format | SPEC line 164: minimum fields (name, slug, missing field, owner) — adequate for plan gate. |

## Check 5 — Test Plan Adequacy

**Status: PASS**

| Sub-check | Evidence |
|---|---|
| FR1 locale tests | Task 2 lines 246-249: FR nav.packages not Spanish, DE footer.company not Spanish, ES title accents, PT title accents. |
| FR2 search tests | Task 3: title metadata + robots + category link tests. |
| FR3 hotel tests | Task 6 line 330: count text format test. |
| FR4 fallback tests | Task 4 lines 284-290: ES contact, non-ES contact, unknown slug null, multi-segment null, CMS-first behavior. |
| FR5 channel tests | Task 5 line 310: unit tests for `resolveWebsiteContactChannels`. |
| Static checks | Section 8 lines 406-408: `npx tsc --noEmit`, lint for touched files. |
| Route validation | Section 8 lines 409-411: session-pool local probes. Task 8 acceptance matrix has route evidence table. |
| Edge compatibility (ADR-007) | Tests don't explicitly mention edge-compat but modified files are SSR dictionaries/text — no new edge-incompatible APIs. |
| P2 inventory | Documented as file diff evidence in acceptance matrix (line 394). |

## Check 6 — Rollback Plan Completeness

**Status: PASS**

| Sub-check | Evidence |
|---|---|
| Rollback triggers | Section 11 (lines 454-460): 500 errors, leaked internal URLs, indexable /buscar, misleading hreflang, 404 masking, broken listings. |
| Rollback levels | 4 levels: code revert, data rollback, CF Worker rollback (ops-only), revalidation. |
| No manual deploy | SPEC line 117, 447-449 explicitly prohibits manual deployment/rollback by agents. |
| Post-rollback validation | Level 4: "revalidate affected paths using existing revalidation runbook" (line 467). |
| Edge/bundle safety | Changes are small (dictionaries, fallback strings, helper functions) — no meaningful bundle or memory impact. Triggers don't need to include size/memory for this scope. |

## Verdict: PASS

```
┌─────────────────────────────────────────────────────────────┐
│                    PLAN GATE VERDICT                         │
├───────────────┬─────────────────────────────────────────────┤
│ Locale arch   │ PASS — ADR-019/020 compliant, FR/DE dicts   │
│ Metadata/SEO  │ PASS (WARN) — title fix needs precise impl  │
│ Data/code sep │ PASS — clean boundary, no scope creep       │
│ Trust/CTA     │ PASS — concrete acceptance, narrow scope    │
│ Test plan     │ PASS — unit + static + route evidence       │
│ Rollback      │ PASS — 6 triggers x 4 levels, ops-only      │
├───────────────┴─────────────────────────────────────────────┤
│ FINAL: PASS │ 6/6 checks clear │ 1 non-blocking WARN       │
│ Proceed to implementation on feat/colombiatours-locale-     │
│ trust-recovery.                                             │
└─────────────────────────────────────────────────────────────┘
```

## Non-blocking WARN

FR2/3(262-263): "Change search page metadata to prevent duplicate site name" could be more specific: the fix is to set `title: 'Buscar'` (remove `${siteName}`) since parent layout already applies `template: '%s | ${siteName}'`. The intent is clear enough for an experienced developer but noting for the implementer.

## ADR compliance summary

| ADR | Status | Notes |
|-----|--------|-------|
| ADR-007 Edge-first delivery | ALIGNED | SSR dictionaries, no new Node-only APIs |
| ADR-009 Multi-tenant subdomain | ALIGNED | Content in data/config scoped, no tenant-breaking hacks |
| ADR-011 Middleware cache | ALIGNED | No new unbounded cache entries; uses existing machinery |
| ADR-013 Tech validator gate | COMPLIANT | This PLAN gate is the ADR gate |
| ADR-019 Multi-locale URL routing | ALIGNED | References canonical segment machinery, path-prefix strategy |
| ADR-020 hreflang emission | ALIGNED | No hreflang for untranslated fallback-only pages |
| ADR-021 Transcreation pipeline | ALIGNED | Code scope separated from transcreation; data remediation separated from code |
| ADR-028 Media assets registry | ALIGNED | Prefers canonical assets; safe placeholders only when data absent |
