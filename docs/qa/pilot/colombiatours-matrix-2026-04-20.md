# ColombiaTours Matrix — 2026-04-20 (Pilot Seed Run)

**Context**: Stage 6 autonomous execution of EPIC #214 #213 Flow 2 (product-detail matrix).
Data source: **pilot seed** (`seedPilot('baseline')` + `seedPilot('translation-ready')`), **not** live ColombiaTours production data. Real-data run remains a partner-gated task (Flow 1).

**Branch**: `qa/213-stage-6-flow-2-3-execution`
**Base commit**: `5b891fc` (Stage 5 W7-b training merged)
**Run date**: 2026-04-20
**Session slot**: s1 (port 3001)
**Executor**: Claude Opus 4.7 (autonomous portion)
**Playwright**: 1.58.2 local (local bin workaround due to `node_modules/.bin/playwright` symlink pointing at experimental-ct-react CLI — invoked `node node_modules/playwright/cli.js` directly)
**Node**: 24.1.0
**Server mode**: Next.js 15 dev (Turbopack, `.next-s1` cache, port 3001)

Related:
- [[product-detail-matrix]] — canonical 48-row source of truth
- [[matrix-playbook]] — W6 playbook
- [[ADR-024]] — Booking V1 DEFER
- [[ADR-025]] — Studio/Flutter field ownership (hotels read-only)
- [[ADR-020]] — hreflang emission rules

## Pinned fixture IDs

Per seed factory `e2e/setup/pilot-seed.ts`:

| Content type | Slug | Variant | Status |
|--------------|------|---------|--------|
| Package | `pilot-colombiatours-pkg-baseline` | baseline | OK (200) |
| Activity | `pilot-colombiatours-act-baseline` | baseline | **MISSING** — seed insert fails with `cover_image_url` schema cache error |
| Hotel | `aloft-bogota-airport` | flutter-owner (pre-existing) | OK (200), but no Studio overlay (ADR-025) |
| Blog post | `pilot-colombiatours-blog-translation-ready` | translation-ready | OK (200) |

## Browser matrix — pilot-w6 specs

| Browser | Setup | Matrix pass | Matrix skip | Matrix fail | Total |
|---------|-------|-------------|-------------|-------------|-------|
| chromium | 1 pass | 0 | 3 (activities) | 6 | 10 |
| firefox | 1 pass | 0 | 3 (activities) | 6 | 10 |
| mobile-chrome | 1 pass | 0 | 3 (activities) | 6 | 10 |

All three browsers produced identical pass/skip/fail counts — failures are deterministic structural or seed-coupled, not browser-specific flakes.

JSON reports (one per browser):
- `artifacts/qa/pilot/2026-04-20/flow-2/matrix-chromium.json`
- `artifacts/qa/pilot/2026-04-20/flow-2/matrix-firefox.json`
- `artifacts/qa/pilot/2026-04-20/flow-2/matrix-mobile-chrome.json`

Human-readable console:
- `artifacts/qa/pilot/2026-04-20/flow-2/matrix-chromium-console.log`

## Matrix status by content type

### Package (pilot-colombiatours-pkg-baseline)

Desktop walk: **timedOut@90s** (visual snapshot helper `freezeAnimations` hit context closure — suspected slow `networkidle` under Turbopack dev; recovery across reruns intermittent).
Mobile walk: **failed** — Row #15 Miga de pan (breadcrumb `<a href*="/paquetes">`) resolves but computed `visibility: hidden` on viewport width Pixel 5 (390×844). Likely a CSS `md:` visibility class hiding the category back link on `<md` breakpoints.

| Matrix row | Status | Evidence |
|-----------|--------|----------|
| #1..#14 hero + chips | pending (timed out before assertions completed desktop) | screenshots in `test-results/s1/pilot-matrix-*-package*` |
| #15 breadcrumb | **fail on mobile**; desktop timed out | breadcrumb hidden on mobile viewport |
| #16..#48 | pending | — |

**Remediation owner**: nextjs-developer / W8 follow-up.
- Breadcrumb mobile visibility → CSS fix (remove `hidden md:flex` or surface a mobile variant).
- Desktop timeout → investigate `networkidle` interaction with Turbopack HMR (likely needs `domcontentloaded` for dev mode per playbook).

### Activity (pilot-colombiatours-act-baseline)

All 3 activity specs **skipped** (`conditional-skip`) on all three browsers. Root cause in skip annotation:

```
Pilot baseline seed missing activity — warnings: pilot: activities insert (pilot-colombiatours-act-baseline) failed:
Could not find the 'cover_image_url' column of 'activities' in the schema cache
```

The seed factory (`e2e/setup/pilot-seed.ts`) attempts to insert into `activities.cover_image_url` but the Supabase schema cache for this environment does not expose that column. Either:
- the column was renamed/removed post-W4 seed authoring, or
- the `.env.local` points at a stale project/branch.

