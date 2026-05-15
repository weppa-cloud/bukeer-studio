# ColombiaTours LIVE AUDIT Report

**Date:** 2026-05-15
**Target:** https://colombiatours.travel
**Role:** T2 LIVE AUDIT — Critical Public Navigation
**Auditor:** QA Engineer

---

## Summary

**Score estimate:** 4.5 / 10

- **P0 (Critical):** 2 issues — contact page is soft-404, press page is soft-404
- **P1 (High):** 5 issues — i18n broken for PT/FR/DE, meta/title quality, missing hotel images
- **P2 (Medium):** 4 issues — placeholder content in activity steps, test blog posts visible, generic blog subtitles, planner filter counts
- **P3 (Low):** 1 issue — missing space in hotel counter text

---

## P0 — Critical (blocks core business flow)

### P0-1: `/contacto` → 301 → `/contact` = Soft-404

- **HTTP:** `/contacto` 301 redirects to `/contact`
- **Route:** `/contact` returns HTTP 200 but renders "Página no encontrada"
- **Impact:** Users cannot find a contact page. The 404 page has "Contactanos" link which goes to `/site/colombiatours/contacto` → 301 → `/contact` (same 404 loop)
- **Evidence:** Title is "Página no encontrada | ColombiaTours.Travel" with 200 HTTP status
- **Root cause:** Route `/contact` exists as a catch-all but has no matching page content in the DB or page registry
- **Reproduction:**
  1. Navigate to https://colombiatours.travel/contact
  2. Observe "Pagina no encontrada" heading
  3. Click "Contactanos" → redirect loop back to `/contact`

### P0-2: `/prensa` = Soft-404

- **HTTP:** Returns 200 but renders "Página no encontrada"
- **Impact:** Press/media page (linked in footer "Agencia" section) is missing
- **Evidence:** Title is "Página no encontrada | ColombiaTours.Travel"
- **Root cause:** Route exists in navigation but no page content is configured
- **Reproduction:**
  1. Navigate to https://colombiatours.travel/prensa
  2. Observe "Pagina no encontrada" heading

---

## P1 — High (significant user experience impact)

### P1-1: i18n Translation Broken for PT, FR, DE

- **HTTP status:** All 200
- **Impact:** Multilingual users (Portuguese, French, German speakers) see Spanish content. The language selector correctly shows the target language label, but page content remains 100% in Spanish.
- **Works correctly:** EN → English translations (header, footer, hero, CTAs all in English)
- **Broken:** PT, FR, DE — selector shows correct language but content is Spanish
- **Evidence:**
  - /pt: Language says "Português", content: "Colombia como la cuenta quien la camina." (Spanish)
  - /fr: Language says "Français", content: "Destinos", "Paquetes" (Spanish)
  - /de: Language says "Deutsch", content: "RECIBE HISTORIAS", "AGENCIA" (Spanish)
- **Root cause:** Translation data missing for PT, FR, DE locales. Only ES (default) and EN have translations.

### P1-2: `/buscar` — Duplicated Page Title

- **Title:** "Buscar | ColombiaTours.Travel | ColombiaTours.Travel"
- **Impact:** Site name appears twice in the HTML title tag — poor SEO
- **Evidence:** The page title has the site name concatenated twice

### P1-3: `/buscar` — Missing Opening Question Mark

- **Text:** "Que estas buscando?"
- **Issue:** Missing opening Spanish question mark (¿). Should be "¿Qué estás buscando?"
- **Impact:** Grammatical error visible to all Spanish-speaking users

### P1-4: `/hoteles` — Missing Images on Some Hotel Cards

- **Hotels without images:** "Blu Hotel by Tamaca", "Delirio Hotel", "Diez Hotel Categoría Colombia"
- **Impact:** These hotel cards appear as text-only without the image thumbnail, creating inconsistent listing quality

### P1-5: `/hoteles` — Missing Space in Counter Text

- **Text:** "63 de 63hoteles"
- **Impact:** Missing space before "hoteles", minor visual blemish

---

## P2 — Medium (quality issues, not blocking)

### P2-1: Activity Detail Page — Placeholder "test" Content

- **Route:** `/actividades/4x1-adventure`
- **Issue:** "Programa paso a paso" section contains step descriptions that are:
  1. The literal text "test"
  2. A Flutter implementation changelog as activity description (e.g., "Implementación completada. Resumen de cambios en schedule_item_modal.dart...")
- **Impact:** Users see developer/test content on a live activity page

### P2-2: Blog — Migration/Test Post Visible

- **Title:** "Guia post migracion ColombiaTours 2bf3b3b7"
- **Impact:** Internal migration post is publicly visible on the blog listing
- **Also:** Multiple blog posts share the exact same subtitle "como elegir una ruta por Colombia con sentido" — appears to be a default/fallback title pattern

### P2-3: Blog — Missing Descriptions

- Many blog posts have empty description paragraphs (no excerpt text)
- The subtitle "como elegir una ruta por Colombia con sentido" appears on at least 6 posts — duplicate SEO content

### P2-4: Planners — Filter Tabs Show Zero Counts

- **Route:** `/planners`
- "Caribe 0", "Eje Cafetero 0", "Amazonas / Pacífico 0", "Aventura 0", "Medellín 0", "Pacífico Sur 0"
- All non-default filter tabs show 0 planners despite planners being tagged with quotes mentioning these regions

---

