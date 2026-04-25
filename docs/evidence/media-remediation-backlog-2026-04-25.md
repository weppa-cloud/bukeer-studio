# Media Remediation Backlog — 2026-04-25

## Baseline

Source: production `public.media_assets` after [[media-inventory-production-run-2026-04-25]].

GitHub execution issues:

- [#307](https://github.com/weppa-cloud/bukeer-studio/issues/307) — Broken and external assets cleanup.
- [#309](https://github.com/weppa-cloud/bukeer-studio/issues/309) — Alt text prioritization and backfill.
- [#308](https://github.com/weppa-cloud/bukeer-studio/issues/308) — WebP and image size optimization backlog.

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

## P0 — Broken Assets

All currently marked broken assets are ColombiaTours blog featured images.

```txt
account: ColombiaTours.Travel
website: colombiatours
entity_type: blog_post
usage_context: featured
broken_assets: 11
```

Affected `media_assets.id` values:

| media_asset_id | status | entity_id |
|---|---:|---|
| `fa26ac86-56af-411d-9e57-15412f141c8c` | 404 | `c50d2d6c-fd01-4585-833a-8f16e2a2b728` |
| `83f4ff82-a807-42b4-a3d2-9a2378f7bbe4` | 404 | `301ae13b-db78-4565-955a-27aaf1399f3a` |
| `1d9c3ce3-751d-412d-8a28-5d6d44328305` | 404 | `4df7b556-f5d7-4f89-b644-c7c263b52c68` |
| `3244cf23-ec62-4079-9fb9-a5c3302967f7` | 404 | `ff4a633b-648a-4ce3-9575-929ddfd0b598` |
| `444f7087-8d87-435c-a7bb-beef802c28e3` | 404 | `d8ce568a-c26e-4c7d-80f8-7abd68f1259f` |
| `f1300602-893c-4f2a-af54-49d5586aafa6` | 404 | `e4a1ad9a-fd28-486a-84cf-f662f339c920` |
| `e76ec7e2-3bee-4ede-abc3-26d73ed845be` | 404 | `aa09ec1f-3196-4922-8900-597912b96ee8` |
| `058b1b67-3c60-4432-be78-17e0b3fbc891` | 404 | `d984912e-e7a6-4d0b-921b-8fe3594b31cb` |
| `0e8e45ad-798b-42bf-9920-1266af89b3f0` | 404 | `f3aef82a-4b7a-426d-a357-a0021317461c` |
| `cadc95a5-5810-4776-975c-dc1dd4d2b7eb` | 404 | `b581c5c8-f874-4426-9834-5d72854ffe99` |
| `30a9e336-56f8-4b25-b6ca-70ef33b4e478` | 400 | `bb263f2e-554c-406c-8ac7-c6bb5c028524` |

Recommended remediation:

1. Confirm whether each blog post is published/indexable.
2. Replace `website_blog_posts.featured_image` with a valid Supabase Storage URL.
3. Re-run `register_media_asset_reference(...)` or the global dry-run/apply.
4. Update health metadata after URL replacement.

Reproduction query:

```sql
select
  ma.id,
  ma.account_id,
  a.name as account_name,
  ma.website_id,
  w.subdomain,
  ma.public_url,
  ma.http_status,
  ma.entity_type,
  ma.entity_id,
  ma.usage_context,
  ma.updated_at
from public.media_assets ma
left join public.accounts a on a.id = ma.account_id
left join public.websites w on w.id = ma.website_id
where ma.http_status is not null
  and ma.http_status <> 200
order by ma.http_status desc, ma.updated_at desc;
```

## P1 — External Assets

External asset count:

```txt
38
```

Grouped remediation surface:

| Account | Entity type | Usage context | Total |
|---|---|---|---:|
| Bukeer Demo | `blog_post` | `featured` | 10 |
| ColombiaTours.Travel | `activity` | `gallery` | 4 |
| Bukeer Demo | `gallery_item` | `gallery` | 3 |
| ColombiaTours.Travel | `website` | `body` | 3 |
| ColombiaTours.Travel | `section` | `body` | 3 |
| Weppa Test | `hotel` | `featured` | 3 |
| Weppa Test | `activity` | `featured` | 3 |
| Bukeer Demo | `package` | `featured` | 3 |
| Weppa Test | `gallery_item` | `gallery` | 2 |
| ColombiaTours.Travel | `package` | `featured` | 2 |
| ColombiaTours.Travel | `activity` | `featured` | 2 |

Recommended remediation:

1. Prioritize ColombiaTours external `website/body`, `section/body`, `package/featured` and `activity/featured`.
2. Copy approved external images into Supabase Storage.
3. Replace legacy URL fields that still point to external URLs.
4. Register replacements in `media_assets`.
5. Keep demo/test external rows only if they are intentionally demo data.

Reproduction query:

```sql
select
  coalesce(a.name, ma.account_id::text) as account_name,
  ma.entity_type,
  ma.usage_context,
  ma.storage_bucket,
  count(*)::bigint as total
from public.media_assets ma
left join public.accounts a on a.id = ma.account_id
where ma.storage_bucket = 'external'
group by coalesce(a.name, ma.account_id::text), ma.entity_type, ma.usage_context, ma.storage_bucket
order by total desc, account_name, entity_type, usage_context;
```

## P1 — Missing Alt

Missing alt count:

```txt
5517
```

This should be remediated by priority, not manually across all rows.

Priority order:

1. Public homepage, site sections and website body media.
2. Blog featured images for indexable posts.
3. Package and activity featured images.
4. Product galleries.
5. Demo/test data only if it appears in public previews.

Reproduction query:

```sql
select
  ma.account_id,
  a.name as account_name,
  ma.entity_type,
  ma.usage_context,
  ma.storage_bucket,
  count(*)::bigint as missing_alt
from public.media_assets ma
left join public.accounts a on a.id = ma.account_id
where coalesce(ma.alt, '{}'::jsonb) = '{}'::jsonb
group by ma.account_id, a.name, ma.entity_type, ma.usage_context, ma.storage_bucket
order by missing_alt desc;
```

## P2 — Non-WebP / Optimization

Non-WebP count:

```txt
5609
```

This count is expected after legacy import and should be treated as a performance
backlog, not a production incident.

Priority order:

1. LCP images on public website pages.
2. Hero/featured product and blog images.
3. Listing/card images.
4. Gallery images.

Reproduction query:

```sql
select
  ma.account_id,
  a.name as account_name,
  ma.entity_type,
  ma.usage_context,
  ma.storage_bucket,
  ma.format,
  count(*)::bigint as total
from public.media_assets ma
left join public.accounts a on a.id = ma.account_id
where ma.format is not null
  and ma.format <> 'webp'
group by ma.account_id, a.name, ma.entity_type, ma.usage_context, ma.storage_bucket, ma.format
order by total desc;
```
