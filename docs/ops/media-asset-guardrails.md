# Media Asset Guardrails

Last updated: 2026-04-25

## Purpose

Keep [[ADR-028]] enforceable during Studio, Flutter and MLLM-assisted work.
`public.media_assets` is the canonical media registry. New work must not create
URL-only image drift.

## Required Rule

Any change that uploads, imports, generates, selects, or references images must
either:

1. Register the asset in `public.media_assets`, or
2. Document the backfill path that will register it.

Required metadata when known:

- `account_id`
- `website_id` when website-specific
- `entity_type`
- `entity_id`
- `usage_context`: `hero`, `featured`, `gallery`, `og`, `avatar`, `body`
- Legacy compatibility field, if one is still written

## PR / Issue Checklist

Use this checklist in specs, issues and PRs:

```md
## Media / Images Impact

- [ ] No toca imágenes/media
- [ ] Usa assets existentes registrados en `media_assets`
- [ ] Sube/importa/genera nuevas imágenes y registra en `media_assets`
- [ ] Mantiene campo legacy por compatibilidad
- [ ] Define `account_id`, `website_id` si aplica, `entity_type`, `entity_id`, `usage_context`
- [ ] Incluye validación de broken/external/missing-alt/non-WebP
```

## Automated Check

Run locally:

```bash
npm run media:guardrails
```

The check scans changed lines for image/media signals such as:

- `image_url`, `main_image`, `featured_image`, `cover_image`
- `gallery`, `avatar`, `og_image`, `backgroundImage`
- `public_url`, `storage_bucket`, `storage_path`, `upload`

If such changes are detected, the change must reference one of:

- `ADR-028`
- `media_assets`
- `register_media_asset_reference`
- `backfill_media_assets_from_legacy_references`
- `SPEC_MEDIA_ASSET_INVENTORY`
- `media-inventory-runbook`

The same check runs inside `npm run tech-validator:code`.

## MLLM / Website Creator Rule

When an MLLM edits pages, sections, products, blogs or website content:

- Prefer selecting an existing registered asset.
- If a new external URL is introduced, register it or document why it is covered
  by backfill.
- Do not add image URLs to JSON content without account, entity and context.
- After bulk edits, run:

```sql
select *
from public.media_asset_inventory_report
order by broken_assets desc, external_assets desc, missing_alt_assets desc;
```

## Flutter Rule

Flutter can continue writing legacy URL fields for compatibility. New successful
uploads should register with `media_assets` through the approved RPC/API path.
If registration fails, upload UX should continue but the failure must be logged
for retry/ops visibility.
