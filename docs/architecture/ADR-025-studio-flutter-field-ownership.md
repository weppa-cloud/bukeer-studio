# ADR-025 — Studio / Flutter Field Ownership Boundary

- Status: Proposed (finalized at W2 #216 PR time)
- Date: 2026-04-19
- Deciders: tech lead, Studio dev, Flutter dev
- Related: #190 (Studio Unified Product Editor), #216 (W2 parity audit), [[cross-repo-flutter]], [[ADR-003]] (contract-first)

## Context

`app/dashboard/[websiteId]/products/[slug]/marketing/page.tsx` and `.../content/page.tsx` today query `package_kits` exclusively. `product_type='package'` is hardcoded. Activities + Hotels have no marketing / content RPCs in Studio. Partner (Rol 2) needs deterministic answers to "can I edit this field from Studio, or do I need Flutter?".

## Decision

Ownership is **per field × per product type × under `studio_editor_v2` flag**.

### Packages
- **Studio-editable** (under flag): `description`, `program_highlights`, `program_inclusions`, `program_exclusions`, `program_notes`, `program_meeting_info`, `cover_image_url`, `program_gallery`, `video_url`, `video_caption`, `custom_hero.{title,subtitle,backgroundImage}`, `custom_sections[]`, `sections_order[]`, `hidden_sections[]`, `custom_seo_title`, `custom_seo_description`, `custom_faq`, `robots_noindex`.
- **Flutter-owner (canonical)**: `duration_days/nights`, `location`, `city`, `country`, `price`, `user_rating`, `options[]`, `itinerary_items[]`, `meeting_point`, `image`, `slug`, `name`.

### Activities
- **Flutter-owner** for pilot: all catalog fields + marketing fields.
- **Post-pilot follow-up**: `update_activity_marketing_field` RPC + Studio editor routes if demand validated.

### Hotels
- **Flutter-owner** for pilot: all catalog fields + marketing fields.
- **Studio-editable** via existing SEO item detail: `custom_seo_title`, `custom_seo_description`, `custom_faq`, `robots_noindex`.
- **Post-pilot follow-up**: `update_hotel_marketing_field` RPC + Studio editor routes.

## Consequences

- Matrix (W1 #215) reflects pkg-only 🟨 scope; Act/Hotel 🚫 "pendiente wire — ver W2/W7".
- W7 training flows 6 (Activity) + 7 (Hotel) default to Flutter-handoff protocol (Variant B).
- Flag resolution (3 scopes: website | account | default + per-field whitelist) remains authoritative gate.
- `last_edited_by_surface` column records Studio vs Flutter writes (audit).

## Refactor at W2 PR time

- `toggleAiFlag` + `saveVideoUrl` actions refactored to go through RPC `update_package_kit_marketing_field` (Option A expansion) or new flag RPC (Option B) so `app.edit_surface='studio'` is set in the tx.
- Final Option A vs B decision logged at W2 PR merge.
- Migration numbering: `20260501000000_marketing_field_rpc_expand.sql` (verify numbering at PR time).

## Alternatives considered

- **Ship act/hotel RPCs in W2 (bumps to XL)**: rejected for pilot; kept as post-pilot follow-up.
- **Studio fully owns marketing for all types**: rejected; catalog canonical data belongs to Flutter.
- **Flutter fully owns everything**: rejected; blocks pilot self-serve requirement.
