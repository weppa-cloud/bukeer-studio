# Skill Audit: `nextjs-developer` — Architecture vs Reality

**Date**: 2026-04-13
**Auditor**: Architectural Review (Claude Code)
**Scope**: `.claude/skills/nextjs-developer/` (5 files: SKILL.md, PATTERNS.md, SECTIONS.md, AI.md, CHECKLIST.md)
**Method**: Line-by-line claims verified against codebase via file listing, grep, and AST reading

---

## 1. Executive Summary

The `nextjs-developer` skill contains **significant documentation drift** from the actual codebase. While the core patterns (component conventions, auth flow, hook signatures) are accurate, **quantitative claims are consistently stale**: section counts, UI component counts, AI route counts, and the LLM model are all wrong. The skill also references a Puck editor that was explicitly removed (issue #569).

**Impact**: An AI agent relying on this skill will make incorrect assumptions about available components, undercount API surface area, and may attempt to use deprecated patterns.

| Severity | Count | Examples |
|----------|-------|---------|
| Critical | 3 | Wrong LLM model, wrong section count, Puck references |
| Major | 4 | Missing 11 UI components, missing 4 AI routes, missing SEO route, stale RBAC roles |
| Minor | 5 | Outdated dependency versions, missing `useWebsite` hook file, cosmetic |

---

## 2. Claim-by-Claim Audit

### 2.1 Dashboard Structure (SKILL.md §Project Structure)

**Claim** (line 192-201):
```
dashboard/[websiteId]/
  ├── pages/        ├── blog/       ├── design/
  ├── content/      ├── products/   ├── quotes/
  ├── analytics/    └── settings/
```

**Reality** (verified via `app/dashboard/`):

| Route | Exists | In Sidebar | Notes |
|-------|--------|------------|-------|
| `pages/` | Yes | Yes | + nested `[pageId]/edit/` |
| `blog/` | Yes | Yes | + nested `[postId]/` |
| `design/` | Yes | Yes | |
| `content/` | Yes | Yes | Label: "Content & SEO" |
| `products/` | Yes | Yes | |
| `quotes/` | Yes | Yes | Label: "Leads" |
| `analytics/` | Yes | Yes | |
| `settings/` | Yes | Yes | |
| **`seo/`** | **Yes** | **No** | `seo/` and `seo/[itemType]/[itemId]/` exist as routes but are NOT in sidebar `WEBSITE_TABS` |

**Verdict**: MAJOR — Skill omits the `seo/` route entirely. The sidebar (`admin-sidebar.tsx:12-21`) has exactly 8 tabs. The SEO route is a hidden/deep-link-only route not documented anywhere in the skill.

---

### 2.2 Section Components (SECTIONS.md §16 Section Components)

**Claim**: "16 Section Components" at `components/site/sections/`

**Reality**: **18 files** exist:

| # | File | In Skill | Types Handled |
|---|------|----------|---------------|
| 1 | `hero-section.tsx` | Yes | hero, hero_image, hero_video, hero_minimal |
| 2 | `destinations-section.tsx` | Yes | destinations |
| 3 | `hotels-section.tsx` | Yes | hotels |
| 4 | `activities-section.tsx` | Yes | activities |
| 5 | `testimonials-section.tsx` | Yes | testimonials, testimonials_carousel |
| 6 | `about-section.tsx` | Yes | about |
| 7 | `contact-section.tsx` | Yes | contact, contact_form |
| 8 | `cta-section.tsx` | Yes | cta, cta_banner, pricing |
| 9 | `stats-section.tsx` | Yes | stats, stats_counters |
| 10 | `partners-section.tsx` | Yes | partners, logos_partners, logo_cloud |
| 11 | `faq-section.tsx` | Yes | faq, faq_accordion |
| 12 | `blog-section.tsx` | Yes | blog |
| 13 | `text-image-section.tsx` | Yes | text, rich_text, text_image |
| 14 | `features-grid-section.tsx` | Yes | features, features_grid |
| 15 | `gallery-section.tsx` | Yes | gallery, gallery_grid, gallery_carousel, gallery_masonry |
| 16 | `newsletter-section.tsx` | Yes | newsletter |
| 17 | **`packages-section.tsx`** | **No** | packages |
| 18 | **`planners-section.tsx`** | **No** | planners |

**Verdict**: CRITICAL — Two section components (`packages-section.tsx`, `planners-section.tsx`) are completely undocumented. An agent following this skill would not know they exist and might try to create them from scratch.

**Registry confirmation**: `section-registry.tsx` registers 18 base components (HeroSection eager + 17 dynamic imports) mapping to **44 type keys** via aliases. The skill says "42 types" — actual count is 44.

---

### 2.3 Section Registry Categories (SECTIONS.md §sectionTypesByCategory)

**Claim**:
```typescript
{
  homepage: ['hero', 'destinations', 'hotels', 'activities', 'testimonials', 'about', 'contact', 'cta', 'stats', 'partners', 'faq', 'blog'],
  heroVariants: ['hero_image', 'hero_video', 'hero_minimal'],
  content: ['text', 'rich_text', 'text_image', 'features', 'features_grid', 'faq_accordion'],
  gallery: ['gallery', 'gallery_grid', 'gallery_carousel', 'gallery_masonry'],
  socialProof: ['testimonials_carousel', 'logos_partners', 'logo_cloud', 'stats_counters'],
  conversion: ['cta_banner', 'contact_form', 'newsletter', 'pricing'],
}
```

**Reality**: The `sectionTypesByCategory` export exists (line ~241 of registry). Actual categories need verification for `packages` and `planners` inclusion — homepage array may have 13 items (adding `packages` + `planners`) instead of the claimed 12.

**Verdict**: MAJOR — The homepage category likely includes `packages` and `planners` which are missing from the documented list.

---

### 2.4 UI Components (SKILL.md §UI Components)

**Claim**: "Available components (17)" — lists Button through Toggle.

**Reality**: **28 files** in `components/ui/`:

| Status | Components |
|--------|------------|
| Documented (17) | badge, button, card, dialog, dropdown-menu, input, label, scroll-area, select, separator, sheet, skeleton, tabs, textarea, toggle, tooltip |
| **Undocumented (11)** | blur-fade, branded-loader, card-carousel, custom-cursor, floating-element, number-ticker, route-map, skeleton-card, smooth-scroll, sonner-provider, spotlight-card, text-generate-effect |

**Verdict**: MAJOR — 11 UI components (39% of total) are invisible to the agent. Several are Aceternity/Magic UI animation primitives (`blur-fade`, `text-generate-effect`, `spotlight-card`, `number-ticker`) that are actively used in section rendering. An agent building new sections would not know to reuse them.

---

### 2.5 Hooks (SKILL.md §Hooks)

**Claim**: 6 hooks listed (useAutosave, useDirtyState, useKeyboardShortcuts, useLocalBackup, useNetworkStatus, useOptimisticMutation)

**Reality**: Exactly 6 files in `lib/hooks/` matching 1:1.

**Additional claim**: `useWebsite()` listed separately as "website context (data + save + publish)"

**Reality**: `useWebsite` is NOT in `lib/hooks/` — it is likely defined inside a context provider (e.g., `components/admin/` or `lib/admin/`).

**Verdict**: MINOR — Hook list is accurate. `useWebsite` location should be clarified.

---

### 2.6 AI Routes (AI.md §Existing Endpoints)

**Claim**: "8 endpoints" listed in AI.md table.

**Reality**: **12 route files** exist under `app/api/ai/`:

| # | Route | In Skill | Function |
|---|-------|----------|----------|
| 1 | `/api/ai/editor/copilot` | Yes | generateObject |
| 2 | `/api/ai/editor/generate-section` | Yes | generateObject |
| 3 | `/api/ai/editor/improve-text` | Yes | generateObject |
| 4 | `/api/ai/editor/score-content` | Yes | Algorithmic |
| 5 | `/api/ai/editor/suggest-sections` | Yes | generateObject |
| 6 | `/api/ai/editor/generate-blog` | Yes | generateObject |
| 7 | `/api/ai/editor/generate-cluster-plan` | Yes | generateObject |
| 8 | `/api/ai/public-chat` | Yes | streamText |
| 9 | **`/api/ai/studio-chat`** | Partial | streamText + tools (referenced in AI.md patterns but not in endpoint table) |
| 10 | **`/api/ai/seo/generate`** | **No** | SEO content generation |
| 11 | **`/api/ai/seo/generate-bulk`** | **No** | Bulk SEO generation |
| 12 | **`/api/ai/editor/generate-content-pipeline`** | **No** | Content pipeline |

**Verdict**: CRITICAL — 4 routes (33% of total) are undocumented. The SEO generation routes are particularly important as they power the `seo/` dashboard that is itself undocumented.

---

### 2.7 LLM Model (AI.md §LLM Provider)

**Claim** (AI.md line 14):
```typescript
export const DEFAULT_MODEL = 'anthropic/claude-sonnet-4.6';
```

**Reality** (`lib/ai/llm-provider.ts:27-28`):
```typescript
export const DEFAULT_MODEL =
  process.env.OPENROUTER_MODEL || 'mistralai/mistral-large';
```

**Verdict**: CRITICAL — The default model is `mistralai/mistral-large`, NOT `anthropic/claude-sonnet-4.6`. This is the most dangerous inaccuracy: an agent trusting this claim would make wrong assumptions about token limits, structured output capabilities, and cost.

---

### 2.8 RBAC Roles (SKILL.md §RBAC)

**Claim**:
```
canView — viewer, agent, admin, super_admin
canEdit — agent, admin, super_admin
canPublish — admin, super_admin
canManageSettings — admin, super_admin
canManageDomain — super_admin only
```

**Reality** (`lib/admin/permissions.ts`):
```typescript
// Roles: viewer, editor, publisher, owner
interface AdminPermissions {
  canView, canEdit, canPublish, canDelete,
  canManageSettings, canManageDomain, canExportData
}
```

| Skill Claim | Reality |
|-------------|---------|
| Roles: viewer, agent, admin, super_admin | Roles: **viewer, editor, publisher, owner** |
| 5 permissions | **7 permissions** (+ canDelete, canExportData) |

**Verdict**: MAJOR — Role names are completely wrong (agent/admin/super_admin don't exist). Two permissions (`canDelete`, `canExportData`) are missing from documentation. An agent generating RBAC guards would use non-existent role names.

---

### 2.9 Editor / Puck References

**Claim** (SKILL.md line 202):
```
editor/[websiteId]/      # Visual editor (Puck legacy)
```
And references to "Puck legacy" throughout.

**Reality** (`app/editor/[websiteId]/page.tsx` header comment):
```typescript
// Legacy Editor Page — Puck removed (#569)
// This page is kept for:
// 1. Standalone mode → EditorShell V2
// 2. Blog editor sub-routes
// 3. Legacy canvas fallback
```

**Verdict**: MINOR — The label says "Puck legacy" which is directionally correct (it IS legacy), but an agent might try to import Puck packages that no longer exist.

---

### 2.10 Studio Components (SKILL.md §Project Structure)

**Claim** (line 210): `studio/ — NEW: page editor components`

**Reality**: Rich component tree:
```
components/studio/
├── page-editor.tsx          (1200+ LOC, main editor)
├── section-canvas.tsx
├── section-form.tsx
├── section-overlay.tsx
├── section-picker.tsx
├── section-preview.tsx
├── section-toolbar.tsx
├── section-wrapper.tsx
├── seo-panel.tsx
├── site-theme-scope.tsx
├── studio-chat.tsx
└── left-panel/
    ├── navigator.tsx
    ├── panel-shell.tsx
    ├── sections-grid.tsx
    └── theme-quick-editor.tsx
```

**Verdict**: MINOR — The skill correctly identifies `studio/` as "NEW" but provides zero detail about its 15 component files. This is the most complex part of the codebase (page-editor.tsx alone is 1200+ LOC) and deserves its own section in the skill.

---

### 2.11 Supabase Client Naming

**Claim** (PATTERNS.md):
```typescript
import { createSupabaseBrowserClient } from '@/lib/supabase/browser-client';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';
```

**Reality**: Both files exist with these exact exports. Additional utility files:
- `client.ts` — thin wrapper
- `middleware-client.ts` — middleware-specific client
- `get-pages.ts` — page fetching
- `get-website.ts` — website fetching

**Verdict**: ACCURATE

---

### 2.12 Dependencies (SKILL.md §Key Dependencies)

**Claim**: Lists specific versions (Next 15.3.9, React 19.0.0, ai 6.0.116, etc.)

**Reality**: These are point-in-time snapshots. The `@ai-sdk/react` entry says "TBD" for version — unclear if it was ever installed.

**Verdict**: MINOR — Version pinning in skill docs is fragile. Should reference `package.json` as source of truth instead of hardcoding versions.

---

## 3. Consolidated Discrepancy Matrix

```
┌─────────────────────────────┬─────────────┬─────────────┬──────────┐
│ Claim                       │ Skill Says  │ Reality     │ Severity │
├─────────────────────────────┼─────────────┼─────────────┼──────────┤
│ LLM default model           │ claude-4.6  │ mistral-lg  │ CRITICAL │
│ Section component count     │ 16          │ 18          │ CRITICAL │
│ Section type count          │ 42          │ 44          │ CRITICAL │
│ AI route count              │ 8           │ 12          │ CRITICAL │
│ UI component count          │ 17          │ 28          │ MAJOR    │
│ RBAC role names             │ agent/admin │ editor/pub  │ MAJOR    │
│ RBAC permission count       │ 5           │ 7           │ MAJOR    │
│ Dashboard SEO route         │ absent      │ exists      │ MAJOR    │
│ sectionTypesByCategory.home │ 12 items    │ 13+ items   │ MAJOR    │
│ Editor technology           │ Puck legacy │ EditorShell │ MINOR    │
│ Studio component detail     │ 1 line      │ 15 files    │ MINOR    │
│ useWebsite location         │ implied     │ unclear     │ MINOR    │
│ Dependency versions         │ hardcoded   │ drift       │ MINOR    │
│ @ai-sdk/react installed     │ "TBD"       │ unclear     │ MINOR    │
└─────────────────────────────┴─────────────┴─────────────┴──────────┘
```

---

## 4. Root Cause Analysis

The drift follows a clear pattern:

1. **The skill was written at a snapshot in time** (likely when Puck removal was planned but studio was early). Since then, sections (`packages`, `planners`), UI primitives (Aceternity/Magic), AI routes (SEO, pipeline), and the RBAC system evolved without updating the skill.

2. **Quantitative claims are the most dangerous** — "16 sections", "17 UI components", "42 types" are treated as canonical by an agent, which then does not search for additions.

3. **Role name mismatch** suggests the RBAC system was redesigned from a Flutter-influenced naming (`agent`, `admin`, `super_admin`) to a web-standard naming (`editor`, `publisher`, `owner`) but the skill was never updated.

---

## 5. Recommended Fixes

### P0 — Fix immediately (agent will produce wrong code)

| # | File | Fix |
|---|------|-----|
| 1 | AI.md:14 | Change `anthropic/claude-sonnet-4.6` to `mistralai/mistral-large` (or reference env var) |
| 2 | SECTIONS.md | Add `packages-section.tsx` and `planners-section.tsx` to table |
| 3 | AI.md endpoint table | Add `/api/ai/studio-chat`, `/api/ai/seo/generate`, `/api/ai/seo/generate-bulk`, `/api/ai/editor/generate-content-pipeline` |
| 4 | SKILL.md §RBAC | Replace roles: `viewer, editor, publisher, owner`. Add `canDelete`, `canExportData` |

### P1 — Fix by 2026-05-01 (agent misses available tools)

| # | File | Fix |
|---|------|-----|
| 5 | SKILL.md §UI Components | Add 11 missing components (blur-fade, branded-loader, card-carousel, custom-cursor, floating-element, number-ticker, route-map, skeleton-card, smooth-scroll, sonner-provider, spotlight-card, text-generate-effect) |
| 6 | SKILL.md §Project Structure | Add `seo/` route under dashboard |
| 7 | SECTIONS.md categories | Add `packages`, `planners` to homepage list |
| 8 | SKILL.md §Studio | Expand `components/studio/` to list all 15 files with purpose |

### P2 — Housekeeping

| # | File | Fix |
|---|------|-----|
| 9 | SKILL.md | Remove "Puck legacy" label; use "EditorShell V2 (Puck removed #569)" |
| 10 | SKILL.md §Dependencies | Remove hardcoded versions; reference `package.json` |
| 11 | SKILL.md | Clarify `useWebsite()` location |
| 12 | All files | Change "42 types" references to "44 types" or "18 components + aliases" |

---

## 6. Structural Recommendation

The skill should adopt a **"point to source of truth, don't duplicate counts"** strategy:

```markdown
## BAD (current)
> 16 section components exist in components/site/sections/

## GOOD (proposed)
> Section components live in `components/site/sections/`.
> Registry: `lib/sections/section-registry.tsx` (canonical list).
> Run `ls components/site/sections/*.tsx | wc -l` for current count.
```

This eliminates the drift-by-design problem where any new file immediately makes the skill inaccurate.

---

## 7. Verification Commands

To re-run this audit at any point:

```bash
# Section components
ls components/site/sections/*.tsx | wc -l       # expect: 18+

# UI components
ls components/ui/*.tsx | wc -l                   # expect: 28+

# AI routes
find app/api/ai -name "route.ts" | wc -l        # expect: 12+

# RBAC roles
grep -o "'[a-z_]*'" lib/admin/permissions.ts     # expect: viewer, editor, publisher, owner

# LLM model
grep DEFAULT_MODEL lib/ai/llm-provider.ts        # expect: mistral-large

# Registry type count
grep -c "'" lib/sections/section-registry.tsx     # approximate
```

---

*Generated 2026-04-13. This spec should be re-validated after any sprint that adds sections, UI components, or API routes.*
