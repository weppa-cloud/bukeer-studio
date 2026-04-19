# Studio Editor Parity Audit — Packages + Activities

**Status:** Baseline 2026-04-19 (W2 #216 v2)
**Scope:** `product_type in ('package','activity')`. Hotels are Flutter-owner for the pilot — see [[ADR-025-studio-flutter-field-ownership]].
**Source of truth:** this doc + ADR-025 + migrations `20260502030000` and `20260502031000`.

---

## 1 · What this doc answers

For every editor under `components/admin/marketing/*` and `components/admin/page-customization/*`:

1. Which server action does it call?
2. Which DB column (per product type) does the action write?
3. Where does the public renderer read that column?
4. Does the save path stamp `last_edited_by_surface='studio'` on the row?
5. Does `revalidatePath` target the right public URL prefix?

W4 (#218) consumes this trace to build the editor → DB → render E2E specs.

---

## 2 · Editor → action → column → renderer trace

### 2.1 · Marketing editors (`/dashboard/[websiteId]/products/[slug]/marketing`)

Route resolver: [`lib/admin/product-resolver.ts::resolveProductRow({ mode: 'marketing' })`](../../lib/admin/product-resolver.ts) — probes `package_kits` first, then `activities` by (`account_id`, `slug`).

Action: [`app/dashboard/[websiteId]/products/[slug]/marketing/actions.ts::saveMarketingField`](../../app/dashboard/[websiteId]/products/[slug]/marketing/actions.ts) — dispatches to the appropriate RPC per `productType`:

- `package` → `update_package_kit_marketing_field` (migrations `20260426000300` → `20260502030000`)
- `activity` → `update_activity_marketing_field` (migration `20260502031000`)

Both RPCs set `app.edit_surface='studio'` in the same transaction, so the audit trigger (`trg_audit_package_kits` / `trg_audit_activities`) stamps `surface='studio'` and the RPC sets `last_edited_by_surface='studio'` on the row.

`revalidatePath` prefix: `/paquetes/${slug}` for packages, `/actividades/${slug}` for activities (via [`publicPathPrefix`](../../lib/admin/product-resolver.ts)).

| Editor component | Patch `field` | Package column (`package_kits`) | Activity column (`activities`) | Legacy Flutter column (activities) | Public renderer block |
|---|---|---|---|---|---|
| `DescriptionEditor` | `description` | `description` | `description` | `description` | `detail-description` in `components/pages/product-landing-page.tsx` |
| `HighlightsEditor` | `program_highlights` | `program_highlights` (jsonb) | `program_highlights` (jsonb, new) | — | `detail-highlights` |
| `InclusionsExclusionsEditor` (inclusions) | `program_inclusions` | `program_inclusions` (jsonb) | `program_inclusions` (jsonb, new) | `inclutions` (text, typo — fallback) | `detail-options` / inclusions list block |
| `InclusionsExclusionsEditor` (exclusions) | `program_exclusions` | `program_exclusions` (jsonb) | `program_exclusions` (jsonb, new) | `exclutions` (text, typo — fallback) | exclusions list block |
| `RecommendationsEditor` | `program_notes` | `program_notes` (text) | `program_notes` (text, new) | `recomendations` (text, typo — fallback) | recommendations block |
| `InstructionsEditor` | `program_meeting_info` | `program_meeting_info` (text) | `program_meeting_info` (text, new) | `instructions` (text — fallback) | meeting point block |
| `SocialImagePicker` | `social_image` | `cover_image_url` (text) | `cover_image_url` (text, new) | `main_image` (text — fallback) | OG image meta + hero fallback |
| `GalleryCurator` | `program_gallery` | `program_gallery` (jsonb) | `program_gallery` (jsonb, new) | — | `detail-gallery` |

**Legacy typo'd column fallback:** activities public rendering at `/actividades/[slug]` reads the new parity column first; when NULL (pre-migration activity rows or rows never touched by Studio) it falls back to the legacy typo'd column (`inclutions`, `exclutions`, `recomendations`, `instructions`). After a Studio save to the parity column, the new column wins.

**Flag resolution:** every editor checks `isStudioFieldEnabled(resolution, field)` against `studio_editor_v2` per [`lib/features/studio-editor-v2.ts`](../../lib/features/studio-editor-v2.ts). When the field is not Studio-owned, the editor renders read-only and `saveMarketingField` throws `FIELD_NOT_STUDIO_OWNED` as defense-in-depth.

### 2.2 · Content editors (`/dashboard/[websiteId]/products/[slug]/content`)

Route resolver: [`resolveProductRow({ mode: 'content' })`](../../lib/admin/product-resolver.ts).

Actions: [`app/dashboard/[websiteId]/products/[slug]/content/actions.ts`](../../app/dashboard/[websiteId]/products/[slug]/content/actions.ts) — dispatches by `productType`.

Writer tables:
- `HeroOverrideEditor`, `SectionVisibilityToggle`, `SectionsReorderEditor`, `CustomSectionsEditor` → `website_product_pages` (Studio-only writer by construction; audit-trigger semantics N/A).
- `VideoUrlEditor`, `AiFlagsPanel` → `package_kits` or `activities` via the RPC (audit trigger fires).

| Editor component | Server action | Target table / column | Audit stamp `last_edited_by_surface` |
|---|---|---|---|
| `HeroOverrideEditor` | `saveHeroOverride` | `website_product_pages.custom_hero` (jsonb `{title,subtitle,backgroundImage}`) | N/A (Studio-only writer) |
| `SectionVisibilityToggle` | `saveVisibility` | `website_product_pages.hidden_sections` (text[]) | N/A |
| `SectionsReorderEditor` | `saveOrder` | `website_product_pages.sections_order` (text[]) | N/A |
| `CustomSectionsEditor` | `saveCustomSections` | `website_product_pages.custom_sections` (jsonb[]) | N/A |
| `VideoUrlEditor` (url) | `saveVideoUrl` | `package_kits.video_url` or `activities.video_url` via RPC | **Yes — via RPC** (W2 AC-W2-6) |
| `VideoUrlEditor` (caption) | `saveVideoUrl` | `package_kits.video_caption` or `activities.video_caption` via RPC | **Yes — via RPC** |
| `AiFlagsPanel` (description) | `toggleAiFlag` | `package_kits.description_ai_generated` or `activities.description_ai_generated` via RPC | **Yes — via RPC** |
| `AiFlagsPanel` (highlights) | `toggleAiFlag` | `package_kits.highlights_ai_generated` or `activities.highlights_ai_generated` via RPC | **Yes — via RPC** |

Before W2: `saveVideoUrl` + `toggleAiFlag` did raw `.update()` on `package_kits`, so `last_edited_by_surface` stayed at its previous value (typically `'flutter'`). After W2: both actions route through `update_package_kit_marketing_field` / `update_activity_marketing_field`, which set `app.edit_surface='studio'` + stamp the row. See [migration `20260502030000`](../../supabase/migrations/20260502030000_marketing_field_rpc_expand.sql) Option A allowlist expansion + [migration `20260502031000`](../../supabase/migrations/20260502031000_activity_marketing_field_rpc.sql).

`revalidatePath`: uses `publicPathPrefix(productType)` (`/paquetes` or `/actividades`) for every save.

### 2.3 · `website_product_pages` per-site overlay

All four content editors target a single row in `website_product_pages` keyed by (`website_id`, `product_id`, `product_type`). The `product_type` discriminator accepts `'package' | 'activity' | 'hotel' | 'transfer'` per migration `20260424000100`. W2 writes `'package'` or `'activity'` via [`pageProductTypeValue`](../../lib/admin/product-resolver.ts).

---

## 3 · ISR revalidation verification

Post-save, every action issues `revalidatePath(publicPathPrefix(productType) + '/' + slug)`. The public rendering routes that consume these paths:

- Packages: `app/site/[subdomain]/paquetes/[slug]/page.tsx`.
- Activities: `app/site/[subdomain]/[...slug]/page.tsx` (handles `/actividades/[slug]`).

Flush window: ≤ 5 min. Manual QA verified by editing a field, waiting for revalidation, hitting the public URL.

---

## 4 · `last_edited_by_surface` audit verification

Manual QA checklist for a complete Studio-edit roundtrip:

| Product type | Field | Action | Expected row state after save |
|---|---|---|---|
| package | description | `saveMarketingField` | `package_kits.last_edited_by_surface = 'studio'`, `description_ai_generated = false` |
| package | program_highlights | `saveMarketingField` | `highlights_ai_generated = false`, `last_edited_by_surface = 'studio'` |
| package | video_url | `saveVideoUrl` | **after W2:** `last_edited_by_surface = 'studio'` |
| package | description_ai_generated | `toggleAiFlag` | **after W2:** `last_edited_by_surface = 'studio'` |
| activity | description | `saveMarketingField` | `activities.last_edited_by_surface = 'studio'` |
| activity | program_highlights | `saveMarketingField` | `activities.highlights_ai_generated = false`, `last_edited_by_surface = 'studio'` |
| activity | video_url | `saveVideoUrl` | `activities.last_edited_by_surface = 'studio'` |
| activity | highlights_ai_generated | `toggleAiFlag` | `activities.last_edited_by_surface = 'studio'` |

Audit triggers `trg_audit_package_kits` (migration `20260426000100`) and `trg_audit_activities` (migration `20260430000200`) both read `current_setting('app.edit_surface', true)`. The RPCs set this to `'studio'` via `set_config('app.edit_surface', 'studio', true)` before the UPDATE so the trigger sees it in the same transaction. Rows for which Flutter writes the column continue to log `surface='flutter'` (default branch of the coalesce) or `surface='trigger_default'` when no session config is set.

SQL probe for post-save verification:

```sql
select last_edited_by_surface, updated_at
from public.package_kits
where id = :product_id;

select surface, changed_fields, created_at
from public.package_kits_audit_log
where package_kit_id = :product_id
order by created_at desc
limit 3;
```

Equivalent probe for activities uses `public.activities` + `public.product_edit_history` (where `fn_audit_activities` writes via `log_edit_history(…,'activity',…)`).

---

## 5 · Flag resolution coverage

Per [`lib/features/studio-editor-v2.ts`](../../lib/features/studio-editor-v2.ts) + RPC `resolve_studio_editor_v2`:

- **Default** (no `account_feature_flags` row) → Flutter wins. Editors render read-only with "Solo lectura — este campo se edita en Flutter" badge.
- **Account-wide** (`website_id IS NULL`, `studio_editor_v2_enabled=true`) → all 9 marketing fields Studio-editable.
- **Website override** (`website_id=<website>`) → takes precedence over account row.
- **Per-field whitelist** (`studio_editor_v2_fields` jsonb array) → additive when `enabled=false`; `enabled=true` wins globally.

Same semantics apply to both `product_type='package'` and `product_type='activity'`. Hotels do not use the flag (no Studio editor surface).

---

## 6 · Out of scope for this audit

- Hotels editor parity — Flutter-owner for pilot. Tracked post-pilot on #204.
- Booking V1 — deferred per ADR-024.
- E2E specs — owned by W4 #218 (this doc provides the trace W4 consumes).
- Blog transcreate flow — owned by W5 #219.

---

## 7 · References

- ADR: [[ADR-025-studio-flutter-field-ownership]]
- EPIC: #214 Stage 2 W2 (#216)
- Shared context: `.claude/rules/cross-repo-flutter.md`
- Prior audit: [[schema-parity-audit]] (reference for activities/hotels schema gap analysis)
- Matrix: [[product-detail-matrix]]
