# ADR-025 — Studio / Flutter Field Ownership Boundary

- Status: **Accepted — 2026-04-19**
- Date: 2026-04-19
- Deciders: tech lead, Studio dev, Flutter dev
- Related: #190 (Studio Unified Product Editor), #216 (W2 parity audit), #204 (activities/hotels parity follow-up), [[cross-repo-flutter]], [[ADR-003]] (contract-first), [[ADR-005]] (security boundaries), [[ADR-023]] (qa-tooling-studio-editor)

## Context

`app/dashboard/[websiteId]/products/[slug]/marketing/page.tsx` and `.../content/page.tsx` historically queried `package_kits` exclusively with `product_type='package'` hardcoded. Activities + Hotels had no marketing / content RPCs on the Studio side. Partner (Rol 2) needs deterministic answers to "can I edit this field from Studio, or do I need Flutter?" for each row in the product-detail matrix (W1 #215).

Two additional forcing functions landed 2026-04-19:

1. **Client priority v2** (meeting 2026-04-19): translation + editing for packages **and** activities are the cutover priorities. Hotels stay as-is (Flutter-owner). Booking V1 is deferred post-pilot.
2. **Schema gap audit** (W2 TVB Round 3): `activities` lacks the 12 parity columns (`program_highlights`, `program_gallery`, `video_url`, `video_caption`, `description_ai_generated`, `highlights_ai_generated`, `cover_image_url`, `program_notes`, `program_meeting_info`, `program_inclusions`, `program_exclusions`, `last_ai_hash`) and ships typo'd columns (`inclutions`, `exclutions`, `recomendations`, `instructions`) that Flutter already reads.

## Decision

Ownership is **per field × per product type × under `studio_editor_v2` flag**.

### Packages

- **Studio-editable** (under flag): `description`, `program_highlights`, `program_inclusions`, `program_exclusions`, `program_notes`, `program_meeting_info`, `cover_image_url`, `program_gallery`, `video_url`, `video_caption`, `description_ai_generated`, `highlights_ai_generated`, `custom_hero.{title,subtitle,backgroundImage}`, `custom_sections[]`, `sections_order[]`, `hidden_sections[]`, `custom_seo_title`, `custom_seo_description`, `custom_faq`, `robots_noindex`.
- **Flutter-owner (canonical)**: `duration_days/nights`, `location`, `city`, `country`, `price`, `user_rating`, `options[]`, `itinerary_items[]`, `meeting_point`, `image`, `slug`, `name`, `status`, `category`.

### Activities (confirmed Studio-editable 2026-04-19)

- **Studio-editable** (under flag, same whitelist as packages): `description`, `program_highlights`, `program_inclusions`, `program_exclusions`, `program_notes`, `program_meeting_info`, `program_gallery`, `cover_image_url`, `video_url`, `video_caption`, `description_ai_generated`, `highlights_ai_generated`, `custom_hero.*`, `custom_sections[]`, `sections_order[]`, `hidden_sections[]`.
- **Flutter-owner (canonical)**: `schedule_data`, `main_image`, `experience_type`, `price`, `slug`, `name`, `location`, `city`, `country`, `status`.
- **Legacy typo'd columns preserved additively** (`inclutions`, `exclutions`, `recomendations`, `instructions`): Flutter continues to read/write these until rename follow-up post-pilot. Studio writes to the **new parity columns** only; public renderer falls back to legacy columns when new columns are NULL.

### Hotels (Flutter-owner for pilot)

- **Flutter-owner** for all catalog + marketing fields.
- **Studio-editable** via the existing SEO item detail flow only: `custom_seo_title`, `custom_seo_description`, `custom_faq`, `robots_noindex` (on `website_product_pages`).
- **No `update_hotel_marketing_field` RPC** in pilot. Post-pilot follow-up tracked on #204.

### `website_product_pages` fields (Studio-only writer by construction)

`custom_hero`, `custom_sections`, `sections_order`, `hidden_sections` always write to `website_product_pages` with `product_type in ('package','activity','hotel')`. Because Flutter has no UI that writes these columns, audit-trigger semantics do not apply — the flag resolution for these fields is trivially always-Studio regardless of `studio_editor_v2` state.

## Option A vs Option B decision

**Option A adopted for both RPCs.** The column allowlist on the existing `update_package_kit_marketing_field` RPC is expanded to include `video_url`, `video_caption`, `description_ai_generated`, `highlights_ai_generated`. The parallel `update_activity_marketing_field` RPC (new) ships with an equivalent allowlist. Total RPC count stays at 2 (one per product type) rather than doubling to 4 with dedicated flag/video RPCs. Rationale: single surface per table keeps the audit trigger + `last_edited_by_surface` stamping path uniform, and the allowlist pattern is explicit enough to review.

See migrations:
- `supabase/migrations/20260502030000_marketing_field_rpc_expand.sql` — package_kits RPC allowlist expansion (Option A).
- `supabase/migrations/20260502031000_activity_marketing_field_rpc.sql` — activities parity DDL + new `update_activity_marketing_field` RPC.

## Field → pkg column → act column mapping table

All editors send the same `MarketingFieldPatch` payload. The RPCs map the patch `field` to the correct physical column per product type:

| Patch field | `package_kits` column | `activities` column (new, parity) | Legacy Flutter column (activities) |
|---|---|---|---|
| `description` | `description` (text) | `description` (text) | `description` (same) |
| `program_highlights` | `program_highlights` (jsonb) | `program_highlights` (jsonb) | — (new) |
| `program_inclusions` | `program_inclusions` (jsonb) | `program_inclusions` (jsonb) | `inclutions` (text, typo'd) |
| `program_exclusions` | `program_exclusions` (jsonb) | `program_exclusions` (jsonb) | `exclutions` (text, typo'd) |
| `program_notes` | `program_notes` (text) | `program_notes` (text) | `recomendations` (text, typo'd) |
| `program_meeting_info` | `program_meeting_info` (text) | `program_meeting_info` (text) | `instructions` (text) |
| `program_gallery` | `program_gallery` (jsonb) | `program_gallery` (jsonb) | — (new) |
| `social_image` / `cover_image_url` | `cover_image_url` (text) | `cover_image_url` (text) | `main_image` (text) |
| `video_url` | `video_url` (text + shape CHECK) | `video_url` (text + shape CHECK) | — (new) |
| `video_caption` | `video_caption` (text) | `video_caption` (text) | — (new) |
| `description_ai_generated` | `description_ai_generated` (boolean) | `description_ai_generated` (boolean) | — (new) |
| `highlights_ai_generated` | `highlights_ai_generated` (boolean) | `highlights_ai_generated` (boolean) | — (new) |

Legacy typo'd activity columns are NOT wired through editors but stay in the RPC allowlist for support-tooling interop. Rename deferred post-pilot.

## Consequences

- **W1 matrix** (#215): Pkg + Act columns now eligible for 🟨/✅; Hotel column stays 🚫 "as-is Flutter-owner, pilot policy".
- **W7 training** (#221): Flow 6 (Activity) is Variant A (Studio native editor); Flow 7 (Hotel) is Variant B (Flutter handoff).
- **Flag resolution**: 3 scopes (`website | account | default`) + per-field whitelist (additive when `enabled=false`; `enabled=true` wins over empty `fields[]`). Same semantics apply to both product types; no separate flag per product type.
- **Audit**: `last_edited_by_surface` column records Studio vs Flutter writes on both `package_kits` and `activities`. Trigger `trg_audit_activities` (migration `20260430000200`) already in place; the new RPC sets `app.edit_surface='studio'` in-tx so the trigger stamps `surface='studio'`.
- **Public renderer bridge**: activities public render at `/actividades/{slug}` continues to serve Flutter-authored content (reading typo'd columns) until the partner saves via Studio. After a Studio save, the new parity columns take precedence; the renderer falls back to legacy typo'd columns when parity columns are NULL. Documented in the audit doc.
- **Rollback safety**: the activity RPC migration rollback drops the parity columns + RPC but **does not touch** legacy typo'd columns. A rolled-back activity row still renders from Flutter data. A mid-deploy rollback leaves Studio routes showing read-only badges for activity editors.
- **Route resolver**: `app/dashboard/[websiteId]/products/[slug]/*` probes `package_kits` first, then `activities`. Slug collisions across the two tables within the same account resolve to packages (matches the public URL prefix precedence `/paquetes` > `/actividades`).

## Related migrations

- `20260426000000_account_feature_flags.sql` — `resolve_studio_editor_v2` + `toggle_studio_editor_v2` RPCs.
- `20260426000100_package_kits_audit_log.sql` — audit log table + `trg_audit_package_kits` trigger.
- `20260426000200_package_kits_last_edited_surface.sql` — `last_edited_by_surface` column on `package_kits`.
- `20260426000300_marketing_field_update_rpc.sql` — initial `update_package_kit_marketing_field` (narrower allowlist).
- `20260430000100_activities_hotels_last_edited_surface.sql` — `last_edited_by_surface` on `activities` + `hotels`.
- `20260430000200_product_edit_history_trigger_activities_hotels.sql` — `fn_audit_activities` + `fn_audit_hotels` triggers.
- `20260502030000_marketing_field_rpc_expand.sql` — W2 Option A allowlist expansion for packages.
- `20260502031000_activity_marketing_field_rpc.sql` — W2 activities parity DDL + `update_activity_marketing_field`.

## Alternatives considered

- **Ship act/hotel RPCs in W2** (original R2 sizing): adopted for activities (this ADR); rejected for hotels pilot.
- **Option B: new `update_package_kit_flag_field` + `update_activity_flag_field` RPCs**: rejected — doubles maintenance surface for the same audit guarantee.
- **Studio fully owns marketing for all types**: rejected; catalog canonical data belongs to Flutter (slug, price, status, schedule).
- **Flutter fully owns everything**: rejected; blocks pilot self-serve requirement.
- **Rename typo'd columns in this migration**: rejected — breaks Flutter reads mid-deploy. Tracked as post-pilot cleanup.
