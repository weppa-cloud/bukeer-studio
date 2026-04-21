# Spec: Section & Entity Translation Layer

## GitHub Tracking
- **Epic Issue**: #273 https://github.com/weppa-cloud/bukeer-studio/issues/273
- **Child Issues**: #274, #275, #276, #277, #278
- **Milestone**: Q2-2026 — ColombiaTours Pilot Launch
- **Area**: studio | seo | backend

## Status
- **Author**: Yeison Gomez
- **Date**: 2026-04-21
- **Status**: Draft
- **ADRs referenced**: ADR-009, ADR-019, ADR-020, ADR-021, ADR-025
- **Cross-repo impact**: none — `website_sections`, `package_kits`, `contacts` are Studio-owned tables per ADR-025

## Summary

Add JSONB translation overlays to `website_sections`, `package_kits`/`products`, and `contacts` so that every visible string on a Bukeer public website can be served in the tenant's configured locales. Also fix the `get_website_by_subdomain` RPC to return `default_locale`/`supported_locales` so SSR pages resolve locale correctly without an extra REST call.

## Motivation

Audit (2026-04-21) against colombiatours.travel reveals that while the transcreation pipeline handles product SEO fields (title, meta, slug) and blog/page content, the three largest content surfaces on a typical tourism site are entirely monolingüe:

1. **Section copy** — hero titles, section headings, CTA buttons stored in `website_sections.content` JSONB. No translation column exists. Visitor on `/en/` sees Spanish hero copy.
2. **Product names & descriptions** — `package_kits.name`, `products.name`/`products.description` are single text columns. An English visitor sees `"Paquete - Cartagena 5 Días"` instead of `"Cartagena 5-Day Package"`.
3. **Planner bios** — `contacts.bio`/`contacts.specialty` are single text fields. Planner detail pages are fully untranslated for en-US visitors.
4. **RPC gap** — `get_website_by_subdomain` does not SELECT `default_locale`/`supported_locales`, so `extractWebsiteLocaleSettings()` gets null and falls back to `es-CO` on every SSR page regardless of tenant config.

Without these 4 fixes, no amount of transcreation of SEO meta fields will produce a usable English version of the site — content bodies remain Spanish.

## User Flows

### Flow 1: English visitor on colombiatours.travel

1. Visitor navigates to `colombiatours.travel/en/packages/cartagena-5-days`
2. Middleware reads `websites.supported_locales` → `['es-CO','en-US']`, sets `x-public-locale: en-US`
3. SSR page calls `getWebsiteBySubdomain('colombiatours')` → RPC now returns `default_locale`, `supported_locales`
4. `WebsiteLocaleProvider` receives `resolvedLocale = 'en-US'`
5. Hero section renders: reads `website_sections.content_translations['en-US'].title` → `"Discover Colombia"`
6. Package card shows: reads `package_kits.translations['en-US'].name` → `"Cartagena 5-Day Package"`
7. Planner bio shows: reads `contacts.translations['en-US'].bio` → English bio text
8. hreflang emits correctly per ADR-020

### Flow 2: Studio operator adds English translation for a section

1. Operator opens studio dashboard for colombiatours.travel
2. Navigates to section editor for hero section
3. Switches language toggle to `EN`
4. Edits title/subtitle/CTA in English
5. Saves → writes to `website_sections.content_translations['en-US']`
6. Preview shows EN version; ES version unchanged

### Flow 3: Fallback — no EN translation yet

1. Visitor requests `/en/packages/cartagena-5-days`
2. SSR reads `website_sections.content_translations['en-US']` → empty/null
3. Falls back to `website_sections.content` (Spanish base)
4. Logs structured warning for monitoring (no error thrown)
5. hreflang still emits `en-US` alternate per ADR-020 policy (transcreation status = `applied`)

## Acceptance Criteria

- [ ] AC-1 **RPC fix**: `get_website_by_subdomain` returns `default_locale`, `supported_locales`; SSR pages no longer fall back to `es-CO` for colombiatours.travel.
- [ ] AC-2 **Section overlay**: `website_sections.content_translations jsonb default '{}'` column exists; SSR section renderer reads `content_translations[locale]` with fallback to `content`.
- [ ] AC-3 **Package names EN**: `package_kits.translations['en-US'].name` and `package_kits.translations['en-US'].description_short` populated for top-20 colombiatours packages; package cards render EN name on `/en/` routes.
- [ ] AC-4 **Product names EN**: `products.translations['en-US']` populated for top-50 activities; activity pages render EN name/description.
- [ ] AC-5 **Planner bios EN**: `contacts.translations['en-US'].bio` and `contacts.translations['en-US'].specialty` populated for all colombiatours planners; planner detail renders EN bio on `/en/` routes.
- [ ] AC-6 **Fallback chain**: missing translation in any overlay → falls back to base Spanish content; no 500, no missing text.
- [ ] AC-7 **No flutter-owned data mutations**: migrations are additive only; zero writes to `hotels`, `activities` truth table content per ADR-025.
- [ ] AC-8 **Studio UI**: section editor shows language toggle for locales in `supported_locales`; saves to overlay column.
- [ ] AC-9 **TypeScript types**: `WebsiteSection` type in `@bukeer/website-contract` includes optional `content_translations: Record<string, Partial<SectionContent>>`.

## Data Model Changes

