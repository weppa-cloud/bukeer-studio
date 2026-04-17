# Issue #103 — Media Closure Checklist (SQL + Runtime)

Last updated: 2026-04-17

This checklist formalizes closure validation for:
- #176 `media_assets` + storage/RLS foundation
- #177 batch alt generation + broken asset detection
- #179 secure upload path (`site-media`) and strict cutover

## 1) Preconditions

- Supabase project: production/staging target for `colombiatours`
- Website target:
  - `website_id = 894545b7-73ca-4dae-b76a-da5b6a3f8441`
  - `subdomain = colombiatours`
- Applied migrations expected:
  - `media_assets_foundation_v2`
  - `media_alt_jobs`
  - `site_media_storage_hardening_manual`

## 2) SQL verification bundle

Run:

```sql
\set website_id '894545b7-73ca-4dae-b76a-da5b6a3f8441'
\set job_id '2bfff566-ea18-4d82-9bf8-9ef652e2a991'
\set upload_asset_id '96e4a08c-2e19-492f-bedf-0f06d744622c'
\i supabase/verification/issue-103-media-closure-check.sql
```

Pass criteria:
- `public.media_assets` and `public.media_alt_jobs` exist
- RLS enabled on `media_assets`, `media_alt_jobs`, `storage.objects`
- Unique index exists for `(storage_bucket, storage_path)`
- `site-media` bucket is configured:
  - `file_size_limit = 5242880`
  - allowlist = `image/jpeg,image/png,image/webp,image/gif`
- No anonymous write policy remains for `images` or `site-media`
- Batch job row shows coherent counters (`total/processed/failed/errors`)
- Evidence matrix returns URL/status/alt rows for the batch window
- Upload evidence row exists in `media_assets` with `storage_bucket = site-media`

## 3) Runtime policy probes (real API-level behavior)

Validate effective behavior (not only policy metadata):

1. `anon` upload to `site-media` => blocked (`403`/RLS)
2. `anon` upload to `images` => blocked (`403`/RLS)
3. `service_role` upload to `site-media` => allowed (`200`)
4. `service_role` upload to `images` => allowed (`200`)
5. public read from `/storage/v1/object/public/{bucket}/...` => allowed (`200`)

## 4) Functional flow — colombiatours

### 4.1 Batch alt

Run:

```bash
curl -X POST http://localhost:3005/api/media/batch-alt \
  -H "Authorization: Bearer <editor-user-jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "websiteId":"894545b7-73ca-4dae-b76a-da5b6a3f8441",
    "entityType":"all",
    "dryRun":false,
    "limit":15,
    "locales":["es"],
    "destination":"colombia"
  }'
```

Then poll:

```bash
curl "http://localhost:3005/api/media/batch-alt/status?jobId=<job_id>" \
  -H "Authorization: Bearer <editor-user-jwt>"
```

Pass criteria:
- status transitions to `completed`
- `failed` matches broken URL count
- `brokenUrls` includes failing assets
- `dryRun=true` does not change `media_assets` row count
- `limit > 50` returns validation error

### 4.2 Upload flow (editor)

Run `POST /api/media/upload` with multipart payload (`file`, `websiteId`, `entityType`, `entitySlug`, `usageContext`, `locale`).

Pass criteria:
- Response `201`
- `bucket = site-media`
- canonical path format:
  `{accountId}/{websiteId}/{entityType}/{entitySlug}/{usage}-{timestamp}.{ext}`
- `media_assets` row has:
  - `http_status = 200`
  - `file_size_bytes`, `width_px`, `height_px`, `format` populated
  - localized `alt/title/caption` JSON

## 5) Evidence matrix for issue closure

Minimum columns:
- `source` (`batch-alt` or `upload-editor`)
- `entity_type`
- `entity_name`
- `url`
- `http_status`
- `broken` (`http_status != 200`)
- `alt_es`

Attach:
- SQL output of section 8 from `issue-103-media-closure-check.sql`
- `batch-alt` response and `status` response
- upload response payload

## 6) Residual risk gate — legacy bucket `imagenes`

If the SQL bundle detects anonymous write policies for `imagenes`, treat #103 closure as conditional.

Apply:

```sql
\i supabase/verification/issue-103-remediate-imagenes-anon-write.sql
```

Then rerun section 6 of the verification SQL.

Expected: no anonymous write vector for `imagenes`, `images`, or `site-media`.