## P3 — Low (minor/cosmetic)

### P3-1: Home page hero carousel slides tab shows "Slide 1", "Slide 2" etc. — generic ARIA labels

---

## Critical Routes — Status Summary

| Route | HTTP | Content | Console Errors | Verdict |
|-------|------|---------|----------------|---------|
| `/` | 200 | Full page, hero, destinations, footer | 0 | PASS |
| `/en` | 200 | Full EN-translated page | 0 | PASS |
| `/pt` | 200 | Spanish content (i18n broken) | 0 | FAIL (P1) |
| `/fr` | 200 | Spanish content (i18n broken) | 0 | FAIL (P1) |
| `/de` | 200 | Spanish content (i18n broken) | 0 | FAIL (P1) |
| `/paquetes` | 200 | 8 packages with images, prices | 0 | PASS |
| `/paquetes/[slug]` | 200 | Full detail, gallery, itinerary, pricing | 0 | PASS |
| `/actividades` | 200 | 50 activities with filters | 0 | PASS |
| `/actividades/[slug]` | 200 | Activity detail page | 0 | PASS (placeholder content) |
| `/hoteles` | 200 | 63 hotels with filters, map view, "Cargar más" | 0 | PASS (minor image issues) |
| `/blog` | 200 | Blog listing with category filters, search | 0 | PASS |
| `/blog/[slug]` | 200 | Full blog post with content, images | 0 | PASS |
| `/planners` | 200 | 4 planners, match questionnaire | 0 | PASS |
| `/buscar` | 200 | Search page with suggestions | 0 | PASS (title/grammar issues) |
| `/contacto` | 301→/contact | Soft-404 | 0 | FAIL (P0) |
| `/contact` | 200 (soft-404) | "Página no encontrada" | 0 | FAIL (P0) |
| `/prensa` | 200 (soft-404) | "Página no encontrada" | 0 | FAIL (P0) |
| `/politica-de-privacidad` | 200 | Full privacy policy | 0 | PASS |
| `/terminos-y-condiciones` | 200 | Full terms & conditions | 0 | PASS |
| `/politica-de-cancelacion` | 200 | Full cancellation policy | 0 | PASS |
| `/destinos/cartagena` | 200 | Destination guide page | 0 | PASS |
| `/luna-de-miel` | 200 | Full page | 0 | PASS |
| `/grupos-y-corporativo` | 200 | Full page | 0 | PASS |
| `/hoteles-boutique` | 200 | Full page | 0 | PASS |
| `/rnt-35323` | 200 | Full page | 0 | PASS |

---

## Detailed Evidence

### Screenshots captured
1. Home page — hero, destinations, footer (clean layout)
2. /paquetes — 8 package cards with prices (clean)
3. /actividades/4x1-adventure — placeholder "test" content (P2)
4. /contact — 404 page (P0)
5. /prensa — 404 page (P0)

### JS Console Errors
- **All tested pages: 0 JS console errors** ✓

### Language Switcher
- ES ↔ EN: Works correctly (header, footer, hero text all translated)
- EN → PT, FR, DE: Language label changes, page content remains in Spanish

### Navigation Headers
- Consistent across all pages (Destinos, Paquetes, Experiencias, Blog)
- WhatsApp CTA always visible
- Language/currency preferences dialog works

### Footers
- Consistent footer across all pages
- 4 columns: DESTINOS, VIAJAR, AGENCIA, RECIBE HISTORIAS
- Legal links all resolve to proper pages ✓
- "Sobre nosotros" and "Contacto" are anchor links (#about, #cta) — both sections exist on home page ✓

### 404 Page
- Has proper "Volver al inicio" (back to home) link ✓
- Has "Contactanos" link (though loops back to same 404) ✗
- Footer and header are preserved on 404 page ✓

---

## Candidate Root Causes (for developer)

### P0 Issues
1. **Contact page missing:** The `/contact` route likely matches a catch-all dynamic route (e.g., `[slug]`) but has no page record in the CMS database. Needs either: (a) creation of a contact page record, or (b) adding `/contact` → redirect to WhatsApp/home in middleware.
2. **Press page missing:** Same pattern — `/prensa` matches a catch-all but has no data. Needs a press page record or route removal.

### P1 Issues
3. **i18n missing translations:** Translation JSON/localization files only exist for ES and EN. PT, FR, DE locales exist in the locale switcher but have no translation data. The site falls back to ES when translations are absent.
4. **Title duplication:** Likely a template concatenation bug in the page metadata component where `siteName` is appended twice.
5. **Missing accent/opening question mark:** Hardcoded text in the search page component.

### P2 Issues
6. **Test/placeholder content in activity steps:** Likely leftover seed data or test entries in the activity steps database table that weren't cleaned before deployment.
7. **Migration blog post visible:** The "Guia post migracion" blog post needs to be unpublished or hidden.
8. **Generic blog subtitles:** Blog post titles with "como elegir una ruta por Colombia con sentido" auto-generated by a content fallback mechanism.

---

## Week 1 Target Assessment

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Score | ≥6.5/10 | ~4.5/10 | BELOW TARGET |
| P0 issues open | 0 | 2 | BREACH |
| Unexpected 500 on critical routes | 0 | 0 | PASS |
| Legacy internal links | 0 | 0 | PASS |

**Action required:** Fix P0-1 (contact page) and P0-2 (press page) immediately to close the gap.
