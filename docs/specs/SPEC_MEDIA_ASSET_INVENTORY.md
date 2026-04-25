# SPEC: Media Asset Inventory and Characterization v1

**Status:** Draft implemented  
**Date:** 2026-04-25  
**Scope:** Supabase schema/RPC + operational verification + documentation  
**Primary registry:** `public.media_assets`  
**GitHub tracking:** [weppa-cloud/bukeer-studio#301](https://github.com/weppa-cloud/bukeer-studio/issues/301)  
**Architecture decision:** [[ADR-028]]

---

## 1. Purpose

Bukeer stores public media references across Supabase Storage buckets and legacy
business fields. Studio already has `media_assets`, but many images still live
only as URL strings in product, website, section and blog records. This v1 makes
`media_assets` the operational inventory for those references without changing
public rendering or Flutter write paths.

The registry must answer:

- Which media exists per `account_id` and `website_id`.
- Which entity owns each media reference.
- Which usage context it serves: `hero`, `gallery`, `featured`, `og`, `avatar`, `body`.
- Which references are external, broken, unowned, duplicated, missing alt text,
  heavy, or in non-optimal formats.

---

## 2. Current Baseline

Existing foundation:

- `public.media_assets` stores `storage_bucket`, `storage_path`, `public_url`,
  localized `alt/title/caption`, entity metadata and health metadata.
- `site-media` exists for Studio uploads.
- Legacy Flutter/Admin surfaces still write public URLs to fields such as:
  `main_image`, `social_image`, `cover_image_url`, `featured_image`,
  `program_gallery`, `images`, `websites.content`, and `website_sections.content`.

V1 is intentionally additive. It does not remove or rewrite legacy fields.

---

## 3. Data Contract

Canonical key:

```txt
(storage_bucket, storage_path)
```

URL normalization:

- Supabase object URLs:
  `/storage/v1/object/public/{bucket}/{path}` -> `{bucket, path}`
- Supabase render URLs:
  `/storage/v1/render/image/public/{bucket}/{path}` -> `{bucket, path}`
- External URLs:
  `storage_bucket = external`
  `storage_path = url/{md5(public_url)}`

Supported `entity_type` values:

```txt
blog_post, page, package, activity, hotel, transfer, destination,
website, section, brand, review, gallery_item
```

Supported `usage_context` values:

```txt
hero, gallery, featured, og, avatar, body
```

---

## 4. Implementation

Migration:

```txt
supabase/migrations/20260504110600_media_asset_inventory_v1.sql
```

Adds:

- `public.media_asset_storage_location(text)`
- `public.media_asset_jsonb_urls(jsonb)`
- `public.register_media_asset_reference(...)`
- `public.backfill_media_assets_from_legacy_references(...)`
- `public.media_asset_inventory_report`

Verification:

```txt
supabase/verification/media-inventory-check.sql
```

Operational runbook:

```txt
docs/ops/media-inventory-runbook.md
```

---

## 5. Discovery Sources

V1 discovers media from:

- `website_blog_posts.featured_image`
- `websites.content`
- `website_sections.content`
- `package_kits.cover_image_url`
- `package_kits.program_gallery`
- `activities.main_image`
- `activities.social_image`
- `activities.cover_image_url`
- `activities.program_gallery`
- `hotels.main_image`
- `transfers.main_image`
- `destinations.image`
- `destinations.images`
- `images.url` when the table exists and can be joined to a known product owner

The JSON discovery helper accepts string URLs and object forms such as
`{ "url": "...", "alt": "..." }` because it walks every string value in JSONB.

---

## 6. Acceptance Criteria

- Dry run returns candidate counts and never mutates `media_assets`.
- Apply mode is idempotent through `(storage_bucket, storage_path)`.
- Supabase URLs normalize to bucket/path regardless of object or render URL form.
- External URLs normalize to stable `external/url/{md5}` paths.
- Inventory report groups external, Supabase, broken, unowned, missing-alt,
  duplicate, heavy and non-WebP counts.
- No public route, SEO metadata, product rendering, or Flutter flow changes in v1.
- Flutter integration is tracked separately and does not block Studio rollout.

---

## 7. Risks and Non-Goals

Non-goals:

- No Asset Library UI.
- No forced migration from legacy URL fields to media IDs.
- No direct Flutter code changes in this repo.
- No automatic deletion of orphaned Storage objects.
- No HTTP health crawler in the migration; `http_status` is characterized when
  existing upload/batch-alt flows or future jobs populate it.

Risks:

- Legacy data may contain external URLs that require licensing or CDN review.
- Some Storage objects may be unreferenced but still intentionally retained.
- Product media ownership can be ambiguous for old `images` rows without
  account/entity metadata.

---

## 8. Flutter Follow-Up Issue

Created follow-up issue:

- [weppa-cloud/bukeer-flutter#762](https://github.com/weppa-cloud/bukeer-flutter/issues/762)

Issue body:

```markdown
# Flutter: register uploaded media in Studio media_assets

After each successful Supabase Storage upload, Flutter should register the media
reference in `public.media_assets` through an approved RPC/API path.

Affected surfaces:
- `StorageService`
- `ProductImageManager`
- profile/account/package-kit image uploads where applicable

Requirements:
- Preserve current public URL fields for compatibility.
- Include account_id, entity_type, entity_id and usage_context when known.
- Do not block upload UX if registry sync fails; surface telemetry/error logging.
- Use the same canonical URL normalization as Studio.
```

---

## 9. ADR References

- [[ADR-003]] Contract-first validation
- [[ADR-005]] Defense-in-depth security
- [[ADR-009]] Multi-tenant subdomain routing
- [[ADR-012]] Standard API response envelope
- [[ADR-025]] Studio / Flutter field ownership boundary
- [[ADR-028]] Media assets canonical registry
