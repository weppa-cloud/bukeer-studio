# Schema Parity Audit — `package_kits` vs `activities` vs `hotels`

**Issue:** [#190](https://github.com/weppa-cloud/bukeer-studio/issues/190) — Phase 1b F1
**Date:** 2026-04-17
**Author:** Claude (research pass)
**Status:** Research only — NO migrations executed. Basis for Phase 1b F2 migration design.
**Source of truth:** Supabase project `wzlxbpicdcdvxvdcvgas` (live `information_schema` + `pg_indexes` + `pg_proc`).
**See also:** [[product-detail-matrix]] · [[product-detail-inventory]] · [[package-detail-anatomy]]

---

## 1 · Executive summary

`package_kits` is the reference (R7 marketing-ready). `activities` and `hotels` share a legacy-catalog lineage (Flutter-authored) and **already have `slug` + `account_id` + unique per-account slug index**, but they are missing the structured marketing JSONB bundle (`program_*`), AI provenance flags, video fields, `robots_noindex`, `last_edited_by_surface`, and the dual-surface audit log.

Two architectural decisions emerge:

1. **Where marketing content lives** — add per-entity columns vs. push all net-new marketing into polymorphic `website_product_pages.additional_content` JSONB. **Recommendation: hybrid.** Keep SEO/AI atoms (video, robots_noindex, ai flags, last_edited_by_surface) on the entity (needed for RLS + indices + JSON-LD); push `program_highlights`/`inclusions`/`exclusions`/`gallery`/`notes`/`meeting_info` into `website_product_pages.additional_content` (already exists, already polymorphic) so we do NOT triplicate columns.
2. **Audit log generalization** — the current `package_kits_audit_log` + `fn_audit_package_kits()` pair is nearly trigger-agnostic. **Recommendation: build `product_edit_history` as a unified log (W3 / [[#197]]) parameterized by `product_type` (`'package_kit' | 'activity' | 'hotel'`)** rather than cloning per-entity logs. Reconciliation RPC becomes polymorphic too.

`reconcile_package_kits_surfaces()` has zero package-specific logic — it only groups the audit log. A polymorphic `reconcile_product_surfaces(p_product_type text, p_window interval)` with a unified log is a one-function replacement.

---

## 2 · Field-by-field parity matrix

Legend: `✅` present · `❌` missing · `⚠️` present but differs (typo / partial / wrong shape) · `N/A` not applicable.

| Field | `package_kits` | `activities` | `hotels` | Notes |
|---|---|---|---|---|
| `id` (uuid PK) | ✅ `gen_random_uuid()` | ✅ `uuid_generate_v4()` | ✅ `uuid_generate_v4()` | PK default differs cosmetically; no action. |
| `account_id` (uuid) | ✅ NOT NULL | ✅ nullable | ✅ nullable | **Delta:** activities/hotels allow NULL — legacy; RLS tenancy ([[ADR-005]]) relies on `account_id IS NOT NULL`. Recommend backfill + NOT NULL constraint in F2. |
| `name` | ✅ NOT NULL | ✅ NOT NULL | ✅ NOT NULL | — |
| `slug` | ✅ NOT NULL `DEFAULT ''` · UNIQUE global | ✅ nullable · UNIQUE `(account_id, slug)` partial | ✅ nullable · UNIQUE `(account_id, slug)` partial | **Divergence:** pkg-kits slug is globally unique; activities/hotels are per-account. For website routing `/[product-type]/[slug]` per-account is correct; `ux_package_kits_slug` being global is the odd one out. Out of scope for #190 — flag for future. |
| `slug` auto-trigger | ✅ `set_package_kit_slug()` | ✅ `set_website_product_slug()` | ✅ `set_website_product_slug()` | activities/hotels already share a generic trigger. |
| Slug-redirect tracking | ❌ | ✅ `track_product_slug_redirect('activity')` | ✅ `track_product_slug_redirect('hotel')` | pkg_kits should gain this for parity ([[ADR-007]] — edge cache / 301s). Flag — not in #190 scope. |
| `description` (long) | ✅ | ✅ | ✅ | All three present. |
| `description_short` | ❌ | ✅ | ✅ | pkg_kits has no explicit short; uses `description` slice. |
| `cover_image_url` / `main_image` / `image` | ✅ `cover_image_url` | ⚠️ `main_image` | ⚠️ `main_image` | Naming diverges. Resolvers in Studio already normalize ([[product-detail-inventory]]). View/alias recommended, NOT rename. |
| `social_image` (OG) | ❌ | ✅ | ✅ | **Delta:** pkg_kits lacks `social_image`. Add column OR always derive from `cover_image_url`. Recommend add for consistency. |
| `pdf_image` | ❌ | ❌ | ✅ | Hotel-specific, leave. |
| `program_highlights` (jsonb) | ✅ `'[]'::jsonb` | ❌ | ❌ | **Primary delta.** Recommend: push to `website_product_pages.additional_content->'highlights'` instead of ALTER activities/hotels. |
| `program_inclusions` (jsonb) | ✅ `'[]'::jsonb` | ⚠️ `inclutions` (text, typo) | ⚠️ `inclutions` (text, typo) | Typo + shape mismatch. Recommend: keep legacy `inclutions` text in place (read-only, Flutter writes), layer structured jsonb via `website_product_pages.additional_content->'inclusions'`. |
| `program_exclusions` (jsonb) | ✅ `'[]'::jsonb` | ⚠️ `exclutions` (text, typo) | ⚠️ `exclutions` (text, typo) | Same as above. |
| `program_gallery` (jsonb) | ✅ `'[]'::jsonb` | ❌ | ❌ | No native gallery column; Flutter uses `photos`/`images` elsewhere (products shared model). Route via `additional_content->'gallery'`. |
| `program_notes` (text) | ✅ `''` | ⚠️ `recomendations` (text, typo) | ⚠️ `recomendations` (text, typo) | Semantics overlap (notes ≈ recomendations ≈ instructions). Recommend `additional_content->'notes'` in Studio; leave legacy Flutter fields untouched. |
| `program_meeting_info` (text) | ✅ `''` | ⚠️ `instructions` (text) | ⚠️ `instructions` (text) | Same — map Flutter → Studio via adapter; don't ALTER. |
| `amenities` (text[]) | ❌ | ❌ | ✅ | Hotel-only, keep. |
| `experience_type` | ❌ | ✅ | ❌ | Activity-only, keep. |
| `star_rating` | ❌ | ❌ | ✅ | Hotel-only, keep. |
| AI: `description_ai_generated` (bool) | ✅ `false` | ❌ | ❌ | **Delta.** Add to activities/hotels IF Studio Editor v2 triggers AI for them (MVP: pkg_kits only per [[#174]]). Defer. |
| AI: `highlights_ai_generated` (bool) | ✅ `false` | ❌ | ❌ | Same — defer. |
| AI: `last_ai_hash` (text) | ✅ | ❌ | ❌ | Same — defer. |
| `video_url` | ✅ ([[#165]]) | ❌ | ❌ | **Scope decision** — [[#165]] Phase 0 added to `package_kits` only. Spec table in [[product-detail-inventory]] implies `products.video_url` but the physical col is on pkg_kits. For activities/hotels MVP: defer until Flutter UI exists. |
| `video_caption` | ✅ | ❌ | ❌ | Same — defer. |
| `robots_noindex` | ✅ `false` | ❌ | ❌ | **Delta.** Currently covered by `website_product_pages.robots_noindex` for activities/hotels (already exists). No ALTER needed on entities — read from page overlay. |
| `last_edited_by_surface` (text, R7) | ✅ | ❌ | ❌ | **Primary delta for F2.** Required for dual-surface reconciliation. Recommend add to both, or — preferred — move the surface tag into the unified `product_edit_history` log (per-row `surface` column already exists in `package_kits_audit_log`). Then entity column becomes a denormalized convenience, optional. |
| `is_featured` | ✅ `false` | ❌ | ❌ | Studio curation flag. Recommend add IF featured lists target activities/hotels; otherwise route via `websites` config. Defer. |
| `deleted_at` / `deleted_by` / `deletion_reason` (soft delete) | ❌ | ✅ | ✅ | pkg_kits lacks soft delete. Out of scope for #190. |
| `category` | ✅ NOT NULL `'standard'` | ❌ | ❌ | pkg_kits-only taxonomy. |
| `status` (draft/published/archived) | ✅ NOT NULL `'draft'` | ❌ | ❌ | **Delta.** Activities/hotels have no publication state — they live as soon as they exist. Phase 1b F2 scope decision. Recommend: add `status text NOT NULL DEFAULT 'published'` to both (safer default preserves current behavior) + optional draft/archived workflow later. |
| Audit trigger | ✅ `trg_audit_package_kits` → `fn_audit_package_kits()` | ❌ | ❌ | **Primary delta for W3 / [[#197]].** See §5. |
| `updated_at` auto | ✅ `_set_updated_at_column()` | ✅ `update_modified_column()` | ❌ (default-only) | Hotels lack UPDATE trigger; rely on app writes. Parity recommended. |

---

## 3 · Related schema — polymorphic overlay already exists

`public.website_product_pages` (already live) stores per-website per-product overlay:

| Column | Type | Notes |
|---|---|---|
| `website_id` uuid NOT NULL | — | tenancy via website |
| `product_type` text NOT NULL | `'activity' \| 'hotel' \| 'package_kit'` expected | **This is the polymorphic key.** |
| `product_id` uuid NOT NULL | FK by convention (not enforced — polymorphic) | — |
| `custom_hero` jsonb | — | per-page hero override (title/subtitle/bg) |
| `custom_sections` jsonb `[]` | — | custom section injection |
| `sections_order` text[] | — | reorder |
| `hidden_sections` text[] | — | hide |
| `additional_content` jsonb `{}` | — | **landing pad for program_highlights/inclusions/exclusions/gallery/notes/meeting_info when entity lacks them** |
| `custom_seo_title/description/keywords` | — | SEO overrides |
| `robots_noindex` bool | — | per-page SEO control — replaces need for entity-level col on act/hotels |
| `seo_intro` / `seo_highlights` / `seo_faq` / `custom_faq` / `custom_highlights` | jsonb | **Already marketing-capable.** |
| `source` text (`'manual'`) | — | origin of the overlay |
| `confidence` `seo_confidence` | — | live/stale/draft |

**Implication:** `website_product_pages.additional_content` is the de-facto destination for the `program_*` JSONB bundle for activities/hotels. No ALTER on the entity tables required for those six fields.

---

## 4 · Migration deltas — proposal

### 4.1 · Minimum delta set (Phase 1b F2 — required for dual-surface parity)

**Entities touched:** `activities`, `hotels` (and `package_kits_audit_log` → rename).

#### M1 — `account_id NOT NULL` backfill
```sql
-- 20260428000100_activities_hotels_account_id_notnull.sql
-- Tighten tenancy per ADR-005.
UPDATE public.activities SET account_id = '<default_account>' WHERE account_id IS NULL;
UPDATE public.hotels     SET account_id = '<default_account>' WHERE account_id IS NULL;
ALTER TABLE public.activities ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE public.hotels     ALTER COLUMN account_id SET NOT NULL;
```
(Backfill value confirmed with data owner; or migration aborts if nulls found — fail-safe.)

#### M2 — Unified edit history (preferred over per-entity audit logs)
```sql
-- 20260428000200_product_edit_history.sql  (W3 / [[#197]])
CREATE TABLE public.product_edit_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  product_type text NOT NULL CHECK (product_type IN ('package_kit','activity','hotel')),
  product_id uuid NOT NULL,
  operation text NOT NULL CHECK (operation IN ('INSERT','UPDATE','DELETE')),
  surface text NOT NULL,
  changed_fields text[] NOT NULL DEFAULT '{}',
  previous_row jsonb,
  new_row jsonb,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.product_edit_history (account_id, product_type, product_id, created_at DESC);
CREATE INDEX ON public.product_edit_history (created_at DESC) WHERE operation = 'UPDATE';
```

#### M3 — Generic audit trigger (replaces `fn_audit_package_kits`)
```sql
-- 20260428000300_product_edit_history_trigger.sql
CREATE OR REPLACE FUNCTION public.fn_audit_product_edit(p_product_type text)
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_surface text; v_changed text[]; v_user uuid;
BEGIN
  v_surface := coalesce(nullif(current_setting('app.edit_surface', true), ''), 'trigger_default');
  v_user := auth.uid();
  IF tg_op = 'UPDATE' THEN
    SELECT array_agg(key) INTO v_changed
      FROM jsonb_each(to_jsonb(new)) n
      JOIN jsonb_each(to_jsonb(old)) o USING (key)
     WHERE n.value IS DISTINCT FROM o.value;
    IF v_changed IS NULL OR cardinality(v_changed) = 0 THEN RETURN new; END IF;
    INSERT INTO public.product_edit_history (account_id, product_type, product_id, operation, surface, changed_fields, previous_row, new_row, changed_by)
    VALUES (new.account_id, p_product_type, new.id, 'UPDATE', v_surface, v_changed, to_jsonb(old), to_jsonb(new), v_user);
  ELSIF tg_op = 'INSERT' THEN
    INSERT INTO public.product_edit_history (account_id, product_type, product_id, operation, surface, changed_fields, previous_row, new_row, changed_by)
    VALUES (new.account_id, p_product_type, new.id, 'INSERT', v_surface, '{}', null, to_jsonb(new), v_user);
  ELSIF tg_op = 'DELETE' THEN
    INSERT INTO public.product_edit_history (account_id, product_type, product_id, operation, surface, changed_fields, previous_row, new_row, changed_by)
    VALUES (old.account_id, p_product_type, old.id, 'DELETE', v_surface, '{}', to_jsonb(old), null, v_user);
  END IF;
  RETURN coalesce(new, old);
END $$;

CREATE TRIGGER trg_audit_activities    AFTER INSERT OR UPDATE OR DELETE ON public.activities    FOR EACH ROW EXECUTE FUNCTION public.fn_audit_product_edit('activity');
CREATE TRIGGER trg_audit_hotels        AFTER INSERT OR UPDATE OR DELETE ON public.hotels        FOR EACH ROW EXECUTE FUNCTION public.fn_audit_product_edit('hotel');
-- Replace old package_kits trigger atomically:
DROP TRIGGER IF EXISTS trg_audit_package_kits ON public.package_kits;
CREATE TRIGGER trg_audit_package_kits  AFTER INSERT OR UPDATE OR DELETE ON public.package_kits  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_product_edit('package_kit');
```

#### M4 — Backfill + retire old log
```sql
-- 20260428000400_migrate_package_kits_audit_log.sql
INSERT INTO public.product_edit_history (id, account_id, product_type, product_id, operation, surface, changed_fields, previous_row, new_row, changed_by, created_at)
SELECT id, account_id, 'package_kit', package_kit_id, operation, surface, changed_fields, previous_row, new_row, changed_by, created_at
FROM public.package_kits_audit_log;
-- Keep legacy table as VIEW for one release cycle (deprecation window):
ALTER TABLE public.package_kits_audit_log RENAME TO package_kits_audit_log_legacy;
CREATE VIEW public.package_kits_audit_log AS
  SELECT id, account_id, product_id AS package_kit_id, operation, surface, changed_fields, previous_row, new_row, changed_by, created_at
  FROM public.product_edit_history
  WHERE product_type = 'package_kit';
-- Drop legacy in follow-up after N days of observability (ADR-010).
```

#### M5 — Polymorphic reconciliation RPC
```sql
-- 20260428000500_reconcile_product_surfaces.sql
CREATE OR REPLACE FUNCTION public.reconcile_product_surfaces(
  p_product_type text DEFAULT NULL,            -- NULL = all types
  p_window interval DEFAULT interval '24 hours'
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_anomalies jsonb := '[]'::jsonb; r record;
BEGIN
  FOR r IN
    SELECT product_type, product_id, account_id,
           array_agg(DISTINCT surface) AS surfaces,
           count(*) AS write_count,
           min(created_at) AS first_at, max(created_at) AS last_at
      FROM public.product_edit_history
     WHERE created_at > now() - p_window
       AND operation = 'UPDATE'
       AND (p_product_type IS NULL OR product_type = p_product_type)
     GROUP BY product_type, product_id, account_id
    HAVING array_length(array_agg(DISTINCT surface), 1) > 1
  LOOP
    v_anomalies := v_anomalies || jsonb_build_object(
      'product_type', r.product_type, 'product_id', r.product_id, 'account_id', r.account_id,
      'surfaces', r.surfaces, 'write_count', r.write_count,
      'window_start', r.first_at, 'window_end', r.last_at);
    INSERT INTO public.reconciliation_alerts (account_id, source, severity, summary, details)
    VALUES (r.account_id, 'studio_editor_v2', 'warn',
      format('Dual-surface write: %s %s (%s writes in %s)', r.product_type, r.product_id, r.write_count, p_window),
      jsonb_build_object('product_type', r.product_type, 'product_id', r.product_id, 'surfaces', r.surfaces, 'write_count', r.write_count))
    ON CONFLICT DO NOTHING;
  END LOOP;
  RETURN jsonb_build_object('anomalies_count', jsonb_array_length(v_anomalies), 'anomalies', v_anomalies, 'product_type_scope', coalesce(p_product_type, 'all'), 'checked_at', now());
END $$;
-- Preserve legacy entry point as thin wrapper:
CREATE OR REPLACE FUNCTION public.reconcile_package_kits_surfaces(p_window interval DEFAULT interval '24 hours')
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT public.reconcile_product_surfaces('package_kit', p_window);
$$;
```

### 4.2 · Deferred (explicitly out of scope for MVP F2)

- `program_*` JSONB columns on entities — **do NOT add.** Push to `website_product_pages.additional_content->'<field>'`. ADR note below.
- `video_url` / `video_caption` on activities/hotels — defer until Flutter UI supports video for these ([[#165]] Phase 0 shipped only for packages).
- AI flags (`*_ai_generated`, `last_ai_hash`) on activities/hotels — defer; no AI pipeline targets them ([[#174]] is packages-only).
- `is_featured` on activities/hotels — defer; curation uses websites config today.
- Typo rename `inclutions`→`inclusions` — **DO NOT RENAME.** Creates a Flutter-app break. Provide a **view alias** if Studio needs a clean name:
  ```sql
  CREATE VIEW public.activities_marketing AS
  SELECT *, inclutions AS inclusions, exclutions AS exclusions, recomendations AS recommendations FROM public.activities;
  ```
  Document the typo in `docs/product/product-detail-inventory.md` so developers reading Studio code don't re-break it.
- `slug` uniqueness scope on `package_kits` — currently global; out of scope.

---

## 5 · Recommendations — summary

| # | Recommendation | Rationale | Scope |
|---|---|---|---|
| R1 | **Unified `product_edit_history` log (polymorphic)**, retire `package_kits_audit_log` via view | One schema, one trigger function, one RPC; avoids N×table proliferation ([[ADR-010]]) | F2 must |
| R2 | **Polymorphic `reconcile_product_surfaces(product_type, window)`** + thin legacy wrapper | Zero package-specific logic in current RPC; drop-in replacement | F2 must |
| R3 | **Use `website_product_pages.additional_content` as home for `program_*` fields** on activities/hotels | Polymorphic overlay already exists + already carries SEO atoms; avoids triplicate columns | F2 design |
| R4 | **Backfill + NOT NULL on `account_id`** for activities/hotels | Tenancy hardening per [[ADR-005]] | F2 must |
| R5 | **Do NOT rename typo columns** (`inclutions`/`exclutions`/`recomendations`) — alias via view if needed | Flutter cross-repo contract ([[ADR-003]] + `.claude/rules/cross-repo-flutter.md`) depends on these names | F2 policy |
| R6 | Add `status` column to activities/hotels with `DEFAULT 'published'` | Enables draft workflow parity without breaking current listings | F3 nice-to-have |
| R7 | Defer `video_url`/AI flags/`is_featured` on activities/hotels | No UI consumers yet ([[#165]] [[#174]]) — YAGNI | Post-MVP |
| R8 | Keep `robots_noindex` on `website_product_pages` only for non-package entities | Per-page overlay is the correct home; entity-level `robots_noindex` on `package_kits` can also be folded later | F3 nice-to-have |
| R9 | Denormalize `last_edited_by_surface` onto entity only if UI hot-path needs it | Unified log already stores surface per row — UI can query that | Optional |

---

## 6 · Phase 1b F2/F3 migration file plan

Naming convention mirrors existing `supabase/migrations/20260426*` (YYYYMMDDHHMMSS + description):

| Order | File | Purpose | Phase |
|---|---|---|---|
| 1 | `20260428000100_activities_hotels_account_id_notnull.sql` | R4 — tenancy hardening | F2 |
| 2 | `20260428000200_product_edit_history.sql` | R1 — unified log table | F2 |
| 3 | `20260428000300_product_edit_history_trigger.sql` | R1 — generic trigger + rebind `package_kits` | F2 |
| 4 | `20260428000400_migrate_package_kits_audit_log.sql` | R1 — backfill + legacy view | F2 |
| 5 | `20260428000500_reconcile_product_surfaces.sql` | R2 — polymorphic RPC + legacy shim | F2 |
| 6 | `20260428000600_activities_hotels_updated_at_trigger.sql` | hotels missing `updated_at` trigger | F2 |
| 7 | `20260429000100_website_product_pages_marketing_defaults.sql` | R3 — document expected keys in `additional_content`; backfill defaults | F3 |
| 8 | `20260429000200_activities_hotels_status.sql` | R6 — optional publication state | F3 |
| 9 | `20260429000300_drop_package_kits_audit_log_legacy.sql` | R1 cleanup (after observability window per [[ADR-010]]) | Post-F3 |

---

## 7 · ADR linkage

- [[ADR-003]] Contract-first validation — any Studio writes to `website_product_pages.additional_content` must land through a Zod schema shared with `@bukeer/website-contract`. Document the polymorphic key shape:
  ```
  additional_content: {
    highlights?: Highlight[];
    inclusions?: string[];
    exclusions?: string[];
    gallery?: MediaItem[];
    notes?: string;
    meeting_info?: string;
  }
  ```
- [[ADR-005]] Security / defense in depth — R4 (account_id NOT NULL) closes a tenancy hole; RLS on `product_edit_history` must mirror `account_id` scoping.
- [[ADR-010]] Observability — unified log simplifies metric emission: `product_edit_write{product_type, surface}` counter covers all three entities. Reconciliation alerts use one query path.

---

## 8 · Open questions for migration design (F2 kickoff)

1. **Default account for NOT NULL backfill.** Does data owner approve a catch-all account or should migration fail if any `activities/hotels` rows have NULL `account_id`? (Recommend fail-safe.)
2. **Write path for `additional_content` marketing atoms.** Does Studio Editor v2 write directly to `website_product_pages` for activities/hotels, OR does it proxy through a server action that also dual-writes to a future Flutter-facing table? (MVP assumption: single-write to `website_product_pages`; Flutter catalog remains untouched.)
3. **Grace period for `package_kits_audit_log` view.** 30 days? 60 days? Tied to which release tag?
4. **RLS scope for `product_edit_history`** — mirror `package_kits_audit_log` policies exactly, or tighten by `product_type`? (Recommend same policy class; filter by `product_type` only at query layer.)
5. **Global slug on `package_kits` vs per-account on activities/hotels** — keep divergence or normalize? Out of #190 scope but should have an owner.

---

## 9 · Evidence

Queried against `wzlxbpicdcdvxvdcvgas` on 2026-04-17:

- `information_schema.columns` for `package_kits | activities | hotels` — full column list cross-checked.
- `pg_indexes` on the three tables — unique slug indices, partial `WHERE deleted_at IS NULL AND slug IS NOT NULL` on activities/hotels, global unique on package_kits.
- `information_schema.triggers` — confirmed activities/hotels share `set_website_product_slug()`; only `package_kits` has `trg_audit_package_kits`.
- `pg_proc` — retrieved body of `fn_audit_package_kits()` and `reconcile_package_kits_surfaces()`; both are entity-agnostic apart from hard-coded table name.
- `information_schema.tables` — enumerated `*_audit_log` / `*_history` tables; confirmed `website_product_pages` shape.

No DDL executed. No data modified.
