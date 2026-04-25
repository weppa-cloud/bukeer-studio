# Media Inventory Production Run — 2026-04-25

## Context

Bukeer currently has no separate staging database for this Supabase backend. The
Media Asset Inventory v1 rollout was executed directly against production with
dry-run verification before mutation.

Related artifacts:

- [[ADR-028]]
- [[SPEC_MEDIA_ASSET_INVENTORY]]
- [[media-inventory-runbook]]

## Migration

Applied migration:

```txt
media_asset_inventory_v1
```

Recorded by Supabase as:

```txt
version: 20260425152557
name: media_asset_inventory_v1
```

The migration adds the media inventory helper functions, canonical registration
RPC, legacy backfill RPC and `media_asset_inventory_report` view.

## Production Preflight

Production tables confirmed present before apply:

- `public.media_assets`
- `public.websites`
- `public.website_sections`
- `public.website_blog_posts`
- `public.package_kits`
- `public.activities`
- `public.hotels`
- `public.transfers`
- `public.images`

`public.images.account_id` exists, so the backfill can use the direct account
ownership path for legacy image rows.

## Dry Run Before Apply

```txt
candidate_references: 12350
candidate_unique_locations: 5864
candidate_already_registered: 352
registered_or_updated: 0
```

`media_assets` count before apply:

```txt
370
```

## Apply

Executed:

```sql
select *
from public.backfill_media_assets_from_legacy_references(
  p_account_id := null,
  p_limit := 10000,
  p_dry_run := false
);
```

Result:

```txt
candidate_references: 12350
candidate_unique_locations: 5864
candidate_already_registered: 352
registered_or_updated: 5864
```

`media_assets` count after apply:

```txt
5882
```

Expected net growth:

```txt
5864 unique locations - 352 already registered = 5512 new rows
370 previous rows + 5512 new rows = 5882 total rows
```

## Post-Apply Dry Run

```txt
candidate_references: 12350
candidate_unique_locations: 5864
candidate_already_registered: 5864
registered_or_updated: 0
```

This confirms that all discovered legacy locations are now represented in
`media_assets`.

## Characterization Summary

```txt
total_media_assets: 5882
external_assets: 38
assets_without_entity_type: 0
assets_without_owner: 2
assets_missing_alt: 5517
broken_assets: 11
duplicate_storage_keys: 0
non_webp_assets: 5609
```

Bucket distribution:

| Bucket | Total assets |
|---|---:|
| `images` | 5693 |
| `social-images` | 148 |
| `external` | 38 |
| `site-media` | 3 |

## Follow-Up Priorities

1. Review the 11 broken assets and replace the source legacy URL where still used: [#307](https://github.com/weppa-cloud/bukeer-studio/issues/307).
2. Prioritize the 38 external assets, especially hero, OG and LCP-critical usages: [#307](https://github.com/weppa-cloud/bukeer-studio/issues/307).
3. Start alt-text remediation for high-traffic pages/products first: [#309](https://github.com/weppa-cloud/bukeer-studio/issues/309).
4. Convert high-impact non-WebP assets through the Studio upload flow or a future batch optimizer: [#308](https://github.com/weppa-cloud/bukeer-studio/issues/308).
5. Complete Flutter upload registration follow-up so new uploads enter `media_assets` at write time: [weppa-cloud/bukeer-flutter#762](https://github.com/weppa-cloud/bukeer-flutter/issues/762).