| Table | Column | Type | Notes |
|-------|--------|------|-------|
| `website_sections` | `content_translations` | `jsonb NOT NULL DEFAULT '{}'` | Shape: `{ "en-US": { title, subtitle, cta_text, ... } }`. Overlay — base `content` untouched. |
| `package_kits` | `translations` | `jsonb NOT NULL DEFAULT '{}'` | Shape: `{ "en-US": { name, description_short, highlights_summary } }`. |
| `products` | `translations` | `jsonb NOT NULL DEFAULT '{}'` | Shape: `{ "en-US": { name, description, short_description } }`. |
| `contacts` | `translations` | `jsonb NOT NULL DEFAULT '{}'` | Shape: `{ "en-US": { bio, specialty, tagline } }`. |

**Why JSONB overlay (not separate rows):** Aligns with ADR-021 overlay pattern used in `website_product_pages`. Section content is tightly coupled to base row — a separate-row model would require a join on every page render. Package/contact translations are supplementary data, not separate editorial entities.

**Migration strategy:** Forward-only additive (`ADD COLUMN … DEFAULT '{}'`). No backfill needed — empty JSONB = fall back to Spanish. Populate via transcreation jobs post-migration.

### RPC change

```sql
-- get_website_by_subdomain: add to SELECT list
w.default_locale,
w.supported_locales
```

## API / Contract Changes

| Endpoint/RPC/Schema | Method | Payload | Notes |
|---------------------|--------|---------|-------|
| `get_website_by_subdomain` RPC | SELECT | — | Add `default_locale`, `supported_locales` to return |
| `GET /api/sections/[id]` | GET | — | Include `content_translations` in response |
| `PATCH /api/sections/[id]` | PATCH | `{ content_translations: {...} }` | Merge-patch per locale key |
| `WebsiteSection` Zod schema | Schema | `content_translations?: Record<string, unknown>` | Add optional field |
| Package/contact SSR queries | SELECT | — | Include `translations` column |

## Permissions (RBAC)

| Role | Read content_translations | Write content_translations |
|------|--------------------------|---------------------------|
| super_admin | yes | yes |
| owner | yes | yes |
| admin | yes | yes |
| agent | yes | no |

RLS: `website_sections.account_id` check (existing) covers the new column automatically.

## Affected Files / Packages

| Path | Change | Description |
|------|--------|-------------|
| `supabase/migrations/20260421000000_section_entity_translation_overlay.sql` | Create | ADD COLUMN content_translations/translations to 4 tables + RPC fix |
| `packages/website-contract/src/schemas/sections.ts` | Modify | Add `content_translations` optional field to `WebsiteSection` |
| `packages/website-contract/src/types/entities.ts` | Modify | Add `translations` to `PackageKit`, `Product`, `Contact` types |
| `lib/supabase/websites.ts` | Modify | Update `getWebsiteBySubdomain` to include locale columns from RPC result |
| `app/site/[subdomain]/page.tsx` | Modify | Read `content_translations[locale]` in section rendering |
| `lib/sections/section-renderer.tsx` | Modify | Fallback chain: `content_translations[locale] ?? content` |
| `components/studio/section-editor/` | Modify | Add locale toggle + save to `content_translations` |
| `lib/supabase/packages.ts` (new or existing) | Modify | Include `translations` in package queries |
| `lib/supabase/contacts.ts` (new or existing) | Modify | Include `translations` in contact/planner queries |
| `components/site/themes/editorial-v1/pages/planner-detail.tsx` | Modify | Render `translations[locale].bio` with fallback |
| `components/site/product-card.tsx` (and variants) | Modify | Render `translations[locale].name` with fallback |

## Edge Cases & Error Handling

1. `content_translations[locale]` key exists but value is `{}` → treat as missing, fall back to base
2. `content_translations[locale].title` exists but `subtitle` missing → merge: use EN title + ES subtitle
3. Locale not in `supported_locales` requests a page → middleware redirects to default locale
4. Studio saves partial translation → partial merge, no overwrite of other locale keys
5. `translations` column null (legacy rows before migration) → treated as `'{}'` via COALESCE

## Out of Scope

- Full CMS-style translation workflow (review/approve/publish states for section translations)
- pt-BR translations for sections/entities (post-pilot)
- Translating `hotels` truth table content (Flutter-owned per ADR-025)
- Translating `destinations` table (handled by separate row model in existing multi-locale spec)
- AI auto-transcreation of section/package/contact content (separate task — infrastructure first)

## Dependencies

- ADRs: ADR-009 (multi-tenant), ADR-019 (locale routing), ADR-020 (hreflang), ADR-021 (transcreation), ADR-025 (field ownership)
- Precondition: `websites.default_locale` and `websites.supported_locales` columns exist (deployed in migration `20260418000000_multi_locale_content.sql` ✓)
- Related issues: #199 (UI strings hardcoded — parallel work), #262 (ColombiaTours pilot EPIC — parent), #266 (W5 overlay + transcreate top-N)

## Rollout

- **Feature flag**: none needed — additive DB columns, SSR fallback keeps ES behavior unchanged
- **Revalidation**: `revalidatePath('/[subdomain]', 'layout')` on section save
- **Runbook**: none — migration is additive, rollback via `DROP COLUMN` if needed
- **Populate content**: after migration, run transcreation jobs for top-N sections/packages/planners via existing `/api/seo/translations/bulk` endpoint (extend to cover new entity types)
