# SPEC: Media Asset Library v1

**Status:** Draft  
**Date:** 2026-05-15  
**Primary repository:** `weppa-cloud/bukeer-studio`  
**Cross-repo dependency:** `weppa-cloud/bukeer-flutter`  
**Primary registry:** `public.media_assets`  
**Architecture decision:** [[ADR-028]]  
**Builds on:** [[SPEC_MEDIA_ASSET_INVENTORY]], [[media-inventory-runbook]], [[media-asset-guardrails]]
**GitHub tracking:** [weppa-cloud/bukeer-studio#555](https://github.com/weppa-cloud/bukeer-studio/issues/555)

---

## 1. Purpose

Evolve `public.media_assets` from an operational inventory into the tenant-owned
Media Asset Library for Bukeer. Each account needs one centralized and auditable
place where users, Studio, Flutter and agents can find, upload, reuse, classify
and remediate images without creating new URL-only drift.

Studio is the primary v1 management surface. Flutter continues to write legacy
URL fields for compatibility, but every successful upload should register the
asset in `media_assets` and may reuse existing assets in priority flows.

## 2. Current Baseline

Existing foundation:

- `public.media_assets` stores Storage location, public URL, localized
  `alt/title/caption`, ownership, entity context, usage context and health
  metadata.
- [[SPEC_MEDIA_ASSET_INVENTORY]] backfills legacy URL references into
  `media_assets`.
- [[ADR-028]] declares `media_assets` the canonical registry across Studio and
  Flutter.
- `npm run media:guardrails` and `npm run tech-validator:code` block new
  image/media drift unless work references the registry or an approved backfill.
- Flutter already exposes `MediaAssetRegistryService.registerBestEffort(...)`
  for upload registration.

Gaps this spec addresses:

- Users do not yet have a Studio UI to browse and manage account media.
- Image pickers in pages, sections, products, blogs and SEO fields are not
  unified around `media_assets`.
- Agents/MLLM flows need a single rule: select a registered asset first, or
  register any new URL they introduce.
- Remediation states such as external, broken, missing alt and non-WebP are
  reportable but not yet actionable from a user-facing library.

## 3. Product Scope

### Studio v1

Studio owns the complete Media Asset Library v1:

- Account-scoped asset browser.
- Search and filters for bucket, entity type, usage context, external, broken,
  missing alt, non-WebP and owner.
- Reusable image picker for pages, sections, products, blogs, hero, OG/SEO and
  gallery fields.
- Upload flow that registers the asset in `media_assets` after Storage upload.
- Metadata editing for localized `alt`, `title` and `caption`.
- Association metadata editing when the caller knows `website_id`,
  `entity_type`, `entity_id` and `usage_context`.
- Audit view for remediation queues: broken, external, missing alt and non-WebP.

### Flutter v1

Flutter remains a compatible write surface:

- Continue writing current public URL fields.
- Register successful uploads through
  `appServices.mediaAssetRegistry.registerBestEffort(...)`.
- Pass account, website, entity and usage context when known.
- Treat registry failure as observable/retryable and non-blocking for UX.
- Add optional asset reuse/picker entrypoints only for priority flows where the
  product surface already needs asset reuse.

### Out of Scope v1

- Replacing all legacy URL fields with media IDs.
- Automatic deletion of orphaned Storage objects.
- A full Flutter Asset Library UI.
- Production data mutation as part of the spec/issue creation work.

## 4. Data and Interface Contract

Canonical registry:

```txt
public.media_assets
```

Canonical key:

```txt
(storage_bucket, storage_path)
```

Registration RPC:

```txt
public.register_media_asset_reference(...)
```

Required metadata when known:

- `account_id`
- `website_id`
- `entity_type`
- `entity_id`
- `usage_context`
- `public_url`
- `alt/title/caption` when available

Supported usage contexts for v1:

```txt
hero, featured, gallery, og, avatar, body
```

Supported entity types follow [[SPEC_MEDIA_ASSET_INVENTORY]] and [[ADR-028]]:

```txt
blog_post, page, package, activity, hotel, transfer, destination,
website, section, brand, review, gallery_item
```

Legacy URL fields remain readable and writable during the transition. The Asset
Library returns or writes the public URL needed by existing renderers while also
keeping the registry metadata current.

## 5. User and Agent Flows

### User Uploads an Image in Studio

1. User opens the image picker from a page, section, product, blog or SEO field.
2. User uploads an image to the approved Storage bucket/path.
3. Studio receives the public URL.
4. Studio calls the registration path with account, website, entity and usage
   context when available.
5. The picker returns the public URL to the legacy field and keeps
   `media_assets` updated.

### User Reuses an Existing Asset

1. User opens the image picker.
2. Picker lists assets scoped to the current tenant/account.
3. User filters/searches and selects an existing asset.
4. The target legacy field receives the selected public URL.
5. If the target context is known, Studio updates or registers the context
   association through the approved registry path.

### User Remediates an Asset

1. User opens the audit view.
2. User filters broken, external, missing-alt or non-WebP assets.
3. User replaces the asset, edits metadata or marks a follow-up.
4. Studio preserves current public rendering and updates registry metadata.

### Agent or MLLM Uses an Image

1. Agent queries/selects an existing registered asset when possible.
2. If it introduces a new URL, it must register the asset or document a
   backfill path.
3. It must provide account, website, entity and usage context when known.
4. It must not write image URLs into JSON/page/product content without a
   registry path.

## 6. Acceptance Criteria

- Users can browse account-scoped media from Studio.
- Users can upload a new image and see it registered in `media_assets`.
- Users can reuse an existing registered asset in supported Studio surfaces.
- Users can edit localized alt/title/caption metadata.
- Users can filter and list broken, external, missing-alt and non-WebP assets.
- Existing public rendering and legacy URL fields continue working.
- Agent/MLLM tasks that touch image URLs are blocked by guardrails unless they
  reference `media_assets`, [[ADR-028]] or an approved backfill path.
- Flutter upload work is tracked separately and does not block Studio v1.

## 7. Validation

Studio checks:

```bash
npm run media:guardrails
npm run tech-validator:code:quick -- --no-typecheck
```

Data checks:

```sql
select *
from public.media_asset_inventory_report
order by broken_assets desc, external_assets desc, missing_alt_assets desc;
```

ColombiaTours remediation should track:

- external assets
- broken assets
- missing alt
- non-WebP
- legacy locations not registered

## 8. GitHub Execution Plan

Studio epic:

```txt
Media Asset Library v1 - tenant-owned image management
https://github.com/weppa-cloud/bukeer-studio/issues/555
```

Child issues:

1. [#556](https://github.com/weppa-cloud/bukeer-studio/issues/556) - Spec + ADR-028 extension for Asset Library v1.
2. [#557](https://github.com/weppa-cloud/bukeer-studio/issues/557) - Studio Asset Library UI + reusable image picker.
3. [#558](https://github.com/weppa-cloud/bukeer-studio/issues/558) - Media metadata editing and audit states.
4. [#559](https://github.com/weppa-cloud/bukeer-studio/issues/559) - Agent/MLLM media guardrails for pages/products/sections.
5. [#560](https://github.com/weppa-cloud/bukeer-studio/issues/560) - ColombiaTours media remediation: external, broken, missing alt.

Flutter epic:

```txt
Media Asset Registry and Reuse v1
https://github.com/weppa-cloud/bukeer-flutter/issues/817
```

Flutter work is specified in
`weppa-cloud/bukeer-flutter/docs/specs/SPEC_MEDIA_ASSET_REGISTRY_AND_REUSE_V1.md`
and should link existing issue `weppa-cloud/bukeer-flutter#762`.

## 9. Related References

- [[ADR-028]]
- [[SPEC_MEDIA_ASSET_INVENTORY]]
- [[media-inventory-runbook]]
- [[media-asset-guardrails]]
- `weppa-cloud/bukeer-flutter#762`
