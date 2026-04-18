# Multi-Locale Transcreation Infrastructure — Shipped State

**Status:** Operational (post-EPIC #187)
**Date:** 2026-04-18
**Scope:** Documents the infrastructure that is currently shipped. For pending work, see EPIC #198.

## TL;DR

Bukeer Studio tiene infraestructura de **meta-level transcreation** operativa: SSR path-prefix routing, hreflang emission policy, AI-powered transcreate pipeline con TM + glossary, coverage matrix dashboard, y 4 tablas Supabase con RLS. Cubre 5 campos SEO (title/desc/slug/h1/keywords) sobre 48 posibles de una página de producto. **Body content, UI strings, y per-market adaptation están fuera del scope shipped** — trackeados en EPIC #198.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│ Request /en/paquetes/cartagena                              │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ middleware.ts                                                │
│ ├─ Extract subdomain (LRU cache 5min TTL)                   │
│ ├─ resolveLocaleFromPublicPath() → detect /en/ prefix       │
│ ├─ Set headers: x-public-locale, x-public-lang, etc.        │
│ └─ Rewrite /en/paquetes/X → /site/[subdomain]/paquetes/X    │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ SSR (app/site/[subdomain]/[...slug]/page.tsx)               │
│ ├─ resolvePublicMetadataLocale() → locale context           │
│ ├─ Fetch content via translation_group_id + locale          │
│ ├─ Query seo_transcreation_jobs (applied|published)         │
│ ├─ generateHreflangLinks() filtered by translated locales   │
│ └─ Render metadata + content                                │
└─────────────────────────────────────────────────────────────┘
```

## ADRs relacionadas

| ADR | Scope |
|-----|-------|
| [ADR-019](../architecture/ADR-019-multi-locale-url-routing.md) | Path-prefix routing (`/en/...`, default locale sin prefix) |
| [ADR-020](../architecture/ADR-020-hreflang-emission-policy.md) | hreflang per `supported_locales`, filtered by translated jobs; `x-default` → default locale |
| [ADR-021](../architecture/ADR-021-translation-memory-transcreation-pipeline.md) | TM → glossary → AI draft → review → apply pipeline; TRUTH_FIELD_DENYLIST |
| [ADR-006](../architecture/ADR-006-ai-streaming-architecture.md) | Streaming-first AI integration (streamText/streamObject) |
| [ADR-016](../architecture/ADR-016-seo-intelligence-caching.md) | Cache tags per website/locale/content-type |

## Data layer

### Tablas truth (contenido original)

Todas tienen `locale` + `translation_group_id` (migración `20260418000000_multi_locale_content.sql`):

| Tabla | Propósito |
|-------|-----------|
| `website_blog_posts` | Blog posts — cada EN/PT es row separada con `translation_group_id` del ES |
| `website_pages` | Custom pages (home, about, etc.) |
| `destinations` | Destinations (owner: account, no website) |
| `website_product_pages` | Product SEO overrides legacy (activities, hotels, packages) |

### Tablas transcreation workflow

| Tabla | Propósito | RLS |
|-------|-----------|-----|
| `seo_transcreation_jobs` | Job lifecycle: `draft → reviewed → applied → published` | account-scoped |
| `seo_translation_memory` | Exact/fuzzy matches de traducciones previas (pg_trgm) | account-scoped |
| `seo_translation_glossary` | Brand terms + forced translations per website × locale | account-scoped |
| `seo_localized_variants` | Output final consumido por SSR | account-scoped |
| `product_seo_overrides` | Per-locale meta overrides para products (#78) | account-scoped |

### Migrations aplicadas

```
20260418000000_multi_locale_content.sql     — locale + translation_group_id columns
20260423000100_transcreate_ai_rate_limit.sql — ai_generated flag + rate limit índice
20260423000200_ensure_seo_translation_glossary.sql — glossary table + RLS policies
20260424000100_product_seo_overrides.sql    — per-locale SEO overrides table
```

## Pipeline AI (TM + Glossary + streamObject)

```
┌─────────────────────────────────────────────────────────────┐
│ POST /api/seo/content-intelligence/transcreate/stream       │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
    ┌──────────────────────────────────────────────┐
    │ 1. resolveTargetMarketReresearch()            │
    │    Query seo_keyword_candidates (live)        │
    │    → 409 if target keyword data missing       │
    └──────────────────────┬────────────────────────┘
                           ▼
    ┌──────────────────────────────────────────────┐
    │ 2. collectSourceFieldsForPage()               │
    │    Fetch source content fields                │
    └──────────────────────┬────────────────────────┘
                           ▼
    ┌──────────────────────────────────────────────┐
    │ 3. prepareDraftWithTM()                       │
    │    - enrichDraftWithTM() → TM exact matches   │
    │    - buildGlossaryPromptBlock() → glossary    │
    │    Output: { draft, glossaryPromptBlock,      │
    │              tmHits, metadata }               │
    └──────────────────────┬────────────────────────┘
                           ▼
        ┌──────────────────┴──────────────────┐
        ▼                                      ▼
    TM = 100%                               TM < 100%
        │                                      │
        ▼                                      ▼
    Skip LLM                         ┌─────────────────────┐
    Use TM output directly           │ 4. checkTranscreateRateLimit() │
                                     │    10/día/(website,locale) │
                                     └──────────────┬──────┘
                                                    ▼
                                     ┌──────────────────────────┐
                                     │ 5. buildLocaleAdaptation  │
                                     │    Prompt()              │
                                     │    → {system, user}      │
                                     └──────────────┬───────────┘
                                                    ▼
                                     ┌──────────────────────────┐
                                     │ 6. streamObject() via    │
                                     │    OpenRouter            │
                                     │    Schema:                │
                                     │    LocaleAdaptationOutput │
                                     └──────────────┬───────────┘
                                                    ▼
                                           Stream tokens back
                                           via text/plain chunks
```

## Job lifecycle (state machine)

```
     ┌─────────────┐
     │  Create     │ (AI generate OR TM exact)
     └──────┬──────┘
            ▼
     ┌─────────────┐
     │   draft     │ ai_generated=true, status='draft'
     └──────┬──────┘
            │  Human edit + click "Mark reviewed"
            ▼
     ┌─────────────┐
     │  reviewed   │ status='reviewed'
     └──────┬──────┘
            │  Click "Apply"
            ▼
     ┌─────────────┐
     │   applied   │ Written to seo_localized_variants
     └──────┬──────┘ + product_seo_overrides if product
            │  Optional: finalization sign-off
            ▼
     ┌─────────────┐
     │  published  │ (identical to applied for SEO,
     └─────────────┘  marks content team approval)

     Alternate path:
     draft → rejected → draft (re-draft)
```

## Components (código shipped)

### Backend

| File | Purpose |
|------|---------|
| `lib/ai/prompts/locale-adaptation.ts` | Prompt builder + Zod output schema + normalize helpers |
| `lib/seo/transcreate-workflow.ts` | `prepareDraftWithTM`, `applyTranscreateJob`, `reviewTranscreateJob`, TRUTH_FIELD_DENYLIST |
| `lib/seo/transcreate-rate-limit.ts` | `checkTranscreateRateLimit()` — 10/día per (website, target_locale) |
| `lib/seo/transcreate-client.ts` | Client-side parser `parseLocaleAdaptationCompletion` |
| `lib/seo/hreflang.ts` | `generateHreflangLinks()` + `generateHreflangLinksForLocales()` with translated filter |
| `lib/seo/locale-routing.ts` | `buildPublicLocalizedPath`, `resolveLocaleFromPublicPath`, `localeToOgLocale` |
| `lib/seo/public-metadata.ts` | `resolvePublicMetadataLocale()`, `buildLocaleAwareAlternateLanguages()` |
| `lib/seo/translation-memory.ts` | TM fuzzy match via pg_trgm |

### API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/seo/content-intelligence/transcreate/stream` | POST | Streaming AI generation (streamObject) |
| `/api/seo/content-intelligence/transcreate` | POST | `create_draft`, `review`, `apply` actions |
| `/api/seo/translations/bulk` | POST | Bulk review/apply |

### Dashboard UI

| File | Purpose |
|------|---------|
| `app/dashboard/[websiteId]/translations/page.tsx` | Main dashboard + coverage matrix |
| `app/dashboard/[websiteId]/translations/glossary/page.tsx` | Glossary CRUD |
| `components/admin/translations-dashboard.tsx` | Matrix + filters |
| `components/admin/translation-row.tsx` | Per-item row + AI generate (useCompletion) |
| `components/admin/translation-bulk-bar.tsx` | Bulk actions |
| `components/admin/transcreate-dialog.tsx` | Dialog modal alternativo |

## Routing + hreflang

### URL structure

| Locale | URL pattern |
|--------|-------------|
| Default (`es-CO`) | `/paquetes/cartagena` (no prefix) |
| Non-default (`en`) | `/en/paquetes/cartagena` |
| Non-default (`pt`) | `/pt/paquetes/cartagena` |

### Middleware headers

Set en `middleware.ts`:

| Header | Value |
|--------|-------|
| `x-public-locale` | `en-US` (resolved full locale) |
| `x-public-default-locale` | `es-CO` |
| `x-public-lang` | `en` (2-letter) |
| `x-public-locale-segment` | `en` if non-default, `""` else |
| `x-subdomain` | `colombiatours` |
| `x-custom-domain` | `colombiatours.travel` (if applicable) |

### hreflang emission policy (ADR-020)

- Emit hreflang para todos los `supported_locales` **filtered by** locales con `seo_transcreation_jobs.status IN ('applied', 'published')` para esa página
- Default locale siempre incluido (sin filter)
- `x-default` → canonical del default locale
- Tag format: `language-REGION` (e.g. `en-US`)
- URL path: 2-letter language (`/en/...`)

Consumed en:
- `app/site/[subdomain]/[...slug]/page.tsx` via `alternates.languages`
- `app/sitemap.xml/route.ts` via `<xhtml:link rel="alternate">`

## Safety constraints

### TRUTH_FIELD_DENYLIST

48 canonical product fields **permanentemente bloqueados** de writes por transcreation:

```typescript
// lib/seo/transcreate-workflow.ts
const TRUTH_FIELD_DENYLIST = [
  'name', 'description', 'price', 'amenities', 'capacity',
  // ... 43 more
];
```

Transcreation solo escribe a SEO overlay columns en `website_product_pages` + `product_seo_overrides`. El product truth data en `products` / `package_kits` es inmutable desde Studio (ownership: Flutter per cross-repo boundary).

### Rate limit (10/día/locale)

```typescript
// lib/seo/transcreate-rate-limit.ts
const DAILY_LIMIT = 10;
const WINDOW_MS = 24 * 60 * 60 * 1000;
```

Counter query: `ai_generated = true` en 24h window. 429 response si excede.

### Glossary enforcement

Brand terms (never-translate) injected en prompt system:
```
- Required brand tokens: ColombiaTours, Bukeer
- Keep every required brand token verbatim (exact casing) in meta_title or h1.
```

## SEO outputs per locale

Per cada URL localizada:

| Output | Source |
|--------|--------|
| `<title>` | `seo_localized_variants.meta_title` |
| `<meta name="description">` | `seo_localized_variants.meta_desc` |
| `<link rel="canonical">` | self-canonical per locale |
| `<link rel="alternate" hreflang="...">` | All applied locales + `x-default` |
| `<meta property="og:locale">` | `localeToOgLocale()` → `es_CO` underscore format |
| `<meta property="og:title">` | Uses meta_title |
| JSON-LD `inLanguage` | Current locale |
| Sitemap `<xhtml:link hreflang>` | Reciprocal per-URL |

## Current flow — step-by-step

Ver runbook operativo: [`docs/ops/transcreate-website-content-runbook.md`](../ops/transcreate-website-content-runbook.md)

Resumen:
1. **Glossary setup** (1x per site) → `/dashboard/[w]/translations/glossary`
2. **Coverage matrix** → `/dashboard/[w]/translations` (🔴/🟠/🟢)
3. **Generate AI draft** → click cell → `streamObject` output
4. **Human review** → edit fields + "Mark reviewed"
5. **Apply** → persist to `seo_localized_variants` + `product_seo_overrides`
6. **Verify** → hreflang renders + curl `/en/path`

## Lo que está cubierto (shipped)

| Capa | Estado |
|------|--------|
| Path-prefix URL routing | ✅ |
| Middleware locale detection | ✅ |
| hreflang emission + filter | ✅ |
| x-default → default locale | ✅ |
| Sitemap alternates | ✅ |
| og:locale format `es_CO` | ✅ |
| JSON-LD `inLanguage` | ✅ |
| Canonical per locale | ✅ |
| TM exact bypass | ✅ |
| Glossary injection | ✅ |
| AI streaming draft (streamObject) | ✅ |
| Rate limit 10/día/locale | ✅ |
| Job lifecycle state machine | ✅ |
| Human review UI | ✅ |
| Bulk operations | ✅ |
| Coverage matrix dashboard | ✅ |
| Safety denylist (48 fields) | ✅ |
| Account-scoped RLS | ✅ |

## Lo que NO está cubierto (gaps → EPIC #198)

Ver gap analysis completo: [EPIC #198](https://github.com/weppa-cloud/bukeer-studio/issues/198)

Resumen de capas faltantes:

| Gap | Tracked en |
|-----|-----------|
| Body content transcreation (description_long, highlights, FAQ, etc.) | #198 Phase 2 (#202) |
| UI strings i18n bundle | #198 Phase 1 (#199) |
| Per-market adaptation (currency, CTAs, trust) | #198 Phase 3 |
| JSON-LD per-locale (Product/FAQ/Article/Video) | #198 Phase 4 |
| Image SEO per-locale (alt text, sitemap) | #198 Phase 5 |
| Destinations + custom pages transcreation | #198 Phase 6 |
| Blog post body transcreation | #198 Phase 7 |
| Semantic SEO (SERP context, IndexNow, drift) | #198 Phase 8 |

Estimación total de pendientes: **4-5 meses de sprint development**.

---

# Target State — Post-EPIC #198

## TL;DR

Once all 8 phases of EPIC #198 land, la infraestructura pasa de **meta-only transcreation** a **full content parity per-market** con SEO semántico. El mismo pipeline (TM → glossary → AI → review → apply) se mantiene, pero con schema expandido (15 campos), market overlay layer, i18n UI bundle, y semantic SEO gate.

## Target Architecture

```
┌──────────────────────────────────────────────────────────────┐
│ Request /en/paquetes/cartagena                                │
└──────────────────────┬───────────────────────────────────────┘
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ middleware.ts (unchanged — ADR-019)                           │
│ └─ Rewrite /en/paquetes/X → /site/[subdomain]/paquetes/X     │
└──────────────────────┬───────────────────────────────────────┘
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ SSR with i18n context                                         │
│ ├─ next-intl provider wraps page                              │
│ ├─ Load lib/i18n/messages/en-US.json → UI strings             │
│ ├─ Resolve content by translation_group_id + locale           │
│ ├─ Merge: base product → product_seo_overrides → market_overlay│
│ ├─ Apply per-market currency conversion                       │
│ ├─ Apply per-market CTA strategy (WhatsApp/phone/email)       │
│ ├─ Filter trust badges by market (RNT only CO, BBB US, etc.)  │
│ ├─ Render localized JSON-LD (Product/FAQ/Article/Video)       │
│ └─ Localized image alt from media_assets.alt_localized        │
└──────────────────────────────────────────────────────────────┘
```

## Target Data layer

### Tablas nuevas / extendidas

| Tabla | Nuevo en Phase | Shape |
|-------|---------------|-------|
| `seo_transcreation_jobs.payload_v2` | Phase 2 | JSONB con 15 campos (description_long, highlights, FAQ, timeline, inclusions, etc.) |
| `product_seo_overrides.body_content` | Phase 2 | Per-locale body overrides (extensión de #78) |
| `websites.content.market_cta` | Phase 3 | JSONB per-market CTA strategy |
| `websites.content.market_trust_badges` | Phase 3 | JSONB per-country filter |
| `media_assets.alt_localized` | Phase 5 | JSONB `{locale: alt_text}` |
| `blog_categories` (new) | Phase 7 | Categories con `translation_group_id` |
| `seo_transcreation_jobs.serp_context` | Phase 8 | JSONB SERP top 10 target market snapshot |
| `seo_transcreation_jobs.keyword_volume_target` | Phase 8 | Integer (DataForSEO volume) |
| `seo_transcreation_jobs.intent_classification` | Phase 8 | Enum (info/transactional/navigational) |

### Nuevo i18n bundle (Phase 1)

```
lib/i18n/
├── messages/
│   ├── es-CO.json   (~60 keys)
│   ├── en-US.json
│   └── pt-BR.json
├── config.ts        (next-intl setup)
├── formatters.ts    (date/currency/number wrappers)
└── index.ts
```

## Target Pipeline AI (expanded schema)

```
┌──────────────────────────────────────────────────────────────┐
│ POST /api/seo/content-intelligence/transcreate/stream         │
└──────────────────────┬───────────────────────────────────────┘
                       ▼
    ┌──────────────────────────────────────────────┐
    │ 1. Semantic SEO gate (Phase 8)                │
    │    - DataForSEO volume check target market    │
    │    - If keyword < 100 vol → suggest alternatives│
    │    - Inject target-market SERP top 10 context │
    │    - Intent classifier                        │
    └──────────────────────┬────────────────────────┘
                           ▼
    ┌──────────────────────────────────────────────┐
    │ 2. Extended source collection                 │
    │    - Meta fields (v1)                         │
    │    - Body fields: description_long, highlights,│
    │      FAQ, timeline, inclusions, recommendations│
    │    - Market context: currency, trust badges    │
    └──────────────────────┬────────────────────────┘
                           ▼
    ┌──────────────────────────────────────────────┐
    │ 3. TM + Glossary (same as current)            │
    └──────────────────────┬────────────────────────┘
                           ▼
    ┌──────────────────────────────────────────────┐
    │ 4. Build prompt v2                            │
    │    - System: SEO transcreation specialist +   │
    │      target market SERP knowledge             │
    │    - User: 15-field source + tm_hints + glossary│
    │      + required_brand_terms + serp_context    │
    └──────────────────────┬────────────────────────┘
                           ▼
    ┌──────────────────────────────────────────────┐
    │ 5. streamObject (LocaleAdaptationOutputV2)    │
    │    Output: 15 fields including body content   │
    └──────────────────────┬────────────────────────┘
                           ▼
    ┌──────────────────────────────────────────────┐
    │ 6. Apply — dual write:                        │
    │    - seo_localized_variants (meta layer)      │
    │    - product_seo_overrides (body layer)       │
    │    - Market overlay merged at render time     │
    └──────────────────────┬────────────────────────┘
                           ▼
    ┌──────────────────────────────────────────────┐
    │ 7. Post-apply (Phase 8)                       │
    │    - IndexNow ping Bing/Yandex                │
    │    - GSC URL Inspection check                 │
    │    - Drift detection setup (source hash)      │
    └──────────────────────────────────────────────┘
```

## Target User Flow — End-to-End

### For a Content Operator translating a site

```
┌─────────────────────────────────────────────────────────────┐
│ PHASE A: Setup (once per website)                            │
└─────────────────────────────────────────────────────────────┘
  1. Configure websites.supported_locales = ['es-CO','en-US','pt-BR']
  2. Setup glossary (~20-50 brand terms per locale)
  3. Configure market strategy:
     - websites.content.market_cta → per country
     - websites.content.market_trust_badges → per country
     - accounts.currency_rates → per currency

┌─────────────────────────────────────────────────────────────┐
│ PHASE B: Bulk content translation (per locale)               │
└─────────────────────────────────────────────────────────────┘
  4. /dashboard/[w]/translations → coverage matrix
  5. Filter by content type: products | destinations | pages | posts
  6. Click "Translate all missing EN" (bulk mode)
  7. System processes in queue:
     - DataForSEO keyword volume check per item
     - Skip items with 0-volume keyword → alert
     - Generate AI drafts in batches (respect rate limit)
  8. Review queue: 15 fields per item
     - Preview side-by-side source vs target
     - Edit + "Mark reviewed"
     - Bulk approve validated items

┌─────────────────────────────────────────────────────────────┐
│ PHASE C: Apply + publish                                     │
└─────────────────────────────────────────────────────────────┘
  9. Bulk apply reviewed items
 10. System:
     - Writes to seo_localized_variants (meta)
     - Writes to product_seo_overrides (body)
     - Triggers IndexNow ping
     - Queues GSC URL Inspection
     - Invalidates ISR cache per tag
 11. Coverage matrix updates: 🟠 → 🟢

┌─────────────────────────────────────────────────────────────┐
│ PHASE D: Post-publish monitoring                             │
└─────────────────────────────────────────────────────────────┘
 12. Dashboard shows per-locale metrics:
     - GSC impressions delta (baseline vs post)
     - hreflang reciprocity status (drift detection)
     - Indexation status (GSC inspection results)
     - Cost tracking (OpenRouter spend per website × locale)
 13. Drift alerts: source content change → job flagged `needs_review`
 14. Cannibalization scanner: same keyword ranking multiple locales
```

### For a Visitor on `/en/paquetes/cartagena`

**Current state (post-EPIC #187):**
- ✅ Meta EN (title, desc, slug, h1)
- ❌ Body ES (description, FAQ, highlights)
- ❌ CTAs ES hardcoded
- ❌ UI nav ES hardcoded
- ❌ Price en account currency
- Result: **mixed-language UX, high bounce rate**

**Target state (post-EPIC #198):**
- ✅ Meta EN
- ✅ Body 100% EN (description_long, FAQ, highlights, timeline, inclusions)
- ✅ CTAs adaptadas ("Call us" US / "WhatsApp" LatAm)
- ✅ UI nav EN (via i18n bundle)
- ✅ Price in USD (via per-market currency rate)
- ✅ Trust badges filtered (BBB US visible, RNT CO oculto)
- ✅ JSON-LD Product `priceCurrency: "USD"` + addressLocality: "Cartagena, Colombia"
- ✅ Alt text EN en imágenes
- ✅ Internal links apuntan a `/en/*` equivalents
- Result: **native EN UX, competitive con sitios US**

## Target Outputs SEO per locale

| Output | Current (shipped) | Target (post-#198) |
|--------|-------------------|---------------------|
| `<title>` | ✅ Localized | ✅ (unchanged) |
| `<meta description>` | ✅ Localized | ✅ (unchanged) |
| `<link canonical>` | ✅ Self per-locale | ✅ (unchanged) |
| `<link hreflang>` | ✅ Filtered by applied | ✅ (unchanged) |
| `<meta og:locale>` | ✅ `es_CO` format | ✅ (unchanged) |
| `<meta og:title>` | ✅ Localized | ✅ (unchanged) |
| `<meta og:image:alt>` | ❌ | ✅ Per-locale (Phase 5) |
| `<meta geo.region>` | ❌ | ✅ Per-market (Phase 3) |
| `<meta geo.position>` | ❌ | ✅ Per-market (Phase 3) |
| JSON-LD `inLanguage` | ✅ | ✅ (unchanged) |
| JSON-LD `Product.name` | ❌ Source | ✅ Localized (Phase 4) |
| JSON-LD `Product.description` | ❌ Source | ✅ Localized (Phase 4) |
| JSON-LD `Offer.priceCurrency` | ❌ Account | ✅ Per-market (Phase 4) |
| JSON-LD `FAQPage` | ❌ Source | ✅ Localized (Phase 4) |
| JSON-LD `LocalBusiness.addressLocality` | ❌ | ✅ Per-market (Phase 4) |
| JSON-LD `Article` | ❌ Source | ✅ Localized (Phase 4) |
| JSON-LD `VideoObject` | ❌ Source | ✅ Localized (Phase 4) |
| Sitemap `<xhtml:link alternate>` | ✅ | ✅ (unchanged) |
| Sitemap `<image:caption xml:lang>` | ❌ | ✅ Per-locale (Phase 5) |
| Image `<img alt>` | 🟡 LocalizableAlt schema sin data | ✅ Fully populated (Phase 5) |
| Internal links en body | ❌ | ✅ Auto re-mapped (Phase 7) |
| Body content `<p>/<h2>` | ❌ Source | ✅ Localized (Phase 2, 6, 7) |
| UI nav/footer/forms | ❌ ES hardcoded | ✅ i18n bundle (Phase 1) |

## Target KPIs & Success Metrics

| Metric | Baseline | Target |
|--------|----------|--------|
| % content EN parity (visual) | ~10% | > 90% |
| GSC EN clicks (90d) | 138 | > 276 (+100%) |
| GSC EN CTR avg | 0.74% | > 2% |
| Lighthouse SEO `/en/*` | not measured | > 95 |
| Bounce rate EN pages | n/a | < 50% (match ES baseline) |
| Time-to-index new EN page | 4-8 weeks | < 48h (via IndexNow) |
| i18n bundle coverage | 0% | 100% user-visible strings |
| Per-market conversion rate EN | baseline | +30% (vs. current mixed UX) |
| OpenRouter cost per full site translation | n/a | < $200 per site × 3 locales |
| Human review time per item | n/a | < 5 min (15-field review) |

## Dependency graph

```
Phase 1 (i18n bundle) ────────────────────────────┐
                                                   ▼
Phase 2 (body content) ────────────────┐          ▼
                                        ▼          ▼
Phase 3 (per-market) ─────────────┐    ▼    Final UX: /en/* native
                                   ▼    ▼          ▲
Phase 4 (JSON-LD) ──────────┐     ▼    ▼          │
                             ▼     ▼    ▼          │
Phase 5 (image SEO) ──┐     ▼     ▼    ▼          │
                       ▼     ▼     ▼    ▼          │
Phase 6 (destinations) ▼     ▼     ▼    ▼          │
Phase 7 (blog body) ───▼─────▼─────▼────▼──────────┘
                       │
Phase 8 (semantic SEO) ─── Overlays on all above
```

Phases 1-7 son mayormente paralelos tras desacoplamiento. Phase 8 (Semantic SEO) es overlay que mejora la calidad de las anteriores.

## Referencias

- [[ADR-019]] Multi-locale URL routing
- [[ADR-020]] hreflang emission policy
- [[ADR-021]] Translation memory + transcreation pipeline
- [[transcreate-website-content-runbook]] Operational runbook (7 phases step-by-step)
- [[product-detail-matrix]] 48-item inventory (only 5 covered by current flow)
- EPIC #198 — Multi-Locale Content Parity (target state)
- EPIC #187 — Foundation (closed)
- #199 Phase 1 i18n bundle
- #202 Phase 2 extended AI schema