**Remediation owner**: backend-dev (schema refresh or seed column rename).
**Impact**: AC-B activity row coverage (Pkg+Act editable cells #2, #3, #14, #17..#20, #30, #31, #35, #41..#43, #48) cannot be asserted on pilot seed until seed is fixed.

### Hotel (aloft-bogota-airport)

Desktop walk: **failed** with 5 matrix-row failures:

| # | Row | Status | Note |
|---|-----|--------|------|
| 35 | Preguntas frecuentes (FAQ accordion) | fail | `[data-testid="detail-faq"]` present but hidden (likely rendered empty + CSS `display:none` when no FAQ entries) |
| 41 | Título SEO `<title>` | fail | element not found in DOM |
| 42 | Meta description | fail | `head meta[name="description"]` absent |
| 44 | JSON-LD Product schema | fail | `script[type="application/ld+json"]` not visible |
| 45 | JSON-LD BreadcrumbList | fail | same — no JSON-LD script |

Mobile walk: **failed** — 2 failures:
- Row #15 breadcrumb hidden on mobile (same as package)
- Row #35 FAQ hidden (same as desktop)

**Remediation owner / classification**:
- Rows #41/#42/#44/#45 → **structural SEO gap** for hotel detail. Per ADR-025 hotels are Flutter-owner but the Studio public render of the hotel detail page should still emit a valid `<title>`, meta description, and structured data. This is a **regression signal** or a **seed gap** depending on whether `aloft-bogota-airport` has any SEO meta at all in the DB. File remediation ticket.
- Row #35 → seed-coupled (no FAQ entries on `aloft-bogota-airport`). Document as `conditional-skip` candidate; matrix spec should gate on non-empty FAQ.
- Row #15 mobile breadcrumb → same CSS fix as package mobile.

### Blog (pilot-colombiatours-blog-translation-ready)

es-CO default walk: **failed** — `expect JSON-LD BlogPosting/Article node on blog detail` returned `undefined`.
en-US translated walk: **failed** — `expect hreflang="x-default" per ADR-020` returned `false`.

**Remediation owner / classification**:
- Blog BlogPosting JSON-LD missing → Section P canonical matrix row P7 (JSON-LD Article + inLanguage) failing. `lib/seo/public-structured-data.ts` must emit `BlogPosting` for `/blog/:slug` routes. **Regression**, not seed — publish ticket.
- `hreflang="x-default"` missing on translated blog → ADR-020 compliance gap. Hreflang builder for blog routes is not emitting the `x-default` pair when EN variant exists. **Regression**, publish ticket.

## Row-by-row cross-reference vs canonical matrix

Legend: `ok` = asserted pass, `fail` = asserted fail, `skip` = conditional or `na-skip`, `pending` = not reached due to upstream failure (timeout / context close), `na` = n/a per section policy.

### Section A — Cabecera (Hero)

| # | Info | Pkg | Act | Hotel | Blog (Section P equiv.) |
|---|------|-----|-----|-------|--------|
| 1 | Cover image | pending | skip (seed) | ok | ok (P1) |
| 2 | Title (custom_hero.title) | pending | skip | ok | ok (P2) |
| 3 | Subtitle | pending | skip | ok | — |
| 4 | Category | pending | skip | ok | — |
| 5 | Duration chip | pending | skip | na | na |
| 6 | Location chip | na | skip | ok | — |
| 7 | Rating chip | pending | skip | ok | — |
| 8 | Group size chip | pending | na | na | na |
| 9 | Inclusions chips | na | skip | na | na |
| 10 | Stars (hotel) | na | na | ok | na |
| 11 | Price "Desde" | pending | skip | ok | na |
| 12 | WhatsApp | pending | skip | ok | na |
| 13 | Phone | pending | skip | ok | na |
| 14 | Video button (#165) | pending | skip | na | na |

### Section B — Navigation / Route

| # | Info | Pkg | Act | Hotel | Blog |
|---|------|-----|-----|-------|------|
| 15 | Breadcrumb | **fail (mobile)** | skip | **fail (mobile)** | — |
| 16 | Sticky CTA | pending | skip | ok | na |

### Section C — Main content

| # | Info | Pkg | Act | Hotel | Blog |
|---|------|-----|-----|-------|------|
| 17 | Highlights grid | pending | skip | skip (empty) | — |
| 18 | Gallery | pending | skip | ok | ok (P4) |
| 19 | Long description / body | pending | skip | ok | ok (P3) |
| 20 | Video modal | pending | skip | na | na |

### Section D — Activity-specific

| # | Info | Pkg | Act | Hotel | Blog |
|---|------|-----|-----|-------|------|
| 21 | Recommendations | na | skip | na | na |
| 22 | Base rate | na | skip | na | na |
| 23 | Schedule timeline | na | skip | na | na |

### Section E — Package-specific

| # | Info | Pkg | Act | Hotel | Blog |
|---|------|-----|-----|-------|------|
| 24 | Route map | pending | na | na | na |
| 25..29 | Day-by-day | pending | na | na | na |

### Section F — Inclusions / exclusions

| # | Info | Pkg | Act | Hotel | Blog |
|---|------|-----|-----|-------|------|
| 30 | Inclusions | pending | skip | na | na |
| 31 | Exclusions | pending | skip | na | na |

### Section G — Map / location

| # | Info | Pkg | Act | Hotel | Blog |
|---|------|-----|-----|-------|------|
| 32 | Multi-stop circuit | na | skip | na | na |
| 33 | Meeting point | pending | skip | ok | na |

### Section H — Prices / options

| # | Info | Pkg | Act | Hotel | Blog |
|---|------|-----|-----|-------|------|
| 34 | Options table | pending | skip | ok | na |

### Section I — Conversion / trust

| # | Info | Pkg | Act | Hotel | Blog |
|---|------|-----|-----|-------|------|
| 35 | FAQ | pending | skip | **fail** (desktop + mobile) | — |
| 36 | Trust badges | pending | skip | ok | na |
| 37 | Google reviews | pending | skip | ok | na |

### Section J — Sidebar

| # | Info | Pkg | Act | Hotel | Blog |
|---|------|-----|-----|-------|------|
| 38 | Sticky summary | pending | skip | ok | na |

### Section K — Closing

| # | Info | Pkg | Act | Hotel | Blog |
|---|------|-----|-----|-------|------|
| 39 | Final CTA | pending | skip | ok | na |
| 40 | Related carousel | pending | skip | ok | na |

### Section L — SEO / metadata

| # | Info | Pkg | Act | Hotel | Blog (Section P) |
|---|------|-----|-----|-------|------|
| 41 | SEO title `<title>` | pending | skip | **fail** | ok (P5) |
| 42 | Meta description | pending | skip | **fail** | ok (P5) |
| 43 | OG image | pending | skip | ok | ok (P5) |
| 44 | JSON-LD Product | pending | skip | **fail** | **fail** (P7 BlogPosting) |
| 45 | JSON-LD Breadcrumb | pending | skip | **fail** | — |
| 46 | JSON-LD FAQ | pending | skip | na (empty) | na |
| 47 | JSON-LD VideoObject (#165) | pending | skip | na | na |
| 48 | robots noindex | pending | skip | ok | ok |

### Section M — Booking (DEFER per ADR-024)

All rows `na-skip` across all content types. Matrix spec skips via `PILOT_BOOKING_ENABLED=false`. No assertion attempted.

### Section P — Blog detail

| # | Info | Blog |
|---|------|------|
| P1 | Hero image | ok |
| P2 | Title + author + date | ok |
| P3 | Body | ok |
| P4 | Gallery | ok |
| P5 | SEO metadata | ok |
| P6 | hreflang + canonical | **fail** (en-US route missing `x-default`) |
| P7 | JSON-LD Article + inLanguage | **fail** (no BlogPosting on es-CO route) |
| P8 | Language switcher | pending |

### Cross-locale

- Language switcher visibility per product type: **pending** (blocked by upstream matrix failures).

## Known skips with justification

| Spec | Skip reason | Category |
|------|-------------|----------|
| `pilot-matrix-public-activity` × 3 (desktop/mobile/editable-loop) | Seed insert failed (`activities.cover_image_url` schema cache miss) | **seed bug** — remediation owner: backend-dev |
| Section M booking rows across all content types | `PILOT_BOOKING_ENABLED=false` per ADR-024 | **defer** |
| Matrix rows with `na` status per content type | Section policy (e.g. stars on hotel only) | **na** |

## Failure ownership summary

| Failure | Root cause | Owner | Follow-up ticket |
|---------|------------|-------|------------------|
| Blog JSON-LD BlogPosting (es-CO) | `lib/seo/public-structured-data.ts` does not emit `BlogPosting` for blog route | nextjs-developer | file new |
| Blog hreflang x-default (en-US) | hreflang builder lacks `x-default` pair for translated blogs | nextjs-developer | file new |
| Hotel `<title>` + meta description + 2 JSON-LD | Studio public render for hotels emits no `metadata` block | nextjs-developer | check whether `aloft-bogota-airport` has SEO data, else seed gap |
| Hotel FAQ hidden (desktop + mobile) | Empty FAQ array rendered as hidden container | nextjs-developer | accordion conditional render |
| Breadcrumb hidden on mobile (pkg + hotel) | CSS visibility class scoping (`md:flex` etc.) | nextjs-developer | mobile CSS fix |
| Package desktop timeout | Turbopack dev + `networkidle` race during `page.addStyleTag` | QA / playwright config | retry with `domcontentloaded` or use prod-build profile |
| Activity seed skip | Pilot seed factory column mismatch | backend-dev | schema cache refresh or column rename |

## Conclusion

**Matrix walk status on pilot seed**: 0 content types cleanly pass (pkg timed out + blog fails structural + hotel fails SEO + activity seed-skipped). Same result across chromium / firefox / mobile-chrome (no browser-specific flakes). Pre-commit regression surface is limited to the SEO-related rows on blog + hotel, which are already known gaps from W4/W5 follow-ups. Package mobile breadcrumb is a confirmed mobile-CSS regression.

Partner-gated re-run on live ColombiaTours data (Flow 1) still required before cutover — ops #63 env vars + ops #65 multi-locale migration must ship first.
